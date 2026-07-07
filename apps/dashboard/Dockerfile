# MediaDeck dashboard — build from the REPO ROOT as context:
#   docker build -f apps/dashboard/Dockerfile -t mediadeck-dashboard .
# The built static app is served by nginx, which also proxies /api and /health to the
# orchestrator so the browser talks same-origin (no CORS, no build-time backend URL).
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_ORCH_URL=""
ENV VITE_ORCH_URL=$VITE_ORCH_URL
RUN pnpm turbo run build --filter=@mediadeck/dashboard

FROM nginx:alpine AS runtime
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
