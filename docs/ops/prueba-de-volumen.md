# Prueba de volumen de la base

Datos sintéticos en una base temporal (`matchwork_volume`, en el mismo Postgres local; ya borrada): 20 000 usuarios (2 500 empresas y 17 500 freelancers), 13 000 problemas (10 000 abiertos), 490 000 interacciones de freelancers, 100 000 propuestas, 10 000 matches, 80 000 interacciones de empresa y 300 000 mensajes. Medición con `EXPLAIN (ANALYZE, BUFFERS)` sobre el SQL de cada función y tiempo total de la llamada con `\timing`. Objetivo: feed y bandeja por debajo de 50 ms y sin escaneos secuenciales sobre tablas grandes.

## Resultado

| Consulta | Antes | Después |
|---|---|---|
| Feed del swipe (`list_open_business_problems`) | **153 ms y 9,3 MB** por llamada (10 000 problemas; escaneo secuencial paralelo y orden de todo el conjunto) | `list_open_problems_page`: **2–6 ms y 37 KB** por página de 40 (índice parcial `business_problems_open_feed_idx` + anti-unión con la clave primaria de interacciones, 0,16 ms de plan); siguiente página 3 ms |
| Explorar (20 problemas) | igual que el feed completo | 1,6 ms, 18 KB |
| Problemas guardados / propuestas enviadas | traían todo el catálogo abierto | `list_open_problems_by_ids` (máximo 100 por llamada): 0,5 ms |
| Bandeja de la empresa (propuestas de un problema) | 0,34 ms | sin cambios |
| Problemas de la empresa | 0,09 ms | sin cambios |
| Conversaciones (empresa con más matches) | 2,3 ms | sin cambios |
| No leídos (`unread_total`) | 0,6 ms | sin cambios |
| Mensajes de una conversación (50) | 0,14 ms | sin cambios |
| Interacciones del freelancer | 0,29 ms | sin cambios |
| Contadores públicos (`get_public_counters`) | 33–39 ms | sin cambios (dentro del objetivo) |
| Admin: resumen | 56 ms | sin cambios |
| Admin: usuarios, primera página / búsqueda | 11,7 ms / 11,3 ms | sin cambios |
| Admin: problemas con búsqueda | 9 ms | sin cambios |

La función antigua `list_open_business_problems` sigue existiendo pero ahora devuelve como máximo los 200 más recientes. La web ya no la usa: el mazo pide páginas de 40 sin los problemas ya decididos y pide la siguiente cuando quedan 8 tarjetas; Explorar usa «Cargar más problemas»; Likes y Propuestas piden solo los problemas que necesitan.

## Cambios (migración `20261104070000_paged_open_problems.sql`)

- Funciones `list_open_problems_page` (cursor por fecha de publicación e id, límite máximo 100, excluye lo ya decidido salvo que se pida) y `list_open_problems_by_ids`.
- Índice `business_problems_open_feed_idx (published_at desc, id desc) where status = 'open' and suspended_at is null`.
- Índice `freelancer_problem_interactions_problem_idx (problem_id)`: borrar o cerrar un problema comprobaba la clave foránea recorriendo las 490 000 interacciones.
- Pruebas: `supabase/tests/database/open_problems_page.test.sql` (14 pruebas), `e2e/paging.mjs` (95 problemas recorridos en 3 páginas sin duplicados) y tests de vitest del servicio.

## Lo que se vigila

- **Contadores públicos**: 33–39 ms con 20 000 usuarios y crecen en línea recta (cuentan con escaneos). Con unos 500 000 usuarios conviene guardarlos en una tabla de una fila que se refresque cada minuto.
- **Búsquedas de administración** (`like '%texto%'`): hoy ~10 ms. Si la tabla de usuarios supera los 200 000 filas, añadir índices `pg_trgm` sobre nombre y correo.
- La cola de verificación ya tiene índice (`company_verifications_queue_idx`).

## Cómo repetirla

Las instrucciones y los scripts SQL de generación y medición no se guardaron en el repositorio (eran de un solo uso, en la carpeta temporal de la sesión). Para repetirla: crear una base con el esquema de `supabase/migrations` y los esquemas `auth` y `extensions` (por ejemplo `pg_dump -s` de la base local), generar los datos con `generate_series` y medir con `EXPLAIN (ANALYZE, BUFFERS)` como usuario `authenticated` con `request.jwt.claims` fijado.
