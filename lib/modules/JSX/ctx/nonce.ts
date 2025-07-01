import {getActiveCtx} from '../ctx/use';

export const NONCEMARKER = 'tfnonce';

export function nonce(): string | null {
    return getActiveCtx()?.nonce || null;
}

/**
 * Nonce Window script setter for full-page ssr behavior
 *
 * @param {string} val - Nonce value
 */
export function NONCE_WIN_SCRIPT(val: string) {
    if (typeof val !== 'string' || !val.length) return '';
    return [
        '<script nonce="' + val + '">',
        'Object.defineProperty(window,"$' + NONCEMARKER + '",{',
        'value:"' + val + '",',
        'configurable:!1,',
        'writable:!1',
        '})</script>',
    ].join('');
}
