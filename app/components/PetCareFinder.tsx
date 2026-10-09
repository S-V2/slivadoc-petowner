"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePetOwnerI18n } from "./PetOwnerI18n";
export function PetCareFinder() {
  const { language } = usePetOwnerI18n();
  const en = language === "en";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{
    title: string;
    href: string;
  }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function search(e: FormEvent) {
    e.preventDefault();
    if (busy || query.trim().length < 3) return;
    setBusy(true);
    setError(false);
    try {
      const r = await fetch(
        `/api/pet-care/search?q=${encodeURIComponent(query)}`,
      );
      if (!r.ok) throw new Error();
      const body = await r.json();
      setResults(body.data);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="seo-main-section pet-care-finder">
      <h2>{en ? "What does your pet need?" : "Apa kebutuhan pet kamu?"}</h2>
      <p>
        {en
          ? "Find service guides or career opportunities. Check current locations and availability in the app."
          : "Temukan panduan layanan atau peluang karier. Periksa lokasi dan ketersediaan terkini di aplikasi."}
      </p>
      <form onSubmit={search} className="career-search">
        <input
          aria-label={en ? "Search pet care" : "Cari pet care"}
          minLength={3}
          maxLength={180}
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            en
              ? "e.g. pet groomer or freelance pet sitter"
              : "Contoh: pet groomer Jakarta atau freelance pet sitter"
          }
        />
        <button
          className="seo-primary"
          disabled={busy || query.trim().length < 3}
        >
          {busy ? "…" : en ? "Search" : "Cari"}
        </button>
      </form>
      <div aria-live="polite">
        {error ? (
          <p>
            {en
              ? "Search unavailable. Please try again."
              : "Pencarian belum tersedia. Coba lagi."}
          </p>
        ) : (
          results &&
          (results.length ? (
            <nav
              className="seo-hero-actions"
              aria-label={en ? "Search results" : "Hasil pencarian"}
            >
              {results.map((r) => (
                <Link className="seo-secondary" key={r.href} href={r.href}>
                  {r.title} →
                </Link>
              ))}
            </nav>
          ) : (
            <p>
              {en
                ? "Try pet sitter, grooming, veterinarian, or career."
                : "Coba pet sitter, grooming, dokter hewan, atau lowongan part time."}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
