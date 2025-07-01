import {MARKER} from './Style';
import {nonce, NONCEMARKER} from '../ctx/nonce';
import {atomicMinify} from '../script/util';
import {djb2Hash, injectBefore} from '../../../utils/Generic';

type StyleEngineRegisterOptions = {
    /**
     * A potential media query this rule belongs to
     */
    query?: string;
    /**
     * A potential sub-selector this rule belongs to
     */
    selector?: string | null;
};

type RuleEntry = {
    base: Set<string>;
    media: Record<string, Set<string>>; // query -> rule
};

export const PRIME = 'data-tfs-p';
export const SHARD = 'data-tfs-s';
export const OBSERVER = atomicMinify(`(function(){
    const cn = new Set();
    let prime = document.querySelector("style[${PRIME}]");
    if (!prime) return;

    /* Scan primary for known classes */
    const cnr = /\\.([a-zA-Z0-9_-]+)[,{]/g;
    let m;
    while ((m = cnr.exec(prime.textContent))) cn.add(m[1]);

    function boot() {
        const o = new MutationObserver(e => {
            /* Scan mutations for shard style blocks */
            let pp = new Set();
            for (let i = 0; i < e.length; i++) {
                for (let y = 0; y < e[i].addedNodes.length; y++) {
                    const nA = e[i].addedNodes[y];
                    if (
                        nA.nodeType === Node.ELEMENT_NODE &&
                        nA.tagName === "STYLE" &&
                        nA.hasAttribute("${SHARD}")
                    ) {
                        const s = nA.getAttribute("${SHARD}");
                        if (!s || cn.has(s)) {
                            nA.remove();
                            continue;
                        }

                        cn.add(s);
                        if (nA.textContent) pp.add(nA.textContent);
                        nA.remove();
                    }
                }
            }
            /* Build a prime shard and append after prime */
            if (pp.size) {
                const nN = document.createElement("style");
                const nS = window.$${NONCEMARKER};
                if (typeof nS === "string" && nS.length) nN.setAttribute("nonce", nS);
                nN.setAttribute("${PRIME}s", "");
                nN.textContent = [...pp.values()].join("");
                prime.after(nN);
            }
        });

        o.observe(document.body, {childList: true, subtree: true});
    }

    if (document.body) {
        boot();
    } else {
        document.addEventListener("DOMContentLoaded", boot);
    }
})();`);

export class StyleEngine {
    /* Global hash register of hashes to their rules */
    protected rules: Record<string, RuleEntry> = {};

    /* Order of rule injection */
    protected order: Set<string> = new Set();

    /* Whether or not style injection was explicitly disabled for this engine */
    protected disabled = false;

    /* Mount path for root styles */
    protected mount_path: string | null = null;

    cache: Map<string, string> = new Map();

    /**
     * Set the disabled state of this engine. In disabled mode we will not flush non-mounted styles
     */
    setDisabled(val: boolean) {
        this.disabled = !!val;
    }

    /**
     * Register a rule (base or media) under a known class name
     *
     * @param {string} rule - Raw CSS declaration (e.g., 'color:red')
     * @param {string} name - Deterministic class name to register under (usually the output of StyleEngine.hash)
     * @param {StyleEngineRegisterOptions} opts - Optional context including media query and selector
     */
    register(rule: string, name: string, opts: StyleEngineRegisterOptions): void {
        if (
            typeof rule !== 'string' ||
            !rule.length ||
            (opts.selector !== undefined && (typeof opts.selector !== 'string' || !opts.selector.length) && opts.selector !== null)
        )
            return;

        const {query, selector} = opts;

        const key = name || (rule.startsWith('@keyframes') ? rule.slice(11).split('{', 1)[0].trim() : djb2Hash(rule));

        let entry: RuleEntry = this.rules[key];
        if (!entry) {
            entry = {base: new Set(), media: {}} as RuleEntry;
            this.rules[key] = entry;
            if (!this.order.has(key)) this.order.add(key);
        }

        if (!query) {
            if (rule[0] === '@') {
                entry.base.add(rule.trim());
            } else {
                const prefix = selector !== null ? (selector ?? '.' + name) : '';
                entry.base.add(prefix + (selector === null ? rule.trim() : `{${rule.trim()}}`));
            }
        } else {
            if (!entry.media[query]) entry.media[query] = new Set();
            const prefix = selector !== null ? (selector ?? '.' + name) : '';
            entry.media[query].add(prefix ? prefix + '{' + rule.trim() + '}' : rule.trim());
        }
    }

    /**
     * Flush all collected styles into a single <style> tag
     */
    flush(opts: {mode?: 'style' | 'file' | 'prime' | 'shards'} = {}): string {
        const n_nonce = nonce();
        const order = this.order.values();
        switch (opts?.mode) {
            case 'style':
            case 'file':
            case 'prime': {
                let out = '';
                const media: Record<string, string[]> = {};

                for (const name of order) {
                    const entry = this.rules[name];

                    if (entry.base) out += [...entry.base].join('');
                    if (entry.media) {
                        for (const query in entry.media) {
                            (media[query] ??= []).push(...entry.media[query]);
                        }
                    }
                }

                for (const query in media) {
                    out += query + '{' + media[query].join('') + '}';
                }

                if (opts.mode === 'file') {
                    return out;
                } else if (opts.mode === 'style') {
                    if (!out) return '';
                    return n_nonce ? `<style nonce="${n_nonce}">${out}</style>` : `<style>${out}</style>`;
                } else {
                    const observer = (n_nonce ? '<script nonce="' + n_nonce + '">' : '<script>') + OBSERVER + '</script>';

                    return n_nonce
                        ? `<style nonce="${n_nonce}" ${PRIME}>${out}</style>${observer}`
                        : `<style ${PRIME}>${out}</style>${observer}`;
                }
            }
            case 'shards': {
                const shards: string[] = [];

                for (const name of order) {
                    const entry = this.rules[name];

                    // Build the style block
                    let content = '';

                    if (entry.base) content += [...entry.base].join('');

                    if (entry.media) {
                        for (const query in entry.media) {
                            content += query + '{' + [...entry.media[query].values()].join('') + '}';
                        }
                    }

                    if (content) {
                        const style = n_nonce
                            ? `<style ${SHARD}="${name}" nonce="${n_nonce}">${content}</style>`
                            : `<style ${SHARD}="${name}">${content}</style>`;
                        shards.push(style);
                    }
                }

                return shards.join('');
            }
            default:
                return '';
        }
    }

    /**
     * Replace the style marker with collected styles in the rendered HTML
     *
     * @param {string} html - HTML string containing the marker or needing prepended styles
     */
    inject(html: string): string {
        /* If disabled, return */
        if (this.disabled) return typeof html === 'string' ? html.replaceAll(MARKER, '') : '';

        /**
         * On full-page render we work with a single block,
         * On fragment render we work with individual shards per rule hash
         *
         * This allows a global mutation observer to 'filter' shards out when they arrive to only include the ones
         * that matter.
         */
        const mode = typeof html !== 'string' || !html.length ? 'style' : html.startsWith('<!DOCTYPE') || html.startsWith('<html') ? 'prime' : 'shards'; // eslint-disable-line prettier/prettier
        if (mode === 'style') return this.flush({mode});

        /* Get mount styles */
        let mount_styles = '';
        if (this.mount_path && mode === 'prime') {
            const n_nonce = nonce();
            if (n_nonce) mount_styles = '<link rel="stylesheet" nonce="' + n_nonce + '" href="' + this.mount_path + '">';
            else mount_styles = '<link rel="stylesheet" href="' + this.mount_path + '">';
        }

        const styles = this.flush({mode});

        /* Inject at marker */
        const marker_idx = html.indexOf(MARKER);
        if (marker_idx >= 0) {
            const before = html.slice(0, marker_idx);
            const after = html.slice(marker_idx + MARKER.length).replaceAll(MARKER, '');

            return before + mount_styles + styles + after;
        }

        /* If in shard/fragment mode */
        if (mode === 'shards') return html + styles;

        return injectBefore(html, mount_styles + styles, ['</head>', '</body>']);
    }

    /**
     * Clears all internal state
     */
    reset(): void {
        this.rules = {};
        this.order = new Set();
    }

    /**
     * Sets mount path for as-file renders of root styles
     *
     * @param {string} path - Mount path for client root styles
     */
    setMountPath(path: string) {
        this.mount_path = path;
    }
}
