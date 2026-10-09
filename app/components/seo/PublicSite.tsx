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
              <Link key={item.slug} href={`/services/${item.slug}`}>
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
          <Link href="/shop">
            <LocalizedCopy>{"Katalog kebutuhan pet"}</LocalizedCopy>
          </Link>
          <LocalizedCopy>
            {guidePages.slice(0, 3).map((item) => (
              <Link key={item.slug} href={`/guides/${item.slug}`}>
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
          <Link href="/regions">
            <LocalizedCopy>{"Jelajahi seluruh Indonesia"}</LocalizedCopy>
          </Link>
          <LocalizedCopy>
            {cityPages.slice(0, 5).map((item) => (
              <Link key={item.slug} href={`/cities/${item.slug}`}>
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
          <Link href="/for/pet-owner">
            <LocalizedCopy>{"Untuk pet owner"}</LocalizedCopy>
          </Link>
          <Link href="/partners">
            <LocalizedCopy>{"Untuk pet clinic & bisnis hewan"}</LocalizedCopy>
          </Link>
          <Link href="/free">
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
