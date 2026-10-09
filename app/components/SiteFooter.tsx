"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { SEO } from "../lib/seo-config";
import {
  footerCopy,
  footerNavigation,
  slivadocAppStores,
  slivadocSupport,
} from "../../shared/site-footer";

function StoreIcon({ platform }: { platform: "google" | "apple" }) {
  return (
    <svg
      width="27"
      height="30"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {platform === "google" ? (
        <>
          <path d="m3.5 2 11 10-11 10V2Z" />
          <path d="m5.4 1.8 12.2 7-2.1 2.1L5.4 1.8Zm11.2 10.1 2.2-2.1 2.1 1.2c.8.5.8 1.5 0 2l-2.1 1.2-2.2-2.3Zm-1.1 1.2 2.1 2.1-12.2 7 10.1-9.1Z" />
        </>
      ) : (
        <path d="M16.7 12.8c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.8-2.6-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.1 2.6 2 1-.1 1.4-.7 2.7-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.2-2.4 1.2-2.5-.1 0-2.5-1-2.5-3.5ZM14.6 6.7c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2-.5 2.7-1.3Z" />
      )}
    </svg>
  );
}

/** The only site footer, mounted once in RootLayout for every public route. */
export function SiteFooter() {
  const pathname = usePathname();
  const { language: selectedLanguage } = usePetOwnerI18n();
  const language = pathname === "/en" ? "en" : selectedLanguage;
  const c = footerCopy[language];

  return (
    <footer
      className={`sliva-site-footer${pathname === "/" ? " sliva-site-footer--app" : ""}`}
      lang={language}
      aria-label={c.label}
    >
      <section
        className="sliva-footer-apps"
        aria-labelledby="footer-apps-title"
      >
        <div className="sliva-footer-app-copy">
          <span className="sliva-footer-eyebrow">
            <Icon name="phone" size={16} />
            {c.appEyebrow}
          </span>
          <h2 id="footer-apps-title">{c.appTitle}</h2>
          <p>{c.appDescription}</p>
        </div>
        <div className="sliva-footer-stores">
          {slivadocAppStores.map((store) => {
            const content = (
              <>
                <StoreIcon platform={store.platform} />
                <span>
                  <small>{store.url ? c.download : store.os}</small>
                  <strong>{store.name}</strong>
                </span>
              </>
            );
            return (
              <div className="sliva-footer-store" key={store.platform}>
                {store.url ? (
                  <a
                    className="sliva-store-badge"
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${c.downloadLabel} ${store.name}`}
                  >
                    {content}
                  </a>
                ) : (
                  <div className="sliva-store-badge sliva-store-badge--soon">
                    {content}
                  </div>
                )}
                {!store.url && (
                  <span className="sliva-store-status">
                    <span aria-hidden="true" />
                    {c.comingSoon}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="sliva-footer-directory">
        <div className="sliva-footer-brand">
          <Link href="/" aria-label={c.home}>
            <BrandLogo />
          </Link>
          <p className="sliva-footer-tagline">{c.brandTagline}</p>
          <p>{c.brandDescription}</p>
          <span className="sliva-footer-country">
            <Icon name="map" size={16} />
            Indonesia
          </span>
        </div>
        <nav className="sliva-footer-nav" aria-label={c.label}>
          {footerNavigation.map((group) => (
            <section key={group.title.id}>
              <h2>{group.title[language]}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link prefetch={false} href={link.href}>
                      {link.label[language]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      </div>

      <section
        className="sliva-footer-support"
        aria-labelledby="footer-support-title"
      >
        <div className="sliva-footer-contact">
          <span className="sliva-footer-support-icon">
            <Icon name="chat" size={24} />
          </span>
          <div>
            <h2 id="footer-support-title">{c.supportTitle}</h2>
            <a
              className="sliva-footer-email"
              href={`mailto:${slivadocSupport.email}`}
            >
              {slivadocSupport.email}
              <Icon name="arrow" size={18} />
            </a>
            <p className="sliva-footer-hours">
              <Icon name="clock" size={16} />
              <span>
                {c.supportHours}
                <strong>{slivadocSupport.hours}</strong>
              </span>
            </p>
            <p>{c.supportNote}</p>
          </div>
        </div>
        <div className="sliva-footer-help">
          <h3>{c.guideTitle}</h3>
          <p>{c.guideDescription}</p>
          <Link href="/help">
            {c.guideLink}
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>

      <div className="sliva-footer-bottom">
        <small>
          © 2023 {SEO.legalName}. {c.copyright}
        </small>
        <div>
          <span>Indonesia · WIB ({slivadocSupport.timezone})</span>
          <a href="#slivadoc-top">
            {c.backTop}
            <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
