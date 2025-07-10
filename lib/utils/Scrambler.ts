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
];

const PII = [
    {global: 'first_name'},
    {global: 'last_name'},
    {global: 'full_name'},
    /* Email */
    {valuePattern: /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,10}\b/},
    /* Phone */
    {valuePattern: /\+?\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/},
    /* SSN */
    {valuePattern: /\b\d{3}-\d{2}-\d{4}\b/},
    /* Credit card */
    {valuePattern: /\b(?:\d[ -]?){13,16}\b/},
];

const INFRA = [
    /* GitHub personal access token */
    {valuePattern: /gh[pousr]_[A-Za-z0-9]{20,64}/},
    /* Stripe secret key */
    {valuePattern: /sk_live_[A-Za-z0-9]{24,64}/},
    /* AWS access keys (starts with AKIA or ASIA, 20+ chars) */
    {valuePattern: /AKIA[0-9A-Z]{10,64}/},
    {valuePattern: /ASIA[0-9A-Z]{10,64}/},
    /* Google API key (starts with AIza, 39 chars) */
    {valuePattern: /AIZA[0-9A-Za-z-_]{32,64}/},
    /* Generic long tokens (e.g. JWTs, API keys) */
    {valuePattern: /\b[a-f0-9]{32,64}\b/},
    {valuePattern: /Bearer\s+[A-Za-z0-9-_]+\b/},
];

export const OMIT_PRESETS = {
    default: deepFreeze([...SENSITIVE, ...PII, ...INFRA]),
    sensitive: deepFreeze([...SENSITIVE]),
    pii: deepFreeze([...PII]),
    infra: deepFreeze([...INFRA]),
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
            const len = input.length;
            const result = new Array(len);
            for (let i = 0; i < len; i++) {
                const val = input[i];
                if (typeof val === 'string' && values?.test(val)) {
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
                const n_path = path ? path + '.' + key : key;
                switch (typeof val) {
                    case 'string':
                    case 'number': {
                        if ((paths !== null && paths.has(n_path) === true) || (props !== null && props.has(key) === true)) {
                            if (!result) result = {...input};
                            result![key] = repl;
                        } else if (values) {
                            const n_val = String(val);
                            if (values?.test(n_val)) {
                                const r_val = n_val.replaceAll(values, repl);
                                if (n_val !== r_val) {
                                    if (!result) result = {...input};
                                    result![key] = r_val;
                                }
                            }
                        }
                        break;
                    }
                    case 'object': {
                        const updated = walk(val, n_path);
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
