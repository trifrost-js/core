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
 * @param {Record<string, unknown>} raw - Raw style object
 * @param {CSSOptions} opts - Options for css, eg: {inject:false} will simply return the unique classname rather than adding to engine
 */
export function css (
    raw:Record<string, unknown>,
    opts?:CSSOptions
):string {
    if (!isObject(raw)) return '';
    const inject = opts?.inject !== false;
  
    const flattened = flatten(raw);
    if (!flattened.length) return '';
  
    const cname = active_engine!.hash(JSON.stringify(raw));
  
    for (let i = 0; i < flattened.length; i++) {
        const {declarations, selector = undefined, query = undefined} = flattened[i];
        const rule = styleToString(declarations);
        if (inject && rule) {
            active_engine!.register(rule, cname, {query, selector: selector ? `.${cname}${selector}` : undefined});
        }
    }
  
    return cname;
}
