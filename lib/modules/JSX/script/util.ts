const encoder = new TextEncoder();
const decoder = new TextDecoder();
const isIdent = (c: number) =>
    (c >= 97 && c <= 122) /* a-z */ ||
    (c >= 65 && c <= 90) /* A-Z */ ||
    (c >= 48 && c <= 57) /* 0-9 */ ||
    c === 95 ||
    c === 36; /* _ or $ */

export function atomicMinify(raw: string): string {
    const bytes = encoder.encode(raw);
    const out = new Uint8Array(bytes.length);
    let o = 0;
    let i = 0;
    let inStr = 0; /* 0 = none, 1 = ", 2 = ' */
    let inTpl = false;
    let prevIsIdent = false;
    let spaceNeeded = false;

    while (i < bytes.length) {
        const ch = bytes[i];
        const next = bytes[i + 1];

        /* Escape handling in strings and templates */
        if ((inStr || inTpl) && ch === 92 /* \ */) {
            out[o++] = ch;
            out[o++] = bytes[++i];
            i++;
            continue;
        }

        if (inTpl) {
            if (ch === 36 && next === 123) {
                /* Template expression entry: ${ */
                out[o++] = ch;
                out[o++] = bytes[++i];
                i++;

                // Inline minify inside ${...}
                let depth = 1;
                const exprStart = i;
                while (i < bytes.length && depth > 0) {
                    if (bytes[i] === 123) depth++;
                    else if (bytes[i] === 125) depth--;
                    i++;
                }

                const exprBytes = bytes.subarray(exprStart, i - 1);
                const expr = decoder.decode(exprBytes);
                const minified = encoder.encode(atomicMinify(expr));
                for (let j = 0; j < minified.length; j++) {
                    out[o++] = minified[j];
                }

                out[o++] = 125;
                continue;
            } else if (ch === 96) {
                inTpl = false;
            }
            out[o++] = ch;
            i++;
            continue;
        }

        /* Start of template */
        if (ch === 96) {
            inTpl = true;
            out[o++] = ch;
            i++;
            continue;
        }

        /* Quoted strings */
        if (ch === 34 || ch === 39) {
            if (!inStr) inStr = ch === 34 ? 1 : 2;
            else if ((inStr === 1 && ch === 34) || (inStr === 2 && ch === 39)) inStr = 0;
            out[o++] = ch;
            i++;
            continue;
        }

        if (inStr) {
            out[o++] = ch;
            i++;
            continue;
        }

        /* Comment stripping */
        if (ch === 47) {
            if (next === 47) {
                i += 2;
                while (i < bytes.length && bytes[i] !== 10) i++;
                continue;
            }

            if (next === 42) {
                i += 2;
                while (i + 1 < bytes.length && !(bytes[i] === 42 && bytes[i + 1] === 47)) i++;
                i += 2;
                continue;
            }

            /* Heuristic regex literal detection */
            const prevCh = out[o - 1];
            if (prevCh === 40 || prevCh === 61 || prevCh === 58 || prevCh === 44 || prevCh === 123) {
                out[o++] = ch;
                i++;
                while (i < bytes.length) {
                    const rc = bytes[i];
                    out[o++] = rc;
                    if (rc === 47 && bytes[i - 1] !== 92) {
                        i++;
                        break;
                    }
                    i++;
                }
                while (i < bytes.length && ((bytes[i] >= 97 && bytes[i] <= 122) || bytes[i] === 103)) {
                    out[o++] = bytes[i++];
                }
                continue;
            }
        }

        /* Whitespace */
        if (ch <= 32) {
            spaceNeeded = true;
            i++;
            continue;
        }

        const currIsIdent = isIdent(ch);
        if (spaceNeeded && prevIsIdent && currIsIdent) {
            out[o++] = 32;
        }
        spaceNeeded = false;

        switch (ch) {
            case 59: // ;
                if (next === 59) {
                    i++;
                    continue;
                }
            /* intentional fallthrough */
            case 123: // {
            case 125: // }
            case 40: // (
            case 41: // )
            case 61: // =
            case 43: // +
            case 45: // -
            case 42: // *
            case 47: // /
            case 58: // :
            case 44: // ,
            case 60: // <
            case 62: // >
            case 91: // [
            case 93: // ]
            case 33: // !
            case 63: // ?
            case 38: // &
            case 124: // `
                out[o++] = ch;
                i++;
                while (bytes[i] <= 32 && i < bytes.length) i++;
                prevIsIdent = false;
                continue;
        }

        out[o++] = ch;
        prevIsIdent = currIsIdent;
        i++;
    }

    return decoder.decode(out.subarray(0, o));
}
