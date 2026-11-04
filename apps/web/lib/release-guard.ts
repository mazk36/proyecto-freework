/**
 * Guarda de la compilación de release (MATCHWORK_RELEASE=1): sin una NEXT_PUBLIC_SITE_URL pública el build publicaría
 * canonical, og:url y sitemap hacia localhost. Devuelve el motivo del fallo o null si todo está bien.
 */
export function releaseSiteUrlProblem(release: string | undefined, siteUrl: string | undefined): string | null {
  if (release !== "1") return null;
  const value = siteUrl?.trim();
  if (!value) return "NEXT_PUBLIC_SITE_URL falta: el build de release publicaría canonical, og:url y sitemap hacia localhost.";
  let url: URL;
  try { url = new URL(value); } catch { return `NEXT_PUBLIC_SITE_URL («${value}») no es una URL válida.`; }
  if (url.protocol !== "https:") return `NEXT_PUBLIC_SITE_URL («${value}») debe usar https en un build de release.`;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname) || url.hostname.endsWith(".localhost")) {
    return `NEXT_PUBLIC_SITE_URL («${value}») apunta a localhost: el build de release publicaría canonical, og:url y sitemap hacia ahí.`;
  }
  return null;
}
