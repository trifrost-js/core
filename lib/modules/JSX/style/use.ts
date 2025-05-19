import {isNeObject, isObject} from '@valkyriestudios/utils/object';
import {isNeString, isString} from '@valkyriestudios/utils/string';
import {type StyleEngine} from './Engine';
import {styleToString} from './util';
import {hexId} from '../../../utils/String';

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

type CssGeneric = {
    (style: Record<string, unknown>, opts?: { inject?: boolean }): string;
    /* Pseudo Classes */
    hover:string;
    active:string;
    focus:string;
    focusVibisle:string;
    focusWithin:string;
    disabled:string;
    checked:string;
    visited:string;
    firstChild:string;
    lastChild:string;

    /* Pseudo Elements */
    before:string;
    after:string;
    placeholder:string;
    selection:string;

    /* Dynamic Selectors */
    nthChild:(i:number|string) => string;
    nthLastChild:(i:number|string) => string;
    nthOfType:(i:number|string) => string;
    nthLastOfType:(i:number|string) => string;
    not:(selector:string) => string;
    is:(selector:string) => string;
    where:(selector:string) => string;
    has:(selector:string) => string;
    dir:(dir:'ltr'|'rtl') => string;

    /* Media Queries */
    media:{
        mobile:string;
        tablet:string;
        tabletOnly:string;
        desktop:string;
        reducedMotion:string;
        dark:string;
        light:string;
        hover:string;
        touch:string;
    };

    /* Root Injector */
    root(style?: Record<string, unknown>): void;
};

/**
 * MARK: Active Engine
 */

let active_engine: StyleEngine | null = null;

export function setActiveStyleEngine (engine: StyleEngine | null) {
    active_engine = engine;
}

/**
 * MARK: Css Factory
 */

function flatten (
    obj:Record<string, unknown>,
    parent_query:string = '',
    parent_selector:string = ''
):FlattenedRule[] {
    const result:FlattenedRule[] = [];
    const base:Record<string, unknown> = {};
    let base_has:boolean = false;
  
    for (const key in obj) {
        const val = obj[key];
        if (
            val !== undefined && 
            val !== null
        ) {
            if (isObject(val)) {
                if (key[0] === '@') {
                    result.push(...flatten(val as Record<string, unknown>, key, parent_selector));
                } else {
                    result.push(...flatten(val as Record<string, unknown>, parent_query, parent_selector + key));
                }
            } else {
                base[key] = val;
                base_has = true;
            }
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
function cssFactory ():CssGeneric {
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
    const mod = (style:Record<string, unknown>, opts?:CSSOptions) => {
        if (!isObject(style)) return '';
        const inject = opts?.inject !== false;
    
        const flattened = flatten(style);
        if (!flattened.length) return '';
    
        const cname = active_engine!.hash(JSON.stringify(style));
    
        for (let i = 0; i < flattened.length; i++) {
            const {declarations, selector = undefined, query = undefined} = flattened[i];
            const rule = styleToString(declarations);
            if (inject && rule) {
                active_engine!.register(rule, cname, {query, selector: selector ? `.${cname}${selector}` : undefined});
            }
        }
    
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

    /* Pseudo Elements */
    mod.before = '::before';
    mod.after = '::after';
    mod.placeholder = '::placeholder';
    mod.selection = '::selection';

    /* Dynamic Selectors */
    mod.nthChild = (i:number|string) => ':nth-child(' + i + ')';
    mod.nthLastChild = (i:number|string) => ':nth-last-child(' + i + ')';
    mod.nthOfType = (i:number|string) => ':nth-of-type(' + i + ')';
    mod.nthLastOfType = (i:number|string) => ':nth-last-of-type(' + i + ')';
    mod.not = (selector:string) => ':not(' + selector + ')';
    mod.is = (selector:string) => ':is(' + selector + ')';
    mod.where = (selector:string) => ':where(' + selector + ')';
    mod.has = (selector:string) => ':has(' + selector + ')';
    mod.dir = (dir:'ltr' | 'rtl') => ':dir(' + dir + ')';

    /* Media Queries */
    mod.media = {
        mobile: '@media (max-width: 600px)',
        tablet: '@media (max-width: 1199px)',
        tabletOnly: '@media (min-width: 601px) and (max-width: 1199px)',
        desktop: '@media (min-width: 1200px)',
        reducedMotion: '@media (prefers-reduced-motion: reduce)',
        dark: '@media (prefers-color-scheme: dark)',
        light: '@media (prefers-color-scheme: light)',
        hover: '@media (hover: hover)',
        touch: '@media (hover: none)',
    };

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
                        : selector
                    : ':root';
                active_engine.register(rule, '', {selector: selector_path, query});
            }
        }
    };

    return mod;
}

/**
 * MARK: Configure Css
 */

type VarMap = Record<string, string>;
type ThemeMap = Record<string, {light: string; dark: string}>;

type VarVal <T extends string> = `var(--${T})`;
type ThemeVal <T extends string> = `var(--t-${T})`;

type CssInstance <V extends VarMap, T extends ThemeMap> = CssGeneric & {
    $uid: string;
    /* Variables, $v is alias of var */
	$v: {[K in keyof V]: VarVal<K & string>};
    var: {[K in keyof V]: VarVal<K & string>};
    /* Theme, $t is alias of theme */
    $t: {[K in keyof T]: ThemeVal<K & string>};
	theme: {[K in keyof T]: ThemeVal<K & string>};
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

export function createCss <
	V extends VarMap,
	T extends ThemeMap,
> (config:{
    var?:V;
    theme?:T,
    themeAttribute?: boolean|string,
    reset?:boolean
} = {}): CssInstance<V, T> {
    const mod = cssFactory() as CssInstance<V, T>;

    /* Specific symbol for this css instance */
    mod.$uid = hexId(8);

    const sym = Symbol('trifrost.jsx.style.css{' + mod.$uid + '}');

    /* Variable collectors */
    const root_vars:Record<string, string> = {};
    const theme_light:Record<string, string> = {};
    const theme_dark:Record<string, string> = {};

	/* Attach var tokens */
    mod.var = {} as any;
    if (isObject(config.var)) {
        for (const key in config.var) {
            const v_key = '--' + key;
            mod.var[key] = 'var(' + v_key + ')' as VarVal<typeof key>;
            root_vars[v_key] = config.var[key];
        }
    }
    mod.$v = mod.var;

	/* Validate and attach theme tokens */
    mod.theme = {} as any;
    if (isObject(config.theme)) {
        for (const key in config.theme) {
            const entry = config.theme[key];
            if (
                !isNeString(entry.light) ||
                !isNeString(entry.dark)
            ) throw new Error(`Theme token '${key}' must define both 'light' and 'dark' values`);
            const t_key = '--t-' + key; 
            theme_light[t_key] = entry.light;
            theme_dark[t_key] = entry.dark;
            mod.theme[key] = 'var(' + t_key + ')' as ThemeVal<typeof key>;
        }
    }
    mod.$t = mod.theme;

	/* Attach root generator */
    const ogRoot = mod.root;
    mod.root = (styles:Record<string, unknown> = {}) => {
        if (!active_engine) return;

        /* If our root variables are already injected, simply run og root */
        if (Reflect.get(active_engine, sym)) {
            return ogRoot(styles);
        } else {
            Reflect.set(active_engine, sym, true);

            /**
             * Media-Query based theming
             */
            const theme_media = {
                [mod.media.light]: {
                    ...theme_light,
                    /**
                     * Theme Attribute support, defaults to false but if passed as true
                     * we will inject for 'data-theme' if passed as
                     * a string we will use that as attribute
                     */
                    ...config.themeAttribute && {
                        [`:root[${isString(config.themeAttribute) ? config.themeAttribute : 'data-theme'}="dark"]`]: theme_dark,
                    },
                },
                [mod.media.dark]: {
                    ...theme_dark,
                    /**
                     * Theme Attribute support, defaults to false but if passed as true
                     * we will inject for 'data-theme' if passed as
                     * a string we will use that as attribute
                     */
                    ...config.themeAttribute && {
                        [`:root[${isString(config.themeAttribute) ? config.themeAttribute : 'data-theme'}="light"]`]: theme_light,
                    },
                },
            };

            ogRoot({
                ...config.reset === true && CSS_RESET,
                ...root_vars,
                ...theme_media,
                ...styles,
            });
        }
    };

    return mod;
}