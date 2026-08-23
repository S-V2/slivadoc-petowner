export type AppView =
  | "home"
  | "pets"
  | "discover"
  | "bookings"
  | "health"
  | "shop"
  | "community"
  | "profile";

export type Pet = {
  id: string;
  name: string;
  type: "Dog" | "Cat" | "Rabbit" | "Bird" | "Other";
  breed: string;
  age: string;
  weight: string;
  gender: string;
  color: string;
  avatar: string;
  photoUrl?: string;
  birthDate?: string;
  healthScore: number;
  nextCare: string;
  microchip: string;
};

export type Service = {
  id: string;
  name: string;
  type: "Clinic" | "Grooming" | "Pet Shop" | "Pet Hotel" | "Home Care";
  distance: string;
  rating: number;
  reviews: number;
  price: string;
  status: string;
  address: string;
  emoji: string;
  accent: string;
  tags: string[];
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  rating: number;
  sold: string;
  emoji: string;
  category: string;
  badge?: string;
};

export const pets: Pet[] = [
  {
    id: "pet-milo",
    name: "Milo",
    type: "Dog",
    breed: "Golden Retriever",
    age: "3 tahun 2 bulan",
    weight: "28.4 kg",
    gender: "Jantan",
    color: "#f2b65f",
    avatar: "🐕",
    healthScore: 92,
    nextCare: "Vaksin DHPPi • 4 Sep",
    microchip: "IDN-8821-0042",
  },
  {
    id: "pet-luna",
    name: "Luna",
    type: "Cat",
    breed: "British Shorthair",
    age: "1 tahun 8 bulan",
    weight: "4.8 kg",
    gender: "Betina",
    color: "#8996a7",
    avatar: "🐈",
    healthScore: 88,
    nextCare: "Grooming • 29 Agu",
    microchip: "IDN-8821-0099",
  },
];

export const services: Service[] = [
  {
    id: "svc-pawsitive",
    name: "Pawsitive Vet Kemang",
    type: "Clinic",
    distance: "1.2 km",
    rating: 4.9,
    reviews: 482,
    price: "Mulai Rp85.000",
    status: "Buka • sampai 22.00",
    address: "Jl. Kemang Raya No. 12, Jakarta Selatan",
    emoji: "🏥",
    accent: "mint",
    tags: ["Dokter umum", "24 jam", "Rawat inap"],
  },
  {
    id: "svc-fluffy",
    name: "Fluffy House Grooming",
    type: "Grooming",
    distance: "2.1 km",
    rating: 4.8,
    reviews: 319,
    price: "Mulai Rp120.000",
    status: "Slot hari ini tersedia",
    address: "Jl. Bangka VIII No. 4, Jakarta Selatan",
    emoji: "🛁",
    accent: "blue",
    tags: ["Cat friendly", "Antar jemput", "Premium spa"],
  },
  {
    id: "svc-happy-tail",
    name: "Happy Tail Pet Hotel",
    type: "Pet Hotel",
    distance: "3.4 km",
    rating: 4.9,
    reviews: 207,
    price: "Mulai Rp175.000/malam",
    status: "Tersisa 3 kamar",
    address: "Jl. Cipete Raya No. 91, Jakarta Selatan",
    emoji: "🏡",
    accent: "violet",
    tags: ["CCTV 24 jam", "Playground", "Daily report"],
  },
  {
    id: "svc-homevet",
    name: "Sliva HomeVet",
    type: "Home Care",
    distance: "Tiba 35–45 menit",
    rating: 4.9,
    reviews: 891,
    price: "Mulai Rp145.000",
    status: "6 dokter aktif",
    address: "Melayani area Jakarta",
    emoji: "🩺",
    accent: "peach",
    tags: ["Dokter ke rumah", "Same day", "Obat diantar"],
  },
  {
    id: "svc-petmart",
    name: "Sliva PetMart Senayan",
    type: "Pet Shop",
    distance: "4.0 km",
    rating: 4.7,
    reviews: 624,
    price: "Gratis antar min. Rp150rb",
    status: "Buka • sampai 21.00",
    address: "Jl. Asia Afrika, Jakarta Pusat",
    emoji: "🛍️",
    accent: "yellow",
    tags: ["Official store", "Same day", "2.000+ produk"],
  },
];

export const products: Product[] = [
  {
    id: "prd-royal-canin",
    name: "Royal Canin Golden Retriever Adult 12 kg",
    brand: "Royal Canin Official",
    price: 1299000,
    originalPrice: 1410000,
    rating: 4.9,
    sold: "2,1rb",
    emoji: "🥣",
    category: "Makanan",
    badge: "Bestseller",
  },
  {
    id: "prd-frontline",
    name: "Frontline Plus Flea & Tick Dog 20–40 kg",
    brand: "Slivadoc Pharmacy",
    price: 179000,
    rating: 4.8,
    sold: "874",
    emoji: "💧",
    category: "Kesehatan",
    badge: "Vet choice",
  },
  {
    id: "prd-litter",
    name: "Eco Clumping Cat Litter Lavender 10 L",
    brand: "Purrfect Living",
    price: 128500,
    originalPrice: 145000,
    rating: 4.9,
    sold: "1,4rb",
    emoji: "🪻",
    category: "Kebutuhan",
    badge: "12% off",
  },
  {
    id: "prd-toy",
    name: "Interactive Snuffle Mat Anti Slip",
    brand: "PlayPaws",
    price: 219000,
    rating: 4.7,
    sold: "562",
    emoji: "🧸",
    category: "Mainan",
  },
  {
    id: "prd-vitamin",
    name: "Omega Skin & Coat Supplement 60 Tabs",
    brand: "VitaPaws",
    price: 245000,
    rating: 4.9,
    sold: "933",
    emoji: "💊",
    category: "Vitamin",
    badge: "Auto repeat",
  },
  {
    id: "prd-carrier",
    name: "Airy Travel Carrier Cabin Approved",
    brand: "Urban Pets",
    price: 489000,
    originalPrice: 549000,
    rating: 4.8,
    sold: "411",
    emoji: "🎒",
    category: "Aksesori",
  },
];

export const careTimeline = [
  {
    id: "care-1",
    date: "Hari ini",
    time: "19.00",
    title: "Omega Skin & Coat",
    note: "1 tablet • setelah makan • Milo",
    icon: "💊",
    tone: "blue",
    done: false,
  },
  {
    id: "care-2",
    date: "29 Agu",
    time: "10.30",
    title: "Premium Grooming",
    note: "Fluffy House • Luna",
    icon: "🛁",
    tone: "violet",
    done: false,
  },
  {
    id: "care-3",
    date: "4 Sep",
    time: "16.00",
    title: "Vaksin DHPPi tahunan",
    note: "Pawsitive Vet Kemang • Milo",
    icon: "💉",
    tone: "mint",
    done: false,
  },
];

export const medicalRecords = [
  {
    id: "rec-1",
    date: "12 Agustus 2026",
    title: "General check-up",
    clinic: "Pawsitive Vet Kemang",
    doctor: "drh. Amanda Putri",
    diagnosis: "Kondisi sehat, skin allergy ringan membaik",
    type: "Pemeriksaan",
    icon: "🩺",
  },
  {
    id: "rec-2",
    date: "4 September 2025",
    title: "Vaksin DHPPi + Rabies",
    clinic: "Pawsitive Vet Kemang",
    doctor: "drh. Kevin Hartanto",
    diagnosis: "Vaksinasi rutin lengkap",
    type: "Vaksin",
    icon: "💉",
  },
  {
    id: "rec-3",
    date: "18 Juni 2025",
    title: "Complete blood count",
    clinic: "Slivadoc Diagnostic Lab",
    doctor: "drh. Rani Setiawan",
    diagnosis: "Seluruh parameter dalam rentang normal",
    type: "Laboratorium",
    icon: "🧪",
  },
];

export const communityPosts = [
  {
    id: "post-1",
    author: "Nadia & Mochi",
    avatar: "👩🏻",
    group: "Golden Retriever Jakarta",
    time: "18 menit lalu",
    body: "Mochi akhirnya berani berenang! Ada rekomendasi kolam pet-friendly lain di Jakarta?",
    pet: "🐕‍🦺",
    likes: 128,
    comments: 24,
    tag: "Cerita hari ini",
  },
  {
    id: "post-2",
    author: "Rescue Paws Indonesia",
    avatar: "🐾",
    group: "Adopsi terverifikasi",
    time: "1 jam lalu",
    body: "Kenalan dengan Bumi, jantan 5 bulan yang aktif dan sudah vaksin pertama. Siap mencari keluarga selamanya.",
    pet: "🐶",
    likes: 286,
    comments: 61,
    tag: "Siap diadopsi",
  },
];

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
