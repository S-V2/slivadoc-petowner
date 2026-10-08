"use client";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { LocalizedButton, LocalizedCopy } from "./LocalizedCopy";

export function LanguageToggle() {
  const { language, setLanguage, t } = usePetOwnerI18n();
  return (
    <div className="seo-hero-actions" role="group" aria-label={t("Bahasa halaman")}>
      <LocalizedButton
        type="button"
        className={language === "id" ? "seo-primary" : "seo-secondary"}
        aria-pressed={language === "id"}
        onClick={() => setLanguage("id")}
      >
        <LocalizedCopy>{"ID"}</LocalizedCopy>
      </LocalizedButton>
      <LocalizedButton
        type="button"
        className={language === "en" ? "seo-primary" : "seo-secondary"}
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        <LocalizedCopy>{"EN"}</LocalizedCopy>
      </LocalizedButton>
    </div>
  );
}
