import {hexId} from '../../../utils/Generic';
import {nonce} from '../ctx/nonce';
import {ATOMIC_GLOBAL, ATOMIC_VM_BEFORE, ATOMIC_VM_AFTER} from './atomic';

export class ScriptEngine {

    /* Map storing the function bodies by id */
    protected map_fn = new Map<string, string>();

    /* Map storing the data payloads with their id */
    protected map_data = new Map<string, string>();

    /* Whether or not TriFrost atomic is enabled */
    protected atomic_enabled:boolean = false;

    /* Whether or not the Engine instance is in charge of root rendering */
    protected root_renderer:boolean = false;

    setAtomic (is_atomic:boolean) {
        this.atomic_enabled = is_atomic === true;
    }

    setRoot (is_root:boolean) {
        this.root_renderer = is_root === true;
    }

    register (fn:string, data:string|null) {
        let fn_id = this.map_fn.get(fn);
        if (!fn_id) {
            fn_id = hexId(8);
            this.map_fn.set(fn, fn_id);
        }

        let data_id:string|null = null;
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
    flush ():string {
        if (this.map_fn.size === 0 && !this.atomic_enabled) return '';

        /* Start script */
        let out = '(function(d,w){';

        if (this.atomic_enabled && this.root_renderer) out += ATOMIC_GLOBAL;

        if (this.map_fn.size) {
            // --- Payloads (TFD) ---
            const TFD = [...this.map_data].map(([v, k]) => '"' + k + '":' + v).join(',');
            out += `const TFD={${TFD}};`;

            // --- Functions (TFF) ---
            const TFF = [...this.map_fn].map(([v, k]) => '"' + k + '":' + v).join(',');
            out += `const TFF={${TFF}};`;

            // --- Runner ---
            out += [
                'for(const id in TFF){',
                'const N=d.querySelectorAll(`[data-tfhf="${id}"]`);',
                'for(let n of N){',
                this.atomic_enabled ? ATOMIC_VM_BEFORE : '',
                /* Run function and pass data */
                'const dId=n.getAttribute("data-tfhd");',
                'try{TFF[id](n,dId?TFD[dId]:undefined)}catch{}',
                this.atomic_enabled ? ATOMIC_VM_AFTER : '',
                '}',
                '}',
            ].join('');
        }

        /* Finalize iife */
        out += '})(document,window);';

        const n_nonce = nonce();
        return n_nonce
            ? '<script nonce="' + n_nonce + '">' + out + '</script>'
            : '<script>' + out + '</script>';
    }

    inject (html:string):string {
        if (typeof html !== 'string') return '';

        const script = this.flush();
        if (!script) return html;

        const body_idx = html.indexOf('</body>');
        return body_idx < 0
            ? html + script
            : html.slice(0, body_idx) + script + html.slice(body_idx);
    }

    reset (): void {
        this.map_data = new Map();
        this.map_fn = new Map();
    }

}
