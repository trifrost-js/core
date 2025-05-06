import {toObject} from '@valkyriestudios/utils/formdata/toObject';
import {isIntegerAbove} from '@valkyriestudios/utils/number/isIntegerAbove';
import {Context} from '../../Context';
import {
    type TriFrostRootLogger,
    type TriFrostLogger,
}  from '../../modules/Logger';
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
import {
    type MultipartField,
    type HttpResponse,
    type HttpRequest,
} from './Types';

function loadBody (logger:TriFrostLogger, res:HttpResponse):Promise<Buffer|undefined> {
    return new Promise(resolve => {
        try {
            let buffer = Buffer.from('');
            res.onData((ab:ArrayBuffer, is_last:boolean) => {
                try {
                    buffer = Buffer.concat([buffer, Buffer.from(ab)]);
                    if (is_last) return resolve(buffer);
                } catch {
                    return resolve(undefined);
                }
            });
        } catch (err) {
            logger.error('UWSContext@loadBody: Failed to load', {msg: (err as Error).message});
            return resolve(undefined);
        }
    });
}

function multipartFieldToFormData (logger:TriFrostLogger, parts:MultipartField[]):Record<string,any>|undefined {
    try {
        if (!parts.length) return undefined;

        const form = new FormData();
        for (let x = 0; x < parts.length; x++) {
            const {name, data, filename} = parts[x];
            if (filename) {
                form.append(name, new Blob([Buffer.from(data)]), filename);
            } else {
                form.append(name, new Blob([Buffer.from(data)]));
            }
        }

        return toObject(form);
    } catch (err) {
        logger.error('UWSContext@multipartFieldToFormData: Failed to convert', {msg: (err as Error).message});
        return undefined;
    }
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
        const method = req.getMethod() as HttpMethod;
        const path = req.getUrl();

        /* Hydrate headers */
        const headers:Record<string, string> = {};
        req.forEach((k, v) => headers[k] = v);

        super(logger, cfg, {
            method,
            path,
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
    async init (val:TriFrostContextInit) {
        await super.init(val, async () => {
            const raw_body = await loadBody(this.logger, this.#uws_res);
            if (!raw_body) return null;

            /* Get content type, we use this to determine how to handle the raw body */
            const type:string = this.headers['content-type'] || '';
            if (type.includes(MimeTypes.JSON)) {
                return JSON.parse(raw_body.toString());
            } else if (
                type.includes(MimeTypes.HTML) ||
                type.includes(MimeTypes.TEXT) ||
                type.includes(MimeTypes.CSV)
            ) {
                return {raw: raw_body.toString()};
            } else if (type.includes(MimeTypes.FORM_MULTIPART)) {
                const parts = this.#apis.getParts(raw_body, type);
                if (parts) return multipartFieldToFormData(this.logger, parts);
            }
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
        if (this.method === 'head') {
            if (isIntegerAbove(stream_size, 0)) {
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
     * @param {HttpStatus|HttpStatusCode?} status - Status to abort with (defaults to 503)
     */
    abort (status?:HttpStatus|HttpStatusCode) {
        if (this.isLocked) return;

        super.abort(status);

        this.#uws_res.cork(() => {
            /* Write cookies */
            this.#writeCookies();

            /* Write Response */
            this.#uws_res
                .writeStatus(this.res_status)
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
            this.#uws_res.writeStatus(this.res_status);

            /* Write cookies */
            this.#writeCookies();

            /* Write headers */
            for (const key in this.res_headers) {
                this.#uws_res.writeHeader(key, this.res_headers[key]);
            }

            /* Write and end */
            switch (this.method) {
                case 'head':
                    this.#uws_res
                        .writeHeader('content-length', typeof this.res_body === 'string' ? this.res_body.length.toString() : '0')
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
