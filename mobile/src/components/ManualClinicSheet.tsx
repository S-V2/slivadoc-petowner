import { useEffect, useState } from "react";
import { getDiscoveryBranch, type MobileDiscoveryBranch } from "../api";
import { StorefrontSheet } from "../screens/MarketplaceScreen";

const noop = () => undefined;

// Fetch on every open so hidden/deleted places cannot be opened from a stale card.
export function ManualClinicSheet({ placeID, onClose }: { placeID?: string; onClose: () => void }) {
  return placeID ? <DirectoryPlaceSheet key={placeID} placeID={placeID} onClose={onClose} /> : null;
}

function DirectoryPlaceSheet({ placeID, onClose }: { placeID: string; onClose: () => void }) {
  const [result, setResult] = useState<{ id: string; branch?: MobileDiscoveryBranch; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getDiscoveryBranch(placeID).then((branch) => { if (active) setResult({ id: placeID, branch }); })
      .catch(() => { if (active) setResult({ id: placeID, error: "Tempat tidak tersedia atau belum dapat dimuat." }); });
    return () => { active = false; };
  }, [placeID, attempt]);
  const current = result?.id === placeID ? result : undefined;
  const branch = current?.branch;
  return <StorefrontSheet
    key={placeID}
    visible
    branch={branch}
    products={[]}
    services={[]}
    initialSection={branch?.type === "petclinic" ? "services" : "products"}
    loading={!current}
    error={current?.error || ""}
    favorites={[]}
    backLabel="Kembali ke direktori"
    onClose={onClose}
    onRetry={() => { setResult(undefined); setAttempt((n) => n + 1); }}
    onDismiss={noop}
    onOpenProduct={noop}
    onOpenService={noop}
    onChat={noop}
    onFavorite={noop}
  />;
}
