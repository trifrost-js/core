import type {TriFrostContext} from '../../../types/context';

let active_ctx: TriFrostContext<any, any> | null = null;

export function setActiveCtx<
    Env extends Record<string, any>,
    State extends Record<string, unknown>,
    T extends TriFrostContext<Env, State> | null,
>(ctx: T): T {
    active_ctx = ctx;
    return ctx;
}

export function hasActiveCtx() {
    return active_ctx !== null;
}

export function getActiveCtx() {
    return active_ctx;
}
