FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --ignore-scripts avoids the ERR_PNPM_IGNORED_BUILDS error from sharp in pnpm 11
RUN pnpm install --frozen-lockfile --ignore-scripts

# sharp is only needed for next/image optimization; images.unoptimized=true so we skip it
RUN pnpm rebuild sharp 2>/dev/null || true

COPY . .

RUN pnpm build

# ---- lightweight runner: no pnpm, no node_modules, just the standalone output ----
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
