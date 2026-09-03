import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const platform = process.argv[2];
if (platform !== "android" && platform !== "ios") {
  console.error("Gunakan platform `android` atau `ios`.");
  process.exit(1);
}

const mobileDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const expoBinary = join(
  mobileDirectory,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "expo.cmd" : "expo",
);

if (!existsSync(expoBinary)) {
  console.error(
    "Expo belum terpasang. Jalankan `cd mobile && npm ci`, lalu coba lagi.",
  );
  process.exit(1);
}

function findStaleExpoProcesses() {
  if (process.platform === "win32") return [];

  const processList = spawnSync("ps", ["-axo", "pid=,command="], {
    encoding: "utf8",
  });
  if (processList.status !== 0 || !processList.stdout) return [];

  const mobileModules = `${mobileDirectory}/node_modules/`;
  return processList.stdout
    .split("\n")
    .map((line) => line.trim().match(/^(\d+)\s+(.+)$/))
    .filter((match) => {
      if (!match) return false;
      const pid = Number(match[1]);
      const command = match[2];
      return (
        pid !== process.pid &&
        command.includes(mobileModules) &&
        /(?:@expo\/cli|\/metro(?:-|\/)|\/\.bin\/expo)/.test(command)
      );
    })
    .map((match) => Number(match?.[1]))
    .filter((pid) => Number.isInteger(pid));
}

const staleProcesses = findStaleExpoProcesses();
if (staleProcesses.length > 0) {
  console.log(
    `[mobile] Menghentikan Metro lama untuk project ini (${staleProcesses.join(", ")})...`,
  );
  for (const pid of staleProcesses) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
  await new Promise((resolve) => setTimeout(resolve, 650));
}

console.log(`[mobile] Membuka ${platform} dengan cache Metro baru...`);
const expo = spawn(
  expoBinary,
  ["start", `--${platform}`, "--clear", ...process.argv.slice(3)],
  {
    cwd: mobileDirectory,
    env: process.env,
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => expo.kill(signal));
}

expo.on("error", (error) => {
  console.error(`[mobile] Expo gagal dijalankan: ${error.message}`);
  process.exit(1);
});

expo.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
