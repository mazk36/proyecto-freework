# Manual de operación de Matchwork

Para quien administra la plataforma (no hace falta saber programar). Lo que depende del servidor de producción (copias, claves) se escribe para cuando exista el servidor propio; en local se puede probar igual.

## 1. Dar de alta a un administrador

Un administrador es una cuenta normal a la que se le da permiso extra. Verá un enlace «Administración» en el menú.

1. La persona se registra y confirma su correo como cualquier usuario.
2. Busca su identificador (uuid): en una consola SQL, `select id, email from auth.users where email = 'persona@ejemplo.com';`
3. Ejecuta `DB_URL=<conexión a la base> supabase/scripts/grant-admin.sh <uuid>`.
4. Que cierre sesión y vuelva a entrar. Para quitar el permiso: `delete from public.admins where user_id = '<uuid>';`

Todo lo que hace un administrador queda en el registro de acciones (`public.admin_actions`).

## 2. Verificar empresas

En **Administración → Empresas** aparecen las solicitudes pendientes.

- **Verificar**: la empresa recibe la etiqueta «Verificada». Si la empresa editó su solicitud mientras la revisabas, la app te avisa y debes recargar y revisar otra vez.
- **Rechazar**: obliga a escribir un motivo de 5 a 200 caracteres; la empresa lo verá y podrá corregir y reenviar.
- **Deshacer verificación**: disponible unos minutos después de verificar.
- Si una empresa cambia su nombre, vuelve a «Pendiente»; si cambia de país, queda rechazada con motivo. Es automático.

Qué mirar: que el RUC o identificación coincida con el nombre, que el sitio web o LinkedIn sean de la empresa y que el correo sea de su dominio si lo pides.

## 3. Modo estricto (publicar solo con empresa verificada)

Por defecto una empresa sin verificar puede publicar y su problema muestra «Empresa sin verificar». En **Administración → Ajustes** el interruptor «Exigir verificación para publicar» activa el modo estricto: nadie sin verificar puede publicar. Pide confirmación al activarlo. Las publicaciones ya abiertas no se cierran solas.

## 4. Cuotas (límites por usuario)

Evitan abusos. Se guardan en la tabla `rate_limit_policies` (acción, máximo de eventos y ventana en segundos). Valores iniciales:

| Acción | Máximo | Ventana |
|---|---|---|
| Enviar mensaje de chat | 30 | 1 minuto |
| Publicar problema | 20 | 24 h |
| Crear borrador de problema | 20 | 24 h |
| Enviar propuesta | 20 | 1 h |
| Crear borrador de propuesta | 20 | 1 h |
| Interacciones del freelancer (me interesa, descartar) | 600 | 1 h |
| Interacciones de la empresa | 300 | 1 h |
| Solicitudes de verificación | 5 | 24 h |
| Escrituras directas del perfil y portafolio | 600 | 1 h |

Para cambiarlas: `update public.rate_limit_policies set max_events = 40 where action = 'chat_send';` (surte efecto de inmediato). El usuario que llega al límite ve «Hiciste muchas acciones seguidas. Espera N segundos…». Los topes de cantidad (50 proyectos de portafolio, 50 habilidades, 20 archivos por proyecto) están fijos en la base.

## 5. Suspender cuentas y problemas

En **Administración → Usuarios** y **Problemas** se puede suspender con un motivo (obligatorio). Una cuenta suspendida puede entrar y leer pero no escribir; ve el motivo en un aviso. Reactivar también pide motivo. No se puede suspender a otro administrador.

## 6. Copias de seguridad y restauración

Qué respaldar: la base de datos (todo el negocio) y los archivos de Storage (avatares y portafolio).

**Base de datos** (a diario, y antes de cada cambio grande), desde el servidor:

```bash
pg_dump "$DB_URL" -Fc -f matchwork-$(date +%F).dump
```

Guarda el archivo fuera del servidor (almacenamiento externo, con retención de al menos 14 copias diarias y 8 semanales) y cifrado.

**Restaurar** (en una base vacía o de prueba primero):

```bash
createdb matchwork_restaurada
pg_restore --no-owner -d matchwork_restaurada matchwork-2026-11-04.dump
```

Para volver a producción: detener la web y la API, restaurar, arrancar y comprobar con una cuenta de prueba (entrar, ver el feed, abrir un chat).

**Archivos**: copiar la carpeta de datos de Storage del servidor (o el bucket si es S3) con la misma frecuencia.

**Prueba de restauración**: una vez al mes restaura la última copia en un entorno aparte y comprueba que cuentan los contadores públicos. Una copia que nunca se restauró no es una copia.

## 7. Rotación de claves

Rota de inmediato si una clave se filtró y, aunque no, cada 6 a 12 meses. Nunca pegues claves en el chat, el repositorio ni correos: van en el gestor de claves.

| Clave | Dónde está | Qué pasa al rotarla |
|---|---|---|
| Contraseña de la base (`postgres` y roles de servicio) | `.env` del servidor | Hay que reiniciar los servicios que se conectan a la base. |
| `JWT_SECRET` y claves `anon`/`service_role` (o publishable/secret) | `.env` del servidor y variables de la web | Todas las sesiones se cierran y hay que reconstruir la web con la nueva clave pública. Plan: ventana de mantenimiento corta. |
| Clave secreta de Turnstile | variable del servicio de Auth | Se cambia en Cloudflare y en el servidor; la clave pública de la web no cambia. |
| Clave SMTP o del proveedor de correo | variable del servicio de Auth | Enviar un correo de prueba (recuperar contraseña) tras el cambio. |
| Claves del proveedor de acceso (Google) | variables del servicio de Auth | Probar el inicio de sesión con Google. |

Después de rotar: comprobar registro, inicio de sesión, un correo y una subida de avatar.

## 8. Limpieza semanal

- Cuentas sin confirmar de más de 7 días: ver `limpieza-cuentas-sin-confirmar.md`.
- Revisar el registro `admin_actions` y las suspensiones activas.

## 9. Si algo falla

- Nadie recibe correos: revisar el proveedor SMTP y su cuota; probar «Reenviar correo» con una cuenta de prueba.
- Las fotos no suben: comprobar que Storage está activo y el espacio libre del disco.
- El chat no actualiza en vivo: reiniciar el servicio Realtime; la app muestra «tiempo real no disponible» y sigue funcionando con «Actualizar».
- La web carga lenta: comprobar que la compresión (brotli o gzip) está activa; sin ella la landing tarda el doble (ver `infra/vps/README.md`).
