import { LegalPublicPage } from "../components/LegalPublicPage";
import { pageMetadata } from "../lib/seo-config";

export const metadata = pageMetadata({ title: "Kebijakan Privasi Slivadoc", description: "Kebijakan lengkap mengenai data pribadi, dasar pemrosesan, penerima, retensi, keamanan, dan hak pengguna Slivadoc di Indonesia.", path: "/privacy" });
export default function PrivacyPage() { return <LegalPublicPage policy="privacy"/>; }
