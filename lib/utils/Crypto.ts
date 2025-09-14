import {LRU} from '@valkyriestudios/utils/caching';
import {djb2} from '@valkyriestudios/utils/hash';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true});
const RGX_PEMKEY_HEADER = /-----[A-Z ]+-----/g;
const RGX_PEMLINE = /\r\n?/g;
const RGX_KEY_SPACES = /\s+/g;

const key_cache = new LRU<CryptoKey>({max_size: 100});

const B64URL_LOOKUP: Record<string, string> = {
    '+': '-',
    '/': '_',
    '=': '',
};
const B64PADS = ['', null, '==', '='];

const RGX_B64URL = /[+/=]/g;

/**
 * Supported cryptographic algorithms mapped to WebCrypto import configurations.
 *
 * - HMAC: HS256, HS384, HS512
 * - RSA: RS256, RS384, RS512
 * - ECDSA: ES256, ES384, ES512
 * - None: No signature
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7518#section-3
 */
export const ALGOS: Record<string, SubtleCryptoImportKeyAlgorithm> = {
    none: {name: 'none'},
    HS256: {name: 'HMAC', hash: {name: 'SHA-256'}},
    HS384: {name: 'HMAC', hash: {name: 'SHA-384'}},
    HS512: {name: 'HMAC', hash: {name: 'SHA-512'}},
    RS256: {name: 'RSASSA-PKCS1-v1_5', hash: {name: 'SHA-256'}},
    RS384: {name: 'RSASSA-PKCS1-v1_5', hash: {name: 'SHA-384'}},
    RS512: {name: 'RSASSA-PKCS1-v1_5', hash: {name: 'SHA-512'}},
    ES256: {name: 'ECDSA', namedCurve: 'P-256', hash: {name: 'SHA-256'}},
    ES384: {name: 'ECDSA', namedCurve: 'P-384', hash: {name: 'SHA-384'}},
    ES512: {name: 'ECDSA', namedCurve: 'P-521', hash: {name: 'SHA-512'}},
} as const;

/**
 * Keys of supported algorithms defined in `ALGOS`.
 */
export type SupportedAlgorithms = keyof typeof ALGOS;

/**
 * Encodes a Uint8Array into a base64url string.
 *
 * @param {Uint8Array} data - Raw binary data to encode
 * @returns URL-safe base64 string without padding.
 * @see https://datatracker.ietf.org/doc/html/rfc7515#appendix-C
 */
export function b64url(data: Uint8Array): string {
    if (!(data instanceof Uint8Array)) throw new TypeError('Crypto@b64url: Expected Uint8Array');
    return btoa(String.fromCharCode(...data)).replace(RGX_B64URL, ch => B64URL_LOOKUP[ch]);
}

/**
 * Decodes a base64url string into a Uint8Array.
 *
 * @param {string} input - URL-safe base64 string (with or without padding)
 * @returns Decoded binary data.
 */
export function b64urlDecode(input: string): Uint8Array<ArrayBuffer> {
    if (typeof input !== 'string') throw new TypeError('Crypto@b64urlDecode: Expected string input');

    const rem = input.length % 4;
    if (rem === 1) throw new Error('Crypto@b64urlDecode: Invalid base64 length');

    /* Specific padding based on remainder and then run repl */
    const b64 = (input + B64PADS[rem]).replace(/[-_]/g, c => (c === '-' ? '+' : '/'));

    try {
        const bin = atob(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            out[i] = bin.charCodeAt(i);
        }
        return out;
    } catch {
        throw new Error('Crypto@b64urlDecode: Invalid base64 input');
    }
}

/**
 * Encodes a UTF-8 string into a Uint8Array.
 *
 * @param {string} str - Text string to encode.
 * @returns UTF-8 encoded bytes.
 */
export function utf8Encode(str: string): Uint8Array<ArrayBuffer> {
    if (typeof str !== 'string') throw new TypeError('Crypto@utf8Encode: Expected string');
    return encoder.encode(str);
}

/**
 * Decodes a Uint8Array into a UTF-8 string.
 *
 * @param data - UTF-8 bytes to decode.
 * @returns Decoded string.
 */
export function utf8Decode(data: Uint8Array): string {
    if (!(data instanceof Uint8Array)) throw new TypeError('Crypto@utf8Decode: Expected Uint8Array');
    try {
        return decoder.decode(data);
    } catch (err) {
        throw new Error(`Crypto@utf8Decode: ${String((err as Error).message)}`);
    }
}

/**
 * Imports a key for use with WebCrypto API, supporting PEM strings, JWK objects, or raw secrets.
 * Automatically caches keys using a DJB2 hash of input to avoid repeated imports.
 *
 * @param {string|JsonWebKey|CryptoKey} key - PEM string, JWK object, or CryptoKey
 * @param {SubtleCryptoImportKeyAlgorithm} algorithm - Algorithm to import the key for (e.g., HMAC, RSA, ECDSA)
 * @param {KeyUsage[]} usages - Key usages such as `['sign']` or `['verify']`
 * @returns A Promise resolving to a `CryptoKey` instance
 * @throws If the PEM body is empty or unsupported key type
 */
export async function importKey(
    key: string | JsonWebKey | CryptoKey,
    algo: SubtleCryptoImportKeyAlgorithm,
    usages: KeyUsage[],
): Promise<CryptoKey> {
    if (!algo?.name) throw new TypeError('Crypto@importKey: Invalid algorithm provided');
    if (!Array.isArray(usages) || usages.length === 0) throw new TypeError('Crypto@importKey: Missing key usages');

    if (key instanceof CryptoKey) return key;

    /* Generate an id for the key */
    const id = [algo.name, (algo as any).hash!.name, (algo as any).namedCurve || '', usages.join('.'), djb2(key)].join(':');

    /* If cached, return cached version */
    const cached = key_cache.get(id);
    if (cached) return cached;

    try {
        if (typeof key === 'object' && key.kty) {
            const imported = await crypto.subtle.importKey('jwk', key, algo, false, usages);
            key_cache.set(id, imported);
            return imported;
        } else if (typeof key === 'string') {
            const start_trimmed = key.trimStart();
            /* WebCrypto spec defines HMAC keys as raw binary data. as such no pem wrapped */
            if (
                algo.name !== 'HMAC' &&
                (start_trimmed.startsWith('-----BEGIN PRIVATE KEY-----') || start_trimmed.startsWith('-----BEGIN PUBLIC KEY-----'))
            ) {
                const raw = key
                    .replace(RGX_PEMKEY_HEADER, '') /* Normalize pem key header removal */
                    .replace(RGX_KEY_SPACES, '') /* Normalize spaces */
                    .replace(RGX_PEMLINE, '\n'); /* Normalize line ending variations */
                if (!raw) throw new Error('Crypto@importKey: Empty PEM body');
                const format = key.includes('PRIVATE') ? 'pkcs8' : 'spki';
                const imported = await crypto.subtle.importKey(format, b64urlDecode(raw), algo, false, usages);
                key_cache.set(id, imported);
                return imported;
            } else {
                /* Treat as raw */
                const imported = await crypto.subtle.importKey('raw', utf8Encode(key), algo, false, usages);
                key_cache.set(id, imported);
                return imported;
            }
        }

        throw new Error('Crypto@importKey: Unsupported key input type');
    } catch (err) {
        throw new Error(`Crypto@importKey: Failed to import key (${(err as Error).message})`);
    }
}
