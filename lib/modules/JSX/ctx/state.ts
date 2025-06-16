import {getActiveCtx} from './use';

export function state <T = unknown> (key:string):T|undefined {
    return getActiveCtx()?.state?.[key];
}
