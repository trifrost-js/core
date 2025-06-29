import {hexId} from '../../../utils/Generic';
import {nonce} from '../ctx/nonce';
import {
    ATOMIC_GLOBAL,
    ATOMIC_VM_BEFORE,
    ATOMIC_VM_AFTER,
    GLOBAL_HYDRATED_NAME,
    GLOBAL_DATA_REACTOR_NAME,
    GLOBAL_UTILS_NAME,
} from './atomic';
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
            fn_id = hexId(8);
            this.map_fn.set(minified_fn, fn_id);
        }

        let data_id: string | null = null;
        if (data) {
            data_id = this.map_data.get(data) || null;
            if (!data_id) {
                data_id = hexId(8);
                this.map_data.set(data, data_id);
            }
        }

        return {fn_id, data_id};
    }

    /**
     * Flushes the script registry into a string
     */
    flush(): string {
        if (this.map_fn.size === 0 && !this.atomic_enabled) return '';

        /* Start script */
        let out = '';

        /* Include atomics IF atomic is enabled AND we're doing a root render AND we dont have a mount path */
        if (this.atomic_enabled && this.root_renderer && !this.mount_path) {
            out += ATOMIC_GLOBAL;
        }

        if (this.map_fn.size) {
            // --- Payloads (TFD) ---
            const TFD = [...this.map_data].map(([v, k]) => '"' + k + '":' + v).join(',');
            out += `const TFD={${TFD}};`;

            // --- Functions (TFF) ---
            const TFF = [...this.map_fn].map(([v, k]) => '"' + k + '":' + v).join(',');
            out += `const TFF={${TFF}};`;

            // --- Runner ---
            out += [
                /* Global Utils */
                `const TFU=w.${GLOBAL_UTILS_NAME};`,
                /* Loop through each function and instantiate vm */
                'for(const id in TFF){',
                'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                'for(let n of N){',
                this.atomic_enabled ? ATOMIC_VM_BEFORE : '',
                /* Run function and pass data */
                'const dId=n.getAttribute("data-tfhd");',
                'try{',
                `TFF[id]({el:n,data:w.${GLOBAL_DATA_REACTOR_NAME}(n,dId?TFD[dId]:{}),$:TFU})`,
                '}catch{}',
                this.atomic_enabled ? ATOMIC_VM_AFTER : '',
                '}',
                '}',
            ].join('');
        }

        if (!out) return '';

        /* Finalize iife */
        if (this.atomic_enabled && this.mount_path && this.root_renderer) {
            out = [
                '(function(d,w){',
                'const run=()=>{',
                out,
                '};',
                `if(!w.${GLOBAL_HYDRATED_NAME}){`,
                'const wait=()=>{w.$tfhydra?run():setTimeout(wait,1)};',
                'wait();',
                '}else{run()}',
                '})(document,window);',
            ].join('');
        } else {
            out = '(function(d,w){' + out + '})(document,window);';
        }

        const n_nonce = nonce();
        return n_nonce ? '<script nonce="' + n_nonce + '">' + out + '</script>' : '<script>' + out + '</script>';
    }

    inject(html: string): string {
        if (typeof html !== 'string') return '';

        const bodyIdx = html.indexOf('</body>');
        const n_nonce = nonce();

        /* Mount script */
        let mount_script = '';
        if (this.mount_path && (html.startsWith('<!DOCTYPE') || html.startsWith('<html'))) {
            mount_script = n_nonce
                ? `<script nonce="${n_nonce}" src="${this.mount_path}" defer></script>`
                : `<script src="${this.mount_path}" defer></script>`;
        }

        const injection = mount_script + this.flush();

        return bodyIdx >= 0 ? html.slice(0, bodyIdx) + injection + html.slice(bodyIdx) : html + injection;
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
