# Copia de seguridad del código

El código tiene dos copias:

1. **GitHub (`mazk36/proyecto-freework`, repositorio público).** Desde el 2026-11-05 todo el trabajo vive en `main` y se sube allí directamente: no se crean ramas nuevas (decisión de Frank). Antes de subir se escanea el contenido (claves privadas, tokens, JWT, archivos `.env`, bundles y archivos grandes). Flujo: commit en `main`, escaneo y `git push origin main` (si hace falta, `git pull --rebase` antes; nunca `--force`). Nunca se hace `push` a `chore/project-scaffold` (rama por defecto del repositorio; su push dispara el despliegue del sitio actual en GitHub Pages, que es de otros colaboradores), ni se tocan los workflows.
2. **Bundle local.** Una copia completa del repositorio (todas las ramas y etiquetas) con `git bundle`, un único archivo con todo el historial. Es la copia que no depende de GitHub. Ya no hay ramas de trabajo: el bundle contiene `main` y la rama por defecto del repositorio.

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
git clone ~/code-projects/_backups/matchwork-AAAA-MM-DD.bundle matchwork-restaurado
cd matchwork-restaurado
git branch -a                      # main como rama local; el resto, si hay, son remotas del bundle
```

Para volver a conectarlo con GitHub: `git remote set-url origin <url del repositorio>` y sigue las reglas de arriba para subir.

## Qué no incluye

El bundle contiene solo lo versionado. No incluye `.env.local`, claves, datos de la base, archivos de Storage ni la carpeta del stack local. Esas copias se describen en `manual-de-operacion.md`.
