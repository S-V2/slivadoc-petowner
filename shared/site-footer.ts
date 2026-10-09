type FooterText = { id: string; en: string };
type FooterLink = { href: string; label: FooterText };

export const slivadocSupport = {
  email: "support@slivadoc.com",
  hours: "09.00–21.00 WIB",
  timezone: "UTC+7",
};

// Add the verified listing URLs here once the apps are published.
// A null URL renders a non-interactive “Coming soon” badge, never a search link.
export const slivadocAppStores: {
  platform: "google" | "apple";
  name: string;
  os: string;
  url: string | null;
}[] = [
  { platform: "google", name: "Google Play", os: "Android", url: null },
  { platform: "apple", name: "App Store", os: "iOS", url: null },
];

export const footerNavigation: { title: FooterText; links: FooterLink[] }[] = [
  {
    title: { id: "Layanan pet care", en: "Pet care services" },
    links: [
      {
        href: "/pet-sitter",
        label: {
          id: "Pet Sitter & Dog Walking",
          en: "Pet Sitter & Dog Walking",
        },
      },
      {
        href: "/layanan/dokter-hewan-online",
        label: {
          id: "Konsultasi dokter hewan",
          en: "Veterinary consultations",
        },
      },
      {
        href: "/layanan/klinik-hewan",
        label: { id: "Klinik hewan", en: "Veterinary clinics" },
      },
      {
        href: "/layanan/grooming-hewan",
        label: { id: "Pet grooming", en: "Pet grooming" },
      },
      {
        href: "/layanan/pet-hotel",
        label: { id: "Pet hotel & penitipan", en: "Pet hotels & boarding" },
      },
      { href: "/layanan", label: { id: "Semua layanan", en: "All services" } },
    ],
  },
  {
    title: { id: "Jelajahi Slivadoc", en: "Explore Slivadoc" },
    links: [
      {
        href: "/belanja",
        label: { id: "Belanja kebutuhan pet", en: "Shop pet essentials" },
      },
      {
        href: "/tempat",
        label: { id: "Direktori tempat", en: "Places directory" },
      },
      {
        href: "/wilayah",
        label: { id: "Cari berdasarkan wilayah", en: "Browse by location" },
      },
      {
        href: "/panduan",
        label: { id: "Panduan pet parent", en: "Pet parent guides" },
      },
      { href: "/?view=community", label: { id: "Komunitas", en: "Community" } },
    ],
  },
  {
    title: { id: "Perusahaan", en: "Company" },
    links: [
      {
        href: "/tentang",
        label: { id: "Tentang Slivadoc", en: "About Slivadoc" },
      },
      {
        href: "/career",
        label: { id: "Slivadoc Career", en: "Slivadoc Career" },
      },
      {
        href: "/mitra",
        label: { id: "Menjadi mitra", en: "Become a partner" },
      },
      {
        href: "/untuk/pet-owner",
        label: { id: "Untuk pet parent", en: "For pet parents" },
      },
      {
        href: "/gratis",
        label: { id: "Program akses gratis", en: "Free access programme" },
      },
    ],
  },
  {
    title: { id: "Bantuan & kebijakan", en: "Help & policies" },
    links: [
      { href: "/bantuan", label: { id: "Pusat bantuan", en: "Help centre" } },
      {
        href: "/?view=support",
        label: { id: "Buat tiket bantuan", en: "Create a support ticket" },
      },
      {
        href: "/syarat-ketentuan",
        label: { id: "Syarat & ketentuan", en: "Terms & conditions" },
      },
      {
        href: "/privasi",
        label: { id: "Kebijakan privasi", en: "Privacy policy" },
      },
      {
        href: "/hapus-akun",
        label: { id: "Penghapusan akun", en: "Account deletion" },
      },
    ],
  },
];

export const footerCopy = {
  id: {
    label: "Informasi dan navigasi Slivadoc",
    home: "Slivadoc, kembali ke beranda",
    appEyebrow: "SLIVADOC DI GENGGAMANMU",
    appTitle: "Lebih dekat dengan kebutuhan petmu.",
    appDescription:
      "Aplikasi Slivadoc untuk Android dan iOS sedang disiapkan. Sementara itu, jelajahi layanan melalui website kami.",
    comingSoon: "Segera hadir",
    download: "Unduh di",
    downloadLabel: "Unduh Slivadoc di",
    brandDescription:
      "Menghubungkan pet parent, tenaga veteriner, dan mitra pet care dalam satu ekosistem yang saling terhubung.",
    brandTagline: "One Platform. Every Animal.",
    supportTitle: "Pengaduan & bantuan pelanggan",
    supportHours: "Jam operasional pengaduan",
    supportNote:
      "Email dapat dikirim kapan saja. Tim menindaklanjuti pengaduan pada jam operasional.",
    guideTitle: "Bantu kami memahami kendalamu",
    guideDescription:
      "Sertakan nama, nomor pesanan atau booking jika ada, serta ringkasan kendala agar tim dapat menelusuri pengaduanmu.",
    guideLink: "Lihat panduan bantuan",
    copyright: "Hak cipta dilindungi.",
    backTop: "Kembali ke atas",
  },
  en: {
    label: "Slivadoc information and navigation",
    home: "Slivadoc, back to home",
    appEyebrow: "SLIVADOC IN YOUR POCKET",
    appTitle: "Closer to everything your pet needs.",
    appDescription:
      "The Slivadoc apps for Android and iOS are on their way. In the meantime, explore our services on the web.",
    comingSoon: "Coming soon",
    download: "Download on",
    downloadLabel: "Download Slivadoc on",
    brandDescription:
      "Connecting pet parents, veterinary professionals, and pet care partners in one connected ecosystem.",
    brandTagline: "One Platform. Every Animal.",
    supportTitle: "Complaints & customer support",
    supportHours: "Customer support hours",
    supportNote:
      "You can email us at any time. Our team follows up during support hours.",
    guideTitle: "Help us understand your concern",
    guideDescription:
      "Include your name, order or booking number if applicable, and a short description so our team can look into your concern.",
    guideLink: "View the help guide",
    copyright: "All rights reserved.",
    backTop: "Back to top",
  },
};
