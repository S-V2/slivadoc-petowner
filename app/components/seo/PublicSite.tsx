import { LocalizedCopy } from "../LocalizedCopy";
import { LocalizedLink as Link } from "../LocalizedCopy";
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { BrandLogo } from "../BrandLogo";
import { cityPages, guidePages, servicePages } from "../../lib/seo-content";

export function PublicHeader() {
  return (
    <header className="seo-header">
      <Link
        className="seo-brand"
        href="/"
        aria-label="Slivadoc, kembali ke beranda"
      >
        <BrandLogo priority />
      </Link>
      <nav aria-label="Navigasi publik Slivadoc">
        <Link href="/layanan">
          <LocalizedCopy>{"Layanan"}</LocalizedCopy>
        </Link>
        <Link href="/belanja">
          <LocalizedCopy>{"Belanja"}</LocalizedCopy>
        </Link>
        <Link href="/kota">
          <LocalizedCopy>{"Kota"}</LocalizedCopy>
        </Link>
        <Link href="/wilayah">
          <LocalizedCopy>{"Wilayah"}</LocalizedCopy>
        </Link>
        <Link href="/tempat">
          <LocalizedCopy>{"Tempat"}</LocalizedCopy>
        </Link>
        <Link href="/panduan">
          <LocalizedCopy>{"Panduan"}</LocalizedCopy>
        </Link>
        <Link href="/tentang">
          <LocalizedCopy>{"Tentang"}</LocalizedCopy>
        </Link>
        <Link className="seo-header-cta" href="/?view=discover">
          <LocalizedCopy>{"Buka Slivadoc"}</LocalizedCopy>
        </Link>
      </nav>
    </header>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="seo-site">
      <PublicHeader />
      <main>
        <LocalizedCopy>{children}</LocalizedCopy>
      </main>
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
      <LocalizedCopy>
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`}>
            <LocalizedCopy>
              {index > 0 && (
                <i aria-hidden="true">
                  <LocalizedCopy>{"/"}</LocalizedCopy>
                </i>
              )}
            </LocalizedCopy>
            <LocalizedCopy>
              {item.href ? (
                <Link href={item.href}>
                  <LocalizedCopy>{item.label}</LocalizedCopy>
                </Link>
              ) : (
                <b aria-current="page">
                  <LocalizedCopy>{item.label}</LocalizedCopy>
                </b>
              )}
            </LocalizedCopy>
          </span>
        ))}
      </LocalizedCopy>
    </nav>
  );
}

export function DiscoveryLinks() {
  return (
    <section
      className="seo-discovery-links sliva-discovery"
      aria-labelledby="seo-discovery-title"
    >
      <div className="seo-discovery-heading">
        <span>
          <LocalizedCopy>{"Jelajahi Slivadoc"}</LocalizedCopy>
        </span>
        <h2 id="seo-discovery-title">
          <LocalizedCopy>
            {"Semua kebutuhan anabul, lebih mudah ditemukan"}
          </LocalizedCopy>
        </h2>
        <p>
          <LocalizedCopy>
            {
              "Temukan layanan, produk, panduan, dan area pet care yang relevan sebelum melanjutkan ke aplikasi."
            }
          </LocalizedCopy>
        </p>
      </div>
      <div className="seo-discovery-columns">
        <div>
          <strong>
            <Icon name="heart" size={20} />
            <LocalizedCopy>{"Layanan populer"}</LocalizedCopy>
          </strong>
          <Link href="/pet-sitter">Pet Sitter & Dog Walking</Link>
          <LocalizedCopy>
            {servicePages.slice(0, 5).map((item) => (
              <Link key={item.slug} href={`/layanan/${item.slug}`}>
                <LocalizedCopy>{item.name}</LocalizedCopy>
              </Link>
            ))}
          </LocalizedCopy>
        </div>
        <div>
          <strong>
            <Icon name="bag" size={20} />
            <LocalizedCopy>{"Belanja & panduan"}</LocalizedCopy>
          </strong>
          <Link href="/belanja">
            <LocalizedCopy>{"Katalog kebutuhan pet"}</LocalizedCopy>
          </Link>
          <LocalizedCopy>
            {guidePages.slice(0, 3).map((item) => (
              <Link key={item.slug} href={`/panduan/${item.slug}`}>
                <LocalizedCopy>{item.title}</LocalizedCopy>
              </Link>
            ))}
          </LocalizedCopy>
        </div>
        <div>
          <strong>
            <Icon name="map" size={20} />
            <LocalizedCopy>{"Area layanan"}</LocalizedCopy>
          </strong>
          <Link href="/wilayah">
            <LocalizedCopy>{"Jelajahi seluruh Indonesia"}</LocalizedCopy>
          </Link>
          <LocalizedCopy>
            {cityPages.slice(0, 5).map((item) => (
              <Link key={item.slug} href={`/kota/${item.slug}`}>
                <LocalizedCopy>{"Pet care "}</LocalizedCopy>
                <LocalizedCopy>{item.name}</LocalizedCopy>
              </Link>
            ))}
          </LocalizedCopy>
        </div>
        <div>
          <strong>
            <Icon name="users" size={20} />
            <LocalizedCopy>{"Kenali manfaatnya"}</LocalizedCopy>
          </strong>
          <Link href="/career">Slivadoc Career</Link>
          <Link href="/untuk/pet-owner">
            <LocalizedCopy>{"Untuk pet owner"}</LocalizedCopy>
          </Link>
          <Link href="/mitra">
            <LocalizedCopy>{"Untuk pet clinic & bisnis hewan"}</LocalizedCopy>
          </Link>
          <Link href="/gratis">
            <LocalizedCopy>{"Program aplikasi gratis"}</LocalizedCopy>
          </Link>
          <Link href="/en">
            <LocalizedCopy>{"Pet care in Indonesia (English)"}</LocalizedCopy>
          </Link>
        </div>
      </div>
    </section>
  );
}
