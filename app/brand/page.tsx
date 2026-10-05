import { redirect } from "next/navigation";

// Official Brand workspace lives in the console; /brand only forwards there.
export default function BrandPage() {
  redirect(process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://app.slivadoc.com");
}
