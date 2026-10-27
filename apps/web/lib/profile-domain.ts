export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PORTFOLIO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type FreelancerProfileDraft = {
  displayName: string;
  headline: string;
  bio: string;
  locationText: string;
  yearsExperience: string;
  websiteUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  availabilityStatus: string;
};

export type PortfolioProjectDraft = {
  title: string;
  description: string;
  category: string;
  projectPeriod: string;
  externalUrl: string;
  skillsUsed: string;
};

export function validateImageFile(
  file: Pick<File, "type" | "size">,
  maxBytes: number,
  label: string,
): string | null {
  if (!allowedImageTypes.has(file.type)) {
    return `${label}: elige una imagen JPEG, PNG o WebP.`;
  }
  if (file.size <= 0 || file.size > maxBytes) {
    const limitMb = maxBytes / (1024 * 1024);
    return `${label}: el archivo no debe superar ${limitMb} MiB.`;
  }
  return null;
}

function validateOptionalUrl(value: string, label: string, allowedHost?: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > 2048) return `${label}: el enlace supera el máximo de 2048 caracteres.`;

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !hostname || url.username || url.password) {
      return `${label}: introduce una URL http o https válida.`;
    }
    if (allowedHost && hostname !== allowedHost && !hostname.endsWith(`.${allowedHost}`)) {
      return `${label}: el enlace debe pertenecer a ${allowedHost}.`;
    }
  } catch {
    return `${label}: introduce una URL completa, por ejemplo https://…`;
  }
  return null;
}

export function validateFreelancerProfile(draft: FreelancerProfileDraft): string | null {
  const displayName = draft.displayName.trim();
  if (!displayName || displayName.length > 120) {
    return "El nombre público debe tener entre 1 y 120 caracteres.";
  }
  if (draft.headline.trim().length > 160) return "La especialidad admite hasta 160 caracteres.";
  if (draft.bio.trim().length > 3000) return "La presentación admite hasta 3000 caracteres.";
  if (draft.locationText.trim().length > 120) return "La ubicación admite hasta 120 caracteres.";
  if (draft.availabilityStatus.trim().length > 40) return "La disponibilidad admite hasta 40 caracteres.";

  const years = draft.yearsExperience.trim();
  if (years && (!/^\d{1,2}$/.test(years) || Number(years) > 80)) {
    return "Los años de experiencia deben ser un número entero entre 0 y 80.";
  }

  return validateOptionalUrl(draft.websiteUrl, "Sitio web")
    ?? validateOptionalUrl(draft.linkedinUrl, "LinkedIn", "linkedin.com")
    ?? validateOptionalUrl(draft.githubUrl, "GitHub", "github.com");
}

export function validatePortfolioProject(draft: PortfolioProjectDraft): string | null {
  const title = draft.title.trim();
  if (!title || title.length > 150) return "El título del proyecto debe tener entre 1 y 150 caracteres.";
  if (draft.description.trim().length > 3000) return "La descripción admite hasta 3000 caracteres.";
  if (draft.category.trim().length > 100) return "La categoría admite hasta 100 caracteres.";
  if (draft.projectPeriod.trim().length > 80) return "El periodo admite hasta 80 caracteres.";
  const skillsError = parseProjectSkills(draft.skillsUsed).error;
  return skillsError ?? validateOptionalUrl(draft.externalUrl, "Enlace del proyecto");
}

export function parseProjectSkills(value: string): { skills: string[]; error: string | null } {
  const skills = value.split("\n").map((skill) => skill.trim()).filter(Boolean);
  if (skills.length > 20) return { skills, error: "Agrega hasta 20 habilidades por proyecto." };
  if (skills.some((skill) => skill.length > 100)) return { skills, error: "Cada habilidad del proyecto admite hasta 100 caracteres." };
  const distinctSkills = new Set(skills.map((skill) => skill.toLocaleLowerCase("es")));
  if (distinctSkills.size !== skills.length) return { skills, error: "Quita las habilidades duplicadas del proyecto." };
  return { skills, error: null };
}

export function validateSkillName(value: string): string | null {
  const name = value.trim();
  if (!name) return "Escribe una habilidad antes de agregarla.";
  if (name.length > 100) return "Cada habilidad admite hasta 100 caracteres.";
  return null;
}

export function getImageExtension(mimeType: string): "jpg" | "png" | "webp" | null {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

export function toProfileDraft(
  profile: {
    display_name: string;
  },
  details: {
    headline: string | null;
    bio: string | null;
    location_text: string | null;
    years_experience: number | null;
    website_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    availability_status: string | null;
  },
): FreelancerProfileDraft {
  return {
    displayName: profile.display_name,
    headline: details.headline ?? "",
    bio: details.bio ?? "",
    locationText: details.location_text ?? "",
    yearsExperience: details.years_experience === null ? "" : String(details.years_experience),
    websiteUrl: details.website_url ?? "",
    linkedinUrl: details.linkedin_url ?? "",
    githubUrl: details.github_url ?? "",
    availabilityStatus: details.availability_status ?? "",
  };
}
