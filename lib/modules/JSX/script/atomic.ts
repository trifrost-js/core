/* eslint-disable @typescript-eslint/no-empty-object-type */

const RGX_COMMENT = /\/\/.*$/gm;
const RGX_BREAK = /\n/g;
const RGX_SPACE = /\s+/g;
const RGX_SYMBOLS = /\s*([{}();,:=<>+\-[\]])\s*/g;
const GLOBAL_OBSERVER_NAME = '$tfo';
const GLOBAL_RELAY_NAME = '$tfr';
const GLOBAL_STORE_NAME = '$tfs';
const VM_NAME = '$tfVM';
const VM_ID_NAME = 'tfId';
const VM_RELAY_NAME = 'tfRelay';
const VM_STORE_NAME = 'tfStore';
const VM_HOOK_UNMOUNT_NAME = 'tfUnmount';
const VM_HOOK_MOUNT_NAME = 'tfMount';

function minify (raw:string):string {
    return raw
        .replace(RGX_COMMENT, '')
        .replace(RGX_BREAK, ' ')
        .replace(RGX_SPACE, ' ')
        .replace(RGX_SYMBOLS, '$1')
        .trim();
}

export type TriFrostAtomicVM <
    Relay extends Record<string, unknown> = {},
    Store extends Record<string, unknown> = {}
> = {
    [VM_ID_NAME]: string;
    [VM_RELAY_NAME]: {
        subscribe<T extends keyof Relay>(
            topic: T,
            fn: (data: Relay[T]) => void
          ): void;
        unsubscribe<T extends keyof Relay>(topic?: T): void;
        publish<T extends keyof Relay>(
            topic: T,
            data: Relay[T] | void
        ): void;
    };
    [VM_STORE_NAME]: {
	    get<K extends keyof Store>(key: K): Store[K];
        get(key: string): unknown;
        set<K extends keyof Store>(key: K, value: Store[K]): void;
        set(key: string, value: unknown): void;
    };
    [VM_HOOK_MOUNT_NAME]?: () => void;
    [VM_HOOK_UNMOUNT_NAME]?: () => void;
};

export const ATOMIC_GLOBAL = minify(`
    if (!w.${GLOBAL_RELAY_NAME}) {
        const topics = Object.create(null);
        Object.defineProperty(w, "${GLOBAL_RELAY_NAME}", {
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
                            topics[key] = topics[msg].filter(el => el.id !== vmid);
                        }
                    }
                }
            }),
            writable:!1,
            configurable:!1
        });
    }
    if (!w.${GLOBAL_OBSERVER_NAME}) {
        const observer = new MutationObserver(e => {
            for (let x of e) {
                for (let nRemoved of x.removedNodes) {
                    if (nRemoved.${VM_NAME}) {
                        if (typeof nRemoved.${VM_HOOK_UNMOUNT_NAME} === "function") try {nRemoved.${VM_HOOK_UNMOUNT_NAME}()} catch {}
                        w.${GLOBAL_RELAY_NAME}?.unsubscribe(nRemoved.${VM_ID_NAME})
                    }
                }
            }
        });
        observer.observe(d.body, {childList:!0, subtree:!0});
        w.${GLOBAL_OBSERVER_NAME} = observer;
    }
    if (!w.${GLOBAL_STORE_NAME}) {
        const store = Object.create(null);
        Object.defineProperty(w, "${GLOBAL_STORE_NAME}", {
            value: Object.freeze({
                get: key => {
                    if (typeof key !== "string" || !key) return undefined;
                    return store[key]
                },
                set: (key, val) => {
                    if (typeof key !== "string" || !key) return;
                    store[key] = val
                },
            }),
            writable:!1,
            configurable:!1
        });
    }
`);

export const ATOMIC_VM_BEFORE = minify(
    `if (!n.${VM_NAME}) {
        const i = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
        Object.defineProperty(n, "${VM_ID_NAME}",{get: () => i, configurable: !1});
        Object.defineProperty(n, "${VM_RELAY_NAME}", {
            value: Object.freeze({
                subscribe: (msg, fn) => w.${GLOBAL_RELAY_NAME}.subscribe(n.${VM_ID_NAME}, msg, fn),
                unsubscribe: msg => w.${GLOBAL_RELAY_NAME}.unsubscribe(n.${VM_ID_NAME}, msg),
                publish: (msg, data) => w.${GLOBAL_RELAY_NAME}.publish(msg, data)
            }),
            writable: !1,
            configurable: !1
        });
        Object.defineProperty(n, "${VM_STORE_NAME}", {get: () => w.${GLOBAL_STORE_NAME}, configurable: !1});
        Object.defineProperty(n, "${VM_NAME}", {get: () => !0, configurable:!1});
    }`
);

export const ATOMIC_VM_AFTER = minify(`
    if (typeof n.${VM_HOOK_MOUNT_NAME} === "function") try {n.${VM_HOOK_MOUNT_NAME}()} catch {}
`);
