import {isInt} from '@valkyriestudios/utils/number';
import {toObject} from '@valkyriestudios/utils/formdata';
import {type TriFrostContext} from '../../types/context';
import {type MimeType, MimeTypes} from '../../types/constants';
import {type TriFrostBodyParserFormOptions, type TriFrostBodyParserOptions, type ParsedBody} from './types';

const encoder = new TextEncoder();
const enc_newline = encoder.encode('\r\n');
const enc_double_newline = encoder.encode('\r\n\r\n');
const decoders: Record<string, TextDecoder> = {};

const RGX_BOUNDARY = /boundary=([^;]+)/;
const RGX_NAME = /name="([^"]+)"/;
const RGX_FILENAME = /filename="([^"]*)"/;
const RGX_CHARSET = /charset=([^;\s]+)/i;

/**
 * Simple Uint8Array indexOf implementation
 */
function indexOf(haystack: Uint8Array, needle: Uint8Array, start = 0): number {
    outer: for (let i = start; i <= haystack.length - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) continue outer;
        }
        return i;
    }
    return -1;
}

/**
 * Decodes a uint8array buffer with the provided decoder and
 * potentially strips byte-order-marks prepended to the text
 */
function decode(dec: TextDecoder, buf: Uint8Array) {
    const text = dec.decode(buf);
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Returns true/false if the buffer size is bigger than the type limit, falling back to
 * checking against the fallback limit
 *
 * @param {TriFrostContext} ctx - TriFrost Context
 * @param {Uint8Array} buf - Buffer to check against
 * @param {number|undefined} typeLim - Type limit
 * @param {number|undefined} globalLim - Global limit
 */
function isAboveLimit(ctx: TriFrostContext, buf: Uint8Array, typeLim: number | undefined, globalLim?: number | undefined) {
    const bufLength = buf.byteLength;
    if (isInt(typeLim)) {
        if (bufLength > typeLim) {
            ctx.logger.debug('parseBody: too large', {size: bufLength, limit: typeLim});
            return true;
        }

        return false;
    }

    if (isInt(globalLim) && bufLength > globalLim) {
        ctx.logger.debug('parseBody: too large', {size: bufLength, limit: globalLim});
        return true;
    }

    return false;
}

/**
 * Parses multipart/form-data from a Uint8Array and returns a FormData (binary-safe)
 */
export async function parseMultipart(
    ctx: TriFrostContext,
    bytes: Uint8Array,
    boundary: string,
    decoder: TextDecoder,
    config: TriFrostBodyParserFormOptions,
): Promise<FormData> {
    const form = new FormData();
    const files: string[] = [];
    const files_allowed: Set<MimeType> | null = Array.isArray(config.files?.types) ? new Set(config.files.types) : null;
    const delimiter = encoder.encode('--' + boundary);

    /* Get start index using delimiter */
    let start = indexOf(bytes, delimiter);
    if (start === -1) return form;

    start += delimiter.length + enc_newline.length;
    while (start < bytes.length) {
        const end_idx = indexOf(bytes, delimiter, start);
        if (end_idx === -1) break;

        /* trim trailing \r\n */
        const part = bytes.subarray(start, end_idx - 2);
        const header_end_idx = indexOf(part, enc_double_newline);
        if (header_end_idx === -1) {
            start = end_idx + delimiter.length + enc_newline.length;
            continue;
        }

        const content = part.subarray(header_end_idx + 4) as Uint8Array<ArrayBuffer>;

        let disposition: string | null = null;
        let type: string | null = null;
        let part_decoder = decoder;
        const header_lines = decoder.decode(part.subarray(0, header_end_idx)).split('\r\n');
        for (let i = 0; i < header_lines.length; i++) {
            const [key, ...val_parts] = header_lines[i].split(':');
            switch (key.trim().toLowerCase()) {
                case 'content-disposition':
                    disposition = val_parts.join(':').trim();
                    break;
                case 'content-type': {
                    type = val_parts.join(':').trim();
                    /* Determine part decoder */
                    const charset_match = type.match(RGX_CHARSET);
                    if (charset_match) {
                        const charset = charset_match[1].trim().toLowerCase();
                        if (decoders[charset]) {
                            part_decoder = decoders[charset];
                        } else {
                            part_decoder = new TextDecoder(charset, {ignoreBOM: true, fatal: true});
                            decoders[charset] = part_decoder;
                        }
                    }
                    break;
                }
                default:
                    break;
            }
        }

        /* Get name of the value */
        const name_match = (disposition || '').match(RGX_NAME);
        if (name_match) {
            const name = name_match[1];

            /**
             * Get potential file name, if file name is found it means we've hit a file.
             * Otherwise we're dealing with a raw value
             */
            const filename_match = disposition!.match(RGX_FILENAME);
            if (filename_match) {
                const filename = filename_match[1];
                if (config.files === null) {
                    /* Option: skip files entirely */
                    ctx.logger.debug('parseBody@multipart: skipping file due to allowFiles=false', {name, filename});
                } else if (isInt(config.files?.maxCount) && files.length >= config.files!.maxCount) {
                    /* Option: Max file count */
                    ctx.logger.debug('parseBody@multipart: file skipped due to maxFileCount', {filename});
                } else if (isInt(config.files?.maxSize) && content.length > config.files!.maxSize) {
                    /* Option: Max file size */
                    ctx.logger.debug('parseBody@multipart: file too large', {filename, size: content.length});
                } else if (content.length > 0) {
                    try {
                        const n_type = (type || MimeTypes.BINARY) as MimeType;
                        /* Option: Allowed file types */

                        if (files_allowed && !files_allowed.has(n_type)) {
                            ctx.logger.debug('parseBody@multipart: disallowed type', {filename, type: n_type, size: content.length});
                        } else {
                            form.append(name, new File([content], filename, {type: n_type}));
                            files.push(filename);
                        }
                    } catch (err: any) {
                        ctx.logger.debug('parseBody@multipart: Failed to create File', {msg: err.message, filename, type});
                    }
                } else {
                    ctx.logger.debug('parseBody@multipart: Empty file skipped', {name, filename});
                }
            } else {
                form.append(name, decode(part_decoder, content));
            }
        }

        /* Continue to next chunk in array */
        start = end_idx + delimiter.length + enc_newline.length;
    }

    return form;
}

/**
 * Parses a raw body into an object for use on a trifrost context
 */
export async function parseBody<T extends ParsedBody = ParsedBody>(
    ctx: TriFrostContext,
    buf: Uint8Array,
    config: TriFrostBodyParserOptions,
): Promise<T | null> {
    if (!(buf instanceof Uint8Array)) return {} as T;

    const raw_type = typeof ctx.headers?.['content-type'] === 'string' ? ctx.headers['content-type'] : '';
    const [mime, ...params] = raw_type.split(';');
    const type = mime.trim().toLowerCase();

    /* Determine charset */
    let charset = 'utf-8';
    for (let i = 0; i < params.length; i++) {
        const [k, v] = params[i].trim().split('=');
        if (k.toLowerCase() === 'charset' && v) {
            charset = v.trim().toLowerCase();
            break;
        }
    }

    try {
        /* Get decoder */
        let strict_decoder: TextDecoder;
        if (charset in decoders) {
            strict_decoder = decoders[charset];
        } else {
            strict_decoder = new TextDecoder(charset, {ignoreBOM: true, fatal: true});
            decoders[charset] = strict_decoder;
        }

        switch (type) {
            case MimeTypes.JSON:
            case MimeTypes.JSON_TEXT:
            case MimeTypes.JSON_LD:
                if (isAboveLimit(ctx, buf, config.json?.limit, config.limit)) return null;
                return JSON.parse(decode(strict_decoder, buf)) as T;
            case MimeTypes.JSON_ND: {
                if (isAboveLimit(ctx, buf, config.json?.limit, config.limit)) return null;
                const text = decode(strict_decoder, buf);
                const lines = text.trim().split('\n');
                const acc = [];
                for (let i = 0; i < lines.length; i++) acc.push(JSON.parse(lines[i]));
                return {raw: acc} as T;
            }
            case MimeTypes.HTML:
            case MimeTypes.TEXT:
            case MimeTypes.CSV:
            case MimeTypes.XML:
            case MimeTypes.XML_TEXT:
                if (isAboveLimit(ctx, buf, config.text?.limit, config.limit)) return null;
                return {raw: decode(strict_decoder, buf)} as T;
            case MimeTypes.FORM_URLENCODED: {
                if (isAboveLimit(ctx, buf, config.form?.limit, config.limit)) return null;
                const form = new FormData();
                const parts = decode(strict_decoder, buf).split('&');
                for (let i = 0; i < parts.length; i++) {
                    const [key, value] = parts[i].split('=');
                    if (key && value !== undefined) {
                        try {
                            form.append(decodeURIComponent(key), decodeURIComponent(value));
                        } catch {
                            ctx.logger.debug('parseBody@form: Failed to decode', {key, value});
                        }
                    }
                }
                return toObject<T>(form, {
                    raw: config.form?.normalizeRaw ?? [],
                    normalize_bool: config.form?.normalizeBool ?? true,
                    normalize_date: config.form?.normalizeDate ?? true,
                    normalize_null: config.form?.normalizeNull ?? true,
                    normalize_number: config.form?.normalizeNumber ?? false,
                });
            }
            case MimeTypes.FORM_MULTIPART: {
                if (isAboveLimit(ctx, buf, config.form?.limit, config.limit)) return null;

                const boundary = raw_type.match(RGX_BOUNDARY)?.[1];
                if (!boundary) throw new Error('multipart: Missing boundary');

                const form = await parseMultipart(ctx, buf, boundary, strict_decoder, config.form || {});
                return toObject(form, {
                    raw: config.form?.normalizeRaw ?? [],
                    normalize_bool: config.form?.normalizeBool ?? true,
                    normalize_date: config.form?.normalizeDate ?? true,
                    normalize_null: config.form?.normalizeNull ?? true,
                    normalize_number: config.form?.normalizeNumber ?? false,
                }) as T;
            }
            default:
                return isAboveLimit(ctx, buf, config.limit) ? null : ({raw: buf} as T);
        }
    } catch (err: any) {
        ctx.logger.debug('parseBody: Failed to parse', {type, msg: err.message});
        return {} as T;
    }
}
