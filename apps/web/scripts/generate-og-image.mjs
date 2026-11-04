import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const logo = resolve(webRoot, "public/brand/matchwork-wordmark-reversed.png");
const output = resolve(webRoot, "public/og/matchwork.png");
mkdirSync(dirname(output), { recursive: true });

// Crop only the transparent padding from the supplied logo; never alter the source.
const result = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-f", "lavfi", "-i", "color=c=0x0d1117:s=1200x630:d=1",
  "-i", logo,
  "-filter_complex",
  "[0:v]drawbox=x=0:y=0:w=1200:h=12:color=0x8a4dff:t=fill,drawbox=x=0:y=618:w=1200:h=12:color=0x0b2a5b:t=fill[bg];[1:v]crop=3582:649:187:1655,scale=900:-1[logo];[bg][logo]overlay=(W-w)/2:(H-h)/2:format=auto",
  "-frames:v", "1", "-update", "1", output,
], { stdio: "inherit" });

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
