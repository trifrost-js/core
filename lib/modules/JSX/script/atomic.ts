/* eslint-disable @typescript-eslint/no-empty-object-type */

const RGX_COMMENT = /\/\/.*$/gm;
const RGX_BREAK = /\n/g;
const RGX_SPACE = /\s+/g;
const RGX_SYMBOLS = /\s*([{}();,:=<>+\-[\]])\s*/g;
export const GLOBAL_HYDRATED_NAME = '$tfhydra';
const GLOBAL_OBSERVER_NAME = '$tfo';
const GLOBAL_RELAY_NAME = '$tfr';
const GLOBAL_STORE_NAME = '$tfs';
const GLOBAL_UTIL_DEBOUNCE = '$tfdebounce';
const GLOBAL_CLOCK = '$tfc';
const GLOBAL_CLOCK_TICK = '$tfcr';
export const GLOBAL_DATA_REACTOR_NAME = '$tfdr';
const VM_NAME = '$tfVM';
const VM_ID_NAME = '$uid';
const VM_DISPATCH_NAME = '$dispatch';
const VM_RELAY_SUBSCRIBE_NAME = '$subscribe';
const VM_RELAY_UNSUBSCRIBE_NAME = '$unsubscribe';
const VM_RELAY_PUBLISH_NAME = '$publish';
const VM_STORE_GET_NAME = '$storeGet';
const VM_STORE_SET_NAME = '$storeSet';
const VM_HOOK_UNMOUNT_NAME = '$unmount';
const VM_HOOK_MOUNT_NAME = '$mount';

function minify (raw:string):string {
    return raw
        .replace(RGX_COMMENT, '')
        .replace(RGX_BREAK, ' ')
        .replace(RGX_SPACE, ' ')
        .replace(RGX_SYMBOLS, '$1')
        .trim();
}

type StoreTopics<K extends string> = `$store:${K}`;

type DotPathLevels = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; /* Up to depth 10, this prevents infinite recursion */

type DotPaths<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends object
          ? K | `${K}.${DotPaths<T[K], DotPathLevels[D]>}`
          : K
      }[keyof T & string]
    : '';

export type TriFrostAtomicVM <
    Relay extends Record<string, unknown> = {},
    Store extends Record<string, unknown> = {},
    RelayKeys extends keyof Relay | StoreTopics<keyof Store & string> = keyof Relay | StoreTopics<keyof Store & string>
> = {
    [VM_ID_NAME]: string;
    /* VM Dispatch */
    [VM_DISPATCH_NAME]: <T = unknown>(type: string, options?: {data?: T, mode?: 'up'|'down'}) => void;
    /* VM Relay */
    [VM_RELAY_SUBSCRIBE_NAME]<T extends RelayKeys>(
        topic: T,
        fn: T extends keyof Relay
            ? (data: Relay[T]) => void
            : T extends StoreTopics<infer K>
                ? K extends keyof Store
                    ? (data: Store[K]) => void
                    : (data: unknown) => void
                : (data: unknown) => void
    ):void;
    [VM_RELAY_UNSUBSCRIBE_NAME]<T extends RelayKeys>(topic?: T):void;
    [VM_RELAY_PUBLISH_NAME]<T extends RelayKeys>(
        topic: T,
        data?: T extends keyof Relay
            ? Relay[T]
            : T extends StoreTopics<infer K>
                ? K extends keyof Store
                    ? Store[K]
                    : unknown
                : unknown
    ):void;
    /* VM Store */
    [VM_STORE_GET_NAME] <K extends keyof Store> (key: K): Store[K];
    [VM_STORE_GET_NAME] (key: string): unknown;
    [VM_STORE_SET_NAME] <K extends keyof Store> (key: K, value: Store[K]): void;
    [VM_STORE_SET_NAME] (key: string, value: unknown): void;
    /* VM Hooks */
    [VM_HOOK_MOUNT_NAME]?: () => void;
    [VM_HOOK_UNMOUNT_NAME]?: () => void;
};

export type TriFrostAtomicProxy <T> = T & {
    $bind: <K extends DotPaths<T>>(key: K, selector: string) => void;
    $watch: <K extends DotPaths<T>>(key: K, fn: (val: any) => void, options?:{immediate?: boolean; debounce?:number}) => void;
    $set: (key: DotPaths<T> | T, val?: any) => void;
}

export const ATOMIC_GLOBAL = minify(`
    if (!window.${GLOBAL_HYDRATED_NAME}) {
        if (!window.${GLOBAL_UTIL_DEBOUNCE}) {
            window.${GLOBAL_UTIL_DEBOUNCE} = (fn, delay) => {
                let t;
                return (...args) => {
                    clearTimeout(t);
                    t = setTimeout(() => fn(...args), delay);
                };
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
                                if (fn._last !== val) {
                                    fn(val);
                                    fn._last = val;
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
                            case "$bind": return (path, selector) => {
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
                            };
                            case "$watch": return (path, fn, opts = {}) => {
                                if (typeof path !== "string" || typeof fn !== "function") return;
                                const {
                                    immediate = false,
                                    debounce = 0
                                } = Object.prototype.toString.call(opts) === "[object Object]" ? opts : {};
                                const handler = Number.isInteger(debounce) && debounce > 0
                                    ? window.${GLOBAL_UTIL_DEBOUNCE}(fn, debounce)
                                    : fn;
                                (subs[path] ??= []).push(handler);
                                fn._last = get(path);
                                if (immediate) handler(fn._last);
                            };
                            case "$set": return patch;
                            default: return store[key];
                        }
                    },
                    set(_, key, val) {
                        if (store[key] === val) return true;
                        store[key] = val;
                        notify(String(key));
                        return true;
                    }
                });
            };
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

export const ATOMIC_VM_BEFORE = minify(
    `if (!n.${VM_NAME}) {
        const i = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
        Object.defineProperties(n, {
            ${VM_ID_NAME}:{get: () => i, configurable: !1},
            ${VM_RELAY_SUBSCRIBE_NAME}:{value: (msg, fn) => w.${GLOBAL_RELAY_NAME}.subscribe(i, msg, fn), configurable: !1, writable: !1},
            ${VM_RELAY_UNSUBSCRIBE_NAME}:{value: msg => w.${GLOBAL_RELAY_NAME}.unsubscribe(i, msg), configurable: !1, writable: !1},
            ${VM_RELAY_PUBLISH_NAME}:{value: (msg, data) => w.${GLOBAL_RELAY_NAME}.publish(msg, data), configurable: !1, writable: !1},
            ${VM_STORE_GET_NAME}:{value: w.${GLOBAL_STORE_NAME}.get, configurable: !1, writable: !1},
            ${VM_STORE_SET_NAME}:{value: w.${GLOBAL_STORE_NAME}.set, configurable: !1, writable: !1},
            ${VM_DISPATCH_NAME}:{
                value:(type,options)=>n.dispatchEvent(
                    new CustomEvent(type,{
                        detail: options?.data,
                        bubbles:(options?.mode ?? "up") === "up",
                        cancelable:!0
                    })
                ),
                configurable:!1,
                writable:!1
            },
            ${VM_NAME}:{get: () => !0, configurable:!1}
        });
    }`
);

export const ATOMIC_VM_AFTER = minify(`
    if (typeof n.${VM_HOOK_MOUNT_NAME} === "function") try {n.${VM_HOOK_MOUNT_NAME}()} catch {}
`);
