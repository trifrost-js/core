# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- **misc**: Migrate existing tests using node assertion to vitest
- **misc**: Add test runs to CI for both node (20, 22) and bun runtime jobs
- **misc**: Add coverage reporting to codecov to CI
- **misc**: Add tests for KV, Redis storage modules
- **deps**: vitest (dev dependency)
- **deps**: @vitest/coverage-v8 (dev dependency)

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
