import { LocalizedCopy } from "../LocalizedCopy";
import { LocalizedLink as Link } from "../LocalizedCopy";
import type { ReactNode } from "react";
import { cityPages, guidePages, servicePages } from "../../lib/seo-content";

export function PublicHeader() {
  return (
    <header className="seo-header">
      <Link
        className="seo-brand"
        href="/"
        aria-label="Slivadoc, kembali ke beranda"
      >
        <span><LocalizedCopy>{"SLIVA"}</LocalizedCopy></span><LocalizedCopy>{"DOC"}</LocalizedCopy></Link>
      <nav aria-label="Navigasi publik Slivadoc">
        <Link href="/services"><LocalizedCopy>{"Layanan"}</LocalizedCopy></Link>
        <Link href="/shop"><LocalizedCopy>{"Belanja"}</LocalizedCopy></Link>
        <Link href="/cities"><LocalizedCopy>{"Kota"}</LocalizedCopy></Link>
        <Link href="/regions"><LocalizedCopy>{"Wilayah"}</LocalizedCopy></Link>
        <Link href="/places"><LocalizedCopy>{"Tempat"}</LocalizedCopy></Link>
        <Link href="/guides"><LocalizedCopy>{"Panduan"}</LocalizedCopy></Link>
        <Link href="/about"><LocalizedCopy>{"Tentang"}</LocalizedCopy></Link>
        <Link className="seo-header-cta" href="/?view=discover"><LocalizedCopy>{"Buka Slivadoc"}</LocalizedCopy></Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="seo-footer">
      <div>
        <Link className="seo-brand" href="/">
          <span><LocalizedCopy>{"SLIVA"}</LocalizedCopy></span><LocalizedCopy>{"DOC"}</LocalizedCopy></Link>
        <p><LocalizedCopy>{"One Platform. Every Animal. One Connected Ecosystem."}</LocalizedCopy></p>
      </div>
      <div>
        <strong><LocalizedCopy>{"Jelajahi"}</LocalizedCopy></strong>
        <Link href="/services"><LocalizedCopy>{"Layanan pet care"}</LocalizedCopy></Link>
        <Link href="/shop"><LocalizedCopy>{"Belanja kebutuhan pet"}</LocalizedCopy></Link>
        <Link href="/cities"><LocalizedCopy>{"Layanan berdasarkan kota"}</LocalizedCopy></Link>
        <Link href="/regions"><LocalizedCopy>{"Seluruh wilayah Indonesia"}</LocalizedCopy></Link>
        <Link href="/places"><LocalizedCopy>{"Direktori tempat"}</LocalizedCopy></Link>
        <Link href="/guides"><LocalizedCopy>{"Panduan pet parent"}</LocalizedCopy></Link>
      </div>
      <div>
        <strong><LocalizedCopy>{"Perusahaan"}</LocalizedCopy></strong>
        <Link href="/about"><LocalizedCopy>{"Tentang Slivadoc"}</LocalizedCopy></Link>
        <Link href="/partners"><LocalizedCopy>{"Mitra pet business"}</LocalizedCopy></Link>
        <Link href="/for/pet-owner"><LocalizedCopy>{"Manfaat untuk pet owner"}</LocalizedCopy></Link>
        <Link href="/free"><LocalizedCopy>{"Program gratis Slivadoc"}</LocalizedCopy></Link>
        <Link href="/en"><LocalizedCopy>{"English"}</LocalizedCopy></Link>
        <Link href="/?view=community"><LocalizedCopy>{"Komunitas"}</LocalizedCopy></Link>
      </div>
      <div>
        <strong><LocalizedCopy>{"Bantuan & kebijakan"}</LocalizedCopy></strong>
        <Link href="/help"><LocalizedCopy>{"Pusat bantuan"}</LocalizedCopy></Link>
        <Link href="/terms"><LocalizedCopy>{"Syarat & ketentuan"}</LocalizedCopy></Link>
        <Link href="/privacy"><LocalizedCopy>{"Privasi & data"}</LocalizedCopy></Link>
        <a href="mailto:support@slivadoc.com"><LocalizedCopy>{"support@slivadoc.com"}</LocalizedCopy></a>
      </div>
      <small><LocalizedCopy>{"© "}</LocalizedCopy><LocalizedCopy>{new Date().getUTCFullYear()}</LocalizedCopy><LocalizedCopy>{" PT Sliva Technology Indonesia"}</LocalizedCopy></small>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="seo-site">
      <PublicHeader />
      <main><LocalizedCopy>{children}</LocalizedCopy></main>
      <PublicFooter />
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav className="seo-breadcrumbs" aria-label="Breadcrumb">
      <LocalizedCopy>{items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          <LocalizedCopy>{index > 0 && <i aria-hidden="true"><LocalizedCopy>{"/"}</LocalizedCopy></i>}</LocalizedCopy>
          <LocalizedCopy>{item.href ? (
            <Link href={item.href}><LocalizedCopy>{item.label}</LocalizedCopy></Link>
          ) : (
            <b aria-current="page"><LocalizedCopy>{item.label}</LocalizedCopy></b>
          )}</LocalizedCopy>
        </span>
      ))}</LocalizedCopy>
    </nav>
  );
}

export function DiscoveryLinks() {
  return (
    <section
      className="seo-discovery-links"
      aria-labelledby="seo-discovery-title"
    >
      <div className="seo-discovery-heading">
        <span><LocalizedCopy>{"Jelajahi Slivadoc"}</LocalizedCopy></span>
        <h2 id="seo-discovery-title"><LocalizedCopy>{"Semua kebutuhan anabul, lebih mudah ditemukan"}</LocalizedCopy></h2>
        <p><LocalizedCopy>{"Temukan layanan, produk, panduan, dan area pet care yang relevan sebelum melanjutkan ke aplikasi."}</LocalizedCopy></p>
      </div>
      <div className="seo-discovery-columns">
        <div>
          <strong><LocalizedCopy>{"Layanan populer"}</LocalizedCopy></strong>
          <LocalizedCopy>{servicePages.slice(0, 5).map((item) => (
            <Link key={item.slug} href={`/services/${item.slug}`}>
              <LocalizedCopy>{item.name}</LocalizedCopy>
            </Link>
          ))}</LocalizedCopy>
        </div>
        <div>
          <strong><LocalizedCopy>{"Belanja & panduan"}</LocalizedCopy></strong>
          <Link href="/shop"><LocalizedCopy>{"Katalog kebutuhan pet"}</LocalizedCopy></Link>
          <LocalizedCopy>{guidePages.slice(0, 3).map((item) => (
            <Link key={item.slug} href={`/guides/${item.slug}`}>
              <LocalizedCopy>{item.title}</LocalizedCopy>
            </Link>
          ))}</LocalizedCopy>
        </div>
        <div>
          <strong><LocalizedCopy>{"Area layanan"}</LocalizedCopy></strong>
          <Link href="/regions"><LocalizedCopy>{"Jelajahi seluruh Indonesia"}</LocalizedCopy></Link>
          <LocalizedCopy>{cityPages.slice(0, 5).map((item) => (
            <Link key={item.slug} href={`/cities/${item.slug}`}><LocalizedCopy>{"Pet care "}</LocalizedCopy><LocalizedCopy>{item.name}</LocalizedCopy>
            </Link>
          ))}</LocalizedCopy>
        </div>
        <div>
          <strong><LocalizedCopy>{"Kenali manfaatnya"}</LocalizedCopy></strong>
          <Link href="/for/pet-owner"><LocalizedCopy>{"Untuk pet owner"}</LocalizedCopy></Link>
          <Link href="/partners"><LocalizedCopy>{"Untuk pet clinic & bisnis hewan"}</LocalizedCopy></Link>
          <Link href="/free"><LocalizedCopy>{"Program aplikasi gratis"}</LocalizedCopy></Link>
          <Link href="/en"><LocalizedCopy>{"Pet care in Indonesia (English)"}</LocalizedCopy></Link>
        </div>
      </div>
    </section>
  );
}
