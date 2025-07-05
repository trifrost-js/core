import {djb2Hash} from '../../../utils/Generic';
import {nonce} from '../ctx/nonce';
import {ATOMIC_GLOBAL, ARC_GLOBAL, GLOBAL_ARC_NAME, ARC_GLOBAL_OBSERVER} from './atomic';
import {atomicMinify} from './util';

export class ScriptEngine {
    /* Map storing the function bodies by id */
    protected map_fn = new Map<string, string>();

    /* Map storing the data payloads with their id */
    protected map_data = new Map<string, string>();

    /* Whether or not TriFrost atomic is enabled */
    protected atomic_enabled: boolean = false;

    /* Whether or not the Engine instance is in charge of root rendering */
    protected root_renderer: boolean = false;

    /* Mount path for root styles */
    protected mount_path: string | null = null;

    setAtomic(is_atomic: boolean) {
        this.atomic_enabled = is_atomic === true;
    }

    setRoot(is_root: boolean) {
        this.root_renderer = is_root === true;
    }

    register(fn: string, data: string | null) {
        const minified_fn = atomicMinify(fn);

        let fn_id = this.map_fn.get(minified_fn);
        if (!fn_id) {
            fn_id = djb2Hash(minified_fn);
            this.map_fn.set(minified_fn, fn_id);
        }

        let data_id: string | null = null;
        if (data) {
            data_id = this.map_data.get(data) || null;
            if (!data_id) {
                data_id = djb2Hash(data);
                this.map_data.set(data, data_id);
            }
        }

        return {fn_id, data_id};
    }

    /**
     * Flushes the script registry into a string
     */
    flush(seen: Set<string> = new Set(), isFragment: boolean = false): string {
        if (this.map_fn.size === 0) return '';

        /* Start script */
        const FNS = [];
        for (const [val, id] of [...this.map_fn]) {
            if (!seen.has(id)) {
                FNS.push('["' + id + '",' + val + ']');
                seen.add(id);
            } else {
                FNS.push('["' + id + '"]');
            }
        }
        const DAT = '[' + [...this.map_data].map(([val, id]) => '["' + id + '",' + val + ']').join(',') + ']';
        let out = `w.${GLOBAL_ARC_NAME}.spark(${'[' + FNS.join(',') + ']'},${DAT});`;

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

    inject(html: string, seen: Set<string> = new Set()): string {
        if (typeof html !== 'string') return '';

        const n_nonce = nonce();
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
                    ? '<script nonce="' + n_nonce + '">' + ARC_GLOBAL + ATOMIC_GLOBAL + '</script>'
                    : '<script>' + ARC_GLOBAL + ATOMIC_GLOBAL + '</script>';
            } else {
                scripts = n_nonce
                    ? '<script nonce="' + n_nonce + '">' + ARC_GLOBAL + ARC_GLOBAL_OBSERVER + '</script>'
                    : '<script>' + ARC_GLOBAL + ARC_GLOBAL_OBSERVER + '</script>';
            }
            seen.clear();
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
