"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  createPortfolioProject,
  deletePortfolioProject,
  removePortfolioCover,
  setPortfolioProjectVisibility,
  updatePortfolioProject,
  uploadPortfolioCover,
  type PortfolioProject,
} from "@/lib/profile-service";
import {
  PORTFOLIO_IMAGE_MAX_BYTES,
  parseProjectSkills,
  validateImageFile,
  validatePortfolioProject,
  type PortfolioProjectDraft,
} from "@/lib/profile-domain";

type Props = {
  userId: string;
  projects: PortfolioProject[];
  onChanged: () => Promise<void>;
};

const emptyProject: PortfolioProjectDraft = {
  title: "",
  description: "",
  category: "",
  projectPeriod: "",
  externalUrl: "",
  skillsUsed: "",
};

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-base text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";
const secondaryButtonClass = "border border-border bg-transparent text-foreground hover:bg-surface-raised";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No pudimos completar el cambio. Inténtalo de nuevo.";
}

function projectDraft(project: PortfolioProject): PortfolioProjectDraft {
  return {
    title: project.title,
    description: project.description ?? "",
    category: project.category ?? "",
    projectPeriod: project.project_period ?? "",
    externalUrl: project.external_url ?? "",
    skillsUsed: project.skills_used.join("\n"),
  };
}

export function PortfolioManager({ userId, projects, onChanged }: Props) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PortfolioProjectDraft>(emptyProject);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function openNewProject() {
    setDraft(emptyProject);
    setEditingId(null);
    setCoverFile(null);
    setError("");
    setNotice("");
    setIsEditorOpen(true);
  }

  function openEditProject(project: PortfolioProject) {
    setDraft(projectDraft(project));
    setEditingId(project.id);
    setCoverFile(null);
    setError("");
    setNotice("");
    setIsEditorOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const validationError = validatePortfolioProject(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const input = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      category: draft.category.trim() || null,
      project_period: draft.projectPeriod.trim() || null,
      external_url: draft.externalUrl.trim() || null,
      skills_used: parseProjectSkills(draft.skillsUsed).skills,
    };

    setIsSaving(true);
    try {
      let projectId = editingId;
      const previousCoverPath = editingId
        ? projects.find((project) => project.id === editingId)?.cover_image_path ?? null
        : null;

      if (editingId) {
        await updatePortfolioProject(userId, editingId, input);
      } else {
        const project = await createPortfolioProject(userId, input);
        projectId = project.id;
      }

      if (coverFile && projectId) {
        try {
          const result = await uploadPortfolioCover(userId, projectId, coverFile, previousCoverPath);
          if (result.cleanupWarning) setNotice("El proyecto se guardó. No pudimos retirar la imagen anterior; vuelve a intentarlo desde el mismo proyecto.");
        } catch (imageError) {
          await onChanged();
          setError(`El proyecto se guardó, pero no pudimos guardar su imagen. ${errorMessage(imageError)}`);
          return;
        }
      }

      await onChanged();
      setIsEditorOpen(false);
      setCoverFile(null);
      setNotice(editingId ? "Proyecto actualizado." : "Proyecto guardado como borrador.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVisibility(project: PortfolioProject) {
    setBusyProjectId(project.id);
    setError("");
    setNotice("");
    try {
      await setPortfolioProjectVisibility(userId, project.id, !project.is_published);
      await onChanged();
      setNotice(project.is_published ? "El proyecto quedó como borrador." : "El proyecto quedó publicado.");
    } catch (visibilityError) {
      setError(errorMessage(visibilityError));
    } finally {
      setBusyProjectId(null);
    }
  }

  async function handleCoverRemoval(project: PortfolioProject) {
    setBusyProjectId(project.id);
    setError("");
    setNotice("");
    try {
      await removePortfolioCover(userId, project.id, project.cover_image_path);
      await onChanged();
      setNotice("Imagen del proyecto eliminada.");
    } catch (removeError) {
      setError(errorMessage(removeError));
    } finally {
      setBusyProjectId(null);
    }
  }

  async function handleDelete(project: PortfolioProject) {
    setBusyProjectId(project.id);
    setError("");
    setNotice("");
    try {
      await deletePortfolioProject(userId, project);
      await onChanged();
      setConfirmDeleteId(null);
      setNotice("Proyecto eliminado.");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusyProjectId(null);
    }
  }

  function handleCoverChange(file: File | undefined) {
    setError("");
    setCoverFile(null);
    if (!file) return;
    const validationError = validateImageFile(file, PORTFOLIO_IMAGE_MAX_BYTES, "La imagen del proyecto");
    if (validationError) {
      setError(validationError);
      return;
    }
    setCoverFile(file);
  }

  return (
    <section aria-labelledby="portfolio-title" className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-soft">Experiencia aplicada</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight" id="portfolio-title">Portafolio</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Muestra trabajos reales y decide cuáles quieres publicar. Un proyecto solo aparece a visitantes cuando también haces público tu perfil.</p>
        </div>
        {!isEditorOpen ? <Button onClick={openNewProject}>Agregar proyecto</Button> : null}
      </div>

      {notice ? <p className="mt-4 text-sm text-emerald-300" role="status">{notice}</p> : null}
      {error ? <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200" role="alert">{error}</p> : null}

      {isEditorOpen ? (
        <form className="mt-6 space-y-5 border-t border-border pt-6" onSubmit={handleSave}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">{editingId ? "Editar proyecto" : "Nuevo proyecto"}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Los proyectos nuevos se guardan como borradores.</p>
            </div>
            <Button aria-label="Cerrar editor del proyecto" className="-mt-2" onClick={() => setIsEditorOpen(false)} variant="quiet">Cerrar</Button>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="portfolio-title-input">Título</label>
            <input autoComplete="off" className={inputClass} id="portfolio-title-input" maxLength={150} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required value={draft.title} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="portfolio-description">Descripción</label>
            <textarea className={`${inputClass} min-h-28 py-3`} id="portfolio-description" maxLength={3000} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={4} value={draft.description} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="portfolio-category">Área o especialidad</label>
              <input className={inputClass} id="portfolio-category" maxLength={100} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} value={draft.category} />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="portfolio-period">Periodo</label>
              <input className={inputClass} id="portfolio-period" maxLength={80} onChange={(event) => setDraft((current) => ({ ...current, projectPeriod: event.target.value }))} placeholder="Opcional" value={draft.projectPeriod} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="portfolio-skills">Habilidades utilizadas</label>
            <textarea className={`${inputClass} min-h-24 py-3`} id="portfolio-skills" maxLength={2200} onChange={(event) => setDraft((current) => ({ ...current, skillsUsed: event.target.value }))} placeholder="Una habilidad por línea" rows={3} value={draft.skillsUsed} />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Hasta 20 habilidades, máximo 100 caracteres cada una.</p>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="portfolio-url">Enlace del proyecto</label>
            <input autoComplete="url" className={inputClass} id="portfolio-url" maxLength={2048} onChange={(event) => setDraft((current) => ({ ...current, externalUrl: event.target.value }))} placeholder="https://…" type="url" value={draft.externalUrl} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="portfolio-cover">Imagen principal</label>
            <input accept="image/jpeg,image/png,image/webp" className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground" id="portfolio-cover" onChange={(event) => { handleCoverChange(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">JPEG, PNG o WebP. Máximo 5 MiB. Se almacena de forma privada; su acceso depende de publicar el proyecto y el perfil.</p>
            {coverFile ? <p className="mt-2 text-sm text-accent-soft" role="status">Imagen seleccionada: {coverFile.name}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={isSaving} type="submit">{isSaving ? "Guardando…" : "Guardar proyecto"}</Button>
            <Button className={secondaryButtonClass} disabled={isSaving} onClick={() => setIsEditorOpen(false)} variant="outline">Cancelar</Button>
          </div>
        </form>
      ) : null}

      {projects.length === 0 && !isEditorOpen ? (
        <div className="mt-6 rounded-xl border border-dashed border-border px-5 py-8 text-center">
          <p className="text-sm font-medium">Todavía no agregas proyectos</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Cuando guardes uno, podrás revisarlo y decidir si lo publicas.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <li className="overflow-hidden rounded-xl border border-border bg-background" key={project.id}>
              {project.image_url ? (
                <Image alt={`Imagen del proyecto ${project.title}`} className="h-44 w-full object-cover" height={360} src={project.image_url} unoptimized width={640} />
              ) : (
                <div aria-hidden="true" className="grid h-36 place-items-center border-b border-border bg-surface-raised text-xs text-muted-foreground">Sin imagen principal</div>
              )}
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="mr-auto min-w-0 text-base font-semibold">{project.title}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${project.is_published ? "bg-emerald-400/15 text-emerald-200" : "bg-surface-raised text-muted-foreground"}`}>
                    {project.is_published ? "Publicado" : "Borrador"}
                  </span>
                </div>
                {project.category ? <p className="mt-2 text-xs font-medium text-accent-soft">{project.category}</p> : null}
                {project.description ? <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{project.description}</p> : null}
                {project.skills_used.length ? <ul aria-label={`Habilidades utilizadas en ${project.title}`} className="mt-3 flex flex-wrap gap-1.5">{project.skills_used.map((skill) => <li className="rounded-full bg-surface-raised px-2.5 py-1 text-xs text-muted-foreground" key={skill}>{skill}</li>)}</ul> : null}
                {project.project_period ? <p className="mt-3 text-xs text-muted-foreground">{project.project_period}</p> : null}
                {project.external_url ? <a className="mt-3 inline-flex text-sm font-medium text-accent-soft underline decoration-accent/50 underline-offset-4" href={project.external_url} rel="noreferrer" target="_blank">Abrir enlace del proyecto</a> : null}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button className={secondaryButtonClass} disabled={busyProjectId === project.id} onClick={() => openEditProject(project)} size="sm" variant="outline">Editar</Button>
                  <Button className={secondaryButtonClass} disabled={busyProjectId === project.id} onClick={() => void handleVisibility(project)} size="sm" variant="outline">
                    {busyProjectId === project.id ? "Actualizando…" : project.is_published ? "Despublicar" : "Publicar"}
                  </Button>
                  {project.cover_image_path ? <Button className={secondaryButtonClass} disabled={busyProjectId === project.id} onClick={() => void handleCoverRemoval(project)} size="sm" variant="outline">Quitar imagen</Button> : null}
                  <Button className="text-rose-200 hover:bg-rose-400/10" disabled={busyProjectId === project.id} onClick={() => setConfirmDeleteId(project.id)} size="sm" variant="quiet">Eliminar</Button>
                </div>
                {confirmDeleteId === project.id ? (
                  <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-400/10 p-3" role="group" aria-label={`Confirmar eliminación de ${project.title}`}>
                    <p className="text-sm text-rose-100">¿Eliminar este proyecto y su imagen?</p>
                    <div className="mt-3 flex gap-2">
                      <Button className="bg-rose-700 text-white hover:bg-rose-600" disabled={busyProjectId === project.id} onClick={() => void handleDelete(project)} size="sm">Sí, eliminar</Button>
                      <Button className={secondaryButtonClass} disabled={busyProjectId === project.id} onClick={() => setConfirmDeleteId(null)} size="sm" variant="outline">Cancelar</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
