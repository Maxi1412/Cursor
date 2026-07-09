# MediaDeck scanner — build from the REPO ROOT as context:
#   docker build -f services/scanner/Dockerfile -t mediadeck-scanner .
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@mediadeck/scanner

FROM node:22-bookworm-slim AS runtime
RUN corepack enable
WORKDIR /app/services/scanner
COPY --from=build /app /app
ENV NODE_ENV=production
# Long-running: initial scan + scheduled cron. MEDIA_* env points at /data/media/* on the NAS.
CMD ["node", "dist/main.js"]
