export type Service = {
  id: string;
  branchId: string;
  name: string;
  category: string;
  rating: string;
  distance: string;
  price: string;
  status: string;
  icon: string;
  tone: "blue" | "mint" | "violet" | "peach";
  priceValue:number;
  address:string;
};

export type PetView={id:string;name:string;breed:string;age:string;weight:string;icon:string;score:number;allergies:string;lastUpdated?:string};
