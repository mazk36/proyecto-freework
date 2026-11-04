import type { MetadataRoute } from "next";
import { siteBaseUrl, siteUrl } from "@/lib/site-metadata";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const prefix = siteBaseUrl.pathname.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: `${prefix}/`, disallow: [`${prefix}/app`, `${prefix}/ui-kit`, `${prefix}/auth`, `${prefix}/recuperar-contrasena`] },
    sitemap: siteUrl("sitemap.xml"),
  };
}
