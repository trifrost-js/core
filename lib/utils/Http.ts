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
                    encoded += encodeURIComponent(char);
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
