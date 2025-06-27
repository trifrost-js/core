import {describe, it, expect} from 'vitest';
import {b64url, b64urlDecode, utf8Encode, utf8Decode, importKey, ALGOS} from '../../../lib/utils/Crypto';
import CONSTANTS from '../../constants';

describe('Utils - Crypto', () => {
    describe('b64url', () => {
        describe('b64url', () => {
            it('Encodes ASCII strings correctly', () => {
                const input = utf8Encode('Hello World');
                const result = b64url(input);
                expect(result).toBe('SGVsbG8gV29ybGQ');
            });

            it('Encodes empty input to empty string', () => {
                const result = b64url(new Uint8Array());
                expect(result).toBe('');
            });

            it('Encodes binary data', () => {
                const input = new Uint8Array(256).map((_, i) => i);
                const result = b64url(input);
                expect(result.startsWith('AAECAwQFBgcICQoLDA0ODxAREhM')).toBe(true);
                expect(result).not.toMatch(/[=]/); /* Should not include padding */
            });

            it('Removes padding correctly with one padding char', () => {
                const input = utf8Encode('any carnal pleasur'); /* Base64 with one '=' */
                const result = b64url(input);
                expect(result).toBe('YW55IGNhcm5hbCBwbGVhc3Vy');
            });

            it('Removes padding correctly with two padding chars', () => {
                const input = utf8Encode('any carnal pleasure.');
                const result = b64url(input);
                expect(result).toBe('YW55IGNhcm5hbCBwbGVhc3VyZS4');
            });

            it('Encodes multibyte UTF-8 (emoji)', () => {
                const input = utf8Encode('🔥🚀💻');
                const result = b64url(input);
                expect(result).toBe('8J-UpfCfmoDwn5K7');
            });

            it('Throws on non-Uint8Array input', () => {
                for (const el of [...CONSTANTS.NOT_ARRAY]) {
                    expect(() => b64url(el as any)).toThrow('Crypto@b64url: Expected Uint8Array');
                }
            });
        });
    });

    describe('b64urlDecode', () => {
        it('Decodes valid base64url without padding', () => {
            const decoded = b64urlDecode('SGVsbG8');
            expect(new TextDecoder().decode(decoded)).toBe('Hello');
        });

        it('Decodes base64url with one padding char', () => {
            const base64url = 'U29mdHdhcmUu'.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            const decoded = b64urlDecode(base64url);
            expect(new TextDecoder().decode(decoded)).toBe('Software.');
        });

        it('Decodes base64url with two padding chars', () => {
            const decoded = b64urlDecode('U28');
            expect(new TextDecoder().decode(decoded)).toBe('So');
        });

        it('Works with multibyte UTF-8 (emoji)', () => {
            const reencoded = b64url(utf8Encode('🔥🚀💻'));
            const decoded = b64urlDecode(reencoded);
            expect(new TextDecoder().decode(decoded)).toBe('🔥🚀💻');
        });

        it('Decodes raw binary roundtrip', () => {
            const binary = new Uint8Array(256).map((_, i) => i);
            const encoded = b64url(binary);
            const decoded = b64urlDecode(encoded);
            expect(decoded).toEqual(binary);
        });

        it('Returns empty array for empty string', () => {
            expect(b64urlDecode('')).toEqual(new Uint8Array());
        });

        it('Throws for invalid base64 characters', () => {
            expect(() => b64urlDecode('!!bad--base64')).toThrow(/Invalid base64 length/);
        });

        it('Throws for incorrect length (bad modulus)', () => {
            expect(() => b64urlDecode('abcde')).toThrow(/Invalid base64 length/);
        });

        it('Throws if input is not a string', () => {
            for (const el of CONSTANTS.NOT_STRING) {
                expect(() => b64urlDecode(el as any)).toThrow(/Expected string input/);
            }
        });

        it('Throws on malformed padding and illegal characters', () => {
            expect(() => b64urlDecode('abc$')).toThrow(/Invalid base64 input/);
        });

        it('Tolerates base64url encoded input with padding (non-stripped)', () => {
            const original = 'SGVsbG8gV29ybGQ='; // "Hello World"
            const urlSafe = original.replace(/\+/g, '-').replace(/\//g, '_');
            const decoded = b64urlDecode(urlSafe);
            expect(new TextDecoder().decode(decoded)).toBe('Hello World');
        });

        it('Tolerates standard base64 string passed as base64url', () => {
            const base64 = btoa('TriFrost');
            const decoded = b64urlDecode(base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''));
            expect(new TextDecoder().decode(decoded)).toBe('TriFrost');
        });
    });

    describe('utf8Encode', () => {
        it('Encodes basic ASCII string to UTF-8 bytes', () => {
            const input = 'TriFrost';
            const encoded = utf8Encode(input);
            expect(encoded).toBeInstanceOf(Uint8Array);
            expect(utf8Decode(encoded)).toBe(input);
        });

        it('Encodes empty string to empty Uint8Array', () => {
            const input = '';
            const encoded = utf8Encode(input);
            expect(encoded).toBeInstanceOf(Uint8Array);
            expect(encoded.length).toBe(0);
        });

        it('Encodes UTF-8 special characters', () => {
            const input = 'Café';
            const encoded = utf8Encode(input);
            expect(encoded).toEqual(new Uint8Array([67, 97, 102, 195, 169])); // C a f é
            expect(utf8Decode(encoded)).toBe(input);
        });

        it('Encodes emoji and multibyte unicode', () => {
            const input = '🔥🚀✨';
            const encoded = utf8Encode(input);
            expect(encoded).toBeInstanceOf(Uint8Array);
            expect(utf8Decode(encoded)).toBe(input);
        });

        it('Throws if input is not a string', () => {
            for (const el of CONSTANTS.NOT_STRING) {
                expect(() => utf8Encode(el as any)).toThrowError('Crypto@utf8Encode: Expected string');
            }
        });
    });

    describe('utf8Decode', () => {
        it('Decodes UTF-8 bytes back to original ASCII string', () => {
            const input = new Uint8Array([84, 114, 105, 70, 114, 111, 115, 116]); /* "TriFrost" */
            const result = utf8Decode(input);
            expect(result).toBe('TriFrost');
        });

        it('Roundtrips encoded strings correctly', () => {
            const original = 'Hello, 世界 🌍🚀';
            const encoded = utf8Encode(original);
            const decoded = utf8Decode(encoded);
            expect(decoded).toBe(original);
        });

        it('Decodes an empty Uint8Array to an empty string', () => {
            const result = utf8Decode(new Uint8Array([]));
            expect(result).toBe('');
        });

        it('Decodes multibyte characters and emoji properly', () => {
            const input = utf8Encode('✨🔥🚀');
            const result = utf8Decode(input);
            expect(result).toBe('✨🔥🚀');
        });

        it('Throws if input is not a Uint8Array', () => {
            for (const el of ['not a buffer', 123, null, undefined])
                expect(() => utf8Decode(el as any)).toThrowError('Crypto@utf8Decode: Expected Uint8Array');
        });

        it('Handles partial UTF-8 input gracefully (e.g., truncated emoji)', () => {
            const full = utf8Encode('🚀'); /* 4 bytes */
            const truncated = full.slice(0, 2); /* invalid UTF-8 */
            expect(() => utf8Decode(truncated)).toThrow(); /* TextDecoder should throw */
        });
    });

    describe('importKey', () => {
        it('Imports raw string as HMAC key', async () => {
            const key = await importKey('mysecret', ALGOS.HS256, ['sign']);
            expect(key).toBeInstanceOf(CryptoKey);
        });

        it('Returns the same CryptoKey instance if passed in directly', async () => {
            const key = await importKey('mysecret', ALGOS.HS256, ['sign']);
            const reused = await importKey(key, ALGOS.HS256, ['sign']);
            expect(reused).toBe(key);
        });

        it('Caches keys with same input', async () => {
            const key1 = await importKey('abc', ALGOS.HS256, ['sign']);
            const key2 = await importKey('abc', ALGOS.HS256, ['sign']);
            expect(key1).toBe(key2);
        });

        it('Imports JWK as key', async () => {
            const jwk = {
                kty: 'oct',
                k: btoa('supersecret'),
                alg: 'HS256',
                ext: true,
            };
            const key = await importKey(jwk, ALGOS.HS256, ['sign']);
            expect(key).toBeInstanceOf(CryptoKey);
        });

        it('Throws on invalid algorithm', async () => {
            await expect(() => importKey('mysecret', {}, ['sign'])).rejects.toThrow('Crypto@importKey: Invalid algorithm');
        });

        it('Throws on missing usages', async () => {
            await expect(() => importKey('mysecret', ALGOS.HS256, [])).rejects.toThrow('Crypto@importKey: Missing key usages');
        });

        it('Throws on unknown key input type', async () => {
            /* @ts-expect-error on purpose */
            await expect(() => importKey(123, ALGOS.HS256, ['sign'])).rejects.toThrow('importKey: Unsupported key input type');
        });

        it('Throws on empty PEM body', async () => {
            await expect(() => importKey('-----PRIVATE KEY-----\n\n', ALGOS.RS256, ['sign'])).rejects.toThrow('importKey: Empty PEM body');
        });

        it('Imports PKCS8 PEM private key', async () => {
            const pem = `
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBK...
-----END PRIVATE KEY-----`.trim();
            await expect(importKey(pem, ALGOS.RS256, ['sign'])).rejects.toThrow(/importKey: Failed to import key/);
        });

        it('Imports SPKI PEM public key', async () => {
            const pem = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMI...
-----END PUBLIC KEY-----`.trim();
            await expect(importKey(pem, ALGOS.RS256, ['verify'])).rejects.toThrow(/importKey: Failed to import key/);
        });
    });
});
