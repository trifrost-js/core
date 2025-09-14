import {djb2} from '@valkyriestudios/utils/hash';
import {isDevMode} from '../../../utils/Generic';
import {nonce} from '../ctx/nonce';
import {getActiveCtx} from '../ctx/use';
import {ATOMIC_GLOBAL, ARC_GLOBAL, GLOBAL_ARC_NAME, ARC_GLOBAL_OBSERVER} from './atomic';
import {atomicMinify} from './util';

type ScriptEngineSeen = {
    scripts: Set<string>;
    modules: Set<string>;
};

export class ScriptEngine {
    /* Map storing the function bodies by id */
    protected map_fn = new Map<string, string>();

    /* Map storing the data payloads with their id */
    protected map_data = new Map<string, string>();

    /* Map storing modules */
    protected map_modules = new Map<string, {fn: string; data: string | null; ogname: string}>();

    /* Whether or not TriFrost atomic is enabled */
    protected atomic_enabled: boolean = false;

    /* Whether or not the Engine instance is in charge of root rendering */
    protected root_renderer: boolean = false;

    /* Mount path for root styles */
    protected mount_path: string | null = null;

    /* Known modules */
    protected known_modules: Record<string, () => Record<string, any>> = {};

    public known_modules_rgx: RegExp | null = null;

    protected used_modules = new Set();

    setAtomic(is_atomic: boolean) {
        this.atomic_enabled = is_atomic === true;
    }

    setRoot(is_root: boolean) {
        this.root_renderer = is_root === true;
    }

    setModules(modules: Record<string, () => Record<string, any>>) {
        this.known_modules = modules;
        this.known_modules_rgx = new RegExp(`\\$\\.(${Object.keys(modules).join('|')})\\.`, 'g');
    }

    /**
     * Registers a script
     *
     * @param {string} fn - Function body for the script
     * @param {string|null} data - Stringified data body or null
     */
    register(fn: string, data: string | null) {
        const minified_fn = atomicMinify(fn);
        if (!minified_fn) return {};

        let fn_id = this.map_fn.get(minified_fn);
        if (!fn_id) {
            fn_id = djb2(minified_fn);
            this.map_fn.set(minified_fn, fn_id);
            if (this.known_modules_rgx) {
                const matches = minified_fn.matchAll(this.known_modules_rgx);
                for (const match of matches) {
                    if (match[1] && !this.used_modules.has(match[1])) {
                        this.known_modules[match[1]]();
                        this.used_modules.add(match[1]);
                    }
                }
            }
        }

        let data_id: string | null = null;
        if (data) {
            data_id = this.map_data.get(data) || null;
            if (!data_id) {
                data_id = djb2(data);
                this.map_data.set(data, data_id);
            }
        }

        return {fn_id, data_id};
    }

    /**
     * Registers a module
     *
     * @param {string} fn - Function body for the module
     * @param {string|null} data - Stringified data body or null
     * @param {string} name - Name for the module
     */
    registerModule(fn: string, data: string | null, name: string) {
        const hash = djb2(name);
        if (this.map_modules.has(hash)) return {name: hash};

        const minified_fn = atomicMinify(fn);
        if (!minified_fn) return {};
        this.map_modules.set(hash, {fn: minified_fn, data, ogname: name});

        this.used_modules.add(name);

        return {name: hash};
    }

    /**
     * Flushes the script registry into a string
     *
     * @param {ScriptEngineSeen} seen - Set of script and module hashes known to be on the client already
     * @param {boolean} isFragment - (default=false) Whether or not we're flushing for a fragment
     */
    flush(seen: ScriptEngineSeen = {scripts: new Set(), modules: new Set()}, isFragment: boolean = false): string {
        let out = '';

        /* Start modules */
        if (this.map_modules.size) {
            const MNS = [];
            for (const [name, val] of [...this.map_modules]) {
                if (!seen.modules.has(name)) {
                    let mod = '["' + name + '",' + val.fn + ',"' + val.ogname + '"';
                    if (val.data) mod += ',' + val.data;
                    mod += ']';
                    MNS.push(mod);
                    seen.modules.add(name);
                }
            }
            if (MNS.length) out += `w.${GLOBAL_ARC_NAME}.sparkModule(${'[' + MNS.join(',') + ']'});`;
        }

        /* Start script */
        if (this.map_fn.size) {
            const FNS = [];
            for (const [val, id] of [...this.map_fn]) {
                if (!seen.scripts.has(id)) {
                    FNS.push('["' + id + '",' + val + ']');
                    seen.scripts.add(id);
                } else {
                    FNS.push('["' + id + '"]');
                }
            }
            const DAT = '[' + [...this.map_data].map(([val, id]) => '["' + id + '",' + val + ']').join(',') + ']';
            out += `w.${GLOBAL_ARC_NAME}.spark(${'[' + FNS.join(',') + ']'},${DAT},self?.parentNode);`;
        }

        if (!out.length) return '';

        /* Finalize iife */
        if (!isFragment && this.mount_path && this.root_renderer) {
            out = [
                '(function(w){',
                'const self=document.currentScript;',
                'const run=()=>{',
                out,
                'setTimeout(()=>self?.remove?.(),0);',
                '};',
                `if(!w.${GLOBAL_ARC_NAME}){`,
                `const wait=()=>{w.${GLOBAL_ARC_NAME}?run():setTimeout(wait,1)};`,
                'wait();',
                '}else{run()}',
                '})(window);',
            ].join('');
        } else {
            out = '(function(w){const self=document.currentScript;' + out + 'setTimeout(()=>self?.remove?.(),0);})(window);';
        }

        const n_nonce = nonce();
        return n_nonce ? '<script nonce="' + n_nonce + '">' + out + '</script>' : '<script>' + out + '</script>';
    }

    inject(html: string, seen: ScriptEngineSeen = {scripts: new Set(), modules: new Set()}): string {
        if (typeof html !== 'string') return '';

        const n_nonce = nonce();
        const debug = isDevMode(getActiveCtx()?.env ?? {});
        const isFragment = !html.startsWith('<!DOCTYPE') && !html.startsWith('<html');

        /* Mount script */
        let scripts = '';

        /* Add atomic/arc client runtime */
        if (!isFragment) {
            if (this.mount_path) {
                scripts = n_nonce
                    ? '<script nonce="' + n_nonce + '" src="' + this.mount_path + '" defer></script>'
                    : '<script src="' + this.mount_path + '" defer></script>';
            } else if (this.atomic_enabled) {
                scripts = n_nonce
                    ? '<script nonce="' + n_nonce + '">' + ARC_GLOBAL(debug) + ATOMIC_GLOBAL + '</script>'
                    : '<script>' + ARC_GLOBAL(debug) + ATOMIC_GLOBAL + '</script>';
            } else {
                scripts = n_nonce
                    ? '<script nonce="' + n_nonce + '">' + ARC_GLOBAL(debug) + ARC_GLOBAL_OBSERVER + '</script>'
                    : '<script>' + ARC_GLOBAL(debug) + ARC_GLOBAL_OBSERVER + '</script>';
            }
            seen.scripts.clear();
            seen.modules.clear();
        }

        /* Add engine scripts */
        scripts += this.flush(seen, isFragment);

        if (isFragment) return html + scripts;

        const bodyIdx = html.indexOf('</body>');
        if (bodyIdx >= 0) return html.slice(0, bodyIdx) + scripts + html.slice(bodyIdx);

        const htmlIdx = html.indexOf('</html>');
        if (htmlIdx >= 0) return html.slice(0, htmlIdx) + scripts + html.slice(htmlIdx);

        return html + scripts;
    }

    reset(): void {
        this.map_data = new Map();
        this.map_fn = new Map();
        this.map_modules = new Map();
        this.known_modules = {};
        this.known_modules_rgx = null;
        this.used_modules = new Set();
    }

    /**
     * Sets mount path for as-file renders of root scripts
     *
     * @param {string} path - Mount path for client root scripts
     */
    setMountPath(path: string) {
        this.mount_path = path;
    }
}
