import { BrandLogo } from "./components/BrandLogo";

export default function Loading() {
  return (
    <main className="petowner-loading" role="status" aria-live="polite">
      <BrandLogo markOnly priority />
      <h1>Menyiapkan Slivadoc</h1>
      <p>Memuat pengalaman terbaik untuk pet dan keluarga Anda.</p>
      <span aria-hidden="true">
        <i />
      </span>
    </main>
  );
}
