export {};

type AtomicGlobalRelay = {};
type AtomicGlobalStore = {};

declare global {
    interface AtomicRelay extends AtomicGlobalRelay {}
    interface AtomicStore extends AtomicGlobalStore {}
}
