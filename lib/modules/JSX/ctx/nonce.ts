import {getActiveCtx} from '../ctx/use';

export function nonce ():string|null {
    return getActiveCtx()?.nonce || null;
}
