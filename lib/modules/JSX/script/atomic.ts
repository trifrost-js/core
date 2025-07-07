import {type Promisify} from '../../../types/generic';
import {atomicMinify} from './util';

export const GLOBAL_HYDRATED_NAME = '$tfhydra';
export const GLOBAL_UTILS_NAME = '$tfutils';
export const GLOBAL_DATA_REACTOR_NAME = '$tfdr';
export const GLOBAL_ARC_NAME = '$tfarc';
const GLOBAL_OBSERVER_NAME = '$tfo';
const GLOBAL_RELAY_NAME = '$tfr';
const GLOBAL_STORE_NAME = '$tfs';
const GLOBAL_UTIL_EQUAL = '$tfequal';
const GLOBAL_UTIL_CLONE = '$tfclone';
const GLOBAL_UTIL_CREATE_EVENT = '$tfevent';
const GLOBAL_CLOCK = '$tfc';
const GLOBAL_CLOCK_TICK = '$tfcr';
const VM_NAME = '$tfVM';
export const VM_ID_NAME = '$uid';
const VM_RELAY_SUBSCRIBE_NAME = '$subscribe';
const VM_RELAY_SUBSCRIBE_ONCE_NAME = '$subscribeOnce';
const VM_RELAY_UNSUBSCRIBE_NAME = '$unsubscribe';
const VM_RELAY_PUBLISH_NAME = '$publish';
const VM_HOOK_UNMOUNT_NAME = '$unmount';
const VM_HOOK_MOUNT_NAME = '$mount';

type StoreTopics<K extends string> = `$store:${K}`;

type DotPathLevels = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; /* Up to depth 10, this prevents infinite recursion */

type DotPaths<T, D extends number = 10> = [D] extends [never]
    ? never
    : T extends object
      ? {
            [K in keyof T & string]: T[K] extends object ? K | `${K}.${DotPaths<T[K], DotPathLevels[D]>}` : K;
        }[keyof T & string]
      : '';

type SVGTagNameMap = keyof SVGElementTagNameMap;
type HTMLTagNameMap = keyof HTMLElementTagNameMap;

type KnownTagNameMap = {[K in HTMLTagNameMap]: HTMLElementTagNameMap[K]} & {[K in SVGTagNameMap]: SVGElementTagNameMap[K]};
type KnownTag = keyof KnownTagNameMap;

type Trim<S extends string> = S extends ` ${infer R}` ? Trim<R> : S;
type LastWord<S extends string> = S extends `${string} ${infer Tail}`
    ? LastWord<Tail>
    : S extends `${string}>${infer Tail}`
      ? LastWord<Tail>
      : S extends `${string}+${infer Tail}`
        ? LastWord<Tail>
        : S extends `${string}~${infer Tail}`
          ? LastWord<Tail>
          : S;

type ExtractTag<S extends string> = LastWord<Trim<S>> extends `${infer Tag extends KnownTag}${string}` ? Tag : never;

type InferElementFromSelector<S extends string> = ExtractTag<S> extends infer T extends KnownTag ? KnownTagNameMap[T] : Element;

/**
 * Infers the correct event type for a given target and event name.
 *
 * Falls back to CustomEvent<Payload> for unknown events.
 */
type InferDOMEvent<Target extends EventTarget, K extends string, Payload = unknown> = Target extends Window
    ? K extends keyof WindowEventMap
        ? WindowEventMap[K]
        : CustomEvent<Payload>
    : Target extends Document
      ? K extends keyof DocumentEventMap
          ? DocumentEventMap[K]
          : CustomEvent<Payload>
      : Target extends Element
        ? K extends keyof HTMLElementEventMap
            ? HTMLElementEventMap[K]
            : CustomEvent<Payload>
        : CustomEvent<Payload>;

export type TriFrostAtomicModule<
    Relay extends Record<string, unknown> = {},
    Store extends Record<string, unknown> = {},
    RelayKeys extends keyof Relay | StoreTopics<keyof Store & string> = keyof Relay | StoreTopics<keyof Store & string>,
> = {
    [VM_RELAY_SUBSCRIBE_NAME]<T extends RelayKeys>(
        topic: T,
        fn: T extends keyof Relay
            ? (data: Relay[T]) => void
            : T extends StoreTopics<infer K>
              ? K extends keyof Store
                  ? (data: Store[K]) => void
                  : (data: unknown) => void
              : (data: unknown) => void,
    ): void;
    [VM_RELAY_SUBSCRIBE_ONCE_NAME]<T extends RelayKeys>(
        topic: T,
        fn: T extends keyof Relay
            ? (data: Relay[T]) => void
            : T extends StoreTopics<infer K>
              ? K extends keyof Store
                  ? (data: Store[K]) => void
                  : (data: unknown) => void
              : (data: unknown) => void,
    ): void;
    [VM_RELAY_UNSUBSCRIBE_NAME]<T extends RelayKeys>(topic?: T): void;
    [VM_RELAY_PUBLISH_NAME]<T extends RelayKeys>(
        topic: T,
        data?: T extends keyof Relay ? Relay[T] : T extends StoreTopics<infer K> ? (K extends keyof Store ? Store[K] : unknown) : unknown,
    ): void;
};

export type TriFrostAtomicVM<
    Relay extends Record<string, unknown> = {},
    Store extends Record<string, unknown> = {},
    RelayKeys extends keyof Relay | StoreTopics<keyof Store & string> = keyof Relay | StoreTopics<keyof Store & string>,
> = TriFrostAtomicModule<Relay, Store, RelayKeys> & {
    [VM_ID_NAME]: string;
    /* VM Hooks */
    [VM_HOOK_MOUNT_NAME]?: () => void;
    [VM_HOOK_UNMOUNT_NAME]?: () => void;
};

export type TriFrostAtomicProxy<T> = T & {
    /* Bind */
    $bind<K extends DotPaths<T>>(key: K, selector: string): void;
    $bind<K extends DotPaths<T>>(key: K, selector: string, handler: (newVal: any, oldVal: any) => Promisify<void>): void;
    $bind<K extends DotPaths<T>>(
        key: K,
        selector: string,
        options: {handler: (newVal: any, oldVal: any) => Promisify<void>; immediate?: boolean},
    ): void;
    /* Watch */
    $watch: <K extends DotPaths<T>>(key: K, fn: (newVal: any, oldVal: any) => Promisify<void>, options?: {immediate?: boolean}) => void;
    /* Set */
    $set: (key: DotPaths<T> | T, val?: any) => void;
};

export type TriFrostAtomicUtils<
    Store extends Record<string, unknown> = {},
    TFCSSVar extends string = string,
    TFCSSTheme extends string = string,
> = {
    /* Blurs the currently focussed dom element */
    blurActive: () => void;
    /* Clears the children from a dom node */
    clear: (el: Element) => void;
    create: <K extends keyof KnownTagNameMap>(
        tag: K,
        opts?: {
            attrs?: Record<string, string>;
            style?: Partial<CSSStyleDeclaration>;
            children?: (Node | string)[];
        },
    ) => KnownTagNameMap[K];
    debounce: <T extends (...args: any[]) => any>(fn: T, delay: number) => T;
    eq: (a: unknown, b: unknown) => boolean;
    uid: () => string;
    sleep: (ms: number) => Promise<void>;
    fetch: <T = DocumentFragment | string | Blob | object | null>(
        url: string,
        options?: {
            method?: string;
            headers?: Record<string, string>;
            body?: any;
            timeout?: number;
            credentials?: RequestCredentials;
        },
    ) => Promise<{
        content: T | null;
        status: number;
        ok: boolean;
        headers: Headers;
        raw: Response;
    }>;
    /* Event Listening */
    fire: <T = unknown>(el: Element, type: string, options?: {data?: T; mode?: 'up' | 'down'}) => void;
    on: <Payload = unknown, Target extends EventTarget = EventTarget, K extends string = string>(
        el: Target,
        type: K,
        handler: (evt: InferDOMEvent<Target, K, Payload>) => void,
    ) => () => void;
    once: <Payload = unknown, Target extends EventTarget = EventTarget, K extends string = string>(
        el: Target,
        type: K,
        handler: (evt: InferDOMEvent<Target, K, Payload>) => void,
    ) => void;
    /* DOM selectors */
    query: <S extends string>(root: Node, selector: S) => InferElementFromSelector<S> | null;
    queryAll: <S extends string>(root: Node, selector: S) => InferElementFromSelector<S>[];
    /* Timed fn */
    timedAttr: (el: Element, attr: string, opts: {value?: string; duration: number; cleanup?: boolean; after?: () => void}) => number;
    timedClass: (el: Element, className: string, opts: {duration: number; cleanup?: boolean; after?: () => void}) => number;
    /* Store Get */
    storeGet<K extends keyof Store>(key: K): Store[K];
    storeGet(key: string): unknown;
    /* Store Set */
    storeSet<K extends keyof Store>(key: K, value: Store[K]): void;
    storeSet(key: string, value: unknown): void;
    /* CSS variable access */
    cssVar: (name: TFCSSVar | `--${string}`) => string;
    cssTheme: (name: TFCSSTheme | `--${string}`) => string;
};

export const ATOMIC_GLOBAL = atomicMinify(`(function(win,doc){
    const def = (n, v, t = win) => {
        if (!t[n]) Object.defineProperty(t, n, {value:v, configurable:!1, writable:!1});
    };

    const eq = (a,b) => {
        if (a === b) return!0;
        switch (typeof a) {
            case "number":
                return Number.isNaN(a) && Number.isNaN(b);
            case "object":{
                if (!a || !b) return!1;
                if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v,i)=>eq(v,b[i]));
                const pa = Object.prototype.toString.call(a);
                const pb = Object.prototype.toString.call(b);
                if (pa !== pb) return!1;
                switch (pa) {
                    case "[object Date]": return a.valueOf()===b.valueOf();
                    case "[object Object]": {
                        const ka=Object.keys(a);
                        const kb=Object.keys(b);
                        if(ka.length !== kb.length) return!1;
                        return ka.every(k=>eq(a[k],b[k]));
                    }
                    case "[object Error]": return a.name === b.name && a.message === b.message;
                    case "[object RegExp]": return String(a) === String(b);
                    default:
                        return !1;
                }
            }
            default:
                return !1;
        }
    };
    def("${GLOBAL_UTIL_EQUAL}", eq);

    def("${GLOBAL_UTIL_CLONE}", v => (v === undefined || v === null || typeof v !== "object") ? v : structuredClone(v));

    def("${GLOBAL_UTIL_CREATE_EVENT}", (t, o) => {
        try {
            return new CustomEvent(t, o);
        } catch (_) {
            const e = doc.createEvent("CustomEvent");
            e.initCustomEvent(t, o?.bubbles, o?.cancelable, o?.detail);
            return e;
        }
    });

    def("${GLOBAL_RELAY_NAME}", (() => {
        const s = Object.create(null);
        return Object.freeze({
            publish: (msg, data) => {
                if (typeof msg !== "string" || !s[msg]) return;
                for (let i = 0; i < s[msg].length; i++) try { s[msg][i].fn(data) } catch {}
            },
            subscribe: (vmid, msg, fn) => {
                if (
                    typeof vmid !== "string" ||
                    typeof msg !== "string" ||
                    typeof fn !== "function"
                ) return;
                const subs = (s[msg] ??= []);
                const idx = subs.findIndex(el => el.id === vmid);
                if (idx >= 0) subs[idx].fn = fn;
                else subs.push({id: vmid, fn});
            },
            unsubscribe: (vmid, msg) => {
                if (typeof vmid !== "string") return;
                if (typeof msg === "string") {
                    if (!(msg in s)) return;
                    s[msg] = s[msg].filter(el => el.id !== vmid);
                } else {
                    for (const key of Object.keys(s)) {
                        s[key] = s[key].filter(el => el.id !== vmid);
                    }
                }
            }
        })
    })());

    def("${GLOBAL_OBSERVER_NAME}", (() => {
        const clean = nR => {
            if (nR.${VM_NAME}) {
                if (typeof nR.${VM_HOOK_UNMOUNT_NAME}==="function") {
                    try{nR.$unmount()}catch{}
                }
                win.${GLOBAL_RELAY_NAME}?.unsubscribe(nR.${VM_ID_NAME});
                win.${GLOBAL_CLOCK}?.delete(nR.${VM_ID_NAME});
                win.${GLOBAL_ARC_NAME}?.release(nR.${VM_ID_NAME});
            }
            if (nR.children?.length) {
                for (let i = 0; i < nR.children.length; i++) {
                    clean(nR.children[i]);
                }
            }
        };
        const o = new MutationObserver(e => {
            for (let i = 0; i < e.length; i++) {
                for (let y = 0; y < e[i].removedNodes.length; y++) {
                    clean(e[i].removedNodes[y]);
                }
            }
        });
        o.observe(doc.body, {childList:!0, subtree:!0});
        return o;
    })());

    def("${GLOBAL_STORE_NAME}", (() => {
        const s = Object.create(null);
        return Object.freeze({
            get: key => {
                if (typeof key !== "string" || !key) return undefined;
                return s[key]
            },
            set: (key, val) => {
                if (typeof key !== "string" || !key) return;
                s[key] = val;
                win.${GLOBAL_RELAY_NAME}.publish("$store:" + key, val);
            },
        });
    })());

    def("${GLOBAL_CLOCK}", new Map());

    def("${GLOBAL_CLOCK_TICK}", (() => {
        let tp = false;
        const tv = new Set();
        return uid => {
            tv.add(uid);
            if (!tp) {
                tp = true;
                requestAnimationFrame(() => {
                    const uids = [...tv.values()];
                    tp = false;
                    tv.clear();
                    for (let i = 0; i < uids.length; i++) {
                        try {
                            const fn = win.${GLOBAL_CLOCK}.get(uids[i]);
                            if (fn) fn();
                        } catch {}
                    }
                });
            }
        };
    })());

    /* Data Reactor */
    def("${GLOBAL_DATA_REACTOR_NAME}", (root, raw) => {
        const store = structuredClone(raw);
        const subs = Object.create(null);
        const pending = new Set();

        const get = path => path.split(".").reduce((o, k) => o?.[k], store);
        const set = (path, val) => {
            const k = path.split(".");
            let c = store;
            for (let i = 0; i < k.length - 1; i++) c = c[k[i]] ??= {};
            const last = k.at(-1);
            if (c[last] === val) return;
            c[last] = val;
        };

        const notify = path => {
            let c = "";
            const parts = path.split(".");
            for (let i = 0; i < parts.length; i++) {
                c = i === 0 ? parts[0] : c + "." + parts[i];
                pending.add(c);
            }
            win.${GLOBAL_CLOCK_TICK}(root.${VM_ID_NAME});
        };

        const tick = () => {
            if (!pending.size) return;
            for (const key of pending) {
                const handlers = subs[key];
                if (!handlers) continue;
                const val = get(key);
                for (let i = 0; i < handlers.length; i++) {
                    try {
                        const fn = handlers[i];
                        if (!win.${GLOBAL_UTIL_EQUAL}(fn._last, val)) {
                            fn(val, fn._last);
                            fn._last = win.${GLOBAL_UTIL_CLONE}(val);
                        }
                    } catch {}
                }
            }
            pending.clear();
        };

        const patch = (obj, val) => {
            const marks = new Set();
            if (typeof obj === "string") {
                set(obj, val);
                marks.add(obj);
            } else {
                const walk = (path, cursor) => {
                    for (const k in cursor) {
                        const full = path ? path + "." + k : k;
                        const v = cursor[k];
                        if (Object.prototype.toString.call(v) === "[object Object]") walk(full, v);
                        else {
                            set(full, v);
                            marks.add(full);
                        }
                    }
                };
                walk("", obj);
            }
            for (const path of marks) notify(path);
        };

        const getIV = (els, path) => {
            if (!els.length) return undefined;
            const el = els[0];
            if (el.type === "checkbox") {
                if (els.length > 1) return [...els].filter(e => e.checked).map(e => e.value);
                return !!el.checked;
            }
            if (el.type === "radio") {
                const c = [...els].find(e => e.checked);
                return c ? c.value : get(path);
            }
            if (el.tagName === "SELECT" && el.multiple) return [...el.selectedOptions].map(o => o.value);
            return el.value;
        };

        const setIV = (els, val) => {
            if (!els.length) return;
            const e = els[0];
            if (els.length > 1 && e.type === "checkbox") {
                for (const el of els) el.checked = Array.isArray(val) && val.includes(el.value);
            }
            else if (e.type === "checkbox") e.checked = !!val;
            else if (e.type === "radio") e.checked = e.value === val;
            else if (e.tagName === "SELECT" && e.multiple && Array.isArray(val)) {
                for (const o of e.options) o.selected = val.includes(o.value);
            } else e.value = val ?? "";
        };

        win.${GLOBAL_CLOCK}.set(root.${VM_ID_NAME}, tick);

        return new Proxy(store, {
            get(_, key) {
                switch (key) {
                    case "$bind": return (path, selector, watcher) => {
                        const els = [...root.querySelectorAll(selector)];
                        if (!els.length) return;

                        const c = get(path);
                        if (c === undefined) {
                            set(path, getIV(els, path));
                            notify(path);
                        } else {
                            setIV(els, c);
                        }

                        const fn = () => {
                            set(path, getIV(els, path));
                            notify(path);
                        };

                        for (const el of els) {
                            el.addEventListener("input", fn);
                            if (
                                el.type === "checkbox" ||
                                el.type === "radio" ||
                                el.tagName === "SELECT"
                            ) el.addEventListener("change", fn);
                        }

                        (subs[path] ??= []).push(v => setIV(els, v));

                        if (typeof watcher === "function") {
                            watcher._last = win.${GLOBAL_UTIL_CLONE}(get(path));
                            subs[path].push(watcher);
                        } else if (typeof watcher?.handler === "function") {
                            const {immediate,handler} = watcher;
                            handler._last = win.${GLOBAL_UTIL_CLONE}(get(path));
                            subs[path].push(handler);
                            if (immediate === true) handler(handler._last);
                        }
                    };
                    case "$watch": return (path, fn, opts = {}) => {
                        if (typeof path !== "string" || typeof fn !== "function") return;
                        (subs[path] ??= []).push(fn);
                        fn._last = win.${GLOBAL_UTIL_CLONE}(get(path));
                        if (opts?.immediate === true) fn(fn._last);
                    };
                    case "$set": return patch;
                    default: return store[key];
                }
            },
            set(_, key, val) {
                if (win.${GLOBAL_UTIL_EQUAL}(store[key], val)) return true;
                store[key] = val;
                notify(String(key));
                return true;
            }
        });
    });

    /* Utils */
    def("${GLOBAL_UTILS_NAME}", (() => {
        const obj = Object.create(null);
        const oD = (n, v) => def(n, v, obj);
        oD("blurActive", () => {
            if (doc.activeElement instanceof HTMLElement) doc.activeElement.blur();
        });
        oD("clear", n => {
            while (n.firstChild) n.removeChild(n.firstChild);
        });
        oD("create", (() => {
            const s = new Set(["svg", "path", "circle", "rect", "g", "defs", "text", "use", "line", "polyline", "polygon", "ellipse", "symbol", "clipPath", "linearGradient", "radialGradient", "filter", "mask", "pattern"]);
            return (t, o = {}) => {
                const e = s.has(t)
                    ? document.createElementNS("http://www.w3.org/2000/svg", t)
                    : document.createElement(t);
                if (o.attrs) for (const k in o.attrs) e.setAttribute(k, o.attrs[k]);
                if (o.style) for (const k in o.style) e.style[k] = o.style[k];
                if (o.children) for (const c of o.children) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
                return e;
            };
        })());
        oD("debounce", (fn, ms) => {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn(...args), ms);
            };
        });
        oD("eq", win.${GLOBAL_UTIL_EQUAL});
        oD("uid", () => crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
        oD("sleep", ms => new Promise(r => setTimeout(r, ms)));
        oD("fetch", async (url, o = {}) => {
            const { method = "GET", headers = {}, body, timeout, credentials = "include" } = o;
            const isJSON = body && typeof body === "object" && !(body instanceof FormData);
            const nHeaders = { ...headers };
            const payload = isJSON ? JSON.stringify(body) : body;

            if (isJSON && !("Content-Type" in nHeaders))
                nHeaders["Content-Type"] = "application/json";

            const ctrl = typeof timeout === "number" ? new AbortController() : null;
            const tId = ctrl
                ? setTimeout(() => ctrl.abort(), timeout)
                : null;

            try {
                const r = await fetch(url, {
                    method,
                    headers: nHeaders,
                    body: method !== "GET" && body !== undefined ? payload : undefined,
                    signal: ctrl?.signal,
                    credentials
                });

                if (tId) clearTimeout(tId);

                const rt = r.headers.get("Content-Type")?.toLowerCase() || "";
                let c;
                try {
                    if (rt.includes("application/json")) c = await r.json();
                    else if (rt.includes("text/html")) {
                        const v = await r.text();
                        c = doc.createRange().createContextualFragment(v);
                    }
                    else if (rt.includes("text/")) c = await r.text();
                    else if (rt.includes("application/octet-stream")) c = await r.blob();
                    else c = await r.text();
                } catch {}

                return {
                    content: c ?? null,
                    ok: r.status >= 200 && r.status < 300,
                    status: r.status,
                    headers: r.headers,
                    raw: r
                };
            } catch (err) {
                if (tId) clearTimeout(tId);
                if (err?.name === "AbortError") {
                    return {
                        content: null,
                        ok: false,
                        status: 408,
                        headers: new Headers(),
                        raw: null
                    };
                }
                throw err;
            }
        });
        oD("fire", (n, t, o) => n.dispatchEvent(
            win.${GLOBAL_UTIL_CREATE_EVENT}(t, {
                detail: o?.data,
                bubbles:(o?.mode ?? "up") === "up",
                cancelable:!0
            })
        ));
        oD("on", (n, t, fn) => {
            n.addEventListener(t, fn);
            return () => n?.removeEventListener(t, fn);
        });
        oD("once", (n, t, fn) => {
            const w = e => {
                try { fn(e); }
                finally { n?.removeEventListener(t, w); }
            };
            n.addEventListener(t, w);
        });
        oD("query", (n, q) => {
            if (!n?.querySelector || typeof q !== "string") return null;
            const scopable = n.nodeType === Node.ELEMENT_NODE && !q.trimStart().startsWith(":scope");

            try {
                return n.querySelector(scopable ? ":scope " + q : q);
            } catch {
                return null;
            }
        });
        oD("queryAll", (n, q) => {
            if (!n?.querySelectorAll || typeof q !== "string") return [];
            const scopable = n.nodeType === Node.ELEMENT_NODE && !q.trimStart().startsWith(":scope");

            try {
                return [...n.querySelectorAll(scopable ? ":scope " + q : q)];
            } catch {
                return [];
            }
        });
        oD("storeGet", win.${GLOBAL_STORE_NAME}.get);
        oD("storeSet", win.${GLOBAL_STORE_NAME}.set);
        oD("timedAttr", (n, k, o) => {
            n.setAttribute(k, o.value ?? "");
            return setTimeout(() => {
                if (o.cleanup !== false) el.removeAttribute(k);
                o.after?.();
            }, o.duration);
        });
        oD("timedClass", (n, k, o) => {
            n.classList.add(k);
            return setTimeout(() => {
                if (o.cleanup !== false) el.classList.remove(k);
                o.after?.();
            }, o.duration);
        });
        oD("cssVar", (() => {
            let c;
            return v => {
                if (!c) c = getComputedStyle(doc.documentElement);
                return c.getPropertyValue(v.startsWith("--") ? v : "--v-" + v).trim() || "";
            };
        })());
        oD("cssTheme", (() => {
            let c, t;
            return v => {
                const n = doc.documentElement;
                const tc = n.getAttribute("data-theme");
                if (!c || tc !== t) {
                    c = getComputedStyle(n);
                    t = tc;
                }
                return c.getPropertyValue(v.startsWith("--") ? v : "--t-" + v).trim() || "";
            };
        })());

        return Object.freeze(obj);
    })());

    /* __name shim */
    def("__name", (fn, n) => {
        try {Object.defineProperty(fn, "name", {value: n, configurable: true});} catch {}
        return fn;
    });

    def("${GLOBAL_HYDRATED_NAME}", !0);
})(window,document);`);

export const ARC_GLOBAL = atomicMinify(`(function(w){
    const oD = (n, v, t) => {
        if (!t[n]) Object.defineProperty(t, n, {value:v, configurable:!1, writable:!1});
    };

    oD("${GLOBAL_ARC_NAME}", (() => {
        const f=new Map(),d=new Map(),v=new Map();

        return Object.freeze({
            release(uid){
                const r = v.get(uid);
                if(!r) return;
                v.delete(uid);
                const de = d.get(r.data_id);
                if(de && --de.refs <= 0) d.delete(r.data_id);
            },
            spark(FNS, DAT){
                const ATOMIC = !!w.${GLOBAL_HYDRATED_NAME};
                for (const [DID, val] of DAT) {
                    if(!d.has(DID))d.set(DID,{val,refs:0});
                }

                for (const [FID, fn] of FNS) {
                    if(fn !== undefined && !f.has(FID)) f.set(FID, {fn});

                    const FREG = f.get(FID);
                    if (!FREG?.fn) continue;
                    const nodes = document.querySelectorAll(\`[data-tfhf="\${FID}"]\`);
                    for (const n of nodes) {
                        const DID = n.getAttribute("data-tfhd") || undefined;
                        const DREG = DID ? d.get(DID) : {};
                        const UID = Math.random().toString(36).slice(2);
                        oD("${VM_ID_NAME}", UID, n);
                        if (ATOMIC && !n.${VM_NAME}) {
                            oD("${VM_RELAY_SUBSCRIBE_NAME}", (msg, fn) => w.${GLOBAL_RELAY_NAME}.subscribe(n.${VM_ID_NAME}, msg, fn), n);
                            oD("${VM_RELAY_SUBSCRIBE_ONCE_NAME}", (msg, fn) => {
                                w.${GLOBAL_RELAY_NAME}.subscribe(n.${VM_ID_NAME}, msg, v => {
                                    fn(v);
                                    n.${VM_RELAY_UNSUBSCRIBE_NAME}(msg);
                                });
                            }, n);
                            oD("${VM_RELAY_UNSUBSCRIBE_NAME}", msg => w.${GLOBAL_RELAY_NAME}.unsubscribe(n.${VM_ID_NAME}, msg), n);
                            oD("${VM_RELAY_PUBLISH_NAME}", (msg, data) => w.${GLOBAL_RELAY_NAME}.publish(msg, data), n);
                            oD("${VM_NAME}", true, n);
                        }
                        try {
                            FREG.fn(ATOMIC
                                ? {el:n, data: w.${GLOBAL_DATA_REACTOR_NAME}(n,DREG?.val??{}), $: w.${GLOBAL_UTILS_NAME}}
                                : {el:n, data: DREG?.val??{}});
                            v.set(UID, {fn_id: FID, data_id: DID});
                            if (DID && DREG) DREG.refs++;
                            if (ATOMIC && typeof n.${VM_HOOK_MOUNT_NAME} === "function") {
                                try {n.${VM_HOOK_MOUNT_NAME}()} catch {}
                            }
                        } catch {}
                    }
                }
            },
        });
    })(), w);
})(window);`);

export const ARC_GLOBAL_OBSERVER = atomicMinify(`(function(){
    const c = n => {
        if (n && n.${VM_ID_NAME}) window.${GLOBAL_ARC_NAME}?.release(n.${VM_ID_NAME});
        if (n.children?.length) {
            for (let i = 0; i < n.children.length; i++) c(n.children[i]);
        }
    };
    const o = new MutationObserver(e => {
        for (let i = 0; i < e.length; i++) {
            for (let y = 0; y < e[i].removedNodes.length; y++) {
                c(e[i].removedNodes[y]);
            }
        }
    });
    o.observe(document.body, {childList:!0, subtree:!0});
    return o;
})();`);
