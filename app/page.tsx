import PetOwnerApp from "./components/PetOwnerApp";
import JsonLd from "./components/seo/JsonLd";
import { DiscoveryLinks } from "./components/seo/PublicSite";
import { SEO, absoluteUrl } from "./lib/seo-config";

export default function Home() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SEO.brand,
    legalName: SEO.legalName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/slivadoc-logo.png"),
    description: SEO.defaultDescription,
    areaServed: { "@type": "Country", name: "Indonesia" },
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: absoluteUrl("/"),
    name: SEO.brand,
    alternateName: ["Slivadoc Pet Care", "Slivadoc Pet Owner"],
    inLanguage: SEO.language,
    publisher: { "@id": absoluteUrl("/#organization") },
  };

  return (
    <>
      <JsonLd data={[organization, website]} />
      <PetOwnerApp />
      <div className="app-home-seo">
        <DiscoveryLinks />
      </div>
    </>
  );
}
