/* eslint-disable complexity,@typescript-eslint/no-empty-object-type */

import {join} from '@valkyriestudios/utils/array';
import {noopresolve} from '@valkyriestudios/utils/function';
import {isIntGt} from '@valkyriestudios/utils/number';
import {isObject} from '@valkyriestudios/utils/object';
import {isNeString} from '@valkyriestudios/utils/string';
import {type TriFrostCache} from './modules/Cache';
import {TriFrostCookies} from './modules/Cookies';
import {
    render,
    type JSXElement,
} from './modules/JSX';
import {
    type TriFrostLogger,
    type TriFrostRootLogger,
} from './modules/Logger';
import {
    type TriFrostCacheControlOptions,
    ParseAndApplyCacheControl,
} from './middleware/CacheControl';
import {
    ExtensionToMimeType,
    type HttpMethod,
    type HttpStatus,
    type HttpStatusCode,
    HttpCodeToStatus,
    type HttpRedirectStatus,
    type HttpRedirectStatusCode,
    httpRedirectStatuses,
    HttpRedirectStatusesToCode,
    httpStatuses,
    HttpStatuses,
    HttpStatusToCode,
    type MimeType,
    MimeTypes,
    MimeTypesSet,
} from './types/constants';
import {
    type TriFrostContext,
    type TriFrostContextConfig,
    type TriFrostContextInit,
    type TriFrostContextKind,
    type TriFrostContextRedirectOptions,
} from './types/context';
import {hexId} from './utils/String';

type RequestConfig = {
    method: HttpMethod,
    path: string;
    headers: Record<string,string>;
    query: string;
};

const RGX_PROTO = /^((http:\/\/)|(https:\/\/))/;
const RGX_IP = /^(?:\d{1,3}\.){3}\d{1,3}$|^(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}$/;
const RGX_URL = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;

export abstract class Context <
    Env extends Record<string, any> = {},
    State extends Record<string, unknown> = {}
> implements TriFrostContext<Env, State> {

/**
 * MARK: Private
 */

    /* Computed IP Address, see ip getter */
    #ip:string|null|undefined = undefined;

    /* TriFrost State */
    #state!:State;

    /* TriFrost Name */
    #name:string = 'unknown';

    /* Kind of Context */
    #kind:TriFrostContextKind = 'std';

    /* TriFrost Route Query. We compute this on an as-needed basis */
    #query:URLSearchParams|null = null;

    /* TriFrost logger instance */
    #logger:TriFrostLogger;

    /* Timeout */
    #timeout:number|null = null;

    /* Timeout Id */
    #timeout_id:any|null = null;

    /* Hooks to be executed after the context has finished */
    #after: (() => Promise<void>)[] = [];

/**
 * MARK: Protected
 */

    /* TriFrost Context Config */
    protected ctx_config:Readonly<TriFrostContextConfig<Env>>;

    /* TriFrost Request */
    protected req_config:Readonly<RequestConfig>;

    /* TriFrost Request body */
    protected req_body:Readonly<Record<string, unknown>|unknown[]>|null = null;

    /* Whether or not the context is initialized */
    protected is_initialized:boolean = false;

    /* Whether or not the context is done/finished and should not be written to anymore */
    protected is_done:boolean = false;

    /* Whether or not the context was aborted and should not be written to anymore */
    protected is_aborted:boolean = false;

    /* Response Headers */
    protected res_headers:Record<string, string> = {};

    /* Response Status (for usage in runtimes working with full http status code) */
    protected res_status:HttpStatus = '200 OK';

    /* Response Code (for usage in runtimes working with numerical response codes) */
    protected res_code:HttpStatusCode = 200;

    /* Response Body */
    protected res_body:string|null = null;

    /* TriFrost Cookies. We compute this on an as-needed basis */
    protected $cookies:TriFrostCookies|null = null;

/**
 * MARK: Constructor
 */

    constructor (
        logger: TriFrostRootLogger,
        cfg:TriFrostContextConfig<Env>,
        req:RequestConfig
    ) {
        this.ctx_config = cfg;
        this.req_config = req;

        /* Determine request id for logger */
        let rid:string|null = null;
        const ridConfig = cfg.requestId;
        if (ridConfig) {
            for (let i = 0; i < ridConfig.inbound.length; i++) {
                const val = req.headers[ridConfig.inbound[i]];
                if (typeof val === 'string' && (!ridConfig.validate || ridConfig.validate(val))) {
                    rid = val;
                    break;
                }
            }
        }
        if (!rid) rid = hexId(16);

        /* Instantiate logger */
        this.#logger = logger.spawn({
            traceId: rid,
            env: cfg.env,
        });
    }

/**
 * MARK: Getters
 */

    /**
     * Whether or not the context was initialized
     */
    get isInitialized ():boolean {
        return this.is_initialized;
    }

    /**
     * Whether or not the response was finished
     */
    get isDone ():boolean {
        return this.is_done;
    }

    /**
     * Whether or not the request was aborted
     */
    get isAborted ():boolean {
        return this.is_aborted;
    }

    /**
     * Whether or not the request is in a locked state and can not be written to anymore
     */
    get isLocked ():boolean {
        return this.is_done || this.is_aborted;
    }

    /**
     * Returns the TriFrost environment
     */
    get env ():Readonly<Env> {
        return this.ctx_config.env;
    }

    /**
     * Returns the method for the context
     */
    get method ():HttpMethod {
        return this.req_config.method;
    }

    /**
     * Returns the name of the route the context is for (defaults to registration path)
     */
    get name ():string {
        return this.#name;
    }

    /**
     * Kind of context: This denotes the purpose of the context.
     * - 'notfound': This context is being run for a notfound catchall
     * - 'health': This context is being run on a route specifically meant for health checks
     * - 'std': General context, run everything :)
     * - 'options': Options run
     */
    get kind () {
        return this.#kind;
    }

    /**
     * Returns the path for the context
     */
    get path ():string {
        return this.req_config.path;
    }

    /**
     * Returns the host of the context.
     */
    get host ():string|null {
        return this.req_config.headers.host || this.ctx_config.host || null;
    }

    /**
     * Returns the ip address of the request for the context
     */
    get ip ():string|null {
        if (this.#ip !== undefined) return this.#ip;
        let val = this.#getIPFromHeaders();
        if (!val) {
            val = this.getIP();
            if (val && !RGX_IP.test(val)) val = null;
        }
        this.#ip = val;
        return val;
    }

    /**
     * Request ID
     */
    get requestId (): string {
        return this.#logger.traceId as string;
    }

    /**
     * Request Query parameters
     */
    get query ():Readonly<URLSearchParams> {
        if (!this.#query) this.#query = new URLSearchParams(this.req_config.query);
        return this.#query;
    }

    get cache ():TriFrostCache {
        this.ctx_config.cache.init(this.ctx_config.env);
        return this.ctx_config.cache as TriFrostCache;
    }

    /**
     * Cookies for context
     */
    get cookies ():TriFrostCookies {
        if (!this.$cookies) this.$cookies = new TriFrostCookies(this as TriFrostContext, this.ctx_config.cookies);
        return this.$cookies;
    }

    /**
     * Logger
     */
    get logger ():TriFrostLogger {
        return this.#logger;
    }

    /**
     * Request Headers
     */
    get headers ():Readonly<Record<string, string>> {
        return this.req_config.headers;
    }

    /**
     * Request Body
     */
    get body ():Readonly<Record<string, unknown>|unknown[]> {
        return this.req_body || {};
    }

    /**
     * Internal State
     */
    get state () {
        return this.#state;
    }

    /**
     * Returns the currently configured timeout value
     */
    get timeout ():number|null {
        return this.#timeout;
    }

    /**
     * Returns the currently registered after hooks
     */
    get afterHooks (): (() => Promise<void>)[] {
        return this.#after;
    }

/**
 * MARK: State Mgmt
 */

    /**
     * Expands the state and sets values
     */
    setState <Patch extends Record<string, unknown>> (patch: Patch) {
        this.#state = {...this.#state, ...patch};
        return this as TriFrostContext<Env, State & Patch>;
    }

    /**
     * Remove a set of keys from the state
     */
    delState <K extends keyof State> (keys: K[]) {
        /* Delete each key from the copy */
        for (const key of keys) delete this.#state[key];
        return this as TriFrostContext<Env, Omit<State, K>>;
    }

/**
 * MARK: Timeouts
 */

    /**
     * Sets the timeout
     */
    setTimeout (val:number|null):void {
        if (isIntGt(val, 0)) {
            this.clearTimeout();
            this.#timeout = val;
            this.#timeout_id = setTimeout(() => {
                if (this.isLocked) return;
                this.#timeout_id = null;
                this.#logger.error('Request timed out');
                this.abort(408);
            }, val);
        } else if (val === null) {
            this.clearTimeout();
        } else {
            this.#logger.error('Context@setTimeout: Expects a value above 0 or null', {val});
        }
    }

    /**
     * Clears the existing timeout
     */
    clearTimeout ():void {
        if (this.#timeout_id) clearTimeout(this.#timeout_id);
        this.#timeout = null;
        this.#timeout_id = null;
    }

/**
 * MARK: Headers
 */

    /**
     * Set a header as part of the response to be returned to the callee
     *
     * Example:
     *  ctx.setHeader('Content-Type', 'application/json');
     */
    setHeader (key:string, value:string):void {
        if (typeof key !== 'string' || typeof value !== 'string') return;
        this.res_headers[key] = value;
    }

    /**
     * Sets multiple headers at once as part of the response to be returned to the callee
     *
     * Example:
     *  ctx.setHeader('Content-Type', 'application/json');
     */
    setHeaders (obj: Record<string, string>):void {
        for (const key in obj) {
            const val = obj[key];
            if (typeof val === 'string') this.res_headers[key] = val;
        }
    }

    /**
     * Remove a header that was previously set as part of the response to be returned to the callee
     *
     * Example:
     *  ctx.delHeader('Content-Type');
     */
    delHeader (key:string):void {
        if (typeof key !== 'string' || !(key in this.res_headers)) return;
        delete this.res_headers[key];
    }

    /**
     * Alias for setHeader('Content-Type', ...) with built-in safety for internally known mime types
     *
     * Example:
     *  ctx.setType('text/html')
     */
    setType (val:MimeType):void {
        if (!MimeTypesSet.has(val)) return;
        this.res_headers['Content-Type'] = val;
    }

/**
 * MARK: Status
 */

    /**
     * Sets the response status code to a known HTTP status code
     */
    setStatus (status:HttpStatus|HttpStatusCode):void {
        if (status in HttpCodeToStatus) {
            this.res_code = status as HttpStatusCode;
            this.res_status = HttpCodeToStatus[status as HttpStatusCode];
        } else if (httpStatuses.has(status as HttpStatus)) {
            this.res_status = status as HttpStatus;
            this.res_code = HttpStatusToCode.get(status as HttpStatus)!;
        } else {
            throw new Error('Context@setStatus: Invalid status code ' + status);
        }

        /* Patch logger attributes to reflect status for observability */
        this.#logger.setAttributes({
            'http.status_code': this.res_code,
            'otel.status_code': this.res_code >= 500 ? 'ERROR' : 'OK',
        });
    }

/**
 * MARK: Body
 */

    /**
     * Sets the body of the response to be returned to the callee
     */
    setBody (value:string|null):void {
        if (typeof value === 'string') {
            this.res_body = value;
        } else if (value === null) {
            this.res_body = null;
        }
    }

/**
 * MARK: LifeCycle
 */

    /**
     * Initializes the request body and parses it into Json or FormData depending on its type
     */
    async init (val:TriFrostContextInit, handler:()=>Promise<Record<string, unknown>|unknown[]|undefined> = noopresolve) {
        try {
            /* No need to do anything if already initialized */
            if (this.is_initialized) return;

            /* Set is_initialized to true to ensure no further calls to init can happen */
            this.is_initialized = true;

            /* Set params as baseline state */
            this.#state = val.params as State;

            /* Set name */
            this.#name = val.name;

            /* Set kind */
            this.#kind = val.kind;

            /* If we have a method that allows writing to we need to load up the body from the request */
            switch (this.req_config.method) {
                case 'post':
                case 'patch':
                case 'put':
                case 'del': {
                    const body = await handler();
                    if (!body) throw new Error('Context@init: Failed to load body');
                    this.req_body = body as Record<string, unknown>|unknown[];
                    break;
                }
                default:
                    break;
            }
        } catch (err) {
            this.#logger.error(err);
            this.status(HttpStatuses.BadRequest);
        }
    }

    /**
     * Runs a fetch request and automatically appends the request id
     *
     * @param {RequestInfo} input
     * @param {RequestInit} init
     */
    async fetch (input: string | URL | globalThis.Request, init: RequestInit = {}): Promise<Response> {
        const url = typeof input === 'string' ? input : input.toString();
        const method = init?.method || 'GET';

        return this.#logger.span(`fetch ${method} ${url}`, async () => {
            /* Inject trace ID into headers */
            if (this.ctx_config.requestId?.outbound) {
                const headers = new Headers(init.headers || {});
                headers.set(this.ctx_config.requestId.outbound, this.requestId);
                init.headers = headers;
            }

            try {
                const res = await globalThis.fetch(input, init);

                this.#logger.setAttributes({
                    'http.method': method,
                    'http.url': url,
                    'http.status_code': res.status,
                    'otel.status_code': res.status >= 500 ? 'ERROR' : 'OK',
                    'span.kind': 'client',
                });

                return res;
            } catch (err) {
                this.#logger.setAttributes({
                    'http.method': method,
                    'http.url': url,
                    'otel.status_code': 'ERROR',
                });
                this.#logger.error(err);
                throw err;
            }
        });
    }

    /**
     * Abort the request
     *
     * @param {HttpStatus|HttpStatusCode?} status - Status to abort with (defaults to 503)
     */
    abort (status?:HttpStatus|HttpStatusCode):void {
        this.#logger.debug('Context@abort: Aborting request');

        /* Set aborted to ensure nobody else writes data */
        this.is_aborted = true;

        /* Set status, fallback to service-unavailable if not provided */
        this.setStatus(status || HttpStatuses.ServiceUnavailable);

        /* Clear timeout */
        this.clearTimeout();
    }

    /**
     * End the request and respond to callee
     */
    end ():void|Response {
        /* Set done to ensure nobody else writes data */
        this.is_done = true;

        /* Clear timeout */
        this.clearTimeout();
    }

    /**
     * Register an after hook
     */
    addAfter (fn: () => Promise<void>) {
        if (typeof fn !== 'function') return;
        this.#after.push(fn);
    }

/**
 * MARK: Response
 */

    /**
     * Respond with a file
     */
    async file (path:string, cache?:TriFrostCacheControlOptions):Promise<void> {
        try {
            if (typeof path !== 'string') throw new Error('Context@file: Invalid Payload');

            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@file: Cannot modify a finalized response');

            /* Cache Control */
            if (cache) ParseAndApplyCacheControl(this as TriFrostContext, cache);

            /* Get a streamable */
            const streamer = await this.getStream(path);
            if (!streamer) return this.status(HttpStatuses.NotFound);

            /* Try determining the mime type from the path */
            const mime = ExtensionToMimeType.get(path.split('.').pop() as string);
            if (mime) this.res_headers['Content-Type'] = mime;

            /* Pass the stream to the runtime-specific stream method */
            this.stream(streamer.stream, streamer.size);
        } catch (err) {
            this.#logger.error(err, {file: path});
        }
    }

    /**
     * Respond with HTML
     */
    html (body:string|JSXElement = '', status:HttpStatus|HttpStatusCode = HttpStatuses.OK, cache?:TriFrostCacheControlOptions):void {
        try {
            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@html: Cannot modify a finalized response');

            /* Cache Control */
            if (cache) ParseAndApplyCacheControl(this as TriFrostContext, cache);

            this.res_headers['Content-Type'] = MimeTypes.HTML;
            this.res_body = typeof body === 'string' ? body : render(body);
            this.setStatus(status);
            this.end();
        } catch (err) {
            this.#logger.error(err, {body, status});
        }
    }

    /**
     * Respond with JSON
     */
    json (
        body:Record<string, unknown>|unknown[] = {},
        status:HttpStatus|HttpStatusCode = HttpStatuses.OK, cache?:TriFrostCacheControlOptions
    ):void {
        try {
            if (!isObject(body) && !Array.isArray(body)) throw new Error('Context@json: Invalid Payload');

            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@json: Cannot modify a finalized response');

            /* Cache Control */
            if (cache) ParseAndApplyCacheControl(this as TriFrostContext, cache);

            this.res_headers['Content-Type'] = MimeTypes.JSON;
            this.res_body = JSON.stringify(body);
            this.setStatus(status);
            this.end();
        } catch (err) {
            this.#logger.error(err, {body, status});
        }
    }

    /**
     * Respond with a status and no body
     */
    status (status:HttpStatus|HttpStatusCode):void {
        try {
            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@status: Cannot modify a finalized response');

            this.setStatus(status);
            this.end();
        } catch (err) {
            this.#logger.error(err, {status});
        }
    }

    /**
     * Respond with plain text
     */
    text (body:string, status:HttpStatus|HttpStatusCode = HttpStatuses.OK, cache?:TriFrostCacheControlOptions):void {
        try {
            if (typeof body !== 'string') throw new Error('Context@text: Invalid Payload');

            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@text: Cannot modify a finalized response');

            /* Cache Control */
            if (cache) ParseAndApplyCacheControl(this as TriFrostContext, cache);

            this.res_headers['Content-Type'] = MimeTypes.TEXT;
            this.res_body = body;
            this.setStatus(status);
            this.end();
        } catch (err) {
            this.#logger.error(err, {body, status});
        }
    }

    /**
     * Respond by redirecting
     */
    redirect (
        to:string,
        status:HttpRedirectStatus|HttpRedirectStatusCode = HttpStatuses.TemporaryRedirect,
        opts:TriFrostContextRedirectOptions = {keep_query:true}
    ):void {
        try {
            if (
                typeof to !== 'string' ||
                (!(status in HttpRedirectStatusesToCode) && !httpRedirectStatuses.has(status as HttpRedirectStatus))
            ) throw new Error('Context@redirect: Invalid Payload');

            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@redirect: Cannot modify a finalized response');

            let normalized_to = to;
            /* If the url is not fully qualified prepend the protocol and host */
            if (!RGX_URL.test(normalized_to)) {
                const host = this.host;
                if (!isNeString(host)) throw new Error('Context@redirect: Not able to determine host for redirect');

                normalized_to = join([
                    !RGX_PROTO.test(host) ? 'https://' : false,
                    host,
                    normalized_to,
                ], {delim: ''});
            }

            /* If keep_query is passed as true and a query exists add it to normalized to */
            if (opts?.keep_query === true && this.query.size) normalized_to = `${normalized_to}?${this.query}`;

            /* This is a redirect, as such a body should not be present */
            this.res_body = '';
            this.res_headers.Location = normalized_to;
            this.setStatus(status);
            this.end();
        } catch (err) {
            this.#logger.error(err, {to, status, opts});
        }
    }

/**
 * MARK: Private
 */

    /**
     * If trustProxy is true tries to compute the IP from well-known headers
     */
    #getIPFromHeaders ():string|null {
        if (this.ctx_config.trustProxy !== true) return null;

        const {
            'x-client-ip': xClientIp,
            'x-forwarded-for': xForwardedFor,
            'cf-connecting-ip': cfConnectingIp,
            'fastly-client-ip': fastlyClientIp,
            'true-client-ip': trueClientIp,
            'x-real-ip': xRealIp,
            'x-cluster-client-ip': xClusterClientIp,
            'x-forwarded': xForwarded,
            'forwarded-for': forwardedFor,
            forwarded,
            'x-appengine-user-ip': appEngineIp,
        } = this.headers;

        if (xClientIp && RGX_IP.test(xClientIp)) return xClientIp;

        if (xForwardedFor && typeof xForwardedFor === 'string') {
            const ip = xForwardedFor.split(',', 1)[0]?.trim();
            if (ip && RGX_IP.test(ip)) return ip;
        }

        if (cfConnectingIp && RGX_IP.test(cfConnectingIp)) return cfConnectingIp;
        if (fastlyClientIp && RGX_IP.test(fastlyClientIp)) return fastlyClientIp;
        if (trueClientIp && RGX_IP.test(trueClientIp)) return trueClientIp;
        if (xRealIp && RGX_IP.test(xRealIp)) return xRealIp;
        if (xClusterClientIp && RGX_IP.test(xClusterClientIp)) return xClusterClientIp;
        if (xForwarded && RGX_IP.test(xForwarded)) return xForwarded;
        if (forwardedFor && RGX_IP.test(forwardedFor)) return forwardedFor;
        if (forwarded && RGX_IP.test(forwarded)) return forwarded;
        if (appEngineIp && RGX_IP.test(appEngineIp)) return appEngineIp;
        return null;
    }

/**
 * MARK: Abstract
 */

    /**
     * Retrieve a streamable
     */
    abstract getStream (path:string):Promise<{stream:unknown;size:number|null}|null>;

    /**
     * Stream a response from a streamlike value
     */
    abstract stream (stream:unknown, size:number|null):void;

    /**
     * Runs our after hooks
     */
    abstract runAfter ():void;

    /**
     * Abstract function to be implemented by Context classes which computes the IP address
     * for a request on that runtime
     */
    protected abstract getIP():string|null;

}
