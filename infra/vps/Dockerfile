# syntax=docker/dockerfile:1
# Matchwork web (export estático de Next.js) servido por Caddy.
# Contexto de build: la raíz del repositorio.

FROM node:26-alpine AS build
RUN npm install -g pnpm@11.19.0
WORKDIR /repo
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm install --frozen-lockfile && pnpm --filter ./apps/web build

# Precomprime los textos una sola vez (brotli máximo, zstd y gzip) para que
# Caddy sirva el .br/.zst/.gz sin gastar CPU por petición.
FROM alpine:3.22 AS compress
RUN apk add --no-cache brotli zstd gzip findutils
COPY --from=build /repo/apps/web/out /site
RUN find /site -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' -o -name '*.svg' -o -name '*.txt' -o -name '*.xml' -o -name '*.map' -o -name '*.webmanifest' \) \
      -size +256c -print0 \
  | xargs -0 -P4 -I{} sh -c 'brotli -q 11 -k -f "{}" && zstd -19 -q -k -f "{}" && gzip -9 -k -f "{}"'

FROM caddy:2.11.7-alpine
COPY infra/vps/Caddyfile /etc/caddy/Caddyfile
COPY --from=compress /site /srv
EXPOSE 80 443 443/udp
