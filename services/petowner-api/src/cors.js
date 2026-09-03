function normalizeOrigin(value) {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

export function parseAllowedOrigins(value) {
  return value.split(",").map(normalizeOrigin).filter(Boolean);
}

export function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes("*") || allowedOrigins.includes(normalized)) return true;

  let candidate;
  try {
    candidate = new URL(normalized);
  } catch {
    return false;
  }

  return allowedOrigins.some((configured) => {
    if (!configured.includes("*")) return false;
    try {
      const pattern = new URL(configured);
      if (!pattern.hostname.startsWith("*.")) return false;
      const suffix = pattern.hostname.slice(1);
      return candidate.protocol === pattern.protocol &&
        candidate.port === pattern.port &&
        candidate.hostname.endsWith(suffix) &&
        candidate.hostname !== suffix.slice(1);
    } catch {
      return false;
    }
  });
}

export function createCorsOriginValidator(allowedOrigins) {
  return (origin, callback) => callback(null, isOriginAllowed(origin, allowedOrigins));
}

export function getDefaultOrigins(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === "production"
    ? []
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:8081",
      ];
}

export function resolveAllowedOrigins(configuredOrigins = process.env.CORS_ORIGINS, nodeEnv = process.env.NODE_ENV) {
  const defaults = getDefaultOrigins(nodeEnv);
  const configured = parseAllowedOrigins(configuredOrigins || "");
  return [...new Set([...defaults, ...configured])];
}
