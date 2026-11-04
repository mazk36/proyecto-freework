# Copia de seguridad del código

El código tiene dos copias:

1. **GitHub (`mazk36/proyecto-freework`, repositorio público).** Desde el 2026-11-04 se suben allí las ramas de trabajo al cerrar cada bloque. Como el repositorio es público, antes de subir se escanea el contenido (claves privadas, tokens, JWT, archivos `.env`, bundles y archivos grandes). Nunca se hace `push` a `chore/project-scaffold` (dispara el despliegue del sitio actual en GitHub Pages), ni `force-push`, ni se tocan los workflows; `main` queda como está.
2. **Bundle local.** Una copia completa del repositorio (todas las ramas y etiquetas) con `git bundle`, un único archivo con todo el historial. Es la copia que no depende de GitHub.

## Crear la copia

Desde la raíz del repositorio:

```bash
mkdir -p ~/code-projects/_backups
git bundle create ~/code-projects/_backups/matchwork-$(date +%F).bundle --all
git bundle verify ~/code-projects/_backups/matchwork-$(date +%F).bundle
```

`verify` debe decir «The bundle records a complete history». Repite al cerrar cada bloque de trabajo y copia el archivo fuera del Mac (disco externo o almacenamiento privado cifrado).

## Restaurar

En otra carpeta o equipo:

```bash
git clone ~/code-projects/_backups/matchwork-2026-11-04.bundle matchwork-restaurado
cd matchwork-restaurado
git branch -a                      # solo la rama principal aparece como local; las demás son remotas del bundle
git checkout -b feat/journey-qa origin/feat/journey-qa
```

Para recuperar todas las ramas como locales: `for b in $(git branch -r | grep -v HEAD | sed 's#origin/##'); do git branch --track "$b" "origin/$b" 2>/dev/null; done`.

Para volver a conectarlo con GitHub: `git remote set-url origin <url del repositorio>` y sigue las reglas de arriba para subir.

## Qué no incluye

El bundle contiene solo lo versionado. No incluye `.env.local`, claves, datos de la base, archivos de Storage ni la carpeta del stack local. Esas copias se describen en `manual-de-operacion.md`.
