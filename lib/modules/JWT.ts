import {isObject, omit} from '@valkyriestudios/utils/object';
import {isInt} from '@valkyriestudios/utils/number';
import {b64url, b64urlDecode, utf8Encode, utf8Decode, importKey, ALGOS, type SupportedAlgorithms} from '../utils/Crypto';

export type JWTPayload<T = Record<string, unknown>> = {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
} & T;

export type JWTData<Payload = {}> = JWTPayload<Payload> & {
    _header: {
        typ?: string;
        alg?: SupportedAlgorithms;
    };
};

/**
 * Verification Options
 *
 * @property {SupportedAlgorithms} algorithm - Expected algorithm to be used in verification.
 * @property {number?} leeway - Clock skew tolerance in seconds for exp and nbf. Defaults to 0
 * @property {string?} issuer - Expected issuer (iss) claim
 * @property {string|string[]} audience - Expected audience (aud) clain. Can be array of allowed audiences
 * @property {((val:string) => boolean)?} subject - Optional function to validate the subject (sub) claim
 * @property {string?} type - Expected value of `typ` header field. Defaults to `'JWT'`
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7519#section-4.1
 * @see https://jwt.io/introduction
 */
export type JWTVerifyOptions = {
    algorithm?: SupportedAlgorithms;
    leeway?: number;
    issuer?: string;
    audience?: string | string[];
    subject?: (val: string) => boolean;
    type?: string;
};

/**
 * Signing Options
 *
 * @property {SupportedAlgorithms?} algorithm - Signing algorithm. Defaults to 'HS256'.
 * @property {string?} issuer - Issuer claim (iss), string identifying the issuing entity (eg: 'api.trifrost.dev').
 * @property {string|string[]?} audience - Audience claim (aud), string or string array identifying the intended audience (eg: 'app.trifrost.dev')
 * @property {string|number?} subject - Subject claim (sub), identifies the principal that is the subject of the JWT (eg: user id). Take Note: Gets coerced to string
 * @property {string?} jwtid - Unique identifier for the JWT (jti). Particularly useful to protect against replay attacks by storing used ids and verifying
 * @property {number|null?} expiresIn - Seconds until expiration (exp). Defaults to 3600 seconds if omitted. Pass as null to not set expiry
 * @property {number?} notBefore - Seconds before which the token is not valid (nbf).
 * @property {string?} type - Type of token (typ header field). Defaults to 'JWT'.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7519#section-4.1
 * @see https://jwt.io/introduction
 */
export type JWTSignOptions<Payload = {}> = {
    payload?: Payload;
    algorithm?: SupportedAlgorithms;
    issuer?: string;
    audience?: string | string[];
    subject?: string | number;
    jwtid?: string;
    expiresIn?: number | null;
    notBefore?: number;
    type?: string;
};

export class JWTError extends Error {
    constructor(message: string, cause?: unknown) {
        super(message, {cause});
        this.name = 'JWTError';
    }
}

export class JWTMalformedError extends JWTError {
    constructor() {
        super('JWT@verify: Malformed token');
        this.name = 'JWTMalformedError';
    }
}

export class JWTTypeError extends JWTError {
    constructor(expected: string, actual: string | undefined) {
        super(`JWT@verify: Invalid 'typ' header. Expected '${expected}', got '${actual}'`);
        this.name = 'JWTTypeError';
    }
}

export class JWTTimeError extends JWTError {
    constructor(msg: 'EXPIRED' | 'NOT_YET_VALID') {
        super(`JWT@verify: ${msg}`);
        this.name = 'JWTTimeError';
    }
}

export class JWTClaimError extends JWTError {
    constructor(type: 'ISSUER' | 'AUDIENCE' | 'SUBJECT') {
        super(`JWT@verify: INVALID_${type}`);
        this.name = 'JWTClaimError';
    }
}

export class JWTAlgorithmError extends JWTError {
    constructor(reason: 'MISSING' | 'MISMATCH' | 'UNSUPPORTED') {
        super(`JWT@verify: Algorithm ${reason.toLowerCase()}`);
        this.name = 'JWTAlgorithmError';
    }
}

export class JWTSignatureError extends JWTError {
    constructor(cause?: unknown) {
        super('JWT@verify: INVALID_SIGNATURE', cause);
        this.name = 'JWTSignatureError';
    }
}

/**
 * Decodes a JWT without verifying its signature.
 *
 * @param {string} token - JWT string to decode
 * @returns The decoded header and payload as a combined object.
 * @throws JWTError if token is malformed or missing required parts.
 * @see https://jwt.io
 */
export function jwtDecode<Payload = {}>(token: string): JWTData<Payload> {
    if (typeof token !== 'string') throw new JWTError('JWT@decode: Invalid token');

    const parts = token.split('.');
    if (parts.length < 2) throw new JWTError('JWT@decode: Malformed token');

    let jwt_data;
    try {
        jwt_data = JSON.parse(utf8Decode(b64urlDecode(parts[1]))) as JWTData<Payload>;
        jwt_data._header = JSON.parse(utf8Decode(b64urlDecode(parts[0]))) as JWTData<Payload>['_header'];
    } catch {
        /* Noop */
    }

    if (!jwt_data || typeof jwt_data !== 'object' || !jwt_data?._header?.alg || typeof jwt_data?._header.alg !== 'string')
        throw new JWTError('JWT@decode: Missing algorithm and typ');
    return jwt_data;
}

/**
 * Signs a payload into a JSON Web Token (JWT).
 *
 * @param {JWTPayload} payload - The payload to include in the token (must be a plain object)
 * @param {string|JsonWebKey|CryptoKey} secret - A secret, key, or CryptoKey used to sign the token
 * @param {JWTSignOptions} options - Signing options like `issuer`, `audience`, `expiresIn`, etc.
 * @returns A Promise resolving to a JWT string.
 * @throws Error if the payload is invalid or secret is missing.
 * @see https://jwt.io
 */
export async function jwtSign<Payload = {}>(
    secret: string | JsonWebKey | CryptoKey,
    options: JWTSignOptions<Payload> = {},
): Promise<string> {
    if (!secret) throw new Error('JWT@sign: Secret must be provided');
    if (!isObject(options)) throw new Error('JWT@sign: Options must be provided');

    /* Current time */
    const now = Math.floor(Date.now() / 1000);

    /* Create header */
    const header = {
        typ: typeof options.type === 'string' ? options.type : 'JWT',
        alg: options.algorithm && options.algorithm in ALGOS ? options.algorithm : 'HS256',
    };

    /* Remove reserved claim keys from user payload */
    /* @ts-expect-error Should be good, options.payload is raw and omit doesnt recognize the keys */
    const body: Record<string, unknown> = isObject(options.payload) ? omit(options.payload, ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti']) : {}; // eslint-disable-line prettier/prettier

    /* Issued At */
    if (!isInt(body.iat)) body.iat = now;

    /* Issuer (iss) */
    if (typeof options.issuer === 'string') body.iss = options.issuer;

    /* Subject (sub) */
    if (typeof options.subject === 'string' || Number.isFinite(options.subject)) body.sub = String(options.subject);

    /* Audience (aud) */
    if (Array.isArray(options.audience)) body.aud = options.audience.length > 1 ? options.audience : options.audience[0];
    else if (typeof options.audience === 'string') body.aud = options.audience;

    /* Expires In (exp) */
    if (isInt(options.expiresIn)) {
        body.exp = now + options.expiresIn;
    } else if (options.expiresIn !== null) {
        body.exp = now + 3600; /* Default 1 hour expiry */
    }

    /* Not Before (nbf) */
    if (isInt(options.notBefore)) body.nbf = now + options.notBefore;

    /* JWT Id (jti) */
    if (typeof options.jwtid === 'string') body.jti = options.jwtid;

    /* Create token */
    const token = b64url(utf8Encode(JSON.stringify(header))) + '.' + b64url(utf8Encode(JSON.stringify(body)));
    if (header.alg === 'none') return token + '.';

    /* Load up signing key */
    const key = await importKey(secret, ALGOS[header.alg], ['sign']);

    /* Sign and concat onto token */
    const sig = await crypto.subtle.sign(ALGOS[header.alg], key, utf8Encode(token));
    return token + '.' + b64url(new Uint8Array(sig));
}

/**
 * Verifies a JWT and returns its decoded payload and header.
 *
 * @param {string} token - JWT string to verify
 * @param {string|JsonWebKey|CryptoKey} secret - secret or public key used to verify the signature
 * @param {JWTVerifyOptions} options - Verification constraints such as algorithm, audience, issuer, etc.
 * @returns The decoded JWT data if valid.
 * @throws JWTError subclasses on failure (e.g. JWTMalformedError, JWTTimeError, JWTSignatureError).
 * @see https://jwt.io
 */
export async function jwtVerify<Payload = {}>(
    token: string,
    secret: string | JsonWebKey | CryptoKey,
    options: JWTVerifyOptions = {},
): Promise<JWTData<Payload> | null> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new JWTMalformedError();
    if (!isObject(options)) throw new Error('JWT@verify: Options must be provided');

    const [raw_header, raw_payload, sig] = parts;
    if (!raw_header || !raw_payload) throw new JWTMalformedError();

    const decoded = jwtDecode<Payload>(token);

    const typ = options.type ?? 'JWT';
    if (decoded._header.typ !== typ) throw new JWTTypeError(typ, decoded._header.typ);

    const now = Math.floor(Date.now() / 1000);
    const leeway = isInt(options.leeway) ? options.leeway : 0;

    /* Verify not-before */
    if (isInt(decoded.nbf) && decoded.nbf > now + leeway) throw new JWTTimeError('NOT_YET_VALID');

    /* Verify expiration */
    if (isInt(decoded.exp) && decoded.exp <= now - leeway) throw new JWTTimeError('EXPIRED');

    /* Verify issuer */
    if (options.issuer && decoded.iss !== options.issuer) throw new JWTClaimError('ISSUER');

    /* Verify audience */
    if (options.audience) {
        const aud = Array.isArray(options.audience) ? options.audience : [options.audience];
        const token_aud = Array.isArray(decoded.aud) ? decoded.aud : typeof decoded.aud === 'string' ? [decoded.aud] : [];
        if (!aud.some(a => token_aud.includes(a))) throw new JWTClaimError('AUDIENCE');
    }

    /* Verify subject */
    if (typeof options.subject === 'function' && (!decoded.sub || !options.subject(decoded.sub))) throw new JWTClaimError('SUBJECT');

    /* Verify algorithm */
    const alg = decoded._header.alg;
    const optalg = options.algorithm || 'HS256';
    if (!alg || !(alg in ALGOS)) throw new JWTAlgorithmError('UNSUPPORTED');
    if (alg !== optalg) throw new JWTAlgorithmError('MISMATCH');

    /* If alg is none, no need to continue verifying */
    if (alg === 'none') return decoded;

    /* Verify signature exists */
    if (!sig) throw new JWTMalformedError();

    /* Validate signature */
    try {
        const key = await importKey(secret, ALGOS[alg], ['verify']);
        const sig_valid = await crypto.subtle.verify(ALGOS[alg], key, b64urlDecode(sig), utf8Encode(raw_header + '.' + raw_payload));
        if (!sig_valid) throw new JWTSignatureError();
    } catch (err) {
        throw new JWTSignatureError({cause: err});
    }

    return decoded;
}
