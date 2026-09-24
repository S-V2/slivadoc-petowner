export type Service = {
  id: string;
  branchId: string;
  businessId?: string;
  businessName?: string;
  branchName?: string;
  city?: string;
  name: string;
  category: string;
  rating: string;
  distance: string;
  price: string;
  status: string;
  imageUrl?: string;
  icon: string;
  tone: "blue" | "mint" | "violet" | "peach";
  priceValue: number;
  address: string;
};

export type PetView = {
  id: string;
  name: string;
  species?: string;
  breed: string;
  age: string;
  weight: string;
  icon: string;
  score: number;
  allergies: string;
  lastUpdated?: string;
};
