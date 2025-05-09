/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {type TriFrostCacheControlOptions} from '../lib/middleware/CacheControl';
import {type TriFrostRateLimitLimitFunction} from '../lib/modules/RateLimit';
import {
    type HttpMethod,
    type HttpStatus,
    type HttpStatusCode,
    type MimeType,
} from '../lib/types/constants';
import {
    type TriFrostContext,
    type TriFrostContextKind,
    type TriFrostContextInit,
    type TriFrostContextRedirectOptions,
    type TriFrostContextResponseOptions,
    type TriFrostContextFileOptions,
} from '../lib/types/context';

import {TriFrostCookies} from '../lib/modules/Cookies';
import {type TriFrostCache, MemoryCache } from '../lib/modules/Cache';
import {Logger, type TriFrostLogger} from '../lib/modules/Logger';
import {type JSXElement} from '../lib/modules/JSX';

export class MockContext <
    State extends Record<string, unknown> = Record<string, unknown>,
> implements TriFrostContext {
    #headers:Record<string, string>;
    #method: HttpMethod;
    #status: HttpStatus | HttpStatusCode = 200;
    #body: string | null = null;
    #state:State;
    #env:Record<string, any>;
    #path:string;
    #query:URLSearchParams;
    #logger:TriFrostLogger;
    #cookies;
    #kind:TriFrostContextKind;
    #ip:string|null;
    #limit:TriFrostRateLimitLimitFunction|null;
    #requestId:string = '123456789';
    #cache:TriFrostCache;
    #after:(() => Promise<void>)[];

    constructor (opts: {
        method?: HttpMethod;
        path?: string;
        headers?: Record<string, string>;
        env?: Record<string, any>;
        query?: string | URLSearchParams;
        kind?: TriFrostContextKind;
        state?: Record<string, unknown>;
        ip?: string|null;
        limit?: TriFrostRateLimitLimitFunction|null;
        cache?: TriFrostCache|null;
    } = {}) {
        this.#method = (opts.method ?? 'get') as HttpMethod;
        this.#path = opts.path ?? '/test';
        this.#headers = opts.headers ?? {};
        this.#env = opts.env ?? {};
        this.#state = (opts.state ?? {}) as State;
        this.#query = typeof opts.query === 'string' ? new URLSearchParams(opts.query) : opts.query ?? new URLSearchParams();
        this.#kind = opts.kind ?? 'std';
        this.#logger = new Logger({debug: false, exporters: [], spanAwareExporters: []});
        this.#cookies = new TriFrostCookies({headers: this.#headers, logger: this.#logger} as any, {});
        this.#ip = 'ip' in opts ? opts.ip || null : '127.0.0.1';
        this.#limit = opts.limit ?? null;
        this.#cache = opts.cache ?? new MemoryCache();
        this.#cache?.stop?.();
        this.#after = [];
    }

    get env() { return this.#env; }
    get method() { return this.#method; }
    get path() { return this.#path; }
    get name() { return 'mock-handler'; }
    get limit() { return this.#limit; }
    get kind() { return this.#kind; }
    get host() { return null; }
    get ip() { return this.#ip; }
    get query() { return this.#query; }
    get body() { return {}; }
    get isInitialized() { return true; }
    get isDone() { return false; }
    get isAborted() { return false; }
    get isLocked() { return false; }
    get headers() { return this.#headers; }
    get logger() { return this.#logger; }
    get cookies() { return this.#cookies; }
    get cache() { return this.#cache; }
    get requestId() { return this.#requestId; }
    get state() { return this.#state; }
    get timeout() { return null; }
    get afterHooks() { return []; }

    /* These are for mock purposes */
    get $status() { return this.#status}
    get $body() { return this.#body}

    setState = <S extends Record<string, unknown>>(patch: S): TriFrostContext<any, any> => {
        this.#state = {...this.#state, ...patch};
        return this as TriFrostContext<any, any>;
    };

    delState = <K extends keyof State>(keys: K[]): TriFrostContext<any, any> => {
        for (const key of keys) delete this.#state[key];
        return this as TriFrostContext<any, any>;
    };

    setHeader = (key: string, value: string): void => {
        this.#headers[key] = value;
    };

    setHeaders = (map: Record<string, string>): void => {
        Object.assign(this.#headers, map);
    };

    delHeader = (key: string): void => {
        delete this.#headers[key];
    };

    setType = (val: MimeType): void => {
        this.setHeader('Content-Type', val);
    };

    setStatus = (status: HttpStatus | HttpStatusCode): void => {
        this.#status = status;
    };

    setBody = (value: string | null): void => {
        this.#body = value;
    };

    setTimeout = (_: number | null): void => {};
    clearTimeout = (): void => {};

    init = async (_: TriFrostContextInit, handler?: () => Promise<Record<string, unknown>|unknown[] | undefined>) => {
        if (handler) await handler();
    };

    abort = (_?: HttpStatus | HttpStatusCode): void => {};

    async fetch (input: string | URL | globalThis.Request, init?: RequestInit) {
        return new Response();
    }

    status = (status: HttpStatus | HttpStatusCode): void => {
        this.#status = status;
    };

    end = (): void => {};

    addAfter = (fn: () => Promise<void>):void => {
        this.#after.push(fn);
    };

    runAfter: () => void;

    json = (_body?: Record<string, unknown>|unknown[], _opts?:TriFrostContextResponseOptions): void => {};
    html = (_body?: string|JSXElement, _opts?:TriFrostContextResponseOptions): void => {};
    text = (_body: string, _opts?:TriFrostContextResponseOptions): void => {};
    redirect = (_to: string, _opts?:TriFrostContextRedirectOptions): void => {};
    file = async (_path: string, _opts?:TriFrostContextFileOptions): Promise<void> => {};
}
