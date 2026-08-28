import Link from "next/link";
import type { ReactNode } from "react";
import { cityPages, guidePages, servicePages } from "../../lib/seo-content";

export function PublicHeader() {
  return (
    <header className="seo-header">
      <Link className="seo-brand" href="/" aria-label="Slivadoc, kembali ke beranda">
        <span>SLIVA</span>DOC
      </Link>
      <nav aria-label="Navigasi publik Slivadoc">
        <Link href="/layanan">Layanan</Link>
        <Link href="/kota">Kota</Link>
        <Link href="/tempat">Tempat</Link>
        <Link href="/panduan">Panduan</Link>
        <Link href="/tentang">Tentang</Link>
        <Link className="seo-header-cta" href="/?view=discover">Buka Slivadoc</Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="seo-footer">
      <div>
        <Link className="seo-brand" href="/"><span>SLIVA</span>DOC</Link>
        <p>One Platform. Every Animal. One Connected Ecosystem.</p>
      </div>
      <div>
        <strong>Jelajahi</strong>
        <Link href="/layanan">Layanan pet care</Link>
        <Link href="/kota">Layanan berdasarkan kota</Link>
        <Link href="/tempat">Direktori tempat</Link>
        <Link href="/panduan">Panduan pet parent</Link>
      </div>
      <div>
        <strong>Perusahaan</strong>
        <Link href="/tentang">Tentang Slivadoc</Link>
        <Link href="/mitra">Mitra pet business</Link>
        <Link href="/?view=community">Komunitas</Link>
      </div>
      <small>© {new Date().getUTCFullYear()} PT Sliva Technology Indonesia</small>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="seo-site">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="seo-breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <i aria-hidden="true">/</i>}
          {item.href ? <Link href={item.href}>{item.label}</Link> : <b aria-current="page">{item.label}</b>}
        </span>
      ))}
    </nav>
  );
}

export function DiscoveryLinks() {
  return (
    <section className="seo-discovery-links" aria-labelledby="seo-discovery-title">
      <div className="seo-discovery-heading">
        <span>Jelajahi Slivadoc</span>
        <h2 id="seo-discovery-title">Semua kebutuhan anabul, lebih mudah ditemukan</h2>
        <p>Temukan layanan, panduan, dan area pet care yang relevan sebelum melanjutkan ke aplikasi.</p>
      </div>
      <div className="seo-discovery-columns">
        <div><strong>Layanan populer</strong>{servicePages.slice(0, 5).map((item) => <Link key={item.slug} href={`/layanan/${item.slug}`}>{item.name}</Link>)}</div>
        <div><strong>Panduan terbaru</strong>{guidePages.slice(0, 4).map((item) => <Link key={item.slug} href={`/panduan/${item.slug}`}>{item.title}</Link>)}</div>
        <div><strong>Area layanan</strong>{cityPages.slice(0, 5).map((item) => <Link key={item.slug} href={`/kota/${item.slug}`}>Pet care {item.name}</Link>)}</div>
      </div>
    </section>
  );
}
