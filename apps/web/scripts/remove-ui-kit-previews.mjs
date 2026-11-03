import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// The /ui-kit review pages call notFound() in production, but a static export still writes
// 404-looking HTML files that hosts may serve with status 200, so drop them from the output.
const previewDirectory = fileURLToPath(new URL("../out/ui-kit/", import.meta.url));
await rm(previewDirectory, { recursive: true, force: true });
