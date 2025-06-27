import {describe, it, expect} from 'vitest';
import {b64url, b64urlDecode, utf8Encode, utf8Decode, importKey, ALGOS, SupportedAlgorithms} from '../../../lib/utils/Crypto';
import CONSTANTS from '../../constants';

const SECRET = 'my-super-secret';
const RSA_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDGSO918YlG1cG+
3TcJk76+sFpLH2ww6rqpz0nCrB+TAm4lybFagS6iChMsFSG02L08VuPJqyj35isL
ip20i1knBpFASBNtd2nVD3KyfwuGtCWHsLOPj0Dk25Y/aNuPIoxeVkiI9acBykDP
qPQqXFERFnKUwGqJAk0r+rQCkmYX+45VQSz71eTnB3fvs3ZMDyik0612f7zWYoVy
uaLfkF7lXgEV2wWDJoomU7ygX9/VUWpQL5ni3+59r991hMnSgaPKUarhokTjzQ+k
EnGP7aLdWLcrr5Nd4mUmAxMrjIrP5QwC6mjOn06xxEWqpppYGVy0Xk5mMnitUAdI
4rgyYxdZAgMBAAECggEACUAm19BMcL8ROmfUpQA9EmVk2QNex0t0KO7wSIJCONgQ
rneh7BCBzfJ9YX2c5HSGI5YEK4juMN6OnIu7fsxPfPgb961FJsK+7784QSaXMZIe
/B0cy3JJ+0NZV5z7PUrF1LLe0HDxeS5n5qhBt+Y1q//pmZH+hmTSl94q3sHYvH6d
ZyjcagBXwchKjLIpK9fDhzk4qlow9ZQoJvopDYEQB1ebONr0QcoVPEeMEt/p8qE+
wfkG4W5nf5XXsinMDDcZ0iJdRNIhiROIQ67C3z4sqh93IjYNIby5mm2c/Td/rxdk
VCnNuvBScv3+rMCldtm6T5zFUNEmwef2QHnUuohYFwKBgQDli+1ZWxLfp3Kd4jLZ
tjWtOGlF/WERKAnp0he2jVKxQ8WljycUUNA03T83MzM3WACKioh+wzddYgc7OhRO
JqtMpdIfyrnaaOGRzdNd9KmJyMGmqJgU3Mq9k7P2uCFqaOn2gTLm2XQZ/DVKO/XS
LBhq2df0grydT+YyBTWMX7ry4wKBgQDdIro4cttn3r7QV2ANaMRksTg33gZSRzmG
eYwGjm6dZVdWQSbO7mepsgKdlrRwWIr9uojvILkb7kqMiVlwqO+qTqPZBnauyQhu
35R5oR+EL6pXqqNVfrfXM0JOvntrioRnzqb67NVaBpzIi+1B9I8vneYEWjtofAoo
9MwXfP8VkwKBgHmGQvnzhWJyu/NqNZGdLX2vR8yOAD2c/OKVH4i9+PFv98tWplHT
Fudl2nnW2V6LcH3oKasynrUJmNp6PRXC0x2ZDE1Yflxq+kC+vxAW30raxer9hsZE
vfDvqW8MvGQhdvvSGqispxK6u1u5ssK6JZMsEXCZZlHCYxRIPbk7VTYRAoGAQNCx
9mOr7Xj7QsOpcqS3k6/iA3X/MlSQBttPcIiE4XtXqv9zqYl1NubnH1uRzbAWJSJs
inJz7zzb+u8zGPNbM/bSzYS4eqiP4TeFJFVWkH8MFZ/9Oczng5sRn1TzheTWxDps
9PU/36A6igmBZCiTY2iLh9EOwqRAshp2S5gmiCMCgYAwp2MI8Dq+lsVXXZ7RfMYX
NoixmPFyUBdu7l7ve4ILmaYOX7f6b8mqqMaK1SKDEcFtegvJe7D5S40GWGZv0Mzh
PZEQcNQ0x5ew4t2DSyf/gWi5z34NedUDILHHApNH3KoZJYqqaZ4Rl1oTpBaxLHL1
Kf2cxdEQt7edXE8/yGjneQ==
-----END PRIVATE KEY-----
`;

const RSA_PUBLIC = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxkjvdfGJRtXBvt03CZO+
vrBaSx9sMOq6qc9JwqwfkwJuJcmxWoEuogoTLBUhtNi9PFbjyaso9+YrC4qdtItZ
JwaRQEgTbXdp1Q9ysn8LhrQlh7Czj49A5NuWP2jbjyKMXlZIiPWnAcpAz6j0KlxR
ERZylMBqiQJNK/q0ApJmF/uOVUEs+9Xk5wd377N2TA8opNOtdn+81mKFcrmi35Be
5V4BFdsFgyaKJlO8oF/f1VFqUC+Z4t/ufa/fdYTJ0oGjylGq4aJE480PpBJxj+2i
3Vi3K6+TXeJlJgMTK4yKz+UMAupozp9OscRFqqaaWBlctF5OZjJ4rVAHSOK4MmMX
WQIDAQAB
-----END PUBLIC KEY-----
`;

const ES256_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgmqc4cf7bQOzFTmA5
YNhzMXiHetbVawtBKG8uHMqV40KhRANCAARxw33S5ZJe30VkV68Fkosn08KFzJd1
ac879AIxJ5wALA1rCoueDQUh0aH9xh2Pw9e59EzfuAysKK+FBeH36FPf
-----END PRIVATE KEY-----
`;

const ES256_PUBLIC = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEccN90uWSXt9FZFevBZKLJ9PChcyX
dWnPO/QCMSecACwNawqLng0FIdGh/cYdj8PXufRM37gMrCivhQXh9+hT3w==
-----END PUBLIC KEY-----
`;

const ES384_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIG2AgEAMBAGByqGSM49AgEGBSuBBAAiBIGeMIGbAgEBBDAETAzXi8ol30FuQk4G
upDbO62YkcHbh3PusHr+ROFRIAU9VwrKDlKrs5X9KSKc/vGhZANiAAT49uI0cSv6
i42MCpmNJwoC8gGrWIaBC292cfgNQB5yD7E2s3eOy2RpPFKDT6/dSCaR4fsEqo+X
FSCaSAfvxsn7GAuhc4Y5M49wTj+p+IG+28gnLKgsUh68o8iFtbxZ//k=
-----END PRIVATE KEY-----
`;

const ES384_PUBLIC = `-----BEGIN PUBLIC KEY-----
MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE+PbiNHEr+ouNjAqZjScKAvIBq1iGgQtv
dnH4DUAecg+xNrN3jstkaTxSg0+v3UgmkeH7BKqPlxUgmkgH78bJ+xgLoXOGOTOP
cE4/qfiBvtvIJyyoLFIevKPIhbW8Wf/5
-----END PUBLIC KEY-----
`;

const ES512_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIHuAgEAMBAGByqGSM49AgEGBSuBBAAjBIHWMIHTAgEBBEIAUXz6G215Wvpk0RWU
rI9ryvYibHsWm//ZK6VSzcw3DqtaXh91TLl/B7qOZO/52oOt/RROn9v/JZG3cmwx
55d9GX2hgYkDgYYABAFo0zfU6a2yFeZsbGQIk2rKrWhb9T9J9kunrKJ1lwbMlUlA
hJ7celpE3ugjP4Br4mtAsb3KdVTjBTgVRTNzheOwqAE11qYv5Ordu0aWNDukmk3R
4eiHfIgvz0KK7MiIo5c+ektKngIfv2ACAJOGm3gqcMQCvNHg1GfmurXnRBjlnM4H
Iw==
-----END PRIVATE KEY-----
`;

const ES512_PUBLIC = `-----BEGIN PUBLIC KEY-----
MIGbMBAGByqGSM49AgEGBSuBBAAjA4GGAAQBaNM31OmtshXmbGxkCJNqyq1oW/U/
SfZLp6yidZcGzJVJQISe3HpaRN7oIz+Aa+JrQLG9ynVU4wU4FUUzc4XjsKgBNdam
L+Tq3btGljQ7pJpN0eHoh3yIL89CiuzIiKOXPnpLSp4CH79gAgCThpt4KnDEArzR
4NRn5rq150QY5ZzOByM=
-----END PUBLIC KEY-----
`;

const ALGOS_TO_TEST: Partial<Record<SupportedAlgorithms, {private: string; public: string} | string>> = {
    HS256: SECRET,
    HS384: SECRET,
    HS512: SECRET,
    RS256: {private: RSA_PRIVATE, public: RSA_PUBLIC},
    RS384: {private: RSA_PRIVATE, public: RSA_PUBLIC},
    RS512: {private: RSA_PRIVATE, public: RSA_PUBLIC},
    ES256: {private: ES256_PRIVATE, public: ES256_PUBLIC},
    ES384: {private: ES384_PRIVATE, public: ES384_PUBLIC},
    ES512: {private: ES512_PRIVATE, public: ES512_PUBLIC},
};

describe('Utils - Crypto', () => {
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

        it('Encodes high-value binary data correctly', () => {
            const input = new Uint8Array([255, 254, 253, 252]);
            const encoded = b64url(input);
            expect(encoded).toBe('__79_A');
        });

        it('Throws on non-Uint8Array input', () => {
            for (const el of [...CONSTANTS.NOT_ARRAY]) {
                expect(() => b64url(el as any)).toThrow('Crypto@b64url: Expected Uint8Array');
            }
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

        it('Decodes back to high-value binary data', () => {
            const encoded = '__79_A';
            const decoded = b64urlDecode(encoded);
            expect(decoded).toEqual(new Uint8Array([255, 254, 253, 252]));
        });

        it('Handles no padding edge case with exact 4-char blocks', () => {
            const input = b64url(utf8Encode('test'));
            const decoded = b64urlDecode(input);
            expect(utf8Decode(decoded)).toBe('test');
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

        it('Throws on invalid base64 characters or malformed input', () => {
            for (const el of [
                '-65kBcxWPeNN9&kBcxWPeNN9-0vrjfrq3X1AEzNGWI=',
                'e*==',
                'F4ypFWF2eW1RulpdMD0e4FwOa0Rip_tk1^1nYOV2uw8H0=',
                'uCxlPBApf1JseNUcOuLb4PV0j84cWGx0pU0Pe8e#gpXXJBsBz-ne1FRmrHeoJ-RCUy4_EM5w',
                'abcde',
            ]) {
                expect(() => b64urlDecode(el)).toThrow(/Crypto@b64urlDecode:/);
            }
        });

        it('Successfully decodes valid fuzzed base64url input', () => {
            for (const el of [
                'lXd_mXR-T-B5uDIhFD8pPhKZQ1n940ZVit0DkdChGmp9uk_GtSBVB8SlKDcJ35j15fEV81Ao2AasIVgbmw',
                'ocwDsM4Z0wMiXvS72W_tfY2lhqhdnqN1vvUghhjXanWwdmO7tCdpez8x34SkjM5f',
                'qjgDe0b2WPurqv8W6jONTByI3OMIrUslgzEFL7EiC_DCFjQ',
                '2q9osimnKB0',
                'UCICxLoKCNZNYDp-CQ',
                'e7g7qFJABrdNXccELCwBFimE2DwItT_Dk3lB1b_qsL9cNSPcyNMuYA',
                'e9XTLQ1m1hRfmUCgu4c_OU_M5FFQYh5csDI7AqI',
                'mOhV2_E7q87j_zlf6i2Y1Q',
                'goIDxWSTfJltJg9SrYpXvCT6jt8OoNtlBAlh7p7c2qe9',
                'ArwMQ7KddxRWM6zDPYZAoaZYwoHoVTHLhPAQfZYxQ31Q_kQTpEUo5LF4WflAmA',
            ]) {
                const decoded = b64urlDecode(el);
                expect(decoded).toBeInstanceOf(Uint8Array);
                expect(decoded.length).toBeGreaterThan(0);
            }
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

        it('Handles valid UTF-8 strings including edge cases', () => {
            for (const str of ['a', '🚀', 'áéíóúüñ¿¡', '👨‍👩‍👧‍👦', '𠜎', '\u{10FFFF}', 'a'.repeat(10_000)]) {
                const encoded = utf8Encode(str);
                expect(encoded).toBeInstanceOf(Uint8Array);
                expect(utf8Decode(encoded)).toBe(str);
            }
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

        it('Roundtrips mixed script content (e.g. emoji + CJK + Arabic)', () => {
            const input = 'Hello 🚀 你好 السلام';
            const encoded = utf8Encode(input);
            const decoded = utf8Decode(encoded);
            expect(decoded).toBe(input);
        });

        it('Throws on partial high surrogate without low surrogate', () => {
            const input = new Uint8Array([0xed, 0xa0, 0x80]); /* Invalid UTF-8 */
            expect(() => utf8Decode(input)).toThrow();
        });

        it('Throws on invalid UTF-8 byte sequences', () => {
            for (const input of [
                new Uint8Array([0xc0]) /* Overlong encoding */,
                new Uint8Array([0xe0, 0x80]) /* Truncated multibyte */,
                new Uint8Array([0xf0, 0x80, 0x80]) /* Truncated 4-byte */,
                new Uint8Array([0xff, 0xfe, 0xfd]) /* Invalid bytes */,
                new Uint8Array([0b11000000]) /* Incomplete 2-byte */,
            ]) {
                expect(() => utf8Decode(input)).toThrow(/Crypto@utf8Decode/);
            }
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

        it('Caches imported keys separately for different algos with same secret', async () => {
            const key1 = await importKey('secret', ALGOS.HS256, ['sign']);
            const key2 = await importKey('secret', ALGOS.HS512, ['sign']);
            expect(key1).not.toBe(key2);
        });

        it('Supports identical input with different usages', async () => {
            const key1 = await importKey('secret', ALGOS.HS256, ['sign']);
            const key2 = await importKey('secret', ALGOS.HS256, ['verify']);
            expect(key1).not.toBe(key2);
        });

        it('Does not cache malformed PEM input', async () => {
            await expect(() =>
                importKey('-----BEGIN PRIVATE KEY-----\nINVALIDDATA\n-----END PRIVATE KEY-----', ALGOS.RS256, ['sign']),
            ).rejects.toThrow(/Crypto@importKey: Failed to import key/);
        });

        it('Handles JWK input with missing kty field gracefully', async () => {
            const badJWK = {k: btoa('secret'), alg: 'HS256', ext: true};
            await expect(() => importKey(badJWK, ALGOS.HS256, ['sign'])).rejects.toThrow('Crypto@importKey: Unsupported key input type');
        });

        it('Throws on invalid algorithm', async () => {
            /* @ts-expect-error This is what we're testing */
            await expect(() => importKey('mysecret', {}, ['sign'])).rejects.toThrow('Crypto@importKey: Invalid algorithm');
        });

        it('Throws on missing usages', async () => {
            await expect(() => importKey('mysecret', ALGOS.HS256, [])).rejects.toThrow('Crypto@importKey: Missing key usages');
        });

        it('Throws on unknown key input type', async () => {
            /* @ts-expect-error on purpose */
            await expect(() => importKey(123, ALGOS.HS256, ['sign'])).rejects.toThrow('Crypto@importKey: Unsupported key input type');
        });

        it('Throws on empty PEM body', async () => {
            await expect(() => importKey('-----PRIVATE KEY-----\n\n', ALGOS.RS256, ['sign'])).rejects.toThrow(
                'Crypto@importKey: Failed to import key (Unable to import RSA key with format raw)',
            );
        });

        it('throws on invalid PEM formats', async () => {
            for (const pem of [
                '-----BEGIN PUBLIC KEY-----\n\n-----END PUBLIC KEY-----',
                '-----BEGIN PRIVATE KEY-----\n!@#$%^&*\n-----END PRIVATE KEY-----',
                '-----BEGIN X509 CERTIFICATE-----\nINVALID\n-----END X509 CERTIFICATE-----',
            ]) {
                await expect(() => importKey(pem, ALGOS.RS256, ['verify'])).rejects.toThrow(/Crypto@importKey/);
            }
        });

        it('handles valid raw string keys', async () => {
            for (const secret of ['abc', '🔥🔥🔥', '1234567890123456789012345678901234567890']) {
                const key = await importKey(secret, ALGOS.HS256, ['sign']);
                expect(key).toBeInstanceOf(CryptoKey);
            }
        });

        it('handles fuzzed JWK objects', async () => {
            for (const jwk of [
                {kty: 'oct', k: btoa('supersecret'), alg: 'HS256', ext: true},
                {kty: 'oct', k: btoa(String.fromCharCode(...utf8Encode('🔥🔥🔥'))), alg: 'HS384', ext: true},
            ]) {
                const algo = ALGOS[jwk.alg as keyof typeof ALGOS];
                const key = await importKey(jwk, algo, ['sign']);
                expect(key).toBeInstanceOf(CryptoKey);
            }
        });

        it('Imports PKCS8 PEM private key', async () => {
            const pem = `
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBK...
-----END PRIVATE KEY-----`.trim();
            await expect(importKey(pem, ALGOS.RS256, ['sign'])).rejects.toThrow(/Crypto@importKey: Failed to import key/);
        });

        it('Imports SPKI PEM public key', async () => {
            const pem = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMI...
-----END PUBLIC KEY-----`.trim();
            await expect(importKey(pem, ALGOS.RS256, ['verify'])).rejects.toThrow(/Crypto@importKey: Failed to import key/);
        });

        for (const [alg, keys] of Object.entries(ALGOS_TO_TEST)) {
            const config = ALGOS[alg as SupportedAlgorithms];

            describe(`Imports for ${alg}`, () => {
                it(`imports private key (sign)`, async () => {
                    const inputKey = typeof keys === 'string' ? keys : keys!.private;
                    const usages: KeyUsage[] = ['sign'];
                    const imported = await importKey(inputKey, config!, usages);
                    expect(imported).toBeInstanceOf(CryptoKey);
                });

                if (typeof keys !== 'string') {
                    it(`imports public key (verify)`, async () => {
                        const usages: KeyUsage[] = ['verify'];
                        const imported = await importKey(keys!.public, config!, usages);
                        expect(imported).toBeInstanceOf(CryptoKey);
                    });
                }
            });
        }
    });
});
