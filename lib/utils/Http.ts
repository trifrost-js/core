const enc = new TextEncoder();

/* eslint-disable array-element-newline */
export const TRANSLITERATOR: Record<string, string> = {
    /* German */
    Ä: 'A', Ö: 'O', Ü: 'U', ö: 'o', ß: 'ss',
    /* French / Latin */
    à: 'a', á: 'a', â: 'a', ä: 'a', æ: 'ae', ç: 'c', é: 'e', è: 'e', ê: 'e', ë: 'e',
    î: 'i', ï: 'i', ô: 'o', œ: 'oe', ù: 'u', û: 'u', ü: 'u', ÿ: 'y', ñ: 'n',
    /* Nordic */
    Å: 'A', å: 'a', Ø: 'O', ø: 'o', Æ: 'Ae',
    /* Central / Eastern European */
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ś: 's', ź: 'z', ż: 'z', Ć: 'C', Ł: 'L', Ś: 'S', Ź: 'Z', Ż: 'Z',
    /* Cyrillic (RU/BG/UA common subset) */
    А: 'A', а: 'a', Б: 'B', б: 'b', В: 'V', в: 'v', Г: 'G', г: 'g', Д: 'D', д: 'd', Е: 'E', е: 'e', Ё: 'E', ё: 'e',
    Ж: 'Zh', ж: 'zh', З: 'Z', з: 'z', И: 'I', и: 'i', Й: 'Y', й: 'y', К: 'K', к: 'k', Л: 'L', л: 'l', М: 'M',
    м: 'm', Н: 'N', н: 'n', О: 'O', о: 'o', П: 'P', п: 'p', Р: 'R', р: 'r', С: 'S', с: 's', Т: 'T', т: 't', У: 'U',
    у: 'u', Ф: 'F', ф: 'f', Х: 'Kh', х: 'kh', Ц: 'Ts', ц: 'ts', Ч: 'Ch', ч: 'ch', Ш: 'Sh', ш: 'sh', Щ: 'Shch',
    щ: 'shch', Ъ: '', ъ: '', Ы: 'Y', ы: 'y', Ь: '', ь: '', Э: 'E', э: 'e', Ю: 'Yu', ю: 'yu', Я: 'Ya', я: 'ya',
    /* Greek */
    Α: 'A', α: 'a', Β: 'V', β: 'v', Γ: 'G', γ: 'g', Δ: 'D', δ: 'd', Ε: 'E', ε: 'e', Ζ: 'Z', ζ: 'z', Η: 'I',
    η: 'i', Θ: 'Th', θ: 'th', Ι: 'I', ι: 'i', Κ: 'K', κ: 'k', Λ: 'L', λ: 'l', Μ: 'M', μ: 'm', Ν: 'N', ν: 'n',
    Ξ: 'X', ξ: 'x', Ο: 'O', ο: 'o', Π: 'P', π: 'p', Ρ: 'R', ρ: 'r', Σ: 'S', σ: 's', ς: 's', Τ: 'T', τ: 't', Υ: 'Y', υ: 'y',
    Φ: 'F', φ: 'f', Χ: 'Ch', χ: 'ch', Ψ: 'Ps', ψ: 'ps', Ω: 'O', ω: 'o',
    /* Turkish */
    ğ: 'g', Ğ: 'G', ş: 's', Ş: 'S', İ: 'I', ı: 'i',
    /* Symbols */
    '©': '(c)', '®': '(r)', '™': '(tm)', '℠': '(sm)',
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
export function encodeFilename (val:string):{ascii:string; encoded:string} {
    if (typeof val !== 'string') return {ascii: '', encoded: ''};

    let ascii = '';
    let encoded = '';
    for (let i = 0; i < val.length; i++) {
        const code = val.charCodeAt(i);
        const char = val[i];

        /* Skip newlines and control chars */
        if (
            code >= 0x20 &&
            code !== 0x7F &&
            char !== '"'
        ) {
            /* ASCII: skip \ and ' */
            if (code <= 0x7E && char !== '\\' && char !== '\'') {
                ascii += char;
            } else if (code > 0x7E) {
                ascii += TRANSLITERATOR[char] || '';
            }

            switch (char) {
                case '*':
                    encoded += '%2A';
                    break;
                case '\'':
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
export function extractPartsFromUrl (url:string):{path:string; query:string} {
    if (typeof url !== 'string') return {path: '', query: ''};

    /* Strip fragment */
    const hashIdx = url.indexOf('#');
    if (hashIdx !== -1) url = url.slice(0, hashIdx);

    const proto_idx = url.indexOf('://') + 3;
    const path_idx = url.indexOf('/', proto_idx);
    const query_idx = url.indexOf('?', proto_idx);

    /* If no path but query exists right after domain */
    if (path_idx === -1) {
        return query_idx > proto_idx
            ? {path: '/', query: url.slice(query_idx + 1)}
            : {path: '/', query: ''};
    } else {
        return query_idx === -1
            ? {path: url.slice(path_idx), query: ''}
            : {path: url.slice(path_idx, query_idx), query: url.slice(query_idx + 1)};
    }
}

const MULTI_SEGMENT_TLDS = new Set([
    /* United Kingdom */
    'co.uk', 'ac.uk', 'gov.uk', 'org.uk', 'net.uk', 'ltd.uk', 'plc.uk',
    'me.uk', 'nhs.uk', 'sch.uk',
    /* Australia */
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'id.au', 'asn.au',
    /* Brazil */
    'com.br', 'net.br', 'org.br', 'gov.br', 'mil.br', 'edu.br',
    /* China */
    'com.cn', 'net.cn', 'gov.cn', 'org.cn', 'edu.cn',
    /* Hong Kong */
    'com.hk', 'edu.hk', 'gov.hk', 'idv.hk', 'net.hk', 'org.hk',
    /* Japan */
    'co.jp', 'ne.jp', 'or.jp', 'go.jp', 'ac.jp', 'ad.jp', 'ed.jp',
    /* South Korea */
    'co.kr', 'ne.kr', 'or.kr', 're.kr', 'go.kr', 'mil.kr', 'ac.kr',
    /* Taiwan */
    'com.tw', 'net.tw', 'org.tw', 'edu.tw', 'gov.tw', 'mil.tw',
    /* India */
    'co.in', 'net.in', 'org.in', 'firm.in', 'gen.in', 'ind.in',
    /* New Zealand */
    'co.nz', 'net.nz', 'org.nz', 'govt.nz', 'ac.nz', 'geek.nz', 'maori.nz', 'iwi.nz',
    /* Singapore */
    'com.sg', 'net.sg', 'org.sg', 'edu.sg', 'gov.sg', 'per.sg',
    /* South Africa */
    'co.za', 'net.za', 'org.za', 'gov.za',
    /* Canada */
    'gc.ca',
    /* US Federal */
    'ci.us', 'lib.tx.us', 'k12.tx.us', 'cc.ca.us', 'state.ca.us', 'pvt.k12.ma.us', 'cog.va.us',
]);

const RGX_DOMAIN = /^(?:https?:\/\/)?(?:www\d?\.)?((?:[\w-]+\.)+[\w-]+)(?::\d+)?(?:\/|$)/i;
const RGX_DOMAIN_IP = /^[\d.:]+$/;

/**
 * Attempts to extract the effective domain from a given host.
 *
 * Strips common subdomains like www or numerical prefixes (e.g., www2.),
 * and skips IPs or localhost.
 *
 * Examples:
 * - "www.example.com" → "example.com"
 * - "api.dev.example.co.uk" → "example.co.uk"
 * - "localhost" → null
 * - "192.168.0.1" → null
 */
export function extractDomainFromHost (raw:string|null):string|null {
    if (
        typeof raw !== 'string' ||
        !raw.length ||
        raw === 'localhost' ||
        RGX_DOMAIN_IP.test(raw) ||
        raw[0] === '['
    ) return null;

    /* Verify domain */
    const match = (raw[raw.length - 1] === '.' ? raw.slice(0, -1) : raw).match(RGX_DOMAIN);
    if (!match || typeof match[1] !== 'string') return null;

    const parts = match[1].toLowerCase().split('.');
    const len = parts.length;
    const last_two = parts[len - 2] + '.' + parts[len - 1];

    return MULTI_SEGMENT_TLDS.has(last_two) && len > 2
        ? parts[len - 3] + '.' + last_two
        : last_two;
}
