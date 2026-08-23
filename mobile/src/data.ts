export type Service = {
  id: string;
  name: string;
  category: string;
  rating: string;
  distance: string;
  price: string;
  status: string;
  icon: string;
  tone: "blue" | "mint" | "violet" | "peach";
};

export const pets = [
  { id: "pet-milo", name: "Milo", breed: "Golden Retriever", age: "3 tahun", weight: "28.4 kg", icon: "🐕", score: 92 },
  { id: "pet-luna", name: "Luna", breed: "British Shorthair", age: "1 tahun", weight: "4.8 kg", icon: "🐈", score: 88 },
] as const;

export const services: [Service, ...Service[]] = [
  { id: "clinic", name: "Pawsitive Vet Kemang", category: "Klinik", rating: "4.9", distance: "1.2 km", price: "Mulai Rp85.000", status: "Buka sampai 22.00", icon: "🏥", tone: "mint" },
  { id: "grooming", name: "Fluffy House Grooming", category: "Grooming", rating: "4.8", distance: "2.1 km", price: "Mulai Rp120.000", status: "Slot tersedia hari ini", icon: "🛁", tone: "blue" },
  { id: "hotel", name: "Happy Tail Pet Hotel", category: "Pet Hotel", rating: "4.9", distance: "3.4 km", price: "Rp175.000/malam", status: "Tersisa 3 kamar", icon: "🏡", tone: "violet" },
  { id: "home", name: "Sliva HomeVet", category: "Home Care", rating: "4.9", distance: "35–45 menit", price: "Mulai Rp145.000", status: "6 dokter aktif", icon: "🩺", tone: "peach" },
];

export const careItems = [
  { id: "medicine", time: "19.00", title: "Omega Skin & Coat", note: "1 tablet • Setelah makan", icon: "💊", color: "blue" },
  { id: "grooming", time: "29 Agu", title: "Premium Grooming", note: "Fluffy House • Luna", icon: "🛁", color: "violet" },
  { id: "vaccine", time: "4 Sep", title: "Vaksin DHPPi", note: "Pawsitive Vet • Milo", icon: "💉", color: "mint" },
];

export const healthRecords = [
  { id: "checkup", date: "12 Agu 2026", title: "General check-up", note: "Kondisi sehat, alergi kulit membaik", icon: "🩺" },
  { id: "vaccine", date: "4 Sep 2025", title: "Vaksin DHPPi + Rabies", note: "Vaksinasi rutin lengkap", icon: "💉" },
  { id: "lab", date: "18 Jun 2025", title: "Complete blood count", note: "Seluruh parameter dalam rentang normal", icon: "🧪" },
];
