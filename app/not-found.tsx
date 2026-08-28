import Link from "next/link";
import { PublicPage } from "./components/seo/PublicSite";

export default function NotFound(){return <PublicPage><section className="seo-main-section"><div className="seo-empty"><span className="seo-eyebrow">404</span><h1>Halaman tidak ditemukan</h1><p>Alamat mungkin berubah atau konten sudah tidak tersedia.</p><div className="seo-hero-actions" style={{justifyContent:"center"}}><Link className="seo-primary" href="/">Kembali ke Slivadoc</Link><Link className="seo-secondary" href="/layanan">Jelajahi layanan</Link></div></div></section></PublicPage>}
