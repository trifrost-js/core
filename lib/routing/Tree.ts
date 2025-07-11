import {LRU} from '@valkyriestudios/utils/caching';
import {Sym_TriFrostMiddlewareCors} from '../middleware/Cors';
import {type TriFrostRoute, type TriFrostRouteMatch} from '../types/routing';
import {type TriFrostContext} from '../types/context';
import {type HttpMethod, HttpMethods, HttpMethodsSet} from '../types/constants';
import {normalizeMiddleware} from './util';

/**
 * Internal trie node for dynamic routing.
 * Supports:
 * - exact segment matches (children)
 * - param matches (:id)
 * - wildcard matches (*)
 */
type TrieNode<Env extends Record<string, any> = {}> = {
    param_name: string | null;
    children: Record<string, TrieNode<Env>>;
    param_child: TrieNode<Env> | null;
    wildcard_child: TrieNode<Env> | null;
    methods: Record<HttpMethod, TriFrostRoute<Env>>;
};

function isValidPath(val: unknown): val is string {
    return typeof val === 'string' && val.length > 0 && val[0] === '/';
}

/**
 * Factory for a blank trie node
 */
function blankTrieNode<Env extends Record<string, any> = {}>() {
    return {
        children: Object.create(null),
        param_child: null,
        wildcard_child: null,
        param_name: null,
        methods: Object.create(null),
    } as TrieNode<Env>;
}

/**
 * Factory for an options route
 *
 * @param {string} path - Path the options route is for
 * @param {TriFrostRoute[]} routes - Routes array for this path
 */
function createOptionsRoute<Env extends Record<string, any>>(path: string, routes: TriFrostRoute<Env>[]): TriFrostRoute<Env> {
    const methods: HttpMethod[] | string = [HttpMethods.OPTIONS];
    let cors_mware: ReturnType<typeof normalizeMiddleware<Env>>[number] | null = null;
    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];

        /* Push into allowed methods array */
        if (route.method !== HttpMethods.OPTIONS) methods.push(route.method);

        /* We extract the cors middleware from the chains of the routes on the same path */
        if (cors_mware) continue;

        for (let y = 0; y < route.middleware.length; y++) {
            const el = route.middleware[y];
            if (el.fingerprint === Sym_TriFrostMiddlewareCors) cors_mware = el;
        }
    }

    return {
        method: HttpMethods.OPTIONS,
        kind: 'options',
        path,
        fn: (ctx: TriFrostContext<Env>) => {
            ctx.setHeaders({allow: methods.join(', '), vary: 'Origin'});
            ctx.status(204);
        },
        middleware: cors_mware ? [cors_mware] : [],
        timeout: null,
        bodyParser: null,
        name: `OPTIONS_${path}`,
        description: 'Auto-generated OPTIONS handler',
        meta: null,
    };
}

/**
 * Trie-based route tree: Builds a prefix tree of path segments.
 */
class TrieRouteTree<Env extends Record<string, any> = {}> {
    root: TrieNode<Env> = blankTrieNode<Env>();

    /**
     * Adds a route into the trie, segment by segment.
     *
     * @param {TriFrostRoute<Env>} route - Route to add
     * @param {boolean} no_options - Set to true to not add options route
     */
    add(route: TriFrostRoute<Env>, no_options: boolean = false) {
        let node = this.root;
        const segments = route.path.split('/');
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (segment) {
                if (segment.startsWith(':')) {
                    if (!node.param_child) {
                        node.param_child = blankTrieNode<Env>();
                        node.param_child.param_name = segment.slice(1);
                    }
                    node = node.param_child;
                } else if (segment === '*') {
                    if (!node.wildcard_child) {
                        node.wildcard_child = blankTrieNode<Env>();
                    }
                    node = node.wildcard_child;
                } else {
                    if (!node.children[segment]) node.children[segment] = blankTrieNode<Env>();
                    node = node.children[segment];
                }
            }
        }
        node.methods[route.method] = route;

        /* Only add options method if no_options is false */
        if (!no_options) {
            node.methods.OPTIONS = createOptionsRoute(route.path, Object.values(node.methods));
        }
    }

    /**
     * Matches a path and method against the trie, collecting parameters.
     *
     * @param {HttpMethod} method - HTTP method to match
     * @param {string} path - Path to find the match for
     */
    match(method: HttpMethod, path: string): TriFrostRouteMatch<Env> | null {
        const params = {};
        const matched = this.search(this.root, path.split('/'), 0, params, method);
        return matched ? {route: matched, path: matched.path, params} : null;
    }

    /**
     * Recursively collects all registered routes
     * @note This is used for debugging/tests and as such does not need to be highly optimized
     */
    get stack(): TriFrostRoute<Env>[] {
        const collected: TriFrostRoute<Env>[] = [];

        const recurse = (node: TrieNode<Env>, pathSegments: string[]) => {
            for (const method in node.methods) {
                collected.push(node.methods[method as HttpMethod]);
            }

            for (const seg in node.children) {
                recurse(node.children[seg], [...pathSegments, seg]);
            }

            if (node.param_child) {
                recurse(node.param_child, [...pathSegments, `:${node.param_child.param_name}`]);
            }

            if (node.wildcard_child) {
                recurse(node.wildcard_child, [...pathSegments, '*']);
            }
        };

        recurse(this.root, []);
        return collected;
    }

    /**
     * Recursively searches the trie for a matching route and method
     *
     * @param {TrieNode<Env>} node - Node of the tree we're currently on
     * @param {string[]} segments - Segments of the path we're searching
     * @param {number} segment_idx - Index of the current segment we're on
     * @param {Record<string, string>} params_acc - Parameter accumulator (built up as we go)
     * @param {HttpMethod} method - HTTP method being matched
     */
    private search(
        node: TrieNode<Env>,
        segments: string[],
        segment_idx: number,
        params_acc: Record<string, string>,
        method: HttpMethod,
    ): TriFrostRoute<Env> | null {
        if (segment_idx === segments.length) {
            return node.methods[method] || null;
        }

        const segment = segments[segment_idx];
        if (!segment) return this.search(node, segments, segment_idx + 1, params_acc, method);

        /* Exact match */
        if (node.children[segment]) {
            const found = this.search(node.children[segment], segments, segment_idx + 1, params_acc, method);
            if (found) return found;
        }

        /* Param match */
        if (node.param_child) {
            params_acc[node.param_child.param_name!] = segment;
            const found = this.search(node.param_child, segments, segment_idx + 1, params_acc, method);
            if (found) return found;
            delete params_acc[node.param_child.param_name!];
        }

        /* Wildcard match (wildcard eats the rest) */
        if (node.wildcard_child) {
            const remaining = segments.slice(segment_idx).join('/');
            params_acc['*'] = remaining;
            return node.wildcard_child.methods[method] || null;
        }

        return null;
    }
}

export class RouteTree<Env extends Record<string, any> = {}> {
    protected static: Record<string, Record<HttpMethod, TriFrostRoute<Env>>> = Object.create(null);

    protected dynamic: {
        lru: LRU<{v: TriFrostRouteMatch<Env> | null}>;
        tree: TrieRouteTree<Env>;
    } = {lru: new LRU({max_size: 250}), tree: new TrieRouteTree()};

    protected notfound: {
        lru: LRU<{v: TriFrostRouteMatch<Env> | null}>;
        tree: TrieRouteTree<Env>;
    } = {lru: new LRU({max_size: 250}), tree: new TrieRouteTree()};

    protected error: {
        lru: LRU<{v: TriFrostRouteMatch<Env> | null}>;
        tree: TrieRouteTree<Env>;
    } = {lru: new LRU({max_size: 250}), tree: new TrieRouteTree()};

    /**
     * Stack getter used for testing/debugging
     */
    get stack(): TriFrostRoute<Env>[] {
        return [
            ...Object.values(this.static).flatMap(obj => Object.values(obj)),
            ...this.dynamic.tree.stack,
            ...this.notfound.tree.stack,
            ...this.error.tree.stack,
        ];
    }

    /**
     * Clears all stored routes
     */
    reset() {
        this.static = Object.create(null);
        this.dynamic = {lru: new LRU({max_size: 250}), tree: new TrieRouteTree()};
        this.notfound = {lru: new LRU({max_size: 250}), tree: new TrieRouteTree()};
        this.error = {lru: new LRU({max_size: 250}), tree: new TrieRouteTree()};
    }

    /**
     * MARK: Standard
     */

    /**
     * Adds a route to the tree
     *
     * @param {MethodRouteDefinition<Env>} route - Route to add
     */
    add(route: TriFrostRoute<Env>) {
        if (!isValidPath(route?.path)) throw new Error('RouteTree@add: invalid path');
        if (typeof route.fn !== 'function') throw new Error('RouteTree@add: route.fn must be a function');
        if (!HttpMethodsSet.has(route.method)) throw new Error('RouteTree@add: method is not valid');

        if (route.path.indexOf(':') < 0 && route.path.indexOf('*') < 0) {
            if (!this.static[route.path]) this.static[route.path] = Object.create(null);
            this.static[route.path][route.method] = route;
            this.static[route.path].OPTIONS = createOptionsRoute(route.path, Object.values(this.static[route.path]));
        } else {
            this.dynamic.tree.add(route);
        }
    }

    /**
     * Attempts to match a route by method and path
     *
     * @param {HttpMethod} method - HTTP Verb (GET, DELETE, POST, ...)
     * @param {string} path - Path to look for
     */
    match(method: HttpMethod, path: string): TriFrostRouteMatch<Env> | null {
        const normalized = path === '' ? '/' : path;

        /* Check static routes */
        const hit_static = this.static[normalized]?.[method];
        if (hit_static) return {route: hit_static, path: hit_static.path, params: {}};

        const cached = this.dynamic.lru.get(normalized);
        if (cached) return cached.v;

        const matched = this.dynamic.tree.match(method, normalized);
        this.dynamic.lru.set(normalized, {v: matched});
        return matched;
    }

    /**
     * MARK: Not Found
     */

    addNotFound(route: Omit<TriFrostRoute<Env>, 'method'>) {
        if (!isValidPath(route?.path)) throw new Error('RouteTree@addNotFound: invalid path');
        this.notfound.tree.add({...route, method: 'GET'}, true);
    }

    matchNotFound(path: string): TriFrostRouteMatch<Env> | null {
        const cached = this.notfound.lru.get(path);
        if (cached) return cached.v;

        const matched = this.notfound.tree.match('GET', path);
        this.notfound.lru.set(path, {v: matched});
        return matched;
    }

    /**
     * MARK: Error
     */

    addError(route: Omit<TriFrostRoute<Env>, 'method'>) {
        if (!isValidPath(route?.path)) throw new Error('RouteTree@addError: invalid path');
        this.error.tree.add({...route, method: 'GET'}, true);
    }

    matchError(path: string): TriFrostRouteMatch<Env> | null {
        const cached = this.error.lru.get(path);
        if (cached) return cached.v;

        const matched = this.error.tree.match('GET', path);
        this.error.lru.set(path, {v: matched});
        return matched;
    }
}
