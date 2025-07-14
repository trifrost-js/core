/* eslint-disable @typescript-eslint/no-unused-vars */

import {type TriFrostRateLimitLimitFunction} from '../lib/modules/RateLimit';
import {type HttpMethod, type HttpStatusCode, type MimeType} from '../lib/types/constants';
import {
    type TriFrostContext,
    type TriFrostContextKind,
    type TriFrostContextRedirectOptions,
    type TriFrostContextResponseOptions,
    type TriFrostContextFileOptions,
} from '../lib/types/context';
import {type TriFrostRouteMatch} from '../lib/types/routing';
import {Cookies} from '../lib/modules/Cookies';
import {type TriFrostCache} from '../lib/modules/Cache';
import {Logger, type TriFrostLogger} from '../lib/modules/Logger';
import {MemoryCache} from '../lib/storage/Memory';
import {hexId} from '../lib/utils/Generic';
import {TriFrostBodyParserOptions, type ParsedBody} from '../lib/utils/BodyParser/types';
import { Lazy } from '../lib/utils/Lazy';

export class MockContext<State extends Record<string | number, unknown> = Record<string | number, unknown>> implements TriFrostContext<any, State> { // eslint-disable-line prettier/prettier
    #headers: Record<string, string>;
    #method: HttpMethod;
    #status: HttpStatusCode = 200;
    #body: string | null = null;
    #domain: string | null = null;
    #state: State;
    #env: Record<string, any>;
    #path: string;
    #query: URLSearchParams;
    #logger: TriFrostLogger;
    #locked = false;
    #cookies;
    #kind: TriFrostContextKind;
    #ip: string | null;
    #limit: TriFrostRateLimitLimitFunction | null;
    #name: string;
    #nonce: string | null;
    #requestId: string = '123456789';
    #cache: Lazy<TriFrostCache>;
    #after: (() => Promise<void>)[];

    constructor(
        opts: {
            method?: HttpMethod;
            path?: string;
            headers?: Record<string, string>;
            env?: Record<string, any>;
            query?: string | URLSearchParams;
            kind?: TriFrostContextKind;
            state?: Record<string, unknown>;
            ip?: string | null;
            limit?: TriFrostRateLimitLimitFunction | null;
            cache?: TriFrostCache | null;
            name?: string;
            nonce?: string | null;
            logger?: Logger;
            domain?: string | null;
        } = {},
    ) {
        this.#method = (opts.method ?? 'get') as HttpMethod;
        this.#path = opts.path ?? '/test';
        this.#headers = opts.headers ?? {};
        this.#env = opts.env ?? {};
        this.#state = (opts.state ?? {}) as State;
        this.#query = typeof opts.query === 'string' ? new URLSearchParams(opts.query) : (opts.query ?? new URLSearchParams());
        this.#kind = opts.kind ?? 'std';
        this.#logger = opts.logger ?? new Logger({debug: false, exporters: [], spanAwareExporters: []});
        this.#cookies = new Cookies({headers: this.#headers, logger: this.#logger} as any, {});
        this.#ip = 'ip' in opts ? opts.ip || null : '127.0.0.1';
        this.#limit = opts.limit ?? null;
        this.#name = opts.name ?? 'mock-handler';
        this.#nonce = 'nonce' in opts ? opts.nonce || null : btoa(hexId(8));
        this.#cache = new Lazy(opts.cache ?? (() => new MemoryCache()));
        this.#requestId = '123456789';
        this.#cache?.resolved?.stop?.();
        this.#after = [];
        this.#domain = opts.domain ?? null;
    }

    get env() {
        return this.#env;
    }
    get method() {
        return this.#method;
    }
    get path() {
        return this.#path;
    }
    get name() {
        return this.#name;
    }
    get nonce() {
        return (this.#state.nonce as string) ?? this.#nonce;
    }
    get limit() {
        return this.#limit;
    }
    get kind() {
        return this.#kind;
    }
    get host() {
        return this.#env.TRIFROST_HOST ?? '0.0.0.0';
    }
    get domain() {
        return this.#domain;
    }
    get ip() {
        return this.#ip;
    }
    get query() {
        return this.#query;
    }
    get body() {
        return {};
    }
    get isInitialized() {
        return true;
    }
    get isDone() {
        return false;
    }
    get isAborted() {
        return false;
    }
    get isLocked() {
        return this.#locked;
    }
    get headers() {
        return this.#headers;
    }
    get resHeaders() {
        return Object.freeze({});
    }
    get logger() {
        return this.#logger;
    }
    get cookies() {
        return this.#cookies;
    }
    get cache() {
        return this.#cache.resolve(this);
    }
    get statusCode() {
        return this.#status as HttpStatusCode;
    }
    get requestId() {
        return this.#requestId;
    }
    get state() {
        return this.#state;
    }
    get timeout() {
        return null;
    }
    get afterHooks() {
        return [];
    }

    /* These are for mock purposes */
    get $status() {
        return this.#status;
    }
    get $body() {
        return this.#body;
    }

    setState = <S extends Record<string | number, unknown>>(patch: S): TriFrostContext<any, State & S> => {
        this.#state = {...this.#state, ...patch};
        return this as unknown as TriFrostContext<any, State & S>;
    };

    delState = <K extends keyof State>(keys: K[]): TriFrostContext<any, Omit<State, K>> => {
        for (const key of keys) delete this.#state[key];
        return this as unknown as TriFrostContext<any, Omit<State, K>>;
    };

    setHeader = (key: string, value: string | number): void => {
        this.#headers[key] = String(value);
    };

    setHeaders = (map: Record<string, string | number>): void => {
        Object.assign(this.#headers, map);
    };

    delHeader = (key: string): void => {
        delete this.#headers[key];
    };

    setType = (val: MimeType): void => {
        this.setHeader('Content-Type', val);
    };

    setStatus = (status: HttpStatusCode): void => {
        this.#status = status;
    };

    setBody = (value: string | null): void => {
        this.#body = value;
    };

    setTimeout = (_: number | null): void => {};
    clearTimeout = (): void => {};

    init = async (_: TriFrostRouteMatch<any>, _handler?: (options: TriFrostBodyParserOptions | null) => Promise<ParsedBody | null>) => {};

    abort = (_?: HttpStatusCode): void => {};

    async fetch(input: string | URL | globalThis.Request, init?: RequestInit) {
        return new Response();
    }

    status = (status: HttpStatusCode): void => {
        this.#status = status;
    };

    end = (): void => {
        this.#locked = true;
    };

    addAfter = (fn: () => Promise<void>): void => {
        this.#after.push(fn);
    };

    runAfter = (): void => {
        for (const el of this.#after) el();
    };

    json = (_body?: Record<string, unknown> | unknown[], _opts?: TriFrostContextResponseOptions): void => {};
    html = (_body?: string | any, _opts?: TriFrostContextResponseOptions): void => {};
    text = (_body: string, _opts?: TriFrostContextResponseOptions): void => {};
    redirect = (_to: string, _opts?: TriFrostContextRedirectOptions): void => {};
    file = async (
        _path: string | {stream: unknown; size?: number | null; name: string},
        _opts?: TriFrostContextFileOptions,
    ): Promise<void> => {};
}
