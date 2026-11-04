import type { NextConfig } from "next";
import { releaseSiteUrlProblem } from "./lib/release-guard";

// MATCHWORK_RELEASE=1 (Dockerfile de producción): no se compila si la URL pública falta o apunta a localhost.
const releaseProblem = releaseSiteUrlProblem(process.env.MATCHWORK_RELEASE, process.env.NEXT_PUBLIC_SITE_URL);
if (releaseProblem) throw new Error(`Build de release detenido: ${releaseProblem}`);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  ...(process.env.PAGES_BASE_PATH
    ? { basePath: process.env.PAGES_BASE_PATH }
    : {}),
};

export default nextConfig;
