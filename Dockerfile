# Multi-stage build for the Next.js dashboard (App Router, output: "standalone").
#
# Note: `skills/`, `context/`, and `outputs/` are read at runtime via fs (not
# imported as JS modules), so Next's standalone output tracing does NOT pick
# them up automatically — they're copied explicitly below. `context/` and
# `outputs/` are also bind-mounted by docker-compose.yml so writes made while
# the app is running (business profile edits, memory log entries, saved
# outputs) persist across container restarts/rebuilds instead of being lost.

FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs skills ./skills
COPY --chown=nextjs:nodejs context ./context
COPY --chown=nextjs:nodejs outputs ./outputs

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
