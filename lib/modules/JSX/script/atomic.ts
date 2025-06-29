import {type Promisify} from '../../../types/generic';
import {atomicMinify} from './util';

export const GLOBAL_HYDRATED_NAME = '$tfhydra';
export const GLOBAL_UTILS_NAME = '$tfutils';
export const GLOBAL_DATA_REACTOR_NAME = '$tfdr';
const GLOBAL_OBSERVER_NAME = '$tfo';
const GLOBAL_RELAY_NAME = '$tfr';
const GLOBAL_STORE_NAME = '$tfs';
const GLOBAL_UTIL_EQUAL = '$tfequal';
const GLOBAL_UTIL_CLONE = '$tfclone';
const GLOBAL_UTIL_CREATE_EVENT = '$tfevent';
const GLOBAL_CLOCK = '$tfc';
const GLOBAL_CLOCK_TICK = '$tfcr';
const VM_NAME = '$tfVM';
const VM_ID_NAME = '$uid';
const VM_RELAY_SUBSCRIBE_NAME = '$subscribe';
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

export type TriFrostAtomicVM<
    Relay extends Record<string, unknown> = {},
    Store extends Record<string, unknown> = {},
    RelayKeys extends keyof Relay | StoreTopics<keyof Store & string> = keyof Relay | StoreTopics<keyof Store & string>,
> = {
    [VM_ID_NAME]: string;
    /* VM Relay */
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
    [VM_RELAY_UNSUBSCRIBE_NAME]<T extends RelayKeys>(topic?: T): void;
    [VM_RELAY_PUBLISH_NAME]<T extends RelayKeys>(
        topic: T,
        data?: T extends keyof Relay ? Relay[T] : T extends StoreTopics<infer K> ? (K extends keyof Store ? Store[K] : unknown) : unknown,
    ): void;
    /* VM Hooks */
    [VM_HOOK_MOUNT_NAME]?: () => void;
    [VM_HOOK_UNMOUNT_NAME]?: () => void;
};

export type TriFrostAtomicProxy<T> = T & {
    /* Bind */
    $bind<K extends DotPaths<T>>(key: K, selector: string): void;
    $bind<K extends DotPaths<T>>(key: K, selector: string, handler: (val: any) => Promisify<void>): void;
    $bind<K extends DotPaths<T>>(key: K, selector: string, options: {handler: (val: any) => Promisify<void>; immediate?: boolean}): void;
    /* Watch */
    $watch: <K extends DotPaths<T>>(key: K, fn: (val: any) => Promisify<void>, options?: {immediate?: boolean}) => void;
    /* Set */
    $set: (key: DotPaths<T> | T, val?: any) => void;
};

export type TriFrostAtomicUtils<Store extends Record<string, unknown> = {}> = {
    /* Clears the children from a dom node */
    clear: (el: Element) => void;
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
    on: <Payload = unknown, K extends string = string>(
        el: Element,
        type: K,
        handler: (evt: K extends keyof HTMLElementEventMap ? HTMLElementEventMap[K] : CustomEvent<Payload>) => void,
    ) => () => void;
    once: <Payload = unknown, K extends string = string>(
        el: Element,
        type: K,
        handler: (evt: K extends keyof HTMLElementEventMap ? HTMLElementEventMap[K] : CustomEvent<Payload>) => void,
    ) => void;
    /* DOM selectors */
    query: <T extends Element = HTMLElement>(root: Node, selector: string) => T | null;
    queryAll: <T extends Element = HTMLElement>(root: Node, selector: string) => T[];
    /* Store Get */
    storeGet<K extends keyof Store>(key: K): Store[K];
    storeGet(key: string): unknown;
    /* Store Set */
    storeSet<K extends keyof Store>(key: K, value: Store[K]): void;
    storeSet(key: string, value: unknown): void;
};

export const ATOMIC_GLOBAL = atomicMinify(`
    if (!window.${GLOBAL_HYDRATED_NAME}) {
        if (!window.${GLOBAL_UTIL_EQUAL}) {
            const equal = (a,b) => {
                if (a === b) return!0;
                switch (typeof a) {
                    case "number":
                        return Number.isNaN(a) && Number.isNaN(b);
                    case "object":{
                        if (!a || !b) return!1;
                        if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v,i)=>equal(v,b[i]));
                        const pa = Object.prototype.toString.call(a);
                        const pb = Object.prototype.toString.call(b);
                        if (pa !== pb) return!1;
                        switch (pa) {
                            case "[object Date]": return a.valueOf()===b.valueOf();
                            case "[object Object]": {
                                const ka=Object.keys(a);
                                const kb=Object.keys(b);
                                if(ka.length !== kb.length) return!1;
                                return ka.every(k=>equal(a[k],b[k]));
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
            window.${GLOBAL_UTIL_EQUAL} = equal;
        }

        if (!window.${GLOBAL_UTIL_CLONE}) {
            window.${GLOBAL_UTIL_CLONE} = v => (v === undefined || v === null || typeof v !== "object") ? v : structuredClone(v);
        }

        if (!window.${GLOBAL_UTIL_CREATE_EVENT}) {
            window.${GLOBAL_UTIL_CREATE_EVENT} = (type, opts) => {
                try {
                    return new CustomEvent(type, opts);
                } catch (_) {
                    const e = document.createEvent("CustomEvent");
                    e.initCustomEvent(type, opts?.bubbles, opts?.cancelable, opts?.detail);
                    return e;
                }
            };
        }

        if (!window.${GLOBAL_RELAY_NAME}) {
            const topics = Object.create(null);
            Object.defineProperty(window, "${GLOBAL_RELAY_NAME}", {
                value: Object.freeze({
                    publish: (msg, data) => {
                        if (typeof msg !== "string" || !topics[msg]) return;
                        for (let i = 0; i < topics[msg].length; i++) try { topics[msg][i].fn(data) } catch {}
                    },
                    subscribe: (vmid, msg, fn) => {
                        if (
                            typeof vmid !== "string" ||
                            typeof msg !== "string" ||
                            typeof fn !== "function"
                        ) return;
                        const subs = (topics[msg] ??= []);
                        const idx = subs.findIndex(el => el.id === vmid);
                        if (idx >= 0) subs[idx].fn = fn;
                        else subs.push({id: vmid, fn});
                    },
                    unsubscribe: (vmid, msg) => {
                        if (typeof vmid !== "string") return;
                        if (typeof msg === "string") {
                            if (!(msg in topics)) return;
                            topics[msg] = topics[msg].filter(el => el.id !== vmid);
                        } else {
                            for (const key of Object.keys(topics)) {
                                topics[key] = topics[key].filter(el => el.id !== vmid);
                            }
                        }
                    }
                }),
                writable:!1,
                configurable:!1
            });
        }
        if (!window.${GLOBAL_OBSERVER_NAME}) {
            const observer = new MutationObserver(e => {
                for (let x of e) {
                    for (let nRemoved of x.removedNodes) {
                        if (nRemoved.${VM_NAME}) {
                            if (typeof nRemoved.${VM_HOOK_UNMOUNT_NAME} === "function") try {nRemoved.${VM_HOOK_UNMOUNT_NAME}()} catch {}
                            window.${GLOBAL_RELAY_NAME}?.unsubscribe(nRemoved.${VM_ID_NAME});
                            window.${GLOBAL_CLOCK}?.delete(nRemoved.${VM_ID_NAME});
                        }
                    }
                }
            });
            observer.observe(document.body, {childList:!0, subtree:!0});
            window.${GLOBAL_OBSERVER_NAME} = observer;
        }
        if (!window.${GLOBAL_STORE_NAME}) {
            const store = Object.create(null);
            Object.defineProperty(window, "${GLOBAL_STORE_NAME}", {
                value: Object.freeze({
                    get: key => {
                        if (typeof key !== "string" || !key) return undefined;
                        return store[key]
                    },
                    set: (key, val) => {
                        if (typeof key !== "string" || !key) return;
                        store[key] = val;
                        window.${GLOBAL_RELAY_NAME}.publish("$store:" + key, val);
                    },
                }),
                writable:!1,
                configurable:!1
            });
        }

        if (!window.${GLOBAL_CLOCK}) {
            const clocks = new Map();
            let tick_pending = false;
            const tick_vms = new Set();
            window.${GLOBAL_CLOCK} = clocks;
            window.${GLOBAL_CLOCK_TICK} = uid => {
                tick_vms.add(uid);
                if (!tick_pending) {
                    tick_pending = true;
                    requestAnimationFrame(() => {
                        const uids = [...tick_vms.values()];
                        tick_pending = false;
                        tick_vms.clear();
                        for (let i = 0; i < uids.length; i++) {
                            try {
                                const fn = clocks.get(uids[i]);
                                if (fn) fn();
                            } catch {}
                        }
                    });
                }
            };
        }

        if (!window.${GLOBAL_DATA_REACTOR_NAME}) {
            window.${GLOBAL_DATA_REACTOR_NAME} = (root, raw) => {
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
                    window.${GLOBAL_CLOCK_TICK}(root.${VM_ID_NAME});
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
                                if (!window.${GLOBAL_UTIL_EQUAL}(fn._last, val)) {
                                    fn(val);
                                    fn._last = window.${GLOBAL_UTIL_CLONE}(val);
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

                window.${GLOBAL_CLOCK}.set(root.${VM_ID_NAME}, tick);

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
                                    this.$watch(path, watcher);
                                } else if (typeof watcher?.handler === "function") {
                                    this.$watch(path, watcher.handler, watcher);
                                }
                            };
                            case "$watch": return (path, fn, opts = {}) => {
                                if (typeof path !== "string" || typeof fn !== "function") return;
                                (subs[path] ??= []).push(fn);
                                fn._last = window.${GLOBAL_UTIL_CLONE}(get(path));
                                if (opts?.immediate === true) fn(fn._last);
                            };
                            case "$set": return patch;
                            default: return store[key];
                        }
                    },
                    set(_, key, val) {
                        if (window.${GLOBAL_UTIL_EQUAL}(store[key], val)) return true;
                        store[key] = val;
                        notify(String(key));
                        return true;
                    }
                });
            };
        }

        if (!window.${GLOBAL_UTILS_NAME}) {
            const obj = Object.create(null);
            const tuples = [
                ["clear", n => {
                    while (n.firstChild) n.removeChild(n.firstChild);
                }],
                ["debounce", (fn, ms) => {
                    let t;
                    return (...args) => {
                        clearTimeout(t);
                        t = setTimeout(() => fn(...args), ms);
                    };
                }],
                ["eq", window.${GLOBAL_UTIL_EQUAL}],
                ["uid", () => crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)],
                ["sleep", ms => new Promise(r => setTimeout(r, ms))],
                ["fetch", async (url, o = {}) => {
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
                                c = document.createRange().createContextualFragment(v);
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
                }],
                ["fire", (n, t, o) => n.dispatchEvent(
                    window.${GLOBAL_UTIL_CREATE_EVENT}(t, {
                        detail: o?.data,
                        bubbles:(o?.mode ?? "up") === "up",
                        cancelable:!0
                    })
                )],
                ["on", (n, t, fn) => {
                    n.addEventListener(t, fn);
                    return () => n?.removeEventListener(t, fn);
                }],
                ["once", (n, t, fn) => {
                    const w = e => {
                        try { fn(e); }
                        finally { n?.removeEventListener(t, w); }
                    };
                    n.addEventListener(t, w);
                }],
                ["query", (n, q) => {
                    if (!n?.querySelector || typeof q !== "string") return null;
                    const scopable = n.nodeType === Node.ELEMENT_NODE && !q.trimStart().startsWith(":scope");

                    try {
                        return n.querySelector(scopable ? ":scope " + q : q);
                    } catch {
                        return null;
                    }
                }],
                ["queryAll", (n, q) => {
                    if (!n?.querySelectorAll || typeof q !== "string") return [];
                    const scopable = n.nodeType === Node.ELEMENT_NODE && !q.trimStart().startsWith(":scope");

                    try {
                        return [...n.querySelectorAll(scopable ? ":scope " + q : q)];
                    } catch {
                        return [];
                    }
                }],
                ["storeGet", window.${GLOBAL_STORE_NAME}.get],
                ["storeSet", window.${GLOBAL_STORE_NAME}.set],
            ];
            for (let i = 0; i < tuples.length; i++) Object.defineProperty(obj, tuples[i][0], {value: tuples[i][1], configurable: !1, writable: !1});
            window.${GLOBAL_UTILS_NAME} = Object.freeze(obj);
        }

        if (!window.__name) {
            window.__name = (fn, n) => {
                try {Object.defineProperty(fn, "name", {value: n});} catch {}
                return fn;
            };
        }

        Object.defineProperty(window, "${GLOBAL_HYDRATED_NAME}", {get: () => !0, configurable: !1});
    }
`);

export const ATOMIC_VM_BEFORE = atomicMinify(
    `if (!n.${VM_NAME}) {
        const i = w.${GLOBAL_UTILS_NAME}.uid();
        Object.defineProperties(n, {
            ${VM_ID_NAME}:{get: () => i, configurable: !1},
            ${VM_RELAY_SUBSCRIBE_NAME}:{value: (msg, fn) => w.${GLOBAL_RELAY_NAME}.subscribe(i, msg, fn), configurable: !1, writable: !1},
            ${VM_RELAY_UNSUBSCRIBE_NAME}:{value: msg => w.${GLOBAL_RELAY_NAME}.unsubscribe(i, msg), configurable: !1, writable: !1},
            ${VM_RELAY_PUBLISH_NAME}:{value: (msg, data) => w.${GLOBAL_RELAY_NAME}.publish(msg, data), configurable: !1, writable: !1},
            ${VM_NAME}:{get: () => !0, configurable:!1}
        });
    }`,
);

export const ATOMIC_VM_AFTER = atomicMinify(`
    if (typeof n.${VM_HOOK_MOUNT_NAME} === "function") try {n.${VM_HOOK_MOUNT_NAME}()} catch {}
`);
