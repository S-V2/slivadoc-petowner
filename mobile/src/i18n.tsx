import { httpTranslator } from "../../shared/translation-client";
import { configureTranslator, subscribeTranslations, translationSnapshot } from "../../shared/translation-store";
import { PETOWNER_API_URL } from "./api";
import { translateText } from "../../shared/i18n";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
} from "react-native";

import { colors, typography } from "./theme";

export type AppLanguage = "id" | "en";

export const languageOptions: ReadonlyArray<{
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}> = [
  { code: "id", label: "Bahasa Indonesia", nativeLabel: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "en", label: "Bahasa Inggris", nativeLabel: "English", flag: "🇬🇧" },
];

const LANGUAGE_KEY = "slivadoc_mobile_language";
const localeByLanguage: Record<AppLanguage, string> = {
  id: "id-ID",
  en: "en-US",
};

export function translateCopy(value: string, language: AppLanguage) {
  return translateText(value, language);
}

function translateNode(node: ReactNode, language: AppLanguage, catalogue = false): ReactNode {
  if (typeof node === "string") return translateText(node, language, catalogue);
  if (Array.isArray(node)) return node.map((child) => translateNode(child, language, catalogue));
  return node;
}

type I18nContextValue = {
  translationRevision: number;
  language: AppLanguage;
  locale: string;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (value: string) => string;
  formatCurrency: (value: number) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const translationRevision = useSyncExternalStore(subscribeTranslations, translationSnapshot, () => 0);
  useEffect(() => {
    configureTranslator(httpTranslator(PETOWNER_API_URL));
  }, []);
  const [language, setLanguageState] = useState<AppLanguage>("id");

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(LANGUAGE_KEY)
      .then((stored) => {
        if (active && (stored === "id" || stored === "en")) {
          setLanguageState(stored);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    try {
      await SecureStore.setItemAsync(LANGUAGE_KEY, nextLanguage);
    } catch {
      // The in-memory preference still applies for the active session.
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const locale = localeByLanguage[language];
    return {
      translationRevision,
      language,
      locale,
      setLanguage,
      t: (text) => translateCopy(text, language),
      formatCurrency: (amount) =>
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(Number.isFinite(amount) ? amount : 0),
      formatDate: (date, options) => {
        const parsed = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(parsed.getTime())) return "—";
        return new Intl.DateTimeFormat(locale, options).format(parsed);
      },
      formatNumber: (number) =>
        new Intl.NumberFormat(locale).format(Number.isFinite(number) ? number : 0),
    };
  }, [language, setLanguage, translationRevision]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LanguageProvider");
  return context;
}

export function LocalizedText({ children, accessibilityLabel, translate = true, catalogue = false, ...props }: TextProps & {translate?:boolean;catalogue?:boolean}) {
  const { language, t } = useI18n();
  return (
    <NativeText
      {...props}
      accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined}
    >
      {translate ? translateNode(children, language, catalogue) : children}
    </NativeText>
  );
}

export function LocalizedTextInput({
  placeholder,
  accessibilityLabel,
  placeholderTextColor,
  style,
  ...props
}: TextInputProps) {
  const { t } = useI18n();
  return (
    <NativeTextInput
      {...props}
      accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined}
      placeholder={placeholder ? t(placeholder) : undefined}
      placeholderTextColor={placeholderTextColor ?? colors.muted}
      style={[style, localizedStyles.input]}
    />
  );
}

const localizedStyles = StyleSheet.create({
  input: {
    fontSize: typography.input,
    lineHeight: 20,
  },
});
