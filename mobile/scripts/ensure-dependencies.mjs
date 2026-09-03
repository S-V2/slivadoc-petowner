import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const mobileDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJSON = JSON.parse(
  readFileSync(join(mobileDirectory, "package.json"), "utf8"),
);
const directDependencies = [
  ...Object.keys(packageJSON.dependencies ?? {}),
  ...Object.keys(packageJSON.devDependencies ?? {}),
];

function dependencyDirectory(name) {
  return join(mobileDirectory, "node_modules", ...name.split("/"));
}

function findMissingDependencies() {
  return directDependencies.filter(
    (name) => !existsSync(join(dependencyDirectory(name), "package.json")),
  );
}

let missingDependencies = findMissingDependencies();

if (missingDependencies.length === 0) {
  process.exit(0);
}

console.log(
  `[mobile] Dependency belum terpasang: ${missingDependencies.join(", ")}.`,
);
console.log("[mobile] Menyinkronkan node_modules dari package-lock.json...");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const install = spawnSync(
  npmCommand,
  ["install", "--prefer-offline", "--no-audit", "--no-fund"],
  {
    cwd: mobileDirectory,
    env: process.env,
    stdio: "inherit",
  },
);

if (install.error) {
  console.error(`[mobile] Gagal menjalankan npm install: ${install.error.message}`);
  process.exit(1);
}

if (install.status !== 0) {
  console.error(
    "[mobile] Instalasi dependency gagal. Jalankan `cd mobile && npm ci`, lalu coba lagi.",
  );
  process.exit(install.status ?? 1);
}

missingDependencies = findMissingDependencies();
if (missingDependencies.length > 0) {
  console.error(
    `[mobile] Dependency masih belum tersedia: ${missingDependencies.join(", ")}. Jalankan \`cd mobile && npm ci\`.`,
  );
  process.exit(1);
}

console.log("[mobile] Dependency sudah sinkron. Menjalankan Expo...");
