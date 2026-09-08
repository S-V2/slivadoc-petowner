import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const platform = process.argv[2];
if (platform !== "android" && platform !== "ios") {
  console.error("Gunakan platform `android` atau `ios`.");
  process.exit(1);
}

const forwardedArguments = process.argv.slice(3);

function explicitPort(argumentsList) {
  const portIndex = argumentsList.findIndex((item) => item === "--port");
  if (portIndex >= 0) return argumentsList[portIndex + 1];
  return argumentsList
    .find((item) => item.startsWith("--port="))
    ?.slice("--port=".length);
}

const portEnvironmentKey =
  platform === "android" ? "SLIVADOC_ANDROID_PORT" : "SLIVADOC_IOS_PORT";
const hasExplicitPort = forwardedArguments.some(
  (item) => item === "--port" || item.startsWith("--port="),
);
const explicitPortValue = explicitPort(forwardedArguments);
const requestedPort = hasExplicitPort
  ? explicitPortValue
  : process.env[portEnvironmentKey] ||
    (platform === "android" ? "8082" : "8081");
const port = Number(requestedPort);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  console.error(
    `Port Metro tidak valid: ${requestedPort || "kosong"}. Gunakan angka 1-65535.`,
  );
  process.exit(1);
}

const portArguments = hasExplicitPort ? [] : ["--port", String(port)];

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

function prepareIOSSimulator() {
  if (process.platform !== "darwin") {
    console.error("iOS Simulator hanya dapat dijalankan dari macOS.");
    process.exit(1);
  }

  const xcode = spawnSync("xcrun", ["simctl", "list", "devices"], {
    encoding: "utf8",
  });
  if (xcode.status !== 0) {
    console.error(
      "Xcode command line tools belum siap. Jalankan `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, lalu buka Xcode sekali untuk menyetujui lisensi.",
    );
    process.exit(1);
  }

  const simulator = spawnSync("open", ["-a", "Simulator"], {
    encoding: "utf8",
  });
  if (simulator.status !== 0) {
    console.error(
      `Simulator gagal dibuka: ${simulator.stderr?.trim() || "pastikan Xcode dan iOS Simulator sudah terpasang"}`,
    );
    process.exit(1);
  }
}

function hasBootedSimulator() {
  const result = spawnSync(
    "xcrun",
    ["simctl", "list", "devices", "booted", "--json"],
    { encoding: "utf8" },
  );
  if (result.status !== 0 || !result.stdout) return false;
  try {
    const runtimes = Object.values(JSON.parse(result.stdout).devices ?? {});
    return runtimes.some((devices) =>
      devices.some((device) => device.state === "Booted"),
    );
  } catch {
    return false;
  }
}

async function waitForBootedSimulator(timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (hasBootedSimulator()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function openExpoInSimulator(projectUrl) {
  if (!(await waitForBootedSimulator())) {
    console.error(
      "Simulator belum selesai boot. Pilih device dari Simulator > File > Open Simulator, lalu jalankan ulang `npm run ios`.",
    );
    return;
  }

  const result = spawnSync(
    "xcrun",
    ["simctl", "openurl", "booted", projectUrl],
    { encoding: "utf8" },
  );
  if (result.status === 0) {
    console.log(`[mobile] Project dibuka di iOS Simulator: ${projectUrl}`);
    return;
  }

  console.error(
    `[mobile] Expo Go belum dapat membuka URL otomatis. Buka Expo Go di Simulator dan masukkan URL ini: ${projectUrl}`,
  );
}

if (platform === "ios") prepareIOSSimulator();

console.log(
  `[mobile] Membuka ${platform} dengan cache Metro baru di port ${port}...`,
);
const expoArguments =
  platform === "ios"
    ? ["start", "--clear", ...portArguments, ...forwardedArguments]
    : [
        "start",
        "--android",
        "--clear",
        ...portArguments,
        ...forwardedArguments,
      ];
const expo = spawn(expoBinary, expoArguments, {
  cwd: mobileDirectory,
  env: process.env,
  stdio: platform === "ios" ? ["inherit", "pipe", "pipe"] : "inherit",
});

if (platform === "ios") {
  let output = "";
  let projectOpened = false;
  const forwardOutput = (stream, target) => {
    stream?.on("data", (chunk) => {
      target.write(chunk);
      if (projectOpened) return;
      output = `${output}${chunk}`.replace(
        // Strip ANSI control codes before looking for the Expo URL.
        /\u001B\[[0-?]*[ -\/]*[@-~]/g,
        "",
      );
      const match = output.match(/\bexps?:\/\/[^\s]+/);
      if (!match) {
        output = output.slice(-2_000);
        return;
      }
      projectOpened = true;
      const projectUrl = match[0].replace(/[),.;]+$/, "");
      void openExpoInSimulator(projectUrl);
    });
  };
  forwardOutput(expo.stdout, process.stdout);
  forwardOutput(expo.stderr, process.stderr);
}

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
