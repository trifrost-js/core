# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2025-07-22
### Improved
- **feat**: Enhanced `$.goto` with ergonomic support for query-only shorthands. If the URL starts with `?`, the current `location.pathname` is automatically prepended. Example:
```typescript
// Current URL: /dashboard?page=1
$.goto("?page=2");
// → Navigates to: /dashboard?page=2

// This was previously already there, but:
$.goto("#top");
// → Updates hash to /dashboard#top (no navigation)
```
- **feat**: `$.goto(..., { replace: true })` now uses `history.replaceState(...)` internally, allowing **non-navigational updates** to the URL, ideal for in-place query string modifications without reloads.

## [1.2.0] - 2025-07-22
This update brings quality-of-life enhancements to TriFrost’s client-side utilities, focused on ergonomics and resilience in dynamic UIs.

### Added
- **feat**: `$.goto` utility, a high-level navigation helper for declarative and ergonomic client-side routing with built-in handling for query merging, blank tab opening, and replace-mode navigation.
```typescript
$.goto("/dashboard");
// → Navigates to: /dashboard
```
```typescript
$.goto("/login", "replace");
// → Replaces current history entry with /login
```
```typescript
$.goto("https://external.site", "blank");
// → Opens https://external.site in a new tab
```
```typescript
// Current url: https://app.local/settings?page=2&theme=dark

$.goto("/account", "query");
// → Navigates to: /account?page=2&theme=dark

$.goto("/search?q=test", "query");
// → Navigates to: /search?q=test&page=2&theme=dark

$.goto("/search?q=test&page=3", "query");
// → Navigates to: /search?q=test&page=3&theme=dark

$.goto("/profile", {
  replace: true,
  includeQuery: true
});
// → Replaces history with: /profile?page=2&theme=dark
```
- **feat**: Default CSS media breakpoints now includes `tabletUp`, allowing you to target tablet and above. The current set of default breakpoints is now:
```typescript
css.media.mobile /* <= 600px */
css.media.tablet /* <= 1199px */
css.media.tabletOnly /* > 600px AND < 1200px */
css.media.tabletUp /* > 600px */
css.media.desktop /* >= 1200px */
```

Where previously you'd do something like:
```typescript
css({
  [css.media.tablet]: {flexDirection: 'row'},
  [css.media.desktop]: {flexDirection: 'row'},
  [css.media.mobile]: {flexDirection: 'column'},
})
```

You can now shorten this to:
```typescript
css({
  [css.media.tabletUp]: {flexDirection: 'row'},
  [css.media.mobile]: {flexDirection: 'column'},
})
```

### Improved
- **deps**: Upgrade @cloudflare/workers-types to 4.20250722.0
- **deps**: Upgrade @types/node to 22.16.5
- **deps**: Upgrade bun-types to 1.2.19
- **deps**: Upgrade eslint-config-prettier to 10.1.8
- **deps**: Upgrade eslint-plugin-prettier to 5.5.3
- **deps**: Upgrade typescript-eslint to 8.38.0
- **feat**: `$.storeSet` now short-circuits when provided value equals the current value, reducing unnecessary storage operations.
- **feat**: `$bind` avoids re-binding already-bound inputs if passed multiple times, preventing redundant event wiring.
- **feat**: `$.uid` now falls back to `Date.now()` + RNG if `crypto.randomUUID` is unavailable
- **feat**: **Automatic Cleanup** for `$.on` event listeners. Listeners are now **auto-unregistered** when **a VM unmounts**, an element is **detached from the DOM**, dynamic elements created via `$.create` are removed.

##### $.on Before (Manual Cleanup)
```typescript
const listener = $.on(window, "resize", () => {
  console.log("Resized");
});

el.$unmount = () => {
  listener();
};
```

##### $.on After (Automatic Cleanup)
```typescript
$.on(window, "resize", () => {
  console.log("Resized");
});

// No manual cleanup needed — handled by the VM and node itself
```

The same applies to:
- Element listeners (`$.on(el, "click", ...)`)
- Global listeners (`$.on(window, "keydown", ...)`)
- Listeners added to dynamically created elements using `$.create("div")`

---

These changes reduce boilerplate and improve durability, especially in ephemeral or reactive UI flows.

As always. Stay frosty. ❄️

## [1.1.0] - 2025-07-17
### Improved
- **dx**: `@cache` decorator and `cacheFn` helper now support **partial argument key functions**, allowing key generators to use only a subset of parameters. This improves flexibility without losing type safety
```typescript
@cache((ctx, userId) => `user:${userId}`)
async getUser(ctx: Context, userId: string, includeMeta = false) {
  ...
}

const fn = cacheFn((ctx, userId) => `user:${userId}`)(
  async (ctx:Context, userId:string, includeMeta:boolean) => {
    ...
  }
);
```
- **dx**: `TriFrostRedis`, the provider shim type used inside of the RedisCache now has its `set` and `del` return type set as `Promise<unknown>` instead of `Promise<void>`

## [1.0.0] - 2025-07-15
🎉 First stable release of TriFrost!

This version finalizes the internal architecture and public API surface, locking in the core building blocks for long-term stability across runtimes.

### Ecosystem
- CLI scaffolder is stable and DX-polished ([create-trifrost](https://github.com/trifrost-js/create-trifrost))
- Documentation available at [trifrost.dev](https://trifrost.dev)
- JSX-native support (opt-in) is ready for real-world use
- Production demo: [Atomic Arcade](https://arcade.trifrost.dev)

---

This is just the beginning.

More runtimes, examples, new modules will arrive in the next couple of months — TriFrost 1.0 is the foundation, not the finish line.

Stay frosty. ❄️

## [0.54.1] - 2025-07-15
### Improved
- **deps**: Upgrade @cloudflare/workers-types to 4.20250715.0
- **deps**: Upgrade @types/node to 22.16.4
- **deps**: Upgrade eslint to 9.31.0
- **deps**: Upgrade typescript-eslint to 8.37.0

### Fixed
- Fix an issue in Workerd where default MemoryCache was not wrapped in a lazy init method during app construction if no cache is provided. (global `setInterval` is disallowed in Workerd)

## [0.54.0] - 2025-07-14
This release includes a few final breaking adjustments and ergonomic improvements, the result of formalizing the caching and rate limiting subsystems during documentation.

These changes align the cache and rateLimit options with how tracing exporters are already defined, improving flexibility and consistency across runtime-bound environments like Cloudflare Workers.

### Added
- **feat**: `ctx.cache.skip(...)` as an instance alias for `cacheSkip(...)`. You can now dynamically opt out of caching results during execution, even inside `.wrap(...)` or `@cache(...)`-decorated methods straight from `ctx.cache` without having to import `cacheSkip`. Cache skipping avoids polluting your cache with nulls, errors, or partial fallbacks, especially useful when working with flaky APIs or time-sensitive data.
```typescript
const data = await ctx.cache.wrap('expensive:key', async () => {
  try {
    const result = await fetchStuff();
    return result;
  } catch (err) {
    ctx.logger.warn('Failed to fetch', err);
    return ctx.cache.skip(null); // ❌ don't cache failures
  }
});
```
```typescript
import {cache} from '@trifrost/core';

class MyService {
  @cache(ctx => `user:${ctx.state.userId}`, {ttl: 300})
  async getUser(ctx) {
    try {
      return await fetchUser(ctx.state.userId);
    } catch {
      return ctx.cache.skip(null); // ❌ don't cache error state
    }
  }
}
```

### Breaking
- App options `cache` and `rateLimit` now **require deferred initializer functions**. Previously, you could pass a fully constructed `TriFrostCache` or `TriFrostRateLimit` instance directly into `new App(...)`. This is no longer supported. Instead, you must now provide **a function that receives {env} and returns the instance**. This enables runtime-aware setup, lazy wiring, and conditional logic like isDevMode(...) and also **aligns it with how tracing exporters** are configured.

**Before (❌ now invalid)**:
```typescript
new App<Env>({
  cache: new DurableObjectCache({
    store: ({env}) => env.MainDurable,
    ttl: 60
  }),
  rateLimit: new DurableObjectRateLimit({
    store: ({env}) => env.MainDurable,
    strategy: 'sliding',
    window: 60,
  }),
});
```

**After (✔ required)**:
```typescript
new App<Env>({
  cache: ({env}) => new DurableObjectCache({
    store: env.MainDurable,
    ttl: 60
  }),
  rateLimit: ({env}) => new DurableObjectRateLimit({
    store: env.MainDurable,
    strategy: 'sliding',
    window: 60,
  }),
});
```

**Allows for logic regarding cache/rateLimit selection**:
```typescript
new App<Env>({
  cache: ({env}) => {
    if (isDevMode(env)) return new MemoryCache({ttl: 60});
    return new DurableObjectCache({store: env.MainDurable, ttl: 60});
  },
  rateLimit: ({env}) => {
    if (isDevMode(env)) return new MemoryRateLimit({strategy: 'sliding', window: 60});
    return new DurableObjectRateLimit({
      store: env.MainDurable,
      strategy: 'sliding',
      window: 60,
    });
  }
});
```

---

TriFrost continues to move toward a tightly consistent, runtime-aware core.

With caching and rate limiting now unified under deferred initialization, and with skip logic formalized, we’re within reach of a stable surface for 1.0.

Let’s lock it down, and as always, stay frosty ❄️.

## [0.53.2] - 2025-07-13
### Improved
- **sys**: Add NodeRuntime, BunRuntime, WorkerdRuntime to package exports

## [0.53.1] - 2025-07-13
### Improved
- **feat**: `trustProxy` is now automatically inferred from the environment. It checks `TRIFROST_TRUSTPROXY`, falling back to `SERVICE_TRUSTPROXY` and `TRUSTPROXY` in order. This improves DX and removes the need for manual config in non-trusted environments.
```bash
# Example
TRIFROST_TRUSTPROXY=true
```
- **feat**: You can now turn off `requestId` in tracing config by passing it as `null` explicitly.

### Breaking
- Removed explicit `trustProxy` option from the `App` constructor. Environment-based inference is now canonical. This change **centralizes trust detection and reduces the chance of misconfiguration in edge or proxy-aware environments**. At the same time it also allows the same App to be deployed in multiple locations without any code changes.

## [0.53.0] - 2025-07-13
This release introduces dedicated support for healthcheck routes, improves dx with tracing exporters, and resolves a typing inconsistency in cookie configuration. It’s a quality-of-life bump with production-readiness in mind.

### Added
- **feat**: `App.health` and `Router.health`, shortcut methods to register a `GET` route with kind `"health"`. These routes are excluded from rate limiting and are intended for health checks (e.g., Kubernetes probes).

### Improved
- **dx**: `tracing.exporters` can now return a single exporter object in addition to an array. Previously, only arrays were accepted.

### Fixed
- **dx**: Fixed a type mismatch in the `cookies` option of `App`. The option now properly accepts `cookies` as the configuration object, instead of requiring `{config}` wrapping.

---

As always, stay frosty ❄️.

## [0.52.0] - 2025-07-12
This is a transformative release introducing the renewed **Atomic Modules** system, a zero-bundle, zero-compiler approach to embedding server-defined modules directly into the browser.

Modules are now delivered **just-in-time**, only when referenced inside `<Script>` blocks. No bundling, no imports, no dead code.

### Added
- **feat**: `createModule(...)` API, define modules using a dedicated factory:
```typescript
export const { Module } = createModule({ css });
```
- **feat**: `createScript(...)` now accepts a `modules` map:
```typescript
export const { Script } = createScript({
  atomic: true,
  css,
  modules: {
    modal: Modal,
    audio: AudioPlayer,
  },
});
```
- **feat**: Atomic utils (`$`) now receive **typed access** to the modules you register:
```tsx
<Script>
  {({ el, $ }) => {
    $.modal.open({ frag: '/about' });
    $.audio.play('intro');
  }}
</Script>
```
- **feat**: **Just-In-Time Module Delivery**, Modules referenced via `$.<name>` inside a script block will be **automatically detected** and included in the client payload **only if they aren't already present**.

### Improved
- **feat**: **Smarter ScriptEngine** - Function bodies are now parsed for `$.<module>` references. Missing modules are auto-registered and included in SSR output **if not yet on the frontend**.
- **feat**: **Flexible Module Design** - Modules are now plain functions — no JSX, no wrappers, no need to render anything:
```typescript
export function Modal () {
  return Module({
    name: 'modal',
    mod: ({ mod, $ }) => {
      ... // Do logic here (eg define functions, create dom nodes if necessary)

      /* The return result will be registered on Atomic Utils */
      return {
        open: () => ...,
        close: () => ...
      };
    },
  });
}
```
- **dx**: **Full Typing Pipeline** - Your module return types flow into the `$` util with no manual typing, making authoring expressive and predictable.

### Breaking
- `Module` **is no longer part of** `createScript(...)` return, you must now use `createModule(...)` to get access to the `Module` factory.
- `Module` is no longer a JSX element. The new API:
```typescript
import {Module} from "~/script";

export function Modal () {
  ...

  return Module({
    name: "modal",
    data: {cls},
    mod: ({data, $}) => {
      ...

      return {
        ... // Your methods that you want to expose to $.modal.X
      };
    },
  });
}
```

### Why Atomic Modules?
Scripts are often the connective tissue between your UI and logic, but traditionally require bundlers, import graphs, or manual registration.

Atomic Modules remove that constraint. They're:
- Declared server-side
- Registered as functions
- Used on-demand
- Delivered just-in-time

This gives you fully reactive, client-accessible logic with **no bundling** or compilers. Just fragments and function literals.

✅ Use case: Modal, Audio, Notifications, Haptics, Services, Shared Methods, etc.

##### 📦 Examples
**Define a Module**
```typescript
// Modal.ts
export const Modal = Module({
  name: 'modal',
  mod: ({ $ }) => {
    let root: HTMLDivElement | null = null;

    function open(frag: DocumentFragment) {
      root = $.create('div', { children: [frag] });
      document.body.appendChild(root);
    }

    function close() {
      if (root) root.remove();
      root = null;
    }

    return {
      open: async ({frag}:{frag:string}) => {
        if (root) root.remove();

        const res = await $.fetch<DocumentFragment>(frag);
        if (res.ok && res.content) open(res.content);
      },
      close,
    };
  },
});
```

**Register It**
```typescript
// script.ts
import { createScript, createModule } from '@trifrost/core';
import { type Env } from './types';
import { css } from './css';
import { Modal } from './components/modules/Modal';

export const { Module } = createModule<Env>({css});

const config = {
  atomic: true,
  css,
  modules: {
    modal: Modal,
    ... // Other modules
  },
} as const;

export const { Script, script } = createScript<typeof config, Env>(config);
```

**Access It in Markup**:
```tsx
// Within a component
<button type="button" className={css.use('linkButton')}>
  What's this?
  <Script>
    {({ el, $ }) => {
      // Note $.modal.open, this is fully typed
      $.on(el, 'click', () => $.modal.open(...));
    }}
  </Script>
</button>
```

**AudioPlayer Example**:
```typescript
// Atomic module declaration
export function AudioPlayer () {
  return Module({
    name: 'audio',
    mod: () => ({
      play: (track: string) => { new Audio(`/sounds/${track}.mp3`).play(); },
      fx: (key: string) => { /* play fx */ },
    }),
  });
}
```
```tsx
// Script usage
<Script>
  {({ $, el }) => $.on(el, 'click', () => $.audio.fx('click'))}
</Script>
```

No imports. No runtime shimming. No bundlers. Just logic — shipped atomically.

---

This is the final major release before **TriFrost v1.0**.

It lays the groundwork for the **Atomic Ecosystem**, where modules are treated as first-class, isolated, reactive, typed fragments of behavior.

TriFrost remains committed to:
- Zero-runtime boilerplate
- Full type inference
- Fine-grained delivery
- Build system independence

Welcome to **Atomic Dawn**, where logic fragments are first-class, and delivery is intelligent by default.

As always, stay frosty ❄️.

## [0.51.0] - 2025-07-11
TriFrost 0.51.0 brings improvements to atomic utilities, developer experience, and type inference. This release focuses on reducing friction in script composition and enhancing the typing system for relay events and store access.

### Added
- **feat**:  Added `$.isTouch` atomic util. This is a computed boolean which is `true` if touch capabilities are available on the client device or `false` if they aren't
- **sys**: Introduced a new pattern using `AtomicRelay` and `AtomicStore` for registering relay and store types globally. Users no longer need to manually union or import types into each script. For example (straight from Atomic arcade):
```typescript
type GameStore = {
  gameConfig: {
    music: 'on' | 'off';
    difficulty: 'beginner' | 'intermediate' | 'expert';
  };
};

type GameEvents = {
  'game:evt:boot': void;
  'game:evt:countdown': void;
};

declare global {
  interface AtomicRelay extends GameEvents {}
  interface AtomicStore extends GameStore {}
}

export function Game (...) {
  ...
}
```

### Notes on AtomicRelay and AtomicStore
TriFrost now supports global typing for atomic relay events and reactive store data. You no longer need to import or union types in each `Script` or `Module`. Just declare once, and TriFrost infers them across your entire atomic runtime.

For this purpose two new globally available interfaces have been defined:
- `AtomicRelay`: Interface for registering relay events (used in `$subscribe`, `$publish`).
- `AtomicStore`: Interface for registering global store schema types (used in `$.storeGet`, `$.storeSet`).

To extend them, users can simply declare globals in their module/script (Example from [Atomic Arcade](https://github.com/trifrost-js/example-atomic-arcade)):
```typescript
type GameStore = {
  gameConfig: {
    music: 'on' | 'off';
    difficulty: 'beginner' | 'intermediate' | 'expert';
  };
};

type GameEvents = {
  'game:evt:boot': void;
  'game:evt:countdown': void;
};

declare global {
  interface AtomicRelay extends GameEvents {}
  interface AtomicStore extends GameStore {}
}
```

💡 Use anywhere
Inside any `Script` or `Module`, your atomic types are fully typed (without having to manually union):
```tsx
<Script data={{ evtStart: 'game:evt:boot' as keyof AtomicRelay }}>
  {({ el, data, $ }) => {
    el.$subscribe(data.evtStart, () => {
      const music = $.storeGet('gameConfig').music;
      el.$publish(music === 'on' ? 'audio:play' : 'audio:pause');
    });

    el.$publish('game:evt:countdown');
  }}
</Script>
```

You get full `keyof AtomicRelay` and `keyof AtomicStore` autocompletion, and both `$publish/$subscribe` and `$.storeGet/$.storeSet` are strongly typed, **all without any imports**.
> 🧩 **Why?**
> This further removes boilerplate and enables **globally shared relay/store contracts** across all scripts, while keeping DX tight and type-safe.

---

This release reinforces TriFrost’s philosophy: type-safety without ceremony. You can now define shared data and event structures once and enjoy a consistent, auto-inferred dev experience across your atomic components.

Stay sharp — more refinements are on the way. And as always, stay frosty ❄️.

## [0.50.0] - 2025-07-11
### Improved
- **qol**: Wildcard (`*`) route segments now populate a `'*'` key in `ctx.state`, capturing the matched tail path.
```typescript
app.get('/docs/*', ctx => {
  const rest = ctx.state['*']; // e.g. 'getting-started/setup'
  return ctx.text(`Matched path: ${rest}`);
});
```
```typescript
app.get('/blog/:year/:month/*', ctx => {
  const { year, month, '*': slugPath } = ctx.state;
  return ctx.json({ year, month, slugPath });
});
```

> Request to /blog/2024/07/post/deep/title yields:
```json
{
  "year": "2024",
  "month": "07",
  "slugPath": "post/deep/title"
}
```

## [0.49.0] - 2025-07-11
This update introduces a round of context ergonomics and spec-aligned header behavior improvements, ensuring TriFrost is even more predictable and introspectable at runtime.

### Added
- **feat**: Added `ctx.resHeaders` readonly getter, which allows you to introspect the current set of outbound headers
- **feat**: Added `ctx.delHeaders` allowing you to remove multiple outbound headers at once by passing an array of strings
```typescript
ctx.setHeader('x-foo', 'bar');
ctx.setHeader('x-bar', 'baz');
ctx.setHeader('x-baz', 'qux');

ctx.delHeaders(['x-foo', 'x-baz']);

ctx.resHeaders; /* {'x-bar': 'baz'} */
```

### Improved
- **qol**: `ctx.render` now merges the passed options on top of the defaults
- **qol**: Inbound and outbound headers will now be treated as case insensitive and be lowercased (as per [RFC 7230](https://datatracker.ietf.org/doc/html/rfc7230#section-3.2) and [RFC 9110](https://datatracker.ietf.org/doc/html/rfc9110))

---

These changes help bring TriFrost's context handling in line with HTTP spec expectations while improving DX for response construction and rendering.

As always, stay frosty ❄️.

## [0.48.0] - 2025-07-10
This release upgrades TriFrost's observability layer with faster scramblers, enhanced infrastructure secret detection, and smarter host resolution while continuing to refine the core developer experience.

### Added
- **feat**: Added `OMIT_PRESETS.infra` to automatically redact infrastructure secrets like GitHub tokens, Stripe keys, AWS/GCP credentials, and JWT-style tokens. The **infra** preset is also included in the **defaults** used by the log scrambler. Scrambling (introduced in [0.28.0](https://www.trifrost.dev/news/releases/0.28.0)) helps redact sensitive fields from logs — see [redaction & scrambling docs](https://www.trifrost.dev/docs/logging-observability#redaction-scrambling-support) for details.
- **feat**: Added `ctx.domain` getter, which extracts the domain from the resolved host (e.g. `sub.example.com` -> `example.com`).
- **feat**: Host configuration now uses `TRIFROST_HOST`, falling back to `SERVICE_HOST` and `HOST` environment variables. Treating them as canonical in non-trusted environments.

### Improved
- **perf**: ~10% faster `isValidTraceId` via optimized ASCII range checks in Logger module
- **perf**: Improved `createScrambler()`, with smarter pattern matching and lazy cloning, performance across all presets improved by **20–50%**, **even with expanded infra redaction**.
- **qol**: Observability traces now include `http.host` for better visibility and trace correlation.
- **security**: Host detection from headers (`x-forwarded-host`, `forwarded`) now only occurs when `trustProxy: true` is explicitly enabled (default in trusted environments like Cloudflare Workers). Otherwise, it falls back to environment-based resolution or `0.0.0.0`.
- **misc**: Adjusted build system to dual-build ESM + CJS output.

### Breaking
- Removed `host` as an option on `App`. Host is now determined entirely from environment variables or request headers (see **Added** and **Improved**).

---

Faster scramblers, smarter defaults, and no secrets left behind.

Stay fast. Stay minimal. Stay frosty ❄️.

## [0.47.5] - 2025-07-09
### Improved
- **qol**: Arc atomic hydration is now run against the scope of the fragment for node selection rather than document
- **qol**: Arc atomic hydration now removes data-fthf and data-tfhd attributes once a node is hydrated

## [0.47.4] - 2025-07-08
### Fixed
- Fix an edge case issue where if a relay event has multiple subscribers one of which uses subscribeOnce some subscribers could be skipped due to internal mutation of subs while iterating.

## [0.47.3] - 2025-07-08
### Fixed
- Fix issue with arc tflog registration

## [0.47.2] - 2025-07-08
### Improved
- **qol**: Minor byte gains in Atomic

## [0.47.1] - 2025-07-08
### Improved
- **qol**: In [dev mode](https://www.trifrost.dev/docs/utils-devmode) Atomic will now log debug messages on failure of script or module instantiation as well as mounting.

## [0.47.0] - 2025-07-08
Leaning further into Atomic’s design ethos: zero-cost primitives, sharp utilities, and predictably reactive behavior. This release builds on what was already working, just sharper, cleaner, and more ergonomic.

### Added
- **feat**: New Atomic util `$.isArr` to verify a provided value is an array (**type guarded**)
- **feat**: New Atomic util `$.isBool` to verify a provided value is a boolean (**type guarded**)
- **feat**: New Atomic util `$.isDate` to verify a provided value is a **valid** Date instance (**type guarded**)
- **feat**: New Atomic util `$.isFn` to verify a provided value is a function (**type guarded**)
- **feat**: New Atomic util `$.isInt` to verify a provided value is an integer (**type guarded**)
- **feat**: New Atomic util `$.isNum` to verify a provided value is a finite number (**type guarded**)
- **feat**: New Atomic util `$.isObj` to verify a provided value is a plain object (**type guarded**)
- **feat**: New Atomic util `$.isStr` to verify a provided value is a string (**type guarded**)
```typescript
if ($.isArr(data.items)) {
  console.log('Array length:', data.items.length);
}

if ($.isStr(user.name)) {
  el.textContent = user.name.toUpperCase();
}
```
- **feat**: Atomic Global store (accessible through `$.storeGet` and `$.storeSet`) now retrieves data from localStorage on initialization using `"$tfs:..."` as the key prefix
- **feat**: Atomic Global store `$.storeSet` can now be passed `{persist: true}` to persist to localStorage
- **feat**: Atomic Global store now exposes a `$.storeDel` method to remove a key from memory **and** localStorage. On delete **we will also publish a relay event** in the same way that `$.storeSet` does
```typescript
$.storeSet('theme', 'dark', { persist: true }); // persisted to localStorage
const theme = $.storeGet('theme'); // returns "dark"

$.storeDel('theme'); // removes from memory and localStorage
```

### Improved
- **qol**: It is now also possible to pass a string and object to `data.$set` for leaf-specific updates.
```tsx
<Script>{({data}) => {
data.$bind('form.name', 'input[name="name"]');
data.$bind('form.lastName', 'input[name="lastName"]');
data.$set('form', {name: 'Peter', lastName: 'V'});
...
}}</Script>
```

### Fixed
- Fixed an issue with reactive data proxy not updating radio input types correctly

---

Atomic keeps getting tighter. No magic, no overhead — just state, DOM, and data doing what they're told.

More to come, but for now, as always, stay frosty ❄️.

## [0.46.3] - 2025-07-07
### Improved
- **qol**: `$.query` and `$.queryAll` can now be passed a generic, eg: `$.query<HTMLElement>('#hello');` to aid in places where its really not possible to determine.
- **qol**: `$.query` and `$.queryAll` will now properly fallback to `HTMLElement` instead of `never` when no generic is passed and inference is not possible.

## [0.46.2] - 2025-07-07
### Fixed
- timedAttr & timedClass glitch with el

## [0.46.1] - 2025-07-07
### Fixed
- Arc registration glitch with unnecessary () typo

## [0.46.0] - 2025-07-07
A powerful step forward in TriFrost’s atomic reactivity and component orchestration:
- Global `Module` components enable singleton-like behavior for app-wide coordination.
- New atomic utilities (`$.create`, `$.timedAttr`, `$.timedClass`) streamline DOM manipulation and animation.
- DX for `$.query`/`$.queryAll` is now smarter and fully typed based on CSS selectors.

This release sets the stage for a richer ecosystem of modular, event-driven architecture, and there’s more to come.

### Added
- **feat**: `createScript(...)` now also exports a `<Module>` primitive in addition to `<Script>`. Modules are **singletons**, only one instance per unique module is allowed per page render. Unlike `<Script>`, `<Module>` is not tied to a DOM node and is ideal for global logic or event handling. Relay helpers like `$subscribe` and `$publish` are available on the `mod` object, as well as access to the atomic `$` utils and `data` reactive proxy. There's more coming for Modules so stay tuned.
```typescript
// script.ts
import {createScript} from '@trifrost/core';

const config = {
  atomic: true;
} as const;

const {Script, Module, script} = createScript<typeof config>(config);
export {Script, Module, script};
```
```tsx
import {Module} from '~/script';

// Example audio module.
export type AudioEvents = {
  'audio:play': string;
};

<Module name="audio">{({mod, $}) => {
  mod.$subscribe('audio:play', val => {
    const sound = new Audio(val);
    sound.play();
  });
}}</Module>
```
- **feat**: Atomic util `$.create` creates a new dom node and internally switches to `createElementNS` for known svg tags. The **return element is typed according to the tag**.
```typescript
$.create('div', {
  attrs: { id: 'box', 'data-state': 'active' },
  style: { backgroundColor: 'red', transform: 'scale(1.2)' },
}); /* Returns HTMLDivElement */
```
```typescript
$.create('svg', {
  attrs: { viewBox: '0 0 100 100' },
  style: { width: '100px', height: '100px' },
}); /* Returns SVGSVGElement */
```
- **feat**: Atomic util `$.timedAttr` allows you to set a temporary attribute which gets removed after X ms, with optional 'after' behavior and 'value'
- **feat**: Atomic util `$.timedClass` allows you to set a temporary class which gets removed after X ms, with optional 'after' behavior
```typescript
$.timedAttr(el, 'data-destroying', {
  duration: 200,
  after: () => el.remove(),
});

$.timedClass(el, 'squish', {duration: 220});
```

### Improved
- **dx**: `$.query` and `$.queryAll` now try to infer the returning type off of the provided query. If not possible to determine we fall back to `Element`
```typescript
$.query(el, 'div');                           // HTMLDivElement | null
$.query(el, 'svg > path');                    // SVGPathElement | null
$.query(document, 'section > svg > circle');  // SVGCircleElement | null
$.query(document, '.some-class');             // Element | null (fallback)
$.query(document, '[data-x]');                // Element | null
$.queryAll(el, 'div > p');                    // HTMLParagraphElement[]
$.query(el, 'div + span');                    // HTMLSpanElement | null
$.queryAll(document, 'section ~ svg');        // SVGSVGElement[]
$.queryAll(el, 'ul > li');                    // HTMLLIElement[]
```
- **deps**: Upgrade @cloudflare/workers-types to 4.20250705.0
- **deps**: Upgrade @types/node to 22.16.0
- **deps**: Upgrade bun-types to 1.2.18
- **deps**: Upgrade eslint to 9.30.1
- **deps**: Upgrade typescript-eslint to 8.35.1

---

As TriFrost continues to evolve into a **composable reactive runtime** we feel we're coming very close to a 1.0 now.

More to come, but for now, as always, stay frosty ❄️.

## [0.45.3] - 2025-07-05
### Added
- **feat**: Atomic util `$.blurActive()` removes focus from the currently active element
- **feat**: Atomic VM now has `$subscribeOnce` as well, allowing you to listen for the first occurrence of a relay event and auto-unsubscribe afterwards

### Improved
- **qol**: Arc is now also defined as immutable and unpacks itself through an IIFE

## [0.45.2] - 2025-07-05
### Improved
- **qol**: Script engine injection will no longer inject arc wait wrapper if it knows its in a fragment. Reducing fragment script injections even more

## [0.45.1] - 2025-07-05
### Fixed
- Typing for `$.cssVar` and `$.cssTheme` as returning string instead of string|null.

## [0.45.0] - 2025-07-05
### Added
- **feat**: `createScript({ css })` API, you can now pass a `css` instance into `createScript`, enabling automatic type inference for atomic CSS token access.
- **feat**: Atomic util `$.cssVar(name)` for retrieving computed CSS values from `css.var` tokens.
- **feat**: Atomic util `$.cssTheme(name)` for retrieving computed CSS values from `css.theme` tokens.
```typescript
// css.ts
import {createCss} from '@trifrost/core';

export const css = createCss({
  var: {
    fontSizeM: '1.8rem',
    spacingS: '0.5rem',
  },
  theme: {
    fg: '#000',
    bg: '#fff',
  },
});
```
```typescript
// script.ts
import {createScript} from '@trifrost/core';
import {css} from './css';
import {type Env} from './types';

const config = {
  css,
  atomic: true,
} as const;

const {Script, script} = createScript<typeof config, Env, /* Other generics */>(config);
export {Script, script};
```
```tsx
// Some component file
export function SomeComponent() {
  return (
    ...
    <Script>
      {(el, $) => {
        // ✅ Fully typed and autocompletable
        el.style.fontSize = $.cssVar('fontSizeM');
        el.style.background = $.cssTheme('bg');
      }}
    </Script>;
    ...
  );
}
```

### Improved
- **dx**: Atomic `$watch` and `$bind` callbacks now receive `(newVal, oldVal)` arguments instead of just `(newVal)`, enabling more expressive data change tracking and comparisons.
- **qol**: When using only `string`-based theme variables (without `{ light, dark }`), TriFrost will no longer inject media queries for them, they are treated as regular vars. These are still available via `css.$t`.
- **qol**: ARC no longer ref-cleans method bindings thanks to the LRU cookie system, it now exclusively manages data prop references.

### Breaking
- `createScript` now requires passing the config type explicitly as the first generic. This unlocks better type inference (e.g. CSS token safety) and paves the way for future DX improvements.

## [0.44.3] - 2025-07-04
### Improved
- **qol**: ARC script injection now tracks previously delivered script hashes using an LRU-style cookie (capped at 64 entries). When a known hash is detected, the corresponding inline script is skipped to reduce client payload size. This list is automatically reset on full-page navigations.
- **qol**: ARC self-removal is now deferred via `setTimeout` to avoid breaking hydration in Safari Mobile and other browsers with strict script execution timing.

## [0.44.2] - 2025-07-04
### Fixed
- Issue where awaited arc instantiation prevents script removal

## [0.44.1] - 2025-07-04
### Fixed
- Issue with window vs w shorthand in new Arc spark method

## [0.44.0] - 2025-07-04
This release adds lean, deterministic ARC-style lifecycle behavior to the scripting engine. It cuts down your per-fragment script size dramatically while enabling automatic DOM removal of hydrated scripts and data when no longer necessary.

In addition to the above we've included several runtime quality-of-life upgrades.

### Added
- **feat**: Integrate an [ARC-style (Automatic Reference Counting)](https://en.wikipedia.org/wiki/Automatic_Reference_Counting) lifecycle to automatically release functions/data on DOM removal from injected `<Script>` blocks.

### Improved
- **qol**: Atomic style observer now detects deeply nested style shards via recursive traversal.
- **qol**: Bun and Node runtimes now fallback to `null` if version detection fails, aligning `runtime.version` behavior across runtimes.
- **qol**: Workerd runtime now returns a 500 response if no incoming handler is registered, instead of returning `undefined`.

### What is ARC?
ARC (Automatic Reference Counting) is a memory management technique where objects are retained or released based on how many references exist to them.

In TriFrost, it ensures that each DOM-bound function or data payload is automatically cleaned up when no longer used, without relying on a garbage collector.

It’s deterministic, lightweight, and perfect for fragment-based hydration.

---

TriFrost continues to push toward a leaner, smarter edge, onward to `1.0`.

As always, stay frosty ❄️

## [0.43.3] - 2025-07-03
### Improved
- **dx**: Improved type inference for `$.on` and `$.once` in the Atomic Runtime. These utilities now intelligently infer the correct event type based on the `EventTarget`, including support for `HTMLElement`, `Document`, and `Window`. Custom events continue to work seamlessly for unknown keys.
```tsx
$.on(window, 'resize', evt => {
  // evt is inferred as UIEvent
});

$.on(document, 'custom-event', (evt) => {
  // evt is inferred as CustomEvent<...>
});
```

## [0.43.2] - 2025-07-03
### Improved
- **qol**: list of tags that will be automatically prepended with a space by the style engine has been expanded to include the following svg tags: `mask`, `text`, `tspan`, `textPath`, `defs`, `symbol`, `use`, `clipPath`, `pattern`, `linearGradient`, `radialGradient`, `stop`, `filter`, `feBlend`, `feColorMatrix`, `feComponentTransfer`, `feComposite`, `feConvolveMatrix`, `feDiffuseLighting`, `feDisplacementMap`, `feDropShadow`, `feFlood`, `feGaussianBlur`, `feImage`, `feMerge`, `feMergeNode`, `feMorphology`, `feOffset`, `feSpecularLighting`, `feTile`, `feTurbulence`,
- **qol**: list of tags that will be automatically prepended with a space by the style engine has been expanded to include the following html tag: `dialog`
- **qol**: css function normalization behavior now also includes `attr`, `image`, `conic-gradient`, `repeating-linear-gradient` and now internally uses a set rather than a regex. These get normalized to css without their wrapping `"..."` signs.

## [0.43.1] - 2025-07-03
### Improved
- **qol**: `<Script>` components that **do not reference any arguments** (like `el`, `data`, or `$`) are now rendered **inline** instead of being registered in the (atomic) script engine. This enables immediate execution, useful for boot-time logic like theme/locale detection:
```tsx
/* Theme detection */
<Script>
  {() => {
    const saved = localStorage.getItem('theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', saved || preferred);
  }}
</Script>
```
```tsx
/* Locale detection */
<Script>
  {() => {
    const locale = navigator.language?.startsWith('fr') ? 'fr' : 'en';
    document.documentElement.setAttribute('data-lang', locale);
  }}
</Script>
```

## [0.43.0] - 2025-07-02
The **Crystal** release refines TriFrost’s styling core with expressive animation support, dynamic composition, and smoother ergonomics across the board.

With `css.animation(...)`, prebuilt keyframes are now first-class, fully typed, overrideable, and composable.

Style definitions have evolved into callable units via `css.defs`, unlocking dynamic, runtime-aware styling while keeping the authoring experience pure and declarative.

### Added
- **feat**: Register prebuilt animations via `createCss({animations: {...}})` for reusable keyframe definitions
- **feat**: `css.animation(name, overrides?)` method on `css` instance, fully typed, override-capable, returns granular animation CSS props
- **feat**: `css.defs` now exposes all registered `definitions` as direct, callable methods (e.g. `css.defs.card()`), improving ergonomics and enabling dynamic, fully typed, parameterized style generation.

### Improved
- **qol**: Atomic removal now applies depth-first traversal when unmounting removed dom nodes.
- **feat**: `definitions` in `createCss` now allow for usage of `keyframes` and `animation` in definitions.

### Breaking
- **feat**: `definitions` in `createCss` now need to be passed as functions returning the definition. (see Added and improved)

### Animation Examples
##### Baseline registration and use
```typescript
const css = createCss({
  animations: {
    pulse: {
      keyframes: {
        from: { opacity: 0.5 },
        to: { opacity: 1 },
      },
      duration: '0.6s',
      easingFunction: 'ease-in-out',
    },
  },
});

const cls = css({
  ...css.animation('pulse'),
  opacity: 0,
});

const cls2 = css({
  ...css.animation('pulse', { duration: '1s', iterationCount: 'infinite' }),
  opacity: 0,
});
```

##### In combination with css.use
```typescript
// css.ts
const css = createCss({
  animations: {
    fadeInUp: {
      keyframes: {
        from: { opacity: 0, transform: 'translateY(10px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      duration: '0.4s',
      easingFunction: 'ease-out',
    },
  },
  definitions: css => ({
    card: () => ({
      padding: '1rem',
      borderRadius: '0.5rem',
      backgroundColor: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }),
  }),
});
```

```tsx
// Component.tsx
const cls = css.use('card', css.animation('fadeInUp', { delay: '100ms' }));

return <div className={cls}>Animated Card</div>;
```

##### 🎬 Using .animation(...) inside a definition
```typescript
// css.ts
const css = createCss({
  animations: {
    fadeIn: {
      keyframes: {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      duration: '0.3s',
      easingFunction: 'ease-in',
    },
  },
  definitions: css => ({
    // Animation-enhanced button definition
    button: () => ({
      ...css.animation('fadeIn'),
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      backgroundColor: css.$t.bg_button,
      color: css.$t.text_button,
      [css.hover]: {
        filter: 'brightness(1.1)',
      },
    }),
  }),
});
```
```tsx
// Component.tsx
const cls = css.use('button');
return <button className={cls}>Click Me</button>;
```

##### Dynamic definition
```typescript
const css = createCss({
  definitions: css => ({
    alert: (variant: 'info' | 'warning' | 'danger') => ({
      backgroundColor: {
        info: 'lightblue',
        warning: 'gold',
        danger: 'crimson',
      }[variant],
      color: '#fff',
      padding: '1rem',
    }),
  }),
});

const cls = css(css.defs.alert('warning'));
```

---

**Trifrost’s style system now breathes**. Animations are first-class, definitions are dynamic, and your design tokens flow seamlessly from logic to UI. Fewer barriers. More expressiveness.

Let the authoring feel as fluid as the interface it creates.

As always, stay frosty ❄️

## [0.42.6] - 2025-07-02
### Improved
- **qol**: Bun runtime will no longer validate port to be passed (as now checked by determinePort util)
- **qol**: Node runtime will no longer validate port to be passed (as now checked by determinePort util)

## [0.42.5] - 2025-07-01
### Improved
- **qol**: Add exports for `JWTError`, `JWTMalformedError`, `JWTTypeError`, `JWTTimeError`, `JWTClaimError`, `JWTAlgorithmError`, `JWTSignatureError`
- **qol**: Make `algorithm` option when verifying JWT optional and default to `HS256` (the same default as when signing)

## [0.42.4] - 2025-07-01
### Improved
- **qol**: `ctx.render` will now also automatically prepend `<!DOCTYPE html>` if it sees a full page html string

## [0.42.3] - 2025-07-01
### Improved
- **qol**: All core globals within the **atomic runtime** are now defined using a unified `def()` helper that marks them as fully immutable. This ensures they can’t be overwritten, redefined, or deleted at runtime, closing off accidental or malicious tampering from userland and solidifying the runtime's integrity.
- **qol**: Encapsulated IIFEs are now used for all runtime initializers within the **atomic runtime**, further reinforcing the runtime.

## [0.42.2] - 2025-07-01
### Improved
- **feat**: The new style sharding strategy is now `nonce` compliant as well. A `tfnonce` is now issued as an **httpOnly secure cookie** during full page SSR. This allows fragment renders to work with nonce propagation for the nonce that is currently in use on the full page.

## [0.42.1] - 2025-06-30
### Fixed
- Fix behavior where document.body is not available yet, causing mutation observer to not function properly

## [0.42.0] - 2025-06-30
This release further **evolves the internals of the TriFrost style engine**, focusing on performance, DX simplicity, and hydration resilience.

It introduces a **deterministic style sharding strategy**, automatic context-aware injection, and measurable speed gains across core hashing utilities, all designed to make styling in TriFrost faster, safer, and fully fragment-compatible out of the box.

### Improved
- **feat**: New `data-tfs` sharding strategy in the style engine. Style injection now **intelligently distinguishes between full-page and fragment renders**: Full-page renders will receive a single `<style data-tfs-p>` block called the prime. Fragment renders now receive individual isolated `<style data-tfs-s="...">` blocks per class or global rule, called shards. A runtime `MutationObserver` automatically merges these into the prime if present, ensuring deduplicating on arrival.
- **dx**: No more manual `<Style />` boilerplate. The style engine now **auto-injects styles** as needed, there's no longer any requirement to manually include a `<Style />` component for either full page or partial renders.
- **feat**: Added `css.disableInjection()` opt-out. You may now disable all style injection during a render pass by calling `css.disableInjection()` on the style engine. This is useful for rendering static content or precomputed styles, though the new sharding strategy should make most opt-outs unnecessary.
- **perf**: Improved `djb2Hash` utility (which is used to compute hashes in both the style and scripting engine) by applying bit twiddling below 4K chars and above 60K chars. Yielding **anywhere from 3% to 30% performance improvement depending on the size of the value** (30%+ on values below 4k chars). Benchmark for this is available at `test/bench/utils/generic.bench.ts`.

### Fixed
- Fix an issue where in non-atomic mode we would wrap with atomic utils and atomic data proxy when instantiating script functions.

---

With these changes, TriFrost is now even more equipped to support **zero-boilerplate styling, incremental style streaming**, and **high-performance atomic fragment injection** without giving up control or determinism.

As always, stay frosty ❄️

## [0.41.3] - 2025-06-29
### Improved
- **deps**: Upgrade @cloudflare/workers-types to 4.20250628.0
- **deps**: Upgrade @types/node to 22.15.34
- **deps**: Upgrade eslint to 9.30.0

### Fixed
- Issue where $bind with direct watcher is not working due to inconsistency with this in proxy

## [0.41.2] - 2025-06-29
### Improved
- **dx**: `$.clear`, `$.fire`, `$.on`, `$.once` are now typed with `Element` rather than `HTMLElement` to ensure accuracy
- **dx**: `$.query` and `$.queryAll` are now typed with `Node` to ensure accuracy

## [0.41.1] - 2025-06-29
This release refines Atomic’s DOM tooling for broader compatibility and better developer experience

### Improved
- **dx**: Loosened type constraints on `$.query` and `$.queryAll` in Atomic Utils. These functions now accept any `ParentNode`, allowing direct use on `document`, `DocumentFragment`, etc. Without type assertions.
- **dx**: Automatically prepends `:scope` to selectors when appropriate (for example when root is an Element and selector doesn’t already start with `:scope`). This improves ergonomics when selecting relative children without needing to manually write scoped queries.
- **safety**: Added internal guards to `$.query`/`$.queryAll` to validate selector strings and gracefully handle invalid queries. These guards avoid runtime crashes from malformed selectors or unsupported nodes.
- **ergonomics**: Developers can now reliably write queries like `$.query(document, 'body')` or `$.query(root, 'div > img')` without worrying about scoping quirks or environment-specific selector issues.

### Fixed
- Edge case in new atomicMinify utility with certain keywords requiring space postfixes that were being stripped. Fixed by adding a sentinel value pre-minification.
- Ensure atomicMinify safely handles non-ascii chars as well (eg CJK)

---

As always, stay frosty ❄️

## [0.41.0] - 2025-06-29
This release brings refinement to the Atomic layer, improving ergonomics, performance, and type safety. The new destructured `Script` API makes logic blocks cleaner to write and easier to extend, while internals like `atomicMinify` and `$fetch` util receive notable upgrades. A small breaking change for a frostier future.

### Improved
- **dx**: Add missing type definition for `clear` util in Atomic Utils. `$.clear` clears a dom node from its children using the much-used `while (node.firstChild) node.removeChild(node.firstChild)` pattern.
- **dx**: Ensure proper generic usage for the `fetch` util in Atomic Utils. `$.fetch<DocumentFragment>(...)` will now correctly type `res.content` as `DocumentFragment | null`.
- **perf**: Introduced a new byte-level minification utility (`atomicMinify`) optimized for inline runtime payloads like Atomic Runtime or Script blocks. Minification is now also applied to Script blocks, previously only to the atomic runtime.

### Breaking
- Atomic Script invocation now uses a **destructured** `{el, data, $}` **bag instead of positional arguments**. This change simplifies authoring and enables future-proof extensibility. Rather than receiving three positional arguments `(el, data, $)`, your Script blocks now get a single object that you can destructure.

Examples:
```tsx
/*  BEFORE */
<Script>
  {/* Must list all 3 args to access `$`, even if unused */}
  (el, data, $) => {
    $.clear(el);
  }
</Script>

/* AFTER */
<Script>
  ({el, $}) => {
    $.clear(el); // Cleaner, only what you need
  }
</Script>
```
```tsx
/* BEFORE */
<Script data={{form: {type: 'all'}}}>
  (el, data, $) => {
    data.$bind('form.type', 'select');
    ...
  }
</Script>

/* AFTER */
<Script data={{form:{type: 'all'}}}>
  ({data}) => {
    data.$bind('form.type', 'select');
    ...
  }
</Script>
```

This approach unlocks future enhancements **without breaking consumer code again**, as new keys can be added to the object without forcing users to update all parameters. This is the **final structural change** to Atomic’s runtime shape, all future improvements will be additive to this core contract.

### Notes on atomicMinify
- **3–4× faster** than previous regex-based minification (benchmark in `/test/bench/modules/JSX/script/util.bench.ts`)
- Strips line comments and unnecessary whitespace
- Preserves string literals and required spacing between identifiers
- Handles template literals, nested expressions, regexes, and escapes correctly
- Designed for controlled, internally-generated JS — perfect for VM scripts and embedded logic
- Zero regex, zero GC pressure, single-pass streaming performance

---

We're continuing our march toward 1.0, fewer keystrokes, more power. This release locks in the **final structure of Atomic’s reactive runtime**. The foundation is now frozen; the surface can evolve freely.

As always, stay frosty ❄️

## [0.40.0] - 2025-06-28
This release cracks open a leaner, meaner era for the Atomic layer. We’ve surgically extracted node-bound behavior and reassembled it into a centralized `$` utility namespace, smaller boot footprints, faster VMs, and crystal-clear ergonomics. The new `$.fetch`? One helper to parse them all. The updated `data.$bind`? Reactive sugar with zero overhead. This is DX that moves like lightning.

If you're building on TriFrost: expect sharper form bindings, saner fetch handling, and tighter event logic. If you haven't? This is the update to start with.

### Added
- **feat**: `$` utility namespace is now available as the third argument in TriFrost Atomic `<Script>` blocks. It offers a suite of lean, performant helpers (see below).

### Improved
- **feat**: Improved `$bind` reactive data API for bindings in `<Script>` blocks. You can now pass a **callback** directly as the third argument to `$bind` to implicitly create a `$watch`, reducing boilerplate:
```tsx
data.$bind('user.name', 'input[name="username"]', (val) => {
  console.log('New name is:', val);
});
```

### Breaking Changes
Removed node-bound methods in favor of central Atomic Utils:
- `el.$dispatch(...)` → now use `$.fire(el, ...)`
- `el.$storeGet(...)` → now use `$.storeGet(...)`
- `el.$storeSet(...)` → now use `$.storeSet(...)`
- `debounce` option removed from `$watch`. To debounce a reactive watcher, wrap the callback with `$.debounce(...)` instead:
```typescript
// Before
data.$watch('query', fn, {debounce: 200});

// After
data.$watch('query', $.debounce(fn, 200));
```

> **Why this change?**: These methods were previously defined **per script-bound node**, adding weight to every node during boot.
> By consolidating them into Atomic Utils (`$`), VM instantiation is now leaner and faster, while improving clarity and reusability.

---

### Atomic Utilities
##### Event utilities
- `$.fire(el, type, {data?, mode?})`: Fires a `CustomEvent` from the provided element. Defaults to bubbling upward.
- `$.on(el, type, handler)`: Adds an event listener and returns a disposer.
- `$.once(el, type, handler)`: Adds a one-time event listener that **auto-cleans on first call**.

##### DOM utilities
- `$.query(el, selector)`: Scoped querySelector.
- `$.queryAll(el, selector)`: Scoped querySelectorAll with **array** result.

##### Global Store access
- `$.storeGet(key)`: Get a value from the global store.
- `$.storeSet(key, value)`: Set a value in the global store.

##### Miscellaneous
- `$.uid()`: Generates a random id.
- `$.sleep(ms)`: Resolves after the specified delay.
- `$.eq(a, b)`: Structural equality check.
- `$.debounce(fn, delay)`: Debounced function wrapper.
- `$.fetch(...)`: Smart wrapper around fetch with automatic body serialization and content parsing.

### Notes on $.fetch
- Automatically parses JSON, HTML, text, blobs, etc. based on the response `Content-Type`.
- Supports **timeout**: auto-aborts request after X milliseconds (internally uses AbortController)
- Supports **credentials**: Sent as `include` by default to support cookies/session auth.
- Returns
```typescript
{
  content: T | null;
  status: number;
  ok: boolean; /* True for http 2xx */
  headers: Headers;
  raw: Response | null;
}
```
- Graceful fallback: On unexpected content types or parse failures, `content` falls back to `null`.
- Safe defaults: Automatically serializes JSON payloads and sets headers unless `FormData` is used
- Auto-converts HTML response to a DocumentFragment for insertion ease
- Auto-converts Binary response to a Blob

### Usage Examples
##### Event Handling + Store Access
```tsx
<Script data={{user: {name: 'Anna'}}}>
  {(el, data, $) => {
    const btn = $.query(el, 'button')!;
    const msg = $.query(el, 'p')!;

    $.on(btn, 'click', () => {
      const token = $.storeGet('auth.token');
      msg.textContent = token ? 'Authenticated ✅' : 'No Token ❌';

      $.fire(el, 'user:click', {data: {name: data.user.name}});
    });

    $.once(el, 'user:click', e => {
      console.log('Clicked once:', e.detail);
    });
  }}
</Script>
```

##### Store Set + Validation Feedback with new $bind behavior
```tsx
<Script data={{age: 0}}>
  {(el, data, $) => {
    const status = $.query(el, 'p')!;

    data.$bind('age', 'input[name="age"]', val => {
      const isAdult = Number(val) >= 18;
      $.storeSet('user.isAdult', isAdult);
      status.textContent = isAdult ? 'Adult ✅' : 'Minor ❌';
    });
  }}
</Script>
```

##### Combined Utilities: Debounced watch + Sleep
```tsx
<Script data={{search: ''}}>
  {(el, data, $) => {
    const resultBox = $.query(el, '.results')!;

    data.$bind('search', 'input[name="search"]');

    data.$watch('search', $.debounce(async (term) => {
      if (!term || term.length < 3) {
        resultBox.textContent = 'Enter at least 3 characters...';
        return;
      }

      resultBox.textContent = 'Searching...';
      await $.sleep(500); // simulate async

      // Fake result
      resultBox.textContent = term.toUpperCase();
    }, 300));
  }}
</Script>
```

##### Basic JSON Fetch
```tsx
<Script>{async (el, data, $) => {
  const {status, content} = await $.fetch('/api/user');
  if (status === 200) console.log('User:', content);
}}</Script>
```

##### HTML Fragment Fetch and Inject
```tsx
<div>
  <button>Load Content</button>
  <section></section>
  <Script>{(el, data, $) => {
    const btn = $.query(el, 'button')!;
    const section = $.query(el, 'section')!;

    $.on(btn, 'click', async () => {
      const {status, content} = await $.fetch<DocumentFragment>('/snippet.html');
      if (status === 200 && content) {
        section.replaceChildren(content);
      }
    });
  }}</Script>
</div>
```

##### POST JSON Payload
```tsx
<Script>{async (el, data, $) => {
  const {status, content} = await $.fetch<{userId: string}>('/api/create-user', {
    method: 'POST',
    body: {name: 'Alice', age: 30}
  });

  if (status === 201) {
    console.log('Created user:', content);
  }
}}</Script>
```

##### Accessing Response headers
```tsx
<Script>{async (el, data, $) => {
  const {headers} = await $.fetch('/api/data');
  const contentType = headers.get('Content-Type');
  console.log('Got content-type:', contentType);
}}</Script>
```

##### Blob Fetch (eg: download)
```tsx
<Script>
  {async (el, data, $) => {
    const {status, content} = await $.fetch<Blob>('/download/file.zip');
    if (status === 200 && content) {
      const url = URL.createObjectURL(content);
      window.open(url, '_blank');
    }
  }}
</Script>
```

##### Timeout Fetch
```tsx
const res = await $.fetch('/api/heavy', { timeout: 3000 });
if (!res.ok) console.error('Request timed out or failed');
```

##### Login form with submit and redirect
```tsx
<form>
  <input name="username" type="text" placeholder="Username" required />
  <input name="password" type="password" placeholder="Password" required />
  <button type="submit">Login</button>
  <p class="error"></p>
  <Script>{(el, data, $) => {
      const error = $.query(el, '.error')!;
      let is_running = false;

      /* Submit form */
      $.on(el, 'submit', async (e) => {
        e.preventDefault();

        /* Do nothing if already loading */
        if (is_running) return;

        is_running = true;
        error.textContent = '';

        const res = await $.fetch<{message:string}>('/api/login', {
          method: 'POST',
          body: new FormData(el),
        });

        /* If we get a redirect, do so */
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get('Location');
          if (loc) window.location.href = loc;
          return;
        } else {
          is_running = false;
          error.textContent = res.content?.message || 'Login failed. Try again';
        }
      });
    }}
  </Script>
</form>
```

---

> A glint in the ice. A signal in the silence. With **Cobalt Pulse**, TriFrost refactors its atomic soul, lighter, faster, sharper.

Welcome to TriFrost v0.40.0 – Cobalt Pulse.

As always, stay frosty ❄️.

## [0.39.0] - 2025-06-27
This release brings long-awaited built-in support for JWT authentication, a critical step in the journey to 1.0. We're introducing **runtime-agnostic** `jwtSign`, `jwtVerify` and `jwtDecode` utilities along with a suite of purpose-built JWT error classes.

Together, they offer a runtime-agnostic, batteries-included solution for stateless authentication, whether you're working with shared secrets (HS256) or asymmetric keys (RS256). Supported algorithms are: `HS256`, `HS384`, `HS512`, `RS256`, `RS384`, `RS512`, `ES256`, `ES384`, `ES512`,

Alongside this, we've improved how **environment-driven port configuration behaves**, made some minor performance optimizations to the style engine, and cleaned up internal dev tooling.

### Added
- **feat**: `jwtSign(secret, options)`, signs a payload into a JWT with optional claims. (**Take Note:** Defaults to 1h expiry)
- **feat**: `jwtVerify(token, secret, options)`, verifies a JWT’s signature and claims.
- **feat**: `jwtDecode(token)`, decodes a JWT without verifying.
- **feat**: Custom `JWTError` classes for precise failure handling (`JWTError`, `JWTMalformedError`, `JWTTypeError`, `JWTTimeError`, `JWTClaimError`, `JWTAlgorithmError`, `JWTSignatureError`).

### Improved
- **qol**: `TRIFROST_PORT` can now be used as the canonical source of the runtime port (for runtimes that bind to a specific port such as bun and node), set via `.env`, `.dev.vars`, GitHub Actions, or Docker builds. If no `TRIFROST_PORT` is defined we will fallback to `SERVICE_PORT` and `PORT` env variables. **Take Note**: You can still manually do `.boot({port: /* Your port */})` but this is no longer a necessity if already defined on the environment. In case **no port** can be found on either the environment or manually passed we will default to `3000`.
- **perf**: Minor performance bump in the style engine thanks to an alternative djb2 hash implementation using a decrementing while loop over an incrementing for loop
- **perf**: Minor reduction in style engine byte output due to removing unnecessary `-` parts of computed class names
- **misc**: Internal centralization of crypto utilities
- **misc**: Adjust codebase to work with prettier and simplify eslint config to be more aligned with recommended behaviors

### JWT Usage Examples
##### Basic JWT sign/verify with a shared secret (HS256)
```typescript
import {jwtSign, jwtVerify} from '@trifrost/core';
import {type Context} from './types';

export async function handler(ctx:Context) {
  /* Create token */
  const token = await jwtSign(ctx.env.SECRET, {
    issuer: 'api-service',
    expiresIn: 600,
    subject: 'user-123',
    payload: {role: 'user'} /* Additional data */
  });

  /* Verify token */
  const payload = await jwtVerify(token, ctx.env.SECRET, {
    algorithm: 'HS256',
    issuer: 'api-service',
  });

  return ctx.json({token, payload});
}
```

##### BearerAuth middleware using a shared secret
```typescript
import {jwtVerify, BearerAuth} from '@trifrost/core';

app.use(
  BearerAuth({
    validate: async (ctx, token) => {
      try {
        const payload = await jwtVerify(token, ctx.env.SECRET, {
          algorithm: 'HS256',
          issuer: 'api-service',
        });

        // ... (Potentially even load up the user here?)

        /* Returns custom auth object to store on ctx.state.$auth */
        return {id: payload.sub, role: payload.role};
      } catch {
        return false;
      }
    },
  })
).get('/me', ctx => {
  return ctx.json({
    id: ctx.state.$auth.id,
    role: ctx.state.$auth.role,
  });
});
```

##### BearerAuth middleware using RS256 (public/private key pair) to guard a group of routes
```typescript
import {jwtSign, jwtVerify, BearerAuth} from '@trifrost/core';

app
  /* Login route issuing a JWT signed through RS256 */
  .post('/login', async (ctx) => {
    const body = await ctx.body<{id: string; role: string}>();
    if (!body?.id || !body?.role) return ctx.status(400);

    // ... (Potentially do other stuff here)

    const token = await jwtSign(ctx.env.PRIVATE_KEY, {
      algorithm: 'RS256',
      issuer: 'auth-service',
      audience: 'trifrost-client',
      expiresIn: 3600,
      subject: body.id,
      payload: {role: body.role}, /* Additional data */
    });

    return ctx.json({token});
  })
  /* Protected router group */
  .group('/api', r => {
    r
      .use(BearerAuth({
        validate: async (ctx, token) => {
          try {
            const payload = await jwtVerify(token, ctx.env.PUBLIC_KEY, {
              algorithm: 'RS256',
              issuer: 'auth-service',
              audience: 'trifrost-client',
            });

            // ... (Potentially do other stuff here like load up user, etc)

            return {id: payload.sub, role: payload.role};
          } catch {
            return false;
          }
        },
      }))
      .get('/me', ctx => ctx.json({user: ctx.state.$auth}))
      .get('/admin', ctx => {
          if (ctx.state.$auth.role !== 'admin') return ctx.status(403);
          return ctx.json({ok: true});
      });
  });
```

---

We're continuing to harden the core as we approach a rock-solid 1.0. This release furthers the earlier groundwork for authentication without tying you to Node-specific crypto or third-party dependencies.

Where you're building APIs at the edge or backend monoliths, the new JWT primitives in combination with the already existing auth middlewares give you even more control ... without the ceremony.

As always, stay frosty ❄️.

## [0.38.1] - 2025-06-25
### Fixed
- Fix an issue due to IOS Safari working differently regarding CustomEvent instantiation

## [0.38.0] - 2025-06-25
This release introduces powerful improvements to `ctx.file()`, allowing direct, streaming responses from native, Node, and cloud storage sources — alongside foundational work to unify stream behavior and remove legacy friction.

### Improved
- **feat**: **[EXPERIMENTAL]** `ctx.file()` on top of passing a path now also supports direct streaming from a variety of sources. Native `ReadableStream` (Workerd, Bun, and browser-compatible sources), Node.js `Readable` streams (e.g. from `fs.createReadStream`, S3 SDKs), Buffers, strings, `Uint8Array`, `ArrayBuffer` and `Blob` inputs. This makes TriFrost file responses work seamlessly with S3, R2, and dynamic stream-based backends. One API, many sources. 🌀
- **qol**: `ctx.file()` with `download: true` now uses the original file name in the `Content-Disposition` header, giving users a proper fallback for filenames in their downloads when not passing a custom one.
- **qol**: Internals for `ctx.stream()` (a protected internal method) and runtime stream handling (Bun/Workerd/Node) have been unified and hardened.
- **qol**: Added runtime-safe validation for supported stream types.
- **qol**: Void tags in the JSX renderer now includes  svg-spec tags `path`, `circle`, `ellipse`, `line`, `polygon`, `polyline`, `rect`, `stop`, `use`.
- **qol**: Inline atomic hydrator will no longer be given a `defer` marker as there's no longer a need for this
- **deps**: Upgrade @types/node to 22.15.33
- **deps**: Upgrade typescript-eslint to 8.35.0

Example using s3 sdk:
```typescript
import {GetObjectCommand, S3Client} from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });
const Bucket = 'my-bucket';

export default async function handler (ctx) {
    const Key = ctx.query.get('key');
    if (!Key) return ctx.status(400);

    try {
        const {Body, ContentLength} = await s3.send(new GetObjectCommand({Bucket, Key}));

        await ctx.file({
            stream: Body,
            size: ContentLength,
            name: Key,
        }, {download: true});

    } catch (err) {
        ctx.logger.error('S3 fetch failed', { err });
        ctx.status(404);
    }
}
```

Example using Cloudflare R2 (workerd runtime):
```typescript
export default async function handler (ctx) {
    const key = ctx.query.get('key');
    if (!key) return ctx.status(400);

    try {
        const res = await ctx.env.MY_BUCKET.get(key); /* R2 binding via `wrangler.toml` */
        if (!res?.body) return ctx.status(404);

        await ctx.file({
            stream: res.body,
            size: res.size ?? null,
            name: key,
        }, {download: true});

    } catch (err) {
        ctx.logger.error('R2 fetch failed', {err});
        ctx.status(500);
    }
}
```

### Fixed
- Fixed an edge case where long-running streams in `ctx.file()` could incorrectly inherit stale timeouts.

### Deprecated
- 🧹 **Removed: `UWSContext` (uWebSockets.js runtime)**. Back in 2024, `uWS` felt like a great addition to TriFrost — an "automatic upgrade" path for Node users who wanted raw speed with minimal changes. But the landscape has shifted: Node has steadily improved its performance, while `uWS` continues to demand non-standard stream handling, complicates internal abstractions and also has some quirks (such as the fact that they add a uWS header to every response and that uWS will not work on a large amount of systems when containerizing). As a result after long pondering and thinking, we've removed support for `uWS`. This eliminates boilerplate, makes TriFrost just that bit leaner while simplifying internal stream behavior and clearing the path for better DX and broader runtime support (👀 looking at you, Netlify and Vercel). **Don’t worry though**, if you're currently running TriFrost with uWS, the system will gracefully fall back to the Node runtime, no changes required from your end.

---

With the removal of the uWS runtime, TriFrost enters a new phase: simpler, cleaner, and more aligned with modern cross-runtime needs. Whether you're streaming files from S3, R2, or piping blobs from memory, the file API stays minimal and consistent.

And maybe, somewhere in the near future we'll add another runtime or two, can't wait!

As always, stay frosty ❄️

## [0.37.3] - 2025-06-23
### Improved
- **feat**: Atomic Data Reactor will now run deep equality checks and clone into `_last` during tick to ensure unreferenced watching. (Take Note: the equality check is done using an adjusted version of [Valkyrie Utils: Equal](https://github.com/ValkyrieStudios/utils/blob/main/lib/equal.ts))

## [0.37.2] - 2025-06-23
### Improved
- **perf**: Atomic Data Reactor watchers now track and compare the last known value to prevent redundant executions
- **perf**: Atomic Data Reactor change notifications are now deduplicated per-path and scheduled per-frame using a global clock (`$tfc`)
- **perf**: Atomic Data Reactor `$set()` skips writes if values are unchanged, minimizing dirty work
- **feat**: Each Atomic Data Reactor registers a `tick()` function with the global clock on creation, which is cleaned up on vm unmount

## [0.37.1] - 2025-06-23
### Improved
- **dx**: Ensure `mode` and `data` in $dispatch 2nd argument are optional
- **sys**: Add [FOSSA](https://fossa.com/) license badge to readme
- **sys**: Add [FOSSA](https://fossa.com/) security badge to readme

## [0.37.0] - 2025-06-23
This release unveils **TriFrost Atomic Data Reactor**, a minimal yet powerful reactive data layer built for inline `<Script>` blocks. Designed to bring form state, interactivity, and SSR reactivity together, **without sacrificing type safety or control**.

Gone are the days of setting up boilerplate state handlers, this new system lets you declaratively wire up your DOM to your logic, right at the point of use.

Yes, it's reactive. Yes, it's typed. Yes, it just works.

### Added
- **feature**: Introducing $tfdr (TriFrost Atomic Data Reactor), a lightweight reactive data proxy that enables local data binding and change tracking in `<Script>` blocks. Exposed as the data argument in `<Script data={...}>`.
- **feature**: Native `$dispatch(type, detail?)` available on the script parent VM element. Enables bubbling `CustomEvent` dispatching from child elements to outer logic or listeners.

### Improved
- **deps**: Upgrade @cloudflare/workers-types to 4.20250620.0
- **deps**: Upgrade bun-types to 1.2.17

---

### What is it?
Enables **declarative form binding** and **local state reactivity** with full **SSR compatibility**.

### Features
- **Typed API based on your data shape**, eg: `data.user.name` is type-safe, and so are `data.$bind('user.name', ...)`, `data.$set(...)`, etc.
- `$bind(path, selector)`: Binds one or multiple form inputs to a data path. **Take Note:** the selector here is **run against the script parent, not the document**.
- `$watch(path, fn, immediate?)`: Watches a specific path for changes, optionally firing immediately.
- `$set(path | object)`: Updates part or whole of the reactive state tree and notifies bound elements.
- `$dispatch(type, detail?)`: Dispatches a native bubbling `CustomEvent` from the root script element — useful for parent VMs or outside components to listen and respond.

### Behavior
- Initial state in `data={...}` is automatically cloned and reactive.
- If form inputs already exist in the DOM, `$bind()` uses data values as source of truth.
- Supports checkboxes (single/group), radios, `<select multiple>`, and plain inputs out of the box.
- Emits updates on input and change events as appropriate.

### Examples
##### Basic Form Binding
```tsx
<form>
  <label>Name: <input name="username" type="text" /></label>
  <label>Age: <input name="age" type="number" /></label>
  <Script data={{user:{name: 'Peter', age: 35}}}>
    {(el, data) => {
      /* The binding will set the value of the form fields */
      data.$bind('user.name', 'input[name="username"]');
      data.$bind('user.age', 'input[name="age"]');
    }}
  </Script>
</form>
```
##### Watch + Patch
```tsx
<form>
  <label>Count: <input name="counter" type="number" /></label>
  <Script data={{ count: 0 }}>
    {(el, data) => {
      data.$bind('count', 'input[name="counter"]');

      /* Do stuff when count is updated */
      data.$watch('count', val => console.log('Updated count:', val));

      /* Manually set count */
      data.$set('count', 10);
    }}
  </Script>
</form>
```
##### Checkboxes (Group Binding)
```tsx
<form>
  <fieldset>
    <legend>Tags:</legend>
    <label><input type="checkbox" name="tags" value="js" /> JavaScript</label>
    <label><input type="checkbox" name="tags" value="ts" /> TypeScript</label>
    <label><input type="checkbox" name="tags" value="css" /> CSS</label>
  </fieldset>
  <Script data={{filters: {tags: [] as string[]}}}>
    {(el, data) => {
      data.$bind('filters.tags', 'input[name="tags"]');
      data.$watch('filters.tags', tags => console.log('Selected:', tags));
    }}
  </Script>
</form>
```
##### Radios and Select
```tsx
<form>
  <fieldset>
    <legend>Preferred Language</legend>
    <label><input type="radio" name="lang" value="js" /> JavaScript</label>
    <label><input type="radio" name="lang" value="ts" /> TypeScript</label>
  </fieldset>
  <label>
    Framework:
    <select name="framework">
      <option value="vue">Vue</option>
      <option value="react">React</option>
      <option value="svelte">Svelte</option>
    </select>
  </label>
  <Script data={{prefs: {lang: '', framework: ''}}}>
    {(el, data) => {
      data.$bind('prefs.lang', 'input[name="lang"]');
      data.$bind('prefs.framework', 'select[name="framework"]');
    }}
  </Script>
</form>
```
##### Async Submit on Change
```tsx
<form>
  <label>Email: <input type="email" name="email" required /></label>
  <label>Subscribe: <input type="checkbox" name="subscribe" /></label>
  <p>Idle</p>
  <Script data={{ form: { email: '', subscribe: false } }}>
    {(el, data) => {
      data.$bind('form.email', 'input[name="email"]');
      data.$bind('form.subscribe', 'input[name="subscribe"]');

      const status = el.querySelector('p')!;

      async function submit () {
        status.textContent = 'Submitting...';
        try {
          ...
          console.log('Submitted:', { ...data.form });
          status.textContent = 'Submitted ✅';
        } catch {
          status.textContent = 'Failed ❌';
        }
      }

      /* We debounce listen for email */
      data.$watch('form.email', submit, {debounce: 300});
      data.$watch('form.subscribe', submit);
    }}
  </Script>
</form>
```
##### Enable Submit Button Conditionally
```tsx
<form>
  <label>Name: <input type="text" name="name" required /></label>
  <label>Age: <input type="number" name="age" min="0" /></label>
  <button type="submit" disabled>Submit</button>
  <Script data={{user: {name: '', age: 0}}}>
    {(el, data) => {
      data.$bind('user.name', 'input[name="name"]');
      data.$bind('user.age', 'input[name="age"]');

      const submitBtn = el.querySelector('button[type="submit"]')!;

      data.$watch('user', () => {
        const {name, age} = data.user;
        const valid = name.trim().length > 0 && Number(age) >= 18;
        submitBtn.disabled = !valid;
      }, {immediate: true}); /* We pass true to immediately trigger our watch function as its a validation method */
    }}
  </Script>
</form>
```
##### $dispatch and forms
```tsx
<form>
  <label>Search: <input type="text" name="q" /></label>
  <button type="button">
    Refresh
    <Script>{el => el.onclick = () => el.$dispatch('refresh')}</Script>
  </button>
  <Script data={{q: ''}}>
    {(el, data) => {
      data.$bind('form.q', 'input[name="q"]');

      async function submit () {
        // Perform some async operation
      }

      el.addEventListener('refresh', submit);
      data.$watch('form', submit);
    }}
  </Script>
</form>
```
> 💡 **Tip**: Where `$subscribe` and `$publish` are great for global page-wide communication, `$dispatch` is ideal for communicating from inner VMs to parents using custom event bubbles.

---

**TriFrost Atomic** continues our pursuit of **zero-runtime-cost ergonomics**, enabling developers to write declarative, reactive, and portable UI logic with unmatched SSR alignment.

This foundation further opens the door to scoped VMs, nested data islands, progressive enhancement, and composable UI logic that doesn’t compromise.

Let us know what you build.

And as always, stay frosty ❄️.

## [0.36.5] - 2025-06-23
### Improved
- **qol**: `ctx.redirect()` now defaults to `303 See Other` instead of `307`. This aligns with [RFC 7231](https://www.rfc-editor.org/rfc/rfc7231) and ensures correct behavior for POST-to-GET transitions in redirect flows.
- **qol**: `ctx.redirect()` now only prepends the host if the to value is **not absolute**, **not root-relative** (`/`), and **not protocol-relative** (`//`). This avoids accidental double-prefixing and supports relative path routing more intuitively.
- **qol**: Query strings are now appended safely when `keep_query` is enabled in `ctx.redirect()`, if the destination already contains a query (`?`), parameters are appended with `&`, otherwise `?` is used. This ensures consistent behavior for URL merging.
- **qol**: Calling `ctx.status()` will now explicitly clear any existing response body to prevent accidental payload leakage in status-only responses.
- **qol**: `ctx.file()` will now always include both `filename` and `filename*` in Content-Disposition for maximum client compatibility (per RFC 6266). In case ASCII-safe name is empty we fallback to `download`. See below (extreme) Example:
```typescript
await ctx.file('/utf', {download: '📄'});

/* Expected Content-Disposition header */
'Content-Disposition': 'attachment; filename="download"; filename*=UTF-8\'\'%EF%BF%BD%EF%BF%BD'
```
- **qol**: Improved encodeFileName behavior (used in `ctx.file()` when working with download option) preventing URIError from malformed `encodeURIComponent()` usage on high Unicode input by using safe byte-level encoding via `TextEncoder`.

## [0.36.4] - 2025-06-22
### Added
- **feat**: Support for `jsxDEV()` in the JSX runtime, enabling compatibility with dev-mode JSX emit in **Bun** and **modern bundlers**. This ensures TriFrost works seamlessly when `jsx: react-jsx` is enabled, and eliminates the need for manual path shimming or env overrides. The `jsxDEV()` function internally aliases `jsx()`, discarding extra dev-only parameters (`_source`, `_self`, etc) for now.

## [0.36.3] - 2025-06-22
### Improved
- **dx**: Adjust typing of App client.css option to link to a CssGeneric rather than direct CssInstance

## [0.36.2] - 2025-06-21
### Improved
- **perf**: Prevent need for async regex behaviors in Script by adding a __name shim (needed because bundlers like esbuild/vite/... work like this) in atomic runtime.

## [0.36.1] - 2025-06-21
### Improved
- **dx**: Adjust typing for AppOptions `client.css` to be of `CssInstance`
- **feat**: Adjust atomic runtime to prevent race issues with defer loading

## [0.36.0] - 2025-06-21
This release builds directly on TriFrost’s **Atomic** foundation, delivering leaner pages, smarter SSR defaults, and internal render polish — all without breaking a sweat.

### Added
- **feat**: App now accepts `createCss()` and `createScript()` instances as part of a new `client` option.
```typescript
import {css} from './css';
import {script} from './script';

new App({client: {css, script}})
```
Doing so tells TriFrost to mount global assets to static atomic routes:
- `__atomics__/client.css` for styles
- `__atomics__/client.js` for atomic runtime

This prevents every page from duplicating shared `<style>` or `<Script>` content — resulting in **smaller, faster, cacheable pages**. Atomic just got even leaner.
- **feat**: New internal `mount()` utility for atomic scripts/styles. **Internal** engine now mounts atomic runtime (and CSS reset/theme) automatically if `script` or `css` is passed to App.
- **feat**: `ctx.render()` is now available to manually render a JSX tree to HTML, with optional `css` and `script` instance injection. This method powers `ctx.html()` under the hood, but gives you full control over **alternate styles/scripts**, useful for generating things like, email templates, fragments rendered without app-wide `<Style>` or `<Script>`, SSR modules that inject isolated themes/scripts, .... For example:
```tsx
// mailRenderer.ts
import {createCss} from './lib/modules/JSX/style/use';

export function renderWelcomeEmail (ctx: TriFrostContext) {
	const css = createCss(); // fresh, isolated CSS engine
	const cls = css({
		fontFamily: 'sans-serif',
		color: '#222',
	});

	const Email = () => (
		<html>
			<body>
				<h1 className={cls}>Welcome to TriFrost</h1>
				<p>We’re glad you’re here ❄️</p>
			</body>
		</html>
	);

	// Renders HTML with injected <style> using this custom CSS engine
	return ctx.render(<Email />, {css});
}
```

### Improved
- **feat**: Automatic `.root()` invocation when passing `css` or `script` to `App`. You no longer need to manually call:
```typescript
css.root();
script.root();
```
- **feat**: `<Script>` internal output is now closer to the original function source — preserving reference names and layout. This prevents issues with some bundlers (like esbuild) renaming variables (`data → data2`), improving inline integrity and debuggability.
- **feat**: Atomic and inline `<Script>` tags now automatically inject defer by default. This ensures scripts execute after document parse, avoiding layout shift or blocking behavior without needing to explicitly specify defer.

---

This update tightens the atomic pipeline, reducing duplicated payloads, improving page weight, and making root logic feel invisible (yet predictable).

Let the runtime do the heavy lifting.

And as always, stay frosty ❄️

## [0.35.5] - 2025-06-20
### Fixed
- Fix atomic behavior causing script injection malfunction

## [0.35.4] - 2025-06-20
### Improved
- Ensure data in `$publish` is optional

## [0.35.3] - 2025-06-20
### Improved
- **feat**: Atomic `$storeSet` will now also **publish a** `$relay` **event** for the changed key. This allows components to reactively subscribe to store changes using the topic pattern `$store:<key>`.
```tsx
// Store update in some component
el.$storeSet('count', 5);

...

// Reactive listener elsewhere
el.$subscribe('$store:count', newCount => {
  console.log('Count changed:', newCount);
});
```
> ✅ Bonus: `$store:<key>` subscriptions are also **fully type-safe** as they are inferred from the declared `Store` type of the VM
- **dx**: Renamed atomic accessor `tfRelay.publish` to `$publish`
- **dx**: Renamed atomic accessor `tfRelay.subscribe` to `$subscribe`
- **dx**: Renamed atomic accessor `tfRelay.unsubscribe` to `$unsubscribe`
- **dx**: Renamed atomic accessor `tfStore.get` to `$storeGet`
- **dx**: Renamed atomic accessor `tfStore.set` to `$storeSet`
- **dx**: Renamed atomic accessor `tfId` to `$uid`
- **dx**: Renamed atomic accessor `tfUnmount` to `$unmount`
- **dx**: Renamed atomic accessor `tfMount` to `$mount`

**Before:**
```tsx
el.tfRelay.subscribe('toggle', state => { ... });
el.tfRelay.publish('toggle', true);
el.tfStore.set('open', true);
el.tfStore.get('open');
el.tfMount = () => console.log('mounted');
el.tfUnmount = () => console.log('unmounted');
const id = el.tfId;
```

**After:**
```tsx
el.$subscribe('toggle', state => { ... });
el.$publish('toggle', true);
el.$storeSet('open', true);
el.$storeGet('open');
el.$mount = () => console.log('mounted');
el.$unmount = () => console.log('unmounted');
const id = el.$uid;
```

### Fixed
- Fixed an issue where global `unsubscribe()` in the atomic relay could incorrectly dereference the wrong topic list when no topic was passed

## [0.35.2] - 2025-06-19
### Improved
- **dx**: Allow for usage of void inside of `tfRelay.publish` to allow for eg: `el.tfRelay.publish('myevent')`

## [0.35.1] - 2025-06-19
### Fixed
- Issue with writable remnant on accessor prop

## [0.35.0] - 2025-06-19
> Introducing **TriFrost Atomic ⚛️**, where others ship megabyte bundles ... we go Atomic.

Building on top of the `<Script>` foundation laid in `0.33.0` and subsequently `0.34.0`. This release marks the debut of **TriFrost Atomic**, a reactive, declarative, and zero-bundle interactivity model embedded directly within your HTML. No hydration APIs. No diffing. No VDOM. Just finely-scoped, component-local behavior with **runtime deduplication, CSP-safe execution, and lifecycle primitives**.

### Added - Welcome to Atomic
- **feat**: `createScript()` factory. A typed, per-tree interactivity engine that mirrors the ergonomics of `createCss()`. It returns `<Script>` and a `script` object with `env()`, `state()`, `nonce()`, and `root()` methods. Just like `css.root()` declares style root injection, `script.root()` marks the entry point for atomic injection.
```typescript
// script.ts
import {createScript} from '@trifrost/core/modules/JSX/script';
import {type Env} from './types';

const {Script, script} = createScript<Env>({atomic: true});
export {Script, script}; /* script.env will be typed according to the shape of Env */
```
```tsx
// consumer.tsx
import {Script, script} from '~/script';

function ToggleButton () {
  return (<button>
    Toggle
    <Script data={{className: 'active'}}>{(el, data) => {
      el.addEventListener('click', () => {
        el.classList.toggle(data.className);
      });
    }}</Script>
  </button>);
}

function Layout () {
  script.root(); /* This tells TriFrost to inject the atomic globals such as tfRelay, tfStore, ... */
  return (<html>
    <body>
      <ToggleButton />
    </body>
  </html>)
}
```
- **feat**: `tfRelay`, built-in reactive message bus for `<Script>`. Every `<Script>` in atomic mode gains access to a scoped relay (`el.tfRelay`) with `publish`, `subscribe`, and `unsubscribe`. Perfect for loose coupling and interactivity without a framework. **Subscriptions are automatically cleaned up when the element is removed**.

Relay events are automatically typed via the second generic param in `createScript<Env, Relay>()`.

You can define a central shape for all message types relevant to the script tree.

Doing so, **types are inferred**, so `publish`/`subscribe` calls will give you type hints if misused.

Example:
```ts
// script.ts
import {createScript} from '@trifrost/core';
import {type Env} from './types';

type Relay = {
  sidebar_visibility: boolean;
  count_updated: number;
};

const {Script, script} = createScript<{}, Relay>({atomic: true});
export {Script, script};
```
```tsx
// Consumer.tsx
<Script>{el => {
  el.tfRelay.subscribe('sidebar_visibility', (open) => {
    el.classList.toggle('open', open);
  });

  el.tfRelay.subscribe('count_updated', count => {
    el.textContent = `Count: ${count}`;
  });
}}</Script>
```
```tsx
// Publisher.tsx
<Script>{el => {
  el.addEventListener('click', () => {
    el.tfRelay.publish('sidebar_visibility', true);
    el.tfRelay.publish('count_updated', Math.floor(Math.random() * 100));
  });
}}</Script>
```
- **feat**: `tfStore`, shared memory across Atomic VMs, think global state, without global baggage. Atomic VMs share access to `el.tfStore.get()` and `el.tfStore.set()`, enabling decoupled cross-component coordination.

You can define a central shape for storage keys and their types.

Doing so, **types are inferred**, so `get`/`set` calls will give you type hints if misused.

Example:
```typescript
// script.ts
import {createScript} from '@trifrost/core';
import {type Env} from './types';

type MyEvents = {
  openSidebar: boolean;
  updateCount: number;
};

type MyStore = {
  userId: string;
};

const {Script, script} = createScript<Env, MyEvents, MyStore>({atomic: true});
export {Script, script};
```

Inside a script:
```tsx
<Script>{el => {
el.tfRelay.publish('openSidebar', true);        // ✅
el.tfRelay.subscribe('updateCount', n => {});   // ✅ Type is known as number
el.tfRelay.unsubscribe('openSidebar');          // ✅

el.tfRelay.publish('closeSidebar', true);       // ❌ TS error
el.tfStore.get('userId');                       // ✅
el.tfStore.set('userId', 'abc');                // ✅
el.tfStore.set('foo', 'bar');                   // ✅ Accepted but type is unknown
}}</Script>
```
- **feat**: `tfMount`/`tfUnmount`, your script function can register lifecycle callbacks on the element. TriFrost automatically invokes them on attach and detach:.
```tsx
<Script>{el => {
  el.tfMount = () => console.log('mounted');
  el.tfUnmount = () => console.log('unmounted');
}}</Script>
```
- **feat**: Atomic runtime with mutation observer, automatically tracks DOM removal and cleans up subscriptions and lifecycle hooks. **Injected once per page**, and **only if Atomic mode is active**, and **only if script.root() is called**. No globals. No leaks. **This runtime is OPT-IN, meaning you need to pass** `{atomic:true}` to `createScript` to activate it.

### Improved
- **feat**: Add `*` to auto-spaced selectors in css engine
- **deps**: Upgrade @cloudflare/workers-types to 4.20250619.0
- **deps**: Upgrade @types/node to 22.15.32
- **deps**: Upgrade @vitest/coverage-v8 to 3.2.4
- **deps**: Upgrade typescript-eslint to 8.34.1
- **deps**: Upgrade vitest to 3.2.4

### Breaking - One interface to rule the tree
- **refactor**: Removed global `env()`, `state()`, and `<Script>` JSX exports. These are now accessed exclusively via `createScript()` to ensure proper typing, encapsulation, and per-request safety.

---

**TriFrost Atomic** reimagines client interactivity as something lightweight, composable, and state-aware, without the runtime overhead of hydration forests or megabyte payloads.

Whether you’re toggling classes, syncing local state, or coordinating cross-component actions, you now have a full-fledged, runtime-deduplicated VM under every node.

We're just getting started on this path, more to come, but for now, let's go atomic.

And as always, stay frosty ❄️.

## [0.34.2] - 2025-06-16
### Fixed
- Fix potential issue with typing for Script tag due to not extending from JSXProps

## [0.34.1] - 2025-06-16
### Fixed
- Fix potential issue with typing for Script tag due to not extending from JSXProps

## [0.34.0] - 2025-06-16
This release continues on the `<Script>` foundation introduced in TriFrost `0.33.0` and brings a powerful under-the-hood upgrade. A **Script Engine**, focused on ergonomic interactivity, seamless deduplication, and zero-config data inlining as well as some new utils for easier dx.

### Added
- **feat**: `<Script>` now supports a `data` prop to pass structured data alongside code. The function receives `(el, data)` making dynamic behavior cleaner and more declarative.
```tsx
<button type="button">
  Toggle
  <Script data={{toggleClass: 'active'}}>{(el, data) => {
    el.addEventListener('click', () => el.classList.toggle(data.toggleClass));
  }}</Script>
</button>
```
- **feat**: New `env()` and `state()` utils are now available within JSX, enabling per request logic without having to pass ctx around.

Example:
```tsx
import {env, state} from '@trifrost/core/modules/JSX';

export function DebugBar () {
  if (env('TRIFROST_DEBUG') !== 'true') return null;

  return (
    <div className="debug">
      Request ID: {state('request_id')}
    </div>
  );
}
```

Example combining `data/env()/state()`:
```tsx
import {env, state} from '@trifrost/core/modules/JSX';

export function AnalyticsBeacon () {
  const beaconUrl = env('ANALYTICS_URL');
  const userId = state('user_id');
  const pageId = state('page_id');

  return (
    <Script data={{beaconUrl, userId, pageId}}>{(el, data) => {
      navigator.sendBeacon(data.beaconUrl, JSON.stringify({
        user: data.userId,
        page: data.pageId,
        ts: Date.now(),
      }));
    }}</Script>
  );
}
```

### Improved
- **feat**: Introduced an internal **Script Engine** that **deduplicates repeated scripts and shared data nodes across the tree**. This engine hooks directly into the TriFrost JSX renderer, ensuring only unique scripts are emitted regardless of how many times a component renders.

### Removed
- Removed usage of `__TRIFROST_ENV__` and `__TRIFROST_STATE__` markers (introduced in `0.33.0`). These have been fully replaced with runtime-bound utilities (`env()` and `state()`), honoring the zero-cost abstraction principle of TriFrost.

---

TriFrost's scripting system now achieves a rare balance: expressive, secure, and zero-maintenance.

It's important to remember that `<Script>` is **client-side** logic, not **server-side**, as such these utils as well as the new Scripting engine are there to make it more seamless and fun.

As always, stay frosty ❄️

## [0.33.3] - 2025-06-15
This release brings additional polish to the new `<Script>` component introduced in `0.33.0`, focused on ergonomic inlining and dynamic parent binding.

### Improved
- **feat**: `<Script>` now strips out `__name(...)` tooling artifact wrapper.

Build tools like `SWC`, `Terser`, or `esbuild` (especially with React Fast Refresh or dev mode optimizations) may inject metadata helpers like:
```typescript
const load = /* @__PURE__ */ __name(async () => {
  // your logic
}, "load");
```

These wrappers are **not defined in the browser** and will throw `ReferenceError: __name is not defined` if not removed.

The `<Script>` component now automatically sanitizes them from inline function bodies to ensure clean, executable output:
```tsx
<Script>{(el: HTMLElement) => {
  const load = async () => {
    // safe even if tooling added __name()
    console.log('loading...');
  };
  el.addEventListener('click', load);
}}</Script>
```

## [0.33.2] - 2025-06-15
This release brings additional polish to the new `<Script>` component introduced in `0.33.0`, focused on ergonomic inlining and dynamic parent binding.

### Improved
- **feat**: Inline `<Script>` content is now scoped via a **bound IIFE** — [learn what an IIFE is](https://developer.mozilla.org/en-US/docs/Glossary/IIFE). This ensures safe execution and prevents global leaks.
- **feat**: `document.currentScript.parentElement` is passed as the first argument, allowing your inline scripts to access their container element naturally.
- **dx**: The function parameter name (e.g., `el` or `node`) is **automatically extracted** and reused inside the wrapper, no awkward destructuring or magic strings required.
- **deps**: Upgrade @cloudflare/workers-types to 4.20250614.0
- **deps**: Upgrade @valkyriestudios/utils to 12.42.0
- **deps**: Upgrade eslint to 9.29.0

This means your inline scripts can reference their surrounding DOM element with zero boilerplate:
```tsx
<button type="button">
  Toggle Theme
  <Script>{(el:HTMLElement) => {
    /* el here is the button */
    el.addEventListener('click', () => {
      ...
    });
  }}</Script>
</button>
```

---

**Some Notes**:
- Scripts are wrapped in an **IIFE (Immediately Invoked Function Expression)** to isolate scope and prevent global leaks.
- `nonce` is still **automatically injected** via the `nonce()` utility when omitted, ensuring full compatibility with **CSP** (`script-src 'nonce-...'`) policies. **No manual steps required.**

Ergonomic, scoped, and secure, TriFrost’s `<Script>` now lets you express dynamic behavior without context juggling or CSP headaches.

As always, stay frosty ❄️

## [0.33.1] - 2025-06-14
### Improved
- **feat**: Removed the minification behavior in the new `<Script>` component, flagged by CodeQL as a potential performance hog and in hindsight could have side effects as well.

## [0.33.0] - 2025-06-14
This release brings an upgrade to TriFrost’s SSR and client-side scripting experience with a powerful new `<Script>` component.

Designed for security, ergonomics, and dynamic control, combined with new support for `__TRIFROST_ENV__` and `__TRIFROST_STATE__` interpolation, this opens the door to cleaner SSR logic, secure script injection, and fully dynamic per-request behavior.

### Added
- **feat**: `<Script>` JSX component for safe and ergonomic inline or external script injection. **Automatically injects a nonce for CSP compatibility, no manual handling required**. Supports inline function-style scripts via `() => { ... }` (or `{...}`), external scripts via `src`, `async`, `defer`, and `type` attributes, as well as built-in minification of inline content.
```tsx
import {Script} from '@trifrost/core';
...

<Script async src="https://example.com/analytics.js" />
<Script>{() => {
  console.log("Hello from TriFrost");
}}</Script>
```
- **feat**: Support for `__TRIFROST_ENV__.<key>` and `__TRIFROST_STATE__.<key>` replacements in both inline scripts and styles. These are automatically substituted **server-side at render-time**, allowing environment config and request-specific state to influence SSR-rendered behavior, theming, or hydration logic.
```tsx
<Script>{() => {
  const settings = "__TRIFROST_STATE__.settings";
  console.log("env:", "__TRIFROST_ENV__.APP_ENV");
}}</Script>

/* Renders as */
<script>
  const settings = {locale: "en", active: true, count: 42};
  console.log("env:", "production");
</script>
```

Example from the TriFrost website:
```tsx
/* Before */
<script nonce={nonce()} dangerouslySetInnerHTML={{__html: `(function () {
  const saved = localStorage.getItem('trifrost-theme');
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', saved || preferred);
})()`}} />

/* Now */
<Script>{() => {
  const saved = localStorage.getItem('trifrost-theme');
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', saved || preferred);
}}</Script>
```

### Improved
- **dx**: `css.use` and `css.mix` now gracefully ignore `null`, `undefined`, and `false` values for cleaner conditional composition.
```typescript
const cls = css.use('button', isActive && 'active', isDisabled ? {opacity: 0.5} : null);
```
- **dx**: Context status is now aligned around numerical codes rather than both numerical and full string codes, previously both were accepted but only the uWS runtime uses the full string code variant.

### Fixed
- Fixed an issue where `ctx.redirect` with `http://` to `https://` protocol upgrade was broken, producing invalid `https://http://...` URLs
- Fixed an issue where `ctx.json` responses had a broken conditional internally

---

TriFrost’s new `<Script>` component and environment-aware replacements provide a clean, safe way to handle scripts in SSR with minimal boilerplate and maximum clarity. A small addition, but one that smooths out a very real part of building dynamic apps.

Stay frosty ❄️

## [0.32.0] - 2025-06-13
This release further streamlines how app identity and debug state are defined across all runtimes, moving away from config-based declarations to **standardized environment-driven metadata**.

### Improved
- **dx**: `TRIFROST_NAME` and `TRIFROST_VERSION` are now the canonical source of app identity for telemetry — set them via `.env`, `.dev.vars`, GitHub Actions, or Docker builds for seamless introspection across all runtimes.
- **qol**: Debug mode (`debug`) is now automatically derived from `TRIFROST_DEBUG` (truthy values like `"1"`, `"true"`, or `true`), no manual flag needed.
- **qol**: Added `App.bodyParser()` alias to improve fluent chaining and TypeScript inference.

### Breaking
- Removed `name`, `version`, and `debug` from `AppOptions` — these are now sourced exclusively from environment variables: `TRIFROST_NAME`, `TRIFROST_VERSION`, and `TRIFROST_DEBUG`.

---

These changes make TriFrost's runtime behavior cleaner, more predictable, and easier to integrate with CI/CD pipelines and observability tools — with zero config bloat.

Stay frosty ❄️

## [0.31.0] - 2025-06-13
### Improved
- **perf**: Improved performance for exporter init behavior, ensuring global attribute init for exporters only happens once
- **perf**: Node/Bun/Workerd contexts will now reuse a TextEncoder instance rather than create a new one for head calls
- **qol**: Rather than warn RootLogger will now log an error if exporter initialization fails
- **deps**: Upgrade bun-types to 1.2.16
- **deps**: Upgrade @cloudflare/workers-types to 4.20250610.0

## [0.30.0] - 2025-06-12
This release brings new capabilities to TriFrost’s body parsing system, ensuring consistent, cross-runtime handling of JSON, text, form, and multipart payloads — **now with fine-grained control** and powerful normalization.

### Added
- **feat**: Internal bodyparser now supports custom options for `limit`, `json.limit`, `text.limit`, `form.limit` in **bytes** (default limit is `4 * 1024 * 1024`)
- **feat**: Internal bodyparser now supports `files.maxCount` option for form, allowing you to limit the number of files per request (no default)
- **feat**: Internal bodyparser now supports `files.maxSize` option for form, allowing you to limit the size of an individual file per request (no default)
- **feat**: Internal bodyparser now supports `files.types` option for form, allowing you to pass the **allowed** mime types (eg: `['image/png', 'image/jpg']`)
- **feat**: Internal bodyparser now supports `normalizeBool`, `normalizeNull`, `normalizeDate`, `normalizeNumber` and `normalizeRaw`. These options align with their respective counterparts for [toObject](https://github.com/valkyriestudios/utils/?tab=readme-ov-file#formdatatoobjectvalformdata-rawstringtruesinglestringnormalize_boolbooleannormalize_dateboolnormalize_numberbool--)
- **feat**: `.bodyParser()` is now available on both `Router` and `Route`, allowing scoped overrides of the default body parsing behavior
```typescript
/* Global limits */
app
  .bodyParser({
    limit: 4 * 1024 * 1024, /* 4 mb max body for text/form */
    json: {limit: 1024 * 1204}, /* 1mb max json body override */
  })
  ...

/* Restrict file uploads */
router
  .route('/profile', r => {
    r
      .bodyParser({
        form: {
          limit: 8 * 1024 * 1024, // 8MB total for form size
          files: {
            maxCount: 2,
            maxSize: 5 * 1024 * 1024, // 5MB max per file
            types: ['image/png', 'image/jpeg'],
          },
        },
      })
      .post(ctx => {
        const {avatar} = ctx.body;
        return ctx.text(`Got file: ${avatar?.name}`);
      });
  });
```

### Improved
- **feat**: Options routes will now be named according to `OPTIONS_{PATH}` rather than `OPTIONS_{NAME_OF_FIRST_ROUTE}` improving introspection and telemetry
- **feat**: All routes will now automatically return a `413 Payload Too Large` status if the incoming request body exceeds the configured `limit`, `json.limit`, `text.limit`, or `form.limit`. No need for manual checks, TriFrost catches it early and responds with a clear error.

### Breaking
- Default normalization of form data no longer includes `normalizeNumber: true`. This prevents accidental coercion of strings into numbers (`"123"` ➜ `123`), preserving form intent and avoiding subtle bugs. Set `normalizeNumber: true` manually if needed.

### Removed
- `Sym_TriFrostType` and `Sym_TriFrostMeta` have been removed — superseded by `kind` metadata and structural improvements to introspection. Existing routes will continue to function as expected.

---

As always, stay frosty ❄️

## [0.29.0] - 2025-06-10
I've known the founders of [Aikido](https://aikido.dev/) for a long time, so when I was exploring ways to expand TriFrost’s automated security testing (we already used [GitHub CodeQL](https://codeql.github.com/), but there’s always room for more), I reached out to them. They got us set up quickly, and within minutes, Aikido flagged a single medium-severity issue, not in our code, but in our CI/CD setup, related to unpinned third-party modules. Resolved. ✅ Thanks [Aikido](https://aikido.dev/)!

Then I thought: **Why not run a scan on our [website](https://www.trifrost.dev)**? Boom, “Content Security Policy not set.” Fair. So I dug in 💪, and that sparked a small but **meaningful improvement to our Security() middleware**.

This patch brings **enhanced Content Security Policy (CSP)** handling via automatic nonce injection in the `Security()` middleware, improving script safety, SSR support, and JSX ergonomics.

### Added
- **feat**: `Security()` middleware now supports dynamic CSP **nonce injection**. You can specify `"'nonce'"` as a placeholder value in `contentSecurityPolicy`, and TriFrost will generate a secure, request-scoped `ctx.nonce`, replacing it across all matching directives:
```typescript
.use(Security({
  contentSecurityPolicy: {
    [ContentSecurityPolicy.ScriptSrc]: ['"self"', "'nonce'"],
    [ContentSecurityPolicy.StyleSrc]: ['"self"', "'nonce'"],
  },
}));
```
This will automatically generate a secure base64 nonce and emit a valid CSP like:
```txt
Content-Security-Policy: script-src "self" 'nonce-AbC123...'; style-src "self" 'nonce-AbC123...'
```
- **feat**: A new `nonce` getter has been added to the TriFrost context, allowing easy access to the nonce (which is stored on ctx.state):
```tsx
ctx.html(<script nonce={ctx.nonce}>...</script>);
```
- **feat**: `ctx.nonce` is now automatically linked to the **JSX rendering engine** and exposes through a **nonce util**, accessible anywhere inside a ctx.html() JSX component render:
```tsx
import {nonce, Style} from '@trifrost/core';

export function Scripts () {
  return <>
    <script nonce={nonce()}>...</script>
    <script nonce={nonce()}>...</script>
  </>
}

export function Layout () {
  return <html>
    <head>
      <title>Hello world</title>
      <Scripts />
      <Style /> {/* This one automatically checks nonce */}
      <style type="text/css" nonce={nonce()}>...</style>
    </head>
    <body>
      ...
    </body>
  </html>;
}

export function myHandler (ctx) {
  return ctx.html(<Layout />);
}
```

### Improved
- **feat**: The `StyleEngine` now auto-injects a nonce attribute on its `<Style />` tag when `ctx.nonce` is active. This ensures all TriFrost CSS is CSP-compliant under `style-src 'nonce-...'` policies — improving compatibility and SSR safety. **Without having to lift a finger**.
- **cicd**: Pin 3rd github actions in workflow ci
- **deps**: Upgrade @cloudflare/workers-types to 4.20250610.0
- **deps**: Upgrade @types/node to 22.15.31
- **deps**: Upgrade @vitest/coverage-v8 to 3.2.3
- **deps**: Upgrade typescript-eslint to 8.34.0
- **deps**: Upgrade vitest to 3.2.3

---

This change makes nonce-based CSP safer and easier, no manual nonce generation, no middleware coordination. Just drop `'nonce'` where you need it, adjust your inline scripts to work with `nonce={nonce()}` and TriFrost takes care of the rest.

As always, stay frosty ❄️

## [0.28.0] - 2025-06-09
Building on the groundwork laid in [0.27.0](https://github.com/trifrost-js/core/releases/tag/0.27.0), this release supercharges TriFrost’s **redaction and log sanitization** pipeline with a powerful new **internal scrambler engine**, enabling fast, recursive, and pattern-aware field scrubbing across all exporters.

While the scrambler is not exposed directly, it powers the `omit` behavior in exporters like:
- `ConsoleExporter`
- `JsonExporter`
- `OtelHttpExporter`.

Just pass a mix of:
- 📌 **Path keys**: `'user.token'`
- 🌍 **Global keys**: `{global: 'token'}` (these target **any level**)
- 🎯 **Value patterns**: `{valuePattern: /\d{3}-\d{2}-\d{4}/}` (eg: SSNs)

... and TriFrost handler the rest.

### Added
- **feat**: Internal `createScrambler()` engine powering `omit` behavior in all log exporters. Smartly scrubs **matching paths, wildcard keys, and regex patterns**.

### Improved
- **feat**: Expanded default `OMIT_PRESETS` with automated redaction of **PII** for `first_name`, `last_name`, `full_name`, email/phone/ssn/creditcard value patterns.
- **feat**: Expanded default `OMIT_PRESETS` with automated redaction of `api_key`, `api_secret`, `apikey`, `apitoken`, `id_token`, `private_key`, `public_key`, `session`, `session_id`, `sid`, `user_token` globals and `Bearer ...` value pattern.
```typescript
/* 💡 Usage remains unchanged */
import {OMIT_PRESETS} from '@trifrost/core';

new JsonExporter({
  omit: [...OMIT_PRESETS.default, {global: 'api_secret'}],
});
```

---

### Example: Redaction in Action
Given the following input:
```typescript
{{
  user: {
    id: 42,
    full_name: 'Jane Doe',
    email: 'jane.doe@example.com',
    preferences: {
      theme: 'dark',
      newsletter: true,
    },
  },
  auth: {
    method: 'oauth',
    token: 'abc123',
  },
  activity: {
    message: 'User Jane Doe logged in from +1 (800) 123-4567',
    timestamp: '2025-06-09T12:00:00Z',
  },
}
```

... and applying the built-in `OMIT_PRESETS.default` (this is the default, so in practice you **don't even need to do anything**), TriFrost will output the following into your logs:
```typescript
{
  user: {
    id: 42,
    full_name: '***',
    email: '***',
    preferences: {
      theme: 'dark',
      newsletter: true,
    },
  },
  auth: {
    method: 'oauth',
    token: '***',
  },
  activity: {
    message: 'User *** logged in from ***',
    timestamp: '2025-06-09T12:00:00Z',
  },
}
```

No fields removed. No values silently missing.

Just clear, predictable redaction with `***`, even inside nested strings.

---

Oh yes, and did we mention it's **fast** as well? The code for our benchmark can be found [here](https://github.com/trifrost-js/core/blob/main/test/bench/utils/scrambler.bench.ts) just run `npm run benchmark test/bench/utils/scrambler.bench.ts` to see it for yourself.

As always, stay frosty ❄️

## [0.27.1] - 2025-06-06
### Improved
- **deps**: Upgrade @valkyriestudios/utils to 12.41.3

### Fixed
- **dx**: ApiKeyAuth validate function is now correctly typed according to the Env and State of the current middleware chain it is used in
- **dx**: BasicAuth validate function is now correctly typed according to the Env and State of the current middleware chain it is used in
- **dx**: BearerAuth validate function is now correctly typed according to the Env and State of the current middleware chain it is used in
- **dx**: SessionCookieAuth validate function is now correctly typed according to the Env and State of the current middleware chain it is used in
- **bug** Fix an edge case issue where under certain circumstances pass-by-reference style merges in the JSX engine would mutate a source object

## [0.27.0] - 2025-06-06
Ever leaked a token ... or forgot to scrub a password from a log? While most observability platforms can scrub sensitive data on ingest, that rarely helps with console or file-based logs — better to nip it at the bud.

This release further tightens the `omit` system with clear redaction (`***`), global redaction wildcard support, and a safe built-in default preset — giving you cleaner logs and ... fewer surprises.

### Improved
- **feat**: logger exporters just got a tad smarter. We’ve improved the ergonomics and baseline **safety** of the `omit` behavior across `ConsoleExporter`, `JsonExporter` and `OtelHttpExporter`. Instead of silently dropping values, we now **scramble them** to `***`, making it crystal clear which values **were redacted**. As well as **understanding whether or not they were set**.
- **feat**: logger global omits are now fully supported (e.g. `{global: 'password'}`, `{global: 'auth_token'}`), global omits apply to the entire object and nested levels without having to write brittle paths.
- **feat**: We're introducing a **sensible default** preset for common **sensitive fields** across all exporters. This includes: `'password', 'secret', 'token', 'access_token', 'refresh_token', 'auth', '$auth', 'authorization', 'client_secret', 'client_token'` at any level of the log object.
- **feat**: Want to define your own keys for omitting while also using the default preset?
```typescript
import {OMIT_PRESET} from '@trifrost/core';

app({
  ...
  tracing: {
    exporters: ({env}) => [
        ...
        new JsonExporter({
          /* global here means 'at any level', pass as string to simply */
          omit: [...OMIT_PRESET.minimal, {global: 'my_secret_key'}, 'my_root_key'],
        }),
      ];
    },
  },
})
```
- **deps**: Upgrade @cloudflare/workers-types to 4.20250606.0
- **deps**: Upgrade @types/node to 22.15.30
- **deps**: Upgrade @valkyriestudios/utils to 12.41.2
- **deps**: Upgrade @vitest/coverage-v8 to 3.2.2
- **deps**: Upgrade vitest to 3.2.2

---

Scrub smart, log sharp — and as always, stay frosty ❄️.

## [0.26.0] - 2025-06-05
This release brings deeper composition and sharper ergonomics to the `css` engine. `css.mix` and `css.use` now apply a **union-style deep merge**, preserving media queries and nested overrides across layers — **perfect for atom/molecule composition in JSX**.

Selector normalization gets even smarter: combinators, HTML tags, and pseudo-prefixed selectors now auto-space with better contextual awareness. If you’ve used the spacing behavior before, this update makes it even more intelligent, reducing friction in complex nesting scenarios.

We're also bumping the [valkyrie utils](https://github.com/valkyriestudios/utils) to 12.40.0 (valkyrie utils is also created by the creator of TriFrost), this version brings meaningful performance improvements for omit/merge/formdata conversion, all of which are used in core parts of TriFrost.

### Improved
- **feat**: Further enhanced selector normalization with intelligent auto-spacing. Selectors that begin with **combinators** (`>`, `+`, `~`), **known HTML tags** (e.g. `div`, `section`) or **known HTML tags followed by** `:` (pseudo), `.` (class), or space ` `. Are now automatically prefixed with a space during normalization. This ensures correct contextual matching in nested style blocks, safer output in deeply composed rules, less manual effort and cleaner style declarations. For Example:
```typescript
css({
  section: {padding: '1rem'}, // auto-space => ' section'
  div:hover: {color: 'red'},   // auto-space => ' div:hover'
  'a.active' {textDecoration: 'underline'}, // auto-space => ' a.active'
  'ul li': {fontSize: '1.6rem'}, // auto-space => ' ul li'
  '#hero': {fontWeight: 'bold'}, // NOT auto-spaced => '#hero'
});
```
- **feat**: Enhanced `css.mix` and `css.use` to support union-style deep merges. This change enables more powerful style composition patterns, particularly beneficial for JSX-based atomic/molecular components. Nested structures like responsive breakpoints or selector-based overrides are now preserved during merging. For example:
```tsx
import {css} from './css'; /* Your css factory instance */

type ButtonProps = {
  title: string;
  style?: Record<string, unknown>;
};

export function Button({title, style = {}}: ButtonProps) {
  return (<button
    type="button"
    className={css.use(css.mix({
      padding: '1rem 1.5rem',
      borderRadius: css.$v.rad_m,
      fontSize: css.$v.font_s_button,
      border: 'none',
      [css.media.mobile]: {
        padding: '.5rem 1rem',
        borderRadius: css.$v.rad_s,
      },
    }, style))}
  >{title}</button>);
}

export function SmallButton({title, style = {}}: ButtonProps) {
  return (<Button
    title={title}
    style={css.mix({
      fontSize: `calc(${css.$v.font_s_button} - .2rem)`,
      [css.media.mobile]: {
        padding: '.5rem',
      },
    }, style)}
  />);
}

export function BlueSmallButton({title, style = {}}: ButtonProps) {
  /**
   * Eventual Styles
   * {
   *  padding: '1rem 1.5rem',
   *  borderRadius: '12px',
   *  fontSize: 'calc(1rem - .2rem)',
   *  border: 'none',
   *  background: 'blue',
   *  color: 'white',
   *   [css.media.mobile]: {
   *     padding: '.5rem',
   *     borderRadius: '8px',
   *   },
   * }
   */
  return (<SmallButton
    title={title}
    style={css.mix({
      background: 'blue',
      color: 'white',
    }, style)}
  />);
}

export function RedSmallButton({title, style = {}}: ButtonProps) {
  /**
   * Eventual Styles
   * {
   *  padding: '1rem 1.5rem',
   *  borderRadius: '12px',
   *  fontSize: 'calc(1rem - .2rem)',
   *  border: 'none',
   *  background: 'red',
   *  color: 'white',
   *  [css.media.mobile]: {
   *    padding: '.5rem',
   *    borderRadius: '8px',
   *  },
   * }
   */
  return (<SmallButton
    title={title}
    style={css.mix({
      background: 'red',
      color: 'white',
    }, style)}
  />);
}
```
- **deps**: Upgrade @cloudflare/workers-types to 4.20250605.0
- **deps**: Upgrade @valkyriestudios/utils to 12.40.0

---

Smarter styles. Still frosty. ❄️

## [0.25.0] - 2025-06-04
From smarter exporter behavior to cleaner `404` fallbacks and a simple `isDevMode()` helper, this release removes noise and adds clarity, making development smoother, logs more readable, and defaults feel just right.

### Added
- **feat**: `isDevMode(env)` utility — a lightweight runtime check that determines whether TriFrost is running in development mode. It checks: `TRIFROST_DEV` environment variable (recommended), set to `true` for dev mode, it falls back to checking `NODE_ENV !== 'production'`. Example when configuring exporters:
```typescript
import {App, isDevMode} from '@trifrost/core';

const app = await new App<Env>({
	...
	tracing: {
    exporters: ({env}) => {
      if (isDevMode(env)) return [new ConsoleExporter()];
      return [
        new JsonExporter(),
        new OtelHttpExporter({
          logEndpoint: 'https://otlp.uptrace.dev/v1/logs',
          spanEndpoint: 'https://otlp.uptrace.dev/v1/traces',
          headers: {
            'uptrace-dsn': env.UPTRACE_DSN,
          },
        }),
      ];
    },
  },
)
```

### Improved
- **feat**: `ConsoleExporter` now has a **cleaner, more human-readable** output by default. Fields like `ctx`, `trace_id`, `span_id`, `global`, etc. are no longer shown unless explicitly opted in via the new `include` option. These fields are part of the rich internal format used by the JSON and Otel exporters, but were found too noisy for use in a console. Note: The `data` payload is always included. Below is an example where you can see **explicit opt-in** through the new `include` option:
```typescript
new ConsoleExporter({
    include: ['ctx', 'trace_id', 'span_id', 'global'],
    grouped: true,
});
```
- **feat**: The `group` option in `ConsoleExpoter` (introduced in 0.24.0) will now by default be set to `false`
- **feat**: Workerd runtime now switches to `ConsoleExporter` if in **dev mode**.
- **feat**: Node, Bun, uWS now default to a `ConsoleExporter` with no inclusions if **in dev mode**. If **not in dev mode** they default to a `ConsoleExporter` that includes only the `trace_id`, making logs concise but still traceable.
- **feat**: If no route is matched, the app now defaults to `ctx.setStatus(404)` automatically.
This removes the need for boilerplate in `.onNotFound()` handlers:
```typescript
/* These now behave the same */
.onNotFound(ctx => ctx.text('Not Found', {status: 404}));
.onNotFound(ctx => ctx.text('Not Found'));
```
- **deps**: Upgrade @cloudflare/workers-types to 4.20250604.0
- **deps**: Upgrade @vitest/coverage-v8 to 3.2.1
- **deps**: Upgrade typescript-eslint to 8.33.1
- **deps**: Upgrade vitest to 3.2.1

---

As TriFrost approaches `1.0`, each release sharpens the edges and sands down the rough spots. Expect fewer footguns, more consistency, and even better ergonomics — because great systems should feel effortless.

Stay frosty. ❄️

## [0.24.0] - 2025-06-03
This release brings a focused round of enhancements aimed at improving developer control, and strengthening TriFrost’s logging system.

### Added
- **feat**: Enhanced `ConsoleExporter` with `grouped` option (default: `true`). When `true` will use `console.groupCollapsed()` and `console.groupEnd()` for clearer, hierarchical log output.
- **feat**: Enhanced `ConsoleExporter` with ability to pass a custom `format` function to construct the log label. This `format` function gets passed the entire log object.
- **feat**: Enhanced `ConsoleExporter` with an `omit` option, allowing selective removal of keys (including nested keys) from the final logged meta object.
```typescript
new ConsoleExporter({
    grouped: true,
    format: log => `[${log.level.toUpperCase()}]: ${log.message}`,
    omit: ['ctx.password', 'data.pin'],
});
```
- **feat**: Enhanced `JsonExporter` with a `sink` option, allowing users to replace the default `console` output with a custom sink function (e.g., pushing to a file or external stream).
- **feat**: Enhanced `JsonExporter` with an `omit` option, allowing selective removal of keys (including nested keys) from the final exported JSON entry.
```typescript
new JsonExporter({
    omit: ['ctx.password', 'data.pin'],
    sink: entry => myUploadService.add(entry),
});
```
- **feat**: Enhanced `OtelHttpExporter` with an `omit` option, allowing selective removal of keys (including nested keys) from log and span payloads before they are transformed into OpenTelemetry format and sent over the wire.
- **feat**: Added `maxBufferSize` (default: 10,000) to `OtelHttpExporter` to cap the total in-memory buffer size and prevent unbounded memory growth in case of repeated failures.
```typescript
new OtelHttpExporter({
    logEndpoint: 'https://otel.myservice.dev/v1/logs',
    omit: ['ctx.secret', 'data.internalId'],
    maxBufferSize: 5000,
});
```

### Improved
- **feat**: `ConsoleExporter` log meta will now also include `time` and `level` (which was previously not added in the meta object as it only existed in the label).
- **feat**: Enhanced `OtelHttpExporter` attribute conversion so attributes now work with `intValue`, `doubleValue`, `boolValue`, `stringValue` OpenTelemetry mappings
- **feat**: Added `use_defaults` boolean flag (default: `true`) to the `Security()` middleware, letting users opt out of applying built-in defaults.
```typescript
/* Only applies cross origin opener policy, nothing else */
app.use(Security({crossOriginOpenerPolicy: 'unsafe-none'}, {use_defaults: false}));
```
- **feat**: Added `use_defaults` boolean flag (default: `true`) to the `Cors()` middleware, letting users opt out of applying built-in defaults.
```typescript
app.use(Cors({methods: ['DELETE']}, {use_Defaults: false}));
```

---

TriFrost continues its path toward 1.0, balancing polish, predictability, and power — and making sure every piece feels as solid as the core.

Stay tuned — and as always, stay frosty. ❄️

## [0.23.0] - 2025-06-02
This release further sharpens TriFrost’s internals, making the `createCss` system more flexible for external libraries by respecting `--prefixed` variables and tuning the JSX engine for even faster prop rendering.

### Improved
- **feat**: `createCss` will no longer prefix a variable with `--v-` if the variable's name starts with `--`.
- **feat**: `createCss` will no longer prefix a theme variable with `--t-` if the variable's name starts with `--`.
```typescript
createCss({
    var: {
        font_header: '...',
        font_body: '...',
        '--something': '...'
    },
    theme: {
        body_bg: {...},
        body_fg: {...},
        '--someborder': {...},
    },
});
/* Will now result in: --v-font_header, --v-font_header, --something, --t-body_bg, --t-body_fg, --someborder */
```
- **perf**: The JSX runtime will now fallback to null for props instead of an empty object, allowing for a micro optimization in the render engine to short-circuit prop rendering.

The performance change in the JSX prop short-circuiting leads to an estimated **5-10% render performance boost** 🚀 (based on vitest bench snapshots of common JSX trees), without sacrificing determinism or memory safety.

PS: The code for this benchmark lives [here](https://github.com/trifrost-js/core/blob/main/test/bench/modules/JSX/render.bench.ts)

## [0.22.0] - 2025-06-01
This release strengthens the `ApiKeyAuth` middleware by adding **explicit credential configuration** and support for **dual credential validation** (API key + client ID).
These improvements came directly from refining the TriFrost documentation and aligning the middleware more closely with the Swagger/OpenAPI authentication patterns and best practices.

It’s a small but meaningful change that improves clarity, predictability, and flexibility in your auth flows.

### Improved
- **feat**: `ApiKeyAuth` middleware now supports **dual credential extraction** with **optional** `apiClient`. Allowing you to validate both an API key and a paired client/app identifier.
```typescript
import {ApiKeyAuth} from '@trifrost/core';

app.group('/partner-api', router => {
  router
    .use(ApiKeyAuth({
      apiKey: {header: 'x-api-key'},
      apiClient: {header: 'x-api-client'},
      validate: async (ctx, {apiKey, apiClient}) => {
        /* Example lookup: combine client + key for validation */
        const isValid = await myApiKeyStore.checkClientKeyPair(apiClient!, apiKey);
        if (!isValid) return false;

        /* Return rich $auth context for downstream */
        return {clientId: apiClient, permissions: ['read', 'write']};
      }
    }))
    .get('/data', ctx => ctx.json({
      message: `Hello, client ${ctx.state.$auth.clientId}!`,
      permissions: ctx.state.$auth.permissions,
    }));
});
```
- **deps**: Upgrade @cloudflare/workers-types to 4.20250601.0

### Breaking
- `ApiKeyAuth` no longer has default header or query names — you must now explicitly configure where to extract the API key using the `apiKey` option.
```typescript
/* Previous */
app.use(ApiKeyAuth({
    validate: (ctx, key) => checkKey(key)
}));

/* Now */
app.use(ApiKeyAuth({
    apiKey: {header: 'x-api-key'}, // explicitly configure where to pull the key from
    validate: (ctx, {apiKey}) => checkKey(apiKey)
}));
```

---

### Why the change?
The old behavior silently assumed `'x-api-key'` (header) or `'api_key'` (query), which could lead to unintentional mismatches or weak configs.
By forcing explicit configuration, we ensure you know **exactly** where keys come from — and open the door to richer paired validation.

---

As we continue working on the TriFrost docs and gearing up for 1.0, expect more of these focused mini-releases delivering small but meaningful improvements across the framework.

Stay frosty! ❄️

## [0.21.0] - 2025-05-31
This release brings a set of carefully crafted improvements born directly out of working on the TriFrost documentation.

As we refined the docs, we uncovered small inconsistencies, rough edges, and opportunities to make the developer experience even smoother. This update is the result of that hands-on process — tightening the middleware, expanding ergonomic options, and sharpening semantic clarity across the framework.

### Improved
- **feat**: `Cors` middleware now supports passing an array of origin strings (`string[]`), alongside the existing single string or dynamic function — making origin whitelisting simpler and less verbose.
```typescript
app.use(Cors({
  origin: ['https://site1.com', 'https://site2.com']
}));
```
- **feat**: The `CacheControl` middleware and corresponding `cacheControl` options on context responders now support `proxyMaxage` (letting you finely control how long shared caches (like CDNs) can store content).
- **feat**: The `CacheControl` middleware and corresponding `cacheControl` options on context responders now support `proxyRevalidate` (forces shared caches to revalidate stale responses).
- **feat**: The `CacheControl` middleware and corresponding `cacheControl` options on context responders now support `mustRevalidate` (signaling that stale content must be revalidated with the origin).
- **feat**: The `CacheControl` middleware and corresponding `cacheControl` options on context responders now support `immutable` (marking responses as never changing — perfect for long-lived static assets).
```typescript
app.use(CacheControl({
  type: 'public',
  maxage: 60,             // browsers: 1 min
  proxyMaxage: 600,       // CDNs: 10 min
  immutable: true,
  mustRevalidate: true,
  proxyRevalidate: true
}));
```
- **deps**: Upgrade @cloudflare/workers-types to 4.20250531.0
- **deps**: Upgrade @types/node to 22.15.29
- **deps**: Upgrade eslint to 9.28.0

### Breaking
- The `cache` option on `ctx.html`, `ctx.file`, `ctx.text`, `ctx.json` has been renamed to `cacheControl` for better semantic clarity. Reflecting that it applies HTTP `Cache-Control` headers, not the internal `cache` storage system. This improves naming alignment and reduces confusion between storage-level caching and response-level caching.

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
