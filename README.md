# TriFrost

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Ftrifrost-js%2Fcore.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Ftrifrost-js%2Fcore?ref=badge_shield&issueType=license)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Ftrifrost-js%2Fcore.svg?type=shield&issueType=security)](https://app.fossa.com/projects/git%2Bgithub.com%2Ftrifrost-js%2Fcore?ref=badge_shield&issueType=security)
[![CodeCov](https://codecov.io/gh/trifrost-js/core/graph/badge.svg?token=WGGKOQH7MB)](https://codecov.io/gh/trifrost-js/core)
[![CI](https://github.com/trifrost-js/core/actions/workflows/ci.yml/badge.svg)](https://github.com/trifrost-js/core/actions/workflows/ci.yml)
[![CodeQL](https://github.com/trifrost-js/core/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/trifrost-js/core/actions/workflows/github-code-scanning/codeql)
[![npm](https://img.shields.io/npm/v/@trifrost/core.svg)](https://www.npmjs.com/package/@trifrost/core)
[![npm](https://img.shields.io/npm/dm/@trifrost/core.svg)](https://www.npmjs.com/package/@trifrost/core)

**TriFrost** is a blazing-fast, runtime-agnostic server framework built for the modern JavaScript ecosystem — from low-latency edge environments to traditional backend infrastructure.

Whether you're deploying to Node.js, Bun, or Cloudflare Workers, TriFrost provides a unified API and internal architecture that adapts to the runtime — without compromising on performance, developer experience, or clarity.

---

## ✨ Why TriFrost?
TriFrost is the result of deep experience across frameworks, runtimes, and production systems. It combines:

- 🧩 **Koa-like composability** – build with middleware that’s small, explicit, and powerful
- ⚡ **High performance** – with zero-cost abstractions and extremely efficient internals ([see benchmark](https://www.trifrost.dev/news/blog/hello_world_benchmark_trifrost))
- 🌐 **Edge-native** – designed from the ground up to support Workers, Bun, and other emerging runtimes
- 📊 **Observability-first** – tracing and structured logging are core to the architecture

Unlike many frameworks, TriFrost doesn't bind itself to Node-specific APIs or assume a single deployment model. It’s truly runtime-flexible, **write once, run anywhere**.

For a deeper read:
- [What is TriFrost](https://www.trifrost.dev/docs/what-is-trifrost)
- [Why TriFrost?](https://www.trifrost.dev/news/blog/why_trifrost_exists)

---

## 🚀 1.0.0 — Stable and Ready
TriFrost v1.0.0 marks the first **stable release**, with a production-ready core and a fully typed public API surface.

- ✅ Finalized runtime contract (Node, Bun, Workerd, Cloudflare)
- ✅ Stable context, routing, and middleware layers
- ✅ Full test coverage and CI/CD hardening
- ✅ Built-in logger with structured telemetry + OpenTelemetry support
- ✅ Clean internal design with runtime adaptation and zero runtime bloat
- ✅ JSX-native request handlers (opt-in, fully typed)

> If you've been waiting to try TriFrost in production — this is the version to start with.

> If you want to play games 🎮 check out [Atomic Arcade](https://arcade.trifrost.dev), a mini arcade powered by [TriFrost Atomic](https://www.trifrost.dev/docs/jsx-atomic)

---

## 📦 Quickstart
TriFrost has a [starter CLI](https://github.com/trifrost-js/create-trifrost) available via `npm create` / `bun create`:

```bash
# npm
npm create trifrost@latest

# bun
bun create trifrost@latest
```

It’ll scaffold a project in under 60 seconds with routing, logging, and runtime setup built-in.

View the [doc page for more info](https://www.trifrost.dev/docs/cli-quickstart).

---

## 📦 From Scratch
You can also start from first principles. See the [Hello World example](https://www.trifrost.dev/docs/hello-world-example) to build step-by-step with only the core package.

---

## 🧠 Core Principles
TriFrost is built on these foundations:
- 🧠 **No magic**: You should be able to trace exactly how requests are routed and handled
- 🧱 **Lean by default**: No unnecessary dependencies, no bloat
- 🧾 **Typed end-to-end**: Full TypeScript support with strong generics and inference
- 🧬 **Runtime-adaptable**: Internals are modular, composable, and runtime-aware

For a full view read [Core Principles](https://www.trifrost.dev/docs/core-principles).

---

## 🛠️ API Docs
Full documentation for core modules, types, and runtime behavior is available on [trifrost.dev/docs](https://www.trifrost.dev/docs)

---

## 🔗 Resources
- 🧑‍💻 GitHub: [trifrost-js/core](https://github.com/trifrost-js/core)
- 📦 npm: [@trifrost/core](https://www.npmjs.com/package/@trifrost/core)
- 🌐 Website: [trifrost.dev](https://trifrost.dev/)
- 🤖 CLI: [Creation CLI](https://github.com/trifrost-js/create-trifrost)
- 💬 Discord: [Join the community](https://discord.gg/e9zTXmtBG8)

---

## 🤝 Contributing
TriFrost is open to contributions and collaboration.
- 🛠️ See [open issues](https://github.com/trifrost-js/core/issues)
- 💬 Join [discussions](https://github.com/trifrost-js/core/discussions)
- 🧪 Run tests with `npm run test` or check coverage via `npm run test:coverage`

All code is modern TypeScript. **Performance and type safety are first-class concerns, and PRs are reviewed fast**.

---

## 👤 Authors
Created and maintained by:
- [Peter Vermeulen](https://github.com/peterver)

With love from the [Atomic](https://arcade.trifrost.dev) systems team.