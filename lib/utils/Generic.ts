/**
 * Determines based on a provided env object whether or not we're running in dev mode
 * 
 * @param {Record<string, unknown>} env - Env object to check from
 */
export function isDevMode (env:Record<string, unknown>):boolean {
    if ('TRIFROST_DEV' in env) {
        switch (String(env.TRIFROST_DEV || '').toLowerCase()) {
            case 'false':
            case '0':
                return false;
            case 'true':
            case '1':
                return true;
        }
    }

    if ('NODE_ENV' in env) {
        const node_env = String(env.NODE_ENV || '').toLowerCase();
        if (node_env !== 'production') return true;
    }

    return false;
}