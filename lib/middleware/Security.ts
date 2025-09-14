import {isNeArray} from '@valkyriestudios/utils/array';
import {isBoolean} from '@valkyriestudios/utils/boolean';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isObject} from '@valkyriestudios/utils/object';
import {isNeString} from '@valkyriestudios/utils/string';
import {Sym_TriFrostDescription, Sym_TriFrostFingerPrint, Sym_TriFrostName} from '../types/constants';
import {type TriFrostContext} from '../types/context';
import {hexId} from '../utils/Generic';

const RGX_NONCE = /'nonce'/g;

/* Specific symbol attached to security mware to identify them by */
export const Sym_TriFrostMiddlewareSecurity = Symbol('TriFrost.Middleware.Security');

export enum ContentSecurityPolicy {
    DefaultSrc = 'default-src',
    ScriptSrc = 'script-src',
    StyleSrc = 'style-src',
    ImgSrc = 'img-src',
    ConnectSrc = 'connect-src',
    FontSrc = 'font-src',
    ObjectSrc = 'object-src',
    MediaSrc = 'media-src',
    FrameSrc = 'frame-src',
    BaseUri = 'base-uri',
    FormAction = 'form-action',
    FrameAncestors = 'frame-ancestors',
    PluginTypes = 'plugin-types',
    ReportUri = 'report-uri',
}

export interface TriFrostContentSecurityPolicyOptions {
    /**
     * Defines valid sources for loading content such as JavaScript, Images, CSS, etc.
     */
    [ContentSecurityPolicy.DefaultSrc]?: string | string[];
    /**
     * Defines valid sources for loading JavaScript.
     */
    [ContentSecurityPolicy.ScriptSrc]?: string | string[];
    /**
     * Defines valid sources for loading stylesheets.
     */
    [ContentSecurityPolicy.StyleSrc]?: string | string[];
    /**
     * Defines valid sources for loading images.
     */
    [ContentSecurityPolicy.ImgSrc]?: string | string[];
    /**
     * Defines valid sources for loading XMLHttpRequest.
     */
    [ContentSecurityPolicy.ConnectSrc]?: string | string[];
    /**
     * Defines valid sources for loading fonts.
     */
    [ContentSecurityPolicy.FontSrc]?: string | string[];
    /**
     * Defines valid sources for loading plugins.
     */
    [ContentSecurityPolicy.ObjectSrc]?: string | string[];
    /**
     * Defines valid sources for loading media files.
     */
    [ContentSecurityPolicy.MediaSrc]?: string | string[];
    /**
     * Defines valid sources for loading frames.
     */
    [ContentSecurityPolicy.FrameSrc]?: string | string[];
    /**
     * Restricts the document's base URL for the purposes of resolving relative URLs.
     */
    [ContentSecurityPolicy.BaseUri]?: string;
    /**
     * Defines valid endpoints for sending data from a form.
     */
    [ContentSecurityPolicy.FormAction]?: string | string[];
    /**
     * Defines valid sources for embedding the resource using <frame>, <iframe>, <object>, <embed>, or <applet>.
     */
    [ContentSecurityPolicy.FrameAncestors]?: string | string[];
    /**
     * Defines valid plugin MIME types.
     */
    [ContentSecurityPolicy.PluginTypes]?: string | string[];
    /**
     * Specifies the URL to which the user agent sends reports about policy violation.
     */
    [ContentSecurityPolicy.ReportUri]?: string | string[];
}

export enum CrossOriginEmbedderPolicy {
    UnsafeNone = 'unsafe-none',
    RequireCorp = 'require-corp',
    Credentialless = 'credentialless',
}

export enum CrossOriginOpenerPolicy {
    UnsafeNone = 'unsafe-none',
    SameOriginAllowPopups = 'same-origin-allow-popups',
    SameOrigin = 'same-origin',
}

export enum CrossOriginResourcePolicy {
    SameSite = 'same-site',
    SameOrigin = 'same-origin',
    CrossOrigin = 'cross-origin',
}

export enum ReferrerPolicy {
    NoReferrer = 'no-referrer',
    NoReferrerWhenDowngrade = 'no-referrer-when-downgrade',
    Origin = 'origin',
    OriginWhenCrossOrigin = 'origin-when-cross-origin',
    SameOrigin = 'same-origin',
    StrictOrigin = 'strict-origin',
    StrictOriginWhenCrossOrigin = 'strict-origin-when-cross-origin',
    UnsafeUrl = 'unsafe-url',
}

export enum XContentTypes {
    NoSniff = 'nosniff',
}

export enum XDnsPrefetchControl {
    On = 'on',
    Off = 'off',
}

export enum XDownloadOptions {
    NoOpen = 'noopen',
}

export enum XFrameOptions {
    Deny = 'DENY',
    SameOrigin = 'SAMEORIGIN',
}

export interface TriFrostSecurityOptions {
    /**
     * Content-Security-Policy configuration, defaults to null
     */
    contentSecurityPolicy?: TriFrostContentSecurityPolicyOptions | null;
    /**
     * Cross-Origin-Embedder-Policy configuration, defaults to null
     */
    crossOriginEmbedderPolicy?: `${CrossOriginEmbedderPolicy}` | null;
    /**
     * Cross-Origin-Opener-Policy configuration, defaults to 'same-origin'
     */
    crossOriginOpenerPolicy?: `${CrossOriginOpenerPolicy}` | null;
    /**
     * Cross-Origin-Resource-Policy configuration, defaults to 'same-origin'
     */
    crossOriginResourcePolicy?: `${CrossOriginResourcePolicy}` | null;
    /**
     * Origin-Agent-Cluster configuration, defaults to true
     */
    originAgentCluster?: boolean | null;
    /**
     * Referrer-Policy configuration, defaults to 'no-referrer'
     */
    referrerPolicy?: `${ReferrerPolicy}` | `${ReferrerPolicy}`[] | null;
    /**
     * Strict-Transport-Security configuration, defaults to {maxAge: 15552000, includeSubDomains: true}
     * @note When setting preload to true the maxAge must be at least 31536000 and includeSubDomains must be set.
     */
    strictTransportSecurity?: {maxAge: number; includeSubDomains?: boolean; preload?: boolean} | null;
    /**
     * X-Content-Type-Options configuration, defaults to 'nosniff'
     */
    xContentTypeOptions?: `${XContentTypes}` | null;
    /**
     * X-DNS-Prefetch-Control configuration, defaults to 'off'
     */
    xDnsPrefetchControl?: `${XDnsPrefetchControl}` | null;
    /**
     * X-Download-Options header configuration, defaults to 'noopen'
     */
    xDownloadOptions?: `${XDownloadOptions}` | null;
    /**
     * X-Frame-Options header configuration, defaults to 'sameorigin'
     */
    xFrameOptions?: `${XFrameOptions}` | null;
    /**
     * X-XSS-Protection header configuration, defaults to false, set to string to configure report uri
     */
    xXssProtection?: '0' | '1' | 'block' | string | null;
}

export type TriFrostSecurityConfig = {
    /**
     * (Default=true) Merge with the defaults (true) or not (false)
     */
    use_defaults?: boolean;
};

/**
 * Pre-baked CSP key lookup map
 */
const CSP_DIRECTIVES = new Set(Object.values(ContentSecurityPolicy));

/**
 * Pre-baked Referrer Policy lookup map
 */
const REFERRERPOLICIES = new Set(Object.values(ReferrerPolicy));

/**
 * Configures the provided security header
 *
 * @param {Record<string, string>} map - Map to store the header on
 * @param {string} key - Header to configure
 * @param {string|null} val - Header value to set
 * @param {string[]} options - Array of possible options the value needs to fall into
 * @param {string} name - Name of the option
 */
function header(map: Record<string, string>, key: string, val: string | null, options: string[], name: string) {
    /* If val is null it means we don't want to set the header */
    if (val === undefined || val === null) return;

    /* Validation check */
    if (!isNeString(val) || !isNeArray(options) || options.indexOf(val) < 0)
        throw new Error(`TriFrostMiddleware@Security: Invalid configuration for ${name}`);

    map[key] = val;
}

/**
 * Content-Security-Policy header, this header is used to allow website administrators to control resources
 * the user agent is allowed to load for a given page.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 *
 * @param {Record<string, string>} map - Map to store the header on
 * @param {TriFrostSecurityOptions['contentSecurityPolicy']} val - Value to set
 */
function contentSecurityPolicy(map: Record<string, string>, val: TriFrostSecurityOptions['contentSecurityPolicy']) {
    if (!isObject(val)) return;

    /* Loop through each key in the csp object being passed */
    const parts: string[] = [];
    for (const key in val) {
        if (!CSP_DIRECTIVES.has(key as ContentSecurityPolicy)) {
            throw new Error(`TriFrostMiddleware@Security: Invalid directive "${key}" in contentSecurityPolicy`);
        }

        const chunk = val[key as ContentSecurityPolicy];
        let finalized_chunk: string;

        /**
         * Special case for the base-uri directive as only one value is allowed
         * Otherwise values can come in form of singular string "'self'" or string array ["'self'", "example.com"]
         */
        if (key === ContentSecurityPolicy.BaseUri) {
            if (!isNeString(chunk)) throw new Error('TriFrostMiddleware@Security: Invalid value for directive "base-uri"');
            finalized_chunk = chunk.trim();
        } else if (isNeString(chunk)) {
            finalized_chunk = chunk.trim();
        } else if (isNeArray(chunk)) {
            const normalized = [];
            const seen = new Set();
            for (let i = 0; i < chunk.length; i++) {
                let el = chunk[i];
                if (!isNeString(el))
                    throw new Error(`TriFrostMiddleware@Security: Invalid value for directive "${key}" in contentSecurityPolicy`);

                el = el.trim();
                if (seen.has(el)) continue;
                normalized.push(el);
                seen.add(el);
            }
            finalized_chunk = normalized.join(' ');
        } else {
            throw new Error(`TriFrostMiddleware@Security: Invalid value for directive "${key}"`);
        }

        if (isNeString(finalized_chunk)) parts.push(`${key} ${finalized_chunk.trim()}`);
    }

    if (parts.length) map['content-security-policy'] = parts.join('; ');
}

/**
 * Origin-Agent-Cluster header, this header is used to request that the associated Document should
 * be placed in an origin-keyed agent cluster.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin-Agent-Cluster
 *
 * @param {Record<string, string>} map - Map to store the header on
 * @param {TriFrostSecurityOptions['originAgentCluster']} val - Value to set
 */
function originAgentCluster(map: Record<string, string>, val: TriFrostSecurityOptions['originAgentCluster']) {
    switch (val) {
        case true:
            return (map['origin-agent-cluster'] = '?1');
        case false:
            return (map['origin-agent-cluster'] = '?0');
        case null:
        case undefined:
            return;
        default:
            throw new Error('TriFrostMiddleware@Security: Invalid configuration for originAgentCluster');
    }
}

/**
 * Referrer-Policy header, this header controls how much referrer information should be included with requests
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
 *
 * @param {Record<string, string>} map - Map to store the header on
 * @param {TriFrostSecurityOptions['referrerPolicy']} val - Value to set
 */
function referrerPolicy(map: Record<string, string>, val: TriFrostSecurityOptions['referrerPolicy']) {
    if (val === undefined || val === null) return;

    const input = Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];
    if (!input.length) throw new Error('TriFrostMiddleware@Security: Invalid configuration for referrerPolicy');

    const seen = new Set();
    const normalized = [];
    for (let i = 0; i < input.length; i++) {
        let el: string = input[i];
        if (typeof el !== 'string') {
            throw new Error('TriFrostMiddleware@Security: Invalid configuration for referrerPolicy');
        }

        el = el.trim();
        if (!REFERRERPOLICIES.has(el as ReferrerPolicy)) {
            throw new Error('TriFrostMiddleware@Security: Invalid configuration for referrerPolicy');
        }

        if (seen.has(el)) continue;
        normalized.push(el);
        seen.add(el);
    }

    map['referrer-policy'] = normalized.join(', ');
}

/**
 * Strict-Transport-Security header, this header informs browsers that the site should only be accessed using HTTPS,
 * and that any future attempts to access it using HTTP should automatically be converted to HTTPS.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
 *
 * @param {Record<string, string>} map - Map to store the header on
 * @param {TriFrostSecurityOptions['strictTransportSecurity']} val - Value to set
 */
function strictTransportSecurity(map: Record<string, string>, val: TriFrostSecurityOptions['strictTransportSecurity']) {
    if (val === undefined || val === null) return;

    if (isIntGt(val?.maxAge, 0)) {
        const parts = [`max-age=${val.maxAge}`];

        /* includeSubDomains */
        if (val.includeSubDomains === true) parts.push('includeSubDomains');

        /* preload (only allowed if max age is above 31536000 and subdomains is set) */
        if (parts.length === 2 && val.preload === true && isIntGt(val.maxAge, 31536000)) parts.push('preload');

        /* Only set header if we have parts */
        return (map['strict-transport-security'] = parts.join('; '));
    }

    throw new Error('TriFrostMiddleware@Security: Invalid configuration for strictTransportSecurity');
}

/**
 * Configures X-XSS-Protection header, by default set to false
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
 *
 * @param {Record<string, string>} map - Map to store the header on
 * @param {TriFrostSecurityOptions['xXssProtection']} val - Value to set
 */
function xXssProtection(map: Record<string, string>, val: TriFrostSecurityOptions['xXssProtection']) {
    if (val === undefined || val === null) return;

    if (val === '0') {
        return (map['x-xss-protection'] = '0');
    } else if (val === '1') {
        return (map['x-xss-protection'] = '1');
    } else if (val === 'block') {
        return (map['x-xss-protection'] = '1; mode=block');
    } else if (typeof val === 'string') {
        const n_val = val.trim();
        if (n_val.startsWith('/')) return (map['x-xss-protection'] = '1; report=' + n_val);
    }

    throw new Error('TriFrostMiddleware@Security: Invalid configuration for xXssProtection');
}

/**
 * Security defaults
 */
const SecurityDefaults: TriFrostSecurityOptions = {
    contentSecurityPolicy: null,
    crossOriginEmbedderPolicy: null,
    crossOriginOpenerPolicy: CrossOriginOpenerPolicy.SameOrigin,
    crossOriginResourcePolicy: CrossOriginResourcePolicy.SameSite,
    originAgentCluster: true,
    referrerPolicy: ReferrerPolicy.NoReferrer,
    strictTransportSecurity: {maxAge: 15552000, includeSubDomains: true},
    xContentTypeOptions: XContentTypes.NoSniff,
    xDnsPrefetchControl: XDnsPrefetchControl.Off,
    xDownloadOptions: XDownloadOptions.NoOpen,
    xFrameOptions: XFrameOptions.SameOrigin,
    xXssProtection: '0',
};

/**
 * Middleware that returns a handler which configures security headers on a context
 *
 * @param {TriFrostSecurityOptions} options - Options to apply
 * @param {TriFrostSecurityConfig} config - Additional behavioral config
 */
export function Security<Env extends Record<string, any> = {}, State extends Record<string, unknown> = {}>(
    options: TriFrostSecurityOptions = {},
    config?: TriFrostSecurityConfig,
) {
    const use_defaults = !isBoolean(config?.use_defaults) ? true : config.use_defaults;
    const cfg: TriFrostSecurityOptions =
        use_defaults === true ? {...SecurityDefaults, ...(isObject(options) && options)} : isObject(options) ? options : {};

    /* Generate configuration */
    const map: Record<string, string> = {};

    /* Content-Security-Policy */
    contentSecurityPolicy(map, cfg.contentSecurityPolicy);

    /**
     * Cross-Origin Headers
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy
     */
    header(
        map,
        'cross-origin-embedder-policy',
        cfg.crossOriginEmbedderPolicy!,
        Object.values(CrossOriginEmbedderPolicy),
        'crossOriginEmbedderPolicy',
    );
    header(
        map,
        'cross-origin-opener-policy',
        cfg.crossOriginOpenerPolicy!,
        Object.values(CrossOriginOpenerPolicy),
        'crossOriginOpenerPolicy',
    );
    header(
        map,
        'cross-origin-resource-policy',
        cfg.crossOriginResourcePolicy!,
        Object.values(CrossOriginResourcePolicy),
        'crossOriginResourcePolicy',
    );

    /* Origin-Agent-Cluster */
    originAgentCluster(map, cfg.originAgentCluster);

    /* Referrer-Policy */
    referrerPolicy(map, cfg.referrerPolicy);

    /* Strict-Transport-Security */
    strictTransportSecurity(map, cfg.strictTransportSecurity);

    /**
     * X-Content-Type-Options
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
     */
    header(map, 'x-content-type-options', cfg.xContentTypeOptions!, Object.values(XContentTypes), 'xContentTypeOptions');

    /**
     * X-DNS-Prefetch-Control
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
     */
    header(map, 'x-dns-prefetch-control', cfg.xDnsPrefetchControl!, Object.values(XDnsPrefetchControl), 'xDnsPrefetchControl');

    /**
     * X-Download-Options
     * @see https://docs.microsoft.com/en-us/archive/blogs/ie/ie8-security-part-v-comprehensive-protection
     */
    header(map, 'x-download-options', cfg.xDownloadOptions!, Object.values(XDownloadOptions), 'xDownloadOptions');

    /**
     * X-Frame-Options
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
     */
    header(map, 'x-frame-options', cfg.xFrameOptions!, Object.values(XFrameOptions), 'xFrameOptions');

    /* X-XSS-Protection */
    xXssProtection(map, cfg.xXssProtection);

    /* Baseline Middleware function */
    const mware = function TriFrostSecurityMiddleware(ctx: TriFrostContext<Env, State>): void {
        ctx.setHeaders(map);

        /* Replace nonce placeholder with a generated nonce */
        if ('content-security-policy' in map) {
            const val = map['content-security-policy'];
            if (RGX_NONCE.test(val)) {
                const nonce = btoa(hexId(8));
                ctx.setHeader('content-security-policy', val.replace(RGX_NONCE, "'nonce-" + nonce + "'"));
                ctx.setState({nonce});
            }
        }
    };

    /* Add symbols for introspection/use further down the line */
    Reflect.set(mware, Sym_TriFrostName, 'TriFrostSecurity');
    Reflect.set(mware, Sym_TriFrostDescription, 'Middleware for configuring Security headers and CSP on contexts passing through it');
    Reflect.set(mware, Sym_TriFrostFingerPrint, Sym_TriFrostMiddlewareSecurity);

    return mware;
}
