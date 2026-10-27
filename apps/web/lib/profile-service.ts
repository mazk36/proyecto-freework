import type { Database } from "@/types/database";
import { AVATAR_MAX_BYTES, getImageExtension, PORTFOLIO_IMAGE_MAX_BYTES, validateImageFile } from "@/lib/profile-domain";
import { getSupabaseClient } from "@/lib/supabase/client";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type FreelancerProfileRow = Database["public"]["Tables"]["freelancer_profiles"]["Row"];
type FreelancerSkillRow = Database["public"]["Tables"]["freelancer_skills"]["Row"];
type SkillRow = Database["public"]["Tables"]["skills"]["Row"];
type PortfolioProjectRow = Database["public"]["Tables"]["portfolio_projects"]["Row"];

export type ProfileSkill = Pick<FreelancerSkillRow, "id" | "skill_id" | "custom_name"> & {
  name: string;
  category: string | null;
};

export type PortfolioProject = PortfolioProjectRow & { image_url: string | null };

export type FreelancerProfileData = {
  profile: Pick<ProfileRow, "id" | "account_type" | "display_name" | "slug" | "avatar_path" | "is_public">;
  details: FreelancerProfileRow;
  skills: ProfileSkill[];
  skillCatalog: Pick<SkillRow, "id" | "name" | "category">[];
  projects: PortfolioProject[];
  avatarUrl: string | null;
};

export type PublicFreelancerProfile = Omit<FreelancerProfileData, "skillCatalog">;

export type FreelancerProfileSaveInput = {
  displayName: string;
  headline: string;
  bio: string;
  locationText: string;
  yearsExperience: number | null;
  websiteUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  availabilityStatus: string;
};

export type PortfolioProjectInput = {
  title: string;
  description: string | null;
  category: string | null;
  project_period: string | null;
  external_url: string | null;
  skills_used: string[];
};

type SupabaseError = { code?: string; message?: string };

function getClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase no está configurado. Revisa las variables de la aplicación.");
  return client;
}

function operationError(error: SupabaseError, action: string): Error {
  if (error.code === "42501") return new Error("Tu sesión no tiene permiso para realizar este cambio.");
  if (error.code === "23505") return new Error("Ya existe un registro con esos datos. Revisa si está repetido.");
  if (error.code === "23514" || error.code === "22023") return new Error("Algún dato no cumple el formato o la longitud permitidos.");
  if (error.code === "PGRST116") return new Error("No encontramos el registro solicitado. Actualiza la página e inténtalo otra vez.");
  return new Error(`No pudimos ${action}. Inténtalo de nuevo.`);
}

async function requireAccountSession(expectedUserId: string, expectedRole: "company" | "freelancer") {
  const client = getClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user || authData.user.id !== expectedUserId) {
    throw new Error("La sesión expiró o cambió. Inicia sesión de nuevo.");
  }

  const { data: account, error: accountError } = await client
    .from("app_users")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (accountError || !account) throw new Error("No pudimos validar el tipo de cuenta en MatchWork.");
  if (account.role !== expectedRole) {
    throw new Error(expectedRole === "company"
      ? "Esta sección está disponible para cuentas de empresa."
      : "Esta sección está disponible para cuentas freelancer.");
  }
  return client;
}

async function requireFreelancerSession(expectedUserId: string) {
  return requireAccountSession(expectedUserId, "freelancer");
}

function getAvatarUrl(client: ReturnType<typeof getClient>, path: string | null): string | null {
  if (!path) return null;
  return client.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

async function getProjectImageUrl(
  client: ReturnType<typeof getClient>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await client.storage.from("portfolio-media").createSignedUrl(path, 300);
  return error ? null : data.signedUrl;
}

async function withSignedProjectImages(
  client: ReturnType<typeof getClient>,
  projects: PortfolioProjectRow[],
): Promise<PortfolioProject[]> {
  return Promise.all(projects.map(async (project) => ({
    ...project,
    image_url: await getProjectImageUrl(client, project.cover_image_path),
  })));
}

function failIfError(error: SupabaseError | null, action: string): void {
  if (error) throw operationError(error, action);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function loadMyFreelancerProfile(userId: string): Promise<FreelancerProfileData> {
  const client = await requireFreelancerSession(userId);
  const { error: ensureError } = await client.rpc("ensure_my_profile");
  failIfError(ensureError, "preparar tu perfil");

  const [profileResult, detailsResult, skillsResult, catalogResult, projectsResult] = await Promise.all([
    client.from("profiles")
      .select("id, account_type, display_name, slug, avatar_path, is_public")
      .eq("id", userId)
      .maybeSingle(),
    client.from("freelancer_profiles")
      .select("user_id, headline, bio, location_text, years_experience, website_url, linkedin_url, github_url, availability_status, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    client.from("freelancer_skills")
      .select("id, freelancer_user_id, skill_id, custom_name, created_at")
      .eq("freelancer_user_id", userId)
      .order("created_at", { ascending: true }),
    client.from("skills")
      .select("id, name, category")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    client.from("portfolio_projects")
      .select("id, freelancer_user_id, title, description, category, project_period, external_url, skills_used, cover_image_path, sort_order, is_published, created_at, updated_at")
      .eq("freelancer_user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  failIfError(profileResult.error, "cargar tu perfil");
  failIfError(detailsResult.error, "cargar tu información profesional");
  failIfError(skillsResult.error, "cargar tus habilidades");
  failIfError(catalogResult.error, "cargar el catálogo de habilidades");
  failIfError(projectsResult.error, "cargar tu portafolio");
  if (!profileResult.data || !detailsResult.data) {
    throw new Error("No encontramos los datos de tu perfil. Cierra sesión y vuelve a ingresar.");
  }
  if (profileResult.data.account_type !== "freelancer") {
    throw new Error("El tipo de cuenta no permite editar un perfil profesional.");
  }

  const skillCatalog = catalogResult.data ?? [];
  const catalogById = new Map(skillCatalog.map((skill) => [skill.id, skill]));
  const skills: ProfileSkill[] = (skillsResult.data ?? []).map((skill) => {
    const catalogSkill = skill.skill_id ? catalogById.get(skill.skill_id) : undefined;
    return {
      id: skill.id,
      skill_id: skill.skill_id,
      custom_name: skill.custom_name,
      name: skill.custom_name ?? catalogSkill?.name ?? "Habilidad de catálogo",
      category: catalogSkill?.category ?? null,
    };
  });

  return {
    profile: profileResult.data,
    details: detailsResult.data,
    skills,
    skillCatalog,
    projects: await withSignedProjectImages(client, projectsResult.data ?? []),
    avatarUrl: getAvatarUrl(client, profileResult.data.avatar_path),
  };
}

export async function loadPublicFreelancerProfile(slug: string): Promise<PublicFreelancerProfile | null> {
  const client = getClient();
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, account_type, display_name, slug, avatar_path, is_public")
    .eq("slug", normalizedSlug)
    .eq("is_public", true)
    .maybeSingle();
  failIfError(profileError, "buscar este perfil público");
  if (!profile || profile.account_type !== "freelancer") return null;

  const [detailsResult, skillsResult, catalogResult, projectsResult] = await Promise.all([
    client.from("freelancer_profiles")
      .select("user_id, headline, bio, location_text, years_experience, website_url, linkedin_url, github_url, availability_status, created_at, updated_at")
      .eq("user_id", profile.id)
      .maybeSingle(),
    client.from("freelancer_skills")
      .select("id, freelancer_user_id, skill_id, custom_name, created_at")
      .eq("freelancer_user_id", profile.id)
      .order("created_at", { ascending: true }),
    client.from("skills")
      .select("id, name, category")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    client.from("portfolio_projects")
      .select("id, freelancer_user_id, title, description, category, project_period, external_url, skills_used, cover_image_path, sort_order, is_published, created_at, updated_at")
      .eq("freelancer_user_id", profile.id)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  failIfError(detailsResult.error, "cargar los datos profesionales públicos");
  failIfError(skillsResult.error, "cargar las habilidades públicas");
  failIfError(catalogResult.error, "cargar las habilidades públicas");
  failIfError(projectsResult.error, "cargar el portafolio público");
  if (!detailsResult.data) return null;

  const catalogById = new Map((catalogResult.data ?? []).map((skill) => [skill.id, skill]));
  const skills: ProfileSkill[] = (skillsResult.data ?? []).map((skill) => {
    const catalogSkill = skill.skill_id ? catalogById.get(skill.skill_id) : undefined;
    return {
      id: skill.id,
      skill_id: skill.skill_id,
      custom_name: skill.custom_name,
      name: skill.custom_name ?? catalogSkill?.name ?? "Habilidad",
      category: catalogSkill?.category ?? null,
    };
  });

  return {
    profile,
    details: detailsResult.data,
    skills,
    projects: await withSignedProjectImages(client, projectsResult.data ?? []),
    avatarUrl: getAvatarUrl(client, profile.avatar_path),
  };
}

export async function saveFreelancerProfile(
  userId: string,
  input: FreelancerProfileSaveInput,
): Promise<void> {
  const client = await requireFreelancerSession(userId);
  const { error: profileError } = await client.rpc("save_my_profile", {
    p_profile: { display_name: input.displayName.trim() },
  });
  failIfError(profileError, "guardar tu nombre público");

  const { data: details, error: detailsError } = await client.from("freelancer_profiles").update({
    headline: input.headline.trim() || null,
    bio: input.bio.trim() || null,
    location_text: input.locationText.trim() || null,
    years_experience: input.yearsExperience,
    website_url: input.websiteUrl.trim() || null,
    linkedin_url: input.linkedinUrl.trim() || null,
    github_url: input.githubUrl.trim() || null,
    availability_status: input.availabilityStatus.trim() || null,
  }).eq("user_id", userId).select("user_id").maybeSingle();
  if (detailsError || !details) {
    throw new Error("El nombre público se guardó, pero no pudimos guardar el resto de la información. Revisa la conexión e inténtalo otra vez.");
  }
}

export async function setProfileVisibility(userId: string, isPublic: boolean): Promise<void> {
  const client = await requireFreelancerSession(userId);
  const { error } = await client.rpc("save_my_profile", { p_profile: { is_public: isPublic } });
  failIfError(error, isPublic ? "publicar tu perfil" : "retirar tu perfil público");
}

export async function addFreelancerSkill(
  userId: string,
  skill: { skillId: string | null; customName: string | null },
): Promise<void> {
  const client = await requireFreelancerSession(userId);
  const { error } = await client.from("freelancer_skills").insert({
    freelancer_user_id: userId,
    skill_id: skill.skillId,
    custom_name: skill.customName,
  });
  failIfError(error, "agregar la habilidad");
}

export async function removeFreelancerSkill(userId: string, skillId: string): Promise<void> {
  const client = await requireFreelancerSession(userId);
  const { data, error } = await client.from("freelancer_skills")
    .delete()
    .eq("id", skillId)
    .eq("freelancer_user_id", userId)
    .select("id")
    .maybeSingle();
  failIfError(error, "eliminar la habilidad");
  if (!data) throw new Error("No encontramos esa habilidad en tu perfil.");
}

export async function uploadAvatar(
  userId: string,
  file: File,
  oldPath: string | null,
): Promise<{ path: string; url: string; cleanupWarning: boolean }> {
  const client = await requireFreelancerSession(userId);
  const validationError = validateImageFile(file, AVATAR_MAX_BYTES, "La fotografía");
  if (validationError) throw new Error(validationError);
  const extension = getImageExtension(file.type);
  if (!extension) throw new Error("El formato de la fotografía no es compatible.");

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw operationError(uploadError, "subir la fotografía");

  const { error: profileError } = await client.rpc("save_my_profile", {
    p_profile: { avatar_path: path },
  });
  if (profileError) {
    await client.storage.from("avatars").remove([path]);
    throw operationError(profileError, "guardar la fotografía en el perfil");
  }

  let cleanupWarning = false;
  if (oldPath && oldPath !== path) {
    const { error } = await client.storage.from("avatars").remove([oldPath]);
    cleanupWarning = Boolean(error);
  }
  return { path, url: getAvatarUrl(client, path) ?? "", cleanupWarning };
}

export async function removeAvatar(
  userId: string,
  path: string | null,
): Promise<{ cleanupWarning: boolean }> {
  const client = await requireFreelancerSession(userId);
  const { error } = await client.rpc("save_my_profile", { p_profile: { avatar_path: null } });
  failIfError(error, "quitar la fotografía del perfil");
  if (!path) return { cleanupWarning: false };
  const { error: removeError } = await client.storage.from("avatars").remove([path]);
  return { cleanupWarning: Boolean(removeError) };
}

export async function loadMyCompanyLogo(userId: string): Promise<{ path: string | null; url: string | null }> {
  const client = await requireAccountSession(userId, "company");
  const { data, error } = await client.rpc("ensure_my_profile");
  failIfError(error, "cargar el logotipo de la empresa");
  if (!isRecord(data) || data.id !== userId || data.account_type !== "company") {
    throw new Error("No encontramos el perfil de empresa de esta cuenta.");
  }
  const path = typeof data.avatar_path === "string" ? data.avatar_path : null;
  return { path, url: getAvatarUrl(client, path) };
}

export async function uploadCompanyLogo(
  userId: string,
  file: File,
  oldPath: string | null,
): Promise<{ path: string; url: string; cleanupWarning: boolean }> {
  const client = await requireAccountSession(userId, "company");
  const validationError = validateImageFile(file, AVATAR_MAX_BYTES, "El logotipo");
  if (validationError) throw new Error(validationError);
  const extension = getImageExtension(file.type);
  if (!extension) throw new Error("El formato del logotipo no es compatible.");

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw operationError(uploadError, "subir el logotipo");

  const { error: profileError } = await client.rpc("save_my_profile", {
    p_profile: { avatar_path: path },
  });
  if (profileError) {
    await client.storage.from("avatars").remove([path]);
    throw operationError(profileError, "guardar el logotipo en el perfil de empresa");
  }

  let cleanupWarning = false;
  if (oldPath && oldPath !== path) {
    const { error } = await client.storage.from("avatars").remove([oldPath]);
    cleanupWarning = Boolean(error);
  }
  return { path, url: getAvatarUrl(client, path) ?? "", cleanupWarning };
}

export async function removeCompanyLogo(
  userId: string,
  path: string | null,
): Promise<{ cleanupWarning: boolean }> {
  const client = await requireAccountSession(userId, "company");
  const { error } = await client.rpc("save_my_profile", { p_profile: { avatar_path: null } });
  failIfError(error, "quitar el logotipo de la empresa");
  if (!path || !path.startsWith(`${userId}/`)) return { cleanupWarning: false };
  const { error: removeError } = await client.storage.from("avatars").remove([path]);
  return { cleanupWarning: Boolean(removeError) };
}

export async function createPortfolioProject(
  userId: string,
  input: PortfolioProjectInput,
): Promise<PortfolioProjectRow> {
  const client = await requireFreelancerSession(userId);
  const { data, error } = await client.from("portfolio_projects").insert({
    freelancer_user_id: userId,
    title: input.title.trim(),
    description: input.description,
    category: input.category,
    project_period: input.project_period,
    external_url: input.external_url,
    skills_used: input.skills_used,
    is_published: false,
  }).select("*").single();
  if (error) throw operationError(error, "crear el proyecto");
  return data;
}

export async function updatePortfolioProject(
  userId: string,
  projectId: string,
  input: PortfolioProjectInput,
): Promise<void> {
  const client = await requireFreelancerSession(userId);
  const { data, error } = await client.from("portfolio_projects").update({
    title: input.title.trim(),
    description: input.description,
    category: input.category,
    project_period: input.project_period,
    external_url: input.external_url,
    skills_used: input.skills_used,
  }).eq("id", projectId).eq("freelancer_user_id", userId).select("id").maybeSingle();
  failIfError(error, "guardar el proyecto");
  if (!data) throw new Error("No encontramos el proyecto que intentas editar.");
}

export async function setPortfolioProjectVisibility(
  userId: string,
  projectId: string,
  isPublished: boolean,
): Promise<void> {
  const client = await requireFreelancerSession(userId);
  const { data, error } = await client.from("portfolio_projects")
    .update({ is_published: isPublished })
    .eq("id", projectId)
    .eq("freelancer_user_id", userId)
    .select("id")
    .maybeSingle();
  failIfError(error, "cambiar la publicación del proyecto");
  if (!data) throw new Error("No encontramos el proyecto que intentas actualizar.");
}

export async function uploadPortfolioCover(
  userId: string,
  projectId: string,
  file: File,
  oldPath: string | null,
): Promise<{ path: string; cleanupWarning: boolean }> {
  const client = await requireFreelancerSession(userId);
  const validationError = validateImageFile(file, PORTFOLIO_IMAGE_MAX_BYTES, "La imagen del proyecto");
  if (validationError) throw new Error(validationError);
  const extension = getImageExtension(file.type);
  if (!extension) throw new Error("El formato de la imagen del proyecto no es compatible.");

  const path = `${userId}/${projectId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("portfolio-media").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw operationError(uploadError, "subir la imagen del proyecto");

  const { data: updatedProject, error: updateError } = await client.from("portfolio_projects")
    .update({ cover_image_path: path })
    .eq("id", projectId)
    .eq("freelancer_user_id", userId)
    .select("id")
    .maybeSingle();
  if (updateError || !updatedProject) {
    await client.storage.from("portfolio-media").remove([path]);
    if (updateError) throw operationError(updateError, "guardar la imagen del proyecto");
    throw new Error("No encontramos el proyecto al guardar su imagen.");
  }

  let cleanupWarning = false;
  if (oldPath && oldPath !== path) {
    const { error } = await client.storage.from("portfolio-media").remove([oldPath]);
    cleanupWarning = Boolean(error);
    const { error: metadataError } = await client.from("portfolio_media")
      .delete()
      .eq("project_id", projectId)
      .eq("storage_path", oldPath);
    cleanupWarning ||= Boolean(metadataError);
  }
  return { path, cleanupWarning };
}

export async function removePortfolioCover(
  userId: string,
  projectId: string,
  path: string | null,
): Promise<{ cleanupWarning: boolean }> {
  const client = await requireFreelancerSession(userId);
  if (path) {
    const { error: removeError } = await client.storage.from("portfolio-media").remove([path]);
    if (removeError) throw operationError(removeError, "eliminar la imagen del proyecto");
  }
  if (path) {
    const { error: metadataError } = await client.from("portfolio_media")
      .delete()
      .eq("project_id", projectId)
      .eq("storage_path", path);
    failIfError(metadataError, "retirar los datos de la imagen");
  }
  const { data, error } = await client.from("portfolio_projects")
    .update({ cover_image_path: null })
    .eq("id", projectId)
    .eq("freelancer_user_id", userId)
    .select("id")
    .maybeSingle();
  failIfError(error, "quitar la imagen del proyecto");
  if (!data) throw new Error("No encontramos el proyecto al quitar su imagen.");
  return { cleanupWarning: false };
}

export async function deletePortfolioProject(
  userId: string,
  project: Pick<PortfolioProjectRow, "id" | "cover_image_path">,
): Promise<void> {
  const client = await requireFreelancerSession(userId);
  const { data: media, error: mediaError } = await client.from("portfolio_media")
    .select("storage_path")
    .eq("project_id", project.id);
  failIfError(mediaError, "consultar las imágenes del proyecto");
  const paths = [...new Set([
    project.cover_image_path,
    ...(media ?? []).map((item) => item.storage_path),
  ].filter((path): path is string => Boolean(path)))];
  if (paths.length) {
    const { error: removeError } = await client.storage.from("portfolio-media").remove(paths);
    if (removeError) throw operationError(removeError, "eliminar las imágenes del proyecto");
  }
  const { data, error } = await client.from("portfolio_projects")
    .delete()
    .eq("id", project.id)
    .eq("freelancer_user_id", userId)
    .select("id")
    .maybeSingle();
  failIfError(error, "eliminar el proyecto");
  if (!data) throw new Error("No encontramos el proyecto que intentas eliminar.");
}
