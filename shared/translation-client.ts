export function httpTranslator(baseURL: string, fetchImpl: typeof fetch = fetch) {
  return async (sources: string[]): Promise<Record<string, string>> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65000);
    try {
      const response = await fetchImpl(`${baseURL.replace(/\/$/, "")}/api/translations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, target: "en" }), signal: controller.signal,
      });
      if (!response.ok) throw new Error("Translation unavailable");
      const result = await response.json();
      if (!result.translations || typeof result.translations !== "object") throw new Error("Invalid translation response");
      return result.translations;
    } finally { clearTimeout(timeout); }
  };
}
