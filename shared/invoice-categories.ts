export const invoiceCategories = [
  { value: "all", label: "Semua" },
  { value: "shop", label: "Produk toko" },
  { value: "service", label: "Klinik & layanan" },
  { value: "mixed", label: "Produk & layanan" },
] as const;
export type InvoiceCategory = (typeof invoiceCategories)[number]["value"];
