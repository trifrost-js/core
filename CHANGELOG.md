# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Improved
- **qol**: Strengthened internal DurableObject TTL handling with always-set alarms, lazy expiration, and better resilience under unexpected conditions.
- **qol**: Download filenames now support Cyrillic, Greek, Turkish, and Eastern European characters via extended transliteration.
```typescript
'Пример_документ_2024.pdf' becomes
// ascii: 'Primer_dokument_2024.pdf'
// encoded: '%D0%9F%D1%80%D0%B8%D0%BC%D0%B5%D1%80_%D0%B4%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82_2024.pdf'

'Überprüfung_(v1)™.pdf' becomes 
// ascii: 'Uberprufung_(v1)(tm).pdf'
// encoded: '%C3%9Cberpr%C3%BCfung_%28v1%29%E2%84%A2.pdf'
```

### Fixed
- `extractPartsFromUrl()` (used in Bun and Workerd runtimes to derive `ctx.path` and `ctx.query`) now handles query-only URLs, fragments (`#`), and malformed inputs correctly.

## [0.8.0] - 2025-05-14
TriFrost now ships with a caching system that’s not only powerful — but *invisible*. 🪄

Caching is one of those things you want to do *wherever possible*: inside services, on expensive lookups, even conditional branches. But until now, you had two options:
1. Write your own cache keys and wrap logic manually — again and again (think **very generic boilerplate**).
2. Forget to cache at all.

Let’s fix that.

### Added
- **feat**: `@cache` decorator — Automatically wraps your method in cache logic:
```typescript
import {cache} from '@trifrost/core';

class Releases {
    @cache('releases')
    async getReleases(ctx: Context) {
        return fetchFromUpstream();
    }

    /* Supports dynamic keys via ctx (ps: the function you pass will be typed based on the context it gets) */
    @cache(ctx => `release:${ctx.state.id}`)
    async getRelease <State extends {id:string}> (ctx:Context<State>) {
        return fetchRelease(ctx.state.id);
    }
}
```
- **feat**: `cacheFn` function — Wrap standalone or arrow functions with cache logic:
```typescript
import {cacheFn} from '@trifrost/core';

const getReleases = cacheFn('releases', (ctx) => fetchFromUpstream(...));

const getRelease = cacheFn(
    ctx => `release:${ctx.state.id}`,
    <State extends {id:string}> (ctx:Context<State>) => fetchRelease(ctx.state.id)
);
```
- **feat**: `cacheSkip()` — Want to **bail from caching**? Just return your result wrapped in `cacheSkip()`.
Works when manually using cache wrap:
```typescript
export async function getReleases (ctx:Context) {
    return ctx.cache.wrap('myKey', async () => {
        try {
            const data = await maybeFails();
            return data;
        } catch (err) {
            ctx.logger.error(err);
            return cacheSkip(null);
        }
    });
}
```
Work within **@cache** decorated methods:
```typescript
import {cacheSkip} from '@trifrost/core';

class Releases {
    @cache('releases')
    async getReleases(ctx: Context) {
        try {
            ...
            return fetchFromUpstream();
        } catch (err) {
            ctx.logger.error(err);
            return cacheSkip(null);
        }
        
    }
}
```
Work within cacheFn wrapped methods:
```typescript
import {cacheFn, cacheSkip} from '@trifrost/core';

const getRelease = cacheFn('getRelease', async (ctx:Context) => {
    try {
        return await fetchRelease(ctx.state.id);
    } catch (err) {
        ctx.logger.error(err);        
        return cacheSkip(null);
    }
});
```

### Improved
- **feat**: Caches now accept primitives as values — `null`, `true`, `false`, `0`, `"hello"`, etc. No need to always wrap things in objects.
- **feat**: `@span` and `spanFn` now support `this.ctx.logger` as a fallback if neither `ctx.logger` nor `this.logger` is available.
```typescript
class Releases {
    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    @span()
    @cache('releases')
    async getReleases() {
        return fetchFromUpstream();
    }
}
```
No ctx needed — both @span and @cache find what they need.
- **deps**: Upgrade @cloudflare/workers-types to 4.20250514.0
- **deps**: Upgrade @types/node to 22.15.18
- **deps**: Upgrade typescript-eslint to 8.32.1

### Breaking
- **feat**: `ctx.cache.delete` has been renamed to `ctx.cache.del`. This saves 4 keystrokes 🚀 and aligns with the rest of the ecosystem:
```typescript
ctx.cookies.del('token');
ctx.router.del('/route', handler);
ctx.cache.del('myKey');
```

## [0.7.0] - 2025-05-13
TriFrost traces middleware and route handlers out of the box — but what about everything else? In any real backend, there’s a whole ecosystem beyond routing: services, utilities, classes with methods that get reused across flows. Can we take our tracing a level deeper, without cluttering the code?

While building out the TriFrost website, I found myself writing this pattern multiple times:
```typescript
class Releases {
    async getReleases (ctx:Context) {
        return ctx.logger.span('getReleases', async () => ctx.cache.wrap('releases', async () => {
            ...
        }, {ttl: 3600}));
    }
}
```

It works, sure — but it’s boilerplate. I wanted something cleaner, something nearly invisible. This release brings exactly that.

### Added
- **feat**: `@span` decorator for class methods - Wraps your method in a logger span automatically:
```typescript
import {span} from '@trifrost/core';

class Releases {
    @span()
    async getReleases (ctx:Context) {
        return ctx.cache.wrap('releases', async () => {
            ...
        }, {ttl: 3600});
    }

    /* You can also pass a custom name if you prefer */
    @span('release-loader')
    async getRelease (ctx:Context) {
        ...
    }
}

/**
 * Pro-Tip: If you define a getter for logger on your class you don't
 * even need to pass ctx into every function. The span decorator falls back to this.logger if not found on the first argument
 */
class Releases {

    constructor (ctx:Context) {
        this.ctx = ctx;
    }

    get logger () {
        return ctx.logger;
    }

    @span()
    async getReleases () {
        ...
    }

    @span('release-loader')
    async getRelease () {
        ...
    }

}
```
- **feat**: `spanFn` utility for standalone functions (sadly decorators don't work here just yet) which wraps a regular function or arrow function in a span, preserving this and ctx.logger when available:
```typescript
import {spanFn} from '@trifrost/core';

const getReleases = spanFn('getReleases', async (ctx) => {
    ...
});

/* No name? No problem. spanFn will use the function name if defined (and fallback to anonymous as a last ditch effort) */
const getRelease = spanFn(async function getRelease (ctx:Context) => {
    ...
});
```

Use them where it matters — tracing is now one line away.

## [0.6.0] - 2025-05-11
### Improved
- **feat**: `Router.get/post/put/patch/del` now accepts an empty path (`''`) as valid. Useful for mounting a handler directly at a group base path:
```typescript
.group('/api/v1/', r => r
    .get('', ...))
    .get('users/:id', ...)
```
- **feat**: `Router.group` now accepts both `void` and `Router` return types, allowing cleaner chaining in TypeScript:
```typescript
/* ✅ Now valid in TypeScript */
.group('/api/v1/', r => r
    .get('users/:id', ...)
    .get('posts/:id', ...))

/* (Previous) Typescript-safe way */
.group('/api/v1/', r => {
    r
        .get('users/:id', ...)
        .get('posts/:id', ...);
})
```
- **jsx**: Enhanced support for rendering multiple JSX elements via `.map(...)`, fragments, or sibling arrays — now fully supported in runtime output. For example, this JSX block now correctly renders all spans:
```tsx
const nav = ['Home', 'Docs', 'Blog'];

return (<header>
    <div>Logo</div>
    {nav.map((label) => (
        <span>{label}</span>
    ))}
</header>);
```
- **deps**: Upgrade bun-types to 1.2.13

### Fixed
- **jsx**: Fixed issue where falsy-but-valid props (`0`, `false`, `''`) were being skipped during render. These are now correctly serialized unless explicitly `null` or `undefined`.

## [0.5.0] - 2025-05-11
### Added
- **feat**: `ctx.statusCode` as a getter to retrieve the currently set response status code. This is useful in situations where middleware sets a status code using `ctx.setStatus` which then needs to be picked up further down the chain.

### Improved
- **feat**: RateLimit windows are now **seconds** rather than **milliseconds**, this reduces internal operations and aligns with how most persistence stores work (eg: Redis `EX`, KV `expirationTTL` are all **seconds**).

## [0.4.0] - 2025-05-10
### Improved
- **feat**: `ctx.setHeader` now accepts `number` values and will coerce them to strings internally.
- **feat**: `ctx.setHeaders` now accepts `number` values in the object and coerces them to strings.
- **feat**: Passing `max_items` as `null` to MemoryCache will now disable the LRU added in trifrost 0.3.0. For example:
```typescript
/* Capped to 500 entries */
new MemoryCache({max_items: 500});

/* (NEW) Unbounded, no LRU eviction */
new MemoryCache({max_items: null});
```
- **perf**: Improved `ctx.ip` resolution when `trustProxy` is enabled: the header containing a valid IP is now promoted to the front of the candidate list for future lookups, improving subsequent request performance.
- **misc**: RedisRateLimit, KVRateLimit and DurableObjectRateLimit will now throw if not called with a store initializer
- **deps**: Upgrade @types/node to 22.15.17
- **deps**: Upgrade @cloudflare/workers-types to 4.20250510.0

## [0.3.0] - 2025-05-10
### Added
- **misc**: Migrate existing tests using node assertion to vitest
- **misc**: Add test runs to CI for both node (20, 22) and bun runtime jobs
- **misc**: Add coverage reporting to codecov to CI
- **deps**: vitest (dev dependency)
- **deps**: @vitest/coverage-v8 (dev dependency)

### Improved
- **feat**: MemoryStore now has built-in LRU capabilities that work seamlessly with the built-in TTL behaviors. These are **not enabled by default** and can be enabled by passing `max_items` options.
- **feat**: MemoryCache (which runs on MemoryStore) will now by default act as an LRU (least-recently-used) cache, in addition to ttl-based. **By default any MemoryCache instance will now be limited to 1000 entries** and automatically evicted when its size grows above that (based on least recently used). You can configure this behavior by passing the optional `max_items` option which allows you to configure the MemoryCache's max item limit. For Example:
```typescript
/**
 * Default capped to 1000 entries.
 */
new MemoryCache();

/**
 * Capped to 500 entries.
 */
new MemoryCache({max_items: 500});

/**
 * Of course can be combined with existing gc interval.
 * Capped to 500 entries with garbage collection interval checks every second
 */
new MemoryCache({max_items: 500, gc_interval: 1_000});
```

### Fixed
- Fixed an issue in KV storage module where set would not work due to a conflicting object vs array conditional check
- Fixed an issue in Redis storage module where set would not work due to a conflicting object vs array conditional check

### Removed
- **deps**: nyc (as no longer in use)

## [0.2.0] - 2025-05-08
### Added
- **feat**: ctx.file now has support for the `download` option, when set it instructs the client browser to download the file using the Content-Disposition header. Take note: As per RFC 6266 we automatically encode the filename when set.
```typescript
/**
 * The below would result in the following Content-Disposition header:
 *
 * attachment; filename="Strasse_(draft)*v1.0.pdf"; filename*=UTF-8''Stra%C3%9Fe_%28draft%29%2Av1.0.pdf
 */
ctx.file('storage/487348932483.pdf', {download: 'Straße_(draft)*v1.0.pdf'});
```

### Improved
- **misc**: Make use of new barrel exports in valkyrie utils
- **deps**: Upgrade @cloudflare/workers-types to 4.20250508.0
- **deps**: Upgrade @types/node to 22.15.16
- **deps**: Upgrade @valkyriestudios/utils to 12.36.0
- **deps**: Upgrade @valkyriestudios/validator to 10.3.0

### Breaking
- **feat**: Signature for `ctx.json`, `ctx.text` and `ctx.html` has changed from `(val, status?, cache?:CacheControlOptions)` to `(val, opts?:{status?, cache?:CacheControlOptions})`, this bag-of-options approach allows for future options to be added without further polluting the argument space.
- **feat**: Signature for `ctx.file` has changed from `(val, cache?:CacheControlOptions)` to `(val, opts?:{cache?:CacheControlOptions, download?:boolean|string})`, this bag-of-options approach allows for future options to be added without further polluting the argument space.
- **feat**: Signature for `ctx.redirect` has changed from `(to, status?, opts?:TriFrostContextRedirectOptions)` to `(to, opts?:{status?, keep_query?:boolean})`, this bag-of-options approach allows for future options to be added without further polluting the argument space.
- **misc**: Renamed runtimes/Node/Types.ts to runtimes/Node/types.ts (alignment)
- **misc**: Renamed runtimes/UWS/Types.ts to runtimes/UWS/types.ts (alignment)
- **misc**: Renamed runtimes/Types.ts to runtimes/types.ts (alignment)

### Removed
- **deps**: @valkyriestudios/validator (as no longer in use)

## [0.1.0] - 2025-05-06
### Breaking
- **rename**: Project renamed from **Falcon** to **Trifrost**.
- **namespace**: Updated all symbols, identifiers, logs, and OTEL tracing keys to use `trifrost.*` instead of `falcon.*`.
- **package**: Published under new namespace [`@trifrost/core`](https://www.npmjs.com/package/@trifrost/core).

### Added
- 🚀 New GitHub organization: [trifrost-js](https://github.com/trifrost-js)
- 🌐 New website: [trifrost.dev](https://trifrost.dev)
- 💬 New community: [Discord server](https://discord.gg/your-trifrost-invite)

---

> Older changelog entries from the Falcon era have been archived for clarity (see CHANGELOG.old.md). Trifrost begins here.
