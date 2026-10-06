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
  | "petship"
  | "fundraising"
  | "favorites"
  | "notifications"
  | "support"
  | "profile";

export type Pet = {
  id: string;
  name: string;
  type:
    | "Dog"
    | "Cat"
    | "Small Mammal"
    | "Bird"
    | "Reptile"
    | "Amphibian"
    | "Fish"
    | "Aquatic"
    | "Arachnid"
    | "Insect"
    | "Equine"
    | "Farm Animal"
    | "Other";
  speciesCode?: string;
  speciesGroup?: string;
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
  // Family access: "owner" or the role this account holds on a shared pet.
  accessRole?: string;
  permissions?: string[];
};

export type Service = {
  id: string;
  branchId?: string;
  businessId?: string;
  businessName?: string;
  branchName?: string;
  city?: string;
  priceValue?: number;
  name: string;
  type: "Clinic" | "Grooming" | "Pet Shop" | "Pet Hotel" | "Home Care";
  distance: string;
  rating: number;
  reviews: number;
  price: string;
  status: string;
  address: string;
  imageUrl?: string;
  imageUrls?: string[];
  emoji: string;
  accent: string;
  tags: string[];
  description?: string;
  durationMinutes?: number;
  inclusions?: string[];
  supportedSpecies?: string[];
  cancellationPolicy?: string;
  licenseStatus?: "not_submitted" | "pending" | "verified" | "rejected";
  cancellationCutoffHours?: number;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  businessName: string;
  businessId: string;
  storeLogoUrl?: string;
  storeIsOnline?: boolean;
  storeLastSeenAt?: string;
  branchName: string;
  city: string;
  sku: string;
  barcode: string;
  description: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  stock: number;
  minimumStock: number;
  available: boolean;
  sold: string;
  emoji: string;
  imageUrl?: string;
  imageUrls?: string[];
  category: string;
  createdAt?: string;
  badge?: string;
  manufacturer?: string;
  originCountry?: string;
  netContent?: string;
  ingredients?: string;
  usageInstructions?: string;
  storageInstructions?: string;
  warnings?: string;
  packageContents?: string;
  returnPolicy?: string;
  warrantyPolicy?: string;
  registrationType?: string;
  registrationNumber?: string;
  halalCertificateNumber?: string;
  sniNumber?: string;
  licenseStatus?: "not_submitted" | "pending" | "verified" | "rejected";
};

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
