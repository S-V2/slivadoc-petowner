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
# 6. The runtime carries the FULL resolved node_modules, not a cherry-picked subset.
#    An earlier revision copied only dist/ plus node_modules/vinext, on the evidence
#    that the built server externalised just node:async_hooks and two vinext
#    specifiers while react/react-dom were bundled. That was a true observation
#    about vinext 0.0.50 and a false assumption about vinext in general. When
#    slivadoc-petowner moved to vinext 1.0.0-beta.8, prod-server's own import graph
#    began
#    reaching dist/server/app-elements-wire.js, which imports `react` as a bare
#    specifier, and the container crash-looped at BOOT:
#        Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'react'
#        imported from /app/node_modules/vinext/dist/server/app-elements-wire.js
#    That took pet.slivadoc.xyz to HTTP 502 in production. Every site in this family
#    shares this Dockerfile and is one version bump from the same failure, so the fix
#    is applied to all five rather than only to the site that broke.
#
#    vinext/dist contains 115 bare `react` imports, 68 `vite`, plus next/*,
#    react-dom/*, @vinext/* and more. Which of those a given release loads at
#    runtime is vinext's business and can change in any version bump, so any
#    hand-maintained copy list is a tripwire, not a fix. Adding react and
#    react-dom would only move it. The runtime therefore gets exactly what
#    `npm ci` resolved — the same tree the code was built and linked against.
#
# 7. Single base image for both stages, and that is a consequence of note 6.
#    A previous revision ran the runtime on node:22-alpine to save ~100 MB,
#    justified by the payload being pure JavaScript. Once the whole node_modules
#    ships, that premise is gone: the tree contains glibc-linked native binaries
#    (workerd, esbuild/rolldown, lightningcss) resolved for the build platform.
#    Putting those under musl would be a latent failure of exactly the class this
#    revision exists to remove. Correctness over image size: both stages are
#    node:22-bookworm-slim, so the runtime libc matches what npm resolved.
#    A principled way to shrink this again is vinext's own `output: "standalone"`
#    mode, which emits a traced, self-contained server — worth evaluating
#    deliberately, not during an incident.
#
# 8. Debian ships tzdata, so TZ=Asia/Jakarta resolves for both Node and the shell
#    without an extra package. (On Alpine it did not: Node's bundled ICU was
#    correct but `date` fell back to UTC, which is why the Alpine revision had to
#    apk add tzdata.)
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
# The runtime now ships the resolved node_modules, which includes arch- and
# libc-specific optional binaries (workerd, lightningcss, esbuild/rolldown).
# The image is therefore genuinely platform-bound and MUST be built for its
# target: --platform=linux/amd64 for the x86_64 VM and for CI. Both stages share
# one base, so the libc the binaries were resolved against is the libc they run
# on.
# ---------------------------------------------------------------------------

# One base for both stages — see note 7.
ARG NODE_IMAGE=22-bookworm-slim

# ------------------------------- build stage -------------------------------
FROM node:${NODE_IMAGE} AS build
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

# Production entry point. Mirrors `vinext start` (dist/cli.js:291-310) but skips
# the CLI's build-time import graph.
COPY <<'ENTRY' /app/server.mjs
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
FROM node:${NODE_IMAGE} AS runtime

ENV NODE_ENV=production \
    TZ=Asia/Jakarta \
    PORT=3000

WORKDIR /app

# Exactly what `npm ci` resolved, so the runtime graph can never reference a
# package the image lacks — see note 6.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/server.mjs ./server.mjs

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
