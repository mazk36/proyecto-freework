import type { Metadata } from "next";

const LOCAL_SITE_URL = "http://localhost:3000";

export function resolveSiteBaseUrl(configuredUrl?: string, configuredBasePath?: string): URL {
  let url: URL;
  try {
    url = new URL(configuredUrl?.trim() || LOCAL_SITE_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported site URL");
  } catch {
    url = new URL(LOCAL_SITE_URL);
  }
  const path = url.pathname.replace(/\/+$/, "");
  const basePath = configuredBasePath?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  const suffix = basePath ? `/${basePath}` : "";
  url.pathname = `${path}${suffix && !path.endsWith(suffix) ? suffix : ""}/`;
  url.search = "";
  url.hash = "";
  return url;
}

export const siteBaseUrl = resolveSiteBaseUrl(
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.PAGES_BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH,
);

export function siteUrl(path = ""): string {
  return new URL(path.replace(/^\/+/, ""), siteBaseUrl).toString();
}

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const url = siteUrl(path);
  const image = siteUrl("og/matchwork.png");
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website", siteName: "MatchWork", locale: "es_PE", title, description, url,
      images: [{ url: image, width: 1200, height: 630, alt: "MatchWork: del problema a una solución" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
