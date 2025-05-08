import {toObject} from '@valkyriestudios/utils/formdata';
import {isIntGt} from '@valkyriestudios/utils/number';
import {Context} from '../../Context';
import {type TriFrostRootLogger} from '../../modules/Logger';
import {
    type IncomingMessage,
    type ServerResponse,
} from './types';
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

/**
 * Utility to load request body
 *
 * @param {IncomingMessage} req - Incoming Request
 */
async function loadBody (req:IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.from(chunk as Buffer)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export class NodeContext extends Context {

    /* Node Apis */
    #node:{
        statSync: typeof import('node:fs')['statSync'];
        createReadStream: typeof import('node:fs')['createReadStream'];
        pipeline: typeof import('node:stream/promises')['pipeline'];
    };

    /* Incoming Message */
    #node_req:IncomingMessage;

    /* Outgoing Response */
    #node_res:ServerResponse;

    constructor (
        cfg:TriFrostContextConfig,
        logger:TriFrostRootLogger,
        nodeApis: {
            statSync: typeof import('node:fs')['statSync'];
            createReadStream: typeof import('node:fs')['createReadStream'];
            pipeline: typeof import('node:stream/promises')['pipeline'];
        },
        req:IncomingMessage,
        res:ServerResponse
    ) {
        const method = req.method?.toLowerCase() as HttpMethod;

        /* Hydrate headers */
        const headers: Record<string, string> = {};
        for (const key in req.headers) {
            if (req.headers[key]) headers[key] = req.headers[key] as string;
        }

        /* Determine path and query */
        const [path, query = ''] = (req.url || '/').split('?', 2);

        super(logger, cfg, {path, method, headers, query});

        this.#node = nodeApis;
        this.#node_req = req;
        this.#node_res = res;
    }

    /**
     * Initializes the context, this happens when a route is matched and tied to this context.
     */
    async init (val:TriFrostContextInit) {
        await super.init(val, async () => {
            const raw_body = await loadBody(this.#node_req);
            const type = this.headers['content-type'] || '';

            if (type.includes(MimeTypes.JSON)) {
                return JSON.parse(raw_body.toString());
            } else if (
                type.includes(MimeTypes.HTML) ||
                type.includes(MimeTypes.TEXT) ||
                type.includes(MimeTypes.CSV)
            ) {
                return {raw: raw_body.toString()};
            } else if (type.includes(MimeTypes.FORM_MULTIPART)) {
                const form = new FormData();
                const parts = raw_body.toString().split('&');
                parts.forEach(part => {
                    const [key, value] = part.split('=');
                    if (key && value) form.append(decodeURIComponent(key), decodeURIComponent(value));
                });
                return toObject(form);
            }

            return {raw: raw_body};
        });
    }

    /**
     * Get a stream for a particular path
     *
     * @param {string} path - Path to the file
     */
    async getStream (path: string) {
        try {
            const stat = this.#node.statSync(path);
            if (!stat || stat.size <= 0) return null;

            const stream = this.#node.createReadStream(path);
            return {stream, size: stat.size};
        } catch (err) {
            this.logger.error('NodeContext@getStream: Failed to create stream', {msg: (err as Error).message, path});
            return null;
        }
    }

    /**
     * Stream a response from a read stream
     *
     * @param {NonNullable<Awaited<ReturnType<typeof this.getStream>>>['stream']} stream - Stream to respond with
     * @param {number|null} size - Size of the stream
     */
    stream (stream:NonNullable<Awaited<ReturnType<typeof this.getStream>>>['stream'], size: number|null = null) {
        /* If already locked do nothing */
        if (this.isLocked) return;

        /* Lock the context to ensure no other responding can happen as we stream */
        this.is_done = true;

        /* Add content-length to headers */
        if (isIntGt(size, 0)) this.res_headers['content-length'] = size.toString();

        /* Write headers */
        this.#node_res.writeHead(
            this.res_code,
            this.res_headers
        );

        /* Write cookies */
        this.#writeCookies();

        switch (this.method) {
            case 'head':
                this.#node_res.end();
                stream.destroy?.();
                break;
            default: {
                this.#node.pipeline(stream, this.#node_res as unknown as NodeJS.WritableStream).catch(err => {
                    switch (err.code)  {
                        case 'ERR_STREAM_PREMATURE_CLOSE': /* Stream closed by client (eg: browser refresh) */
                        case 'ERR_STREAM_DESTROYED': /* Stream destroyed manually */
                        case 'ECONNRESET': /* Unexpected socket close, usually by client */
                        case 'EPIPE': /* Client closed connection mid-stream */
                            this.logger.debug('NodeContext@stream: Stream aborted', {msg: err.message});
                            break;
                        default: {
                            this.logger.error('NodeContext@stream: Failed to stream', {msg: err.message});
                            this.#node_res.destroy(err);
                        }
                    }
                });
                break;
            }
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

        /* Write Cookies */
        this.#writeCookies();

        /* Write other headers and status */
        this.#node_res.writeHead(
            this.res_code,
            this.res_headers
        ).end();
    }

    /**
     * End the request and respond to callee
     */
    end () {
        if (this.isLocked) return;

        super.end();

        /* Write Cookies */
        this.#writeCookies();

        switch (this.method) {
            case 'head':
                this.res_headers['Content-Length'] = typeof this.res_body === 'string'
                    ? new TextEncoder().encode(this.res_body).length.toString()
                    : '0';
                this.#node_res
                    .writeHead(this.res_code, this.res_headers)
                    .end();
                break;
            default:
                this.#node_res
                    .writeHead(this.res_code, this.res_headers)
                    .end(typeof this.res_body === 'string' ? this.res_body : undefined);
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
        return this.#node_req.connection?.socket?.remoteAddress ?? this.#node_req.socket?.remoteAddress ?? null;
    }

/**
 * MARK: Private
 */

    #writeCookies () {
        if (!this.$cookies) return;
        const outgoing = this.$cookies.outgoing;
        if (!outgoing.length) return;
        this.#node_res.setHeader('Set-Cookie', outgoing);
    }

}
