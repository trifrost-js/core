/// <reference types="bun-types" />

import {toObject} from '@valkyriestudios/utils/formdata/toObject';
import {isIntegerAbove} from '@valkyriestudios/utils/number/isIntegerAbove';
import {Context} from '../../Context';
import {type TriFrostRootLogger} from '../../modules/Logger';
import {
    type TriFrostContextConfig,
    type TriFrostContextInit,
} from '../../types/context';
import {
    type HttpMethod,
    type HttpStatus,
    type HttpStatusCode,
    MimeTypes,
} from '../../types/constants';

export class BunContext extends Context {

    /* Bun Apis */
    #bun:{file: typeof import('bun').file;};

    /* Bun Request instance */
    #bun_req: Request;

    /* Internal Response instance */
    #response: Response | null = null;

    constructor (
        cfg: TriFrostContextConfig,
        logger: TriFrostRootLogger,
        bunApis:{file: typeof import('bun').file},
        req: Request
    ) {
        const url = req.url;
        const method = req.method.toLowerCase() as HttpMethod;

        /* Find protocol end and path start */
        const proto_end_idx = url.indexOf('://') + 3;
        const path_start_idx = url.indexOf('/', proto_end_idx);

        let path = '/';
        let query = '';
        if (path_start_idx >= 0) {
            const query_idx = url.indexOf('?', path_start_idx);
            if (query_idx >= 0) {
                path = url.slice(path_start_idx, query_idx); /* Extract path up to '?' */
                query = url.slice(query_idx + 1); /* Extract query after '?' */
            } else {
                path = url.slice(path_start_idx); /* Extract entire path */
            }
        }

        /* Hydrate headers */
        const headers: Record<string, string> = {};
        for (const [key, value] of req.headers.entries()) {
            headers[key] = value;
        }

        super(logger, cfg, {path, method, headers, query});

        this.#bun = bunApis;
        this.#bun_req = req;
    }

    /**
     * Getter for the final response
     */
    get response (): Response|null {
        return this.#response;
    }

    /**
     * Initializes the context, this happens when a route is matched and tied to this context.
     */
    async init (val:TriFrostContextInit) {
        await super.init(val, (async () => {
            const type = this.headers['content-type'] || '';
            if (type.includes(MimeTypes.JSON)) {
                const body = await this.#bun_req.json();
                return body;
            } else if (
                type.includes(MimeTypes.HTML) ||
                type.includes(MimeTypes.TEXT) ||
                type.includes(MimeTypes.CSV)
            ) {
                const body = await this.#bun_req.text();
                return {raw: body};
            } else if (type.includes(MimeTypes.FORM_MULTIPART)) {
                const formdata = await this.#bun_req.formData();
                return toObject(formdata);
            }
        }) as () => Promise<Record<string, unknown>|undefined>);
    }

    /**
     * Get a stream for a particular path
     *
     * @param {string} path - Path to the file
     */
    async getStream (path: string): Promise<{stream: ReadableStream; size: number} | null> {
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
     * Stream a response from a ReadableStream in Bun
     *
     * @param {ReadableStream} stream - Stream to respond with
     * @param {number|null} size - Size of the stream
     */
    stream (stream: ReadableStream, size: number|null = null) {
        if (!(stream instanceof ReadableStream)) {
            throw new Error('BunContext@stream: Invalid stream type');
        }

        /* If already locked do nothing */
        if (this.isLocked) return;

        /* Lock the context to ensure no other responding can happen as we stream */
        this.is_done = true;

        /* Set content-length if provided */
        if (isIntegerAbove(size, 0)) this.res_headers['content-length'] = size.toString();

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
     * @param {HttpStatus|HttpStatusCode?} status - Status to abort with (defaults to 503)
     */
    abort (status?: HttpStatus | HttpStatusCode) {
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
    end () {
        if (this.isLocked) return;

        super.end();

        switch (this.method) {
            case 'head': {
                this.res_headers['Content-Length'] = typeof this.res_body === 'string'
                    ? new TextEncoder().encode(this.res_body).length.toString()
                    : '0';

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
    runAfter () {
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

    protected getIP ():string|null {
        return (this.#bun_req as {socket?: {remoteAddress?: string}}).socket?.remoteAddress ?? null;
    }

/**
 * MARK: Private
 */

    #writeCookies () {
        if (!this.$cookies) return;
        const outgoing = this.$cookies.outgoing;
        if (!outgoing.length) return;
        for (let i = 0; i < outgoing.length; i++) this.#response!.headers.append('Set-Cookie', outgoing[i]);
    }

}
