"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAdoptionListingApplications,
  getMyAdoptionApplications,
  getMyAdoptionListings,
  reviewAdoptionApplication,
  withdrawAdoptionApplication,
  type AdoptionApplicationRecord,
  type AdoptionApplicationStatus,
  type MyAdoptionApplication,
  type MyAdoptionListing,
} from "../../lib/platform-api";

type Notify = (message: string) => void;
type ReviewStatus = Parameters<typeof reviewAdoptionApplication>[1];

const statusLabel: Record<AdoptionApplicationStatus, string> = {
  submitted: "Diajukan",
  screening: "Sedang ditinjau",
  home_visit: "Kunjungan rumah",
  approved: "Disetujui",
  rejected: "Belum berhasil",
  completed: "Adopsi selesai",
  withdrawn: "Ditarik",
};

const transitions: Partial<Record<AdoptionApplicationStatus, ReviewStatus[]>> = {
  submitted: ["screening", "rejected"],
  screening: ["home_visit", "approved", "rejected"],
  home_visit: ["approved", "rejected"],
  approved: ["completed"],
};

const actionLabel: Record<ReviewStatus, string> = {
  screening: "Mulai tinjau",
  home_visit: "Jadwalkan kunjungan",
  approved: "Setujui",
  rejected: "Tolak",
  completed: "Tandai selesai",
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function StatusBadge({ status }: { status: AdoptionApplicationStatus }) {
  return (
    <span className={`adoption-status adoption-status-${status}`}>
      {statusLabel[status] ?? status}
    </span>
  );
}

export function MyAdoptionListings({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<MyAdoptionListing[] | null>(null);
  const [openId, setOpenId] = useState("");
  const load = useCallback(async () => {
    try {
      setItems((await getMyAdoptionListings()).data);
    } catch (error) {
      setItems([]);
      notify(errorMessage(error, "Listing belum dapat dimuat"));
    }
  }, [notify]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  if (!items) return <div className="empty-state compact">Memuat listing…</div>;
  if (!items.length)
    return (
      <div className="empty-state">
        <span>🐾</span>
        <h3>Belum ada listing</h3>
        <p>Ajukan pet kamu untuk mulai menerima lamaran adopsi.</p>
      </div>
    );
  return (
    <div className="adoption-manage-list">
      {items.map((item) => (
        <article className="adoption-manage-card" key={item.id}>
          <header>
            <div>
              <b>{item.name}</b>
              <small>
                {item.breed || item.species} · {item.city} · {item.status}
              </small>
            </div>
            <button
              type="button"
              className="secondary-button"
              aria-expanded={openId === item.id}
              onClick={() => setOpenId(openId === item.id ? "" : item.id)}
            >
              {item.applicant_count} lamaran
            </button>
          </header>
          {openId === item.id && (
            <ListingApplications
              listingId={item.id}
              notify={notify}
              changed={load}
            />
          )}
        </article>
      ))}
    </div>
  );
}

function ListingApplications({
  listingId,
  notify,
  changed,
}: {
  listingId: string;
  notify: Notify;
  changed: () => Promise<void>;
}) {
  const [apps, setApps] = useState<AdoptionApplicationRecord[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setApps((await getAdoptionListingApplications(listingId)).data);
    } catch (error) {
      setApps([]);
      notify(errorMessage(error, "Lamaran belum dapat dimuat"));
    }
  }, [listingId, notify]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function review(app: AdoptionApplicationRecord, status: ReviewStatus) {
    setBusy(true);
    try {
      await reviewAdoptionApplication(app.id, status, notes[app.id] ?? "");
      notify(`Lamaran ${app.applicant_name}: ${statusLabel[status]}`);
      setNotes((current) => ({ ...current, [app.id]: "" }));
      await Promise.all([load(), changed()]);
    } catch (error) {
      notify(errorMessage(error, "Lamaran belum dapat diproses"));
    } finally {
      setBusy(false);
    }
  }
  if (!apps) return <p>Memuat lamaran…</p>;
  if (!apps.length) return <p>Belum ada lamaran masuk.</p>;
  return (
    <div className="adoption-applications">
      {apps.map((app) => (
        <section key={app.id}>
          <header>
            <b>{app.applicant_name}</b>
            <StatusBadge status={app.status} />
          </header>
          <dl>
            <dt>Telepon</dt>
            <dd>{app.phone}</dd>
            <dt>Alamat</dt>
            <dd>{app.address}</dd>
            <dt>Tempat tinggal</dt>
            <dd>{app.housing_type}</dd>
            <dt>Hewan lain</dt>
            <dd>{app.has_other_pets ? "Ya" : "Tidak"}</dd>
            <dt>Pengalaman</dt>
            <dd>{app.experience || "-"}</dd>
            <dt>Alasan</dt>
            <dd>{app.reason}</dd>
            {app.status_note && (
              <>
                <dt>Catatan</dt>
                <dd>{app.status_note}</dd>
              </>
            )}
          </dl>
          {transitions[app.status] && (
            <>
              <input
                value={notes[app.id] ?? ""}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [app.id]: event.target.value,
                  }))
                }
                placeholder="Catatan untuk pelamar (opsional)"
                aria-label={`Catatan untuk ${app.applicant_name}`}
              />
              <div className="adoption-application-actions">
                {transitions[app.status]?.map((next) => (
                  <button
                    key={next}
                    type="button"
                    className={
                      next === "rejected" ? "secondary-button" : "primary-button"
                    }
                    disabled={busy}
                    onClick={() => void review(app, next)}
                  >
                    {actionLabel[next]}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      ))}
    </div>
  );
}

export function MyAdoptionApplications({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<MyAdoptionApplication[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setItems((await getMyAdoptionApplications()).data);
    } catch (error) {
      setItems([]);
      notify(errorMessage(error, "Lamaran belum dapat dimuat"));
    }
  }, [notify]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function withdraw(item: MyAdoptionApplication) {
    setBusy(true);
    try {
      await withdrawAdoptionApplication(item.id);
      notify("Lamaran ditarik");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Lamaran belum dapat ditarik"));
    } finally {
      setBusy(false);
    }
  }
  if (!items) return <div className="empty-state compact">Memuat lamaran…</div>;
  if (!items.length)
    return (
      <div className="empty-state">
        <span>🐾</span>
        <h3>Belum ada lamaran</h3>
        <p>Pilih pet di tab Jelajahi untuk mengajukan lamaran adopsi.</p>
      </div>
    );
  return (
    <div className="adoption-manage-list">
      {items.map((item) => (
        <article className="adoption-manage-card" key={item.id}>
          <header>
            <div>
              <b>{item.listing_name}</b>
              {item.status_note && <small>{item.status_note}</small>}
            </div>
            <StatusBadge status={item.status} />
          </header>
          {!["rejected", "withdrawn", "completed"].includes(item.status) && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => void withdraw(item)}
            >
              Tarik lamaran
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
