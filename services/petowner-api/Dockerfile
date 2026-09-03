# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Slivadoc Pet Owner API — plain Node ESM, Express 5 + socket.io
#
# Build context is THIS directory, not the repo root:
#   docker build --platform=linux/amd64 \
#     -t ghcr.io/s-v2/slivadoc-petowner-api:latest ./services/petowner-api
#   docker run --rm -p 8090:8090 \
#     ghcr.io/s-v2/slivadoc-petowner-api:latest
#
# ---------------------------------------------------------------------------
# NOTES — verified against this service, not assumed
# ---------------------------------------------------------------------------
# * No build step. package.json:11 is `"start": "node src/index.js"`; there is
#   no bundler and no TypeScript. `"type": "module"` (package.json:5) so the
#   sources run as ESM directly.
# * `npm ci --omit=dev` is safe and complete here: package.json declares only
#   `dependencies` and no `devDependencies` at all. Tests use the built-in
#   `node --test` runner, so nothing extra is needed even for CI.
# * knowledge/ is MANDATORY, not optional data. src/pet-agent.js:6-7 resolves
#   ../knowledge/pet-care.json and JSON.parses it with a TOP-LEVEL await at
#   module load, so the process cannot start if that file is missing.
# * Listens on 8090 (src/index.js:17 `Number(process.env.PORT || 8090)`,
#   server.listen at :197). socket.io is attached to the SAME node:http server
#   (src/index.js:27-28), so realtime and REST share this one port — do not try
#   to expose a second one.
# * Community and SlivaCare chat state is persisted by slivadoc-backend in
#   PostgreSQL. This gateway is stateless and may run with multiple replicas.
# * Degrades gracefully with no third-party credentials, which is why the
#   healthcheck can be trusted at boot: /health (src/index.js:58) is a static
#   JSON response with no dependency on Cloudinary or OpenAI. Uploads return
#   503 cloudinary_not_configured (:69-71) and the assistant is gated on
#   OPENAI_API_KEY (:110), but the process still starts and serves.
#
# * `npm ci` runs with --ignore-scripts to close the usual supply-chain foothold.
#   Verified: none of the nine runtime dependencies (cloudinary, cors, dotenv,
#   express, express-rate-limit, helmet, multer, socket.io, zod) has a lifecycle
#   script the service needs, and the container still boots and serves /health.
# * Split base images. The deps stage stays on Debian (bookworm-slim) so npm
#   resolves against glibc; the runtime is Alpine because every dependency here
#   is pure JavaScript, which saves roughly 100 MB per image. `npm ci` is run
#   in the deps stage and the resulting node_modules is pure JS, so it is
#   portable across the two libcs.
# * tzdata is installed explicitly. Node 22 bundles full ICU so `new Date()`
#   already resolves Asia/Jakarta on bare Alpine, but the shell and every libc
#   consumer fall back to UTC. Measured on bare node:22-alpine: `date` printed
#   "Thu Aug 27 08:11:32 UTC 2026" while Node printed "GMT+0700". 1.4 MB buys a
#   consistent clock between the app and its own log lines.
# * tini is the ENTRYPOINT, and that is not cosmetic. Linux gives PID 1 no
#   default signal disposition, so `node src/index.js` as PID 1 IGNORES SIGTERM
#   and `docker stop` blocks for its whole grace period before SIGKILL —
#   measured at 10252 ms versus 149 ms once the signal is actually delivered.
#   The five site images fix this inside their own generated entrypoint, but
#   this service's entry is application source I am not modifying, so tini runs
#   as PID 1 and reaps/forwards instead. Consequence: compose does NOT need
#   `init: true` for this service.
#
# Runtime environment (all optional; defaults in src/index.js):
#   PORT=8090  CORS_ORIGINS  SLIVADOC_API_URL
#   CLOUDINARY_CLOUD_NAME  CLOUDINARY_API_KEY  CLOUDINARY_API_SECRET
#   CLOUDINARY_FOLDER      OPENAI_API_KEY      OPENAI_MODEL
#   NOMINATIM_BASE_URL     NOMINATIM_USER_AGENT
# CORS_ORIGINS is appended to a hardcoded localhost allowlist (src/index.js:18-19),
# so every deployed web origin must be added there or browsers get 403.
#
# ---------------------------------------------------------------------------
# ARCH SENSITIVITY
# ---------------------------------------------------------------------------
# None in the application: all dependencies are pure JavaScript, which is what
# makes the Debian-build / Alpine-runtime split safe here. Only the base image
# layers are arch-specific, so build with --platform=linux/amd64 for the
# x86_64 VM and CI.
# ---------------------------------------------------------------------------

ARG NODE_BUILD_IMAGE=22-bookworm-slim
ARG NODE_RUNTIME_IMAGE=22-alpine

# ------------------------------ deps stage ---------------------------------
FROM node:${NODE_BUILD_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts

# ----------------------------- runtime stage -------------------------------
FROM node:${NODE_RUNTIME_IMAGE} AS runtime

# tzdata: consistent clock for shell/libc as well as Node. tini: real PID 1.
# apk upgrade plus dropping npm/npx/corepack (unused at runtime; `CMD` is
# `node src/index.js`) closes the HIGH/CRITICAL findings trivy reports in the
# Alpine node image even with ignore-unfixed.
RUN apk update && apk upgrade --no-cache && apk add --no-cache tzdata tini \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

ENV NODE_ENV=production \
    TZ=Asia/Jakarta \
    PORT=8090

WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node knowledge ./knowledge

USER node
EXPOSE 8090

# /health is a static JSON response, so this is a true liveness signal and does
# not depend on any external credential. Body is drained so the probe exits.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8090)+'/health').then(async r=>{const b=await r.json();process.exit(r.status===200&&b.status==='ok'?0:1)}).catch(()=>process.exit(1))"

# tini as PID 1 so SIGTERM is actually delivered to node — see the note above.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
