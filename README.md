# MatchWork

MatchWork conecta problemas con propuestas de solución de profesionales independientes: primero se describe la necesidad y después se comparan distintos enfoques. Cuando una propuesta encaja y ambas partes quieren avanzar, hacen Match para continuar la conversación.

## Estado actual

La interfaz está en español y sigue la identidad visual aprobada de MatchWork: azul noche, morado, lavanda y superficies claras; Sora para encabezados, Inter para la interfaz y JetBrains Mono para datos. La landing pública está separada de la aplicación bajo `/app`. El Camino A guarda perfiles empresariales y problemas reales en Supabase; las secciones de propuestas y adjudicación siguen sin fuente de datos.

El registro, el inicio de sesión y la recuperación de contraseña usan Supabase Auth. PostgreSQL valida rol y propiedad con RLS y RPC. La interfaz de navegación del navegador no sustituye estos controles. No uses una service role key en el cliente.

## Desarrollo local

Requisitos: Node.js 22.13 o posterior y pnpm 11.19.0.

```bash
pnpm install
```

Crea `apps/web/.env.local` a partir de [`apps/web/.env.example`](apps/web/.env.example) y asigna la Project URL y publishable key de Supabase. Aplica la migración antes de registrar cuentas; consulta [configurar Supabase](docs/development/supabase-setup.md).

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`. También puedes ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` desde la raíz.

## Rutas

Públicas:

- `/`: landing.
- `/iniciar-sesion`: acceso con correo y contraseña.
- `/registro`: registro de empresa o freelancer.
- `/auth/callback`: confirmación de correo y recuperación segura de contraseña.

Privadas:

- `/app`: inicio según el tipo de cuenta.
- `/app/explorar`: problemas abiertos compartidos por empresas.
- `/app/problemas`: panel empresarial con estados y borradores reales.
- `/app/problemas/nuevo`: asistente empresarial de cinco pasos.
- `/app/problemas/detalle`: lectura propia y gestión de estados.
- `/app/perfil`: datos personales y perfil empresarial.
- `/app/propuestas`, `/app/guardados` y `/app/matches`: módulos pendientes de integrar con una fuente de datos.

Las antiguas rutas privadas redirigen al inicio de sesión o a su ruta canónica bajo `/app`. La ruta 404 sigue disponible públicamente.

Consulta [la visión del producto](docs/product/vision.md), el [sistema de identidad](docs/brand/matchwork-core-identity.md), la [arquitectura](docs/architecture/README.md) y las decisiones en `docs/decisions/`.
