/* eslint-disable @typescript-eslint/no-empty-object-type */

import {LRU} from '@valkyriestudios/utils/caching';
import {isFn} from '@valkyriestudios/utils/function';
import {isNeString} from '@valkyriestudios/utils/string';
import {Sym_TriFrostMiddlewareCors} from '../middleware/Cors';
import {TriFrostMiddleware, type TriFrostRoute} from '../types/routing';
import {type TriFrostContext} from '../types/context';
import {
    type HttpMethod,
    HttpMethods,
    HttpMethodsSet,
    Sym_TriFrostDescription,
    Sym_TriFrostFingerPrint,
    Sym_TriFrostMeta,
    Sym_TriFrostName,
    Sym_TriFrostType,
} from '../types/constants';

/**
 * Represents a match result when a route is found
 */
interface RouteMatch<Env extends Record<string, any> = {}> {
    path: string;
    route: TriFrostRoute<Env>;
    params: Record<string, string>;
}

/**
 * Internal trie node for dynamic routing.
 * Supports:
 * - exact segment matches (children)
 * - param matches (:id)
 * - wildcard matches (*)
 */
type TrieNode <Env extends Record<string, any> = {}> = {
    param_name: string|null;
    children:Record<string, TrieNode<Env>>;
    param_child: TrieNode<Env>|null;
    wildcard_child: TrieNode<Env>|null;
    methods: Record<HttpMethod, TriFrostRoute<Env>>;
}

/**
 * Factory for a blank trie node
 */
function blankTrieNode <Env extends Record<string, any> = {}> () {
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
 * @param {HttpMethod[]} methods - Available methods array 
 */
function createOptionsRoute <Env extends Record<string, any>> (
    path: string,
    routes:TriFrostRoute<Env>[]
): TriFrostRoute<Env> {
    let methods:HttpMethod[]|string = [HttpMethods.OPTIONS];
    let cors_mware:TriFrostMiddleware<Env>|null = null;
    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];

        /* Push into allowed methods array */
        if (route.method !== HttpMethods.OPTIONS) methods.push(route.method);
        
        /* We extract the cors middleware from the chains of the routes on the same path */
        if (cors_mware) continue;
        
        for (let y = 0; y < route.middleware.length; y++) {
            const mware = route.middleware[y];
            const is_cors = Reflect.get(mware, Sym_TriFrostFingerPrint) === Sym_TriFrostMiddlewareCors;
            if (is_cors) cors_mware = mware;
        }
    }

    methods = methods.join(', ');

    return {
        method: HttpMethods.OPTIONS,
        kind: 'options',
        path,
        fn: (ctx:TriFrostContext<Env>) => {
            ctx.setHeaders({Allow: methods, Vary: 'Origin'});
            ctx.status(204);
        },
        middleware: cors_mware ? [cors_mware] : [],
        timeout: null,
        [Sym_TriFrostName]: `OPTIONS_${path}`,
        [Sym_TriFrostDescription]: 'Auto-generated OPTIONS handler',
        [Sym_TriFrostType]: 'handler',
        [Sym_TriFrostMeta]: {},
    };
}

/**
 * Trie-based route tree: Builds a prefix tree of path segments.
 */
class TrieRouteTree<Env extends Record<string, any> = {}> {

    root:TrieNode<Env> = blankTrieNode<Env>();

    /**
     * Adds a route into the trie, segment by segment.
     * 
     * @param {TriFrostRoute<Env>} route - Route to add
     * @param {boolean} no_options - Set to true to not add options route
     */
    add (route:TriFrostRoute<Env>, no_options:boolean = false) {
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
    match (method:HttpMethod, path:string):RouteMatch<Env>|null {
        const params = {};
        const matched = this.search(this.root, path.split('/'), 0, params, method);
        return matched ? {route: matched, path: matched.path, params} : null;
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
    private search (
        node: TrieNode<Env>,
        segments: string[],
        segment_idx: number,
        params_acc: Record<string, string>,
        method: HttpMethod
    ): TriFrostRoute<Env>|null {
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
            return node.wildcard_child.methods[method] || null;
        }

        return null;
    }

}

export class RouteTree<Env extends Record<string, any> = {}> {

    protected static:Record<
        string,
        Record<HttpMethod, TriFrostRoute<Env>>
    > = Object.create(null);

    protected dynamic:{
        lru: LRU<string, {v: RouteMatch<Env>|null}>;
        tree: TrieRouteTree<Env>;
    } = {lru: new LRU({max_size: 250}), tree: new TrieRouteTree()};

    protected notfound:{
        lru: LRU<string, {v: RouteMatch<Env>|null}>;
        tree: TrieRouteTree<Env>;
    } = {lru: new LRU({max_size: 250}), tree: new TrieRouteTree()};

    protected error:{
        lru: LRU<string, {v: RouteMatch<Env>|null}>;
        tree: TrieRouteTree<Env>;
    } = {lru: new LRU({max_size: 250}), tree: new TrieRouteTree()};

    /**
     * Clears all stored routes
     */
    reset () {
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
    add (route:TriFrostRoute<Env>) {
        if (!isNeString(route?.path) || route.path[0] !== '/') throw new Error('RouteTree@add: invalid path');
        if (!isFn(route.fn)) throw new Error('RouteTree@add: route.fn must be a function');
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
    match (method:HttpMethod, path:string):RouteMatch<Env>|null {
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

    addNotFound (route:Omit<TriFrostRoute<Env>, 'method'>) {
        if (!isNeString(route?.path) || route.path[0] !== '/') throw new Error('RouteTree@addNotFound: invalid path');
        this.notfound.tree.add({...route, method: 'GET'}, true);
    }

    matchNotFound (path: string): RouteMatch<Env>|null {
        const cached = this.notfound.lru.get(path);
        if (cached) return cached.v;

        const matched = this.notfound.tree.match('GET', path);
        this.notfound.lru.set(path, {v: matched});
        return matched;
    }

    /**
     * MARK: Error
     */

    addError (route:Omit<TriFrostRoute<Env>, 'method'>) {
        if (!isNeString(route?.path) || route.path[0] !== '/') throw new Error('RouteTree@addError: invalid path');
        this.error.tree.add({...route, method: 'GET'}, true);
    }

    matchError (path:string):RouteMatch<Env>|null {
        const cached = this.error.lru.get(path);
        if (cached) return cached.v;

        const matched = this.error.tree.match('GET', path);
        this.error.lru.set(path, {v: matched});
        return matched;
    }

}
