function assign(acc: Record<string, unknown>, key: string, val: Date | number | string | boolean | null) {
    const existing = acc[key];
    if (existing === undefined) {
        acc[key] = val;
    } else if (Array.isArray(existing)) {
        existing.push(val);
    } else {
        acc[key] = [existing, val];
    }
}

export function toObject<T extends Record<string, unknown>>(query: string): T {
    if (typeof query !== 'string') throw new Error('query/toObject: Value must be a string');
    if (query[0] === '?') query = query.slice(1);
    if (!query) return {} as T;

    const params = new URLSearchParams(query);
    const acc: Record<string, unknown> = {};
    for (const [key, val] of params) {
        const normalized = val.trim();
        if (normalized !== '') {
            if (normalized.length <= 5) {
                switch (normalized.toLowerCase()) {
                    case 'true':
                        assign(acc, key, true);
                        continue;
                    case 'false':
                        assign(acc, key, false);
                        continue;
                    case 'null':
                        assign(acc, key, null);
                        continue;
                    default:
                        break;
                }
            }

            if (normalized[4] === '-' && normalized[7] === '-' && normalized[10] === 'T') {
                const date = new Date(normalized);
                if (!isNaN(date as unknown as number)) {
                    assign(acc, key, date);
                    continue;
                }
            }

            if (normalized[0] !== '0') {
                const num = Number(normalized);
                if (Number.isFinite(num)) {
                    assign(acc, key, num);
                    continue;
                }
            }

            assign(acc, key, normalized);
        }
    }

    return acc as T;
}

export default toObject;
