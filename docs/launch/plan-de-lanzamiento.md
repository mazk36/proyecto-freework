# Plan de lanzamiento

Estado: resumen del informe de estado de MatchWork con las decisiones de Frank del 2026-11-02.

## Decisiones de Frank (2026-11-02)

- Supabase autoalojado en el VPS (detalles del servidor aún no dados).
- Perú con PEN por defecto, también global con USD.
- Verificación de empresa simple desde el día 1.
- Panel admin mínimo, anti-spam y SEO: sí.
- NO por ahora: términos/privacidad, moderación/reportes, correo/notificaciones.
- Sin pagos.
- UI bonita, animada, profesional y 100 % responsive.
- Producto: las empresas publican un problema sin saber qué necesitan; los freelancers lo ven en un feed tipo swipe (derecha = me interesa, izquierda = no) y pueden proponer ahora o después desde su perfil; la empresa recibe propuestas completas; chat interno; la landing muestra en vivo propuestas/problemas abiertos, empresas y freelancers activos (siempre reales).

## Estado (≈30–35 % hecho)

Hecho: landing, auth (Supabase), perfil de empresa, asistente de 5 pasos para publicar problemas con borradores y estados, perfil de freelancer con portafolio y perfil público por slug, feed de problemas abiertos (`/app/explorar`), RLS/RPC con tests SQL (`company_problem_rls`, `profiles_portfolio_rls`), 35 tests de vitest.

Falta: propuestas, swipe, intereses/likes, matches, chat, métricas en vivo en la landing, explorar talento para empresas, verificación de empresa, admin, anti-spam, SEO y la infraestructura propia (hoy: export estático en GitHub Pages + Supabase cloud). `types/domain.ts` solo tiene moneda USD: PEN/USD debe soportarse en BD y UI (revisar qué ya cubren las migraciones y `problem-service`).

Existe contrato escrito para propuestas en `docs/architecture/company-proposals-integration.md` y el modelo en ADR-0002; `discovery.ts` ya tiene ranking y transiciones de estado puras con tests.

## Plan por fases

0. **Cimientos:** main estable, CI (lint + typecheck + vitest y tests SQL con Supabase local), `.env.example`, arreglar typecheck.
1. **Infra propia:** Supabase autoalojado en Docker, Caddy/Traefik con HTTPS, backups probados (`docs/backend/supabase-backup-restore.md`), pasar de `output: "export"` a Next con servidor (standalone + Dockerfile). Esperar datos del VPS antes de ejecutar; por ahora solo preparar Dockerfile y docker-compose de desarrollo.
2. **Propuestas:** tabla `proposals`, RPC transaccionales (crear, borrador, enviar, retirar), "Mis propuestas" (freelancer), bandeja y comparación hasta 3 + favoritos privados (empresa), tests RLS.
3. **Swipe + intereses:** tabla de interacciones (saved/dismissed/proposal_submitted), SwipeDeck, Likes.
4. **Match + chat:** match cuando la empresa muestra interés en una propuesta (`createMatchForInterestedProposal`), conversations/messages con RLS por match, Realtime, no leídos.
5. **Confianza:** verificación de empresa simple (pending/verified/rejected + chip "Empresa verificada"), rate limits y captcha (Turnstile), admin mínimo (verificar empresas, suspender usuarios/problemas).
6. **Landing viva + SEO:** RPC pública de contadores con caché ~60 s, sitemap, robots, OG, JSON-LD.
7. **Beta:** sembrar problemas reales, QA móvil, monitoreo.

Orden inmediato sugerido: (a) terminar Fase 0 (PR de CI + job de tests SQL), (b) Fase 2 backend en BD (migración + tests RLS), que no depende del VPS, (c) UI base del brief (sección 10, punto 1) y SwipeDeck, (d) Fase 3, (e) Fase 4.

Pendientes de decisión de Frank: nueva dependencia `motion`; publicar `main` y cambiar la rama por defecto; `deploy-pages.yml`.
