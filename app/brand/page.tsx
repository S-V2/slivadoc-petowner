import type { Metadata } from "next";
import BrandPortal from "./portal";

export const metadata: Metadata = {
  title: "Official Brand workspace",
  description:
    "Workspace privat Official Brand Slivadoc untuk produk, PO, income, dan pengiriman.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/brand" },
};
export default function BrandPage() {
  return <BrandPortal />;
}
