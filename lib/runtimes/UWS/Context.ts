import {isIntGt} from '@valkyriestudios/utils/number';
import {Context} from '../../Context';
import {
    type TriFrostRootLogger,
    type TriFrostLogger,
}  from '../../modules/Logger';
import {type TriFrostContextConfig} from '../../types/context';
import {
    HttpCodeToStatus,
    HttpMethods,
    HttpMethodToNormal,
    type HttpStatusCode,
} from '../../types/constants';
import {type TriFrostRouteMatch} from '../../types/routing';
import {parseBody} from '../../utils/BodyParser/Uint8Array';
import {DEFAULT_BODY_PARSER_OPTIONS} from '../../utils/BodyParser/types';
import {
    type HttpResponse,
    type HttpRequest,
} from './types';

function loadBody (logger: TriFrostLogger, res: HttpResponse):Promise<Uint8Array|undefined> {
    return new Promise(resolve => {
        try {
            let buffer = new Uint8Array(0);
            let offset = 0;

            res.onData((ab: ArrayBuffer, is_last: boolean) => {
                try {
                    const chunk = new Uint8Array(ab);
                    /* First chunk, initialize buffer to exact size if known */
                    if (offset === 0) buffer = new Uint8Array(chunk.length);

                    /* Grow buffer if necessary (rare, only happens once) */
                    if (offset + chunk.length > buffer.length) {
                        const next = new Uint8Array(offset + chunk.length);
                        next.set(buffer);
                        buffer = next;
                    }

                    buffer.set(chunk, offset);
                    offset += chunk.length;

                    if (is_last) return resolve(buffer.subarray(0, offset));
                } catch (err) {
                    logger.debug('UWSContext@loadBody: Failed to concat', {msg: (err as Error).message});
                    return resolve(undefined);
                }
            });
        } catch (err) {
            logger.error('UWSContext@loadBody: Failed to load', {msg: (err as Error).message});
            return resolve(undefined);
        }
    });
}

export class UWSContext extends Context {

    #apis: {
        statSync:typeof import('node:fs')['statSync'];
        createReadStream:typeof import('node:fs')['createReadStream'];
        ReadStream:typeof import('node:fs')['ReadStream'];
        getParts:typeof import('uWebSockets.js')['getParts'];
    };

    #uws_res: HttpResponse;

    constructor (
        cfg:TriFrostContextConfig,
        logger:TriFrostRootLogger,
        apis:{
            statSync:typeof import('node:fs')['statSync'];
            createReadStream:typeof import('node:fs')['createReadStream'];
            ReadStream:typeof import('node:fs')['ReadStream'];
            getParts:typeof import('uWebSockets.js')['getParts'];
        },
        res:HttpResponse,
        req:HttpRequest
    ) {
        /* Hydrate headers */
        const headers:Record<string, string> = {};
        req.forEach((k, v) => headers[k] = v);

        super(logger, cfg, {
            method: HttpMethodToNormal[req.getMethod()],
            path: req.getUrl(),
            headers,
            query: req.getQuery(),
        });

        /* Async handling in uWebSockets requires an onAborted handler */
        res.onAborted(() => this.is_aborted = true);

        this.#apis = apis;
        this.#uws_res = res;
    }

    /**
     * Initializes the context, this happens when a route is matched and tied to this context.
     */
    async init (val:TriFrostRouteMatch) {
        await super.init(val, async () => {
            const raw_body = await loadBody(this.logger, this.#uws_res);
            if (!raw_body) return null;
            return parseBody(this, raw_body, val.route.bodyParser || DEFAULT_BODY_PARSER_OPTIONS);
        });
    }

    /**
     * Get a stream for a particular path
     *
     * @param {string} path - Path to the file
     * @returns {stream:ReadStream|null; size: number|null}
     */
    async getStream (path: string) {
        try {
            const stat = this.#apis.statSync(path);
            if (!stat || stat.size <= 0) return null;

            const stream = this.#apis.createReadStream(path);
            return {stream, size: stat.size};
        } catch (err) {
            this.logger.error('UWSContext@getStream: Failed to create stream', {msg: (err as Error).message, path});
            return null;
        }
    }

    /**
     * Stream a response from a read stream
     *
     * @param {ReadStream} stream - Stream to respond with
     * @param {number|null} size - Size of the stream
     */
    stream (stream:NonNullable<Awaited<ReturnType<typeof this.getStream>>>, size: number|null = null) {
        if (!(stream instanceof this.#apis.ReadStream)) {
            throw new Error('UWSContext@stream: Invalid stream type');
        }

        /* If already locked do nothing */
        if (this.isLocked) return;

        const stream_size = size || stream.size;

        /* Lock the context to ensure no other responding can happen as we stream */
        this.is_done = true;

        /* Write headers */
        for (const key in this.res_headers) this.#uws_res.writeHeader(key, this.res_headers[key]);

        /* Write cookies */
        this.#writeCookies();

        /* End without body if head */
        if (this.method === HttpMethods.HEAD) {
            if (isIntGt(stream_size, 0)) {
                this.#uws_res.writeHeader('content-length', stream_size+'');
            }
            this.#uws_res.endWithoutBody();

            if (!stream.destroyed) stream.destroy();
        } else {
            /* eslint-disable-next-line */
            /* @ts-ignore */
            stream.on('data', (chunk:Buffer) => {
                /* If context is aborted, kill stream and return */
                if (this.isAborted) {
                    if (!stream.destroyed) stream.destroy();
                    return;
                }

                /* We only take standard V8 units of data */
                const buffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);

                /* Store where we are, globally, in our response */
                const last_offset = this.#uws_res.getWriteOffset();

                this.#uws_res.cork(() => {
                    /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
                    const [ok, done] = this.#uws_res.tryEnd(buffer as ArrayBuffer, stream_size);

                    /* Did we successfully send last chunk? */
                    if (done) {
                        if (!stream.destroyed) stream.destroy();
                        return;
                    }

                    if (!ok) {
                        /* If we could not send this chunk, pause */
                        stream.pause();

                        /* Save unsent chunk for when we can send it */
                        this.#uws_res.buffer = buffer;
                        this.#uws_res.buffer_offset = last_offset;

                        /* Register async handlers for drainage */
                        this.#uws_res.onWritable(offset => {
                            const [write_ok, write_done] = this.#uws_res.tryEnd(
                                this.#uws_res.buffer.slice(offset - this.#uws_res.buffer_offset),
                                stream_size
                            );

                            if (write_done) {
                                if (!stream.destroyed) stream.destroy();
                                this.#uws_res.end();
                            } else if (write_ok) {
                                stream.resume();
                            }

                            return write_ok;
                        });
                    }
                });
            }).on('error', () => {
                if (!stream.destroyed) stream.destroy();
            });
        }
    }

    /**
     * Abort the request
     *
     * @param {HttpStatusCode?} status - Status to abort with (defaults to 503)
     */
    abort (status?:HttpStatusCode) {
        if (this.isLocked) return;

        super.abort(status);

        this.#uws_res.cork(() => {
            /* Write cookies */
            this.#writeCookies();

            /* Write Response */
            this.#uws_res
                .writeStatus(HttpCodeToStatus[this.res_code as HttpStatusCode])
                .end();
        });
    }

    /**
     * End the request and respond to callee
     */
    end () {
        if (this.isLocked) return;

        super.end();

        this.#uws_res.cork(() => {
            /* Write status */
            this.#uws_res.writeStatus(HttpCodeToStatus[this.res_code as HttpStatusCode]);

            /* Write cookies */
            this.#writeCookies();

            /* Write headers */
            for (const key in this.res_headers) {
                this.#uws_res.writeHeader(key, this.res_headers[key]);
            }

            /* Write and end */
            switch (this.method) {
                case HttpMethods.HEAD:
                    this.#uws_res
                        .writeHeader('content-length', typeof this.res_body === 'string' ? '' + this.res_body.length : '0')
                        .endWithoutBody();
                    break;
                default:
                    this.#uws_res.end(typeof this.res_body === 'string' ? this.res_body : undefined);
                    break;
            }
        });
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
        return this.#uws_res.getRemoteAddressAsText?.().toString() ?? null;
    }

/**
 * MARK: Private
 */

    #writeCookies () {
        if (!this.$cookies) return;
        const outgoing = this.$cookies.outgoing;
        if (!outgoing.length) return;
        this.#uws_res.writeHeader('Set-Cookie', outgoing.join('\r\nSet-Cookie: '));
    }

}
