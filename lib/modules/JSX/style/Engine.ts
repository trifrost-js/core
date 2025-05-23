import {isNotEmptyString} from '@valkyriestudios/utils/string';
import {MARKER} from './Style';

type StyleEngineRegisterOptions = {
    /**
     * A potential media query this rule belongs to
     */
    query?:string;
    /**
     * A potential sub-selector this rule belongs to
     */
    selector?:string;
};

export class StyleEngine {
    
    /* rule -> className */
    protected base = {out: '', keys: new Set<string>()};
    
    /* mediaQuery -> rule -> className */
    protected media: Record<string, {out: string; keys: Set<string>}> = {};

    cache:Record<string, string> = {};

    /**
     * Generate a deterministic class name for a rule
     * 
     * @note This internally uses DJB2 hashing and autoprefixes tf-
     */
    hash (input:string):string {
        let h = 5381;
        for (let i = 0; i < input.length; i++) {
            h = (h * 33) ^ input.charCodeAt(i);
        }
        return 'tf-' + (h >>> 0).toString(36);
    }

    /**
     * Register a rule (base or media) under a known class name
     *
     * @param {string} rule - Raw CSS declaration (e.g., 'color:red')
     * @param {string} name - Deterministic class name to register under (usually the output of StyleEngine.hash)
     * @param {StyleEngineRegisterOptions} opts - Optional context including media query and selector
     */
    register (
        rule:string,
        name:string,
        opts:StyleEngineRegisterOptions
    ):void {
        if (!isNotEmptyString(rule) || (opts.selector !== undefined && !isNotEmptyString(opts.selector))) return;

        const {query, selector} = opts;
        const normalized = (selector ?? '.' + name) + '{' + rule.trim() + '}';

        if (!query) {
            if (this.base.keys.has(normalized)) return;
            this.base.keys.add(normalized);
            this.base.out += normalized;
        } else {
            const entry = this.media[query];
            if (!entry) {
                this.media[query] = {out: normalized, keys: new Set([normalized])};
            } else if (!entry.keys.has(normalized)) {
                entry.keys.add(normalized);
                entry.out += normalized;
            }
        }
    }

    /**
     * Flush all collected styles into a single <style> tag
     */
    flush ():string {
        let out = this.base.out;
        for (const query in this.media) out += query + '{' + this.media[query].out + '}';
        return out ? '<style>' + out + '</style>' : '';
    }

    /**
     * Replace the style marker with collected styles in the rendered HTML
     *
     * @param {string} html - HTML string containing the marker or needing prepended styles
     */
    inject (html:string):string {
        const styles = this.flush();
        if (!isNotEmptyString(html)) return styles;

        const idx = html.indexOf(MARKER);
        if (idx < 0) return styles + html;

        const before = html.slice(0, idx);
        const after = html.slice(idx + MARKER.length).replaceAll(MARKER, '');

        return before + styles + after;
    }

    /**
     * Clears all internal state
     */
    reset ():void {
        this.base = {out: '', keys: new Set<string>()};
        this.media = {};
    }

}
