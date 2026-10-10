"use client";

import { LocalizedCopy } from "../LocalizedCopy";
import { PlaceVisitCard } from "../places/PlaceVisitCard";
import type { DiscoveryBranch } from "../../lib/platform-api";
import { branchPlace, directionsUrl, formatDistanceKm } from "../../lib/clinic-directory";

export function ClinicOpenState({ branch }: { branch: Pick<DiscoveryBranch, "is_open_now"> }) {
  const state = branch.is_open_now === null ? "unset" : branch.is_open_now ? "open" : "closed";
  return (
    <span className="clinic-open-state" data-state={state}>
      <i aria-hidden="true" />
      <LocalizedCopy>{state === "open" ? "Buka sekarang" : state === "closed" ? "Sedang tutup" : "Jam belum diatur"}</LocalizedCopy>
    </span>
  );
}

export default function ClinicBranchInfo({ branch }: { branch: DiscoveryBranch }) {
  const distance = formatDistanceKm(branch.distance_km);
  return <PlaceVisitCard
    className="clinic-branch-info"
    eyebrow="CABANG YANG KAMU PILIH"
    title={branch.branch_name}
    address={[distance, branch.address, branchPlace(branch)].filter(Boolean).join(" · ")}
    hours={branch.opening_hours}
    directions={directionsUrl(branch)}
    status={<ClinicOpenState branch={branch} />}
    note="Stok dikirim dari cabang terdekat yang tersedia"
  />;
}
