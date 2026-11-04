# VPS: web estática + Caddy (Fase 1, solo local)

Sirve el export estático de `apps/web` con Caddy 2.11.7. No hay despliegue: todo corre en Docker local con puertos alternativos (HTTPS 8443 TCP/UDP).

## Levantar

Desde la raíz del repo (las variables `NEXT_PUBLIC_*` deben estar exportadas al construir; sin ellas la web se compila sin Supabase):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave publicable> \
docker compose -f infra/vps/docker-compose.dev.yml up --build -d
```

Abrir `https://localhost:8443` (certificado interno de Caddy: el navegador avisará en dev). Parar con `docker compose -f infra/vps/docker-compose.dev.yml down`.

## Qué incluye

- `Dockerfile`: build del export, precompresión (brotli q11, zstd 19, gzip 9) y Caddy como imagen final.
- `Caddyfile`: `precompressed br zstd gzip`, HTTP/1.1, HTTP/2 y HTTP/3, caché `immutable` de un año en `/_next/static/` y `/optimized/`, `no-cache` en HTML, cabeceras de seguridad (HSTS, CSP, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP).
- `docker-compose.dev.yml`: puertos `127.0.0.1:8443`, variables `SITE_ADDRESS`, `CSP_CONNECT`, `CADDY_GLOBAL_OPTIONS`.
- `medir-compresion.sh`: tabla de `Content-Encoding`, bytes y versión HTTP por ruta.

## Notas

- La compresión es requisito de producción: sin ella la landing tarda ~2x en LCP (ver QA de rendimiento). En CDN, activar brotli en el borde.
- Caddy 2.10.2 devolvía `206` en archivos precomprimidos; se fija 2.11.7.
- `CSP_CONNECT` debe listar la URL pública de Supabase (https y wss) al desplegar.
- En producción: `SITE_ADDRESS=<dominio>`, `CADDY_TLS` vacío (ACME automático) y sin `CADDY_GLOBAL_OPTIONS`.
- HTTP/3 está activo (UDP 443 y `Alt-Svc`), pero no se comprobó con un cliente QUIC real en esta máquina.
