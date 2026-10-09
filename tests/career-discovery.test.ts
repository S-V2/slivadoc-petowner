import assert from "node:assert/strict";
import test from "node:test";
import {
  careerFilterQuery,
  careerWorkMode,
  discoverCareerPositions,
  readCareerFilters,
} from "../shared/career-discovery.ts";
import { careerLocation, type CareerPosition } from "../shared/careers.ts";

const text = {
  id: "Merawat hewan dengan empati",
  en: "Care for animals with empathy",
};
const base: CareerPosition = {
  id: "sitter",
  title: { id: "Pet Sitter", en: "Pet Sitter" },
  department: "pet_services",
  status: "open",
  summary: text,
  responsibilities: [text],
  requirements: [text],
  fields: [],
  employment_types: ["PART_TIME", "CONTRACTOR"],
  work_mode: "on_site",
  city: "Jakarta",
  region: "DKI Jakarta",
  published_at: "2026-09-01T00:00:00Z",
};
const catalog: CareerPosition[] = [
  base,
  {
    ...base,
    id: "engineer",
    title: { id: "Engineer", en: "Engineer" },
    department: "engineering",
    status: "talent_pool",
    work_mode: "hybrid",
    employment_types: ["FULL_TIME"],
    published_at: "2026-10-01T00:00:00Z",
  },
  {
    ...base,
    id: "designer",
    title: { id: "Desainer", en: "Designer" },
    department: "product",
    work_mode: "remote",
    city: "",
    region: "",
    employment_types: ["CONTRACTOR"],
  },
];
const filters = (query = "") => readCareerFilters(new URLSearchParams(query));

test("confirmed Jakarta placement is readable and searchable without duplicate region names", () => {
  const jakarta = { ...base, city: "DKI Jakarta", region: "DKI Jakarta" };
  for (const language of ["id", "en"] as const) {
    assert.equal(careerLocation(jakarta, language), "DKI Jakarta, Indonesia");
    assert.equal(
      discoverCareerPositions(
        [jakarta],
        filters("location=DKI%20Jakarta&q=jakarta"),
        language,
      ).length,
      1,
    );
  }
});

test("combined employment, arrangement, location, department, opportunity and multilingual searches", () => {
  assert.deepEqual(
    discoverCareerPositions(
      catalog,
      filters(
        "employment=PART_TIME&mode=on_site&department=pet_services&location=Jakarta%2C+DKI+Jakarta&status=open&q=empathy+sitter",
      ),
      "id",
    ).map((p) => p.id),
    ["sitter"],
  );
  assert.deepEqual(
    discoverCareerPositions(
      catalog,
      filters("mode=hybrid&employment=FULL_TIME"),
      "en",
    ).map((p) => p.id),
    ["engineer"],
  );
  assert.deepEqual(
    discoverCareerPositions(
      catalog,
      filters("mode=remote&location=indonesia"),
      "id",
    ).map((p) => p.id),
    ["designer"],
  );
  assert.equal(
    discoverCareerPositions(
      catalog,
      filters("mode=remote&employment=FULL_TIME"),
      "en",
    ).length,
    0,
  );
  assert.equal(discoverCareerPositions(catalog, filters(), "id").length, 3);
});
test("shareable filters survive encoding and invalid enum values are ignored", () => {
  const f = filters(
    "q=Produk+%26+Data&mode=hybrid&employment=FULL_TIME&sort=title&department=engineering&location=Jakarta%2C+DKI+Jakarta&status=talent_pool",
  );
  assert.deepEqual(filters(careerFilterQuery(f)), f);
  assert.equal(careerFilterQuery(filters()), "");
  assert.equal(
    filters("mode=unknown&employment=unknown&sort=unknown&status=closed").mode,
    "",
  );
  assert.equal(filters("q=" + "x".repeat(200)).q.length, 150);
});
test("sorting uses published dates or localized names without mutating the catalog", () => {
  assert.equal(
    discoverCareerPositions(catalog, filters("sort=newest"), "id")[0].id,
    "engineer",
  );
  assert.deepEqual(
    discoverCareerPositions(catalog, filters("sort=title"), "id").map(
      (p) => p.id,
    ),
    ["designer", "engineer", "sitter"],
  );
  assert.equal(catalog[0].id, "sitter");
});
test("arrangement badges describe real data, including unspecified arrangements", () => {
  assert.equal(careerWorkMode(catalog[0], "id"), "On-site");
  assert.equal(careerWorkMode(catalog[1], "en"), "Hybrid");
  assert.equal(careerWorkMode(catalog[2], "id"), "WFH");
  assert.equal(
    careerWorkMode({ ...base, work_mode: undefined }, "en"),
    "Not specified",
  );
});
