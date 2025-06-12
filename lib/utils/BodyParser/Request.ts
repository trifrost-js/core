import {type ParsedBody, type TriFrostBodyParserOptions} from './types';
import {type TriFrostContext} from '../../types/context';
import {parseBody as uint8Parser} from './Uint8Array';

export async function parseBody <T extends ParsedBody = ParsedBody> (
    ctx:TriFrostContext,
    req:Request,
    config:TriFrostBodyParserOptions
):Promise<T|null> {
    if (!(req instanceof Request)) return {} as T;
    try {
        const buf = new Uint8Array(await req.arrayBuffer());
        return uint8Parser(ctx, buf, config);
    } catch (err:any) {
        ctx.logger.error(err);
        return {} as T;
    }
}
