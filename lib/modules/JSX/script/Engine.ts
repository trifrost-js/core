import {hexId} from '../../../utils/Generic';
import {nonce} from '../ctx/nonce';

export class ScriptEngine {

    /* Map storing the function bodies by id */
    protected map_fn = new Map<string, string>();

    /* Map storing the data payloads with their id */
    protected map_data = new Map<string, string>();

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

    flush ():string {
        if (this.map_fn.size === 0) return '';

        /* Start script */
        let out = '(function(){';

        /* Payloads */
        const TFD:string[] = [];
        for (const [d_val, d_id] of this.map_data) TFD.push('"' + d_id + '":' + d_val);
        out += 'const TFD = {' + TFD.join(',') + '};';

        /* Handlers */
        const TFF:string[] = [];
        for (const [f_val, f_id] of this.map_fn) TFF.push('"' + f_id + '":' + f_val);
        out += 'const TFF = {' + TFF.join(',') + '};';

        /* Runner */
        out += 'for (const id in TFF) {const n = document.querySelectorAll(`[data-tfhf="${id}"]`);';
        out += 'for (let i = 0; i < n.length; i++) {';
        out += 'const d = n[i].getAttribute("data-tfhd");';
        out += 'try{TFF[id](n[i], d ? TFD[d] : undefined);}catch(err){console.error(err);}';
        out += '}}';

        /* Finalize script */
        out += '})();';

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
