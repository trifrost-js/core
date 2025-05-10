# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
