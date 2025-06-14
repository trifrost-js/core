/* eslint-disable @typescript-eslint/no-empty-object-type */

import {type TriFrostCache} from './modules/Cache';
import {Cookies} from './modules/Cookies';
import {type JSXElement} from './modules/JSX';
import {rootRender} from './modules/JSX/render';
import {
    type TriFrostLogger,
    type TriFrostRootLogger,
} from './modules/Logger';
import {
    ParseAndApplyCacheControl,
} from './middleware/CacheControl';
import {
    ExtensionToMimeType,
    type HttpMethod,
    type HttpStatusCode,
    HttpCodeToStatus,
    HttpRedirectStatusesToCode,
    type MimeType,
    MimeTypes,
    MimeTypesSet,
    HttpMethods,
} from './types/constants';
import {
    type TriFrostRouteMatch,
} from './types/routing';
import {
    type TriFrostContextFileOptions,
    type TriFrostContextRedirectOptions,
    type TriFrostContextResponseOptions,
    type TriFrostContext,
    type TriFrostContextConfig,
    type TriFrostContextKind,
} from './types/context';
import {encodeFilename} from './utils/Http';
import {hexId} from './utils/Generic';
import {TriFrostBodyParserOptions, type ParsedBody} from './utils/BodyParser/types';

type RequestConfig = {
    method: HttpMethod,
    path: string;
    headers: Record<string,string>;
    query: string;
};

const RGX_IP = /^(?:\d{1,3}\.){3}\d{1,3}$|^(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}$/;
const RGX_URL = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;

/**
 * Used to get ip from headers under a trusted proxy, take note that this array will
 * be re-ordered automatically.
 */
export const IP_HEADER_CANDIDATES:string[] = [
    'x-client-ip',
    'x-forwarded-for',
    'cf-connecting-ip',
    'fastly-client-ip',
    'true-client-ip',
    'x-real-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
    'x-appengine-user-ip',
];

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

    /* TriFrost Nonce */
    #nonce:string|null = null;

    /* Kind of Context */
    #kind:TriFrostContextKind = 'std';

    /* Cache (see cache getter) */
    #cache:TriFrostCache|null = null;

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
    protected req_body:Readonly<ParsedBody>|null = null;

    /* Whether or not the context is initialized */
    protected is_initialized:boolean = false;

    /* Whether or not the context is done/finished and should not be written to anymore */
    protected is_done:boolean = false;

    /* Whether or not the context was aborted and should not be written to anymore */
    protected is_aborted:boolean = false;

    /* Response Headers */
    protected res_headers:Record<string, string> = {};

    /* Response Code (for usage in runtimes working with numerical response codes) */
    protected res_code:HttpStatusCode = 200;

    /* Response Body */
    protected res_body:string|null = null;

    /* TriFrost Cookies. We compute this on an as-needed basis */
    protected $cookies:Cookies|null = null;

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
        let val = this.getIPFromHeaders();
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

    /**
     * Cache Instance
     */
    get cache ():TriFrostCache {
        if (!this.#cache) {
            /* eslint-disable-next-line dot-notation */
            this.#cache = this.ctx_config.cache?.['spawn'](this as TriFrostContext<Env>) as TriFrostCache;
        }
        return this.#cache;
    }

    /**
     * Cookies for context
     */
    get cookies ():Cookies {
        if (!this.$cookies) this.$cookies = new Cookies(this as TriFrostContext, this.ctx_config.cookies);
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
    get body ():Readonly<NonNullable<ParsedBody>> {
        return this.req_body || {};
    }

    /**
     * Security nonce
     */
    get nonce (): string {
        if (this.#nonce) return this.#nonce;

        /* Check state nonce */
        if (typeof (this.state as any)?.nonce === 'string') {
            this.#nonce = (this.state as any)?.nonce as string;
            return this.#nonce;
        }

        /* Fall back to using request id */
        this.#nonce = btoa(this.requestId);
        return this.#nonce;
    }

    /**
     * Internal State
     */
    get state () {
        return this.#state;
    }

    /**
     * Returns the response code for the context
     */
    get statusCode ():HttpStatusCode {
        return this.res_code;
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
        for (let i = 0; i < keys.length; i++) delete this.#state[keys[i]];
        return this as TriFrostContext<Env, Omit<State, K>>;
    }

/**
 * MARK: Timeouts
 */

    /**
     * Sets the timeout
     */
    setTimeout (val:number|null):void {
        if (Number.isInteger(val) && (val as number) > 0) {
            this.clearTimeout();
            this.#timeout = val;
            this.#timeout_id = setTimeout(() => {
                if (this.isLocked) return;
                this.#timeout_id = null;
                this.#logger.error('Request timed out');
                this.abort(408);
            }, val as number);
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
    setHeader (key:string, val:string|number):void {
        this.res_headers[String(key)] = String(val);
    }

    /**
     * Sets multiple headers at once as part of the response to be returned to the callee
     *
     * Example:
     *  ctx.setHeader('Content-Type', 'application/json');
     */
    setHeaders (obj: Record<string, string|number>):void {
        for (const key in obj) this.res_headers[String(key)] = String(obj[key]);
    }

    /**
     * Remove a header that was previously set as part of the response to be returned to the callee
     *
     * Example:
     *  ctx.delHeader('Content-Type');
     */
    delHeader (key:string):void {
        delete this.res_headers[String(key)];
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
    setStatus (status:HttpStatusCode):void {
        if (!(status in HttpCodeToStatus)) throw new Error('Context@setStatus: Invalid status code ' + status);

        /* Patch logger attributes to reflect status for observability */
        if (status !== this.res_code) {
            this.#logger.setAttributes({
                'http.status_code': status,
                'otel.status_code': status >= 500 ? 'ERROR' : 'OK',
            });
        }

        this.res_code = status as HttpStatusCode;
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
    async init (
        match:TriFrostRouteMatch<Env>,
        handler?:(config:TriFrostBodyParserOptions|null)=>Promise<ParsedBody|null>
    ) {
        try {
            /* No need to do anything if already initialized */
            if (this.is_initialized) return;

            /* Set is_initialized to true to ensure no further calls to init can happen */
            this.is_initialized = true;

            /* Set params as baseline state */
            this.#state = match.params as State;

            /* Set name */
            this.#name = match.route.name;

            /* Set kind */
            this.#kind = match.route.kind;

            /* If we have a method that allows writing to we need to load up the body from the request */
            switch (this.req_config.method) {
                case HttpMethods.POST:
                case HttpMethods.PATCH:
                case HttpMethods.PUT:
                case HttpMethods.DELETE: {
                    const body = await handler!(match.route.bodyParser);
                    if (body === null) {
                        this.setStatus(413);
                    } else {
                        this.req_body = body;
                    }
                    break;
                }
                default:
                    break;
            }
        } catch (err) {
            this.#logger.error(err);
            this.status(400);
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
     * @param {HttpStatusCode?} status - Status to abort with (defaults to 503)
     */
    abort (status?:HttpStatusCode):void {
        if (this.is_aborted) return;

        this.#logger.debug('Context@abort: Aborting request');

        /* Set aborted to ensure nobody else writes data */
        this.is_aborted = true;

        /* Set status, fallback to service-unavailable if not provided */
        this.setStatus(status || 503);

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
    async file (path:string, opts?:TriFrostContextFileOptions):Promise<void> {
        try {
            if (typeof path !== 'string') throw new Error('Context@file: Invalid Payload');

            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@file: Cannot modify a finalized response');

            /* Cache Control */
            if (opts?.cacheControl) ParseAndApplyCacheControl(this as TriFrostContext, opts.cacheControl);

            /* Get a streamable */
            const streamer = await this.getStream(path);
            if (!streamer) return this.status(404);

            /* Try determining the mime type from the path if no mime type was set already */
            if (!this.res_headers['Content-Type']) {
                const mime = ExtensionToMimeType.get(path.split('.').pop() as string);
                if (mime) this.res_headers['Content-Type'] = mime;
            }

            /* Set Content-Disposition header depending on download option */
            if (opts?.download === true) {
                this.res_headers['Content-Disposition'] = 'attachment';
            } else if (typeof opts?.download === 'string') {
                const {encoded, ascii} = encodeFilename(opts.download);
                /* Take Note, as per RFC 6266 we make use of filename* with UTF-8 */
                this.res_headers['Content-Disposition'] = ascii.length
                    ? 'attachment; filename="' + ascii + '"; filename*=UTF-8\'\'' + encoded
                    : 'attachment; filename*=UTF-8\'\'' + encoded;
            }

            /* Pass the stream to the runtime-specific stream method */
            this.stream(streamer.stream, streamer.size);
        } catch (err) {
            this.#logger.error(err, {file: path, opts});
        }
    }

    /**
     * Respond with HTML
     */
    html (body:string|JSXElement = '', opts?:TriFrostContextResponseOptions):void {
        try {
            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@html: Cannot modify a finalized response');

            /* Cache Control */
            if (opts?.cacheControl) ParseAndApplyCacheControl(this, opts.cacheControl);

            /* Set mime type if no mime type was set already */
            if (!this.res_headers['Content-Type']) this.res_headers['Content-Type'] = MimeTypes.HTML;

            /* Render html */
            let html = typeof body === 'string' ? body : rootRender<Env, State>(this, body);

            /* Auto-prepend <!DOCTYPE html> if starts with <html */
            html = html.trimStart();
            if (html.startsWith('<html')) html = '<!DOCTYPE html>' + html;

            this.res_body = html;

            /* Set status if provided */
            this.setStatus(opts?.status || this.res_code);

            this.end();
        } catch (err) {
            this.#logger.error(err, {body, opts});
        }
    }

    /**
     * Respond with JSON
     */
    json (body:Record<string, unknown>|unknown[] = {}, opts?:TriFrostContextResponseOptions):void {
        try {
            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@json: Cannot modify a finalized response');

            /* Run sanity check on body payload */
            if (
                Object.prototype.toString.call(body) !== '[object Object]' &&
                !Array.isArray(body)
            ) throw new Error('Context@json: Invalid Payload');

            /* Cache Control */
            if (opts?.cacheControl) ParseAndApplyCacheControl(this, opts.cacheControl);

            /* Set mime type if no mime type was set already */
            if (!this.res_headers['Content-Type']) this.res_headers['Content-Type'] = MimeTypes.JSON;

            this.res_body = JSON.stringify(body);

            /* Set status if provided */
            this.setStatus(opts?.status || this.res_code);

            this.end();
        } catch (err) {
            this.#logger.error(err, {body, opts});
        }
    }

    /**
     * Respond with a status and no body
     */
    status (status:HttpStatusCode):void {
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
    text (body:string, opts?:TriFrostContextResponseOptions):void {
        try {
            if (typeof body !== 'string') throw new Error('Context@text: Invalid Payload');

            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@text: Cannot modify a finalized response');

            /* Cache Control */
            if (opts?.cacheControl) ParseAndApplyCacheControl(this, opts.cacheControl);

            /* Set mime type if no mime type was set already */
            if (!this.res_headers['Content-Type']) this.res_headers['Content-Type'] = MimeTypes.TEXT;

            this.res_body = body;

            /* Set status if provided */
            this.setStatus(opts?.status || this.res_code);

            this.end();
        } catch (err) {
            this.#logger.error(err, {body, opts});
        }
    }

    /**
     * Respond by redirecting
     *
     * @note Default status is 307 Temporary Redirect
     * @note Default keep_query is true
     */
    redirect (to:string, opts?:TriFrostContextRedirectOptions):void {
        try {
            if (
                typeof to !== 'string' ||
                (opts?.status && !(opts.status in HttpRedirectStatusesToCode))
            ) throw new Error('Context@redirect: Invalid Payload');

            /* Ensure we dont double write */
            if (this.isLocked) throw new Error('Context@redirect: Cannot modify a finalized response');

            let normalized_to = to;
            /* If the url is not fully qualified prepend the protocol and host */
            if (!RGX_URL.test(normalized_to)) {
                const host = this.host;
                if (typeof host !== 'string' || !host.length) throw new Error('Context@redirect: Not able to determine host for redirect');

                const normalized_host = host.startsWith('http://') ? 'https://' + host.slice(7) : host;
                normalized_to = normalized_host.trim() + normalized_to.trim();
            }

            /* If keep_query is passed as true and a query exists add it to normalized to */
            if (
                this.query.size && (
                    (!opts || !('keep_query' in opts)) ||
                    opts.keep_query === true
                )
            ) normalized_to += '?' + this.query;

            /* This is a redirect, as such a body should not be present */
            this.res_body = '';
            this.res_headers.Location = normalized_to;
            this.setStatus(opts?.status ?? 307);
            this.end();
        } catch (err) {
            this.#logger.error(err, {to, opts});
        }
    }

/**
 * MARK: Private
 */

    /**
     * If trustProxy is true tries to compute the IP from well-known headers
     */
    private getIPFromHeaders ():string|null {
        if (this.ctx_config.trustProxy !== true) return null;

        const headers = this.headers;
        for (let i = 0; i < IP_HEADER_CANDIDATES.length; i++) {
            const name = IP_HEADER_CANDIDATES[i];
            let val = headers[name];
            if (typeof val !== 'string') continue;

            val = val.trim();
            if (!val.length) continue;

            const candidate:string|null = name === 'x-forwarded-for'
                ? val.split(',', 1)[0]?.trim()
                : val;
            if (!candidate || !RGX_IP.test(candidate)) continue;

            /* Promote to front of the array for next call */
            if (i !== 0) {
                IP_HEADER_CANDIDATES.splice(i, 1);
                IP_HEADER_CANDIDATES.unshift(name);
            }
            return candidate;
        }

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
