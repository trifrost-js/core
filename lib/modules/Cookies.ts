/* eslint-disable complexity */

import {LRU} from '@valkyriestudios/utils/caching';
import {isDate, addUTC, diff} from '@valkyriestudios/utils/date';
import {isInt, isNum} from '@valkyriestudios/utils/number';
import {isObject} from '@valkyriestudios/utils/object';
import {isNeString, isString} from '@valkyriestudios/utils/string';
import {type TriFrostContext} from '../types/context';

export type TriFrostCookieOptions = {
    expires: Date;
    maxage: number;
    path: string;
    domain: string;
    secure: boolean;
    httponly: boolean;
    samesite: 'Strict' | 'Lax' | 'None';
};

export type TriFrostCookieDeleteOptions = {
    path: string;
    domain: string;
};

/**
 * The below regexes validate name and values comply with cookie standards
 * eg: No control/illegal characters like semicolons
 */
const RGX_NAME = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;
const RGX_VALUE = /^[\x20-\x7E]*$/;

const HMACAlgos = {
    'SHA-256': true,
    'SHA-384': true,
    'SHA-512': true,
} as const;

export type SigningAlgorithm = `${keyof typeof HMACAlgos}`;

type SigningOptions = {algorithm: SigningAlgorithm};

export class Cookies {

    #ctx:TriFrostContext;

    /* Global cookie defaults */
    #config:Partial<TriFrostCookieOptions>;

    /* Incoming cookies from request */
    #incoming:Record<string, string>;

    /* Outgoing cookies */
    #outgoing:Record<string, string> = {};

    /* Incoming/Outgoing values (for usage in eg .all or .get) */
    #combined:Record<string, string> = {};

    /* Scoped TextEncoder instance */
    #encoder:TextEncoder = new TextEncoder();

    /* HMAC Key cache */
    #keyCache:LRU<string, CryptoKey> = new LRU({max_size: 50});

    constructor (ctx:TriFrostContext, config:Partial<TriFrostCookieOptions> = {}) {
        this.#ctx = ctx;
        this.#config = isObject(config) ? config : {};

        /* Process cookie header into map */
        const cookies = isString(ctx.headers.cookie) ? ctx.headers.cookie.split(';') : [];
        const map:Record<string, string> = {};
        for (let i = 0; i < cookies.length; i++) {
            const raw = cookies[i];
            /* We don't use split here as the following could be a valid cookie x=1=2=3 which would be {x: '1=2=3'} */
            const idx = raw.indexOf('=');
            if (idx <= 0) continue;
            const n_key = raw.slice(0, idx).trim();
            const val = raw.slice(idx + 1);
            const n_val = val.length ? decodeURIComponent(val).trim() : null;
            if (n_key && n_val) map[n_key] = n_val;
        }
        this.#incoming = map;
        this.#combined = {...this.#incoming};
    }

    get outgoing ():string[] {
        return Object.values(this.#outgoing);
    }

    /**
     * Returns all cookies. Both the ones provided by the client as a KV-Map AND the cookies that are going to be passed to the client
     */
    all ():Readonly<Record<string, string>> {
        return {...this.#combined};
    }

    /**
     * Get a cookie value by name
     *
     * @param {string} name - Cookie name
     * @returns Cookie value or null if not found
     */
    get (name:string):string|null {
        return isString(name) && name in this.#combined
            ? this.#combined[name]
            : null;
    }

    /**
     * Set a cookie.
     *
     * Take Note:
     * - If both maxage and expires are passed we will ignore maxage and set both based on the expires bit
     * - If either maxage OR expires are passed we will set the other based on the passed value (maxage -> expires, expires -> maxage)
     * - We will always set secure UNLESS explicitly turned off
     * - We will always set secure if SameSite=None regardless of passed configuration
     *
     * @param {string} name - The cookie name.
     * @param {string|number} value - The cookie value.
     * @param {TriFrostCookieOptions} options - Cookie options (e.g., max-age, path, etc.).
     */
    set (name: string, value: string|number, options: Partial<TriFrostCookieOptions> = {}):void {
        const normalized = Number.isFinite(value) ? String(value) : value;
        const config = {
            ...this.#config,
            ...isObject(options) && options,
        };

        /* Validate */
        if (
            !isString(name) ||
            !isString(normalized) ||
            !RGX_NAME.test(name) ||
            !RGX_VALUE.test(normalized)
        ) return this.#ctx.logger.error('TriFrostCookies@set: Invalid name or value', {name, value, options});

        /* Start cookie construction */
        let new_cookie = name + '=' + encodeURIComponent(normalized);

        const maxage = isInt(config.maxage) ? config.maxage : null;
        const expires = isDate(config.expires) ? config.expires : null;

        /* Max Age */
        if (expires === null && maxage !== null) {
            /* Set expires based on max-age if not provided */
            new_cookie += '; Expires=' + addUTC(new Date(), maxage, 'seconds').toUTCString() + '; Max-Age=' + maxage;
        }

        /* Expires */
        if (expires !== null) {
            new_cookie += '; Expires=' + expires.toUTCString();
            /* Set maxage based on expires if not provided */
            if (maxage === null) new_cookie += '; Max-Age=' + Math.ceil(diff(expires, new Date(), 'seconds'));
        }

        /* Path */
        if (isString(config.path)) new_cookie += '; Path=' + config.path;

        /* Domain */
        if (isString(config.domain)) new_cookie += '; Domain=' + config.domain;

        /* Secure */
        if (config.secure !== false) new_cookie += '; Secure';

        /* HttpOnly */
        if (config.httponly === true) new_cookie += '; HttpOnly';

        /* SameSite */
        if (isString(config.samesite)) {
            new_cookie += '; SameSite=' + config.samesite;

            /* If samesite 'None', ensure ALWAYS secure */
            if (config.samesite === 'None' && config.secure === false) {
                this.#ctx.logger.warn('TriFrostCookies@set: SameSite=None requires Secure=true; overriding to ensure security');
                new_cookie += '; Secure';
            }
        }

        /* Push into new cookies */
        this.#outgoing[name] = new_cookie;

        /* Set on combined */
        this.#combined[name] = normalized;
    }

    /**
     * Sign a value with an HMAC signature
     * 
     * @param {string|number} val - Value to sign
     * @param {string} secret - Signing secret
     * @param {SigningOptions} options - Options for signing (defaults to {algorithm: 'SHA-256'})
     */
    async sign (val:string|number, secret: string, options:SigningOptions = {algorithm: 'SHA-256'}): Promise<string> {
        if (
            !isNeString(secret) || 
            (!isString(val) && !isNum(val))
        ) return '';
        
        const sig = await this.generateHMAC(String(val), secret, options);
        return val + '.' + sig;
    }

    /**
     * Verifies a signed cookie has not been tampered with, returns the value if untampered
     * 
     * @param {string} signed - Signed cookie value
     * @param {string|(string|(SigningOptions & {val:string}))[]} secrets - Secret or Secrets to check
     * @param {SigningOptions} options - Options for verifying (defaults to {algorithm: 'SHA-256'})
     */
    async verify (
        signed:string,
        secrets:string|(string|(SigningOptions & {val:string}))[],
        options:SigningOptions = {algorithm: 'SHA-256'}
    ) {
        const idx = isNeString(signed) ? signed.lastIndexOf('.') : -1;
        if (idx === -1) return null;
    
        const val = signed.slice(0, idx);
        const sig = signed.slice(idx + 1);
    
        for (const secret of Array.isArray(secrets) ? secrets : [secrets]) {
            if (isNeString(secret)) {
                const expected_sig = await this.generateHMAC(val, secret, options);
                if (expected_sig === sig) return val;
            } else if (isNeString(secret?.val)) {
                const expected_sig = await this.generateHMAC(
                    val,
                    secret.val,
                    isNeString(secret?.algorithm) ? {algorithm: secret.algorithm} : options
                );
                if (expected_sig === sig) return val;
            }
        }
    
        this.#ctx.logger.warn('TriFrostCookies@verify: Signature mismatch');
        return null;
    }

    /**
     * Delete a cookie by name. Take note that the path/domain for a cookie need to be correct for it to be deleted
     *
     * @param {string|{prefix:string}} val - Name of the cookie to delete or the prefix of the cookies to delete
     * @param {Partial<TriFrostCookieDeleteOptions>} options - Cookie Delete options (path, domain)
     */
    del (val:string|{prefix:string}, options:Partial<TriFrostCookieDeleteOptions> = {}) {
        if (isNeString(val)) {
            return this.internalDel(val, {...options, maxage: 0});
        } else if (isNeString(val?.prefix)) {
            const normalized_options = {...options, maxage: 0};
            /* 1. Remove any newly-set cookies */
            for (const key in this.#outgoing) {
                if (!(key in this.#incoming) && key.startsWith(val.prefix)) {
                    delete this.#outgoing[key];
                    delete this.#combined[key];
                }
            }
            
            /* 2. Expire any client-passed cookies */
            for (const key in this.#incoming) {
                if (key.startsWith(val.prefix)) this.internalDel(key, normalized_options);
            }
        }
    }

    /**
     * Delete all cookies (both outgoing AND ones that were passed by the client)
     *
     * @param {Partial<TriFrostCookieDeleteOptions>} options - Cookie Delete options (path, domain)
     */
    delAll (options:Partial<TriFrostCookieDeleteOptions> = {}):void {
        const normalized_options = {...options, maxage: 0};
        /* 1. Remove any newly-set cookies */
        for (const key in this.#outgoing) {
            delete this.#outgoing[key];
            delete this.#combined[key];
        }
        
        /* 2. Expire any client-passed cookies */
        for (const key in this.#incoming) {
            this.internalDel(key, normalized_options);
        }
    }

/**
 * MARK: Private
 */

    private internalDel (name:string, options:Partial<TriFrostCookieDeleteOptions & {maxage: number}> = {}) {
        if (name in this.#outgoing) delete this.#outgoing[name];
        if (name in this.#incoming) this.set(name, '', options);
        if (name in this.#combined) delete this.#combined[name];
    }

    /**
     * Generates HMAC for a specific value and a secret
     * @param {string|number} data - Value to generate HMAC for
     * @param {string} secret - Signing secret
     * @param {SigningOptions} options - HMAC Options
     * @returns 
     */
    private async generateHMAC (data:string, secret:string, options:SigningOptions) {
        const algo = options?.algorithm in HMACAlgos ? options.algorithm : 'SHA-256';
        const cacheKey = algo + ':' + secret;

        /* Because key imports are relatively expensive we place them in a private LRU */
        let key = this.#keyCache.get(cacheKey);
        if (!key) {
            key = await crypto.subtle.importKey(
                'raw',
                this.#encoder.encode(secret),
                {name: 'HMAC', hash: {name: algo}},
                false,
                ['sign']
            );
            this.#keyCache.set(cacheKey, key);
        }
    
        const sig_buf = await crypto.subtle.sign('HMAC', key, this.#encoder.encode(String(data)));
        const sig_arr = new Uint8Array(sig_buf);
        let hex = '';
        for (let i = 0; i < sig_arr.length; i++) hex += sig_arr[i].toString(16).padStart(2, '0');
        return hex;
    }

}
