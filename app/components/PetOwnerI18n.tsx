"use client";
import { httpTranslator } from "../../shared/translation-client";
import { configureTranslator, subscribeTranslations, translationSnapshot } from "../../shared/translation-store";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";

import { translateText } from "../../shared/i18n";

export type PetOwnerLanguage = "id" | "en";

type ContextValue = {
  translationRevision: number;
  language: PetOwnerLanguage;
  locale: "id-ID" | "en-US";
  setLanguage: (language: PetOwnerLanguage) => void;
  t: (value: string) => string;
};

const LanguageContext = createContext<ContextValue | null>(null);
const storageKey = "slivadoc.petowner.language";

export function PetOwnerLanguageProvider({ children }: PropsWithChildren) {
  const translationRevision = useSyncExternalStore(subscribeTranslations, translationSnapshot, () => 0);
  useEffect(() => {
    configureTranslator(httpTranslator(process.env.NEXT_PUBLIC_PETOWNER_API_URL ?? "http://localhost:8090"));
  }, []);
  const [language, setLanguageState] = useState<PetOwnerLanguage>("id");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "id" || stored === "en") {
      document.documentElement.lang = stored;
      queueMicrotask(() => setLanguageState(stored));
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: PetOwnerLanguage) => {
    document.documentElement.lang = next;
    setLanguageState(next);
    window.localStorage.setItem(storageKey, next);
  }, []);
  const t = useCallback(
    (value: string) => translateText(value, language),
    [language],
  );
  const value = useMemo<ContextValue>(
    () => ({
      translationRevision,
      language,
      locale: language === "en" ? "en-US" : "id-ID",
      setLanguage,
      t,
    }),
    [language, setLanguage, t, translationRevision],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function usePetOwnerI18n() {
  const value = useContext(LanguageContext);
  return value ?? { translationRevision: 0, language: "id", locale: "id-ID", setLanguage: () => {}, t: (text: string) => text };
}
