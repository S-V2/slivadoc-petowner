import { expect, jest, test } from "@jest/globals";
import { clearMobileSession, createMobilePet, getMobileBootstrap, setPlatformAccessToken } from "../../src/api";
import { petProfilePayload } from "../../../shared/pet-profile";

test("an owner without pets can create their first pet with an authenticated request and refresh the cached bootstrap", async () => {
  await clearMobileSession();
  setPlatformAccessToken("native-ui-test-token");
  const pet = { id: "native-test-pet", name: "Test Cat", species: "cat" };
  let created = false;
  const requests: Array<{ path: string; method: string; body?: unknown; authorization: string }> = [];
  const fetch = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    requests.push({ path, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined, authorization: String(new Headers(init?.headers).get("Authorization")) });
    if (path === "/api/v1/petowner/bootstrap") return new Response(JSON.stringify({ pets: created ? [pet] : [], notifications: [] }), { status: 200 });
    if (path === "/api/v1/petowner/pets") { created = true; return new Response(JSON.stringify({ id: pet.id, species: "cat", species_group: "cat", message: "Saved" }), { status: 201 }); }
    throw new Error(`Unexpected test request: ${path}`);
  });
  try {
    expect((await getMobileBootstrap()).pets).toEqual([]);
    const input = petProfilePayload({ name: pet.name, speciesCode: "cat", customSpecies: "", customScientificName: "", breed: "", sex: "unknown", birthDate: "", weight: "" }, [{ code: "cat", label: "Kucing", group: "cat", scientific_name: "Felis catus", emoji: "🐈" }]);
    expect((await createMobilePet(input)).id).toBe(pet.id);
    expect((await getMobileBootstrap()).pets).toEqual([pet]);
    expect(requests.filter((request) => request.path.endsWith("bootstrap"))).toHaveLength(2);
    expect(requests.find((request) => request.method === "POST")).toEqual({ path: "/api/v1/petowner/pets", method: "POST", body: input, authorization: "Bearer native-ui-test-token" });
  } finally { fetch.mockRestore(); await clearMobileSession(); }
});
