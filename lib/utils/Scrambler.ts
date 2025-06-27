import {deepFreeze} from '@valkyriestudios/utils/deep';

const RGX_MALICIOUS = /__proto__|constructor|prototype/;

export type ScramblerValue = string | {global: string} | {valuePattern: RegExp};

export type Scrambler<T extends Record<string, any>> = (obj: T) => T;

type ScramblerOptions = {
    replacement?: string;
    checks?: ReturnType<typeof deepFreeze<ScramblerValue[]>>;
};

/**
 * Default TriFrost preset for sensitive data scrambling
 */
const SENSITIVE = [
    {global: 'access_token'},
    {global: 'api_key'},
    {global: 'api_secret'},
    {global: 'apikey'},
    {global: 'apitoken'},
    {global: 'auth'},
    {global: 'authorization'},
    {global: '$auth'},
    {global: 'client_secret'},
    {global: 'client_token'},
    {global: 'id_token'},
    {global: 'password'},
    {global: 'private_key'},
    {global: 'public_key'},
    {global: 'refresh_token'},
    {global: 'secret'},
    {global: 'session'},
    {global: 'session_id'},
    {global: 'sid'},
    {global: 'token'},
    {global: 'user_token'},
    /* Bearer token/jwt */
    {valuePattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/},
];

const PII = [
    {global: 'first_name'},
    {global: 'last_name'},
    {global: 'full_name'},
    /* Email */
    {valuePattern: /[\w.-]+@[\w.-]+\.\w{2,}/},
    /* Phone */
    {valuePattern: /\+?\d{1,2}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/},
    /* SSN */
    {valuePattern: /\b\d{3}-\d{2}-\d{4}\b/},
    /* Credit card */
    {valuePattern: /\b(?:\d[ -]*?){13,16}\b/},
];

export const OMIT_PRESETS = {
    default: deepFreeze([...SENSITIVE, ...PII]),
    sensitive: deepFreeze([...SENSITIVE]),
    pii: deepFreeze([...PII]),
};

/**
 * Create a reusable scrambler function with precompiled key + value pattern checks
 */
function createScrambler<T extends Record<string, any> = Record<string, any>>(options: ScramblerOptions = {}): Scrambler<T> {
    const repl = typeof options?.replacement === 'string' ? options.replacement : '***';
    const checks = Array.isArray(options?.checks) ? options.checks : [];

    let paths: Set<string> | null = new Set();
    let props: Set<string> | null = new Set();
    const valueRgx: RegExp[] = [];

    for (let i = 0; i < checks.length; i++) {
        const raw = checks[i];
        if (typeof raw === 'string') {
            if (!RGX_MALICIOUS.test(raw)) paths.add(raw);
        } else if (Object.prototype.toString.call(raw) === '[object Object]') {
            if ('global' in raw && typeof raw.global === 'string') {
                if (!RGX_MALICIOUS.test(raw.global)) props.add(raw.global);
            } else if ('valuePattern' in raw && raw.valuePattern instanceof RegExp) {
                valueRgx.push(raw.valuePattern);
            }
        }
    }

    const values = valueRgx.length
        ? new RegExp( valueRgx.reduce((acc, r, i) => acc + (i > 0 ? '|' : '') + r.source, ''), 'ig') // eslint-disable-line prettier/prettier
        : null;

    paths = paths.size ? paths : null;
    props = props.size ? props : null;

    function walk(input: any, path = ''): any {
        if (Array.isArray(input)) {
            let mutated = false;
            const result = new Array(input.length);
            for (let i = 0; i < input.length; i++) {
                const val = input[i];
                if (typeof val === 'string' && values) {
                    const updated = val.replaceAll(values, repl);
                    if (updated !== val) {
                        result[i] = updated;
                        mutated = true;
                    }
                } else {
                    const updated = walk(val, path);
                    if (updated !== val) mutated = true;
                    result[i] = updated;
                }
            }
            return mutated ? result : input;
        } else if (Object.prototype.toString.call(input) === '[object Object]') {
            let result: Record<string, any> | null = null;
            for (const key in input) {
                const val = input[key];
                const normalized_path = path ? path + '.' + key : key;
                const type = typeof val;

                switch (type) {
                    case 'string':
                    case 'number': {
                        if ((paths !== null && paths.has(normalized_path) === true) || (props !== null && props.has(key) === true)) {
                            if (!result) result = {...input};
                            result![key] = repl;
                        } else if (values) {
                            if (!result) result = {...input};
                            const normalized = String(val).replaceAll(values, repl);
                            if (normalized !== String(val)) result![key] = normalized;
                        }
                        break;
                    }
                    case 'object': {
                        const updated = walk(val, normalized_path);
                        if (updated !== val) {
                            if (!result) result = {...input};
                            result![key] = updated;
                        }
                        break;
                    }
                    default:
                        break;
                }
            }
            return result ? result : input;
        }

        return input;
    }

    return checks.length ? (obj: T) => walk(obj) as T : (obj: T) => obj;
}

export {createScrambler};
