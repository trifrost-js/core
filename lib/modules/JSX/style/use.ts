import {isObject} from '@valkyriestudios/utils/object';
import {type StyleEngine} from './Engine';
import {styleToString} from './util';

let active_engine: StyleEngine | null = null;

export function setActiveStyleEngine (engine: StyleEngine | null) {
    active_engine = engine;
}

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
const cssImpl = (style:Record<string, unknown>, opts?:CSSOptions) => {
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
cssImpl.hover = ':hover';
cssImpl.active = ':active';
cssImpl.focus = ':focus';
cssImpl.focusVibisle = ':focus-visible';
cssImpl.focusWithin = ':focus-within';
cssImpl.disabled = ':disabled';
cssImpl.checked = ':checked';
cssImpl.visited = ':visited';
cssImpl.firstChild = ':first-child';
cssImpl.lastChild = ':last-child';

/* Pseudo Elements */
cssImpl.before = '::before';
cssImpl.after = '::after';
cssImpl.placeholder = '::placeholder';
cssImpl.selection = '::selection';

/* Dynamic Selectors */
cssImpl.nthChild = (i:number|string) => ':nth-child(' + i + ')';
cssImpl.nthLastChild = (i:number|string) => ':nth-last-child(' + i + ')';
cssImpl.nthOfType = (i:number|string) => ':nth-of-type(' + i + ')';
cssImpl.nthLastOfType = (i:number|string) => ':nth-last-of-type(' + i + ')';
cssImpl.not = (selector:string) => ':not(' + selector + ')';
cssImpl.is = (selector:string) => ':is(' + selector + ')';
cssImpl.where = (selector:string) => ':where(' + selector + ')';
cssImpl.has = (selector:string) => ':has(' + selector + ')';
cssImpl.dir = (dir:'ltr' | 'rtl') => ':dir(' + dir + ')';

/* Media Queries */
cssImpl.media = {
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
cssImpl.root = (style: Record<string, unknown>) => {
    if (!isObject(style) || !active_engine) return;
  
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

export const css = cssImpl as {
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
    root(style: Record<string, unknown>): void;
};