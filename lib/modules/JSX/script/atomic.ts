/* eslint-disable @typescript-eslint/no-empty-object-type */

const RGX_COMMENT = /\/\/.*$/gm;
const RGX_BREAK = /\n/g;
const RGX_SPACE = /\s+/g;
const RGX_SYMBOLS = /\s*([{}();,:=<>+\-[\]])\s*/g;
const GLOBAL_OBSERVER_NAME = '$tfo';
const GLOBAL_RELAY_NAME = '$tfr';
const GLOBAL_STORE_NAME = '$tfs';
const VM_NAME = '$tfVM';
const VM_ID_NAME = '$uid';
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

export type TriFrostAtomicVM <
    Relay extends Record<string, unknown> = {},
    Store extends Record<string, unknown> = {},
    RelayKeys extends keyof Relay | StoreTopics<keyof Store & string> = keyof Relay | StoreTopics<keyof Store & string>
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
                : (data: unknown) => void
    ):void;
    [VM_RELAY_UNSUBSCRIBE_NAME]<T extends RelayKeys>(topic?: T):void;
    [VM_RELAY_PUBLISH_NAME]<T extends RelayKeys>(
        topic: T,
        data: T extends keyof Relay
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
                            topics[key] = topics[key].filter(el => el.id !== vmid);
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
                    store[key] = val;
                    w.${GLOBAL_RELAY_NAME}.publish("$store:" + key, val);
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
        Object.defineProperties(n, {
            ${VM_ID_NAME}:{get: () => i, configurable: !1}),
            ${VM_RELAY_SUBSCRIBE_NAME}:{value: (msg, fn) => w.${GLOBAL_RELAY_NAME}.subscribe(i, msg, fn), configurable: !1, writable: !1},
            ${VM_RELAY_UNSUBSCRIBE_NAME}:{value: msg => w.${GLOBAL_RELAY_NAME}.unsubscribe(i, msg), configurable: !1, writable: !1},
            ${VM_RELAY_PUBLISH_NAME}:{value: (msg, data) => w.${GLOBAL_RELAY_NAME}.publish(msg, data), configurable: !1, writable: !1},
            ${VM_STORE_GET_NAME}:{value: w.${GLOBAL_STORE_NAME}.get, configurable: !1, writable: !1},
            ${VM_STORE_SET_NAME}:{value: w.${GLOBAL_STORE_NAME}.set, configurable: !1, writable: !1},
            ${VM_NAME}:{get: () => !0, configurable:!1},
        });
    }`
);

export const ATOMIC_VM_AFTER = minify(`
    if (typeof n.${VM_HOOK_MOUNT_NAME} === "function") try {n.${VM_HOOK_MOUNT_NAME}()} catch {}
`);
