// Bundles the real components (MysteryPackageTabView, HostAccess) into <OUT> for file:// rendering, plus the app CSS.
// Run: node scripts/host-seal/render-check/build.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { root, outDir } from "../lib.mjs";

fs.mkdirSync(outDir, { recursive: true });
await build({
  entryPoints: [path.join(root, "scripts/host-seal/render-check/harness.tsx")], bundle: true, outfile: path.join(outDir, "harness.js"),
  format: "iife", platform: "browser", alias: { "@": path.join(root, "src") }, nodePaths: [path.join(root, "node_modules")],
  loader: { ".css": "empty", ".svg": "dataurl", ".png": "dataurl", ".jpg": "dataurl", ".webp": "dataurl", ".woff2": "empty" },
  define: { "import.meta.env": JSON.stringify({ MODE: "development", DEV: true, PROD: false, VITE_ENABLE_GUEST_DROPOUT_ADAPTATION: "false", VITE_SUPABASE_URL: "https://example.invalid", VITE_SUPABASE_ANON_KEY: "unused" }), "process.env.NODE_ENV": '"development"', global: "window" },
  jsx: "automatic", logLevel: "warning",
});
execFileSync("npx", ["tailwindcss", "-c", "tailwind.config.ts", "-i", "src/index.css", "-o", path.join(outDir, "app.css")], { cwd: root, stdio: "ignore" });
fs.copyFileSync(path.join(root, "src/styles/mystery-package.css"), path.join(outDir, "mp.css"));
fs.writeFileSync(path.join(outDir, "index.html"), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><link rel="stylesheet" href="mp.css"></head><body><div id="root"></div><script src="harness.js"></script></body></html>');
console.log("built into", outDir);
