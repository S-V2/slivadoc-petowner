"use client";
import { LocalizedButton, LocalizedCopy } from "./LocalizedCopy";

export function CatalogStatus({ loading, error, empty, title, note, onRetry }: { loading: boolean; error: boolean; empty: boolean; title: string; note: string; onRetry: () => void }) {
  if (!loading && !error && !empty) return null;
  return <div className="empty-state world-catalog-status" role={error ? "alert" : "status"} aria-live="polite">
    <h3><LocalizedCopy>{loading ? "Memuat informasi terbaru…" : error ? "Informasi belum dapat dimuat" : title}</LocalizedCopy></h3>
    {!loading && <p><LocalizedCopy>{error ? "Periksa koneksi internet lalu coba lagi." : note}</LocalizedCopy></p>}
    {!loading && <LocalizedButton type="button" className="secondary-button" onClick={onRetry}><LocalizedCopy>{error ? "Coba lagi" : "Muat ulang"}</LocalizedCopy></LocalizedButton>}
  </div>;
}
