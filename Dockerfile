# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Slivadoc Pet Owner — vinext (Vite + RSC) SSR site
#
# This file is intentionally identical across all five Sliva site repos
# (sliva-news, slivadoc-business, slivadoc-partners, slivadoc-vet,
# slivadoc-petowner); their build infrastructure is byte-identical. The only
# per-repo variance is the ARG block before the build command. This repo takes
# three optional build args for its API/realtime endpoints.
#
# Build:  docker build --platform=linux/amd64 -t ghcr.io/s-v2/slivadoc-petowner:latest .
# Run:    docker run --rm -p 3000:3000 ghcr.io/s-v2/slivadoc-petowner:latest
#
# ---------------------------------------------------------------------------
# WHY THIS SHAPE — every point below was verified against this repo, not assumed
# ---------------------------------------------------------------------------
# 1. scripts/install-ci.sh is BYPASSED; we call `npm ci` directly.
#    That script aborts unless HOME is exactly <root>/.sites-runtime/home and
#    `npm config get cache` matches <root>/.sites-runtime/npm-cache
#    (install-ci.sh:31-43), and it scans /proc for competing installers
#    (install-ci.sh:52-64). It also requires flock/timeout/curl/sha256sum
#    (install-ci.sh:10-25). All of that reimplements isolation a container
#    already provides, and none of it changes the resulting node_modules.
#
# 2. scripts/build-verified.sh is BYPASSED; we call `npx vinext build` directly.
#    It wraps the build in `timeout ${SITES_BUILD_TIMEOUT:-3m}`
#    (build-verified.sh:22-26). A cold RSC build on a shared-vCPU runner can
#    exceed 3 minutes, and the failure mode is a SIGTERM'd build, not a clear
#    error. It also refuses to run unless node_modules/.bin/vinext already
#    exists (build-verified.sh:15-19).
#
# 3. NODE_ENV is deliberately NOT set to production before `npm ci`.
#    vinext, vite, @vitejs/plugin-rsc and @cloudflare/vite-plugin are all
#    devDependencies (package.json "devDependencies"). `npm ci` under
#    NODE_ENV=production would skip them and the build could not run at all.
#
# 4. `npm ci` runs with --ignore-scripts, which closes the most common
#    supply-chain foothold in a build stage. Verified that the build still
#    succeeds: the only dependency here with a lifecycle script that matters is
#    workerd (package-lock: "hasInstallScript": true), and workerd is only
#    needed to *run* a Worker under `vite dev`/preview — never for `vite build`.
#    Measured against a scripts-enabled build of this repo: the emitted file LIST
#    is identical, and the only files whose bytes differ are dist/server/index.js,
#    dist/server/vinext-server.json and dist/server/ssr/vinext-server.json — which
#    are the exact same three files that differ between two builds run with
#    IDENTICAL flags, because vinext mints a random `prerenderSecret` per build.
#    So the flag has no observable effect on output. Corollary worth knowing: the
#    vinext build is NOT reproducible, so the same commit built twice yields
#    different image digests even though the app is the same.
#
# 5. The runtime does NOT run `vinext start`, and it must not.
#    `vinext start` goes through vinext's CLI, and dist/cli.js:12 statically
#    imports ./index.js — the Vite plugin — which imports "vite". In an image
#    that carries only the production payload this fails immediately:
#        Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite'
#        imported from /app/node_modules/vinext/dist/index.js
#    (reproduced in this exact base image). Keeping `vinext start` would mean
#    shipping the entire dev toolchain — 772 MB of node_modules — into runtime.
#
#    Instead server.mjs calls startProdServer() from "vinext/server/prod-server",
#    which is a declared PUBLIC entry in vinext's package.json "exports" map.
#    It is the very same function, with the same {port,host,outDir} arguments,
#    that `vinext start` itself invokes at dist/cli.js:301-309. It is a plain
#    node:http server (dist/server/prod-server.js:20, listen at :696-705) and it
#    already handles static assets from dist/client, compression, ETags,
#    /_vinext/image and 404s — so there is nothing to hand-write.
#
# 6. The runtime payload is dist/ + node_modules/vinext + node_modules/react.
#    The app's OWN built bundle externalizes only node builtins —
#    node:async_hooks, node:crypto and node:fs — and
#    dist/server/vinext-externals.json is `[]`, so react, react-dom and
#    react-server-dom-webpack are all BUNDLED into dist/.
#
#    node_modules/react is nonetheless required, for a reason that has nothing
#    to do with the app bundle: on vinext@1.0.0-beta.8 the prod server's own
#    dist imports react as a bare specifier (see the payload-collection step
#    below for the exact chain, the measurement, and how to re-derive it).
#    react has zero dependencies, so the payload stays ~9 MB and the image
#    ~247 MB. Consequently next (236 MB), @next (170 MB), @cloudflare+workerd
#    (165 MB), wrangler, typescript and vite never reach the runtime image.
#
#    WARNING: `vinext-externals.json` being `[]` is NOT sufficient evidence
#    that the payload is complete. It read `[]` for the build that
#    crash-looped in production, because the missing specifier lived in
#    vinext's dist rather than in the app bundle. Verify by BOOTING the image,
#    which .github/workflows/publish.yml now does before pushing.
#
# 7. Split base images. The BUILD stage stays on Debian (bookworm-slim) because
#    it genuinely resolves arch- AND libc-specific optional binaries — workerd,
#    lightningcss, esbuild/rolldown — and musl there invites trouble. The
#    RUNTIME stage is Alpine because, per note 6, its entire payload is pure
#    JavaScript with no .node and no .wasm anywhere under node_modules/vinext
#    or node_modules/react (react ships 24 .js files and nothing else), so it
#    has no glibc dependency at all. That saves roughly 100 MB per image.
#
# 8. tzdata is installed explicitly. Node 22 bundles full ICU, so
#    `new Date()`/Intl already resolve Asia/Jakarta on bare Alpine — but the
#    shell and every libc consumer fall back to UTC, which means container
#    `date` and log timestamps disagree with the application. Measured on bare
#    node:22-alpine: `date` -> "Thu Aug 27 08:11:32 UTC 2026" while Node printed
#    "GMT+0700 (Western Indonesia Time)". 1.4 MB buys a consistent clock.
#
# 9. server.mjs installs SIGTERM/SIGINT handlers, and that is not optional.
#    Linux gives PID 1 no default signal disposition, so a Node process running
#    as PID 1 with no registered handler simply IGNORES SIGTERM: `docker stop`
#    then blocks for its full grace period and SIGKILLs. Measured in this base
#    image: 10252 ms without handlers vs 149 ms with them. Because the fix lives
#    in the image, compose does NOT need `init: true` for these sites.
#
# ---------------------------------------------------------------------------
# ARCH SENSITIVITY
# ---------------------------------------------------------------------------
# The runtime payload is pure JavaScript and architecture-independent: there is
# no .node or .wasm file under node_modules/vinext or node_modules/react. Only
# the node base image layer is arch-specific, so the image must be *built* for
# the target (--platform=linux/amd64 for the x86_64 VM and for CI).
# The BUILD stage does resolve arch- and libc-specific optional binaries —
# workerd, lightningcss, esbuild/rolldown — but none of them are copied into
# runtime, which is exactly why the runtime may be Alpine while the build is
# not. Building on arm64 and on amd64 produces the same runtime JavaScript.
# ---------------------------------------------------------------------------

ARG NODE_BUILD_IMAGE=22-bookworm-slim
ARG NODE_RUNTIME_IMAGE=22-alpine

# ------------------------------- build stage -------------------------------
FROM node:${NODE_BUILD_IMAGE} AS build
WORKDIR /app

# Dependency layer, cached on the lockfile alone.
# No NODE_ENV here on purpose — see note 3. --ignore-scripts — see note 4.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY . .

# Vite inlines NEXT_PUBLIC_* into the client bundle at BUILD time, so these are
# build args, not runtime environment: changing one requires a rebuild. Setting
# them in `docker run`/compose has no effect on the client bundle.
# Read at app/lib/petowner-api.ts:3-4, app/lib/platform-api.ts:1 and
# app/components/platform/CareMarketplace.tsx:51 respectively.
# CI supplies them from the repository variables of the same names.
ARG NEXT_PUBLIC_PETOWNER_API_URL=""
ARG NEXT_PUBLIC_PLATFORM_API_URL=""
ARG NEXT_PUBLIC_REALTIME_URL=""

# Unset rather than pass an empty string. The app-side fallbacks use `??`, which
# does NOT treat "" as absent, so baking "" in would yield an empty base URL and
# silently break request paths. Unsetting lets each call site apply its own default.
# Written out one literal guard per variable: an earlier version looped with
# `eval "value=\${$var-}"`, which was safe (an assignment RHS is not re-parsed)
# but needlessly clever in a file others will edit under pressure.
RUN set -eu; \
    [ -n "${NEXT_PUBLIC_PETOWNER_API_URL:-}" ] || unset NEXT_PUBLIC_PETOWNER_API_URL; \
    [ -n "${NEXT_PUBLIC_PLATFORM_API_URL:-}" ] || unset NEXT_PUBLIC_PLATFORM_API_URL; \
    [ -n "${NEXT_PUBLIC_REALTIME_URL:-}" ]     || unset NEXT_PUBLIC_REALTIME_URL; \
    npx vinext build

# Collect the production payload: the build output plus the two packages the
# built server still needs to resolve at runtime.
#
# `react` is REQUIRED and must not be dropped. This repo runs
# vinext@1.0.0-beta.8 (the other four sites are still on 0.0.50, where this
# copy was genuinely unnecessary). On 1.0.0-beta.8 the eager static import
# closure of vinext/server/prod-server reaches react through
#
#   prod-server.js -> seed-cache -> app-page-cache -> app-page-cache-finalizer
#                  -> app-page-render-observation -> app-elements-wire
#
# and app-elements-wire.js imports "react" as a BARE specifier. react is a
# peerDependency of vinext, so npm hoists it to top-level node_modules/react
# and never nests it under node_modules/vinext — copying vinext alone can
# therefore never satisfy it. Omitting this line makes the container
# crash-loop at BOOT, before the listener binds, with
#
#   Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'react'
#   imported from /app/node_modules/vinext/dist/server/app-elements-wire.js
#
# It is measured, not guessed: react and react/jsx-runtime (a subpath of the
# same package) are the ONLY two bare specifiers in that 97-module closure,
# which contains zero dynamic bare imports. react@19.2.8 has zero
# dependencies, so this costs 252 KB and the image stays ~247 MB.
#
# react-dom is deliberately NOT copied: it is bundled into dist/ (the app's
# own dist/server/vinext-externals.json is `[]` and dist/server/index.js
# externalizes only node:async_hooks, node:crypto and node:fs), and it is not
# in the prod-server closure. Do not add it "to be safe" — that is how this
# file grew to 1.78 GB once already.
#
# RE-DERIVE THIS LIST WHENEVER vinext IS UPGRADED. The set is a property of
# vinext's own dist, not of this app, and a release may change which bare
# specifiers the prod server loads. To re-derive: walk the static+dynamic
# import closure of node_modules/vinext/dist/server/prod-server.js and list
# every specifier that is not relative and not node:-prefixed. Note that
# dist/server/vinext-externals.json being `[]` does NOT prove the payload is
# sufficient — it was `[]` for the crash-looping build too, because the gap
# was in vinext's dist rather than in the app bundle.
RUN set -eu; \
    mkdir -p /out/node_modules; \
    cp -R dist /out/dist; \
    cp -R node_modules/vinext /out/node_modules/vinext; \
    cp -R node_modules/react /out/node_modules/react

# Production entry point. Mirrors `vinext start` (dist/cli.js:291-310) but skips
# the CLI's build-time import graph.
COPY <<'ENTRY' /out/server.mjs
import { startProdServer } from "vinext/server/prod-server";

const { server } = await startProdServer({
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  outDir: new URL("./dist/", import.meta.url).pathname,
});

// PID 1 gets no default signal disposition on Linux, so without these handlers
// SIGTERM is ignored and `docker stop` waits out its full grace period before
// SIGKILL (measured: 10252 ms without, 149 ms with). Drain, then exit.
const shutdown = () => {
  server.close(() => process.exit(0));
  server.closeIdleConnections?.();
  setTimeout(() => process.exit(0), 3000).unref();
};

for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, shutdown);
ENTRY

# ------------------------------ runtime stage ------------------------------
FROM node:${NODE_RUNTIME_IMAGE} AS runtime

# Node's bundled ICU alone would leave the shell and libc on UTC — see note 8.
RUN apk add --no-cache tzdata

ENV NODE_ENV=production \
    TZ=Asia/Jakarta \
    PORT=3000

WORKDIR /app
COPY --from=build --chown=node:node /out ./

# The Alpine image ships the same unprivileged user as Debian: uid=1000(node),
# gid=1000(node), so --chown=node:node above resolves identically.
USER node
EXPOSE 3000

# No site in this family exposes a health endpoint, so probe GET / for a 200.
# The body is drained so the process cannot be held open by an unread socket.
#
# Cadence is deliberate. GET / on this stack is a real RSC render, not a static
# file, so the probe costs CPU. Measured on this image with --cpus 4 (matching the
# target VM): cold first request 52.9 ms, warm requests 4.5-14.6 ms (median ~7 ms).
# That is ~700x headroom under a 5s timeout, so the render is not the risk — an
# over-eager probe is. 60s granularity is ample liveness for a marketing site, and
# a 10s timeout leaves real headroom so a transient stall cannot flap a working
# container to unhealthy. Total cost across five sites: ~5 renders/min, ~35 ms CPU.
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(async r=>{await r.arrayBuffer();process.exit(r.status===200?0:1)}).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
