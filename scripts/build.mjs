// ── Suite v2 Extension Build ──
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const extDir = path.join(root, "extension");

console.log("Building Suite v2 extension...\n");

if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true });
fs.mkdirSync(distDir, { recursive: true });

try {
  execSync("npx vite build --config vite.config.ext.ts", { cwd: root, stdio: "inherit" });
} catch {
  console.error("Dashboard build failed!");
  process.exit(1);
}

const nestedDash = path.join(distDir, "dashboard", "src", "dashboard");
if (fs.existsSync(nestedDash)) {
  for (const file of fs.readdirSync(nestedDash)) {
    const srcPath = path.join(nestedDash, file);
    const destPath = path.join(distDir, "dashboard", file);
    if (file === "index.html") {
      let html = fs.readFileSync(srcPath, "utf-8");
      html = html.replace(/\.\.\/\.\.\/assets\//g, "./assets/");
      fs.writeFileSync(destPath, html);
    } else {
      fs.renameSync(srcPath, destPath);
    }
  }
  fs.rmSync(path.join(distDir, "dashboard", "src"), { recursive: true });
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) copyRecursive(path.join(src, item), path.join(dest, item));
  } else if (!dest.endsWith("manifest.json") || !fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}
copyRecursive(extDir, distDir);

const required = ["manifest.json", "dashboard/index.html"];
let valid = true;
for (const p of required) {
  const exists = fs.existsSync(path.join(distDir, p));
  console.log(`  ${exists ? "OK" : "MISSING"} ${p}`);
  if (!exists) valid = false;
}
console.log(valid ? "\nBuild complete! Load dist/ as an unpacked extension." : "\nSome files are missing!");
