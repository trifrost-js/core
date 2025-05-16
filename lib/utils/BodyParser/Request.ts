import {toObject} from '@valkyriestudios/utils/formdata';
import {isString} from '@valkyriestudios/utils/string';
import {type TriFrostContext} from '../../types/context';
import {MimeTypes} from '../../types/constants';
import {type ParsedBody} from './types';

/**
 * Parses a raw request into an object for use on a trifrost context
 */
export async function parseBody <T extends ParsedBody = ParsedBody> (
    ctx:TriFrostContext,
    req:Request|null
):Promise<T> {
    if (!(req instanceof Request)) return {} as T;
    const type = isString(ctx.headers?.['content-type'])
        ? ctx.headers['content-type'].split(';', 1)[0].trim().toLowerCase()
        : '';

    try {
        switch (type) {
            case MimeTypes.JSON:
            case MimeTypes.JSON_TEXT:
            case MimeTypes.JSON_LD: {
                const body = await req.json() as T;
                return body;
            }
            case MimeTypes.JSON_ND: {
                const text = await req.text();
                try {
                    const result = text.trim().split('\n').map(line => JSON.parse(line));
                    return {raw: result} as T;
                } catch (err: any) {
                    ctx.logger.debug('parseBody: Failed to parse', {type, msg: err.message});
                    return {} as T;
                }
            }
            case MimeTypes.HTML:
            case MimeTypes.TEXT:
            case MimeTypes.CSV:
            case MimeTypes.XML:
            case MimeTypes.XML_TEXT: {
                const body = await req.text();
                return {raw: body} as T;
            }
            case MimeTypes.FORM_URLENCODED:
            case MimeTypes.FORM_MULTIPART: {
                const body = await req.formData();
                return toObject(body) as T;
            }
            default: {
                const body = await req.arrayBuffer();
                return {raw: body} as T;
            }
        }
    } catch (err:any) {
        ctx.logger.debug('parseBody: Failed to parse', {type, msg: err.message});
        return {} as T;
    }
}