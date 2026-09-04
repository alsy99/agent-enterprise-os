/**
 * Build a static frontend for GitHub Pages.
 * Temporarily parks App Router API routes (incompatible with `output: 'export'`).
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const apiDir = path.join(root, "src/app/api");
const parkDir = path.join(root, ".api-park");

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: false,
  });
  if (res.status !== 0) process.exit(res.status || 1);
}

fs.rmSync(parkDir, { recursive: true, force: true });
if (fs.existsSync(apiDir)) {
  fs.renameSync(apiDir, parkDir);
}

try {
  run("npx", ["next", "build"], {
    STATIC_EXPORT: "1",
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || "",
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || "",
  });
} finally {
  if (fs.existsSync(parkDir)) {
    fs.rmSync(apiDir, { recursive: true, force: true });
    fs.renameSync(parkDir, apiDir);
  }
}

console.log("[build-pages] static site ready in ./out");
