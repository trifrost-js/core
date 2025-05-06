# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [0.119.0] - 2025-05-06
### Improved
- **feat**: Logger now correctly sets `http.method`, `http.target`, `http.route`, `user_agent.original` otel-compliant keys on incoming context
- **feat**: Logger now correcttly sets `http.status_code` and otel status on spans once context is finalized
- **feat**: Context.fetch (ctx.fetch) now auto-instruments a span-wrap with proper span attributes
- **perf**: Minor performance improvement with verifying trace ids for correct format
- **perf**: Minor performance improvement when generating hex ids for traces/spans by using a hex lut with randomizer rather than crypto.randomValues (as not necessary there)
- **perf**: Minor performance improvement when spawning Logger thanks to improved behavior regarding span awareness
- **perf**: Removed unnecessary rgx replacements when responding with html
- **perf**: Reduced internal symbol overhead and removed Sym_FalconTimeout, Sym_FalconKind and Sym_FalconWeight

### Fixed
- Fix an issue in memorystore when retrieving values from cache due to coliding conditions
- Fix an issue with regards to jsx runtime registration for node runtime regarding registration of jsx.d.ts

## [0.118.3] - 2025-05-05
### Fixed
- Add copy for jsx.d.ts in gitlab ci

## [0.118.2] - 2025-05-05
### Fixed
- Add build:jsx script in package.json to manually copy over jsx declaration file

## [0.118.1] - 2025-05-05
### Fixed
- Potential fix for jsx module intrinsic

## [0.118.0] - 2025-05-05
### Added
- **misc**: Exports block in package.json
- **misc**: Root-level jsx-runtime

## [0.117.0] - 2025-05-05
### Added
- **feat**: Baseline JSX module

## [0.116.0] - 2025-05-05
### Improved
- **feat**: Add ability to pass version to app
- **feat**: Make use of 'service.name' and 'service.version' in otel attributes

## [0.115.0] - 2025-05-05
### Fixed
- Ensure valid hex identifiers are used for trace/span ID in Logger.

## [0.114.0] - 2025-05-05
### Added
- **feat**: OtelHttpExporter now supports span pushes as well, configuration like this (eg for HyperDX):
```typescript
new FalconOtelHttpExporter({
	logEndpoint: 'https://in-otel.hyperdx.io/v1/otel',
    spanEndpoint: 'https://in-otel.hyperdx.io/v1/otel',
	headers: {
		Authorization: `${env.HYPERDX_API_KEY}`,
    },
})
```

## [0.113.0] - 2025-05-04
### Added
- **feat**: OtelHttpExporter logic
- **feat**: Context.addAfter - allows adding a background job to be executed after response has finished. (For example metrics push, etc). On workerd this links to `waitUntil`, on bun/node/uws we use `queueMicrotask` for this.

### Improved
- **feat**: Redesign Tracer from the ground-up and rename to Logger
- **deps**: Upgrade @cloudflare/workers-types to 4.20250504.0
- **deps**: Upgrade bun-types to 1.2.12
- **deps**: Upgrade eslint to 9.26.0

### Removed
- **deps**: @opentelemetry/api

## [0.112.1] - 2025-05-03
### Fixed
- DurableObject class now correctly returns null for 204 delete

## [0.112.0] - 2025-05-03
### Improved
- **feat**: Add `wrap` as a utility method to FalconCache

## [0.111.1] - 2025-05-03
### Improved
- **feat**: Align config behavior between ratelimit and cache regarding store
- **feat**: Remove Falcon prefix from Ratelimit and Cache objects

## [0.110.1] - 2025-05-03
### Improved
- **misc**: Disable unit for now

## [0.110.0] - 2025-05-03
### Added
- **feat**: Context.cache
- **feat**: It is now possible to pass a Cache instance to a falcon app for global usage, there's 4 possible cache implementations `FalconKVCache`, `FalconDurableObjectCache`, `FalconRedisCache`, `FalconMemoryCache`. example usage:
```typescript
new App({
    cache: new FalconRedisCache({
        store: ({env:Env}) => ...
    }),
})
```

### Improved
- **feat**: Redesign RateLimiting dx to align with new Cache behavior, as such there's now `FalconKVRateLimit`, `FalconDurableObjectRateLimit`, `FalconRedisRateLimit`, `FalconMemoryRateLimit`, example usage:
```typescript
new App({
    rateLimit: new FalconKVRateLimit({
        store: ({env:Env}) => env.MY_KV,
    }),
})
```
- **perf**: Improved on standard FalconDurableObject class TTL with /10s ttl expiration bucketing
- **perf**: Improved on standard FalconDurableObject class by ensuring /128 key batch deletion rather than /key
- **feat**: Added delete support to standard FalconDurableObject class

## [0.109.1] - 2025-05-02
### Fixed
- TTL in seconds rather than milliseconds in DurableObject

## [0.109.0] - 2025-05-02
### Improved
- **feat**: Add durable object storage

## [0.108.0] - 2025-05-01
### Added
- **feat**: DOFixed and DOSliding Rate limit stores

## [0.107.0] - 2025-05-01
### Improved
- **feat**: Ensure KVFixed and KVSliding adhere to min ttl of 60

## [0.106.0] - 2025-05-01
### Improved
- **feat**: RateLimiter now allows passing store as a Factory function, allowing for jit-creation of a store when env is hydrated
```typescript
new RateLimit({
    store: ({env}) => new KVFixed(env.MY_HAPPY_KV),
}),
```

## [0.105.1] - 2025-05-01
### Fixed
- Fix typing regarding scoped vs generic tracer

## [0.105.0] - 2025-05-01
### Improved
- **feat**: Cleanup json tracer, reduce verbosity

## [0.104.1] - 2025-05-01
### Fixed
- Fix typing regarding scoped vs generic tracer

## [0.104.0] - 2025-05-01
### Improved
- **feat**: Rename falcon. to $falcon. for tracing

## [0.103.0] - 2025-05-01
### Improved
- **feat**: Only console tracer when scoped will now add request prefixes

## [0.102.0] - 2025-05-01
### Added
- **feat**: JsonTracer now supports a per-request and per-span mode

### Improved
- **feat**: App will now call 'flush' on tracer at end of lifecycle
- **feat**: Default for WorkerD will now be per-request tracing

## [0.101.0] - 2025-05-01
### Added
- **feat**: JsonTracer medium, eg for usage in Cloudflare/Workerd runtime

### Improved
- **feat**: Each runtime (uws/bun/node/workerd) will now have a built-in defaultTracer method to return an instance of the preferred default tracer for that runtime
- **feat**: App boot will now use the runtime's default tracer if none is provided

## [0.100.0] - 2025-05-01
### Improved
- **dx**: modules/RateLimit now allows passing no options (previously an empty object would have to be passed)
- **misc**: We will now run typechecks in verification phase of CI

## [0.99.0] - 2025-05-01
### Improved
- **feat**: Finalize Route builder behavior, add support for registering multiple routes on the same path, eg:
```typescript
.route('/api/:id', r => {
    r
        .use(MWare.auth)
        .use(MWare.RetrieveOne)
        .limit(100)
        .get(entryGet)
        .post(entryUpdate)
})
```
- **deps**: Upgrade @cloudflare/workers-types to 4.20250430.0
- **deps**: Upgrade @types/node to 22.15.3
- **deps**: Upgrade bun-types to 1.2.11
- **deps**: Upgrade eslint to 9.25.1
- **deps**: Upgrade typescript-eslint to 8.31.1

### Removed
- types/primitives

## [0.98.3] - 2025-04-30
### Fixed
- Further improvements and fixes to typing system, rename RouteBuilder to Route

## [0.98.2] - 2025-04-30
### Fixed
- Fix issue where chain inferrence is not accumulating on route builder

## [0.98.1] - 2025-04-30
### Fixed
- Fix issue with typing in new RouteBuilder file

## [0.98.0] - 2025-04-30
### Added
- **feat**: App and Route now have a 'limit' function which allows you to configure the limit on an app-level, route-level or group-level
- **feat**: A new 'Builder-Style' interface for route composition has been added, allowing you to define route-level limit/middleware.
```typescript
.route('/api/:id', r => r.use(auth).limit(100).get(myHandler))
```

### Improved
- **feat**: RateLimit is now a module instead of a Middleware
- **feat**: Make use of configured app name in default console tracer rather than 'Falcon'
- **perf**: Improve on initial route compilation by removing need to sort weighted middleware

### Removed
- **feat**: Remove limit on Context as no longer necessary

## [0.97.0] - 2025-04-21
### Improved
- **dx**: Reorganize typing system

### Removed
- Revert middleware chain addition on group/get/post/put/patch/del as causes typing system to breakdown

## [0.96.0] - 2025-04-21
### Improved
- **deps**: Upgrade @cloudflare/workers-types to 4.20250421.0
- **deps**: Upgrade @types/node to 22.14.1
- **deps**: Upgrade bun-types to 1.2.10
- **deps**: Upgrade eslint to 9.25.0
- **deps**: Upgrade typescript-eslint to 8.30.1
- **feat**: App.group/Router.group now works with a middleware chain and allows a router to be configured as an object.
```typescript
...
.group('/api', MWare.auth, router => {
    router
        .get('/:userId/details', ctx => ...)
        .get('/...')
})
...
.group('/api', MWare.auth, {
    timeout: 10000,
    fn: router => {
        router
            .get('/:userId/details', ctx => ...)
            .get('/...')
    },
})
...
```
- **feat**: App.[get|post|del|patch|put]/Router.[get|post|del|patch|put] now allows passing a middleware chain.
```
...
.get('/:userId/details', MWare.user, ctx => ...)
.get('/...', MWare.auth, ctx => ...)
...
```

Take Note: At this point in time chaining multiple middlewares is possible, HOWEVER there is no inferrence between these middlewares currently, eg in
the following chain: `.get('/bla', MWare.auth, MWare.user, ctx => ...)` the MWare.user does not yet get inferrence from MWare.auth state additions

### Removed
- **feat**: The additional options object for .group has been removed in favor of aligning with how get/post/... works by allowing the last handler in the chain to be an object containing the options

## [0.95.0] - 2025-04-18
### Added
- **feat**: App now allows you to pass `requestId` options to override default behavior of how requestId gets ingested. By default these options are:
```typescript
{
    ...
    requestId: {
        inbound: ['X-Request-Id', 'CF-Ray'],
        outbound: 'X-Request-Id',
        validate: ... (Function which validates that value is between 8 and 100 chars and only contains alphanumeric and dash chars)
    },
}
```
- **feat**: Context will now first check for an incoming request id based on the requestId.inbound headers array and if a valid one is found use that as its preferred identifier for the tracer
- **feat**: Context.fetch which is a thin wrapper around `globalThis.fetch` which when used will automatically add our tracer's requestId to the headers of a fetch call done by the service using the outbound header.
```
await ctx.fetch(...)
```
- **feat**: Context.requestId getter returnning the tracer's requestId. `ctx.requestId` is merely a shorthand for `ctx.tracer.requestId`

## [0.94.0] - 2025-04-17
### Improved
- **perf**: Improve on performance in ip getter on context (and as such also improving on default rate limiter performance)

## [0.93.0] - 2025-04-15
### Improved
- **perf**: Minor performance improvements in Fixed/Sliding stores, remove Math.max in favor of direct checks and reduce unnecessary checks to bare minimum

## [0.92.0] - 2025-04-15
### Improved
- **perf**: Ensure only a single entry is pruned at a time to ensure no unnecessary performance overhead in sliding window

## [0.91.0] - 2025-04-15
### Improved
- **feat**: RateLimit stores now only expose a single method (consume) which heavily simplifies the ratelimitting setup and reduces overhead regarding persistence layer (as previously multiple get calls would have happened, eg: getRaw in get, getRaw and setRaw in set)
- **feat**: RateLimit will now stop running put calls the moment it reaches the limit, ensuring no expensive ops go to persistrence layer if limit is reached
- **feat**: Add full unit test coverage for RateLimit middleware
- **feat**: Add full unit test coverage for RateLimit stores

## [0.90.0] - 2025-04-14
### Improved
- **feat**: Security middleware now exports ContentSecurityPolicy, CrossOriginEmbedderPolicy, CrossOriginOpenerPolicy,
    CrossOriginResourcePolicy, ReferrerPolicy, XContentTypes, XDnsPrefetchControl, XDownloadOptions, XFrameOptions enumerations.
- **feat**: Security middleware will now throw if provided configuration is invalid, this aligns it with Cors and CacheControl middleware
- **misc**: Add full unit test coverage for Security middleware

## [0.89.0] - 2025-04-14
### Improved
- **feat**: Router no longer has a Path generic, insread focusing on Env, State and aligning between App, Router, Context.

## [0.88.0] - 2025-04-12
### Fixed
- Ensure Context RateLimitLimitFunction internally is correctly typed

## [0.87.0] - 2025-04-12
### Fixed
- Fix for issue with limit not being typed correctly

## [0.84.0] - 2025-04-12
### Improved
- **feat**: Remove internal ability to pass multiple functions/array of functions to init as causing internal typing complexity. This will be replaced with a more versatile approach towards the future.
- **perf**: Tuple conversion on router (which is used for meta conversion to allow easier insertion as tracer attributes) now also prefixes the keys for the tuple. This ensures we don't need to run this operation at every single incoming request
- **feat**: Tracer attribute setting now happens ahead of initialization of context, ensuring that tracer attributes are available even if init fails.

### Fixed
- Fixed an issue where tracer name for the handler would be 'anonymous' rather than the route path or provided name
- Fixed an issue where limit function defined on the handler would not be typed according to the state of the handler

## [0.83.0] - 2025-04-10
### Improved
- **feat**: Improve tracer format by ditching ctx: in scoped handler

### Fixed
- **feat**: Fix error objects not being labeled in scoped handler

## [0.82.0] - 2025-04-10
### Added
- **deps**: @opentelemetry/api
- **feat**: modules/Tracer with built-in Otel/Console/Silent mediums as well as Multi tracer
- **feat**: modules/Tracer falconTrace, falconTraceMethods, falconTraceStatics and falconTraceAll decorators
- **feat**: Added support to pass `name` as part of AppOptions on construction. This name will automatically get added to trace as `falcon.appname`
- **feat**: Added support to pass `meta` as part of AppOptions on construction. This object will automatically get added to trace as individual attributes under the `falcon.appmeta.*` namespace.

### Improved
- **feat**: Runtime/Request information will automatically be added as attributes to the tracer
- **feat**: A requestId will automatically be generated by Context and will be set on trace as `falcon.id`
- **feat**: Context meta will automatically be added to trace as individual attributes under the `falcon.meta.*` namespace.
- **feat**: Runtime name/version will automatically be added to trace as `falcon.runtime.name` and `falcon.runtime.version`.

### Breaking
- ctx.logger has now become ctx.tracer

### Removed
- modules/Logger (in favor of modules/Tracer)

## [0.81.0] - 2025-04-09
### Improved
- **perf**: Prevent cookies module from always being hydrated when writing in runtimes
- **feat**: Middleware/CacheControl will now be named `FalconCacheControl` in its falcon name symbol
- **feat**: Middleware/Security will now be named `FalconSecurity` in its falcon name symbol
- **feat**: Middleware/Cors will now be named `FalconCors` in its falcon name symbol
- **feat**: Middleware/RateLimit will now be named `FalconRateLimit` in its falcon name symbol

## [0.80.0] - 2025-04-09
### Improved
- **feat**: Router will now fallback to working with `{method}_${path}` as the name for anonymous unnamed handlers
- **feat**: Router will now work with the name of the function or `anonymous` when registering middleware that has no symbols assigned
- **feat**: Router will now automatically set FalconType symbol for registered middleware through use

## [0.79.0] - 2025-04-08
### Added
- **feat**: Added the following symbols `Sym_FalconMethod`, `Sym_FalconKind`, `Sym_FalconType`, `Sym_FalconName`, `Sym_FalconDescription`, `Sym_FalconTimeout`, `Sym_FalconPath`, `Sym_FalconParams`, `Sym_FalconMeta`, `Sym_FalconWeight`, `Sym_FalconComputedWeight`. These will be used further down the line for introspection and runtime tracing.

### Improved
- **feat**: Middleware/CacheControl will now make use of `Sym_FalconName`, `Sym_FalconType`, `Sym_FalconDescription`
- **feat**: Middleware/Cors will now make use of `Sym_FalconName`, `Sym_FalconType`, `Sym_FalconDescription`
- **feat**: Middleware/Security will now make use of `Sym_FalconName`, `Sym_FalconType`, `Sym_FalconDescription`
- **feat**: Middleware/RateLimit will now make use of `Sym_FalconName`, `Sym_FalconType`, `Sym_FalconDescription`
- **feat**: Middleware/RateLimit will now have a weight of Infinity, meaning it will always be executed as the last middleware in the chain, this ensures you can use state-bound behaviors coming from other middleware in things such as limit/keygen handlers.
- **feat**: Router now internally works with `Sym_FalconKind`, `Sym_FalconType`, `Sym_FalconName`, `Sym_FalconDescription`, `Sym_FalconMethod`, `Sym_FalconTimeout`.
- **feat**: Router now allows you to pass a meta object during registration, this gets set to the `Sym_FalconMeta` for now and will be used further down the line for introspection and runtime tracing.
- **feat**: App now internally works with `Sym_FalconKind`, `Sym_FalconType`, `Sym_FalconPath`, `Sym_FalconParams`, `Sym_FalconWeight`, `Sym_FalconMeta`, `Sym_FalconName`, `Sym_FalconDescription`, `Sym_FalconMethod`, `Sym_FalconTimeout`.

### Fixed
- Fix an issue where app middleware was duplicated when working with nested routers.

## [0.78.0] - 2025-04-07
### Improved
- **misc**: Add MockContext to tests
- **misc**: Full unit tests for CacheControl Middleware
- **misc**: Full unit tests for Cors Middleware
- **misc**: Cookies now expects a ctx satisfying FalconContext rather than the Context class

## [0.77.0] - 2025-04-06
### Improved
- **misc**: Rename 'CacheHeadersOptions' and 'CacheHeaders' type/middleware to 'CacheControlOptions' and 'CacheControl' type/middleware
- **misc**: Rename 'SecurityHeadersOptions' and 'SecurityHeaders' type/middleware to 'SecurityOptions' and 'Security' type/middleware
- **misc**: Full unit tests for cookies module
- **feat**: ctx.json now also accepts cache control options
- **feat**: ctx.text now also accepts cache control options
- **feat**: Cookies.maxAge, Cookies.httpOnly, Cookies.sameSite options are now Cookies.maxage, Cookies.httponly and Cookies.samesite to stay aligned with the rest of falcon
- **feat**: Cookies now works with an 'outgoing' getter that is used by Bun/Node/UWS/WorkerD to set the cookie header rather than storing an intermediate response on the context.

### Fixed
- Fixed an issue where a cookie value such as `x=1=2=3` would be treated as `x: 1` instead of `x: '1=2=3'`
- Fixed an issue where in certain edge cases if expires is passed and maxage is not the maxage would be set as a fraction of the expires seconds (eg: 299.999 instead of 300)

## [0.76.0] - 2025-04-05
### Improved
- **feat**: Allow Middleware.RateLimit limit to be optional (this would allow configuring a global Persistence store/options and simply applying limit on specific routes), eg:
```typescript
app
    .use(Middleware.RateLimit({store: new RedisSliding({...})}))
    .group('/api/', r => {
        r
            .get('/:userId', ...)
            .post('/', {
                limit: 5,
                fn: ctx => ...,
            })
    })
```

## [0.75.0] - 2025-04-05
### Added
- **feat**: Context.kind getter, `kind` denotes the purpose of the context, currently 4 possibilities: `std`, `notfound`, `options`, `health`. Kind can also be provided when registering a route through route handler config. Kind defaults to `std` for most routes and `notfound` for notfound handlers.

### Improved
- **feat**: RateLimit middleware will now ignore contexts coming in with a non-`std` kind.

### Fixed
- Fixed an issue where rate limit middleware is not treating State generics correctly.

## [0.74.1] - 2025-04-05
### Fixed
- Fix typing

## [0.74.0] - 2025-04-05
### Added
- **feat**: You can now configure `limit` override when registering a route as a handler

## [0.73.1] - 2025-04-05
### Fixed
- Ensure RateLimit middleware is exported in barrel export for middleware

## [0.73.0] - 2025-04-05
### Added
- **feat**: Context.name getter. This getter returns the name of the route for which the request is running (if no name is defined this is the original path before parameter hydration)
- **feat**: Middleware.RateLimit
-- Supports providing a window in milliseconds (this is configured on the store)
-- Supports providing a limit (amount of calls someone can do in the provided window) as a number, handler or record with methods that need to be rate limited
-- Supports providing a custom key function (or use one of the built-ins `"ip"`, `"ip_name"`, `"ip_method"`, `"ip_name_method"`
-- Supports providing a custom store (defaults to `MemorySliding`) or use one of the built-ins (`KVFixed`, `KVSliding`, `RedisFixed`, `RedisSliding`, `MemoryFixed`, `MemorySliding`)
-- Take Note: Fixed vs Sliding here is the rate limiting strategy used by the store, feel free to create your own though ^^
-- Supports providing a custom `exceeded` handler (eg: for sending a custom 'youve been ratelimitted page'), defaults to sending the `429` status.
-- Uses `X-RateLimit` headers (turn this off by passing `headers: false` in your options)
```typescript
.use(Middleware.RateLimit({
    limit: 50,
    keygen: "ip_name_method",
    store: new KVSliding(env.MY_KV, 60_000),
}))
```

With specific limiter function
```typescript
.use(Middleware.RateLimit({
    limit: ctx => ctx.state.user.isPro ? 100 : 10,
    keygen: "ip_name_method",
    store: new KVSliding(env.MY_KV, 60_000),
}))
```

With specific limits per method
```typescript
.use(Middleware.RateLimit({
    keygen: "ip_name_method",
    store: new KVSliding(env.MY_KV, 60_000),
    limit: {
        get: ctx => ctx.state.user.isPro ? 1000 : 100,
        post: ctx => ctx.state.user.isPro ? 50 : 10,
        put: ctx => ctx.state.user.isPro ? 50 : 10,
        patch: ctx => ctx.state.user.isPro ? 50 : 10,
        del: ctx => ctx.state.user.isPro ? 50 : 10,
    },
}))
```
- **feat**: Added agnostic versions of provider-specific types in TypesProvider (`FalconCFKVNamespace`, `FalconCFFetcher`, `FalconRedis`)

### Improved
- **feat**: Renamed `maxAge` to `maxage` in CORS middleware to align with rest of Falcon
- **feat**: x-forwarded-for value in ctx.ip will now also be verified to be an ip v4 or v6 before seeing it as valid
- **deps**: Upgrade @cloudflare/workers-types to 5.20250405.0
- **deps**: Upgrade @types/node to 22.14.0
- **deps**: Upgrade eslint to 9.24.0
- **deps**: Upgrade typescript to 5.8.3

## [0.72.0] - 2025-04-05
### Added
- **feat**: App now supports passing a `trustProxy` boolean flag as part of its options, when set to true it means we can safely trust headers revolving around things like IP addresses and whatnot
- **feat**: Context will now as part of its context config receive the app-configured `trustProxy` or the runtime default (see **improved**)
- **feat**: Context.ip getter. This getter returns the IP address of the incoming request. If `trustProxy` is `true` we will try to get the IP address from the headers of the request, otherwise this will come from the runtime (if supported, eg workerd does not support this)
-- Note: When working with headers the order of headers which will be checked is: `x-client-ip`, `x-forwarded-for`, `cf-connecting-ip`,
`fastly-client-ip`, `true-client-ip`, `x-real-ip`, `x-cluster-client-ip`, `x-forwarded`, `forwarded-for`, `forwarded`, `x-appengine-user-ip`
-- Note: Each header value will be checked to ensure it's a valid formatted IP Address
-- Note: If no header is found valid we will auto-fallback to runtime checks
- **deps**: @valkyriestudios/validator (used for some of the internal methods such as vSysIPv4_or_v6)

### Improved
- **runtime**: Node context now implements the new protected getIP method, making use of connection.socket.remoteAddress and falling back to socket.remoteAddress
- **runtime**: Node runtime will default `trustProxy` to `false`
- **runtime**: Bun context now implements the new protected getIP method, making use of socket.remoteAddress
- **runtime**: Bun runtime will default `trustProxy` to `false`
- **runtime**: UWS context now implements the new protected getIP method, making use of UWS built-in getRemoteAddressAsText
- **runtime**: UWS runtime will default `trustProxy` to `false`
- **runtime**: WorkerD context now implements the new protected getIP method, returning null (as not possible within WorkerD but given that it's a trusted environment we should not turn trustProxy off)
- **runtime**: WorkerD runtime will default `trustProxy` to `true`

## [0.71.0] - 2025-04-04
### Added
- **feat**: Add support to provide a description when defining routes as handlers

### Fixed
- Fix an issue where notfound routes where not taking parent path into account for computation

## [0.70.0] - 2025-04-03
### Improved
- Finalize fix for node stream with cleaned-up error handler

## [0.69.1] - 2025-04-03
### Fixed
- Potential fix for an issue where nodejs runtime tends to load entire file into memory when using ctx.file rather than streaming with backpressure

## [0.69.0] - 2025-04-02
### Added
- **feat**: Cors Middleware
- **feat**: Context.setHeaders, which accepts an object map (eg: `{Authorization: '...', Time: '...'}`)

### Improved
- **feat**: Route computation will now automatically compute options routes which by design return Allowed/Vary headers with a 204 status on incoming OPTIONS call
- **perf**: CacheHeaders middleware now makes use of ctx.setHeaders
- **perf**: SecurityHeaders middleware now makes use of ctx.setHeaders

## [0.68.0] - 2025-04-01
### Fixed
- Fix issue with TransparentMiddleware type used in middleware no longer being available

## [0.67.0] - 2025-04-01
### Improved
- **feat**: Finalized state management overhaul
- **feat**: Heavily simplified typing and introduced generic FalconContext and FalconRouter types as well as renamed the Runtime type to FalconRuntime
- **feat**: Context.params has been removed in favor of a single 'state' which contains both the params coming from routing and state coming from middleware
- **feat**: App class now extends from Router and inherits all the baseline public methods get/post/put/patch/del/head/notfound from there
- **feat**: Router.group now allows passing router options as the third parameter
- **workerd**: Workerd context will now throw if using getStream when ASSETS is not defined
- **deps**: Upgrade @types/node to 22.13.17
- **deps**: Upgrade bun-types to 1.2.8
- **deps**: Upgrade typescript-eslint to 8.29.0

### Fixed
- **deps**: Move uWebSockets.js into devDeps (to prevent automatic installation in non-supported environments)

## [0.66.0] - 2025-03-30
### Improved
- **feat**: Middleware & State WIP: Further improve on generics
- **feat**: Context will now internally store both res_status and its corresponding res_code (numerical), this allows runtimes to pick one or the other for their responses rather than having to internally convert.

## [0.65.0] - 2025-03-30
### Added
- **feat**: Middleware overhaul - New Middleware type in Types.ts expecting Context to be returned
- **wip**: Context now has setState, delState methods and a state getter, wip on state management through routing chain (as middleware can set state as well)

### Improved
- **feat**: Middleware overhaul: Adjust App to work with new middleware behavior and type
- **feat**: Middleware overhaul: Adjust Router to work with new middleware behavior and type
- **feat**: Middleware overhaul: CacheHeaders middleware will now return the updated context and adhere to new Middleware type
- **feat**: Middleware overhaul: SecurityHeaders middleware will now return the updated context and adhere to new Middleware type
- **feat**: SecurityHeaders Middleware is now typed as TransparentMiddleware
- **feat**: CacheHeaders Middleware is now typed as TransparentMiddleware
- **deps**: Upgrade @cloudflare/workers-types to 4.20250327.0
- **deps**: Upgrade @types/node to 22.13.14
- **deps**: Upgrade @valkyriestudios/utils to 12.35.0
- **deps**: Upgrade bun-types to 1.2.7
- **deps**: Upgrade eslint to 9.23.0
- **deps**: Upgrade typescript-eslint to 8.28.0
- **deps**: Upgrade optional dep uWebSockets to 20.51.0

### Fixed
- **routing**: Fixed an issue where a route would be invalid if registered with a timeout

## [0.64.0] - 2025-03-16
### Added
- **feat**: WIP on state behavior, introduce ContextOptions and make Options for Context a combo of {Params: ...; State: ...}

### Improved
- **deps**: Upgrade @cloudflare/workers-types to 4.20250313.0
- **deps**: Upgrade @types/node to 22.13.10
- **deps**: Upgrade @valkyriestudios/utils to 12.34.0
- **deps**: Upgrade bun-types to 1.2.5
- **deps**: Upgrade eslint to 9.22.0
- **deps**: Upgrade typescript to 5.8.2
- **deps**: Upgrade typescript-eslint to 8.26.1

## [0.63.0] - 2025-01-05
### Improved
- **runtime**: Context.stream now treats 'size' as null by default, meaning it is optional to be passed

### Fixed
- **workerd**: Workerd standard Context.getStream (which takes from a defined 'ASSETS' binding) will now correctly prepend the host or 0.0.0.0 to its path as the assets fetcher has issues otherwise with the path not being a FQDN

## [0.62.1] - 2025-01-05
### Fixed
- Add missing uws types file

## [0.62.0] - 2025-01-05
### Improved
- **app**: App start/stop have been renamed to 'boot' and 'shutdown'
- **runtime**: Runtime detection chain will now favor non-async runtime loaders (such as Workerd) over async runtime loaders (such as Node/Bun/uWS)
- **runtime**: Runtime start/stop have been renamed to 'boot' and 'shutdown'
- **runtime**: Each runtime will now export an 'exports' public variable which can either be null or a single-level object. This exports object gets used to automatically expand on the App instance's properties, allowing for runtimes such as workerd to export their fetch handler among others.
- **dx**: The type which extracts parameters from paths now falls back to `{}` instead of `Record<string, string>` to ensure more robustness with typing
- **dx**: Router generics are now <Env, {Params: Record<string, string>}>, allowing for easier typing when working with routers nested in isolated files. For example:
```typescript
const app = new App();

app.group('/api/users/:userId', singleUserRouter);
app.group('/api/users/:oserId', singleUserRouter); /* This will error as singleUserRouter has a 'userId' requirement */

... /* Somewhere else in your code */

export function userApiRouter (r:Router<Env, {Params: {userId: string}}>) {
    return r
        .get('', ctx => ctx.text(`Got user with id ${ctx.params.userId}`))
        .get('/assets/:assetId', ctx => ctx.text(`Got asset ${ctx.params.assetId} for user ${ctx.params.userId}`));
}
```
- **dx**: Context generics are now <Env, {Params: Record<string, string>}> allowing for easier typing and introducing of custom Context generic. For Example:
```typescript
import {type Context as OGContext} from '@valkyriestudios/falcon/Context';

type Env = {
    ... /* your env */
}

export type Context <Params extends Record<string, string> = Record<string, string>> = OGContext<Env, {Params: Params}>;

/* Example usage */

export async function getIcon (ctx:Context) {
    return ctx.file('./public/favicon.ico');
}

export async function getAssets (ctx:Context<{path: string}>) {
    return ctx.file(`./public/${ctx.params.path}`);
}

export async function userAsset (ctx:Context<{userId:string; path: string}>) {
    return ctx.text(`./public/${ctx.params.userId}/${ctx.params.path}`, 200);
}
```
- **perf**: Improve on path/query extraction in workerd and bun context instantiation

### Removed
- **runtime**: Removed ability to register custom runtime detector as not necessary due to runtime being passable to App instance

### Fixed
- **runtime**: Bun runtime and context now use dynamic imports instead of global imports as this was causing issues in vanilla wrangler projects using esbuild
- **runtime**: Node runtime and context now use dynamic imports instead of global imports as this was causing issues in vanilla wrangler projects using esbuild
- **runtime**: UWS runtime and context now use dynamic imports instead of global imports as this was causing issues in vanilla wrangler projects using esbuild

## [0.61.2] - 2025-01-01
### Improved
- **cookies**: Ensure cookies.del does not require options to be passed

## [0.61.1] - 2025-01-01
### Improved
- **cookies**: Improve on jsdoc description for Cookies.all to ensure it's clear that it returns both ingoing and outgoing cookie values

### Fixed
- **cookies**: Fix issue with frozen cookie adjustments

## [0.61.0] - 2025-01-01
### Improved
- **cookies**: Renamed Cookies.delete to Cookies.del
- **cookies**: Renamed Cookies.deleteAll to Cookies.delAll

## [0.60.0] - 2025-01-01
### Improved
- **cookies**: Cookies.all() now reflects both incoming and outgoing cookies for a unified view.
- **cookies**: Cookies.delete() updates the `Cookies.all()` and `Cookies.get()` outputs to reflect deletions.
- **cookies**: Cookies.deleteAll() removes all cookies, updating both `Cookies.all()` and `Cookies.get()` in real time.

## [0.59.0] - 2025-01-01
### Added
- **cookies**: Cookies.all as a getter which returns a read-only object with all the cookies provided by the client

### Improved
- **cookies**: Cookies.set is now correctly typed as also allowing a number value as input

## [0.58.0] - 2025-01-01
### Added
- **feat**: modules/Cookies as a dedicated Cookies module with get/set/delete/deleteAll methods
- **feat**: Context now has a cookies getter (ctx.cookies) which offers direct access to cookies for the ongoing context (ctx.cookies.get, ctx.cookies.set, ctx.cookies.delete)
- **feat**: App now allows configuring global cookie defaults (with the existing defaults being `{path: '/', secure: true, httpOnly: true, sameSite: 'Strict', domain: (determined off of host)}`)

### Improved
- **runtimes**: Adjust Bun, Node, uWS, Workerd contexts to work with cookie writing
- Logger has now been moved into modules/Logger

## [0.57.1] - 2025-01-01
### Fixed
- **bun**: Ensure configured idleTimeout stays within range of 0-255

## [0.57.0] - 2025-01-01
### Added
- **feat**: Support for a dedicated bun Runtime/Context and automatic detection
- **deps**: Add bun-types as dev dependency

### Improved
- **feat**: ContextConfig (which is what's passed to the runtime start) will now be passed the global app timeout for use in the runtime itself (eg: Bun idletimeout)
- **feat**: All runtimes now have name, version and meta (name and version) getters. On Bun and Node the version returns their respective versions but on workerd and uws they simply return null
- **feat**: getRuntime will now log a debug log for the detected runtime

## [0.56.0] - 2024-12-30
### Added
- **dx**: A new type `AppEnv` is exported from the App file which allows for easy reconstruction of the environment bound to the app by simply doing `AppEnv<MyEnv>`

### Improved
- **misc**: Debug log on falcon instantiation will no longer log the options passed to it, as this could otherwise leak environment to console

## [0.55.0] - 2024-12-30
### Added
- **feat**: App now supports 'env' as a first-class citizen, env gets passed down to context and is available on ctx.env. Ctx.env will be a combination of the provided env and the env on globalThis.env (Workerd)
- **feat**: App.group and Router.group are now available, this allows for nesting behavior on single-file routing registration such as:
```typescript
const app = new App({
    env: {
        hello: "world",
    },
});

app.group('/app/:userId', r => {
    r.get('/hello', ctx => ctx.text(ctx.env.hello + '-' + ctx.params.userId))
    r.get('/goodbye', ctx => ctx.text('Goodbye!'))
    r.group('/details/:hello', r2 => {
        r2.get('/:myDetails', ctx => ctx.text(ctx.params.userId))
    });
});
```

### Improved
- **feat**: Context now marks getStream and stream as abstract methods to be implemented by runtime contexts.
- **feat**: Implemented uWS getStream and stream to work with 'fs' import and ReadStream, fixes streaming backpressure issues as well
- **feat**: Implemented node getStream and stream to work with 'fs' import and ReadableStream
- **feat**: Implemented workerd getStream and stream to work with a named 'ASSETS' Fetcher on the env.

### Removed
- Context will no longer internally load up 'node:fs' when working with file streams, instead relying on the runtime-specific contexts to implement a 'getStream' function to handle the loading of files.

## [0.54.1] - 2024-12-29
### Fixed
- **uws**: Fix header writing happening outside of cork, wip improve on stream behavior

## [0.54.0] - 2024-12-29
### Improved
- **feat**: Improved on uWS stream behavior with more refined logging

### Fixed
- Linting issues, remove unused RGX_PATHCLEAN

## [0.53.0] - 2024-12-29
### Improved
- **perf**: Delay instantiation of query parameters until first time they're requested
- **perf**: Remove path clean behavior as not necessary
- **feat**: Workerd runtime context now adheres to proper HTTP specification regarding head method responses
- **feat**: Node runtime context now adheres to proper HTTP specification regarding head method responses

## [0.52.2] - 2024-12-29
### Fixed
- Fix issue with parameterized routing in combination with regex sanitization
- Fix issue with memoized routes needing to be bound to this

## [0.52.1] - 2024-12-29
### Fixed
- Fix issue with iteration over enum

## [0.52.0] - 2024-12-29
### Improved
- **feat**: Remove unnecessary if check on setTimeout in App

## [0.51.0] - 2024-12-29
### Improved
- **feat**: Route matching will no longer take query or hash into account (eg: '/hello/world?q=24324' will be matched as '/hello/world')

## [0.50.1] - 2024-12-29
### Fixed
- Fix issue with iteration over enum

## [0.50.0] - 2024-12-29
### Removed
- **feat**: Removed an unnecessary global notfound registration as this is the default anyways

## [0.49.0] - 2024-12-29
### Added
- **feat**: Routing paths now support usage of wildcards `*`

### Improved
- **perf**: Internal Route matching now works with memoization using a TLRU cache (60 seconds)
- **perf**: Internal Route matching now works with a division between static and dynamic routes, improving on speed of matching due to less internal Regex operations
- **feat**: Internal Dynamic routes (routes with wildcards and params) now get a weight assigned to them and sorted based on the number of wildcards/segments/parameters they have to prevent matching a less precise route (eg: '/users/:userId' vs '/users/:userId/details')
- **feat**: NotFound handlers are now treated separately and also work with nested handlers (eg: a NotFound on '/users' has prevalence over a global NotFound)

### Removed
- `HttpMethods.ANY` as no longer in use (remnant of UWS-specific Falcon)

## [0.48.0] - 2024-12-28
### Added
- **feat**: App.get as a way of globally registering a get route
- **feat**: App.post as a way of globally registering a post route
- **feat**: App.put as a way of globally registering a put route
- **feat**: App.patch as a way of globally registering a patch route
- **feat**: App.del as a way of globally registering a delete route
- **feat**: App.notfound as a way of globally registering a notfound catch-all handler (TAKE NOTE: A baseline notfound handler will by design be registered)

### Improved
- **dx**: Logger will now only require a single config for instantation (previously the GlobalConfig and LoggerContext were both required)
- **dx**: `LoggerContext` type has been renamed to `LoggerConfig`
- **dx**: `GlobalConfig` type has been renamed to `ContextConfig`
- **dx**: `port` option will now be part of the ContextConfig when passed to runtimes
- **feat**: Default `debug` will now be false
- **feat**: Router will now automatically clean up a previously provided notfound handler when registering a new one

### Removed
- components/BaseRouter (as no longer necessary)

## [0.47.2] - 2024-12-27
### Fixed
- Remove unnecessary Context error throwing
- Fix unnecessary duplication of function name in error messages when using nativeError in Context

## [0.47.1] - 2024-12-27
### Fixed
- Fix Handler generic requiring argument

## [0.47.0] - 2024-12-27
### Added
- **feat**: It is now possible to configure a timeout (defaults to 30000ms) on App-Level
- **feat**: It is now possible to pass an options object with a timeout on Router-Level (this overrides the App-Level timeout for routes on that Router)
- **feat**: It is now possible to pass a timeout when working with config-based Routes (this in turn overrides the Router-Level timeout)
- **feat**: App@timeout getter - Returns the configured app-wide timeout
- **feat**: Router@timeout getter - Returns the configured timeout for that router
- **feat**: Context@timeout getter - Returns the configured timeout for the Context
- **feat**: Context@setTimeout (called by default but can be manually called from within middleware for example)
- **feat**: Context@clearTimeout - Function to clear the current timeout
- **Context@file**: Respond.file merged into Context for ease of use, example:
```typescript
/* Now */ (ctx) => ctx.file(`/public/app/assets/${ctx.params.asset}`)
/* Pre */ (ctx) => Respond.file(ctx, `/public/app/assets/${ctx.params.asset}`)
```
- **Context@status**: Respond.status merged into Context for ease of use, example:
```typescript
/* Now */ (ctx) => ctx.status(200)
/* Pre */ (ctx) => Respond.status(ctx, 200)
```
- **Context@html**: Respond.html merged into Context for ease of use, example:
```typescript
/* Now */ (ctx) => ctx.html('<html><body><h1>Hello World</h1></body></html>', 200)
/* Pre */ (ctx) => Respond.html(ctx, '<html><body><h1>Hello World</h1></body></html>', 200)
```
- **Context@json**: Respond.json merged into Context for ease of use, example:
```typescript
/* Now */ (ctx) => ctx.json({hello: "world"}, 200)
/* Pre */ (ctx) => Respond.json(ctx, {hello: "world"}, 200)
```
- **Context@text**: Respond.text merged into Context for ease of use, example:
```typescript
/* Now */ (ctx) => ctx.text('Hello World', 200)
/* Pre */ (ctx) => Respond.text(ctx, 'Hello World', 200)
```
- **Context@redirect**: Respond.redirect merged into Context for ease of use, example:
```typescript
/* Now */ (ctx) => ctx.redirect('/v2/hello')
/* Pre */ (ctx) => Respond.redirect(ctx, '/v2/hello')
```

### Fixed
- **Context**: Fixed an issue with body getter being recursive

### Removed
- Respond (as its functionality has now been absorbed into Context)

## [0.46.1] - 2024-12-27
### Fixed
- Fix tests still referencing old validator behavior

## [0.46.0] - 2024-12-27
### Improved
- **feat**: Added `418 I'm a Teapot`, `440 Login Timeout`, `449 Retry With`, `498 Network Read Timeout`, `777 Lucky Request` to the supported set of HttpStatuses
- **dx**: Params for a route will now be typed as the combined parameters of the route and the router it is defined on, for example:
```typescript
const app = new App();

/**
 * params here will be typed as {userId:string; asset:string}
 */
app.use(
    new Router('/:userId').get('/assets/:asset', (ctx) => Respond.file(ctx, `/public/app/assets/${ctx.params.asset}?uid=${ctx.params.userId}`))
);
```

### Removed
- **deps**: Removed usage of @valkyriestudios/validator for now
- Main barrel export will no longer container `Validator` as a direct export of @valkyriestudios/validator

## [0.45.3] - 2024-12-27
### Fixed
- **uws**: Fix issue with detection of UWS runtime

## [0.45.2] - 2024-12-26
### Fixed
- **node**: Fix issue with route computation being non-functional

## [0.45.1] - 2024-12-26
### Fixed
- **node**: Fix issue with http as not being default export in runtime

## [0.45.0] - 2024-12-26
### Added
- **deps**: @cloudflare/workers-types as dev dep
- **feat**: App is no longer UWS-focussed and instead will internally boot up a runtime that is either passed externally or auto-detected
- **feat**: runtimes/Runtime
- **feat**: runtimes/UWS/Runtime
- **feat**: runtimes/Workerd/Runtime
- **feat**: Add support for node as runtime and context
- **feat**: Add support for registering custom runtime/contexts

### Improved
- **feat**: Context@setStatus now accepts known status code numbers (eg: `200`, `404`) in addition to statuses in full `200 OK`, `404 Not Found`)
- **feat**: Respond.* methods expecting statuses now accept known status code numbers (eg: `200`, `404`) in addition to statuses in full `200 OK`, `404 Not Found`)
- **feat**: context/UWS has now been moved to runtimes/UWS/Context
- **feat**: context/Workerd has now been moved to runtimes/Workerd/Context
- **perf**: middleware/CacheHeaders will no longer check whether or not ctx is instance of Context as not necessary (closed-loop system)
- **perf**: middleware/ContextLoader will no longer check whether or not ctx is instance of Context as not necessary (closed-loop system)
- **perf**: middleware/SecurityHeaders will no longer check whether or not ctx is instance of Context as not necessary (closed-loop system)
- **perf**: Respond.* will no longer check whether or not ctx is instance of Context as not necessary (closed-loop system)
- **deps**: Upgrade @types/node to 22.10.2
- **deps**: Upgrade @valkyriestudios/utils to 12.29.0
- **deps**: Upgrade @valkyriestudios/validator to 9.29.0
- **deps**: Upgrade eslint to 9.17.0
- **deps**: Upgrade typescript to 5.7.2
- **deps**: Upgrade typescript-eslint to 8.18.2
- **deps**: uWebSockets.js is now an optional dependency

### Fixed
- Respond.text using JSON.stringify on passed body when it shouldn't have

## [0.44.0] - 2024-10-13
### Added
- **feat**: Respond@text

## [0.43.0] - 2024-10-13
### Improved
- **misc**: Router: Added nativeError log for context in catch-all

## [0.42.0] - 2024-10-13
### Fixed
- **bug**: context/UWS: Fixed an issue with the new ReadableStream behavior where stream lock was not being checked
- **bug**: Router: Fixed an issue where context lock check would not correctly function if a non-async function returns a promise

## [0.41.0] - 2024-10-13
### Added
- **feat**: context/Workerd (experimental)

### Improved
- **feat**: Split context into context/index (Abstract), context/UWS (UWS implementation of Context)

### Removed
- **feat**: Context (see added)

## [0.40.0] - 2024-10-13
### Improved
- **perf**: Adjust context response headers to work with a record instead of a map

## [0.39.0] - 2024-10-13
### Improved
- **perf**: Simplified middleware/SecurityHeaders by making use of Record instead of map

## [0.38.0] - 2024-10-13
### Improved
- **feat**: Respond@html now automatically applies comment and space between tag stripping
- **perf**: Simplified middleware/CacheHeaders by making use of Record instead of map

## [0.37.0] - 2024-10-13
### Improved
- **misc**: Respond.* now makes use of logger.nativeError in catch handlers
- **misc**: Make more use of Set over object maps when verifying values

## [0.36.1] - 2024-10-12
### Fixed
- tests

## [0.36.0] - 2024-10-12
### Added
- **feat**: Context@logger is now available as a direct getter to the logger for the ongoing context
- **feat**: Logger module (logger which for now only funnels to console, listens to debug behavior)
```typescript
ctx.logger.info('...');
ctx.logger.warn('...');
ctx.logger.debug('...');
ctx.logger.error('...');
ctx.logger.nativeError(err, '...');
ctx.logger.log('...');
```
- **deps**: typescript-eslint 8.8.1 (dev dep)

### Improved
- Migrate to eslint 9.x
- **deps**: Upgrade @valkyriestudios/utils to 12.25.1
- **deps**: Upgrade @valkyriestudios/validator to 9.27.0
- **deps**: Upgrade uWebsockets.js to 20.49.0
- **deps**: Upgrade @types/node to 20.16.11
- **deps**: Upgrade eslint to 9.12.0
- **deps**: Upgrade nyc to 17.1.0
- **deps**: Upgrade typescript to 5.6.3

### Removed
- **deps**: @typescript-eslint/eslint-plugin
- **deps**: @typescript-eslint/parser

## [0.35.0] - 2024-08-11
### Improved
- **perf**: hydrateHeaders in context no longer requires an additional wrapper function
- **deps**: Upgrade @types/node to 20.14.15
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.18.0
- **deps**: Upgrade @typescript-eslint/parser to 7.18.0
- **deps**: Upgrade @valkyriestudios/utils to 12.19.0
- **deps**: Upgrade @valkyriestudios/validator to 9.22.0
- **deps**: Upgrade esbuild-register to 3.6.0
- **deps**: Upgrade typescript to 5.5.4
- **deps**: Upgrade uWebSockets.js to 20.47.0

## [0.34.0] - 2024-07-21
### Improved
- **perf**: Remove usage of headers.entries in favor of for...of loop in Context
- **deps**: Upgrade @types/node to 20.14.11
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.16.1
- **deps**: Upgrade @typescript-eslint/parser to 7.16.1
- **deps**: Upgrade @valkyriestudios/utils to 12.17.1
- **deps**: Upgrade @valkyriestudios/validator to 9.19.0
- **deps**: Upgrade nyc to 17.0.0
- **deps**: Upgrade typescrpt to 5.5.3

## [0.33.0] - 2024-06-06
### Improved
- **perf**: Minor performance improvement in security headers middleware thanks to swapping out map iteration for array with native for
- **perf**: Minor performance improvement in cache headers middleware thanks to swapping out map iteration for array with native for
- **misc**: Swap out usage of Is.* in favor of raw imports from valkyrie utils

## [0.32.0] - 2024-06-02
### Improved
- **deps**: Upgrade @types/node to 20.13.0
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.11.0
- **deps**: Upgrade @typescript-eslint/parser to 7.11.0
- **deps**: Upgrade @valkyriestudios/utils to 12.10.0
- **deps**: Upgrade @valkyriestudios/validator to 9.14.0

## [0.31.0] - 2024-04-26
### Improved
- **deps**: Upgrade @valkyriestudios/utils to 12.5.0
- **deps**: Upgrade @valkyriestudios/validator to 9.7.0
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.7.1
- **deps**: Upgrade @typescript-eslint/parser to 7.7.1

## [0.30.0] - 2024-04-22
### Improved
- **feat**: Respond@status no longer throws but silently ignores if a context is already locked
- **feat**: Respond@html no longer throws but silently ignores if a context is already locked
- **feat**: Respond@json no longer throws but silently ignores if a context is already locked
- **feat**: Respond@file no longer throws but silently ignores if a context is already locked
- **feat**: Respond@file - Revert back to working with fs.statSync as causes issues in responding down the line (otherwise would need to make Respond.file async)

## [0.29.1] - 2024-04-22
### Fixed
- **sys**: Fix linting issue with double declared el and shadowing

## [0.29.0] - 2024-04-22
### Improved
- **perf**: Respond@file now works with fs.stat instead of fs.statSync

### Fixed
- **bug**: Respond@file now responds with notfound if file doesnt exist instead of a 500 internal server error

## [0.28.1] - 2024-04-22
### Fixed
- **bug**: Parsed parameters have leading : still added when inside of the reqParams map, as such instead of 'path' it would be ':path'

## [0.28.0] - 2024-04-22
### Added
- **feat**: Context@path - Getter that returns the current path the context is running on
- **feat**: Context@reqParams - Getter that returns a parsed map of dynamic path params for the path the context is running on, for example a context registered on a route /hello/:id/:name hit on /hello/123/peter will get a map like {id: '123', name: 'peter'}

### Improved
- **feat**: Router@mount - Will now precompile a param parser for paths with dynamic portions (eg: /hello/:id/:name), this is then exposed for retrieval in Context@reqParams (see added section)

## [0.27.1] - 2024-04-19
### Fixed
- **bug**: middleware/CacheHeaders fix issue where CacheControl is not correctly typed for enum usage

## [0.27.0] - 2024-04-19
### Added
- **feat**: middleware/CacheHeaders (focused on Cache-Control header configuration)
- **feat**: Respond@html now allows passing an additional CacheHeadersOptions value
- **feat**: Respond@file now allows passing an additional CacheHeadersOptions value
- **feat**: middleware/index now exports all middleware as named exports, example usage:
```
import {CacheHeaders, SecurityHeaders} from '@valkyriestudios/falcon/middleware';
```

### Improved
- **feat**: middleware/SecurityHeaders now also exports its 'SecurityHeadersOptions' type

## [0.26.0] - 2024-04-19
### Improved
- **Router**: Router will now ensure all paths mounted to uWs start with a /

### Fixed
- **bug**: Fix edge-case issue where adding a custom notfound on a base router set to '' as path would end up using the default notfound

## [0.25.0] - 2024-04-18
### Improved
- **sys**: App now offers both named and default export
- **sys**: Router now offers both named and default export
- **sys**: Respond now offers both named and default export
- **sys**: Context now offers both named and default export
- **sys**: middleware/ContextLoader now offers both named and default export
- **sys**: middleware/SecurityHeaders now offers both named and default export
- **sys**: components/BaseRouter now offers both named and default export
- **deps**: Upgrade @valkyriestudios/utils to 12.4.0
- **deps**: Upgrade @valkyriestudios/validator to 9.6.0

### Breaking
- **feat**: Renamed Application to App
- **feat**: Base Index no longer exports as an object like Falcon.*, instead you can simply do something like:
```typescript
import {App, Respond, Router, Middleware} from '@valkyriestudios/falcon';
...
```

### Removed
- **feat**: middleware/index

## [0.24.0] - 2024-04-16
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.5.0
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.7.0
- **deps**: Upgrade @typescript-eslint/parser to 7.7.0

## [0.23.0] - 2024-04-11
### Fixed
- **bug**: Context@end - Fix issue where in a head request the content-length would not be set if a body would exist

## [0.22.0] - 2024-04-11
### Fixed
- **bug**: Context@stream - Fix issue where if a request is aborted mid-stream the chunks would try to continue streaming

## [0.21.0] - 2024-04-11
### Added
- **feat**: Types@HttpMethods - now includes 'head'

### Improved
- **feat**: Router@get - will now automatically register a head for the same route
- **feat**: Context@stream - will now adhere to responding without a body when dealing with a head call
- **feat**: Context@end - will now adhere to responding without a body when dealing with a head call
- **feat**: Respond@json - will now adhere to responding without a body when dealing with a head call (it uses Context@end behind the scenes)
- **feat**: Respond@html - will now adhere to responding without a body when dealing with a head call (it uses Context@end behind the scenes)
- **feat**: Respond@file - will now adhere to responding without a body when dealing with a head call (it uses Context@stream behind the scenes)
- **feat**: Respond@redirect - will now adhere to responding without a body when dealing with a head call (it uses Context@end behind the scenes)

## [0.20.0] - 2024-04-11
### Fixed
- **bug**: (experimental) Context@stream - Ensure corked responses get used

## [0.19.0] - 2024-04-11
### Added
- **feat**: Types@ExtensionToMimeType - Extension to MimeType map

### Improved
- **feat**: Types@MimeTypes - Expand to include most commonly used formats
- **feat**: (experimental) Respond@file - Will now set Content-Type header for the file being responded with if found in the new Types@ExtensionToMimeType list
- **deps**: Upgrade typescript to 5.4.5

### Fixed
- **bug**: (experimental) Context@stream - Will now also set the response headers
- **bug**: (experimental) Context@stream - Will now call response end on stream buffer after last chunk is done if multiple chunks needed to be sent

## [0.18.0] - 2024-04-10
### Fixed
- **bug**: (experimental) Context@stream - Add safety check for this.#res.end being called already or not

## [0.17.0] - 2024-04-10
### Added
- **feat**: (experimental) Context@stream - Stream a readstream back to the receiver over the uws request
- **feat**: (experimental) Respond@file - File response

## [0.16.0] - 2024-04-10
### Added
- **feat**: Respond@status - Status-only response
- **feat**: Falcon@Validator - Exported import of @valkyriestudios/validator

### Removed
- **feat**: Middleware@ValidateBody - Better DX when working directly with a validator and its check. This allows for automated type casting

## [0.15.0] - 2024-04-10
### Improved
- **sys**: Make use of new type guards in valkyrie utils
- **sys**: Make use of new type guards in valkyrie validator
- **perf**: Make use of precompiled regex in Respond.redirect
- **deps**: Upgrade @types/node to 20.12.7
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.6.0
- **deps**: Upgrade @typescript-eslint/parser to 7.6.0
- **deps**: Upgrade @valkyriestudios/utils to 12.3.0
- **deps**: Upgrade @valkyriestudios/validator to 9.3.0

## [0.14.0] - 2024-04-07
### Improved
- **perf**: Replace unnecessary calls to Validator.rules.string in favor of typeof checks
- **deps**: Upgrade @types/node to 20.12.5
- **deps**: Upgrade @valkyriestudios/utils to 12.1.0
- **deps**: Upgrade @valkyriestudios/validator to 8.3.0
- **deps**: Upgrade typescript to 5.4.4

## [0.13.0] - 2024-04-03
### Improved
- **feat**: Middleware@ValidateBody - Now accepts a second parameters to provide additional data to the validator. This allows for constructions such as
```
Falcon.Middleware.ValidateBody({
    type: 'in:<types>',
    raw: 'object_ne',
}, {types: ['apple', 'pear']})
```
- **deps**: Upgrade @types/node to 20.12.3
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.5.0
- **deps**: Upgrade @typescript-eslint/parser to 7.5.0

## [0.12.0] - 2024-03-21
### Fixed
- **bug**: Contact - Issue where internal abort isnt handled correctly

## [0.11.0] - 2024-03-21
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 8.2.0
- **deps**: Upgrade @types/node to 20.11.30
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.3.1
- **deps**: Upgrade @typescript-eslint/parser to 7.3.1
- **deps**: Upgrade typescript to 5.4.3

## [0.10.0] - 2024-03-13
### Improved
- **deps**: Upgrade uWebSockets.js to 20.43.0
- **deps**: Upgrade @types/node to 20.11.27
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.2.0
- **deps**: Upgrade @typescript-eslint/parser to 7.2.0

## [0.9.0] - 2024-03-09
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 8.1.1

## [0.8.0] - 2024-03-08
### Improved
- **feat**: Respond@redirect now internally ensures original query string is retained by default when redirecting
- **feat**: Respond@redirect now allows passing an opts object which currently only contains one option 'keep_query'. If set to false this will strip any query string passed to the original url

## [0.7.0] - 2024-03-08
### Improved
- **deps**: Upgrade @valkyriestudios/utils to 12.0.0
- **deps**: Upgrade @valkyriestudios/validator to 8.0.0
- **deps**: Upgrade @types/node to 20.11.25
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.1.1
- **deps**: Upgrade @typescript-eslint/parser to 7.1.1
- **deps**: Upgrade typescript to 5.4.2

## [0.6.0] - 2024-03-04
### Added
- **feat**: Application - 'host' can now be passed as a configuration option when creating a new application. This is used for example when doing redirects to automatically prefix the host. If not provided we will use the 'host' header passed to a request.
- **feat**: Context@host - Getter on a context which either returns the app-wide configured host or the host header passed to a request
- **feat**: Respond@redirect - Redirect utility accepting a context, to and redirect status
- **feat**: Router@notfound - Ability to add a custom catch-all 404 not found response handler
- **feat**: Types@HttpRedirectStatuses - Enum containing the standard http redirect statuses 300, 301, 302, 303, 304, 307, 308

### Improved
- **feat**: An application will now by design add a 404 not found catch-all handler for any route that isn't found
- **feat**: Respond@json will now throw if called when the context is already locked
- **feat**: Respond@html will now throw if called when the context is already locked
- **deps**: Upgrade @valkyriestudios/utils to 11.7.0
- **deps**: Upgrade @valkyriestudios/validator to 7.10.0
- **deps**: Upgrade @types/node to 20.11.24
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.1.0
- **deps**: Upgrade @typescript-eslint/parser to 7.1.0

### Fixed
- **bug**: Types@HttpStatuses fix typo in enum key 'MultipleChoice' instead of 'MultipleChoide'

## [0.5.0] - 2024-02-26
### Improved
- **deps**: Upgrade @valkyriestudios/utils to 11.6.0
- **deps**: Upgrade @valkyriestudios/validator to 7.9.0
- **deps**: Upgrade uWebSockets.js to 20.42.0
- **deps**: Upgrade eslint to 8.57.0
- **deps**: Upgrade @types/node to 20.11.20

### Fixed
- **bug**: Context@abort now ensures a corked callback is used

## [0.4.0] - 2024-02-20
### Added
- **feat**: Falcon.Middleware.ValidateBody - Wrapper middleware for @valkyriestudios/validator in combination with a 400 Bad Request response

### Improved
- **feat**: Context reqBody is now flagged as unknown to allow for type casting
- **feat**: Respond@json response is now flagged as unknown type to allow for type casting
- **feat**: Routing allow '' as path on routes, this allows for example a Router to have a base path of '/user' and a post route with '' as path

### Breaking
- **sys**: Rename **Falcon.Middleware.ContextInitializer** to **Falcon.Middleware.ContextLoader** to be more accurate in naming

### Fixed
- **bug**: Context@init - Fix issue where is_initialized is not set to true during init, allowing for multiple init calls
- **bug**: Context@end - Fix issue where wrong order of status vs header writing caused a discrepancy with regards to correct status

## [0.3.2] - 2024-02-20
### Fixed
- **bug**: Router@mount will now ensure middleware and path gets handed down to sub routers

## [0.3.1] - 2024-02-20
### Fixed
- **bug**: Router@mount will now ensure is_mounted is set to true when Router.mount is called

## [0.3.0] - 2024-02-20
### Added
- **feat**: Application use/listen methods return Application instance and as such are chainable, eg: `new Application().use(...).listen(...)`
- **feat**: Application@close - Close the a listening application
- **feat**: Application@use - Now allows passing a Handler as well, on top of the previous Router support
- **feat**: Router use/get/post/put/patch/del methods return router instance and as such are chainable, eg: `new Router(...).use(...).get(...).post(...).post(...)`
- **feat**: Router@isMounted - Getters returning whether or not the router is already mounted to an application
- **feat**: Router@use - Add a router-wide handler or sub-router
- **feat**: Router@get - Add a HTTP GET route
- **feat**: Router@post - Add a HTTP POST route
- **feat**: Router@put - Add a HTTP PUT route
- **feat**: Router@patch - Add a HTTP PATCH route
- **feat**: Router@del - Add a HTTP DELETE route

### Improved
- **feat**: Application@use will now throw if a non-router is passed to it
- **feat**: Router route registration can now take one of 4 forms
-- Single Handler: eg: `instance.get('/hello', ctx => Respond.json({hello: 'world'}))`
-- Handler array: eg: `instance.get('/hello', [middleware1, middleware2, ctx => Respond.json({hello: 'world'})])`
-- Route config with single handler: eg: `instance.get('/hello', {fn: ctx => Respond.json({hello: 'world'})})`
-- Route config with handler array: eg: `instance.get('/hello', {fn: [middleware1, middleware2, ctx => Respond.json({hello: 'world'})]})`
- **feat**: Router - Trying to register a route after the router is mounted will now throw an error

### Breaking
- **feat**: Router configuration redesign (see added section)

## [0.2.1] - 2024-02-19
### Fixed
- **bug**: Fix issue where Application.js was set as main instead of new index.js

## [0.2.0] - 2024-02-19
### Added
- **feat**: index - import which allows for importing all of Falcon in one go under one namespace
- **feat**: mware/index - import which allows for importing all of Falcon's middleware in one go under one namespace
- **feat**: Application now has a 'debug' option which by default is turned on

### Improved
- Swap out usage of private for # assignment variables

## [0.1.0] - 2024-02-19
### Added
- **feat**: Application
- **feat**: Context
- **feat**: Respond@json - JSON response utility function
- **feat**: Respond@html - HTML response utility function
- **feat**: Router - Baseline implementation
- **feat**: mware - ContextInitializer
- **feat**: mware - SecurityHeaders
