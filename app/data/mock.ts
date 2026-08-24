export type AppView =
  | "home"
  | "pets"
  | "discover"
  | "bookings"
  | "health"
  | "shop"
  | "community"
  | "academy"
  | "events"
  | "petspot"
  | "pethub"
  | "consult"
  | "adoption"
  | "documents"
  | "pawdating"
  | "favorites"
  | "notifications"
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
  notes?: string;
  allergies?: string;
};

export type Service = {
  id: string;
  branchId?: string;
  priceValue?: number;
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

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
