import {isIntBetween, isIntGt} from '@valkyriestudios/utils/number';
import {isNeString} from '@valkyriestudios/utils/string';

const HEX_LUT = [
    '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0a', '0b', '0c', '0d', '0e', '0f', // eslint-disable-line prettier/prettier
    '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d', '1e', '1f', // eslint-disable-line prettier/prettier
    '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '2a', '2b', '2c', '2d', '2e', '2f', // eslint-disable-line prettier/prettier
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b', '3c', '3d', '3e', '3f', // eslint-disable-line prettier/prettier
    '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f', // eslint-disable-line prettier/prettier
    '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '5a', '5b', '5c', '5d', '5e', '5f', // eslint-disable-line prettier/prettier
    '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d', '6e', '6f', // eslint-disable-line prettier/prettier
    '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '7a', '7b', '7c', '7d', '7e', '7f', // eslint-disable-line prettier/prettier
    '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '8f', // eslint-disable-line prettier/prettier
    '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f', // eslint-disable-line prettier/prettier
    'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', // eslint-disable-line prettier/prettier
    'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd', 'be', 'bf', // eslint-disable-line prettier/prettier
    'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf', // eslint-disable-line prettier/prettier
    'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db', 'dc', 'dd', 'de', 'df', // eslint-disable-line prettier/prettier
    'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef', // eslint-disable-line prettier/prettier
    'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'fa', 'fb', 'fc', 'fd', 'fe', 'ff', // eslint-disable-line prettier/prettier
];

export function hexId(lng: number): string {
    if (!isIntGt(lng, 0)) return '';

    switch (lng) {
        case 8: {
            const a = (Math.random() * 0xffffffff) >>> 0;
            const b = (Math.random() * 0xffffffff) >>> 0;
            return (
                HEX_LUT[a & 0xff] +
                HEX_LUT[(a >>> 8) & 0xff] +
                HEX_LUT[(a >>> 16) & 0xff] +
                HEX_LUT[(a >>> 24) & 0xff] +
                HEX_LUT[b & 0xff] +
                HEX_LUT[(b >>> 8) & 0xff] +
                HEX_LUT[(b >>> 16) & 0xff] +
                HEX_LUT[(b >>> 24) & 0xff]
            );
        }
        case 16: {
            const a = (Math.random() * 0xffffffff) >>> 0;
            const b = (Math.random() * 0xffffffff) >>> 0;
            const c = (Math.random() * 0xffffffff) >>> 0;
            const d = (Math.random() * 0xffffffff) >>> 0;
            return (
                HEX_LUT[a & 0xff] +
                HEX_LUT[(a >>> 8) & 0xff] +
                HEX_LUT[(a >>> 16) & 0xff] +
                HEX_LUT[(a >>> 24) & 0xff] +
                HEX_LUT[b & 0xff] +
                HEX_LUT[(b >>> 8) & 0xff] +
                HEX_LUT[(b >>> 16) & 0xff] +
                HEX_LUT[(b >>> 24) & 0xff] +
                HEX_LUT[c & 0xff] +
                HEX_LUT[(c >>> 8) & 0xff] +
                HEX_LUT[(c >>> 16) & 0xff] +
                HEX_LUT[(c >>> 24) & 0xff] +
                HEX_LUT[d & 0xff] +
                HEX_LUT[(d >>> 8) & 0xff] +
                HEX_LUT[(d >>> 16) & 0xff] +
                HEX_LUT[(d >>> 24) & 0xff]
            );
        }
        default: {
            let out = '';
            for (let i = 0; i < lng; i++) {
                out += HEX_LUT[(Math.random() * 256) | 0];
            }
            return out;
        }
    }
}

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
    if (typeof env !== 'object') return 3000;
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
