"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export type PetOwnerLanguage = "id" | "en";

const english: Record<string, string> = {
  "Metode pembayaran": "Payment method",
  "Memuat metode pembayaran…": "Loading payment methods…",
  "Pembayaran QRIS sementara belum tersedia. Coba lagi.": "QRIS payment is temporarily unavailable. Please try again.",
  "Sesi Anda berakhir. Silakan login kembali.": "Your session has expired. Please sign in again.",
  "Pindai kode QR dengan aplikasi pembayaran pilihan Anda.": "Scan the QR code with your preferred payment app.",
  "Coba lagi": "Try again",
  "Beranda": "Home",
  "Hewan Saya": "My Pets",
  "Jelajahi": "Explore",
  "Aktivitas": "Activity",
  "Kesehatan": "Health",
  "Belanja": "Shop",
  "Favorit Saya": "My Favorites",
  "Komunitas": "Community",
  "Pet Event": "Pet Events",
  "Konsultasi": "Consultation",
  "Adopsi": "Adoption",
  "Pusat Bantuan": "Help Center",
  "Akun": "Account",
  "Lainnya": "More",
  "Semua fitur Slivadoc": "All Slivadoc features",
  "Mau ke mana?": "Where would you like to go?",
  "Akun & perawatan": "Account & care",
  "Semua fitur komunitas dan gaya hidup pet, langsung sekali tap.":
    "All pet community and lifestyle features, just one tap away.",
  "Selamat datang di Slivadoc": "Welcome to Slivadoc",
  "Semua kebutuhan pet tersinkron dalam satu tempat.":
    "Everything your pet needs, synced in one place.",
  "Unduh ringkasan": "Download summary",
  "Profil pet parent": "Pet parent profile",
  "Akun & Keluarga": "Account & Family",
  "Pengaturan akun": "Account settings",
  "Bahasa aplikasi": "App language",
  "Bahasa Indonesia": "Indonesian",
  "Bahasa Inggris": "English",
  "Notifikasi": "Notifications",
  "Privasi & keamanan": "Privacy & security",
  "Keluarga & akses": "Family & access",
  "Keluar dari akun": "Sign out",
  "Chat Customer Support": "Chat Customer Support",
  "Kartu member kamu": "Your membership card",
  "Satu identitas untuk setiap momen perawatan":
    "One identity for every care moment",
  "Nomor member": "Member number",
  "Member sejak": "Member since",
  "Level member": "Membership tier",
  "Sliva Point": "Sliva Points",
  "Layanan cepat": "Quick services",
  "Semua yang pet-mu butuhkan, sekali tap":
    "Everything your pet needs, in one tap",
};

type ContextValue = {
  language: PetOwnerLanguage;
  locale: "id-ID" | "en-US";
  setLanguage: (language: PetOwnerLanguage) => void;
  t: (value: string) => string;
};

const LanguageContext = createContext<ContextValue | null>(null);
const storageKey = "slivadoc.petowner.language";

export function PetOwnerLanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<PetOwnerLanguage>("id");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "id" || stored === "en") {
      queueMicrotask(() => setLanguageState(stored));
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: PetOwnerLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem(storageKey, next);
  }, []);
  const t = useCallback(
    (value: string) => (language === "en" ? english[value] ?? value : value),
    [language],
  );
  const value = useMemo<ContextValue>(
    () => ({
      language,
      locale: language === "en" ? "en-US" : "id-ID",
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function usePetOwnerI18n() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("PetOwnerLanguageProvider is missing");
  return value;
}
