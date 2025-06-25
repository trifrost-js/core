export type FileStreamLike =
    | ReadableStream
    | Uint8Array
    | ArrayBuffer
    | Blob
    | string;

/**
 * Verifies that an unknown stream is file-stream-like for usage in new Response
 *
 * @param {unknown} stream
 */
export function verifyFileStream (stream: unknown): asserts stream is FileStreamLike {
    if (
        stream instanceof ReadableStream ||
        stream instanceof Uint8Array ||
        stream instanceof ArrayBuffer ||
        (typeof Blob !== 'undefined' && stream instanceof Blob) ||
        typeof stream === 'string'
    ) return;

    const type = Object.prototype.toString.call(stream);
    throw new Error(`verifyFileStream: Unsupported stream type (${type}) for response`);
}
