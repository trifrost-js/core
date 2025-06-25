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

Whether you're deploying to Node.js, Bun or Cloudflare Workers, TriFrost provides a unified API and internal architecture that adapts to the runtime — without compromising on performance, developer experience, or clarity.

---

## ✨ Why TriFrost?
TriFrost is the result of deep experience across frameworks, runtimes, and production systems. It combines:

- 🧩 **Koa-like composability**: build with middleware that’s small, explicit, and powerful
- ⚡ **High performance**: thanks to tight internal control over routing, context, and async flows, how fast? [Take a look at a benchmark we did](https://www.trifrost.dev/news/blog/hello_world_benchmark_trifrost)
- 🌐 **Edge-native philosophy**: designed from the ground up to support Cloudflare Workers, and other emerging runtimes
- 🧠 **Observability-first design**: tracing is not an afterthought; it’s a core design concern with built-in support for structured telemetry

Unlike many frameworks, TriFrost doesn't bind itself to Node-specific APIs or assume a single deployment model. It’s truly runtime-flexible, letting you write code once and run it almost anywhere.

---

## 📦 Quickstart
TriFrost has a [creation cli](https://github.com/trifrost-js/create-trifrost) which is available through npm/bun create, just run:
```bash
# npm
npm create trifrost@latest

# bun
bun create trifrost@latest
```

And you'll be set up with a starter project in under a minute.

---

## 📦 From Scratch
Using your favorite package manager:

```bash
# bun
bun add @trifrost/core

# npm
npm install @trifrost/core

# pnpm
pnpm add @trifrost/core

# yarn
yarn add @trifrost/core
```

---

## 🧠 Core Principles
TriFrost is guided by a few key beliefs:

- **No magic. Ever.** You should be able to trace exactly how data flows and how handlers resolve.
- **Lean by default.** We ship zero dependencies that aren’t critical to the core behavior.
- **Typed end-to-end.** First-class TypeScript support with generics and inference deeply embedded.
- **Adaptable internals.** Routing, context, and state management are designed to be both composable and overridable.

---

## 🚀 Project Status
TriFrost is under active development as we build toward a solid `v1.0` milestone.

The internal architecture is already production-grade, but APIs may still evolve as we polish developer ergonomics, refine edge-case behaviors, and finalize DX across runtimes.

If you're early-adopting:
- We recommend pinning patch versions
- Feedback and PRs are very welcome
- Expect aggressive iteration

---

## 🔗 Resources
- 🧑‍💻 GitHub: [trifrost-js/core](https://github.com/trifrost-js/core)
- 📦 npm: [`@trifrost/core`](https://www.npmjs.com/package/@trifrost/core)
- 🌐 Website: [trifrost.dev](https://trifrost.dev)
- 💬 Discord: [Join the community](https://discord.gg/e9zTXmtBG8)

---

## 🤝 Contributing
Contributions are very welcome!

If you're looking to get involved:
- 📄 Check the [open issues](https://github.com/trifrost-js/core/issues) or [discussion threads](https://github.com/trifrost-js/core/discussions)
- 🧪 Run tests with `npm run test` or check coverage with `npm run test:coverage`
- 🔧 Code is written in modern TypeScript — **type safety and performance matter**

Whether it's a bug fix, new module, test case, or doc improvement — PRs are appreciated and reviewed quickly.

---

## 👤 Author
Created and maintained by [Peter Vermeulen](https://github.com/peterver)
