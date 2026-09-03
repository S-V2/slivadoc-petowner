export const PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080";

const accessKey = "slivadoc.access_token";
const refreshKey = "slivadoc.refresh_token";
const sessionKey = "slivadoc.session_id";
const expiryKey = "slivadoc.access_expires_at";

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  session_id?: string;
  expires_in?: number;
};

export type UserIdentity = {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role?: string;
  business_id?: string | null;
  business_name?: string | null;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function checkAndMigrateLegacy() {
  if (typeof localStorage === "undefined") return;
  try {
    const legacyAccess = localStorage.getItem("access_token");
    if (legacyAccess && !localStorage.getItem(accessKey)) {
      localStorage.setItem(accessKey, legacyAccess);
      localStorage.removeItem("access_token");
    }
    const legacyRefresh = localStorage.getItem("refresh_token");
    if (legacyRefresh && !localStorage.getItem(refreshKey)) {
      localStorage.setItem(refreshKey, legacyRefresh);
      localStorage.removeItem("refresh_token");
    }
  } catch {}
}

checkAndMigrateLegacy();

const requestCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const inFlightMutations = new Map<string, Promise<unknown>>();
const getCacheTTL = 15_000;
let refreshPromise: Promise<AuthTokens> | null = null;
let cachedUser: UserIdentity | null = null;
let userPromise: Promise<UserIdentity | null> | null = null;

function beginMutationUI(method: string) {
  if (method === "GET" || typeof document === "undefined") {
    return () => undefined;
  }

  const buttonsToRestore: Array<{ btn: HTMLButtonElement; wasDisabled: boolean }> = [];
  const active = document.activeElement;

  if (active instanceof HTMLButtonElement) {
    buttonsToRestore.push({ btn: active, wasDisabled: active.disabled });
    active.disabled = true;
    active.classList.add("api-button-loading");
    active.setAttribute("aria-busy", "true");
  } else if (active instanceof HTMLElement && active.closest("form")) {
    const form = active.closest("form");
    const submitBtn = form?.querySelector<HTMLButtonElement>(
      'button[type="submit"], button:not([type])',
    );
    if (submitBtn && submitBtn instanceof HTMLButtonElement) {
      buttonsToRestore.push({ btn: submitBtn, wasDisabled: submitBtn.disabled });
      submitBtn.disabled = true;
      submitBtn.classList.add("api-button-loading");
      submitBtn.setAttribute("aria-busy", "true");
    }
  }

  return () => {
    for (const { btn, wasDisabled } of buttonsToRestore) {
      btn.disabled = wasDisabled;
      btn.classList.remove("api-button-loading");
      btn.removeAttribute("aria-busy");
    }
  };
}

function requestKey(path: string, init: RequestInit) {
  const token = getAccessToken();
  return `${String(init.method ?? "GET").toUpperCase()}:${path}:${token.slice(-16) || "anonymous"}`;
}

function mutationKey(method: string, path: string, body?: BodyInit | null) {
  const bodyStr = typeof body === "string" ? body : "";
  return `${method}:${path}:${bodyStr}`;
}

export function invalidateGetCache() {
  requestCache.clear();
}

export function hasSession(): boolean {
  if (typeof localStorage === "undefined") return false;
  checkAndMigrateLegacy();
  return Boolean(
    localStorage.getItem(accessKey) || localStorage.getItem(refreshKey),
  );
}

export function getAccessToken(): string {
  if (typeof localStorage === "undefined") return "";
  checkAndMigrateLegacy();
  return localStorage.getItem(accessKey) ?? "";
}

export function getRefreshToken(): string {
  if (typeof localStorage === "undefined") return "";
  checkAndMigrateLegacy();
  return localStorage.getItem(refreshKey) ?? "";
}

export function saveTokens(tokens: AuthTokens) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(accessKey, tokens.access_token);
  localStorage.setItem(refreshKey, tokens.refresh_token);
  if (tokens.session_id) localStorage.setItem(sessionKey, tokens.session_id);
  localStorage.setItem(
    expiryKey,
    String(Date.now() + (tokens.expires_in ?? 3600) * 1000),
  );
  cachedUser = null;
  userPromise = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("slivadoc:tokens"));
  }
}

export function clearSession() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(accessKey);
  localStorage.removeItem(refreshKey);
  localStorage.removeItem(sessionKey);
  localStorage.removeItem(expiryKey);
  requestCache.clear();
  inFlightRequests.clear();
  inFlightMutations.clear();
  cachedUser = null;
  userPromise = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("slivadoc:session-ended"));
  }
}

async function performSessionRefresh(): Promise<AuthTokens> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    throw new ApiError(
      "Session sudah berakhir. Silakan login kembali.",
      401,
      "missing_refresh_token",
    );
  }
  const response = await fetch(`${PLATFORM_API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = (await response
    .json()
    .catch(() => ({}))) as Partial<AuthTokens> & {
    message?: string;
    code?: string;
  };
  if (!response.ok || !data.access_token || !data.refresh_token) {
    clearSession();
    throw new ApiError(
      data.message ?? "Session sudah berakhir. Silakan login kembali.",
      response.status,
      data.code,
    );
  }
  saveTokens(data as AuthTokens);
  return data as AuthTokens;
}

export function refreshSession(): Promise<AuthTokens> {
  if (refreshPromise) return refreshPromise;

  const pending = performSessionRefresh();
  refreshPromise = pending;
  pending.then(
    () => {
      if (refreshPromise === pending) refreshPromise = null;
    },
    () => {
      if (refreshPromise === pending) refreshPromise = null;
    },
  );
  return pending;
}

export async function getCurrentUser(): Promise<UserIdentity | null> {
  if (cachedUser) return cachedUser;
  if (userPromise) return userPromise;
  const token = getAccessToken();
  if (!token) return null;

  userPromise = (async () => {
    try {
      const user = await apiRequest<UserIdentity>("/api/v1/auth/me", {}, true);
      cachedUser = user;
      return user;
    } catch {
      return null;
    } finally {
      userPromise = null;
    }
  })();

  return userPromise;
}

export async function getCurrentUserID(): Promise<string> {
  if (cachedUser?.id) return cachedUser.id;
  const user = await getCurrentUser();
  return user?.id ?? "";
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const method = String(init.method ?? "GET").toUpperCase();
  const key = requestKey(path, init);
  const useGetCache = method === "GET" && init.cache !== "no-store";

  if (useGetCache) {
    const cached = requestCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    const pending = inFlightRequests.get(key);
    if (pending) return pending as Promise<T>;
  }

  const mKey = method !== "GET" ? mutationKey(method, path, init.body) : "";
  if (method !== "GET") {
    const pendingMutation = inFlightMutations.get(mKey);
    if (pendingMutation) return pendingMutation as Promise<T>;
  }

  const finishMutationUI = beginMutationUI(method);

  const execute = async () => {
    let token = getAccessToken();
    if (!token && retry && getRefreshToken()) {
      try {
        await refreshSession();
        token = getAccessToken();
      } catch {}
    }

    const send = (accessToken: string) => {
      const headers = new Headers(init.headers);
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      if (
        init.body &&
        !headers.has("Content-Type") &&
        !(init.body instanceof FormData)
      ) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(`${PLATFORM_API_URL}${path}`, { ...init, headers });
    };

    let response = await send(token);
    if (response.status === 401 && retry && getRefreshToken()) {
      try {
        await refreshSession();
        token = getAccessToken();
        response = await send(token);
      } catch {}
    }

    const data = (await response.json().catch(() => ({}))) as T & {
      message?: string;
      code?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new ApiError(
        data.message ?? data.error ?? `Permintaan gagal (${response.status})`,
        response.status,
        data.code ?? data.error,
      );
    }

    if (useGetCache) {
      requestCache.set(key, {
        expiresAt: Date.now() + getCacheTTL,
        value: data,
      });
    } else {
      invalidateGetCache();
    }
    return data;
  };

  const promise = execute();
  if (useGetCache) inFlightRequests.set(key, promise);
  if (method !== "GET") inFlightMutations.set(mKey, promise);

  try {
    return await promise;
  } finally {
    if (useGetCache) inFlightRequests.delete(key);
    if (method !== "GET") inFlightMutations.delete(mKey);
    finishMutationUI();
  }
}

export function startAutomaticRefresh(onExpired: () => void) {
  let running = false;
  const refreshIfNeeded = async () => {
    if (running || !hasSession()) return;
    const expiresAt = Number(
      (typeof localStorage !== "undefined" && localStorage.getItem(expiryKey)) || 0,
    );
    if (expiresAt > Date.now() + 5 * 60 * 1000) return;
    running = true;
    try {
      await refreshSession();
    } catch {
      onExpired();
    } finally {
      running = false;
    }
  };

  void refreshIfNeeded();
  const timer = typeof window !== "undefined" ? window.setInterval(refreshIfNeeded, 60_000) : null;
  const ended = () => onExpired();
  if (typeof window !== "undefined") {
    window.addEventListener("slivadoc:session-ended", ended);
  }

  return () => {
    if (timer && typeof window !== "undefined") window.clearInterval(timer);
    if (typeof window !== "undefined") {
      window.removeEventListener("slivadoc:session-ended", ended);
    }
  };
}

export async function logoutSession() {
  try {
    await apiRequest<{ message: string }>(
      "/api/v1/auth/logout",
      { method: "POST" },
      false,
    );
  } finally {
    clearSession();
  }
}
