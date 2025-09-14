import {isIntBetween} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';

/**
 * Prepends the provided html string with Doctype if necessary
 *
 * @param {string} html - HTML string to prepend
 */
export function prependDocType(html: string) {
    if (typeof html !== 'string') return '';
    return html.startsWith('<html') ? '<!DOCTYPE html>' + html : html;
}

/**
 * Inject a value into a target before specific candidate markers
 * eg: injectBefore(html, '<script>blabla</script>', ['</head>', '</body>'])
 *
 * @param {string} target - Target to inject into
 * @param {string} val - Value to inject
 * @param {string[]} candidates - Candidate markers to inject before (fallback behavior)
 */
export function injectBefore(target: string, val: string, candidates: string[]) {
    for (let i = 0; i < candidates.length; i++) {
        const idx = target.indexOf(candidates[i]);
        if (idx >= 0) return target.slice(0, idx) + val + target.slice(idx);
    }
    return target;
}

/**
 * Determines based on a provided env object whether or not we're running in dev mode
 *
 * @param {Record<string, unknown>} env - Env object to check from
 */
export function isDevMode(env: Record<string, unknown>): boolean {
    if ('TRIFROST_DEV' in env) {
        switch (String(env.TRIFROST_DEV || '').toLowerCase()) {
            case 'false':
            case '0':
                return false;
            case 'true':
            case '1':
                return true;
            default:
                break;
        }
    }

    if ('NODE_ENV' in env) {
        const node_env = String(env.NODE_ENV || '').toLowerCase();
        if (node_env !== 'production') return true;
    }

    return false;
}

/**
 * Determines based on a provided env object and default value what the correct trustProxy value is
 *
 * @param {Record<string, unknown>} env - Env object to check from
 * @param {boolean} defaultTo - Default value if no env config is found
 */
export function determineTrustProxy(env: Record<string, unknown>, defaultTo: boolean): boolean {
    const val = env.TRIFROST_TRUSTPROXY ?? env.SERVICE_TRUSTPROXY ?? env.TRUSTPROXY;
    switch (String(val ?? '').toLowerCase()) {
        case 'false':
        case '0':
            return false;
        case 'true':
        case '1':
            return true;
        default:
            return defaultTo;
    }
}

/**
 * Determine name for telemetry
 * @note Otel specification requires name to be between 1 and 255 characters
 *
 * @param {Record<string, unknown>} env - Environment to check on
 */
export function determineName(env: Record<string, unknown>): string {
    const val = env.TRIFROST_NAME ?? env.SERVICE_NAME;
    return isNeString(val) && val.length <= 255 ? val.trim() : 'trifrost';
}

/**
 * Determine version for telemetry
 *
 * @param {Record<string, unknown>} env - Environment to check on
 */
export function determineVersion(env: Record<string, unknown>): string {
    const val = env.TRIFROST_VERSION ?? env.SERVICE_VERSION ?? env.VERSION;
    return isNeString(val) ? val.trim() : '1.0.0';
}

/**
 * Determine default port
 *
 * @param {Record<string, unknown>?} env - Environment to check on
 * @param {number|null?} port - Provided options port
 */
export function determinePort(env?: Record<string, unknown>, port?: number | null): number {
    if (isIntBetween(port, 1, 65535)) return port;
    if (Object.prototype.toString.call(env) !== '[object Object]') return 3000;
    let val = env?.TRIFROST_PORT ?? env?.SERVICE_PORT ?? env?.PORT;
    if (isNeString(val)) val = (val as unknown as number) | 0;
    if (isIntBetween(val, 1, 65535)) return val;
    return 3000;
}

/**
 * Determine host to bind or advertise
 *
 * @param {Record<string, unknown>} env - Environment to check on
 */
export function determineHost(env: Record<string, unknown>): string {
    const val = env?.TRIFROST_HOST ?? env?.SERVICE_HOST ?? env?.HOST;
    if (isNeString(val) && val.length <= 255) return val.trim();
    return '0.0.0.0';
}

/**
 * Determine debug mode
 *
 * @param {Record<string, unknown>} env - Environment to check on
 */
export function determineDebug(env: Record<string, unknown>): boolean {
    const val = env.TRIFROST_DEBUG ?? env.DEBUG ?? env.NODE_ENV;
    if (typeof val === 'string') {
        switch (val.toLowerCase()) {
            case 'true':
            case '1':
                return true;
            case 'false':
            case '0':
                return false;
            case 'production':
                return false;
            default:
                break;
        }
    } else if (val === true) {
        return true;
    }

    return false;
}
