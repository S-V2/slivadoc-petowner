"use client";

import { Icon } from "../Icon";
import { LocalizedCopy } from "../LocalizedCopy";
import type { DiscoveryBranch } from "../../lib/platform-api";
import {
  branchPlace,
  directionsUrl,
  formatDistanceKm,
  openingHoursRows,
} from "../../lib/clinic-directory";

export function ClinicOpenState({ branch }: { branch: Pick<DiscoveryBranch, "is_open_now"> }) {
  const state = branch.is_open_now === null ? "unset" : branch.is_open_now ? "open" : "closed";
  return (
    <span className="clinic-open-state" data-state={state}>
      <i aria-hidden="true" />
      <LocalizedCopy>
        {state === "open" ? "Buka sekarang" : state === "closed" ? "Sedang tutup" : "Jam belum diatur"}
      </LocalizedCopy>
    </span>
  );
}

// Store page context when it was opened from a branch card: where this branch is
// and when it is open. Products, services and checkout stay business-level.
export default function ClinicBranchInfo({ branch }: { branch: DiscoveryBranch }) {
  const rows = openingHoursRows(branch.opening_hours);
  const distance = formatDistanceKm(branch.distance_km);
  return (
    <section className="clinic-branch-info" aria-label="Cabang yang dipilih">
      <header>
        <span className="clinic-branch-eyebrow">
          <LocalizedCopy>{"CABANG YANG KAMU PILIH"}</LocalizedCopy>
        </span>
        <h2>{branch.branch_name}</h2>
        <ClinicOpenState branch={branch} />
      </header>
      <p className="clinic-card-place">
        <Icon name="map" size={15} />
        <span>
          {distance ? <b>{distance}</b> : null}
          {distance ? " · " : null}
          {[branch.address, branchPlace(branch)].filter(Boolean).join(", ")}
        </span>
      </p>
      <div className="clinic-branch-hours">
        <b>
          <Icon name="clock" size={14} />
          <LocalizedCopy>{"Jam operasional"}</LocalizedCopy>
        </b>
        {rows.length ? (
          <dl>
            {rows.map((row) => (
              <div key={row.day}>
                <dt>
                  <LocalizedCopy>{row.day}</LocalizedCopy>
                </dt>
                <dd>{row.hours}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>
            <LocalizedCopy>{"Jam belum diatur"}</LocalizedCopy>
          </p>
        )}
      </div>
      <a
        className="secondary-button small"
        href={directionsUrl(branch)}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="arrow" size={14} />
        <LocalizedCopy>{"Petunjuk arah"}</LocalizedCopy>
      </a>
      <p className="clinic-branch-note">
        <LocalizedCopy>{"Stok dikirim dari cabang terdekat yang tersedia"}</LocalizedCopy>
      </p>
    </section>
  );
}
