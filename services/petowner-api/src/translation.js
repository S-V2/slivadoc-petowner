import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const translationRequest = z.object({
  target: z.literal("en"),
  sources: z.array(z.string().trim().min(1).max(12000)).min(1).max(50),
}).refine(input => input.sources.reduce((size, source) => size + source.length, 0) <= 32000, "Batch exceeds 32,000 characters");

export function createTranslationService({ baseURL, cacheDir, fetchImpl = fetch }) {
  const memory = new Map();
  const inflight = new Map();
  const prefix = "sliva-id-en-argos-1.9";
  const key = source => createHash("sha256").update(`${prefix}\0${source}`).digest("hex");
  async function cached(source) {
    const hash = key(source);
    if (memory.has(hash)) return memory.get(hash);
    try { const data = JSON.parse(await readFile(join(cacheDir, `${hash}.json`), "utf8")); if (typeof data.translation === "string" && data.translation.trim()) { memory.set(hash,data.translation); return data.translation; } } catch { /* A cache miss or corrupt entry is regenerated. */ }
    return undefined;
  }
  async function persist(source, translation) {
    const hash = key(source);
    memory.set(hash, translation);
    if (memory.size > 5000) memory.delete(memory.keys().next().value);
    await mkdir(cacheDir, {recursive:true});
    const destination = join(cacheDir, `${hash}.json`);
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary,JSON.stringify({version:prefix,translation}),{mode:0o600});
    await rename(temporary,destination);
  }
  async function execute(sources) {
    const result = Object.create(null);
    const missing = [];
    for (const source of sources) { const value = await cached(source); if (value) result[source]=value; else missing.push(source); }
    if (missing.length) {
      if (!baseURL) throw new Error("translation_not_configured");
      const response = await fetchImpl(`${baseURL.replace(/\/$/,"")}/translate`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({q:missing,source:"id",target:"en",format:"text"}),signal:AbortSignal.timeout(60000)});
      if (!response.ok) throw new Error("translation_unavailable");
      const body = await response.json();
      const values = Array.isArray(body.translatedText) ? body.translatedText : [body.translatedText];
      if (values.length !== missing.length || values.some(value => typeof value !== "string" || !value.trim())) throw new Error("invalid_translation_response");
      for (let index=0;index<missing.length;index++) { result[missing[index]]=values[index]; await persist(missing[index],values[index]); }
    }
    return result;
  }
  return async input => {
    const {sources}=translationRequest.parse(input);
    const unique=[...new Set(sources)];
    const batchKey=createHash("sha256").update(JSON.stringify(unique)).digest("hex");
    if (inflight.has(batchKey)) return inflight.get(batchKey);
    // Bound inference jobs across users so translation cannot starve the gateway.
    if (inflight.size >= 2) throw new Error("translation_busy");
    const job=execute(unique).finally(()=>inflight.delete(batchKey));
    inflight.set(batchKey,job);
    return job;
  };
}
