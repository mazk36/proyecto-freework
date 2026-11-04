/** Enlaces escritos por usuarios: solo http(s); cualquier otro esquema (javascript:, data:, etc.) se descarta. */
export const userLinkRel = "noopener noreferrer nofollow ugc";

export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
