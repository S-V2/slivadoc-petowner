import type { ReactNode } from "react";
import { CareerAccessGate } from "../components/CareerAccessGate";
export default function CareerLayout({ children }: { children: ReactNode }) {
  return <CareerAccessGate>{children}</CareerAccessGate>;
}
