type IncomingHttpHeaders = Record<string, string | string[] | undefined>;

export interface IncomingMessage {
    /**
     * HTTP request method (e.g., 'GET', 'POST', etc.).
     */
    method?: string;

    /**
     * HTTP request URL (e.g., '/path?query=value').
     */
    url?: string;

    /**
     * HTTP version (e.g., '1.1').
     */
    httpVersion: string;

    /**
     * HTTP headers of the incoming request.
     */
    headers: IncomingHttpHeaders;

    /**
     * Aborted flag indicates whether the request has been aborted.
     */
    aborted: boolean;

    /**
     * Event listener for 'data' to receive chunks of the request body.
     * @param event - Event name ('data').
     * @param listener - Listener function for the event.
     */
    on(event: 'data', listener: (chunk: Buffer | string) => void): this;

    /**
     * Event listener for 'end' when the request body has been fully received.
     * @param event - Event name ('end').
     * @param listener - Listener function for the event.
     */
    on(event: 'end', listener: () => void): this;

    /**
     * Event listener for 'error' when an error occurs during the request.
     * @param event - Event name ('error').
     * @param listener - Listener function for the event.
     */
    on(event: 'error', listener: (err: Error) => void): this;

    /**
     * Destroy the request stream.
     */
    destroy(error?: Error): void;

    connection?: {
        socket?: {
            remoteAddress?: string;
        };
    };

    socket?: {
        remoteAddress?: string;
    };
}

export interface ServerResponse {
    writable: boolean;

    /**
     * Writes the HTTP response headers.
     *
     * @param statusCode - HTTP status code (e.g., 200, 404).
     * @param headers - Headers to send with the response.
     */
    writeHead(statusCode: number, headers?: Record<string, string | string[]>): this;

    /**
     * Writes data to the response body.
     *
     * @param chunk - Data to write to the response body (string or Buffer).
     * @param encoding - Encoding for the data (default: 'utf8').
     * @param callback - Callback executed once the data is written.
     */
    write(chunk: string | Buffer, encoding?: string, callback?: () => void): boolean;

    /**
     * Ends the response and optionally writes the final data.
     *
     * @param chunk - Optional final data to send before closing the response.
     * @param encoding - Encoding for the data (default: 'utf8').
     * @param callback - Callback executed once the response is fully sent.
     */
    end(chunk?: string | Buffer, encoding?: string, callback?: () => void): void;

    /**
     * Sets a single response header.
     *
     * @param name - The name of the header (e.g., 'content-type').
     * @param value - The value of the header.
     */
    setHeader(name: string, value: string | string[]): void;

    /**
     * Retrieves the current value of a response header.
     *
     * @param name - The name of the header.
     * @returns The value of the header or undefined if not set.
     */
    getHeader(name: string): string | string[] | undefined;

    /**
     * Removes a previously set response header.
     *
     * @param name - The name of the header to remove.
     */
    removeHeader(name: string): void;

    /**
     * Flushes the response headers.
     */
    flushHeaders(): void;

    /**
     * Adds a one-time listener for the specified event.
     *
     * @param event - Event name (e.g., 'close', 'finish').
     * @param listener - Listener function for the event.
     */
    once(event: 'drain' | 'close' | 'finish', listener: () => void): this;

    /**
     * Event listener for 'close' when the response has been closed.
     *
     * @param event - Event name ('close').
     * @param listener - Listener function for the event.
     */
    on(event: 'close', listener: () => void): this;

    /**
     * Event listener for 'finish' when the response has been fully sent.
     *
     * @param event - Event name ('finish').
     * @param listener - Listener function for the event.
     */
    on(event: 'finish', listener: () => void): this;

    destroy(err: Error): void;
}
