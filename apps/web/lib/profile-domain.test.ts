import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_BYTES,
  parseProjectSkills,
  PORTFOLIO_IMAGE_MAX_BYTES,
  validateFreelancerProfile,
  validateImageFile,
  validatePortfolioProject,
  validateSkillName,
  type FreelancerProfileDraft,
} from "@/lib/profile-domain";

const validProfile: FreelancerProfileDraft = {
  displayName: "Profesional MatchWork",
  headline: "Especialista en operaciones",
  bio: "Ayudo a equipos a resolver procesos manuales.",
  locationText: "Lima, Perú",
  yearsExperience: "5",
  websiteUrl: "https://example.com",
  linkedinUrl: "https://www.linkedin.com/in/profesional",
  githubUrl: "https://github.com/profesional",
  availabilityStatus: "Disponible para proyectos",
};

describe("freelancer profile validation", () => {
  it("accepts optional professional details and their supported link formats", () => {
    expect(validateFreelancerProfile(validProfile)).toBeNull();
  });

  it("rejects malformed social links and out-of-range experience", () => {
    expect(validateFreelancerProfile({ ...validProfile, githubUrl: "https://github.com.attacker.test/user" })).toContain("GitHub");
    expect(validateFreelancerProfile({ ...validProfile, yearsExperience: "81" })).toContain("0 y 80");
  });

  it("enforces profile field lengths", () => {
    expect(validateFreelancerProfile({ ...validProfile, bio: "x".repeat(3001) })).toContain("3000");
    expect(validateFreelancerProfile({ ...validProfile, displayName: " " })).toContain("nombre público");
  });
});

describe("profile media validation", () => {
  it("accepts supported images under their bucket limits", () => {
    expect(validateImageFile({ type: "image/webp", size: AVATAR_MAX_BYTES }, AVATAR_MAX_BYTES, "Avatar")).toBeNull();
    expect(validateImageFile({ type: "image/png", size: PORTFOLIO_IMAGE_MAX_BYTES }, PORTFOLIO_IMAGE_MAX_BYTES, "Portafolio")).toBeNull();
  });

  it("rejects invalid MIME types and oversized files", () => {
    expect(validateImageFile({ type: "image/svg+xml", size: 100 }, AVATAR_MAX_BYTES, "Avatar")).toContain("JPEG, PNG o WebP");
    expect(validateImageFile({ type: "image/jpeg", size: AVATAR_MAX_BYTES + 1 }, AVATAR_MAX_BYTES, "Avatar")).toContain("2 MiB");
  });
});

describe("portfolio and skill validation", () => {
  it("requires project titles and validates external URLs", () => {
    const project = { title: "Proyecto", description: "", category: "", projectPeriod: "", externalUrl: "https://example.com/work", skillsUsed: "React\nTypeScript" };
    expect(validatePortfolioProject(project)).toBeNull();
    expect(validatePortfolioProject({ ...project, externalUrl: "javascript:alert(1)" })).toContain("URL http o https");
    expect(validatePortfolioProject({ ...project, title: " " })).toContain("título");
  });

  it("limits skill labels", () => {
    expect(validateSkillName("Gestión de operaciones")).toBeNull();
    expect(validateSkillName(" ")).toContain("Escribe");
    expect(validateSkillName("x".repeat(101))).toContain("100");
  });

  it("parses project skills and enforces uniqueness and the schema limit", () => {
    expect(parseProjectSkills("React\n TypeScript ")).toEqual({ skills: ["React", "TypeScript"], error: null });
    expect(parseProjectSkills("React\nreact").error).toContain("duplicadas");
    expect(parseProjectSkills(Array.from({ length: 21 }, (_, index) => `Skill ${index}`).join("\n")).error).toContain("20");
  });
});
