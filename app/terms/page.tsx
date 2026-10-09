import { LegalPublicPage } from "../components/LegalPublicPage";
import { pageMetadata } from "../lib/seo-config";

export const metadata = pageMetadata({ title: "Syarat dan Ketentuan Slivadoc", description: "Ketentuan lengkap penggunaan Slivadoc, transaksi, pembayaran, refund, layanan pet, komunitas, tanggung jawab, dan penyelesaian sengketa.", path: "/terms" });
export default function TermsPage() { return <LegalPublicPage policy="terms"/>; }
