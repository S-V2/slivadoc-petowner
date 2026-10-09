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

// Native-only copy that the shared English dictionaries do not cover yet.
const mobileEnglish: Record<string, string> = {
  "Klinik & Petshop": "Clinics & Pet Shops",
  "Mitra terverifikasi di sekitarmu": "Verified partners near you",
  "Ubah": "Change",
  "Ubah lokasi": "Change location",
  "Pilih lokasi": "Choose location",
  "Pilih lokasi untuk melihat yang terdekat dan memakai filter radius.": "Choose a location to see the nearest places and use the radius filter.",
  "Cari klinik atau petshop": "Search clinics or pet shops",
  "Semua": "All",
  "Klinik": "Clinic",
  "Petshop": "Pet shop",
  "Buka sekarang": "Open now",
  "Tutup": "Closed",
  "Jam belum diatur": "Hours not set",
  "Radius": "Radius",
  "Radius (pilih lokasi dulu)": "Radius (choose a location first)",
  "Rating toko dihitung dari semua cabang toko tersebut.": "Store rating is calculated across all branches of that store.",
  "Daftar belum dapat dimuat": "The list could not be loaded",
  "Daftar belum dapat dimuat.": "The list could not be loaded.",
  "Coba lagi": "Try again",
  "Belum ada klinik atau petshop": "No clinics or pet shops yet",
  "Coba ubah filter, radius, atau kata kunci.": "Try changing the filters, radius, or keywords.",
  "Belum ada mitra yang tersedia saat ini.": "No partners are available right now.",
  "Reset filter": "Reset filters",
  "Muat ulang": "Reload",
  "Muat lagi": "Load more",
  "Pilih lokasi di menu Klinik & Petshop untuk urutan terdekat": "Choose a location in the Clinics & Pet Shops menu for nearest-first order",
  "LOKASI LAYANAN": "SERVICE LOCATION",
  "Pilih lokasi spesifik": "Choose a specific location",
  "Dipakai untuk mengurutkan klinik dan petshop terdekat.": "Used to sort the nearest clinics and pet shops.",
  "Gunakan lokasi perangkat": "Use device location",
  "Mencari lokasi…": "Finding location…",
  "Cari alamat atau area": "Search an address or area",
  "Cari": "Search",
  "Login untuk mencari alamat. Lokasi perangkat tetap bisa dipakai tanpa login.": "Log in to search addresses. Device location works without logging in.",
  "Peta belum tersedia. Gunakan lokasi perangkat.": "The map is not available. Use device location.",
  "Peta belum tersedia. Gunakan lokasi perangkat atau cari alamat.": "The map is not available. Use device location or search an address.",
  "Geser peta sampai pin berada tepat di lokasimu.": "Drag the map until the pin sits exactly on your location.",
  "Simpan lokasi": "Save location",
  "Lokasi perangkat": "Device location",
  "Titik pilihan di peta": "Point chosen on the map",
  "Izin lokasi ditolak. Izinkan lokasi di pengaturan perangkat atau cari alamat manual.": "Location permission denied. Allow location in device settings or search an address manually.",
  "Lokasi perangkat belum dapat ditemukan.": "Device location could not be found.",
  "Pencarian lokasi gagal.": "Location search failed.",
  "Cabang yang kamu pilih": "Your selected branch",
  "Petunjuk arah": "Get directions",
  "Jam buka": "Opening hours",
  "Stok dikirim dari cabang terdekat yang tersedia": "Stock is shipped from the nearest available branch",
  "Memuat klinik & petshop…": "Loading clinics & pet shops…",
  "Klinik & petshop belum dapat dimuat.": "Clinics & pet shops could not be loaded.",
  "Belum ada klinik atau petshop yang tersedia.": "No clinics or pet shops are available yet.",
  "Senin": "Monday",
  "Selasa": "Tuesday",
  "Rabu": "Wednesday",
  "Kamis": "Thursday",
  "Jumat": "Friday",
  "Sabtu": "Saturday",
  "Minggu": "Sunday",
};

function translateMobile(value: string, language: AppLanguage, catalogue = false) {
  const key = value.trim();
  const own = language === "en" && Object.hasOwn(mobileEnglish, key) ? mobileEnglish[key] : undefined;
  return own ?? translateText(value, language, catalogue);
}

export function translateCopy(value: string, language: AppLanguage) {
  return translateMobile(value, language);
}

function translateNode(node: ReactNode, language: AppLanguage, catalogue = false): ReactNode {
  if (typeof node === "string") return translateMobile(node, language, catalogue);
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
