"use client";
import { LocalizedCopy, LocalizedButton, LocalizedInput } from "../LocalizedCopy";

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
      <LocalizedCopy>{statusLabel[status] ?? status}</LocalizedCopy>
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
  if (!items) return <div className="empty-state compact"><LocalizedCopy>{"Memuat listing…"}</LocalizedCopy></div>;
  if (!items.length)
    return (
      <div className="empty-state">
        <span><LocalizedCopy>{"🐾"}</LocalizedCopy></span>
        <h3><LocalizedCopy>{"Belum ada listing"}</LocalizedCopy></h3>
        <p><LocalizedCopy>{"Ajukan pet kamu untuk mulai menerima lamaran adopsi."}</LocalizedCopy></p>
      </div>
    );
  return (
    <div className="adoption-manage-list">
      <LocalizedCopy>{items.map((item) => (
        <article className="adoption-manage-card" key={item.id}>
          <header>
            <div>
              <b><LocalizedCopy>{item.name}</LocalizedCopy></b>
              <small>
                <LocalizedCopy>{item.breed || item.species}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.city}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.status}</LocalizedCopy>
              </small>
            </div>
            <LocalizedButton
              type="button"
              className="secondary-button"
              aria-expanded={openId === item.id}
              onClick={() => setOpenId(openId === item.id ? "" : item.id)}
            >
              <LocalizedCopy>{item.applicant_count}</LocalizedCopy><LocalizedCopy>{" lamaran"}</LocalizedCopy></LocalizedButton>
          </header>
          <LocalizedCopy>{openId === item.id && (
            <ListingApplications
              listingId={item.id}
              notify={notify}
              changed={load}
            />
          )}</LocalizedCopy>
        </article>
      ))}</LocalizedCopy>
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
  if (!apps) return <p><LocalizedCopy>{"Memuat lamaran…"}</LocalizedCopy></p>;
  if (!apps.length) return <p><LocalizedCopy>{"Belum ada lamaran masuk."}</LocalizedCopy></p>;
  return (
    <div className="adoption-applications">
      <LocalizedCopy>{apps.map((app) => (
        <section key={app.id}>
          <header>
            <b><LocalizedCopy>{app.applicant_name}</LocalizedCopy></b>
            <StatusBadge status={app.status} />
          </header>
          <dl>
            <dt><LocalizedCopy>{"Telepon"}</LocalizedCopy></dt>
            <dd><LocalizedCopy>{app.phone}</LocalizedCopy></dd>
            <dt><LocalizedCopy>{"Alamat"}</LocalizedCopy></dt>
            <dd><LocalizedCopy>{app.address}</LocalizedCopy></dd>
            <dt><LocalizedCopy>{"Tempat tinggal"}</LocalizedCopy></dt>
            <dd><LocalizedCopy>{app.housing_type}</LocalizedCopy></dd>
            <dt><LocalizedCopy>{"Hewan lain"}</LocalizedCopy></dt>
            <dd><LocalizedCopy>{app.has_other_pets ? "Ya" : "Tidak"}</LocalizedCopy></dd>
            <dt><LocalizedCopy>{"Pengalaman"}</LocalizedCopy></dt>
            <dd><LocalizedCopy>{app.experience || "-"}</LocalizedCopy></dd>
            <dt><LocalizedCopy>{"Alasan"}</LocalizedCopy></dt>
            <dd><LocalizedCopy>{app.reason}</LocalizedCopy></dd>
            <LocalizedCopy>{app.status_note && (
              <>
                <dt><LocalizedCopy>{"Catatan"}</LocalizedCopy></dt>
                <dd><LocalizedCopy>{app.status_note}</LocalizedCopy></dd>
              </>
            )}</LocalizedCopy>
          </dl>
          <LocalizedCopy>{transitions[app.status] && (
            <>
              <LocalizedInput
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
                <LocalizedCopy>{transitions[app.status]?.map((next) => (
                  <LocalizedButton
                    key={next}
                    type="button"
                    className={
                      next === "rejected" ? "secondary-button" : "primary-button"
                    }
                    disabled={busy}
                    onClick={() => void review(app, next)}
                  >
                    <LocalizedCopy>{actionLabel[next]}</LocalizedCopy>
                  </LocalizedButton>
                ))}</LocalizedCopy>
              </div>
            </>
          )}</LocalizedCopy>
        </section>
      ))}</LocalizedCopy>
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
  if (!items) return <div className="empty-state compact"><LocalizedCopy>{"Memuat lamaran…"}</LocalizedCopy></div>;
  if (!items.length)
    return (
      <div className="empty-state">
        <span><LocalizedCopy>{"🐾"}</LocalizedCopy></span>
        <h3><LocalizedCopy>{"Belum ada lamaran"}</LocalizedCopy></h3>
        <p><LocalizedCopy>{"Pilih pet di tab Jelajahi untuk mengajukan lamaran adopsi."}</LocalizedCopy></p>
      </div>
    );
  return (
    <div className="adoption-manage-list">
      <LocalizedCopy>{items.map((item) => (
        <article className="adoption-manage-card" key={item.id}>
          <header>
            <div>
              <b><LocalizedCopy>{item.listing_name}</LocalizedCopy></b>
              <LocalizedCopy>{item.status_note && <small><LocalizedCopy>{item.status_note}</LocalizedCopy></small>}</LocalizedCopy>
            </div>
            <StatusBadge status={item.status} />
          </header>
          <LocalizedCopy>{!["rejected", "withdrawn", "completed"].includes(item.status) && (
            <LocalizedButton
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => void withdraw(item)}
            ><LocalizedCopy>{"Tarik lamaran"}</LocalizedCopy></LocalizedButton>
          )}</LocalizedCopy>
        </article>
      ))}</LocalizedCopy>
    </div>
  );
}
