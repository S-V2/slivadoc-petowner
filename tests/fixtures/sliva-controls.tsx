import { useState } from "react";
import { createRoot } from "react-dom/client";
import { PetOwnerLanguageProvider, usePetOwnerI18n } from "../../app/components/PetOwnerI18n";
import { SlivaDatePicker } from "../../app/components/SlivaDatePicker";
import { LocalizedCopy } from "../../app/components/LocalizedCopy";
import "../../app/sliva-select.css";
import "../../app/sliva-controls.css";

function Fixture() {
  const { setLanguage, t } = usePetOwnerI18n();
  const [submitted, setSubmitted] = useState("");
  const [birthDate, setBirthDate] = useState("2024-02-28");
  return <main style={{ maxWidth: 650, padding: 16, margin: "auto", fontFamily: "sans-serif" }}>
    <h1>{t("Tambah pet")}</h1>
    <button onClick={() => setLanguage("en")}>EN</button><button onClick={() => setLanguage("id")}>ID</button>
    <p><LocalizedCopy catalogue>Racikan kunyit segar spesial mitra</LocalizedCopy></p>
    <p><LocalizedCopy preserve>Milo</LocalizedCopy></p>
    <form style={{ display: "grid", gap: 16 }} onSubmit={(event) => { event.preventDefault(); setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))); }}>
      <label>{t("Tanggal lahir")}<SlivaDatePicker name="birth_date" aria-label="Birth date" required value={birthDate} min="2024-01-01" max="2024-12-31" onChange={(event) => setBirthDate(event.target.value)} /></label>
      <label>{t("Jam")}<SlivaDatePicker name="time" aria-label="Time" type="time" defaultValue="09:00" min="08:00" max="17:00" /></label>
      <button type="submit">{t("Simpan")}</button>
    </form>
    <p role="status" aria-label="Submitted payload">{submitted}</p>
  </main>;
}
createRoot(document.getElementById("root")!).render(<PetOwnerLanguageProvider><Fixture /></PetOwnerLanguageProvider>);
