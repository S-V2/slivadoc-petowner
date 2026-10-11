import type { Metadata } from "next";
import ManualClinicDetail from "../../components/clinics/ManualClinicDetail";

export const metadata: Metadata = { title: "Informasi Petshop & Petclinic | Slivadoc" };

export default async function DirectoryPlacePage({ params }: { params: Promise<{ placeID: string }> }) {
  const { placeID } = await params;
  return <ManualClinicDetail placeID={placeID} />;
}
