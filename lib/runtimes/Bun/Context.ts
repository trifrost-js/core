/// <reference types="bun-types" />

import {Context} from '../../Context';
import {type TriFrostRootLogger} from '../../modules/Logger';
import {type TriFrostContextConfig} from '../../types/context';
import {HttpMethods, HttpMethodToNormal, type HttpStatusCode} from '../../types/constants';
import {type TriFrostRouteMatch} from '../../types/routing';
import {parseBody} from '../../utils/BodyParser/Request';
import {extractPartsFromUrl} from '../../utils/Http';
import {DEFAULT_BODY_PARSER_OPTIONS} from '../../utils/BodyParser/types';
import {verifyFileStream} from '../../utils/Stream';

const encoder = new TextEncoder();

export class BunContext extends Context {
    /* Bun Apis */
    #bun: {file: typeof import('bun').file};

    /* Bun Request instance */
    #bun_req: Request;

    /* Internal Response instance */
    #response: Response | null = null;

    constructor(cfg: TriFrostContextConfig, logger: TriFrostRootLogger, bunApis: {file: typeof import('bun').file}, req: Request) {
        /* Extract path and query */
        const {path, query} = extractPartsFromUrl(req.url);

        /* Hydrate headers */
        const headers: Record<string, string> = {};
        /* eslint-disable-next-line */
        /* @ts-ignore */
        for (const [key, value] of req.headers.entries()) {
            headers[key] = value;
        }

        super(logger, cfg, {
            path,
            method: HttpMethodToNormal[req.method],
            headers,
            query,
        });

        this.#bun = bunApis;
        this.#bun_req = req;
    }

    /**
     * Getter for the final response
     */
    get response(): Response | null {
        return this.#response;
    }

    /**
     * Initializes the context, this happens when a route is matched and tied to this context.
     */
    async init(val: TriFrostRouteMatch) {
        await super.init(val, async () => parseBody(this, this.#bun_req, val.route.bodyParser || DEFAULT_BODY_PARSER_OPTIONS));
    }

    /**
     * Get a stream for a particular path
     *
     * @param {string} path - Path to the file
     */
    async getStream(path: string): Promise<{stream: ReadableStream; size: number} | null> {
        try {
            const file_obj = this.#bun.file(path);
            if (!file_obj) {
                this.logger.warn('BunContext@getStream: File not found', {path});
                return null;
            }

            return {
                stream: file_obj.stream(),
                size: file_obj.size,
            };
        } catch (err) {
            this.logger.error('BunContext@getStream: Failed to create stream', {msg: (err as Error).message, path});
            return null;
        }
    }

    /**
     * Stream a file-like response in Bun
     *
     * @param {unknown} stream - Stream to respond with
     * @param {number|null} size - Size of the stream
     */
    protected stream(stream: unknown, size: number | null = null) {
        /* If already locked do nothing */
        if (this.isLocked) return;

        verifyFileStream(stream);

        super.stream(stream, size);

        /* Set response with stream */
        this.#response = new Response(stream, {
            status: this.res_code,
            headers: this.res_headers,
        });

        /* Write cookies */
        this.#writeCookies();
    }

    /**
     * Abort the request
     *
     * @param {HttpStatusCode?} status - Status to abort with (defaults to 503)
     */
    abort(status?: HttpStatusCode) {
        if (this.isLocked) return;

        super.abort(status);

        /* Set response */
        this.#response = new Response(null, {
            status: this.res_code,
            headers: this.res_headers,
        });

        /* Write cookies */
        this.#writeCookies();
    }

    /**
     * End the request and respond to callee
     */
    end() {
        if (this.isLocked) return;

        super.end();

        switch (this.method) {
            case HttpMethods.HEAD: {
                this.res_headers['Content-Length'] = typeof this.res_body === 'string' ? '' + encoder.encode(this.res_body).length : '0';

                this.#response = new Response(null, {
                    status: this.res_code,
                    headers: this.res_headers,
                });

                /* Write cookies */
                this.#writeCookies();
                break;
            }
            default:
                /* Set response */
                this.#response = new Response(this.res_body, {
                    status: this.res_code,
                    headers: this.res_headers,
                });

                /* Write cookies */
                this.#writeCookies();
                break;
        }
    }

    /**
     * Run jobs after the response has gone out
     */
    runAfter() {
        const hooks = this.afterHooks;
        if (!hooks.length) return;

        queueMicrotask(() => {
            for (let i = 0; i < hooks.length; i++) {
                try {
                    hooks[i]();
                } catch {
                    /* No-Op */
                }
            }
        });
    }

    /**
     * MARK: Protected
     */

    protected getIP(): string | null {
        return (this.#bun_req as {socket?: {remoteAddress?: string}}).socket?.remoteAddress ?? null;
    }

    /**
     * MARK: Private
     */

    #writeCookies() {
        if (!this.$cookies) return;
        const outgoing = this.$cookies.outgoing;
        if (!outgoing.length) return;
        for (let i = 0; i < outgoing.length; i++) this.#response!.headers.append('Set-Cookie', outgoing[i]);
    }
}
