const requiredURLs = [
  "EXPO_PUBLIC_PETOWNER_API_URL",
  "EXPO_PUBLIC_PLATFORM_API_URL",
  "EXPO_PUBLIC_REALTIME_URL",
];

const buildProfile = process.env.EAS_BUILD_PROFILE;
if (buildProfile !== "production" && buildProfile !== "preview") {
  process.exit(0);
}

const errors = [];
for (const name of requiredURLs) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    errors.push(`${name} belum diatur pada EAS environment ${buildProfile}.`);
    continue;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const secondOctet = Number(hostname.split(".")[1]);
    const localHost =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      (hostname.startsWith("172.") &&
        secondOctet >= 16 &&
        secondOctet <= 31);
    if (url.protocol !== "https:") {
      errors.push(`${name} harus memakai HTTPS untuk build ${buildProfile}.`);
    }
    if (localHost) {
      errors.push(`${name} tidak boleh menunjuk ke host lokal.`);
    }
  } catch {
    errors.push(`${name} bukan URL yang valid.`);
  }
}

if (errors.length) {
  console.error(
    `Konfigurasi ${buildProfile} Slivadoc belum valid:\n- ${errors.join("\n- ")}`,
  );
  process.exit(1);
}

console.log(`Konfigurasi API ${buildProfile} Slivadoc valid.`);
