import {getActiveCtx} from './use';

export function env <T = any> (key:string):T|undefined {
    return getActiveCtx()?.env?.[key];
}
