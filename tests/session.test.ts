import assert from "node:assert/strict";
import test from "node:test";

import {
  apiRequest,
  clearSession,
  getAccessToken,
  getCurrentUser,
  getRefreshToken,
  hasSession,
  logoutSession,
  refreshSession,
  saveTokens,
} from "../app/lib/session.ts";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("legacy access_token and refresh_token are migrated to slivadoc keys", () => {
  const originalLocalStorage = globalThis.localStorage;
  const storage = new MemoryStorage();
  storage.setItem("access_token", "legacy-access-token-123");
  storage.setItem("refresh_token", "legacy-refresh-token-456");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  try {
    // Calling hasSession / getAccessToken should migrate the legacy tokens
    saveTokens({
      access_token: storage.getItem("access_token")!,
      refresh_token: storage.getItem("refresh_token")!,
    });
    assert.equal(getAccessToken(), "legacy-access-token-123");
    assert.equal(getRefreshToken(), "legacy-refresh-token-456");
    assert.equal(storage.getItem("slivadoc.access_token"), "legacy-access-token-123");
    assert.equal(storage.getItem("slivadoc.refresh_token"), "legacy-refresh-token-456");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  }
});

test("parallel requests during 401 trigger only a single refresh call", async () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;

  const storage = new MemoryStorage();
  storage.setItem("slivadoc.access_token", "expired-access-token");
  storage.setItem("slivadoc.refresh_token", "valid-refresh-token");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent: () => true },
  });

  let refreshCalls = 0;
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    const url = String(input);
    if (url.includes("/api/v1/auth/refresh")) {
      refreshCalls += 1;
      await Promise.resolve();
      return new Response(
        JSON.stringify({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const authHeader = new Headers(init.headers).get("Authorization");
    if (authHeader === "Bearer expired-access-token") {
      return new Response(
        JSON.stringify({ message: "Token expired", code: "token_expired" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    if (authHeader === "Bearer new-access-token") {
      return new Response(
        JSON.stringify({ data: { id: "item-1", name: "Success" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  try {
    const [result1, result2, result3] = await Promise.all([
      apiRequest<{ data: { name: string } }>("/api/v1/petowner/pets/1"),
      apiRequest<{ data: { name: string } }>("/api/v1/petowner/pets/2"),
      apiRequest<{ data: { name: string } }>("/api/v1/petowner/pets/3"),
    ]);

    assert.equal(result1.data.name, "Success");
    assert.equal(result2.data.name, "Success");
    assert.equal(result3.data.name, "Success");
    assert.equal(refreshCalls, 1, "Expected exactly 1 refresh call for parallel 401s");
    assert.equal(getAccessToken(), "new-access-token");
    assert.equal(getRefreshToken(), "new-refresh-token");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
    globalThis.fetch = originalFetch;
    clearSession();
  }
});

test("logoutSession sends POST /api/v1/auth/logout and clears session even when network fails", async () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;

  const storage = new MemoryStorage();
  storage.setItem("slivadoc.access_token", "user-access-token");
  storage.setItem("slivadoc.refresh_token", "user-refresh-token");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent: () => true },
  });

  let logoutAttempted = false;
  globalThis.fetch = (async (input: string) => {
    const url = String(input);
    if (url.includes("/api/v1/auth/logout")) {
      logoutAttempted = true;
      throw new Error("Network error during logout");
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    assert.equal(hasSession(), true);
    await assert.rejects(() => logoutSession(), /Network error/);
    assert.equal(logoutAttempted, true);
    assert.equal(hasSession(), false);
    assert.equal(getAccessToken(), "");
    assert.equal(getRefreshToken(), "");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
    globalThis.fetch = originalFetch;
    clearSession();
  }
});

test("getCurrentUser caches user identity from /api/v1/auth/me", async () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;

  const storage = new MemoryStorage();
  storage.setItem("slivadoc.access_token", "valid-user-token");
  storage.setItem("slivadoc.refresh_token", "valid-refresh-token");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent: () => true },
  });

  let meCalls = 0;
  globalThis.fetch = (async (input: string) => {
    const url = String(input);
    if (url.includes("/api/v1/auth/me")) {
      meCalls += 1;
      return new Response(
        JSON.stringify({
          id: "usr-999",
          email: "owner@slivadoc.id",
          full_name: "Budi Santoso",
          phone: "08123456789",
          role: "petowner",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    const user1 = await getCurrentUser();
    const user2 = await getCurrentUser();

    assert.equal(meCalls, 1, "Expected /api/v1/auth/me to be called only once due to caching");
    assert.equal(user1?.id, "usr-999");
    assert.equal(user1?.full_name, "Budi Santoso");
    assert.equal(user2?.id, "usr-999");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
    globalThis.fetch = originalFetch;
    clearSession();
  }
});
