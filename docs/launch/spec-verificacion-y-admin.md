# Especificación: verificación de empresa y panel admin

Decisión de Frank (2026-11-04): las empresas sin verificar pueden crear borradores y publicar. Sus problemas muestran «Empresa sin verificar» y solo las aprobadas llevan el escudo «Empresa verificada». El modo estricto (exigir verificación antes de publicar) existe como un ajuste único, apagado por defecto, que un admin cambia sin migración. No cambies el ranking del feed según la verificación.

## 1. Comportamiento y datos (BD)

- Estados: sin solicitar, pendiente, verificada, rechazada. Solo cambian por RPC. La empresa envía o corrige su solicitud (sin solicitar, pendiente o rechazada pasan a pendiente). Solo un admin pasa a verificada o rechazada. Una empresa verificada no puede reenviar. El rechazo guarda un motivo corto (5 a 200 caracteres) visible para la empresa; al reenviar se limpia.
- Datos de la solicitud: razón social (obligatoria); país (el del perfil); identificación fiscal (obligatoria: RUC de 11 dígitos si el país es Perú, si no texto de 4 a 30 caracteres); al menos uno entre sitio web (https) y correo corporativo (no de un proveedor gratuito como gmail, hotmail, outlook, yahoo o icloud; lista corta en una constante con pruebas); LinkedIn de empresa opcional (solo enlaces de linkedin.com). Sin subir documentos. Valida el dígito verificador del RUC solo si estás seguro del algoritmo; si no, solo el formato.
- Privacidad: razón social e identificación fiscal las ven solo la propia empresa y los admins. El resto de usuarios recibe únicamente un booleano «verificada» (listados de problemas, propuestas, chat y landing).
- Admin: tabla `admins` sin acceso de clientes, función `is_admin()` y RPC solo para admins: listar solicitudes (por estado, más antiguas primero, paginado por cursor), verificar, rechazar con motivo, listar usuarios (búsqueda, rol, suspendidos), suspender o reactivar usuario con motivo, listar problemas (búsqueda, estado), suspender o reactivar problema con motivo, contadores del resumen, leer y cambiar ajustes. Cada acción de admin deja una fila en `admin_actions` (quién, qué, objetivo, motivo, fecha); sin interfaz por ahora.
- Suspensión: un usuario suspendido no puede publicar, proponer, hacer swipe ni escribir; ve un aviso con el motivo y puede cerrar sesión. Un problema suspendido sale del feed y de los contadores de la landing y no recibe propuestas. Los usuarios suspendidos tampoco cuentan en la landing. Haz la comprobación en el mismo punto donde ya llamas a `enforce_rate_limit`.
- Modo estricto: ajuste `require_company_verification_to_publish` (apagado por defecto). Encendido, publicar exige empresa verificada y devuelve un error identificable que la UI convierte en «Para publicar necesitas verificar tu empresa» con botón a la verificación. No afecta a los problemas ya publicados.
- Cuotas: añade a `rate_limit_policies` el envío de solicitud de verificación (valor inicial provisional de 5 por día, ajustable).
- Pruebas pgTAP: un no admin no puede llamar ninguna RPC admin ni ver `admins`; transiciones válidas e inválidas; datos fiscales invisibles para terceros; la suspensión bloquea cada escritura y oculta del feed y de la landing; modo estricto apagado y encendido; auditoría escrita.

## 2. UI de la empresa (perfil, /app/perfil, rol empresa)

- Tarjeta «Verificación de empresa» con chip de estado y una frase:
  - Sin solicitar: «Tu empresa aún no está verificada. Verifícala para mostrar el escudo «Empresa verificada» y generar más confianza.» y botón Verificar mi empresa.
  - Pendiente: «En revisión. Aquí verás el resultado.» y botón Editar solicitud.
  - Verificada: chip con escudo y fecha («Verificada el 12 nov 2026»); datos en solo lectura.
  - Rechazada: «No pudimos verificar tu empresa», el motivo y botón Corregir y reenviar.
- Formulario en BottomSheet en móvil y diálogo centrado desde 768 px. Campos con etiqueta, ayuda corta y error en línea al salir del campo; botón «Enviar solicitud» deshabilitado hasta que sea válido; estados enviando, éxito (toast «Solicitud enviada») y error; el límite de cuota usa el mensaje amable ya existente. Campos a 16 px, objetivos ≥ 44 px, el foco vuelve al botón que abrió el formulario.
- Si el modo estricto está encendido y la empresa intenta publicar sin verificar: aviso con botón directo a la verificación, nunca un error crudo.

## 3. Marca de confianza en todo el producto

- Componente CompanyTrustChip con dos variantes. «Empresa verificada»: escudo con check, color de acento o positivo de los tokens. «Empresa sin verificar»: neutro, superficie elevada y texto atenuado, ícono de información, nunca rojo ni de alarma. Esta última abre un popover accesible con el texto «MatchWork aún no ha revisado los datos de esta empresa. Usa tu criterio antes de compartir información.» (se abre con toque o teclado, no solo con hover).
- Dónde va: tarjeta del swipe y detalle del problema, Explorar, Likes, Mis propuestas, cabecera del hilo del chat y bandeja de la empresa. Siempre con texto además del ícono.

## 4. Panel admin (/app/admin)

- Acceso: el enlace «Admin» (ícono de escudo) aparece solo para admins, en la barra lateral en escritorio y en la cabecera junto a «Cerrar sesión» en móvil (la barra inferior ya tiene 5 ítems). Quien no es admin y entra por URL ve «No tienes acceso» sin datos. La seguridad real está en las RPC; la UI solo oculta.
- Estructura: título, 4 tarjetas de resumen (Empresas por verificar, Empresas verificadas, Problemas abiertos, Freelancers activos; las dos primeras filtran la pestaña Empresas) y pestañas con control segmentado sincronizado con la URL (?tab=): Empresas, Usuarios, Problemas, Ajustes.
- Empresas: filtros Pendientes (por defecto, con contador), Verificadas, Rechazadas y Todas. Escritorio: tabla semántica con Empresa (nombre y razón social), País, Identificación fiscal (con botón copiar), Web o correo, LinkedIn (enlace en pestaña nueva con rel="noopener noreferrer"), Enviada (fecha relativa), Estado y Acciones. Móvil: una tarjeta por solicitud con los mismos datos como lista de definiciones y dos botones a ancho completo (≥ 44 px). Verificar actúa al instante con toast «Empresa verificada · Deshacer» durante 8 s. Rechazar abre un diálogo con motivos rápidos («No pudimos validar la identificación fiscal», «Datos incompletos», «El sitio web no coincide», «Otro») y un texto obligatorio de 5 a 200 caracteres que verá la empresa. Orden: más antiguas primero. «Cargar más» con cursor. Vacío: «No hay solicitudes pendientes.»
- Usuarios: búsqueda por nombre o correo, filtros Todos, Empresas y Freelancers, y Activos o Suspendidos. Fila: nombre, rol, correo, alta, estado y acción Suspender o Reactivar. Suspender pide motivo y explica el efecto («No podrá publicar, proponer ni chatear»).
- Problemas: búsqueda por título o empresa, filtros Abiertos, Suspendidos y Cerrados. Fila: título, empresa con chip de confianza, presupuesto y moneda, fecha de publicación, número de propuestas, estado y acción Suspender o Reactivar con motivo.
- Ajustes: un interruptor «Exigir verificación para publicar» con diálogo de confirmación que explica el efecto («Las empresas sin verificar no podrán publicar problemas nuevos; los ya publicados siguen abiertos»).
- Todo con estados cargando (esqueletos), vacío, error con reintentar y éxito. Diálogos accesibles (foco atrapado, Esc cierra, el foco vuelve al origen). Acciones optimistas con vuelta atrás si fallan. Sin adornos: prioridad claridad y rapidez.

## 5. Calidad y orden de trabajo

- Mismos criterios de aceptación del brief: capturas en 360, 390, 768, 1280 y 1536; sin scroll horizontal; contraste AA; lint, typecheck, vitest y pgTAP en verde; funciones puras con pruebas (formato de RUC, estados, filtros).
- Ramas apiladas y separadas, con aviso al terminar cada una: feat/company-verification-db, feat/company-verification-ui (tarjeta y chips) y feat/admin-panel. Después, ajustar los contadores de la landing para excluir suspendidos y mostrar empresas verificadas si aplica.
- Si algo de esta especificación choca con el código real (nombres, rutas, componentes que ya existen), adapta y dímelo; no inventes requisitos nuevos.
