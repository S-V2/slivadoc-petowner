import { BrandLogo } from "./BrandLogo";

export function OpeningExperience() {
  return (
    <main className="petowner-loading" role="status" aria-live="polite">
      <span className="opening-aurora opening-aurora--sky" aria-hidden="true" />
      <span className="opening-aurora opening-aurora--mint" aria-hidden="true" />
      <div className="opening-stage">
        <span className="opening-eyebrow">SLIVADOC PET CARE ECOSYSTEM</span>
        <div className="opening-visual" aria-hidden="true">
          <i className="opening-orbit opening-orbit--outer" />
          <i className="opening-orbit opening-orbit--inner" />
          <span className="opening-satellite opening-satellite--health">+</span>
          <span className="opening-satellite opening-satellite--care">♥</span>
          <BrandLogo markOnly priority />
        </div>
        <div className="opening-copy">
          <h1>Satu dunia untuk setiap langkah kecilnya.</h1>
          <p>
            Menyatukan kesehatan, care, aktivitas, dan marketplace pet-mu dalam
            satu pengalaman yang hangat.
          </p>
        </div>
        <div className="opening-signals" aria-hidden="true">
          <span><i /> HEALTH</span>
          <span><i /> CARE</span>
          <span><i /> MARKET</span>
        </div>
        <div className="opening-progress" aria-hidden="true">
          <div><span>Menyiapkan ruang pet-mu</span><b>LIVE SYNC</b></div>
          <i><em /></i>
        </div>
      </div>
    </main>
  );
}
