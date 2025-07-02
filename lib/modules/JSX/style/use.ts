import {LRU} from '@valkyriestudios/utils/caching';
import {isNeObject, merge} from '@valkyriestudios/utils/object';
import {isNeString} from '@valkyriestudios/utils/string';
import {StyleEngine} from './Engine';
import {HTML_TAGS, styleToString} from './util';
import {djb2Hash, hexId} from '../../../utils/Generic';

const RGX_SEPARATOR = /[:.#[]| /;

const FIXED_FEATURE_QUERIES = {
    reducedMotion: '@media (prefers-reduced-motion: reduce)',
    dark: '@media (prefers-color-scheme: dark)',
    light: '@media (prefers-color-scheme: light)',
    hover: '@media (hover: hover)',
    touch: '@media (hover: none)',
} as const;

const DEFAULT_BREAKPOINTS = {
    mobile: '@media (max-width: 600px)',
    tablet: '@media (max-width: 1199px)',
    tabletOnly: '@media (min-width: 601px) and (max-width: 1199px)',
    desktop: '@media (min-width: 1200px)',
} as const;

type FlattenedRule = {
    query?: string;
    selector?: string;
    declarations: Record<string, unknown>;
};

type CSSOptions = {
    /**
     * Pass as false to tell the engine to not inject the css but simply return the class name.
     * (This can be useful in situations where we're doing server-side return of a fragment
     * knowing the css is already on the client-side, eg: infinite scroll)
     */
    inject?: boolean;
};

type CSSKeyFrames = Record<string, Record<string, string | number>>;

type CSSAnimationConfig = {
    /**
     * Duration of the animation (e.g. "1s", "500ms")
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/animation-duration
     */
    duration: string;
    /**
     * Easing function used for the animation progression
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timing-function
     */
    easingFunction:
        | 'ease'
        | 'ease-in'
        | 'ease-out'
        | 'ease-in-out'
        | 'linear'
        | 'step-start'
        | 'step-end'
        | `steps(${number}${string})`
        | `cubic-bezier(${number},${number},${number},${number})`
        | string; // fallback for custom timing functions
    /**
     * Delay before the animation starts (e.g. "300ms")
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/animation-delay
     */
    delay: string;
    /**
     * Number of times the animation should repeat
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/animation-iteration-count
     */
    iterationCount: number | 'infinite';
    /**
     * Direction of the animation playback
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/animation-direction
     */
    direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    /**
     * Behavior after the animation ends
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode
     */
    fillMode: 'none' | 'forwards' | 'backwards' | 'both';
    /**
     * Whether the animation is running or paused
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/animation-play-state
     */
    playState: 'running' | 'paused';
};

type CSSAnimationFullConfig = Partial<CSSAnimationConfig> & {keyframes: CSSKeyFrames};

const ANIM_TUPLES: [keyof CSSAnimationConfig, string][] = [
    ['duration', 'animationDuration'],
    ['easingFunction', 'animationTimingFunction'],
    ['delay', 'animationDelay'],
    ['iterationCount', 'animationIterationCount'],
    ['direction', 'animationDirection'],
    ['fillMode', 'animationFillMode'],
    ['playState', 'animationPlayState'],
];

export type CssGeneric<Breakpoints extends Record<string, string> = typeof DEFAULT_BREAKPOINTS> = {
    (style: Record<string, unknown>, opts?: {inject?: boolean}): string;
    /* Pseudo Classes */
    hover: string;
    active: string;
    focus: string;
    focusVibisle: string;
    focusWithin: string;
    disabled: string;
    checked: string;
    visited: string;
    firstChild: string;
    lastChild: string;
    firstOfType: string;
    lastOfType: string;
    empty: string;

    /* Pseudo Elements */
    before: string;
    after: string;
    placeholder: string;
    selection: string;

    /* Dynamic Selectors */
    attr: (name: string, value?: string | number | boolean) => string;
    attrStartsWith: (name: string, value: string | number | boolean) => string;
    attrEndsWith: (name: string, value: string | number | boolean) => string;
    attrContains: (name: string, value: string | number | boolean) => string;
    nthChild: (i: number | string) => string;
    nthLastChild: (i: number | string) => string;
    nthOfType: (i: number | string) => string;
    nthLastOfType: (i: number | string) => string;
    not: (selector: string) => string;
    is: (...selectors: string[]) => string;
    where: (selector: string) => string;
    has: (selector: string) => string;
    dir: (dir: 'ltr' | 'rtl') => string;

    /* Media Queries */
    media: Breakpoints & typeof FIXED_FEATURE_QUERIES;

    /* Root Injector */
    root(style?: Record<string, unknown>): void;

    /* Keyframe generator */
    keyframes(frames: Record<string, Record<string, string | number>>, opts?: CSSOptions): string;
};

/**
 * MARK: Active Engine
 */

let active_engine: StyleEngine | null = null;

export function setActiveStyleEngine<T extends StyleEngine | null>(engine: T): T {
    active_engine = engine;
    return engine;
}

export function getActiveStyleEngine() {
    return active_engine;
}

/**
 * MARK: Css Factory
 */

function normalizeSelector(val: string) {
    switch (val[0]) {
        case '>':
        case '+':
        case '~':
        case '*':
            return ' ' + val;
        default: {
            /**
             * Eg: 'div:hover' {...} -> we should auto-space prefix to ' div:hover': {...}
             * Eg: 'ul li' -> should be auto-space prefixed to ' ul li'
             */
            const separator_idx = val.search(RGX_SEPARATOR);
            const base = separator_idx === -1 ? val : val.slice(0, separator_idx);
            return HTML_TAGS[base as keyof typeof HTML_TAGS] ? ' ' + val : val;
        }
    }
}

function normalizeVariable(val: string, prefix: string) {
    return val[0] === '-' && val[1] === '-' ? val : prefix + val;
}

function flatten(obj: Record<string, unknown>, parent_query: string = '', parent_selector: string = ''): FlattenedRule[] {
    const result: FlattenedRule[] = [];
    const base: Record<string, unknown> = {};
    let base_has: boolean = false;

    for (const key in obj) {
        const val = obj[key];
        if (Object.prototype.toString.call(val) === '[object Object]') {
            if (key[0] === '@') {
                result.push(...flatten(val as Record<string, unknown>, key, parent_selector));
            } else {
                result.push(...flatten(val as Record<string, unknown>, parent_query, parent_selector + normalizeSelector(key)));
            }
        } else if (val !== undefined && val !== null) {
            base[normalizeSelector(key)] = val;
            base_has = true;
        }
    }

    if (base_has) {
        result.push({
            query: parent_query || undefined,
            selector: parent_selector || undefined,
            declarations: base,
        });
    }

    return result;
}

/**
 * Factory which generates a CSS helper instance
 *
 * @returns {CssGeneric}
 */
function cssFactory<Breakpoints extends Record<string, string> = typeof DEFAULT_BREAKPOINTS>(
    breakpoints: Breakpoints,
): CssGeneric<Breakpoints> {
    /* Global cache for cross-engine reuse */
    const GLOBAL_LRU = new LRU<{
        cname: string;
        rules: {rule: string; selector?: string; query?: string}[];
    }>({max_size: 500});
    const GLOBAL_KEYFRAMES_LRU = new LRU<{
        cname: string;
        rule: string;
    }>({max_size: 200});

    /**
     * CSS Helper which works with the active style engine and registers as well as returns a unique class name
     * for example:
     *
     * const className = css({
     *  color: 'white',
     *  backgroundColor: 'black',
     *  ':hover': {
     *      color: 'black',
     *      backgroundColor: 'white'
     *  }
     * });
     *
     * @param {Record<string, unknown>} style - Raw style object
     * @param {CSSOptions} opts - Options for css, eg: {inject:false} will simply return the unique classname rather than adding to engine
     */
    const mod = (style: Record<string, unknown>, opts?: CSSOptions) => {
        if (Object.prototype.toString.call(style) !== '[object Object]') return '';

        const engine = active_engine || setActiveStyleEngine(new StyleEngine());

        const raw = JSON.stringify(style);
        const cached = engine.cache.get(raw);
        if (cached) return cached;

        /* Inject or not */
        const inject = opts?.inject !== false;

        /* Check global LRU and replay off of it if exists */
        const replay = GLOBAL_LRU.get(raw);
        if (replay) {
            if (!inject) return replay.cname;
            engine.cache.set(raw, replay.cname);
            for (let i = 0; i < replay.rules.length; i++) {
                const r = replay.rules[i];
                engine.register(r.rule, replay.cname, {query: r.query, selector: r.selector});
            }
            return replay.cname;
        }

        /* Flatten */
        const flattened = flatten(style);
        if (!flattened.length) {
            engine.cache.set(raw, '');
            return '';
        }

        /* Get class name and register on engine */
        const cname = 'tf' + djb2Hash(raw);
        engine.cache.set(raw, cname);
        if (!inject) return cname;

        /* Loop through flattened behavior and register each op */
        const lru_entries: {rule: string; selector?: string; query?: string}[] = [];
        for (let i = 0; i < flattened.length; i++) {
            const {declarations, selector = undefined, query = undefined} = flattened[i];
            const rule = styleToString(declarations);
            if (rule) {
                const normalized_selector = selector ? '.' + cname + normalizeSelector(selector) : undefined;
                engine.register(rule, cname, {query, selector: normalized_selector});
                lru_entries.push({rule, query, selector: normalized_selector});
            }
        }

        /* Push to global lru */
        GLOBAL_LRU.set(raw, {cname, rules: lru_entries});

        return cname;
    };

    /* Pseudo Classes */
    mod.hover = ':hover';
    mod.active = ':active';
    mod.focus = ':focus';
    mod.focusVibisle = ':focus-visible';
    mod.focusWithin = ':focus-within';
    mod.disabled = ':disabled';
    mod.checked = ':checked';
    mod.visited = ':visited';
    mod.firstChild = ':first-child';
    mod.lastChild = ':last-child';
    mod.firstOfType = ':first-of-type';
    mod.lastOfType = ':last-of-type';
    mod.empty = ':empty';

    /* Pseudo Elements */
    mod.before = '::before';
    mod.after = '::after';
    mod.placeholder = '::placeholder';
    mod.selection = '::selection';

    /* Dynamic Selectors */
    mod.nthChild = (i: number | string) => ':nth-child(' + i + ')';
    mod.nthLastChild = (i: number | string) => ':nth-last-child(' + i + ')';
    mod.nthOfType = (i: number | string) => ':nth-of-type(' + i + ')';
    mod.nthLastOfType = (i: number | string) => ':nth-last-of-type(' + i + ')';
    mod.not = (selector: string) => ':not(' + selector + ')';
    mod.is = (...selectors: string[]) => ':is(' + selectors.join(', ') + ')';
    mod.where = (selector: string) => ':where(' + selector + ')';
    mod.has = (selector: string) => ':has(' + selector + ')';
    mod.dir = (dir: 'ltr' | 'rtl') => ':dir(' + dir + ')';
    mod.attr = (name: string, value?: string | number | boolean) => {
        if (value === undefined) return '[' + name + ']';
        return '[' + name + '="' + String(value) + '"]';
    };
    mod.attrStartsWith = (name: string, value: string | number | boolean) => '[' + name + '^="' + String(value) + '"]';
    mod.attrEndsWith = (name: string, value: string | number | boolean) => '[' + name + '$="' + String(value) + '"]';
    mod.attrContains = (name: string, value: string | number | boolean) => '[' + name + '*="' + String(value) + '"]';

    /* Media Queries */
    mod.media = {...FIXED_FEATURE_QUERIES, ...breakpoints};

    /* Root injector */
    mod.root = (style: Record<string, unknown> = {}) => {
        if (!isNeObject(style) || !active_engine) return;

        const flattened = flatten(style);
        if (!flattened.length) return;

        for (let i = 0; i < flattened.length; i++) {
            const {declarations, query, selector} = flattened[i];
            const rule = styleToString(declarations);
            if (rule) {
                const selector_path = selector
                    ? selector[0] === '[' && selector[selector.length - 1] === ']'
                        ? ':root' + selector
                        : selector.trimStart()
                    : ':root';
                active_engine.register(rule, '', {selector: selector_path, query});
            }
        }
    };

    /* KeyFrames */
    mod.keyframes = (frames: Record<string, Record<string, string | number>>, opts?: CSSOptions) => {
        const raw = JSON.stringify(frames);
        const engine = active_engine || setActiveStyleEngine(new StyleEngine());

        /* Check engine */
        const cached = engine.cache.get(raw);
        if (cached) return cached;

        /* Inject or not */
        const inject = opts?.inject !== false;

        /* Check global LRU */
        const replay = GLOBAL_KEYFRAMES_LRU.get(raw);
        if (replay) {
            if (!inject) return replay.cname;
            engine.register(replay.rule, '', {selector: null});
            return replay.cname;
        }

        const cname = 'tf' + djb2Hash(raw);
        engine.cache.set(raw, cname);

        let rule = '@keyframes ' + cname + ' {';
        for (const point in frames) {
            const style = styleToString(frames[point]);
            if (style) rule += point + '{' + style + '}';
        }
        rule += '}';

        if (inject) engine.register(rule, '', {selector: null});
        GLOBAL_KEYFRAMES_LRU.set(raw, {cname, rule});
        return cname;
    };

    return mod;
}

/**
 * MARK: Configure Css
 */

type VarMap = Record<string, string>;
type ThemeMap = Record<string, string | {light: string; dark: string}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type VarVal<T extends string> = T extends `--${infer Rest}` ? `var(${T})` : `var(--v-${T})`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ThemeVal<T extends string> = T extends `--${infer Rest}` ? `var(${T})` : `var(--t-${T})`;

export type CssInstance<
    V extends VarMap,
    T extends ThemeMap,
    R extends Record<string, Record<string, unknown>> = {},
    Breakpoints extends Record<string, string> = typeof DEFAULT_BREAKPOINTS,
    Animations extends Record<string, CSSAnimationFullConfig> = {},
> = CssGeneric<Breakpoints> & {
    $uid: string;
    /**
     * Token references for global design variables.
     * Each value resolves to `var(--v-key)`.
     * @note this is an alias of var
     */
    $v: {[K in keyof V]: VarVal<K & string>};
    /**
     * Token references for global design variables.
     * Each value resolves to `var(--v-key)`.
     */
    var: {[K in keyof V]: VarVal<K & string>};
    /**
     * Token references for theme-adaptive values.
     * Each resolves to `var(--t-key)`, adapting to light/dark modes.
     * @note this is an alias of theme
     */
    $t: {[K in keyof T]: ThemeVal<K & string>};
    /**
     * Token references for theme-adaptive values.
     * Each resolves to `var(--t-key)`, adapting to light/dark modes.
     */
    theme: {[K in keyof T]: ThemeVal<K & string>};
    /**
     * Merges one or more registered definitions and/or raw style objects into a single style object.
     *
     * This does not inject styles or generate a class — it's useful for composing styles inside nested or media-query contexts.
     *
     * @example
     * ```tsx
     * const base = css.mix('row', { padding: '1rem' });
     * const cls = css({
     *   ...base,
     *   [css.media.tablet]: css.mix('col', { padding: '0.5rem' })
     * });
     * ```
     */
    mix: (...args: (keyof R | Record<string, unknown> | null | undefined | false)[]) => Record<string, unknown>;
    /**
     * Applies one or more registered definitions (plus optional inline overrides) and returns a class name.
     *
     * Internally merges the provided style objects and tokens using `.mix(...)`, then generates and registers an atomic class.
     *
     * @example
     * ```tsx
     * const cls = css.use('card', { padding: '1rem' });
     * return <div className={cls}>Card</div>;
     * ```
     */
    use: (...args: (keyof R | Record<string, unknown> | null | undefined | false)[]) => string;
    /**
     * Generates a unique, scoped class name with a `tf-` prefix. Useful for DOM targeting, etc
     *
     * @example
     * ```ts
     * const portalId = css.cid();
     * <div id={portalId} />
     * ```
     */
    cid: () => string;
    /**
     * Generates animation-related style declarations from a named animation defined in `createCss(...)`.
     *
     * Rather than returning a single `animation` shorthand string, this returns specific CSS properties
     * like `animationName`, `animationDuration`, `animationTimingFunction`, etc.
     *
     * This gives finer control and plays nicely with inline style merging or overrides.
     *
     * @example
     * ```ts
     * css({
     *   ...css.animation('fadeIn'),
     *   opacity: 0
     * });
     * ```
     */
    animation: (key: keyof Animations, overrides?: Partial<CSSAnimationConfig>) => Record<string, unknown>;
    /**
     * Sets mount path for the css instance
     * @param {string|null} path - Mount path to choose
     */
    setMountPath: (path: string | null) => void;
    /**
     * Disables/enables style injection for the currently active style engine
     * @param {boolean?} val - Disable (true) or Enable (false)
     */
    disableInjection: (val?: boolean) => void;
};

const CSS_RESET = {
    '*, *::before, *::after': {
        boxSizing: 'border-box',
    },
    [[
        'html',
        'body',
        'div',
        'span',
        'object',
        'iframe',
        'figure',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'blockquote',
        'pre',
        'a',
        'code',
        'em',
        'img',
        'small',
        'strike',
        'strong',
        'sub',
        'sup',
        'tt',
        'b',
        'u',
        'i',
        'ol',
        'ul',
        'li',
        'fieldset',
        'form',
        'label',
        'table',
        'caption',
        'tbody',
        'tfoot',
        'thead',
        'tr',
        'th',
        'td',
        'main',
        'canvas',
        'embed',
        'footer',
        'header',
        'nav',
        'section',
        'video',
    ].join(', ')]: {
        margin: 0,
        padding: 0,
        border: 0,
        fontSize: '100%',
        font: 'inherit',
        verticalAlign: 'baseline',
        textRendering: 'optimizeLegibility',
        webkitFontSmoothing: 'antialiased',
        webkitTapHighlightColor: 'transparent',
        textSizeAdjust: 'none',
    },
    'footer, header, nav, section, main': {
        display: 'block',
    },
    'ol, ul': {
        listStyle: 'none',
    },
    'q, blockquote': {
        quotes: 'none',
        '::before': {content: 'none'},
        '::after': {content: 'none'},
    },
    table: {
        borderCollapse: 'collapse',
        borderSpacing: 0,
    },
};

export function createCss<
    const V extends VarMap,
    const T extends ThemeMap,
    const R extends Record<string, Record<string, unknown>> = {},
    const Breakpoints extends Record<string, string> = typeof DEFAULT_BREAKPOINTS,
    const Animations extends Record<string, CSSAnimationFullConfig> = {},
>(
    config: {
        breakpoints?: Breakpoints;
        /**
         * Global design tokens (CSS variables).
         * Accessible via `css.var` or `css.$v`.
         */
        var?: V;
        /**
         * Themed values that adapt to light/dark modes.
         * Accessible via `css.theme` or `css.$t`.
         */
        theme?: T;
        /**
         * If `true`, injects theme tokens as both media queries and HTML attributes (e.g. `data-theme="dark"`).
         * You can also pass a string like `'data-mode'` to use a custom attribute.
         */
        themeAttribute?: boolean | string;
        /**
         * Opt-In to an SSR-safe CSS reset styles. Defaults to `false`.
         */
        reset?: boolean;
        /**
         * Defines named, composable style blocks for reuse across components.
         * These can reference `var`, `theme`, media queries, pseudo selectors, etc.
         *
         * Use with `css.use(...)`.
         *
         * @example
         * ```ts
         * definitions: css => ({
         *   button: {
         *     fontSize: css.$v.font_s_body,
         *     [css.hover]: { filter: 'brightness(1.2)' },
         *   },
         * })
         * ```
         */
        definitions?: (mod: CssInstance<V, T, {}, Breakpoints>) => R;
        animations?: Animations;
    } = {},
): CssInstance<V, T, R, Breakpoints, Animations> {
    const mod = cssFactory(
        Object.prototype.toString.call(config.breakpoints) === '[object Object]'
            ? (config.breakpoints as Breakpoints)
            : DEFAULT_BREAKPOINTS,
    ) as CssInstance<V, T, R, Breakpoints, Animations>;

    /* Is mounted on */
    let mountPath: string | null = null;

    /* Specific symbol for this css instance */
    mod.$uid = hexId(8);

    const sym = Symbol('trifrost.jsx.style.css{' + mod.$uid + '}');

    /* Variable collectors */
    const root_vars: Record<string, string> = {};
    const theme_light: Record<string, string> = {};
    const theme_dark: Record<string, string> = {};
    const definitions: R = {} as R;

    /* Attach var tokens */
    mod.var = {} as any;
    if (Object.prototype.toString.call(config.var) === '[object Object]') {
        for (const key in config.var) {
            const v_key = normalizeVariable(key, '--v-');
            mod.var[key] = ('var(' + v_key + ')') as VarVal<typeof key>;
            root_vars[v_key] = config.var[key];
        }
    }
    mod.$v = mod.var;

    /* Attach theme tokens */
    mod.theme = {} as any;
    if (Object.prototype.toString.call(config.theme) === '[object Object]') {
        for (const key in config.theme) {
            const entry = config.theme[key];
            if (isNeString(entry)) {
                const t_key = normalizeVariable(key, '--t-');
                root_vars[t_key] = entry;
                mod.theme[key] = ('var(' + t_key + ')') as ThemeVal<typeof key>;
            } else if (isNeString(entry?.light) && isNeString(entry?.dark)) {
                const t_key = normalizeVariable(key, '--t-');
                theme_light[t_key] = entry.light;
                theme_dark[t_key] = entry.dark;
                mod.theme[key] = ('var(' + t_key + ')') as ThemeVal<typeof key>;
            } else {
                throw new Error(`Theme token '${key}' is invalid, must either be a string or define both 'light' and 'dark' values`);
            }
        }
    }
    mod.$t = mod.theme;

    /* Attach definitions */
    if (typeof config.definitions === 'function') {
        const def = config.definitions(mod);
        for (const key in def) (definitions as any)[key] = def[key];
    /* Define animation registry */
    const animations: Animations = config.animations ?? ({} as Animations);
    if (Object.prototype.toString.call(config.animations) === '[object Object]') {
        for (const key in config.animations!) (animations as any)[key] = config.animations[key];
    }

    /* Determine default root injection */
    const ROOT_INJECTION = {
        ...(config.reset === true && CSS_RESET),
        ...root_vars,
        [mod.media.light]: {
            ...theme_light,
            /**
             * Theme Attribute support, defaults to false but if passed as true
             * we will inject for 'data-theme' if passed as
             * a string we will use that as attribute
             */
            ...(config.themeAttribute && {
                [`:root[${typeof config.themeAttribute === 'string' ? config.themeAttribute : 'data-theme'}="dark"]`]: theme_dark,
            }),
        },
        [mod.media.dark]: {
            ...theme_dark,
            /**
             * Theme Attribute support, defaults to false but if passed as true
             * we will inject for 'data-theme' if passed as
             * a string we will use that as attribute
             */
            ...(config.themeAttribute && {
                [`:root[${typeof config.themeAttribute === 'string' ? config.themeAttribute : 'data-theme'}="light"]`]: theme_light,
            }),
        },
    };

    /* Attach root generator */
    const ogRoot = mod.root;
    mod.root = (styles: Record<string, unknown> = {}) => {
        if (!active_engine) setActiveStyleEngine(new StyleEngine());

        /* Set mounted path */
        if (mountPath) active_engine!.setMountPath(mountPath);

        /* If our root variables are already injected, simply run og root */
        if (mountPath || Reflect.get(active_engine!, sym)) {
            ogRoot(styles);
        } else {
            Reflect.set(active_engine!, sym, true);
            ogRoot({...ROOT_INJECTION, ...styles});
        }
    };

    /* Use a definition or set of definitions and combine into single style object */
    mod.mix = (...args: (keyof R | Record<string, unknown> | null | undefined | false)[]) => {
        const acc = [] as unknown as [Record<string, unknown>, ...Record<string, unknown>[]];
        for (let i = 0; i < args.length; i++) {
            const val = args[i];
            if (val) {
                if (typeof val === 'string' && val in definitions) {
                    acc.push(definitions[val]);
                } else if (Object.prototype.toString.call(val) === '[object Object]') {
                    acc.push(val as Record<string, unknown>);
                }
            }
        }
        switch (acc.length) {
            case 0:
                return {};
            case 1:
                return acc[0];
            default:
                return merge(acc.shift()!, acc, {union: true});
        }
    };

    /* Use a definition or set of definitions and register them with a classname*/
    mod.use = (...args: (keyof R | Record<string, unknown> | null | undefined | false)[]) => mod(mod.mix(...args));

    /* Make use of previously defined animations */
    mod.animation = (key: keyof Animations, opts: Partial<CSSAnimationConfig> = {}): Record<string, unknown> => {
        const cfg = animations[key];
        if (!cfg) throw new Error('[TriFrost css.animation] Unknown animation "' + String(key) + '"');

        /* Build animation */
        const acc: Record<string, unknown> = {animationName: mod.keyframes(cfg.keyframes)};
        for (let i = 0; i < ANIM_TUPLES.length; i++) {
            const [prop, name] = ANIM_TUPLES[i];
            if (opts[prop] !== undefined) acc[name] = opts[prop];
            else if (cfg[prop] !== undefined) acc[name] = cfg[prop];
        }

        return acc;
    };

    /* Generates a unique classname */
    mod.cid = () => 'tf-' + hexId(8);

    /* Sets mount path */
    mod.setMountPath = (path: string | null) => {
        mountPath = typeof path === 'string' ? path : null;
    };

    /* Disable injection on the current active engine */
    mod.disableInjection = (val: boolean = true) => {
        if (!active_engine) setActiveStyleEngine(new StyleEngine());
        active_engine?.setDisabled(val);
    };

    return mod;
}
