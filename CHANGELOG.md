# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.20.4] - 2025-05-30
### Improved
- **feat**: The `hr` tag is now part of the known set of html tags the style engine will automatically space prefix.
```typescript
css.use({
  hr: {marginTop: '1rem'},
});
```
- **deps**: Upgrade @cloudflare/workers-types to 4.20250529.0
- **deps**: Upgrade @types/node to 22.15.28
- **deps**: Upgrade @valkyriestudios/utils to 12.39.0

## [0.20.3] - 2025-05-28
This release brings an approximate 2x throughput improvement in performance for the new TrieRouter when dealing with Hot paths as well as a performance improvement for the CSS style engine thanks to an improved LRU design in the [Valkyrie Utils](https://github.com/ValkyrieStudios/utils/releases/tag/12.38.0) (sidenote: Valkyrie Utils is another package maintained by the creator of TriFrost and is heavily used within TriFrost).

### Improved
- **perf**: Improved performance for style engine thanks to new LRU design
- **perf**: Improved performance for trie router thanks to new LRU design
- **deps**: Upgrade @valkyriestudios/utils to 12.38.0
- **deps**: Upgrade @types/node to 22.15.24
- **deps**: Upgrade bun-types to 1.2.15

## [0.20.2] - 2025-05-28
### Improved
- **deps**: Upgrade @cloudflare/workers-types to 4.20250528.0
- **deps**: Upgrade @types/node to 22.15.23
- **deps**: Upgrade typescript-eslint to 8.33.0

### Fixed
- **bug**: Ensure ctx ends up in a 500 status when global catch is triggered AND status of ctx is below 400, this ensures proper triaging behavior

## [0.20.1] - 2025-05-28
### Improved
- **qol**: Otel `http.status_code` and `otel.status_code` attributes are now set early in the routing chain before middleware runs, giving better observability out of the box. Also, `ctx.setStatus` now only updates logger attributes **if the status code actually changes**, avoiding unnecessary writes.
- **qol**: `ctx.html` no longer defaults to `200` if a previous `ctx.setStatus` was called — it **respects the existing status** unless explicitly overridden.
- **qol**: `ctx.json` no longer defaults to `200` if a previous `ctx.setStatus` was called — it **respects the existing status** unless explicitly overridden.
- **qol**: `ctx.text` no longer defaults to `200` if a previous `ctx.setStatus` was called — it **respects the existing status** unless explicitly overridden.
- **qol**: Triaging (internal check to ensure the context is properly locked on error or status) now also runs **after each middleware** if the context has a status ≥ 400 but is not aborted — improving graceful handling when middleware signals an error without explicitly calling `abort()`.
- **cicd**: Added `codecov.yml` to enforce that coverage must not drop below 60%.

### Fixed
- **bug**: Fixed an off-by-one error in the middleware iteration loop that could cause `Reflect.get` to throw (`TypeError: Reflect.get called on non-object`) when accessing beyond array bounds. This surfaced in certain routing configurations.

## [0.20.0] - 2025-05-28
This isn’t just another release — it’s a **massive routing overhaul**. We’re introducing the new TrieRouter under the hood, delivering blistering-fast match speeds, smarter fallback handling, and precise middleware chains.

From the moment a request hits your app, every part of the routing pipeline is now more **predictable**, **transparent**, and **customizable**.

We didn’t stop at performance — we improved on error handling, brought further consistency across the entire chain, and added some additional tools to shape fallback and error behavior exactly how you want. No surprises, no magic — just clean, controlled power.

### Added
- **feat**: New **TrieRouter** implementation under the hood for all routing operations — offering **faster, more precise matching** with support for static, param, wildcard, and deep-nested patterns. This powers the entire TriFrost routing tree and improves performance across large route sets.
- **feat**: Introduced `.onError()` handler registration. This allows end-users to **override** the default `500` error fallback. By default, if no error handler is registered TriFrost still calls `ctx.abort(500)`, but now you can fully customize how error fallback routes behave:
```typescript
/* Generic responder */
app.onError(ctx => ctx.json({error: 'something went wrong'}, {status: 500}));

/* Less generic */
app.onError(ctx => {
  switch (ctx.statusCode) {
    case 401:
      return ctx.json({error: 'no access you have'});
    case 500:
      return ctx.json({error: 'oopsie'});
  }
});

/* Somewhere in your code */
... return ctx.setStatus(401);
```

### Improved
- **feat**: `ctx.html` will now automatically prefix a `<!DOCTYPE html>` when it detects a full-page html body starting with `<html`
- **feat**: `ctx.html`, `ctx.json`, `ctx.text` and `ctx.file` will no longer set the `Content-Type` if a `Content-Type` already exists on the response headers, the default behavior remains the same if no `Content-Type` exists on the response headers
- **feat**: `ctx.abort()` will now early-return if the context was already aborted, ensuring no side-effects when a request was already aborted
- **qol**: All TriFrost middleware now have a FingerPrint symbol marker attached to it to identify it clearly inside of the middleware chain for a route, this is both helpful for internal behaviors (see options routes in Trie router), but can also be helpful for future plugins 🧙‍♂️.
```typescript
import {
  Sym_TriFrostFingerPrint,
  Sym_TriFrostMiddlewareCors,
  Sym_TriFrostMiddlewareSecurity,
} from '@trifrost/core';

const fn = ...; /* Some random method from a middleware chain */
switch (Reflect.get(fn, Sym_TriFrostFingerPrint)) {
  case Sym_TriFrostMiddlewareCors:
    console.log('Fn is trifrost cors');
    break;
  case Sym_TriFrostMiddlewareSecurity:
    console.log('Fn is trifrost security');
    break;
  ...
}
```
- **qol**: TriFrost now **automatically catches** handlers or middleware that only set a status but don’t end the response. For example: `return ctx.setStatus(404);` will now trigger the nearest `.onNotFound()` handler if registered, or `.onError()` if the status is >= 400 — ensuring **graceful fallback handling** even when the context isn’t explicitly locked.
- **qol**: Options routes will no longer get the entire middleware chain for the path they're running on, but instead will only look at cherry picking a registered `Cors` middleware from the chain.
- **feat**: You can now chain .use() in between verb methods, allowing branch-specific middleware stacking. This makes the middleware chain **incrementally extendable**, letting you scope middleware precisely where needed without affecting earlier verbs.
```typescript
/* Works on a router level */
router
  .use(globalMw)
  .get('/users', usersHandler) // gets globalMw
  .use(adminMw)
  .post('/admin', adminHandler); // gets globalMw + adminMw

/* Works inside .route blocks */
router
  .use(globalMw)
  .route('/users', route => {
    route
      .use(aclChecker).get(usersHandler) /* globalMw + aclChecker */
      .use(writeAclChecker).post(usersPostHandler) /* globalMw + aclChecker + writeAclChecker */
  )
  .use(adminMw)
  .post('/admin', adminHandler); /* globalMw + adminMw */
```

### Breaking
- The `.limit()` method now **applies rate limiting immediately in-place** when chained, instead of magically attaching at the end of the middleware chain. This aligns with TriFrost’s **no-magic-ever** philosophy, making middleware chains predictable and readable. Previously, `.limit()` was automatically pushed to the end, regardless of where you called it. Now, its position matters — allowing clear and intuitive control.
```typescript
router
  .limit(5)                             // ⏰ applies here
  .use(someMw)                          // ✅ runs AFTER limit
  .get('/path', h);

router
  .use(myFancyAuth)                     // ✅ runs AFTER limit
  .limit(ctx => ctx.state.$auth.limit)  // ⏰ applies here
  .get('/path', h);
```
- The `.notfound()` method has been renamed to `.onNotFound()` for better semantic clarity, matching `.onError()` and making route fallback behavior easier to reason about.

## [0.19.1] - 2025-05-26
### Fixed
- Fix an issue introduced in TriFrost 0.18.0 where race conditions sometimes prevented Workerd env from being resolved on time

## [0.19.0] - 2025-05-26
This release further sharpens TriFrost’s styling system with custom breakpoints, ergonomic attribute helpers, and expanded selector coverage — giving you more precision and control without added complexity. Most of these improvements/additions came directly from working on the TriFrost website and as such solve some **real-world ergonomic issues**.

### Added
- **feat**: The CSS system now supports custom breakpoints — you can fully replace the default media query set (`mobile`, `tablet`, `tabletOnly`, `desktop`) by passing your own named breakpoints to `createCss()`. This lets you tailor the responsive design system to your app’s exact needs, while still retaining core features like `dark`, `light`, `hover`, `reducedMotion`. When you define custom breakpoints, the `css.media` object will have them fully typed and ready for usage.
```typescript
const css = createCss({
  ...,
  breakpoints: {
    sm: '@media (max-width: 640px)',
    md: '@media (max-width: 768px)',
    lg: '@media (max-width: 1024px)',
    xl: '@media (max-width: 1280px)',
  },
});

...

const cls = css({
  fontSize: '1rem',
  [css.media.sm]: {fontSize: '0.875rem'},
  [css.media.md]: {fontSize: '1rem'},
});
```
- **feat**: New attribute selector helpers `css.attr`, `css.attrStartsWith`, `css.attrEndsWith`, `css.attrContains`. These are there to improve readability and avoid manually writing raw string selectors (and potentially forgetting that closing `]`, I know I have).
```typescript
const cls = css({
  [css.attr('data-enabled')]: {color: 'blue'}, /* [data-enabled] */
  [css.attr('data-active', true)]: {color: 'green'}, /* [data-active="true"] */
  [css.attrStartsWith('data-role', 'adm')]: {fontWeight: 'bold'}, /* [data-role^="adm"] */
  [css.attrEndsWith('data-id', '42')]: {opacity: 0.5}, /* [data-id$="42"] */
  [css.attrContains('data-label', 'part')]: {textDecoration: 'underline'}, /* [data-label*="part"] */
});
```
- **feat**: New ergonomic selectors `css.firstOfType`, `css.lastOfType`, `css.empty`. These join the already rich selector toolkit (like `nthChild`, `nthOfType`, `not`, `is`, etc.) to make even advanced CSS states easy to target.
```typescript
const cls = css({
  [css.firstOfType]: {marginTop: 0}, /* :first-of-type */
  [css.lastOfType]: {marginBottom: 0},
});
```

### Improved
- **feat**: `.is()` selector can now be passed a set of tags like: `css.is('h1', 'h2', 'h3')`
```typescript
const cls = css({
  [`> ${css.is('h1', 'h2', 'h3')}`]: {
    fontSize: '2rem',
    marginBottom: '1rem',
  },
});
/* Generates: .<class> > :is(h1, h2, h3) { ... } */
```
- **feat**: Known HTML tags as well as combinators (`>`, `+`, `~`) will now be **auto-spaced** so nested selectors and combinators work cleanly. Previously you'd have to manually space prefix them `{[' section']: {[' p']: ...}}`, but now:
```typescript
/* Nested tag selectors */
const cls1 = css({
  section: {
    h2: { fontWeight: 'bold' },
    p: { lineHeight: 1.4 },
  },
});
/**
 * Generates:
 * .<class> section h2 { font-weight: bold }
 * .<class> section p { line-height: 1.4 }
 */

/* Combining known tags with pseudo classes */
const cls2 = css({
  a: {
    textDecoration: 'none',
    [css.hover]: {
      textDecoration: 'underline',
    },
  },
});
/**
 * Generates:
 * .<class> a:hover { text-decoration: underline }
 * .<class> a { text-decoration: none }
 */

/* Handling combinators with nested tag selectors */
const cls3 = css({
  '>': {
    section: {
      h2: { fontWeight: 'bold' },
      p: { lineHeight: 1.4 },
    },
  },
});
/**
 *  Generates:
 * .<class> > section h2 { font-weight: bold }
 * .<class> > section p { line-height: 1.4 }
 */
```
- **feat**: The style engine will no longer automatically prepend styles if no Style marker is found, this prevents issues where html responses purely containing a component render get the entire root style block injected into them. Previously the only way to **prevent style injection** would have been to pass `{inject: false}` to each css call — but with multi-layer components, this was a DX blocker.

## [0.18.0] - 2025-05-25
This update brings subtle but powerful improvements across TriFrost’s core — from smarter, cross-runtime environment handling to brand-new HMAC cookie signing, verification, and robust, production-ready authentication middleware.

### Added
- **feat**: The `Cookies` module now supports built-in HMAC signing and verification using Web Crypto (supported across **Node**, **Bun** and **Workerd**). It provides `.sign()` to generate an HMAC-signed value and `.verify()` to check integrity. Supported algorithms: `SHA-256`, `SHA-384`, `SHA-512`.
```typescript
/* Basic Usage */
const signed = await ctx.cookies.sign('userId42', ctx.env.MY_COOKIE_SECRET);
ctx.cookies.set('session', signed);

...

const rawCookie = ctx.cookies.get('session');
const verified = await ctx.cookies.verify(rawCookie, ctx.env.MY_COOKIE_SECRET);

if (verified) console.log('Untampered value:', verified);
else console.log('Signature invalid or tampered!');
```
```typescript
/* Using secret rotation (multi-key check) */
const signed = await ctx.cookies.sign('orderToken', 'newSecret', {algorithm: 'SHA-512'});

const verified = await ctx.cookies.verify(signed, [
    {val: 'newSecret', algorithm: 'SHA-512'}, /* current */
    {val: 'oldSecret', algorithm: 'SHA-256'}, /* legacy fallback */
]);

if (verified) console.log('Valid order token:', verified);
else console.log('Invalid or outdated token');
```
- **feat**: New **BasicAuth** middleware — HTTP Basic Authentication via the `Authorization` header
```typescript
import {BasicAuth} from '@trifrost/core';

router
  .use(BasicAuth({
    validate: (ctx, {user, pass}) => user === 'admin' && pass === ctx.env.ADMIN_SECRET
  }))
  .get('/basic-protected', ctx => {
    return ctx.json({message: `Welcome, ${ctx.state.$auth.user}`});
  });
```
- **feat**: New **BearerAuth** middleware — HTTP Bearer Token Authentication via the `Authorization` header
```typescript
import {BearerAuth} from '@trifrost/core';

router
  .use(BearerAuth({validate: (ctx, token) => token === ctx.env.API_TOKEN}))
  .get('/bearer-protected', ctx => {
    const auth = ctx.state.$auth; /* { token: 'actual-token' } */
    return ctx.json({message: 'Bearer token validated'});
  });
```
- **feat**: New **ApiKeyAuth** middleware — API key validation using configurable headers or query params
```typescript
import {ApiKeyAuth} from '@trifrost/core';

router
  .use(ApiKeyAuth({
    header: 'x-api-key',
    validate: (ctx, key) => key === ctx.env.MY_API_KEY
  }))
  .get('/api-key-protected', ctx => {
    const auth = ctx.state.$auth; /* { key: 'actual-key' } */
    return ctx.json({message: 'API key validated'});
  });
```
- **feat**: New **SessionCookieAuth** middleware - HMAC-signed cookie validation (integrated with the new cookie signing)
```typescript
import {SessionCookieAuth} from '@trifrost/core';

router
  .use(SessionCookieAuth({
    cookie: 'session_id',
    secret: {val: ctx => ctx.env.SESSION_SECRET, algorithm: 'SHA-256'},
    validate: (ctx, session) => {
      /* Optionally enrich $auth with custom object */
      const user = lookupSession(session);
      return user ? {id: user.id, role: user.role} : false;
    }
  }))
  .get('/session-protected', ctx => {
    const auth = ctx.state.$auth; /* {id: '123', role: 'admin'} */
    return ctx.json({message: `Hello, user ${auth.id} with role ${auth.role}`});
  });
```

### Improved
- **qol**: All runtimes now expose a consistent `.env` getter, so both runtime internals and app code can reliably access environment variables — even when no explicit `env` was passed. This also means you are **no longer required** to pass `process.env` when setting up an app on **Node** or **Bun**. For **Workerd**, the runtime’s `env` getter is hydrated automatically upon the first incoming request.
```typescript
import {App} from '@trifrost/core';
import {type Env} from './types';

/* This one and the one below will now yield the same effective env */
const app = new App<Env>({env: process.env});
const app = new App<Env>({});
```
- **qol**: You can still provide a user-defined `env` object in `AppOptions`, this will now be automatically merged with the runtime-provided environment (such as `process.env` in Node/Bun) at boot time.
- **qol**: The `uWSRuntime` has improved version detection — it now properly reports `bun:<version>` when running under Bun, or `node:<version>` when under Node.js, falling back to `N/A` if unknown. Important to note that these runtime properties are also part of telemetry traces.

### Notes on Auth Middleware
- Each middleware exposes a type-safe, ergonomic API with built-in `$auth` state injection for downstream handlers.
- When `validate()` returns an object, that object becomes the $auth state; if it returns true, a fallback object is injected (e.g., {user}, {token}, {key}, or {cookie}), and if it returns false, the request is rejected with a `401 Unauthorized`.

---

✨ **Bottom line**: With **FrostBite (0.18.0)**, TriFrost takes its first big leap into the world of built-in authentication — delivering fresh, modular, production-ready middleware to guard your routes, secure your sessions, and validate your keys.

But this is just the start: more auth flavors, integrations, and sugar are coming in future releases (or **contribute your own?**).

Stay frosty — the adventure has only begun. ❄️🔐🌟

## [0.17.0] - 2025-05-23
This patch introduces first-class animation support into the TriFrost styling engine. You can now define, register, and reuse `@keyframes` using the same ergonomic API as `css()` — with full support for SSR, media queries, deduplication, and cross-engine reuse via LRU.

### Added
- **feat**: New `css.keyframes()` API to define named keyframe animations:
```typescript
const bounce = css.keyframes({
  '0%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.1)' },
  '100%': { transform: 'scale(1)' },
});

const cls = css({
  animation: `${bounce} 2s infinite ease-in-out`,
});
```
- **feat**: `css.keyframes(..., {inject: false})` returns a name without injecting — ideal for hydration reuse or SSR pipelines.
- **feat**: Works within responsive blocks:
```typescript
css({
  [css.media.desktop]: {
    animation: `${css.keyframes({ ... })} 4s ease`,
  }
});
```

---

With `css.keyframes()`, TriFrost brings motion into the mix — elegantly, efficiently, and on cue. No drama, just drama-free animations. 💃🕺

## [0.16.0] - 2025-05-23
This release sharpens the edge of TriFrost's JSX engine and style system. Expect better render performance, faster style injection, and smarter cross-request reuse — with no increase in memory footprint.

### Improved
- **perf**: The JSX render() engine has been improved with tighter branching and more predictable control flow — eliminating unnecessary conditionals and improving hot path performance.
- **perf**: perf: The styleEngine now internally caches css() and css.use() results per request — dramatically reducing style generation overhead in loops, conditionals, and dynamic blocks.
- **perf**: Each css factory instance now also has a global LRU cache allowing cross-request replay of styles. If a given style object has already been processed on a previous request, it will replay its previously registered rules into the new style engine — without flattening or recomputing anything.

These changes deliver an estimated 15–20% render performance boost (based on vitest bench snapshots of common JSX trees), without sacrificing determinism or memory safety.

## [0.15.1] - 2025-05-22
### Fixed
- Issue where typing for TriFrostCache `del` was not aligned with the new prefix deletion support

## [0.15.0] - 2025-05-22
This release brings further **resilience**, **structure**, and **flexibility** to TriFrost’s storage layer — turning what was already powerful into something even more durable (pun intended).

### Added
- **feat**: Prefix deletion support in all TriFrost storage backends (DurableObject, Memory, Redis, KV). This enables scoped deletion of key groups across the unified `.del()` API. Since `ctx.cache` is backed by TriFrost storage, you can now do:
```typescript
await ctx.cache.del({prefix: 'somekey_'}); /* Deletes all keys with prefix 'somekey_' */
```
- **feat**: Prefix deletion support in the TriFrost cookies module:
```typescript
ctx.cookies.del({prefix: 'somekey_'}); /* Deletes all cookies with prefix 'somekey_' */
```

### Improved
- **feat**: TriFrost now supports context-aware cache spawning via a new internal `.spawn()` mechanism on both `Store` and `Cache`. When a request comes in, TriFrost automatically creates a scoped cache instance bound to the request’s lifecycle. This lets system errors be logged per-request — and paves the way for future auto-instrumentation 🧙‍♂️
- **qol**: All `StoreAdapter` classes (Memory, Redis, KV, DurableObject) now follow a clean, centralized interface — enabling future adapters with zero boilerplate
- **qol**: TriFrost’s storage backends (Redis, KV, DurableObject) now **fail gracefully**. If Redis goes down, errors are swallowed (and logged via `ctx.logger.error`) — no more bubbling runtime crashes.
- **misc**: Internal file restructure — all storage logic now lives in `lib/storage`, making adapters easier to extend, test, and discover
- **misc**: CICD tagged releases will now also automatically purge the cache on the [TriFrost Website](https://www.trifrost.dev)
- **deps**: Upgrade @cloudflare/workers-types to 4.20250522.0
- **deps**: Upgrade @types/node to 22.15.21
- **deps**: Upgrade bun-types to 1.2.14

---

🧙 Note: While `.spawn()` might sound like an advanced or manual step, it’s entirely internal. As a developer, you don’t need to think about it — TriFrost handles everything behind the scenes. In most cases, you’ll never call `.spawn()` yourself. It’s there to make the system smarter, not more complex.

## [0.14.0] - 2025-05-20
You can now safely use `css.use()` and `css.root()` inside root-level JSX components — even before calling ctx.html(). For example, the following code now works as expected:
```typescript
import {css} from './css'; /* Your own instance */

export function home (ctx:Context) {
  return ctx.html(<Layout>
    <div className={css.use('def1', 'def2', {fontSize: css.$v.font_size_s})}>
      <h1>Hello World</h1>
    </div>
  </Layout>);
}
```
Previously, this would break — because `ctx.html()` is what sets up the style engine (originally introduced in TriFrost 0.11.0). If you used `css.use()` before `ctx.html()`, the engine didn’t exist yet, and your styles wouldn’t register.

This was a classic chicken-and-egg situation. In `0.14.0`, we've solved it.

`css.use()` and `css.root()` now proactively ensure an active styling engine is available.

### Improved
- **feat**: You can now safely use `css.use()` and `css.root()` in root-level components
- **deps**: Upgrade @cloudflare/workers-types to 4.20250520.0
- **deps**: Upgrade @vitest/coverage-v8 to 3.1.4
- **deps**: Upgrade vitest to 3.1.4

## [0.13.0] - 2025-05-20
This release puts a bow on the new `createCss()` system — bringing ergonomics, utility, and a bit of sugar to an already powerful API.

We've added the concept of named style definitions, typed and resolved at setup time. These act as small composable building blocks that you can `use()` (to generate a class) or `mix()` (to inline styles into larger declarations). Bonus: both are fully type-safe and autocompleted.

We’ve also added a `cid()` helper to generate a unique, scoped class name — perfect for targeting things like modals, slots, and portals.

Oh, and `theme` is now even simpler: if a token doesn’t need a dark/light variant, you can just provide a single value.

These additions are optional — but when you need them, they’re the cherry on top.

### Added
- **feat**: `definitions: css => ({...})` — Define reusable, typed styles at setup time
- **feat**: `css.use(...)` — Apply one or more registered definitions + optional overrides (returns class name)
- **feat**: `css.mix(...)` — Merge one or more definitions into a plain object (used for composing styles)
- **feat**: `css.cid()` — Generate a unique `tf-*` class name (for targeting DOM nodes)
- **feat**: Support for single-value theme tokens (`theme: {bg: '#fff'}` now works too)

### Example: Composing styles with definitions, mix, and use
```typescript
// css.ts
import {createCss} from '@trifrost/core';

export const css = createCss({
  var: {
    space_l: '2rem',
  },
  theme: {
    bg: '#f8f8f8',
    fg: '#222',
  },
  definitions: css => ({
    row: {display: 'flex', flexDirection: 'row'},
    center: {justifyContent: 'center', alignItems: 'center'},
    padded: {padding: css.$v.space_l},
  }),
});
```
```tsx
// App.tsx
import {css} from './css';

export function App () {
  /* Note: TypeScript will error here because 'podded' isn't a valid definition */
  const cls = css.use('row', 'center', 'podded', {
    background: css.theme.bg,
    color: css.theme.fg,
  });

  return <div className={cls}>Hello World</div>;
}
```
You can also use css.mix() to inline styles into nested media queries or selectors:
```typescript
const complex = css({
  [css.media.tablet]: css.mix('row', 'center', {gap: '1rem'}),
  [css.hover]: {opacity: 0.8},
});
```

**As always** — everything is SSR-safe, deterministic, and additive. Use it if you need it. Ignore it if you don’t.

And if you want to build your entire design system on top of this… now's the time (like we're doing with the [TriFrost website](https://www.trifrost.dev)).

## [0.12.0] - 2025-05-19
This release improves how you work with CSS in TriFrost.

In `0.11.0`, we introduced a scoped, atomic CSS engine with support for nested selectors, media queries, and SSR-safe injection. That system is still here — but in `0.12.0`, it's now configurable.

Instead of importing a global `css` helper, you now create your own instance. Here’s the same example we used in `0.11.0`, updated to use the new `createCss()` approach:
```typescript
// css.ts
import {createCss} from '@trifrost/core';

export const css = createCss({
  /* Global variables */
  var: {
    radius_s: '4px',
  },
  /* Theme attributes */
  theme: {
    bg: {light: '#fff', dark: '#000'},
    fg: {light: '#000', dark: '#fff'},
    button_fg: {light: '#fff', dark: '#000'},
    button_bg: {light: '#000', dark: '#fff'}
  },
  /* Automatically inject a safe CSS reset */
  reset: true,
});
```

```tsx
// Button.tsx
import {css} from './css'; /* Note how we're importing our own instance */

export function Button () {
  const cls = css({
    color: css.theme.button_fg, // Now typed and autocompleted
    padding: '1rem 2rem',
    borderRadius: css.var.radius_s,
    fontWeight: 'bold',
    [css.hover]: {filter: 'brightness(1.2)'},
    [css.media.mobile]: {width: '100%'}
  });

  return <button className={cls}>Click me</button>;
}
```

```tsx
// Layout.tsx
import {Style} from '@trifrost/core';
import {css} from './css';
import {Button} from './Button.tsx';

export function Layout () {
  // Important: call .root() at least once per request to inject root styles
  css.root();

  /* Body styles */
  const cls = css({
    background: css.theme.bg,
    color: css.theme.fg,
  });

  return (<html>
    <head>
      <title>Styled Example</title>
      {/* Style component where our collected styles will be injected */}
      <Style />
    </head>
    <body className={cls}>
      <main>
        <h1>Hello World</h1>
        <Button />
      </main>
    </body>
  </html>);
}
```
### Added
- **feat**: `createCss()` — defines your scoped CSS instance with support for vars, theme tokens, and options.
- **feat**: `createCss` Option - `var: {...}` — Defines global variables
- **feat**: `createCss` Option - `theme: {...}` — Defines theme (each key needs to have a light and dark variant)
- **feat**: `createCss` Option - `themeAttribute: true` — injects theme styles for both media queries and attribute selectors (e.g. `<html data-theme="dark">`)
- **feat**: `createCss` Option - `themeAttribute: 'data-mode'` to use a custom attribute name (`<html data-mode="dark">`)
- **feat**: `createCss` Option `reset: true` — opt-in to a safe, accessible CSS reset
- **feat**: `css.var.*` and `css.theme.*` — typed design token references (`var(--xyz)` and `var(--t-xyz)`)
- **feat**: Aliases `css.$v`, `css.$t` for faster access to `css.var`, `css.theme` (for those that don't like to type, I know who you are).
```typescript
// Both of these are valid:
borderRadius: css.var.radius_s,
borderRadius: css.$v.radius_s,

// So are both of these:
background: css.theme.bg,
background: css.$t.bg,
```

### Breaking
- The global `css` export has been removed. Use `createCss()` to define a scoped CSS instance (with all of the type goodness) for your app or layout.

## [0.11.0] - 2025-05-19
TriFrost now includes a powerful, zero-runtime CSS engine — fully integrated with the core JSX renderer.

Write scoped, atomic, high-performance styles using the new `css()` utility. It supports pseudo-selectors, media queries, and deeply nested rules — all SSR-safe and deterministic.

### Added
- **feat**: `css()` — Inline, scoped styles with full support for pseudo-selectors, elements, and nested media queries
- **feat**: `<Style />` — Injects collected styles exactly where rendered (typically inside `<head>`)
- **feat**: Rich selector API: `css.hover`, `css.nthChild(2)`, `css.media.dark`, `css.before`, etc.
- **feat**: `css(obj, {inject: false})` — Returns class name without injecting (useful for SSR hydration reuse)
- **feat**: `css.root()` — Register global styles or `:root` variables within component code

**Example**
```tsx
// Theme.ts
import {css} from '@trifrost/core';

export function Theme () {
  css.root({
    '--radius': '4px',
    [css.media.light]: {
      '--color-bg': 'white',
      '--color-fg': 'black',
      '--color-button-bg': 'black',
      '--color-button-fg': 'white',
    },
    [css.media.dark]: {
      '--color-bg': 'black',
      '--color-fg': 'white',
      '--color-button-bg': 'white',
      '--color-button-fg': 'black',
    }
  });
}
```

```tsx
// Button.tsx
import {css} from '@trifrost/core/jsx';

export function Button () {
  const cls = css({
    background: 'var(--color-button-bg)',
    color: 'var(--color-button-fg)',
    padding: '1rem 2rem',
    borderRadius: 'var(--radius)',
    fontWeight: 'bold',
    [css.hover]: {filter: 'brightness(1.2)'},
    [css.media.mobile]: {width: '100%'}
  });

  return <button className={cls}>Click me</button>;
}
```

```tsx
// Layout.tsx
import {css, Style} from '@trifrost/core';
import {Theme} from './Theme';
import {Button} from './Button.tsx';

export function Layout () {
  Theme();

  /* Body styles */
  const cls = css({
    background: 'var(--color-bg)',
    color: 'var(--color-fg)',
  });

  return (<html>
    <head>
      <title>Styled Example</title>
      {/* Style component where our collected styles will be injected */}
      <Style />
    </head>
    <body className={cls}>
      <main>
        <h1>Hello World</h1>
        <Button />
      </main>
    </body>
  </html>);
}
```

This renders:
```html
<html>
  <head>
    <title>Styled Example</title>
    <style>
      :root {
        --radius: 4px;
      }

      @media (prefers-color-scheme: light) {
        :root {
          --color-bg: white;
          --color-fg: black;
          --color-button-bg: black;
          --color-button-fg: white;
        }
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --color-bg: black;
          --color-fg: white;
          --color-button-bg: white;
          --color-button-fg: black;
        }
      }

      .tf-abc123 {
        background: var(--color-button-bg);
        color: var(--color-button-fg);
        padding: 1rem 2rem;
        border-radius: var(--radius);
        font-weight: bold;
      }

      .tf-abc123:hover {
        filter: brightness(1.2);
      }

      @media (max-width: 600px) {
        .tf-abc123 {
          width: 100%;
        }
      }

      .tf-def456 {
        background: var(--color-bg);
        color: var(--color-fg);
      }
    </style>
  </head>
  <body class="tf-def456">
    <main>
      <h1>Hello World</h1>
      <button class="tf-abc123">Click me</button>
    </main>
  </body>
</html>
```

**You can also nest these**:
```tsx
import {css} from '@trifrost/core';

export function Card () {
  const cls = css({
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    [css.hover]: {
      boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
      [css.media.dark]: {
        boxShadow: '0 0 0 2px rgba(255,255,255,0.1)'
      }
    },
    ' h2': { fontSize: '1.25rem' },
    ' p': { fontSize: '1rem', color: 'gray' }
  });

  ...
}
```

### Best Practices
- Always call `css()` and `css.root()` inside components or functions — styles are collected per request
- Place `<Style />` in `<head>`
- Use `{inject: false}` for reuse patterns (eg: infinite scroll when on the second page)

### Improved
- **misc**: CICD tagged releases will now also automatically send a webhook message to discord announcing the release
- **deps**: Upgrade eslint to 9.27.0
- **deps**: Upgrade @cloudflare/workers-types to 4.20250510.0
- **deps**: Upgrade @types/node to 22.15.19
- **deps**: Upgrade @valkyriestudios/utils to 12.37.0

**Bottom line**:
- ✅ Fully deterministic and scoped
- ✅ Handles pseudo/media variants and nesting
- ✅ One class per style object
- ✅ Server-rendered, zero runtime
- ✅ No naming collisions — ever

Use it. Nest it. Compose it.

**Note**: The new `css()` engine is fully **additive**. It doesn’t replace native style usage — you can still use inline styles whenever it makes sense:
```tsx
<div style={{backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)'}}>...</div>
```
Use `css()` for scoped, reusable, atomic styles — and reach for `style={{...}}` when you need one-off or dynamic values. Both work seamlessly together.

## [0.10.0] - 2025-05-16
TriFrost always came with a body parser — it handled JSON, plain text, and buffers just fine. But real-world backends need more. Forms. File uploads. Multilingual characters. Legacy formats. Inconsistent charsets. It adds up fast.

This release brings with it an overhaul of the Falcon-era body parser and replaces it with a modern, reliable body parsing layer that just works across everything — `utf-8`, `utf-16`, nested forms, typed values, file uploads — no matter the runtime.

### Added
- **feat**: Richer body parsing — Full support for `application/x-www-form-urlencoded` and `multipart/form-data`. Clean objects out of the box. File uploads return modern `File` instances.
- **feat**: Smart decoding — UTF-8 and UTF-16 (LE/BE, with or without BOM) are parsed seamlessly, across all supported runtimes.
- **feat**: More JSON types — Now handles `text/json` (for those pesky legacy servers), `application/ld+json`, and newline-delimited `application/x-ndjson`.

### Improved
- **qol**: Body parsing is now consistent, robust, and intelligent. Forms, uploads, and edge cases just work — with proper type casting, nested keys, arrays, dates, booleans, and more (thanks to [toObject()](https://github.com/valkyriestudios/utils/?tab=readme-ov-file#formdatatoobjectvalformdata-rawstringtruesinglestringnormalize_boolbooleannormalize_dateboolnormalize_numberbool--))
- **deps**: Upgrade @cloudflare/workers-types to 4.20250515.0

Here’s what that looks like in practice:

### 🧾 LDJSON
**In**:
```text
{"id":1,"name":"Tri"}
{"id":2,"name":"Frost"}
```
**Out**:
```typescript
/* ctx.body */
{raw: [{id: 1, name: 'Tri'}, {id: 2, name: 'Frost'}]}
```

### 📮 URL-encoded form
**In**:
```text
username=TriFrost&admin=true&joined=2025-01-01T00%3A00%3A00Z&tags[]=alpha&tags[]=beta
```
**Out**:
```typescript
/* ctx.body */
{
  username: 'TriFrost',
  admin: true,
  joined: new Date('2025-01-01T00:00:00Z'),
  tags: ['alpha', 'beta']
}
```

### 📤 Multipart form-data
**In**:
```text
Content-Disposition: form-data; name="bio"
> loves fast APIs

Content-Disposition: form-data; name="avatar"; filename="me.png"
> binary image data
```
**Out**:
```typescript
/* ctx.body */
{
  bio: 'loves fast APIs',
  avatar: File // with name, type, size, etc.
}
```

**Bottom line**: Whether you're posting a login form, uploading a file, or streaming NDJSON from a service — TriFrost now parses it all for you. Automatically. Reliably. Cross-runtime.

## [0.9.0] - 2025-05-15
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
