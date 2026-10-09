import { redirect } from "next/navigation";
import { CareerPage } from "../components/CareerPage";
import JsonLd from "../components/seo/JsonLd";
import { getPublicCareers } from "../lib/public-careers";
import { absoluteUrl, breadcrumbSchema, pageMetadata } from "../lib/seo-config";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "Slivadoc Career — Lowongan Full-time, Part-time & Freelance",
  description:
    "Temukan lowongan Slivadoc: pet sitter, groomer, dokter hewan, pet taxi, teknologi, dan operasional. Pilih jenis kerja dan kirim CV melalui formulir sesuai posisi.",
  path: "/career",
});
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ position?: string }>;
}) {
  const { position } = await searchParams;
  if (position && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(position))
    redirect(`/career/${position}`);
  const catalog = await getPublicCareers();
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Beranda", path: "/" },
            { name: "Career", path: "/career" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Slivadoc Career",
            url: absoluteUrl("/career"),
            mainEntity: {
              "@type": "ItemList",
              itemListElement: catalog.data.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: p.title.id,
                url: absoluteUrl(`/career/${p.id}`),
              })),
            },
          },
        ]}
      />
      <CareerPage initialCatalog={catalog} />
    </>
  );
}
