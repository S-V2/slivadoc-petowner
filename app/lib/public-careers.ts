import { cache } from "react";
import type { CareerCatalog, CareerPosition } from "../../shared/careers";
import { absoluteUrl } from "./seo-config";

const API = (
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");
async function careerFetch(path: string) {
  return fetch(`${API}/api/v1/public/careers${path}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
}
export const getPublicCareers = cache(async (): Promise<CareerCatalog> => {
  const response = await careerFetch("");
  if (!response.ok)
    throw new Error(`Career catalog unavailable (${response.status})`);
  const catalog = (await response.json()) as CareerCatalog;
  if (
    !Array.isArray(catalog.data) ||
    typeof catalog.consent_version !== "string"
  )
    throw new Error("Invalid career catalog");
  return catalog;
});
export const getPublicCareer = cache(
  async (
    id: string,
  ): Promise<{ data: CareerPosition; consent_version: string } | null> => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 100) return null;
    const response = await careerFetch(`/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok)
      throw new Error(`Career unavailable (${response.status})`);
    return response.json();
  },
);
const escapeHTML = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function careerJobSchema(p: CareerPosition) {
  // Talent pools and jobs without a confirmed location are not Google job listings.
  if (
    p.status !== "open" ||
    !p.published_at ||
    (!p.city?.trim() && p.work_mode !== "remote") ||
    (p.closes_at && Date.parse(p.closes_at) <= Date.now())
  )
    return null;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: p.title.id,
    description: `<p>${escapeHTML(p.summary.id)}</p><h2>Tanggung jawab</h2><ul>${p.responsibilities.map((x) => `<li>${escapeHTML(x.id)}</li>`).join("")}</ul><h2>Persyaratan</h2><ul>${p.requirements.map((x) => `<li>${escapeHTML(x.id)}</li>`).join("")}</ul>`,
    identifier: { "@type": "PropertyValue", name: "Slivadoc", value: p.id },
    datePosted: p.published_at,
    ...(p.closes_at ? { validThrough: p.closes_at } : {}),
    employmentType: p.employment_types,
    directApply: true,
    url: absoluteUrl(`/career/${p.id}`),
    hiringOrganization: {
      "@type": "Organization",
      name: "Slivadoc",
      sameAs: absoluteUrl("/"),
      logo: absoluteUrl("/brand/slivadoc-logo.png"),
    },
    ...(p.work_mode === "remote"
      ? {
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: {
            "@type": "Country",
            name: "Indonesia",
          },
        }
      : {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: p.city,
              ...(p.region ? { addressRegion: p.region } : {}),
              addressCountry: "ID",
            },
          },
        }),
  };
}
