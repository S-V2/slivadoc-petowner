export class PlatformAuthError extends Error {
  constructor(message = "Login Slivadoc diperlukan", status = 401) {
    super(message);
    this.name = "PlatformAuthError";
    this.status = status;
  }
}

export function bearerToken(value = "") {
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export function petIDFromConversation(conversationID = "") {
  const match = String(conversationID).match(/^care-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
  return match?.[1] ?? "";
}

export function createPlatformClient(baseURL, fetchImplementation = fetch) {
  const apiURL = String(baseURL || "http://localhost:8080").replace(/\/$/, "");

  async function request(token, path, init = {}) {
    if (!token) throw new PlatformAuthError();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetchImplementation(`${apiURL}${path}`, { ...init, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new PlatformAuthError(payload.message || "Akses Slivadoc ditolak", response.status);
    return payload;
  }

  return {
    identity: (token) => request(token, "/api/v1/auth/me"),
    careHistory: (token, petID) => request(token, `/api/v1/petowner/pets/${encodeURIComponent(petID)}/care-messages`),
    createCareMessage: (token, petID, body) => request(token, `/api/v1/petowner/pets/${encodeURIComponent(petID)}/care-messages`, { method: "POST", body: JSON.stringify({ body }) }),
  };
}
