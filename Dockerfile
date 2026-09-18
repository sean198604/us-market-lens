FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS builder

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=7022 \
    CLOUDFLARE_CF_FETCH_ENABLED=false \
    WRANGLER_SEND_METRICS=false \
    WRANGLER_WRITE_LOGS=false

WORKDIR /app

# workerd validates outbound HTTPS against the operating-system trust store.
# The slim Node image does not include it, so public data APIs would fail TLS.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/dist ./dist

RUN mkdir -p /app/.sites-runtime /app/.wrangler/state \
    && chown -R node:node /app/.sites-runtime /app/.wrangler

USER node

EXPOSE 7022

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:7022/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["npm", "run", "start:docker"]
