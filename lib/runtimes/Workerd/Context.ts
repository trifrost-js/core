import {isIntGt} from '@valkyriestudios/utils/number';
import {Context} from '../../Context';
import {type TriFrostRootLogger} from '../../modules/Logger';
import {type TriFrostContextConfig} from '../../types/context';
import {
    HttpMethods,
    HttpMethodToNormal,
    type HttpStatus,
    type HttpStatusCode,
} from '../../types/constants';
import {type TriFrostCFFetcher} from '../../types/providers';
import {type TriFrostRouteMatch} from '../../types/routing';
import {parseBody} from '../../utils/BodyParser/Request';
import {extractPartsFromUrl} from '../../utils/Http';
import {DEFAULT_BODY_PARSER_OPTIONS} from '../../utils/BodyParser/types';

export class WorkerdContext extends Context {

    /* Workerd Request instance */
    #workerd_req:Request;

    /* Workerd execution context */
    #workerd_ctx:ExecutionContext;

    /* Internal Response instance */
    #response: Response | null = null;

    constructor (
        cfg:TriFrostContextConfig,
        logger:TriFrostRootLogger,
        req:Request,
        ctx:ExecutionContext
    ) {
        /* Extract path and query */
        const {path, query} = extractPartsFromUrl(req.url);

        /* Hydrate headers */
        const headers:Record<string, string> = {};
        for (const [key, value] of req.headers.entries()) {
            headers[key] = value;
        }

        super(logger, cfg, {
            path,
            method: HttpMethodToNormal[req.method],
            headers,
            query,
        });

        this.#workerd_req = req;
        this.#workerd_ctx = ctx;
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
    async init (val:TriFrostRouteMatch) {
        await super.init(val, async () => parseBody(this, this.#workerd_req, val.route.bodyParser || DEFAULT_BODY_PARSER_OPTIONS));
    }

    /**
     * Get a stream for a particular path
     *
     * @param {string} path - Path to the file
     */
    async getStream (path: string):Promise<{stream:ReadableStream;size:number|null}|null> {
        try {
            if (
                !('ASSETS' in this.env) ||
                !(this.env.ASSETS as TriFrostCFFetcher).fetch
            ) throw new Error('WorkerdContext@getStream: ASSETS is not configured on env');

            const response = await (this.env.ASSETS as TriFrostCFFetcher).fetch(
                new Request(`http://${this.host || '0.0.0.0'}${path[0] !== '/' ? '/' : ''}${path}`)
            );
            if (!response.ok) {
                this.logger.warn('WorkerdContext@getStream: File not found', {path});
                return null;
            }

            /* Get content length of asset */
            const contentLength = response.headers.get('content-length');

            /* Determine size if possible */
            const size = contentLength ? parseInt(contentLength, 10) : null;

            /* Get stream */
            const stream = response.body;
            if (!stream) throw new Error('WorkerdContext@getStream: Can not create stream from response body');

            return {stream, size};
        } catch (err) {
            this.logger.error(err, {path});
            return null;
        }
    }

    /**
     * Stream a response from a ReadableStream in Workerd
     *
     * @param {ReadableStream} stream - Stream to respond with
     * @param {number|null} size - Size of the stream
     */
    stream (stream: ReadableStream, size: number|null = null) {
        if (!(stream instanceof ReadableStream)) {
            throw new Error('WorkerdContext@stream: Invalid stream type');
        }

        /* If already locked do nothing */
        if (this.isLocked) return;

        /* Lock the context to ensure no other responding can happen as we stream */
        this.is_done = true;

        /* Set content-length if provided */
        if (isIntGt(size, 0)) this.res_headers['content-length'] = size.toString();

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
    abort (status?:HttpStatus|HttpStatusCode) {
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
            case HttpMethods.HEAD: {
                this.res_headers['Content-Length'] = typeof this.res_body === 'string'
                    ? new TextEncoder().encode(this.res_body).length.toString()
                    : '0';

                /* Set response */
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
        for (let i = 0; i < hooks.length; i++) {
            try {
                this.#workerd_ctx.waitUntil(hooks[i]());
            } catch {
                /* No-Op */
            }
        }
    }

/**
 * MARK: Protected
 */

    protected getIP ():string|null {
        /* Workerd itself does not expose raw remote IP, hence we should trust headers, see main context */
        return null;
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
