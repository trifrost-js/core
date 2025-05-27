import {bench, describe} from 'vitest';
import {memoize} from '@valkyriestudios/utils/caching';
import {RouteTree} from '../../../lib/routing/Tree';
import {HttpMethods} from '../../../lib/types/constants';

/* Setup constants */
const NUM_ROUTES = 10_000;
const paths = Array.from({length: NUM_ROUTES}, (_, i) => `/bulk/:id${i}`);
const targetPath = '/bulk/9999';
const targetPattern = '/bulk/:id9999';

/* Memoized regex setup */
const generateRegex = (pattern:string) => {
    const regexPattern = pattern.replace(/:([^/]+)/g, '([^/]+)');
    return new RegExp(`^${regexPattern}$`);
};

const memoizedGetRegex = memoize(
    (_method, pattern) => generateRegex(pattern),
    (method, pattern) => `${method}:${pattern}`
);

/* Build regex cache */
for (let i = 0; i < NUM_ROUTES; i++) {
    memoizedGetRegex(HttpMethods.GET, paths[i]);
}

/* Static matcher setup */
const staticRoutes = new Map();
for (let i = 0; i < NUM_ROUTES; i++) {
    staticRoutes.set(`/static/${i}`, true);
}
const staticTarget = '/static/9999';

/* Trie matcher setup */
const tree = new RouteTree();
for (let i = 0; i < NUM_ROUTES; i++) {
    tree.add({
        method: HttpMethods.GET,
        path: `/bulk/:id${i}`,
        handler: () => {},
        middleware: [],
    });
}

describe('route matching benchmarks', () => {
    bench('non-memoized regex match', () => {
        const regex = generateRegex(targetPattern);
        const match = regex.exec(targetPath);
        if (!match) throw new Error('No match');
    });

    bench('memoized regex match', () => {
        const regex = memoizedGetRegex(HttpMethods.GET, targetPattern);
        const match = regex.exec(targetPath);
        if (!match) throw new Error('No match');
    });

    bench('static route match', () => {
        if (!staticRoutes.has(staticTarget)) throw new Error('No match');
    });

    bench('trie route match', () => {
        const match = tree.match(HttpMethods.GET, targetPath);
        if (!match) throw new Error('No match');
    });
});
