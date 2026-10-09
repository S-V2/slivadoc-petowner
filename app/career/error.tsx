"use client";
import Link from "next/link";
import { usePetOwnerI18n } from "../components/PetOwnerI18n";
import { PublicPage } from "../components/seo/PublicSite";
export default function CareerError({ reset }: { reset: () => void }) {
  const { language } = usePetOwnerI18n();
  const en = language === "en";
  return (
    <PublicPage>
      <section className="career-empty">
        <h1>
          {en
            ? "Career is temporarily unavailable"
            : "Career sementara belum tersedia"}
        </h1>
        <p>
          {en
            ? "We could not load the latest opportunities. Please try again."
            : "Peluang terbaru belum dapat dimuat. Silakan coba lagi."}
        </p>
        <button className="career-primary" onClick={reset}>
          {en ? "Try again" : "Coba lagi"}
        </button>
        <Link className="career-back" href="/">
          {en ? "Back to home" : "Kembali ke beranda"}
        </Link>
      </section>
    </PublicPage>
  );
}
