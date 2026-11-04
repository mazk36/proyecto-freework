# Despliegue en el VPS (paso a paso del día real)

Todo lo de esta página ya se probó en el Mac con la misma pila (`infra/vps/prod/`): Supabase autoalojado (Postgres, Auth, REST, Realtime, Storage, Kong) con versiones fijadas, la web estática y Caddy delante. El día del VPS solo cambian los dominios, los puertos (80/443), el correo real y las claves.

## Qué probé en local (y cómo repetirlo)

| Prueba | Resultado |
|---|---|
| Levantar todo desde cero (`scripts/deploy.sh`) | Pila sana y migraciones aplicadas en ~30 s (la primera vez, más: construye la web) |
| `scripts/healthcheck.sh` | contenedores sanos, web 200 con brotli, Auth/REST/Storage por Kong, API sin clave = 401, Realtime publica mensajes, Postgres sin puerto publicado |
| e2e contra esta pila con claves nuevas y confirmación de correo ACTIVA (Mailpit como SMTP): recorrido completo, seguridad, correo, cuenta, almacenamiento, tiempo real, WebKit, paginación y rendimiento | todos en verde (journey 104/104, correo 43/43, seguridad 49/49, almacenamiento 22/22, cuenta 14/14, tiempo real 10/10, motores 25/25, paginación 4/4, rendimiento 12/12) |
| Copia → borrar volúmenes → desplegar de cero → restaurar | Mismos conteos de usuarios, problemas, propuestas, mensajes y archivos; permisos (ACL) y publicación de Realtime intactos; un usuario restaurado inicia sesión |
| Actualización con una migración nueva | `migrate.sh` detecta la pendiente, la aplica una vez y no repite nada al volver a ejecutarlo; una función nueva responde por la API tras avisar a PostgREST |

Repetirlo en el Mac:

```bash
cd infra/vps/prod
scripts/generate-secrets.sh        # crea .env con claves nuevas (no se sube a git)
scripts/deploy.sh                  # construye, levanta, migra y comprueba
. ruta/a/variables-e2e.sh          # ver apps/web/e2e/README.md («Contra la pila de producción»)
node apps/web/e2e/journey.mjs
scripts/backup.sh && scripts/restore.sh backups/daily/<dump> backups/daily/<tar.gz> --si
docker compose --profile mailpit down      # (-v borra también los datos)
```

## Qué hace cada uno

### Lo que tiene que hacer Frank (yo no puedo)

1. **Crear el VPS** (proveedor, región y plan; recomiendo mínimo 4 vCPU, 8 GB de RAM y 80 GB de SSD con Ubuntu 24.04 LTS) y darme su IP.
2. **Darme acceso por SSH**: un usuario con `sudo` y mi clave pública (nunca contraseñas ni claves privadas por chat). Yo no me conecto hasta que él lo apruebe expresamente.
3. **Dominio y DNS**: decidir el dominio y crear los registros `A` (y `AAAA` si hay IPv6) para la web (por ejemplo `app.<dominio>`) y la API (`api.<dominio>`) apuntando a la IP del VPS. Si usa Cloudflare, decidir si va con el proxy naranja (CDN) o solo DNS.
4. **Correo saliente**: abrir cuenta en un proveedor SMTP (Resend, Postmark, SES…), verificar el dominio añadiendo los registros SPF, DKIM y DMARC que le indique, y darme el servidor, el puerto, el usuario y el remitente (la clave se guarda en el servidor, no en el chat).
5. **Cloudflare Turnstile** (captcha): crear el sitio en su cuenta de Cloudflare y darme la clave pública (la privada la pone él en el servidor o me la pasa por el baúl).
6. **Copias**: decidir dónde se guardan (recomiendo un bucket S3-compatible privado, por ejemplo Cloudflare R2 o Backblaze B2, con otra cuenta distinta del VPS) y crear sus credenciales.
7. **Google** (opcional, apagado por defecto): cliente OAuth en Google Cloud según `docs/security/auth-produccion.md`; antes hay que decidir la pantalla «Empresa o freelancer».
8. **Quién recibe alertas** (correo o WhatsApp) cuando algo falle.
9. **Decidir cómo llega el código al servidor**: hoy el repositorio vive solo en el Mac y el repositorio de GitHub es público; ver «Pendiente de decisión» abajo.

### Lo que hago yo (cuando él lo apruebe)

1. **Preparar el servidor**: actualizar, instalar Docker y Compose, crear un usuario sin privilegios para la app, activar el firewall (`ufw`: 22, 80, 443 TCP y 443 UDP), `fail2ban`, actualizaciones automáticas de seguridad y un archivo de intercambio (swap) de 2 GB. SSH solo con llave y sin acceso de `root` por contraseña.
2. **Subir el código** al servidor por el medio que él decida y comprobarlo con `git bundle verify` si va por paquete.
3. **Generar las claves en el servidor** (`scripts/generate-secrets.sh`): no pasan por mi Mac ni por el chat. Guardo una copia cifrada para Frank.
4. **Rellenar `.env`**: `WEB_HOST`, `API_HOST`, `SITE_URL`, `API_URL`, `URI_ALLOW_LIST`, `BIND_ADDRESS=0.0.0.0`, `HTTP_PORT=80`, `HTTPS_PORT=443`, `CADDY_TLS=` y `CADDY_GLOBAL_OPTIONS=` vacíos (certificados automáticos de Let's Encrypt), `SMTP_*`, `CAPTCHA_ENABLED=true` con `TURNSTILE_*`, y quitar `mailpit` (poner un `SMTP_HOST` real; el perfil `mailpit` solo se usa en pruebas).
5. **Desplegar** (`scripts/deploy.sh`) y comprobar con `scripts/healthcheck.sh` y, desde mi Mac, el e2e de seguridad y de correo contra el dominio real con cuentas de prueba (que luego se borran).
6. **Crear el primer administrador** (`docs/ops/manual-de-operacion.md`, sección 1).
7. **Programar las copias**: `0 3 * * * /ruta/infra/vps/prod/scripts/backup.sh` (con `BACKUP_S3_URL` si hay bucket) y una prueba de restauración mensual en un entorno aparte.
8. **Vigilancia mínima**: `scripts/healthcheck.sh` cada 5 minutos con aviso a quien Frank indique, y rotación de logs (ya configurada: 3 archivos de 10 MB por servicio).
9. **Pasar a producción**: bajar el TTL del DNS el día anterior, apuntar los registros al VPS y comprobar el certificado y el correo.

## Pasos del día, en orden

1. (Frank) VPS, dominio y registros DNS, cuenta SMTP, Turnstile, bucket de copias.
2. (Yo) Preparar el servidor y subir el código.
3. (Yo) `scripts/generate-secrets.sh`, completar `.env`, `scripts/deploy.sh`.
4. (Yo) Esperar a que el certificado se emita (Caddy lo hace solo en el primer acceso; el DNS debe estar propagado).
5. (Yo) Correr `scripts/healthcheck.sh` y las pruebas contra el dominio real.
6. (Yo + Frank) Crear el administrador, registrar una empresa y un freelancer de prueba, ver llegar los correos reales a sus bandejas (no a spam).
7. (Yo) Cron de copias y vigilancia.
8. (Frank) Dar el visto bueno para abrir al público.

## Actualizar después

```bash
git pull          # o el medio acordado
cd infra/vps/prod
scripts/backup.sh       # siempre antes de actualizar
scripts/deploy.sh       # reconstruye la web, aplica solo las migraciones nuevas y comprueba
```

Si algo sale mal: `scripts/restore.sh <copia> --si` devuelve la base y los archivos al estado de la copia (ver el manual de operación).

## Detalles de seguridad ya resueltos en la pila

- Postgres **no publica ningún puerto**; solo se entra con `docker compose exec db psql`.
- Studio y pg_meta no están incluidos; Mailpit solo existe con el perfil `mailpit` (pruebas).
- Kong exige la clave en Auth, REST y Realtime; Storage valida el JWT por su cuenta; Caddy añade HSTS, CSP, nosniff y compresión (brotli, zstd, gzip).
- Cada servicio con límite de memoria, reinicio automático, healthcheck y rotación de logs.
- Las claves se generan con `openssl` en el servidor, el `.env` queda con permisos 600 y está en `.gitignore`.

## Pendiente de decisión

- **Cómo llega el código al VPS.** El repositorio `mazk36/proyecto-freework` es público y las ramas de trabajo no están allí. Opciones: un repositorio privado nuevo en la cuenta de Frank (recomendado: permite `git pull` y es copia de seguridad), enviar un `git bundle` por SCP (sin servicio externo), o construir la imagen en el Mac y subirla. Hasta que decida no se sube nada.
- **Dónde se guardan las copias** (recomiendo S3-compatible externo, ver arriba).
- **Cloudflare por delante o DNS directo** (con proxy, brotli y caché los da el borde y se puede cerrar el acceso directo al VPS).
- **Google**: pantalla de tipo de cuenta antes de encenderlo.

## Datos que faltan (resumen para pedirlos de una vez)

1. Proveedor, plan, región e IP del VPS.
2. Usuario SSH y llave pública autorizada.
3. Dominio, dónde están sus DNS y si va Cloudflare por delante.
4. SMTP: proveedor, servidor, puerto, usuario, remitente y acceso a su DNS para SPF/DKIM/DMARC.
5. Clave pública de Turnstile (y la privada en un canal seguro).
6. Bucket S3-compatible para copias, su endpoint y credenciales (por canal seguro).
7. Contacto para alertas.
8. Decisión sobre cómo se sube el código.
9. Si se mantiene GitHub Pages como pruebas o se retira.
