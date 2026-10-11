"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isInformationPlace } from "../../../shared/place-directory";
import { getDiscoveryBranch, type DiscoveryBranch } from "../../lib/platform-api";
import { MarketplaceStorefront } from "../marketplace/ShopMarketplace";
import "./manual-clinic.css";

const noop = () => undefined;

export default function ManualClinicDetail({ placeID }: { placeID: string }) {
  const router = useRouter();
  const [result, setResult] = useState<{ id: string; branch?: DiscoveryBranch; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getDiscoveryBranch(placeID).then((branch) => {
      if (!active) return;
      if (!isInformationPlace(branch) && branch.business_id) {
        const params = new URLSearchParams({ view: "shop", store: branch.business_id, branch: branch.branch_id, store_section: branch.type === "petclinic" ? "services" : "products" });
        router.replace(`/?${params}`);
        return;
      }
      setResult({ id: placeID, branch });
    }).catch(() => {
      if (active) setResult({ id: placeID, error: "Tempat tidak tersedia atau belum dapat dimuat." });
    });
    return () => { active = false; };
  }, [placeID, attempt, router]);
  const current = result?.id === placeID ? result : undefined;
  const branch = current?.branch;
  return <main className="directory-place-detail">
    <MarketplaceStorefront
      key={`${placeID}-${branch?.type || "loading"}`}
      branch={branch}
      products={[]}
      services={[]}
      initialSection={branch?.type === "petclinic" ? "services" : "products"}
      loading={!current}
      error={current?.error || ""}
      favorites={[]}
      backLabel="Klinik & Petshop"
      onBack={() => router.push("/?view=clinics")}
      onRetry={() => { setResult(undefined); setAttempt((n) => n + 1); }}
      onOpenProduct={noop}
      onOpenService={noop}
      onChat={noop}
      onFavorite={noop}
    />
  </main>;
}
