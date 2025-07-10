const enc = new TextEncoder();

export const TRANSLITERATOR: Record<string, string> = {
    /* German */
    Ä: 'A',
    Ö: 'O',
    Ü: 'U',
    ö: 'o',
    ß: 'ss',
    /* French / Latin */
    à: 'a',
    á: 'a',
    â: 'a',
    ä: 'a',
    æ: 'ae',
    ç: 'c',
    é: 'e',
    è: 'e',
    ê: 'e',
    ë: 'e',
    î: 'i',
    ï: 'i',
    ô: 'o',
    œ: 'oe',
    ù: 'u',
    û: 'u',
    ü: 'u',
    ÿ: 'y',
    ñ: 'n',
    /* Nordic */
    Å: 'A',
    å: 'a',
    Ø: 'O',
    ø: 'o',
    Æ: 'Ae',
    /* Central / Eastern European */
    ą: 'a',
    ć: 'c',
    ę: 'e',
    ł: 'l',
    ń: 'n',
    ś: 's',
    ź: 'z',
    ż: 'z',
    Ć: 'C',
    Ł: 'L',
    Ś: 'S',
    Ź: 'Z',
    Ż: 'Z',
    /* Cyrillic (RU/BG/UA common subset) */
    А: 'A',
    а: 'a',
    Б: 'B',
    б: 'b',
    В: 'V',
    в: 'v',
    Г: 'G',
    г: 'g',
    Д: 'D',
    д: 'd',
    Е: 'E',
    е: 'e',
    Ё: 'E',
    ё: 'e',
    Ж: 'Zh',
    ж: 'zh',
    З: 'Z',
    з: 'z',
    И: 'I',
    и: 'i',
    Й: 'Y',
    й: 'y',
    К: 'K',
    к: 'k',
    Л: 'L',
    л: 'l',
    М: 'M',
    м: 'm',
    Н: 'N',
    н: 'n',
    О: 'O',
    о: 'o',
    П: 'P',
    п: 'p',
    Р: 'R',
    р: 'r',
    С: 'S',
    с: 's',
    Т: 'T',
    т: 't',
    У: 'U',
    у: 'u',
    Ф: 'F',
    ф: 'f',
    Х: 'Kh',
    х: 'kh',
    Ц: 'Ts',
    ц: 'ts',
    Ч: 'Ch',
    ч: 'ch',
    Ш: 'Sh',
    ш: 'sh',
    Щ: 'Shch',
    щ: 'shch',
    Ъ: '',
    ъ: '',
    Ы: 'Y',
    ы: 'y',
    Ь: '',
    ь: '',
    Э: 'E',
    э: 'e',
    Ю: 'Yu',
    ю: 'yu',
    Я: 'Ya',
    я: 'ya',
    /* Greek */
    Α: 'A',
    α: 'a',
    Β: 'V',
    β: 'v',
    Γ: 'G',
    γ: 'g',
    Δ: 'D',
    δ: 'd',
    Ε: 'E',
    ε: 'e',
    Ζ: 'Z',
    ζ: 'z',
    Η: 'I',
    η: 'i',
    Θ: 'Th',
    θ: 'th',
    Ι: 'I',
    ι: 'i',
    Κ: 'K',
    κ: 'k',
    Λ: 'L',
    λ: 'l',
    Μ: 'M',
    μ: 'm',
    Ν: 'N',
    ν: 'n',
    Ξ: 'X',
    ξ: 'x',
    Ο: 'O',
    ο: 'o',
    Π: 'P',
    π: 'p',
    Ρ: 'R',
    ρ: 'r',
    Σ: 'S',
    σ: 's',
    ς: 's',
    Τ: 'T',
    τ: 't',
    Υ: 'Y',
    υ: 'y',
    Φ: 'F',
    φ: 'f',
    Χ: 'Ch',
    χ: 'ch',
    Ψ: 'Ps',
    ψ: 'ps',
    Ω: 'O',
    ω: 'o',
    /* Turkish */
    ğ: 'g',
    Ğ: 'G',
    ş: 's',
    Ş: 'S',
    İ: 'I',
    ı: 'i',
    /* Symbols */
    '©': '(c)',
    '®': '(r)',
    '™': '(tm)',
    '℠': '(sm)',
};

/**
 * Encodes a filename for safe usage according to RFC6266
 * @see https://www.rfc-editor.org/rfc/rfc6266
 * eg:
 * encodeFilename('Straße_(draft)*v1.0.pdf')
 * → {
 *   ascii: 'Strasse_(draft)*v1.0.pdf',
 *   encoded: 'Stra%C3%9Fe_%28draft%29%2Av1.0.pdf'
 * }
 *
 * @param {string} val - Name to encode
 */
export function encodeFilename(val: string): {ascii: string; encoded: string} {
    if (typeof val !== 'string') return {ascii: '', encoded: ''};

    let ascii = '';
    let encoded = '';
    for (let i = 0; i < val.length; i++) {
        const code = val.charCodeAt(i);
        const char = val[i];

        /* Skip newlines and control chars */
        if (code >= 0x20 && code !== 0x7f && char !== '"') {
            /* ASCII: skip \ and ' */
            if (code <= 0x7e && char !== '\\' && char !== "'") {
                ascii += char;
            } else if (code > 0x7e) {
                ascii += TRANSLITERATOR[char] || '';
            }

            switch (char) {
                case '*':
                    encoded += '%2A';
                    break;
                case "'":
                    encoded += '%27';
                    break;
                case '(':
                    encoded += '%28';
                    break;
                case ')':
                    encoded += '%29';
                    break;
                default:
                    try {
                        encoded += encodeURIComponent(char);
                    } catch {
                        /* Fallback to using text encoder */
                        const bytes = enc.encode(char);
                        for (const byte of bytes) encoded += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
                    }
                    break;
            }
        }
    }

    return {ascii, encoded};
}

/**
 * Extracts path and query from a provided url
 *
 * @param {string} url - URL to extract path and query from
 */
export function extractPartsFromUrl(url: string): {path: string; query: string} {
    if (typeof url !== 'string') return {path: '', query: ''};

    /* Strip fragment */
    const hashIdx = url.indexOf('#');
    if (hashIdx !== -1) url = url.slice(0, hashIdx);

    const proto_idx = url.indexOf('://') + 3;
    const path_idx = url.indexOf('/', proto_idx);
    const query_idx = url.indexOf('?', proto_idx);

    /* If no path but query exists right after domain */
    if (path_idx === -1) {
        return query_idx > proto_idx ? {path: '/', query: url.slice(query_idx + 1)} : {path: '/', query: ''};
    } else {
        return query_idx === -1
            ? {path: url.slice(path_idx), query: ''}
            : {path: url.slice(path_idx, query_idx), query: url.slice(query_idx + 1)};
    }
}

const MULTI_SEGMENT_TLDS: Record<string, number> = {
    /* United Kingdom */
    'co.uk': 1, 'ac.uk': 1, 'gov.uk': 1, 'org.uk': 1, 'net.uk': 1, 'ltd.uk': 1, 'plc.uk': 1, 'me.uk': 1, 'nhs.uk': 1, 'sch.uk': 1, /* eslint-disable-line prettier/prettier */
    /* Australia */
    'com.au': 1, 'net.au': 1, 'org.au': 1, 'edu.au': 1, 'gov.au': 1, 'id.au': 1, 'asn.au': 1, /* eslint-disable-line prettier/prettier */
    /* Brazil */
    'com.br': 1, 'net.br': 1, 'org.br': 1, 'gov.br': 1, 'mil.br': 1, 'edu.br': 1, /* eslint-disable-line prettier/prettier */
    /* China */
    'com.cn': 1, 'net.cn': 1, 'gov.cn': 1, 'org.cn': 1, 'edu.cn': 1, /* eslint-disable-line prettier/prettier */
    /* Hong Kong */
    'com.hk': 1, 'edu.hk': 1, 'gov.hk': 1, 'idv.hk': 1, 'net.hk': 1, 'org.hk': 1, /* eslint-disable-line prettier/prettier */
    /* Japan */
    'co.jp': 1, 'ne.jp': 1, 'or.jp': 1, 'go.jp': 1, 'ac.jp': 1, 'ad.jp': 1, 'ed.jp': 1, /* eslint-disable-line prettier/prettier */
    /* South Korea */
    'co.kr': 1, 'ne.kr': 1, 'or.kr': 1, 're.kr': 1, 'go.kr': 1, 'mil.kr': 1, 'ac.kr': 1, /* eslint-disable-line prettier/prettier */
    /* Taiwan */
    'com.tw': 1, 'net.tw': 1, 'org.tw': 1, 'edu.tw': 1, 'gov.tw': 1, 'mil.tw': 1, /* eslint-disable-line prettier/prettier */
    /* India */
    'co.in': 1, 'net.in': 1, 'org.in': 1, 'firm.in': 1, 'gen.in': 1, 'ind.in': 1, /* eslint-disable-line prettier/prettier */
    /* New Zealand */
    'co.nz': 1, 'net.nz': 1, 'org.nz': 1, 'govt.nz': 1, 'ac.nz': 1, 'geek.nz': 1, 'maori.nz': 1, 'iwi.nz': 1, /* eslint-disable-line prettier/prettier */
    /* Singapore */
    'com.sg': 1, 'net.sg': 1, 'org.sg': 1, 'edu.sg': 1, 'gov.sg': 1, 'per.sg': 1, /* eslint-disable-line prettier/prettier */
    /* South Africa */
    'co.za': 1, 'net.za': 1, 'org.za': 1, 'gov.za': 1, /* eslint-disable-line prettier/prettier */
    /* Canada */
    'gc.ca': 1,
    /* US Federal */
    'ci.us': 1, 'lib.tx.us': 1, 'k12.tx.us': 1, 'cc.ca.us': 1, 'state.ca.us': 1, 'pvt.k12.ma.us': 1, 'cog.va.us': 1, /* eslint-disable-line prettier/prettier */
} as const;

const KNOWN_NODOMAIN: Record<string, number> = {
    localhost: 1,
    '0.0.0.0': 1,
    '::1': 1,
    '127.0.0.1': 1,
    'host.docker.internal': 1,
    'localhost.localdomain': 1,
    /* RFC 6761 reserved */
    test: 1,
    example: 1,
    invalid: 1,
    local: 1,
} as const;

/**
 * Extracts the effective domain from a given host
 */
export function extractDomainFromHost(raw: string | null): string | null {
    if (typeof raw !== 'string' || !raw || KNOWN_NODOMAIN[raw] || raw[0] === '[') return null;

    let host = raw;

    /* Start from proto */
    const proto = raw.indexOf('://');
    if (proto >= 0) host = raw.slice(proto + 3);

    /* Trim everything after first `/`, if any */
    const slash = host.indexOf('/');
    if (slash >= 0) host = host.slice(0, slash);

    /* End at port */
    const end = host.indexOf(':');
    if (end >= 0) host = host.slice(0, end);

    /* Remove trailing dot */
    const last = host.charCodeAt(host.length - 1);
    if (last === 46) host = host.slice(0, -1);

    /* Verify ip */
    let isIP = true;
    for (let i = 0; i < raw.length; i++) {
        const c = raw.charCodeAt(i);
        if ((c < 48 || c > 57) && c !== 46) {
            isIP = false;
            break;
        }
    }
    if (isIP) return null;

    host = host.toLowerCase();

    const parts = host.split('.');
    const len = parts.length;
    if (len < 2 || !parts[len - 2] || !parts[len - 1]) return null;

    const lastTwo = parts[len - 2] + '.' + parts[len - 1];
    return len > 2 && MULTI_SEGMENT_TLDS[lastTwo] ? parts[len - 3] + '.' + lastTwo : lastTwo;
}
