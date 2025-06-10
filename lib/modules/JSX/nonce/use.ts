let active_nonce:string|null = null;

export function setActiveNonce <T extends string|null> (val:T):T {
    active_nonce = typeof val === 'string' && val.length ? val : null;
    return val;
}

export function hasActiveNonce () {
    return active_nonce !== null;
}

export function nonce () {
    if (!active_nonce) throw new Error('No active nonce is set');
    return active_nonce;
}
