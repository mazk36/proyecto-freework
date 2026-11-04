# syntax=docker/dockerfile:1
# MatchWork web (export estático de Next.js) servido por Caddy.
# Contexto de build: la raíz del repositorio.

FROM node:26-alpine AS build
RUN npm install -g pnpm@11.19.0
WORKDIR /repo
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_GOOGLE_AUTH_ENABLED
# 1 = build de release: falla si NEXT_PUBLIC_SITE_URL falta o apunta a localhost (la pila de producción lo activa por defecto).
ARG MATCHWORK_RELEASE=
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=$NEXT_PUBLIC_GOOGLE_AUTH_ENABLED \
    MATCHWORK_RELEASE=$MATCHWORK_RELEASE \
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
# Por defecto el Caddyfile de la prueba de un solo sitio; la pila de producción pasa infra/vps/prod/Caddyfile.
ARG CADDYFILE=infra/vps/Caddyfile
COPY ${CADDYFILE} /etc/caddy/Caddyfile
COPY --from=compress /site /srv
EXPOSE 80 443 443/udp
