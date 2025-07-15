import {Context} from '../../Context';
import {type TriFrostRootLogger} from '../../modules/Logger';
import {type TriFrostContextConfig} from '../../types/context';
import {HttpMethods, HttpMethodToNormal, type HttpStatusCode} from '../../types/constants';
import {type TriFrostRouteMatch} from '../../types/routing';
import {parseBody} from '../../utils/BodyParser/Uint8Array';
import {type IncomingMessage, type ServerResponse} from './types';
import {DEFAULT_BODY_PARSER_OPTIONS} from '../../utils/BodyParser/types';

const encoder = new TextEncoder();

/**
 * Utility to load request body
 *
 * @param {IncomingMessage} req - Incoming Request
 */
async function loadBody(req: IncomingMessage): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export class NodeContext extends Context {
    /* Node Apis */
    private node: {
        Readable: (typeof import('node:stream'))['Readable'];
        statSync: (typeof import('node:fs'))['statSync'];
        createReadStream: (typeof import('node:fs'))['createReadStream'];
        pipeline: (typeof import('node:stream/promises'))['pipeline'];
    };

    /* Incoming Message */
    private node_req: IncomingMessage;

    /* Outgoing Response */
    private node_res: ServerResponse;

    constructor(
        cfg: TriFrostContextConfig,
        logger: TriFrostRootLogger,
        nodeApis: {
            Readable: (typeof import('node:stream'))['Readable'];
            statSync: (typeof import('node:fs'))['statSync'];
            createReadStream: (typeof import('node:fs'))['createReadStream'];
            pipeline: (typeof import('node:stream/promises'))['pipeline'];
        },
        req: IncomingMessage,
        res: ServerResponse,
    ) {
        /* Hydrate headers */
        const headers: Record<string, string> = {};
        for (const key in req.headers) {
            /* Node automatically lower cases headers */
            if (req.headers[key]) headers[key] = req.headers[key] as string;
        }

        /* Determine path and query */
        const [path, query = ''] = (req.url || '/').split('?', 2);

        super(logger, cfg, {
            path,
            method: HttpMethodToNormal[req.method!],
            headers,
            query,
        });

        this.node = nodeApis;
        this.node_req = req;
        this.node_res = res;
    }

    /**
     * Initializes the context, this happens when a route is matched and tied to this context.
     */
    async init(val: TriFrostRouteMatch) {
        await super.init(val, async () => {
            const raw_body = await loadBody(this.node_req);
            return parseBody(this, raw_body, val.route.bodyParser || DEFAULT_BODY_PARSER_OPTIONS);
        });
    }

    /**
     * Get a stream for a particular path
     *
     * @param {string} path - Path to the file
     */
    async getStream(path: string) {
        try {
            const stat = this.node.statSync(path);
            if (!stat || stat.size <= 0) return null;

            const stream = this.node.createReadStream(path);
            return {stream, size: stat.size};
        } catch (err) {
            this.logger.error('NodeContext@getStream: Failed to create stream', {msg: (err as Error).message, path});
            return null;
        }
    }

    /**
     * Stream a response from a read stream
     *
     * @param {unknown} stream - Stream to respond with
     * @param {number|null} size - Size of the stream
     */
    protected stream(stream: unknown, size: number | null = null) {
        /* If already locked do nothing */
        if (this.isLocked) return;

        /* Coerce to a pipe-compatible Node Readable if needed */
        if (typeof (stream as any)?.pipe !== 'function') {
            if (stream instanceof ReadableStream) {
                const reader = stream.getReader();
                stream = new this.node.Readable({
                    async read() {
                        const {value, done} = await reader.read();
                        if (done) return this.push(null);
                        this.push(value);
                    },
                });
            } else if (
                typeof stream === 'string' ||
                stream instanceof Uint8Array ||
                stream instanceof ArrayBuffer ||
                stream instanceof Blob
            ) {
                stream = this.node.Readable.from(stream as any);
            } else {
                const type = Object.prototype.toString.call(stream);
                throw new Error(`NodeContext@stream: Unsupported stream type (${type})`);
            }
        }

        super.stream(stream, size);

        /* Write headers */
        this.node_res.writeHead(this.res_code, this.res_headers);

        /* Write cookies */
        this.writeCookies();

        switch (this.method) {
            case HttpMethods.HEAD:
                this.node_res.end();
                (stream as import('node:stream').Readable).destroy?.();
                break;
            default: {
                this.node
                    .pipeline(stream as import('node:stream').Readable, this.node_res as unknown as NodeJS.WritableStream)
                    .catch(err => {
                        switch (err.code) {
                            case 'ERR_STREAM_PREMATURE_CLOSE': /* Stream closed by client (eg: browser refresh) */
                            case 'ERR_STREAM_DESTROYED': /* Stream destroyed manually */
                            case 'ECONNRESET': /* Unexpected socket close, usually by client */
                            case 'EPIPE' /* Client closed connection mid-stream */:
                                this.logger.debug('NodeContext@stream: Stream aborted', {msg: err.message});
                                break;
                            default: {
                                this.logger.error('NodeContext@stream: Failed to stream', {msg: err.message});
                                this.node_res.destroy(err);
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
     * @param {HttpStatusCode?} status - Status to abort with (defaults to 503)
     */
    abort(status?: HttpStatusCode) {
        if (this.isLocked) return;

        super.abort(status);

        /* Write Cookies */
        this.writeCookies();

        /* Write other headers and status */
        this.node_res.writeHead(this.res_code, this.res_headers).end();
    }

    /**
     * End the request and respond to callee
     */
    end() {
        if (this.isLocked) return;

        super.end();

        /* Write Cookies */
        this.writeCookies();

        switch (this.method) {
            case HttpMethods.HEAD:
                this.res_headers['content-length'] = typeof this.res_body === 'string' ? '' + encoder.encode(this.res_body).length : '0';
                this.node_res.writeHead(this.res_code, this.res_headers).end();
                break;
            default:
                this.node_res.writeHead(this.res_code, this.res_headers).end(typeof this.res_body === 'string' ? this.res_body : undefined);
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
        return this.node_req.connection?.socket?.remoteAddress ?? this.node_req.socket?.remoteAddress ?? null;
    }

    /**
     * MARK: Private
     */

    private writeCookies() {
        if (!this.$cookies) return;
        const outgoing = this.$cookies.outgoing;
        if (!outgoing.length) return;
        this.node_res.setHeader('set-cookie', outgoing);
    }
}
