import {memoize} from '@valkyriestudios/utils/caching';
import {type Promisify} from '../../../types/generic';
import {atomicMinify} from './util';

export const GLOBAL_HYDRATED_NAME = '$tfhydra';
export const GLOBAL_UTILS_NAME = '$tfutils';
export const GLOBAL_DATA_REACTOR_NAME = '$tfdr';
export const GLOBAL_ARC_NAME = '$tfarc';
export const GLOBAL_ARC_LOG = '$tflog';
const GLOBAL_OBSERVER_NAME = '$tfo';
const GLOBAL_RELAY_NAME = '$tfr';
const GLOBAL_STORE_NAME = '$tfs';
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

/**
 * Infers the correct HTML element from a query selector
 */
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

type ExtractTag<S extends string> = LastWord<Trim<S>> extends `${infer Tag extends KnownTag}${string}` ? Tag : HTMLElement;

type InferElementFromSelector<S extends string> = ExtractTag<S> extends infer T extends KnownTag ? KnownTagNameMap[T] : HTMLElement;

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
    /* Event Dispatch */
    fire: <T = unknown>(el: Element, type: string, options?: {data?: T; mode?: 'up' | 'down'}) => void;
    /* Generic is* */
    isArr: <T = unknown>(val: unknown) => val is T[];
    isBool: (val: unknown) => val is boolean;
    isDate: (val: unknown) => val is Date;
    isFn: (val: unknown) => val is (...args: unknown[]) => unknown;
    isInt: (val: unknown) => val is number;
    isNum: (val: unknown) => val is number;
    isObj: <T extends Record<string, any>>(val: T | unknown) => val is T;
    isStr: (val: unknown) => val is string;
    /* Event Listening */
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
    query: {
        <K extends keyof HTMLElementTagNameMap>(root: Node, selector: K): HTMLElementTagNameMap[K] | null;
        <T extends Element = HTMLElement>(root: Node, selector: string): T | null;
        <S extends string>(root: Node, selector: S): InferElementFromSelector<S> | null;
    };
    queryAll: {
        <K extends keyof HTMLElementTagNameMap>(root: Node, selector: K): HTMLElementTagNameMap[K][];
        <T extends Element = HTMLElement>(root: Node, selector: string): T[];
        <S extends string>(root: Node, selector: S): InferElementFromSelector<S>[];
    };
    /* Timed fn */
    timedAttr: (el: Element, attr: string, opts: {value?: string; duration: number; cleanup?: boolean; after?: () => void}) => number;
    timedClass: (el: Element, className: string, opts: {duration: number; cleanup?: boolean; after?: () => void}) => number;
    /* Store Get */
    storeGet<K extends keyof Store>(key: K): Store[K];
    storeGet(key: string): unknown;
    /* Store Set */
    storeSet<K extends keyof Store>(key: K, value: Store[K], opts?: {persist?: boolean}): void;
    storeSet(key: string, value: unknown, opts?: {persist?: boolean}): void;
    /* Store Delete */
    storeDel: (key: keyof Store | string) => void;
    /* CSS variable access */
    cssVar: (name: TFCSSVar | `--${string}`) => string;
    cssTheme: (name: TFCSSTheme | `--${string}`) => string;
};

export const ATOMIC_GLOBAL = atomicMinify(`(function(win,doc){
    const def = (n, v, t = win) => {
        if (!t[n]) Object.defineProperty(t, n, {value:v, configurable:!1, writable:!1});
    };

    const isArr = v => Array.isArray(v);
    const isBool = v => v === true || v === false;
    const isDate = v => v instanceof Date && !isNaN(v);
    const isFn = v => typeof v === "function";
    const isInt = v => Number.isInteger(v);
    const isNum = v => Number.isFinite(v);
    const isObj = v => Object.prototype.toString.call(v) === "[object Object]";
    const isStr = v => typeof v === "string";
    const eq = (a,b) => {
        if (a === b) return!0;
        switch (typeof a) {
            case "number":
                return Number.isNaN(a) && Number.isNaN(b);
            case "object":{
                if (!a || !b) return!1;
                if (isArr(a)) return isArr(b) && a.length === b.length && a.every((v,i)=>eq(v,b[i]));
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

    const clone = v => !isObj(v) && !isArr(v) ? v : structuredClone(v);

    const cEvent = (t, o) => {
        try {
            return new CustomEvent(t, o);
        } catch (_) {
            const e = doc.createEvent("CustomEvent");
            e.initCustomEvent(t, o?.bubbles, o?.cancelable, o?.detail);
            return e;
        }
    };

    def("${GLOBAL_RELAY_NAME}", (() => {
        const s = Object.create(null);
        return Object.freeze({
            publish: (m, data) => {
                if (!isStr(m) || !s[m]) return;
                for (let i = 0; i < s[m].length; i++) try { s[m][i].fn(data) } catch {}
            },
            subscribe: (vmid, m, fn) => {
                if (
                    !isStr(vmid) ||
                    !isStr(m) ||
                    !isFn(fn)
                ) return;
                const subs = (s[m] ??= []);
                const idx = subs.findIndex(e => e.id === vmid);
                if (idx >= 0) subs[idx].fn = fn;
                else subs.push({id: vmid, fn});
            },
            unsubscribe: (vmid, m) => {
                if (!isStr(vmid)) return;
                if (isStr(m)) {
                    if (!(m in s)) return;
                    s[m] = s[m].filter(e => e.id !== vmid);
                } else {
                    for (const k of Object.keys(s)) {
                        s[k] = s[k].filter(e => e.id !== vmid);
                    }
                }
            }
        })
    })());

    def("${GLOBAL_OBSERVER_NAME}", (() => {
        const clean = nR => {
            if (nR.${VM_NAME}) {
                if (isFn(nR.${VM_HOOK_UNMOUNT_NAME})) {
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
        const kP = "$tfs:";
        const notify = (k, v) => win.${GLOBAL_RELAY_NAME}.publish("$store:" + k, v);
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith(kP)) {
                    const kN = k.slice(kP.length);
                    const r = localStorage.getItem(k);
                    if (r !== null) s[kN] = JSON.parse(r).v;
                }
            }
        } catch {}

        return Object.freeze({
            get: k => {
                if (!isStr(k) || !k) return undefined;
                return s[k]
            },
            set: (k, v, o = {}) => {
                if (!isStr(k) || !k) return;
                s[k] = v;
                if (o?.persist === true) {
                    try {
                        localStorage.setItem(kP + k, JSON.stringify({v}));
                    } catch {}
                }
                notify(k,v);
            },
            del: k => {
                if (!isStr(k) || !k) return;
                delete s[k];
                try {
                    localStorage.removeItem(kP + k);
                } catch {}
                notify(k,undefined);
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
                            if (isFn(fn)) fn();
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

        const get = p => p.split(".").reduce((o, k) => o?.[k], store);
        const set = (p, v) => {
            const k = p.split(".");
            let c = store;
            for (let i = 0; i < k.length - 1; i++) c = c[k[i]] ??= {};
            const last = k.at(-1);
            if (c[last] === v) return;
            c[last] = v;
        };

        const notify = p => {
            let c = "";
            const n_p = p.split(".");
            for (let i = 0; i < n_p.length; i++) {
                c = i === 0 ? n_p[0] : c + "." + n_p[i];
                pending.add(c);
            }
            win.${GLOBAL_CLOCK_TICK}(root.${VM_ID_NAME});
        };

        const tick = () => {
            if (!pending.size) return;
            for (const k of pending) {
                const h = subs[k];
                if (h) {
                    const v = get(k);
                    for (let i = 0; i < h.length; i++) {
                        try {
                            const fn = h[i];
                            if (!fn._isSync && !eq(fn._last, v)) {
                                fn(v, fn._last);
                                fn._last = clone(v);
                            }
                        } catch {}
                    }
                }
            }
            pending.clear();
        };

        const patch = (obj, val) => {
            const mark = new Map();
            const walk = (p, c) => {
                for (const k in c) {
                    const pF = p ? p + "." + k : k;
                    const v = c[k];
                    if (isObj(v)) walk(pF, v);
                    else {
                        set(pF, v);
                        mark.set(pF, {h:subs[pF] || [], v});
                    }
                }
            };

            if (isStr(obj)) {
                if (isObj(val)) {
                    walk(obj, val);
                } else {
                    set(obj, val);
                    mark.set(obj, {h:subs[obj] || [], v: val});
                }
            } else {
                walk("", obj);
            }

            for (const e of mark.entries()) {
                const nE = e[1];
                notify(e[0]);
                for (let i = 0; i < nE.h.length; i++) {
                  try {
                    if (nE.h[i]._isSync) nE.h[i](nE.v);
                  } catch {}
                }
            }
        };

        const getIV = (nI, p) => {
            if (!nI.length) return undefined;
            const n = nI[0];
            if (n.type === "checkbox") {
                if (nI.length > 1) return nI.filter(e => e.checked).map(e => e.value);
                return !!n.checked;
            }
            if (n.type === "radio") {
                const c = nI.find(e => e.checked);
                return c ? c.value : get(p);
            }
            if (n.tagName === "SELECT" && n.multiple) return [...n.selectedOptions].map(o => o.value);
            return n.value;
        };

        const setIV = (nI, v) => {
            if (!nI.length) return;
            const n = nI[0];
            if (n.type === "checkbox") {
                if (nI.length > 1) for (const e of nI) e.checked = isArr(v) && v.includes(e.value);
                else n.checked = !!v;
            } else if (n.type === "radio") {
                for (const e of nI) e.checked = e.value === v;
            } else if (n.tagName === "SELECT" && n.multiple && isArr(v)) {
                for (const o of n.options) o.selected = v.includes(o.value);
            } else n.value = v ?? "";
        };

        win.${GLOBAL_CLOCK}.set(root.${VM_ID_NAME}, tick);

        return new Proxy(store, {
            get(_, key) {
                switch (key) {
                    case "$bind": return (p, s, o) => {
                        const nI = win.${GLOBAL_UTILS_NAME}.queryAll(root, s);
                        if (!nI.length) return;

                        const c = get(p);
                        if (c === undefined) {
                            set(p, getIV(nI, p));
                            notify(p);
                        } else {
                            setIV(nI, c);
                        }

                        const fn = () => {
                            set(p, getIV(win.${GLOBAL_UTILS_NAME}.queryAll(root, s), p));
                            notify(p);
                        };

                        const sync = v => setIV(win.${GLOBAL_UTILS_NAME}.queryAll(root, s), v);
                        sync._isSync = true;
                        (subs[p] ??= []).push(sync);

                        for (const n of nI) {
                            n.addEventListener("input", fn);
                            if (
                                n.type === "checkbox" ||
                                n.type === "radio" ||
                                n.tagName === "SELECT"
                            ) n.addEventListener("change", fn);
                        }

                        if (isFn(o)) {
                            o._last = clone(get(p));
                            subs[p].push(o);
                        } else if (isFn(o?.handler)) {
                            o.handler._last = clone(get(p));
                            subs[p].push(o.handler);
                            if (o.immediate === true) o.handler(o.handler._last);
                        }
                    };
                    case "$watch": return (p, f, opts = {}) => {
                        if (!isStr(p) || !isFn(f)) return;
                        (subs[p] ??= []).push(f);
                        f._last = clone(get(p));
                        if (opts?.immediate === true) f(f._last);
                    };
                    case "$set": return patch;
                    default: return store[key];
                }
            },
            set(_, k, v) {
                if (eq(store[k], v)) return true;
                store[k] = v;
                notify(String(k));
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
                if (o.children) for (const c of o.children) e.appendChild(isStr(c) ? document.createTextNode(c) : c);
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
        oD("eq", eq);
        oD("uid", () => crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
        oD("sleep", ms => new Promise(r => setTimeout(r, ms)));
        oD("fetch", async (url, o = {}) => {
            const { method = "GET", headers = {}, body, timeout, credentials = "include" } = o;
            const isJSON = body && typeof body === "object" && !(body instanceof FormData);
            const nHeaders = { ...headers };
            const payload = isJSON ? JSON.stringify(body) : body;

            if (isJSON && !("Content-Type" in nHeaders))
                nHeaders["Content-Type"] = "application/json";

            const ctrl = isInt(timeout) ? new AbortController() : null;
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
                } catch (err) {
                    w.${GLOBAL_ARC_LOG}.debug("[Atomic] Fetch failure", err);
                }

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
        oD("fire", (n, t, o) => n.dispatchEvent(cEvent(t, {
            detail: o?.data,
            bubbles:(o?.mode ?? "up") === "up",
            cancelable:!0
        })));
        oD("isArr", isArr);
        oD("isBool", isBool);
        oD("isDate", isDate);
        oD("isFn", isFn);
        oD("isInt", isInt);
        oD("isNum", isNum);
        oD("isObj", isObj);
        oD("isStr", isStr);
        oD("on", (n, t, f) => {
            n.addEventListener(t, f);
            return () => n?.removeEventListener(t, f);
        });
        oD("once", (n, t, f) => {
            const w = e => {
                try { f(e); }
                finally { n?.removeEventListener(t, w); }
            };
            n.addEventListener(t, w);
        });
        oD("query", (n, q) => {
            if (!n?.querySelector || !isStr(q)) return null;
            const scopable = n.nodeType === Node.ELEMENT_NODE && !q.trimStart().startsWith(":scope");

            try {
                return n.querySelector(scopable ? ":scope " + q : q);
            } catch {
                return null;
            }
        });
        oD("queryAll", (n, q) => {
            if (!n?.querySelectorAll || !isStr(q)) return [];
            const scopable = n.nodeType === Node.ELEMENT_NODE && !q.trimStart().startsWith(":scope");

            try {
                return [...n.querySelectorAll(scopable ? ":scope " + q : q)];
            } catch {
                return [];
            }
        });
        oD("storeGet", win.${GLOBAL_STORE_NAME}.get);
        oD("storeSet", win.${GLOBAL_STORE_NAME}.set);
        oD("storeDel", win.${GLOBAL_STORE_NAME}.del);
        oD("timedAttr", (n, k, o) => {
            n.setAttribute(k, o.value ?? "");
            return setTimeout(() => {
                if (o.cleanup !== false) n.removeAttribute(k);
                o.after?.();
            }, o.duration);
        });
        oD("timedClass", (n, k, o) => {
            n.classList.add(k);
            return setTimeout(() => {
                if (o.cleanup !== false) n.classList.remove(k);
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

export const ARC_GLOBAL = memoize((debug: boolean) => {
    return atomicMinify(`(function(w){
    const oD = (n, v, t) => {
        if (!t[n]) Object.defineProperty(t, n, {value:v, configurable:!1, writable:!1});
    };
    const gI = () => Math.random().toString(36).slice(2);

    oD("${GLOBAL_ARC_LOG}", {debug:${debug ? 'console.debug' : '() => {}'}});

    oD("${GLOBAL_ARC_NAME}", (() => {
        const f=new Map(),d=new Map(),v=new Map(),m=new Map();

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
                        const UID = gI();
                        oD("${VM_ID_NAME}", UID, n);
                        if (ATOMIC && !n.${VM_NAME}) {
                            oD("${VM_RELAY_SUBSCRIBE_NAME}", (t, c) => w.${GLOBAL_RELAY_NAME}.subscribe(n.${VM_ID_NAME}, t, c), n);
                            oD("${VM_RELAY_SUBSCRIBE_ONCE_NAME}", (t, c) => w.${GLOBAL_RELAY_NAME}.subscribe(n.${VM_ID_NAME}, t, v => {
                                c(v);
                                n.${VM_RELAY_UNSUBSCRIBE_NAME}(t);
                            }), n);
                            oD("${VM_RELAY_UNSUBSCRIBE_NAME}", t => w.${GLOBAL_RELAY_NAME}.unsubscribe(n.${VM_ID_NAME}, t), n);
                            oD("${VM_RELAY_PUBLISH_NAME}", (t, v) => w.${GLOBAL_RELAY_NAME}.publish(t, v), n);
                            oD("${VM_NAME}", true, n);
                        }
                        try {
                            FREG.fn(ATOMIC
                                ? {el:n, data: w.${GLOBAL_DATA_REACTOR_NAME}(n,DREG?.val??{}), $: w.${GLOBAL_UTILS_NAME}}
                                : {el:n, data: DREG?.val??{}});
                            v.set(UID, {fn_id: FID, data_id: DID});
                            if (DID && DREG) DREG.refs++;
                            if (ATOMIC && typeof n.${VM_HOOK_MOUNT_NAME} === "function") {
                                try {n.${VM_HOOK_MOUNT_NAME}()}
                                catch (err) {w.${GLOBAL_ARC_LOG}.debug("[Atomic] Failed to mount", err);}
                            }
                        } catch (err) {
                            w.${GLOBAL_ARC_LOG}.debug("[Atomic] Script Instantiation Error", err);
                        }
                    }
                }
            },
            sparkModule(MODS) {
                const ATOMIC = !!w.${GLOBAL_HYDRATED_NAME};

                for (let i = 0; i < MODS.length; i++) {
                    const [FID, fn, data] = MODS[i];
                    if (m.has(FID)) continue;

                    const UID = gI();
                    m.set(FID, UID);

                    const n = {};
                    oD("${VM_RELAY_SUBSCRIBE_NAME}", (t, c) => w.${GLOBAL_RELAY_NAME}.subscribe(UID, t, c), n);
                    oD("${VM_RELAY_SUBSCRIBE_ONCE_NAME}", (t, c) => w.${GLOBAL_RELAY_NAME}.subscribe(UID, t, v => {
                        c(v);
                        w.${GLOBAL_RELAY_NAME}.unsubscribe(UID, t);
                    }), n);
                    oD("${VM_RELAY_UNSUBSCRIBE_NAME}", t => w.${GLOBAL_RELAY_NAME}.unsubscribe(UID, t), n);
                    oD("${VM_RELAY_PUBLISH_NAME}", (t, v) => w.${GLOBAL_RELAY_NAME}.publish(t, v), n);

                    try {
                        fn(ATOMIC
                            ? {mod:n, data: w.${GLOBAL_DATA_REACTOR_NAME}({}, data || {}), $: w.${GLOBAL_UTILS_NAME}}
                            : {mod:n, data});
                    } catch (err) {
                        w.${GLOBAL_ARC_LOG}.debug("[Atomic] Module Instantiation Error", err);
                    }
                }
            },
        });
    })(), w);
})(window);`);
});

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
