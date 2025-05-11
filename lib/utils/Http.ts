/**
 * Encodes a filename for safe usage (in for example headers such as Content-Disposition)
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
    let ascii = '';
    let encoded = '';
    for (let i = 0; i < val.length; i++) {
        const char = val[i];

        /* Skip newlines and control chars */
        const code = char.charCodeAt(0);
        if (code < 0x20 || code === 0x7F || char === '"' || char === '\\') continue;

        /* ASCII fallback */
        ascii += code <= 0x7E ? char : '';

        /* EncodeURIComponent with patched chars */
        switch (char) {
            case '*':
                encoded += '%2A';
                break;
            case '\'':
            case '(':
            case ')':
                encoded += '%' + code.toString(16).toUpperCase();
                break;
            default:
                encoded += encodeURIComponent(char);
                break;
        }
    }

    return {ascii, encoded};
}

export function extractPartsFromUrl (url:string):{path:string; query:string} {
    if (typeof url !== 'string') return {path: '', query: ''};
    
    /* Find protocol end and path start */
    const proto_end_idx = url.indexOf('://') + 3;
    const path_start_idx = url.indexOf('/', proto_end_idx);

    let path = '/';
    let query = '';

    if (path_start_idx >= 0) {
        const query_idx = url.indexOf('?', path_start_idx);
        if (query_idx >= 0) {
            path = url.slice(path_start_idx, query_idx); /* Extract path up to '?' */
            query = url.slice(query_idx + 1); /* Extract query after '?' */
        } else {
            path = url.slice(path_start_idx); /* Extract entire path */
        }
    }

    return {path, query};
}