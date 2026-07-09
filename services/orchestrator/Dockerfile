# MediaDeck orchestrator — build from the REPO ROOT as context:
#   docker build -f services/orchestrator/Dockerfile -t mediadeck-orchestrator .
# (.dockerignore keeps node_modules/dist/.env/data out of the build context.)
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# turbo builds @mediadeck/orchestrator and its workspace deps in dependency order.
RUN pnpm turbo run build --filter=@mediadeck/orchestrator

FROM node:22-bookworm-slim AS runtime
# ffmpeg/ffprobe for the corruption scan (spec §8).
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable
WORKDIR /app/services/orchestrator
COPY --from=build /app /app
ENV NODE_ENV=production ORCH_START=1
EXPOSE 4000
CMD ["node", "dist/server.js"]
