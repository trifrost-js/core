import {describe, it, expect, vi, afterEach} from 'vitest';
import {
    jwtSign,
    jwtVerify,
    jwtDecode,
    JWTClaimError,
    JWTMalformedError,
    JWTSignatureError,
    JWTTimeError,
    JWTTypeError,
    JWTAlgorithmError,
} from '../../../lib/modules/JWT';
import {b64url, SupportedAlgorithms, utf8Encode} from '../../../lib/utils/Crypto';
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

const ALGOS: Partial<Record<SupportedAlgorithms, {private: string; public: string} | string>> = {
    none: SECRET,
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

describe('Modules - JWT', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('jwtSign', () => {
        it('Creates a valid JWT with default options', async () => {
            const token = await jwtSign(SECRET, {payload: {role: 'admin'}});
            expect(typeof token).toBe('string');
            expect(token.split('.').length).toBe(3);
        });

        it('Allows signing with custom algorithm', async () => {
            const token = await jwtSign(SECRET, {algorithm: 'HS512', payload: {id: 1}});
            const decoded = jwtDecode(token);
            expect(decoded._header.alg).toBe('HS512');
        });

        it('Supports audience, issuer, subject', async () => {
            const token = await jwtSign(SECRET, {audience: 'client', issuer: 'api', subject: 'user123'});
            const decoded = jwtDecode(token);
            expect(decoded.aud).toBe('client');
            expect(decoded.iss).toBe('api');
            expect(decoded.sub).toBe('user123');
        });

        it('Omits exp when expiresIn is null', async () => {
            const token = await jwtSign(SECRET, {expiresIn: null});
            const decoded = jwtDecode(token);
            expect(decoded.exp).toBeUndefined();
        });

        it('Handles alg:none token without verifying signature', async () => {
            const token = await jwtSign(SECRET, {algorithm: 'none', payload: {foo: 'bar'}});
            const decoded = await jwtVerify<{foo: string}>(token, SECRET, {algorithm: 'none'});
            expect(decoded!.foo).toBe('bar');
        });

        it('Encodes audience as array when multiple entries provided', async () => {
            const token = await jwtSign(SECRET, {audience: ['client', 'admin']});
            const decoded = jwtDecode(token);
            expect(Array.isArray(decoded.aud)).toBe(true);
            expect(decoded.aud).toEqual(['client', 'admin']);
        });

        it('Encodes audience as string when single-item array provided', async () => {
            const token = await jwtSign(SECRET, {audience: ['only']});
            const decoded = jwtDecode(token);
            expect(typeof decoded.aud).toBe('string');
            expect(decoded.aud).toBe('only');
        });

        it('Throws if payload is not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                await expect(() => jwtSign(SECRET, el as any)).rejects.toThrow();
            }
        });

        it('Throws if secret is missing', async () => {
            await expect(() => jwtSign('' as any, {})).rejects.toThrow();
        });
    });

    describe('jwtDecode', () => {
        it('Decodes a signed token correctly', async () => {
            const token = await jwtSign(SECRET, {payload: {foo: 'bar'}});
            const decoded = jwtDecode<{foo: string}>(token);
            expect(decoded.foo).toBe('bar');
            expect(decoded._header.alg).toBe('HS256');
        });

        it('Throws on malformed token', () => {
            expect(() => jwtDecode('abc.def')).toThrow('JWT@decode: Missing algorithm and typ');
        });

        it('Throws if token is not a string', () => {
            for (const el of CONSTANTS.NOT_STRING) {
                expect(() => jwtDecode(el as any)).toThrowError('JWT@decode: Invalid token');
            }
        });

        it('Throws if token has fewer than 2 parts', () => {
            expect(() => jwtDecode('justonepart')).toThrowError('JWT@decode: Malformed token');
            expect(() => jwtDecode('')).toThrowError('JWT@decode: Malformed token');
        });
    });

    describe('jwtVerify', () => {
        it('Throws JWTMalformedError if token has fewer than 3 parts', async () => {
            const malformed = 'only.one';
            await expect(() => jwtVerify(malformed, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTMalformedError);
        });

        it('Throws JWTMalformedError if token has missing payload part', async () => {
            const header = b64url(utf8Encode(JSON.stringify({alg: 'HS256', typ: 'JWT'})));
            const malformed = `${header}..signature`;
            await expect(() => jwtVerify(malformed, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTMalformedError);
        });

        it('Verifies a valid token', async () => {
            const token = await jwtSign(SECRET, {payload: {role: 'admin'}});
            const result = await jwtVerify<{role: string}>(token, SECRET, {algorithm: 'HS256'});
            expect(result!.role).toBe('admin');
        });

        it('Verifies a valid token with default algorithm', async () => {
            const token = await jwtSign(SECRET, {payload: {role: 'admin'}});
            const result = await jwtVerify<{role: string}>(token, SECRET);
            expect(result!.role).toBe('admin');
        });

        it('Throws if options is passed as a non-object', async () => {
            const token = await jwtSign(SECRET, {subject: 1});
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                await expect(jwtVerify(token, 'wrong', el as any)).rejects.toThrow(Error);
            }
        });

        it('Fails with invalid signature', async () => {
            const token = await jwtSign(SECRET, {subject: 1});
            await expect(jwtVerify(token, 'wrong', {algorithm: 'HS256'})).rejects.toThrow(JWTSignatureError);
        });

        it('Fails on expired token', async () => {
            const token = await jwtSign(SECRET, {expiresIn: -10});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTTimeError);
        });

        it('Respects leeway for expiry', async () => {
            const token = await jwtSign(SECRET, {expiresIn: -1});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256', leeway: 5})).resolves.toBeTruthy();
        });

        it('Rejects future tokens with nbf > now', async () => {
            const token = await jwtSign(SECRET, {notBefore: 100});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTTimeError);
        });

        it('Validates audience (single)', async () => {
            const token = await jwtSign(SECRET, {audience: 'client'});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256', audience: 'wrong'})).rejects.toThrow(JWTClaimError);
        });

        it('Verifies token when audience array includes a matching value', async () => {
            const token = await jwtSign(SECRET, {
                algorithm: 'HS256',
                audience: ['foo', 'bar', 'client'],
            });

            const verified = await jwtVerify(token, SECRET, {
                algorithm: 'HS256',
                audience: ['client', 'other'],
            });

            expect(verified).toBeTruthy();
        });

        it('Rejects token when audience array does not match any allowed', async () => {
            const token = await jwtSign(SECRET, {
                algorithm: 'HS256',
                audience: ['internal', 'admin'],
            });

            await expect(
                jwtVerify(token, SECRET, {
                    algorithm: 'HS256',
                    audience: ['client', 'external'],
                }),
            ).rejects.toThrow(JWTClaimError);
        });

        it('Validates subject callback', async () => {
            const token = await jwtSign(SECRET, {subject: 'abc'});
            await expect(
                jwtVerify(token, SECRET, {
                    algorithm: 'HS256',
                    subject: s => s === 'def',
                }),
            ).rejects.toThrow(JWTClaimError);
        });

        it('Validates issuer', async () => {
            const token = await jwtSign(SECRET, {issuer: 'api'});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256', issuer: 'other'})).rejects.toThrow(JWTClaimError);
        });

        it('Throws if algorithm mismatches', async () => {
            const token = await jwtSign(SECRET, {algorithm: 'HS384'});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTAlgorithmError);
        });

        it('Fails verification if token payload is tampered', async () => {
            const token = await jwtSign(SECRET, {algorithm: 'HS256', subject: 'abc'});
            const parts = token.split('.');
            const tamperedPayload = b64url(utf8Encode(JSON.stringify({sub: 'hacked'})));
            const tamperedToken = [parts[0], tamperedPayload, parts[2]].join('.');

            await expect(jwtVerify(tamperedToken, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTSignatureError);
        });

        it('Supports JWK key material for signing and verifying', async () => {
            const jwk: JsonWebKey = {
                kty: 'oct',
                k: b64url(utf8Encode(SECRET)),
                alg: 'HS256',
            };

            const token = await jwtSign(jwk, {
                algorithm: 'HS256',
                payload: {foo: 'bar'},
            });
            const verified = await jwtVerify<{foo: string}>(token, jwk, {algorithm: 'HS256'});
            expect(verified!.foo).toBe('bar');
        });

        it('Ignores null or invalid iat from payload when signing', async () => {
            const token = await jwtSign(SECRET, {
                algorithm: 'HS256',
                payload: {iat: null as any},
            });
            const decoded = jwtDecode(token);
            expect(typeof decoded.iat).toBe('number');
            expect(decoded.iat).toBeGreaterThan(0);
        });

        it('Ignores invalid aud claim in payload', async () => {
            const token = await jwtSign(SECRET, {algorithm: 'HS256', payload: {aud: {foo: 'bar'} as any}});
            const decoded = jwtDecode(token);
            expect(decoded.aud).toBeUndefined();
        });

        it('Fails when token is not yet valid (nbf too far in future)', async () => {
            const token = await jwtSign(SECRET, {notBefore: 30});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256', leeway: 5})).rejects.toThrow(JWTTimeError);
        });

        it('Fails if alg header is missing or unsupported', () => {
            const malformed = [btoa(JSON.stringify({typ: 'JWT'})), btoa(JSON.stringify({foo: 'bar'})), ''].join('.');
            expect(() => jwtDecode(malformed)).toThrow('JWT@decode: Missing algorithm and typ');
        });

        it('Throws when secret is invalid key material', async () => {
            const token = await jwtSign(SECRET, {algorithm: 'HS256'});
            const badKey = {} as JsonWebKey;
            await expect(jwtVerify(token, badKey, {algorithm: 'HS256'})).rejects.toThrow(JWTSignatureError);
        });

        it('Ignores invalid audience type and fails validation', async () => {
            const token = await jwtSign(SECRET, {algorithm: 'HS256', audience: {client: true} as any});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256', audience: 'client'})).rejects.toThrow(JWTClaimError);
        });

        it('Accepts alg none with trailing dot', async () => {
            const token = await jwtSign(SECRET, {algorithm: 'none'});
            const verified = await jwtVerify(token, SECRET, {algorithm: 'none'});
            expect(verified).toBeTruthy();
        });

        it('Minimal HS256 token', async () => {
            const token = await jwtSign(SECRET, {payload: {}});
            const decoded = await jwtVerify(token, SECRET, {algorithm: 'HS256'});
            expect(decoded).toBeTruthy();
        });

        it('Payload tampering detection', async () => {
            const token = await jwtSign(SECRET, {payload: {foo: 'bar'}, algorithm: 'HS256'});
            const parts = token.split('.');
            parts[1] = b64url(utf8Encode(JSON.stringify({foo: 'hacked'})));
            const tampered = parts.join('.');
            await expect(jwtVerify(tampered, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTSignatureError);
        });

        it('Header tampering detection', async () => {
            const token = await jwtSign(SECRET, {payload: {foo: 'bar'}, algorithm: 'HS256'});
            const parts = token.split('.');
            parts[0] = b64url(utf8Encode(JSON.stringify({alg: 'none', typ: 'JWT'})));
            const tampered = parts.join('.');
            await expect(jwtVerify(tampered, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTAlgorithmError);
        });

        it('Missing signature for signed alg', async () => {
            const token = await jwtSign(SECRET, {payload: {foo: 'bar'}, algorithm: 'HS256'});
            const [h, p] = token.split('.');
            const bad = `${h}.${p}.`;
            await expect(jwtVerify(bad, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTMalformedError);
        });

        it('Missing payload', async () => {
            const [h] = await jwtSign(SECRET, {payload: {foo: 'bar'}}).then(t => t.split('.'));
            const malformed = `${h}..sig`;
            await expect(() => jwtDecode(malformed)).toThrow('JWT@decode: Missing algorithm and typ');
        });

        it('Unknown algorithm', async () => {
            const token = await jwtSign(SECRET, {payload: {}, algorithm: 'HS256'});
            const parts = token.split('.');
            parts[0] = b64url(utf8Encode(JSON.stringify({alg: 'XYZ', typ: 'JWT'})));
            const tampered = parts.join('.');
            await expect(jwtVerify(tampered, SECRET, {algorithm: 'XYZ' as any})).rejects.toThrow(JWTAlgorithmError);
        });

        it('Expired token', async () => {
            const token = await jwtSign(SECRET, {expiresIn: -1});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256'})).rejects.toThrow(JWTTimeError);
        });

        it('Accepts future token if no nbf', async () => {
            const token = await jwtSign(SECRET, {payload: {foo: 'bar'}});
            const decoded = await jwtVerify<{foo: string}>(token, SECRET, {algorithm: 'HS256'});
            expect(decoded!.foo).toBe('bar');
        });

        it('Numeric sub coerced to string', async () => {
            const token = await jwtSign(SECRET, {subject: 123});
            const decoded = await jwtVerify(token, SECRET, {
                algorithm: 'HS256',
                subject: val => val === '123',
            });
            expect(decoded!.sub).toBe('123');
        });

        it('Invalid typ header', async () => {
            const token = await jwtSign(SECRET, {payload: {}, type: 'JWTX'});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256', type: 'JWT'})).rejects.toThrow(JWTTypeError);
        });

        it('iat override protection', async () => {
            const token = await jwtSign(SECRET, {payload: {iat: 0}});
            const decoded = jwtDecode(token);
            expect(decoded.iat).not.toBe(0);
        });

        it('aud array match succeeds', async () => {
            const token = await jwtSign(SECRET, {audience: ['a', 'b', 'c']});
            const decoded = await jwtVerify<{aud: string}>(token, SECRET, {algorithm: 'HS256', audience: 'b'});
            expect(decoded!.aud).toContain('b');
        });

        it('aud array mismatch fails', async () => {
            const token = await jwtSign(SECRET, {audience: ['a', 'b', 'c']});
            await expect(jwtVerify(token, SECRET, {algorithm: 'HS256', audience: 'z'})).rejects.toThrow(JWTClaimError);
        });

        it('rejects malformed base64 payload', () => {
            const malformed = `${b64url(utf8Encode(JSON.stringify({alg: 'HS256', typ: 'JWT'})))}.@@.sig`;
            expect(() => jwtDecode(malformed)).toThrow();
        });

        it('accepts alg:none even if sig is present', async () => {
            const token = await jwtSign(SECRET, {algorithm: 'none', payload: {foo: 'bar'}});
            const withFakeSig = token + 'junk';
            const verified = await jwtVerify<{foo: string}>(withFakeSig, SECRET, {algorithm: 'none'});
            expect(verified!.foo).toBe('bar');
        });

        for (const [alg, keys] of Object.entries(ALGOS)) {
            it(`Signs, verifies, and decodes JWT with alg=${alg}`, async () => {
                const isSymmetric = typeof keys === 'string';
                const privateKey = isSymmetric ? keys : keys!.private;
                const publicKey = isSymmetric ? keys : keys!.public;

                const payload = {
                    sub: 'user123',
                    iss: 'https://trifrost.dev',
                    aud: ['client', 'admin'],
                    role: 'admin',
                    jwtid: 'abc-123',
                };

                const token = await jwtSign(privateKey!, {
                    algorithm: alg as SupportedAlgorithms,
                    type: 'JWT',
                    expiresIn: 3600,
                    notBefore: 0,
                    subject: payload.sub,
                    issuer: payload.iss,
                    audience: payload.aud,
                    jwtid: payload.jwtid,
                    payload: {role: payload.role},
                });

                const verified = await jwtVerify<typeof payload>(token, publicKey!, {
                    algorithm: alg as SupportedAlgorithms,
                    type: 'JWT',
                    audience: 'client',
                    issuer: 'https://trifrost.dev',
                    subject: val => val === 'user123',
                });

                const decoded = jwtDecode<typeof payload>(token);

                /* Header assertions */
                expect(decoded._header.typ).toBe('JWT');
                expect(decoded._header.alg).toBe(alg);

                /* Payload assertions */
                expect(decoded.sub).toBe(payload.sub);
                expect(decoded.iss).toBe(payload.iss);
                expect(decoded.role).toBe(payload.role);
                expect(decoded.jti).toBe(payload.jwtid);
                expect(decoded.aud).toContain('client');
                expect(decoded.aud).toContain('admin');

                /* Signature was valid */
                expect(verified!.sub).toBe('user123');
            });

            if (alg !== 'none') {
                it(`Rejects tampered payload for alg=${alg}`, async () => {
                    const isSymmetric = typeof keys === 'string';
                    const privateKey = isSymmetric ? keys : keys!.private;
                    const publicKey = isSymmetric ? keys : keys!.public;

                    const token = await jwtSign(privateKey!, {
                        algorithm: alg,
                        payload: {foo: 'bar'},
                    });

                    const parts = token.split('.');
                    parts[1] = b64url(utf8Encode(JSON.stringify({foo: 'hacked'})));
                    const tampered = parts.join('.');

                    await expect(jwtVerify(tampered, publicKey!, {algorithm: alg})).rejects.toThrow(JWTSignatureError);
                });
            }

            it(`Rejects algorithm mismatch for alg=${alg}`, async () => {
                const isSymmetric = typeof keys === 'string';
                const privateKey = isSymmetric ? keys : keys!.private;

                const token = await jwtSign(privateKey!, {
                    algorithm: alg,
                    payload: {foo: 'bar'},
                });

                const wrongAlg = alg === 'HS256' ? 'HS512' : 'HS256';
                await expect(jwtVerify(token, privateKey!, {algorithm: wrongAlg as any})).rejects.toThrow(JWTAlgorithmError);
            });

            it(`Preserves issued at (iat) claim for alg=${alg}`, async () => {
                const isSymmetric = typeof keys === 'string';
                const privateKey = isSymmetric ? keys : keys!.private;

                const token = await jwtSign(privateKey!, {
                    algorithm: alg,
                    payload: {},
                });

                const decoded = jwtDecode(token);
                expect(typeof decoded.iat).toBe('number');
                expect(decoded.iat).toBeGreaterThan(0);
            });
        }
    });
});
