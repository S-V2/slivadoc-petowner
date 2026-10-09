import { notFound } from "next/navigation";
import { CareerPage } from "../../components/CareerPage";
import JsonLd from "../../components/seo/JsonLd";
import {
  getPublicCareer,
  getPublicCareers,
  careerJobSchema,
} from "../../lib/public-careers";
import { breadcrumbSchema, pageMetadata } from "../../lib/seo-config";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const result = await getPublicCareer(slug);
  if (!result)
    return pageMetadata({
      title: "Posisi tidak tersedia",
      description: "Lihat peluang lain di Slivadoc Career.",
      path: `/career/${slug}`,
      noIndex: true,
    });
  return pageMetadata({
    title: `${result.data.title.id} — Slivadoc Career`,
    description: result.data.summary.id.slice(0, 170),
    path: `/career/${slug}`,
  });
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const [result, catalog] = await Promise.all([
    getPublicCareer(slug),
    getPublicCareers(),
  ]);
  if (!result) notFound();
  const job = careerJobSchema(result.data);
  const breadcrumb = breadcrumbSchema([
    { name: "Beranda", path: "/" },
    { name: "Career", path: "/career" },
    { name: result.data.title.id, path: `/career/${slug}` },
  ]);
  return (
    <>
      <JsonLd data={job ? [breadcrumb, job] : breadcrumb} />
      <CareerPage
        initialCatalog={{
          data: catalog.data,
          consent_version: result.consent_version,
        }}
        initialPosition={result.data}
      />
    </>
  );
}
