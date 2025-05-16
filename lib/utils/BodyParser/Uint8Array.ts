/* eslint-disable max-statements,complexity,no-labels */

import {toObject} from '@valkyriestudios/utils/formdata';
import {isString} from '@valkyriestudios/utils/string';
import {type TriFrostContext} from '../../types/context';
import {MimeTypes} from '../../types/constants';
import {type ParsedBody} from './types';

const encoder = new TextEncoder();
const enc_newline = encoder.encode('\r\n');
const enc_double_newline = encoder.encode('\r\n\r\n');
const decoders:Record<string, TextDecoder> = {};

const RGX_BOUNDARY = /boundary=([^;]+)/;
const RGX_NAME = /name="([^"]+)"/;
const RGX_FILENAME = /filename="([^"]*)"/;
const RGX_CHARSET = /charset=([^;\s]+)/i;

/**
 * Simple Uint8Array indexOf implementation
 */
function indexOf (haystack: Uint8Array, needle: Uint8Array, start = 0): number {
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
function decode (dec:TextDecoder, buf:Uint8Array) {
    const text = dec.decode(buf);
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

/**
 * Parses multipart/form-data from a Uint8Array and returns a FormData (binary-safe)
 */
export async function parseMultipart (
    ctx:TriFrostContext,
    bytes:Uint8Array,
    boundary:string,
    decoder:TextDecoder
): Promise<FormData> {
    const form = new FormData();
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

        const content = part.subarray(header_end_idx + 4);

        let disposition:string|null = null;
        let type:string|null = null;
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
                if (content.length > 0) {
                    try {
                        form.append(
                            name,
                            new File([content], filename, {type: type || MimeTypes.BINARY})
                        );
                    } catch (err: any) {
                        ctx.logger.debug(
                            'parseBody@multipart: Failed to create File',
                            {msg: err.message, filename, type}
                        );
                    }
                } else {
                    ctx.logger.debug(
                        'parseBody@multipart: Empty file skipped',
                        {name, filename}
                    );
                }
            } else {
                form.append(
                    name,
                    decode(part_decoder, content)
                );
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
export async function parseBody <T extends ParsedBody = ParsedBody> (
    ctx:TriFrostContext,
    buf:Uint8Array
):Promise<T> {
    if (!(buf instanceof Uint8Array)) return {} as T;
    
    const raw_type = isString(ctx.headers?.['content-type'])
        ? ctx.headers['content-type']
        : '';
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
        let strict_decoder:TextDecoder;
        if (charset in decoders) {
            strict_decoder = decoders[charset];
        } else {
            strict_decoder = new TextDecoder(charset, {ignoreBOM: true, fatal: true});
            decoders[charset] = strict_decoder;
        }

        switch (type) {
            case MimeTypes.JSON:
            case MimeTypes.JSON_TEXT:
            case MimeTypes.JSON_LD: {
                return JSON.parse(decode(strict_decoder, buf)) as T;
            }
            case MimeTypes.JSON_ND: {
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
                return {raw: decode(strict_decoder, buf)} as T;
            case MimeTypes.FORM_URLENCODED: {
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
                return toObject(form) as T;
            }
            case MimeTypes.FORM_MULTIPART: {
                const boundary = raw_type.match(RGX_BOUNDARY)?.[1];
                if (!boundary) throw new Error('multipart: Missing boundary');
            
                const form = await parseMultipart(ctx, buf, boundary, strict_decoder);
                return toObject(form) as T;
            }
            default:
                return {raw: buf} as T;
        }
    } catch (err:any) {
        ctx.logger.debug('parseBody: Failed to parse', {type, msg: err.message});
        return {} as T;
    }
}
