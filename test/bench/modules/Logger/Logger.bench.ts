import {bench, describe} from 'vitest';

const valid = '0123456789abcdef0123456789abcdef';
const invalid = '0123456789ABCDEF0123456789ABCDEF';

function isValidTraceIdOriginal(str: string): boolean {
    if (str.length !== 32) return false;

    for (let i = 0; i < 32; i++) {
        switch (str.charCodeAt(i)) {
            case 48:
            case 49:
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 56:
            case 57: // '0'-'9'
            case 97:
            case 98:
            case 99:
            case 100:
            case 101:
            case 102: // 'a'-'f'
                continue;
            default:
                return false;
        }
    }
    return true;
}

function isValidTraceIdOptimized(str: string): boolean {
    if (str.length !== 32) return false;

    let c: number;
    let i = 32;
    while (--i >= 0) {
        c = str.charCodeAt(i);
        if ((c < 48 || c > 57) && (c < 97 || c > 102)) return false;
    }
    return true;
}

describe('Benchmark - isValidTraceId', () => {
    describe('valid input', () => {
        bench('original', () => {
            isValidTraceIdOriginal(valid);
        });

        bench('optimized', () => {
            isValidTraceIdOptimized(valid);
        });
    });

    describe('invalid input', () => {
        bench('original', () => {
            isValidTraceIdOriginal(invalid);
        });

        bench('optimized', () => {
            isValidTraceIdOptimized(invalid);
        });
    });
});
