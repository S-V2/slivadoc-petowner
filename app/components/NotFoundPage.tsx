"use client";

import Link from "next/link";
import { BrandMark } from "./BrandLogo";
import { Icon } from "./Icon";
import { LegalLanguageSelector } from "./LegalDocumentHeader";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { PublicPage } from "./seo/PublicSite";

export function NotFoundPage({ career = false }: { career?: boolean }) {
  const { language, setLanguage } = usePetOwnerI18n();
  const en = language === "en";
  const destinations = [
    {
      href: "/career",
      icon: "bag" as const,
      title: "Slivadoc Career",
      note: en
        ? "Explore roles and opportunities to grow."
        : "Jelajahi posisi dan kesempatan untuk bertumbuh.",
    },
    {
      href: "/services",
      icon: "heart" as const,
      title: en ? "Pet care services" : "Layanan pet care",
      note: en
        ? "Find the care your companion needs."
        : "Temukan perawatan yang dibutuhkan sahabatmu.",
    },
    {
      href: "/help",
      icon: "chat" as const,
      title: en ? "Help centre" : "Pusat bantuan",
      note: en
        ? "Get help finding your next step."
        : "Dapatkan bantuan untuk langkah berikutnya.",
    },
  ];
  return (
    <PublicPage>
      <section
        className="sliva-not-found"
        lang={language}
        aria-labelledby="not-found-title"
      >
        <div className="not-found-toolbar">
          <Link className="career-back" href="/">
            <span aria-hidden="true">←</span>
            {en ? "Home" : "Beranda"}
          </Link>
          <LegalLanguageSelector language={language} onChange={setLanguage} />
        </div>
        <div className="not-found-hero">
          <div className="not-found-art" aria-hidden="true">
            <div className="not-found-orbit" />
            <div className="not-found-code">
              <span>4</span>
              <span className="not-found-logo">
                <BrandMark size={96} />
              </span>
              <span>4</span>
            </div>
            <span className="not-found-caption">
              One Platform. Every Animal.
            </span>
          </div>
          <div className="not-found-copy">
            <span className="not-found-eyebrow">
              {en ? "A SMALL DETOUR" : "SEDIKIT SALAH JALAN"}
            </span>
            <h1 id="not-found-title">
              {career
                ? en
                  ? "This opportunity is no longer available."
                  : "Kesempatan ini belum tersedia."
                : en
                  ? "This page has wandered off."
                  : "Halaman ini belum ditemukan."}
            </h1>
            <p>
              {career
                ? en
                  ? "The role may have closed or the link may have changed. Explore the latest opportunities at Slivadoc."
                  : "Posisi mungkin sudah ditutup atau tautannya berubah. Kamu tetap bisa menjelajahi kesempatan terbaru di Slivadoc."
                : en
                  ? "The address may have changed, the link may be incomplete, or the content may no longer be available. Let’s find your way back."
                  : "Alamat mungkin berubah, tautan kurang lengkap, atau kontennya sudah tidak tersedia. Yuk, temukan jalan kembali."}
            </p>
            <div className="not-found-actions">
              <Link className="seo-primary" href={career ? "/career" : "/"}>
                {career
                  ? en
                    ? "Explore opportunities"
                    : "Jelajahi lowongan"
                  : en
                    ? "Back to Slivadoc"
                    : "Kembali ke Slivadoc"}
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                className="seo-secondary"
                href={career ? "/" : "/pet-sitter"}
              >
                {career
                  ? en
                    ? "Home"
                    : "Beranda"
                  : en
                    ? "Find a pet sitter"
                    : "Cari pet sitter"}
              </Link>
            </div>
            <small>
              {en
                ? "Error code: 404 · Page not found"
                : "Kode error: 404 · Halaman tidak ditemukan"}
            </small>
          </div>
        </div>
        <div className="not-found-destinations">
          <h2>{en ? "Your next stop" : "Lanjut ke tujuanmu"}</h2>
          <div>
            {destinations.map((item) => (
              <Link className="not-found-card" href={item.href} key={item.href}>
                <span className="not-found-card-icon">
                  <Icon name={item.icon} size={23} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                </div>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
