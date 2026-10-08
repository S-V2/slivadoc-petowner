"use client";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { LocalizedCopy, LocalizedButton, LocalizedInput, LocalizedTextarea } from "../LocalizedCopy";
import { SlivaDatePicker } from "../SlivaDatePicker";

import { usePetOwnerFlow } from "../PetOwnerFlow";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import GeoMap, { type GeoCircle, type GeoMarker } from "./GeoMap";
import type { Pet } from "../../lib/petowner-domain";
import {
  checkInPetship,
  checkoutPetship,
  createFundraiser,
  createFundraiserDonation,
  createPaymentIntent,
  getFundraisers,
  getMyFundraisers,
  getPetshipPlaces,
  getPetshipPresences,
  heartbeatPetship,
  type Fundraiser,
  type MyFundraiser,
  type PaymentIntent,
  type PetshipPlace,
  type PetshipPresence,
} from "../../lib/platform-api";
import type { LocationResult } from "../../lib/petowner-api";
import { Icon } from "../Icon";
import { QrisPaymentPanel, PaymentMethodPicker } from "../payments/QrisPayment";

const money = new Intl.NumberFormat(petOwnerIntlLocale(), {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat(petOwnerIntlLocale());

export function PetshipView({
  pet,
  location,
  notify,
}: {
  pet: Pet;
  authenticated: boolean;
  location: LocationResult | null;
  notify: (message: string) => void;
  onLogin: () => void;
}) {
  const { requirePet } = usePetOwnerFlow();
  const [places, setPlaces] = useState<PetshipPlace[]>([]);
  const [selected, setSelected] = useState<PetshipPlace | null>(null);
  const placeMarkers = useMemo<GeoMarker[]>(() => places.map((place) => ({
    id: `petship-${place.id}`,
    latitude: place.latitude,
    longitude: place.longitude,
    label: `${place.name} · ${place.active_petowners} online`,
    color: "#8b5cf6",
    onClick: () => {
      setSelected(place);
      document.querySelector(`[data-place-card="${place.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
  })), [places]);
  const placeCircles = useMemo<GeoCircle[]>(() => places.map((place) => ({
    id: `petship-${place.id}`,
    latitude: place.latitude,
    longitude: place.longitude,
    radiusM: place.geofence_radius_m,
    color: "#8b5cf6",
  })), [places]);
  const [pawrents, setPawrents] = useState<PetshipPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPetshipPlaces(
        location
          ? { latitude: location.latitude, longitude: location.longitude }
          : undefined,
      );
      setPlaces(response.data);
      setSelected((current) => current ?? response.data[0] ?? null);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Lokasi Petship belum dapat dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [location, notify]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  useEffect(() => {
    let cancelled = false;
    if (!selected) {
      queueMicrotask(() => {
        if (!cancelled) setPawrents([]);
      });
      return () => {
        cancelled = true;
      };
    }
    void getPetshipPresences(selected.id)
      .then((response) => {
        if (!cancelled) setPawrents(response.data);
      })
      .catch(() => {
        if (!cancelled) setPawrents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);
  useEffect(() => {
    if (!checkedIn) return;
    const timer = window.setInterval(
      () => void heartbeatPetship().catch(() => setCheckedIn(false)),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, [checkedIn]);
  async function checkIn() {
    if (!requirePet()) return;
    if (!selected || !pet.id)
      return notify("Pilih pet dan lokasi terlebih dahulu");
    setBusy(true);
    try {
      const response = await checkInPetship({
        pet_id: pet.id,
        place_id: selected.id,
        visibility: "nearby",
        message: `${pet.name} sedang di sini dan siap berkenalan.`,
      });
      setCheckedIn(true);
      notify(response.message);
      await load();
      setPawrents((await getPetshipPresences(selected.id)).data);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Check-in belum dapat disimpan",
      );
    } finally {
      setBusy(false);
    }
  }
  async function checkOut() {
    setBusy(true);
    try {
      const response = await checkoutPetship();
      setCheckedIn(false);
      notify(response.message);
      await load();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Check-out belum dapat diproses",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="petship-page">
      <section className="petship-hero">
        <div>
          <span className="world-kicker"><LocalizedCopy>{"LIVE · PRIVACY-FIRST"}</LocalizedCopy></span>
          <h2><LocalizedCopy>{"Temukan teman anabul di sekitarmu"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Check-in pada tempat yang kamu kunjungi. Pawrents lain hanya melihat nama tempat dan profil pet—bukan koordinat personal."}</LocalizedCopy></p>
          <div>
            <LocalizedButton
              className="primary-button"
              disabled={busy || !selected}
              onClick={() => void (checkedIn ? checkOut() : checkIn())}
            >
              <LocalizedCopy>{checkedIn ? "Check-out Petship" : `Check-in ${pet.name}`}</LocalizedCopy>
            </LocalizedButton>
            <LocalizedButton className="secondary-button" onClick={() => void load()}><LocalizedCopy>{"↻ Update live"}</LocalizedCopy></LocalizedButton>
          </div>
        </div>
      </section>
      <div className="world-split">
        <div className="world-split-list">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-eyebrow"><LocalizedCopy>{"TEMPAT DI SEKITARMU"}</LocalizedCopy></span>
              <h3><LocalizedCopy>{places.length}</LocalizedCopy><LocalizedCopy>{" lokasi aktif"}</LocalizedCopy></h3>
            </div>
          </div>
          <LocalizedCopy>{loading ? (
            <div className="empty-state compact"><LocalizedCopy>{"Mencari lokasi Petship…"}</LocalizedCopy></div>
          ) : (
            <div className="petship-places">
              <LocalizedCopy>{places.map((place) => (
                <LocalizedButton
                  className={selected?.id === place.id ? "active" : ""}
                  key={place.id}
                  data-place-card={place.id}
                  onClick={() => setSelected(place)}
                >
                  <span>
                    <LocalizedCopy>{place.category === "mall"
                      ? "🏬"
                      : place.category === "park"
                        ? "🌳"
                        : "☕"}</LocalizedCopy>
                  </span>
                  <div>
                    <b><LocalizedCopy>{place.name}</LocalizedCopy></b>
                    <small>
                      <LocalizedCopy>{place.city}</LocalizedCopy>
                      <LocalizedCopy>{typeof place.distance_km === "number"
                        ? ` · ${place.distance_km.toFixed(1)} km`
                        : ""}</LocalizedCopy>
                    </small>
                  </div>
                  <em><LocalizedCopy>{place.active_petowners}</LocalizedCopy><LocalizedCopy>{" online"}</LocalizedCopy></em>
                </LocalizedButton>
              ))}</LocalizedCopy>
            </div>
          )}</LocalizedCopy>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-eyebrow"><LocalizedCopy>{"PAWRENTS LIVE"}</LocalizedCopy></span>
              <h3><LocalizedCopy>{selected?.name ?? "Pilih lokasi"}</LocalizedCopy></h3>
            </div>
            <em className="live-place-count"><LocalizedCopy>{pawrents.length}</LocalizedCopy><LocalizedCopy>{" aktif"}</LocalizedCopy></em>
          </div>
          <div className="petship-pawrents">
            <LocalizedCopy>{pawrents.length ? (
              pawrents.map((item) => (
                <article key={item.id}>
                  <span><LocalizedCopy>{item.species === "cat" ? "🐈" : "🐕"}</LocalizedCopy></span>
                  <div>
                    <b><LocalizedCopy preserve>{item.pet_name}</LocalizedCopy></b>
                    <small>
                      <LocalizedCopy>{item.breed}</LocalizedCopy><LocalizedCopy>{" · bersama "}</LocalizedCopy><LocalizedCopy>{item.owner_first_name}</LocalizedCopy>
                    </small>
                    <p><LocalizedCopy>{item.message || "Sedang menikmati waktu bersama."}</LocalizedCopy></p>
                  </div>
                  <i />
                </article>
              ))
            ) : (
              <div className="empty-state compact"><LocalizedCopy>{"Belum ada pawrents aktif di lokasi ini. Jadilah yang pertama check-in."}</LocalizedCopy></div>
            )}</LocalizedCopy>
          </div>
        </section>
        </div>
        <div className="world-split-map">
          <GeoMap
            className="spot-map"
            markers={placeMarkers}
            circles={placeCircles}
            activeId={selected ? `petship-${selected.id}` : null}
            focus={selected ? { latitude: selected.latitude, longitude: selected.longitude } : null}
          />
        </div>
      </div>
    </div>
  );
}

export function FundraisingView({
  pet,
  authenticated,
  notify,
}: {
  pet: Pet;
  authenticated: boolean;
  notify: (message: string) => void;
  onLogin: () => void;
}) {
  const { requirePet } = usePetOwnerFlow();
  const [items, setItems] = useState<Fundraiser[]>([]);
  const [mine, setMine] = useState<MyFundraiser[]>([]);
  const [active, setActive] = useState<Fundraiser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [publicData, myData] = await Promise.all([
        getFundraisers(),
        authenticated
          ? getMyFundraisers()
          : Promise.resolve({ data: [], count: 0 }),
      ]);
      setItems(publicData.data);
      setMine(myData.data);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Penggalangan dana belum dapat dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [authenticated, notify]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  return (
    <div className="fundraising-page">
      <section className="fundraising-hero">
        <span><LocalizedCopy>{"♥"}</LocalizedCopy></span>
        <div>
          <small><LocalizedCopy>{"SLIVADOC ANIMAL FUND"}</LocalizedCopy></small>
          <h2><LocalizedCopy>{"Bersama, perawatan jadi mungkin"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Campaign diverifikasi tim operasional. Dana, jumlah donatur, dan progres diperbarui dari transaksi yang sudah dibayar."}</LocalizedCopy></p>
        </div>
        <LocalizedButton
          className="primary-button"
          onClick={() => (requirePet() && setCreateOpen(true))}
        ><LocalizedCopy>{"＋ Galang dana"}</LocalizedCopy></LocalizedButton>
      </section>
      <LocalizedCopy>{mine.length > 0 && (
        <section className="panel my-fundraisers">
          <div className="panel-heading">
            <div>
              <span className="section-eyebrow"><LocalizedCopy>{"PENGAJUAN SAYA"}</LocalizedCopy></span>
              <h3><LocalizedCopy>{"Status verifikasi campaign"}</LocalizedCopy></h3>
            </div>
          </div>
          <div>
            <LocalizedCopy>{mine.map((item) => (
              <article key={item.id}>
                <span className={`fund-status ${item.status}`}>
                  <LocalizedCopy>{item.status}</LocalizedCopy>
                </span>
                <b><LocalizedCopy>{item.title}</LocalizedCopy></b>
                <small>
                  <LocalizedCopy>{money.format(item.raised_amount)}</LocalizedCopy><LocalizedCopy>{" dari"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                  <LocalizedCopy>{money.format(item.goal_amount)}</LocalizedCopy>
                </small>
              </article>
            ))}</LocalizedCopy>
          </div>
        </section>
      )}</LocalizedCopy>
      <div className="fundraiser-grid">
        <LocalizedCopy>{items.map((item) => (
          <article className="fundraiser-card" key={item.id}>
            <div className="fundraiser-cover"><LocalizedCopy>{"🐾"}</LocalizedCopy><span><LocalizedCopy>{item.city}</LocalizedCopy></span>
            </div>
            <div>
              <small><LocalizedCopy>{"TERVERIFIKASI SLIVADOC · "}</LocalizedCopy><LocalizedCopy>{item.donor_count}</LocalizedCopy><LocalizedCopy>{" DONATUR"}</LocalizedCopy></small>
              <h3><LocalizedCopy>{item.title}</LocalizedCopy></h3>
              <p><LocalizedCopy>{item.story}</LocalizedCopy></p>
              <div className="fundraiser-progress">
                <i>
                  <b
                    style={{
                      width: `${Math.min(100, item.progress_percent)}%`,
                    }}
                  />
                </i>
                <span>
                  <strong><LocalizedCopy>{money.format(item.raised_amount)}</LocalizedCopy></strong>
                  <em><LocalizedCopy>{"dari "}</LocalizedCopy><LocalizedCopy>{money.format(item.goal_amount)}</LocalizedCopy></em>
                </span>
              </div>
              <LocalizedButton
                className="primary-button full"
                onClick={() => (requirePet() && setActive(item))}
              ><LocalizedCopy>{"Donasi sekarang"}</LocalizedCopy></LocalizedButton>
            </div>
          </article>
        ))}</LocalizedCopy>
      </div>
      <LocalizedCopy>{loading && (
        <div className="empty-state compact"><LocalizedCopy>{"Memuat campaign terverifikasi…"}</LocalizedCopy></div>
      )}</LocalizedCopy>
      <LocalizedCopy>{!loading && !items.length && (
        <div className="empty-state">
          <span><LocalizedCopy>{"♥"}</LocalizedCopy></span>
          <h3><LocalizedCopy>{"Belum ada campaign aktif"}</LocalizedCopy></h3>
          <p><LocalizedCopy>{"Campaign baru akan tampil setelah verifikasi Slivadoc."}</LocalizedCopy></p>
        </div>
      )}</LocalizedCopy>
      <LocalizedCopy>{active && (
        <DonationModal
          item={active}
          close={() => setActive(null)}
          notify={notify}
          paid={load}
        />
      )}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
      <LocalizedCopy>{createOpen && (
        <CreateFundraiserModal
          pet={pet}
          close={() => setCreateOpen(false)}
          notify={notify}
          created={load}
        />
      )}</LocalizedCopy>
    </div>
  );
}

function DonationModal({
  item,
  close,
  notify,
  paid,
}: {
  item: Fundraiser;
  close: () => void;
  notify: (message: string) => void;
  paid: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("100000");
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentMethod) return;
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const donation = await createFundraiserDonation(item.id, {
        amount: Number(amount),
        message: String(values.message || ""),
        anonymous: values.anonymous === "on",
      });
      setPayment(
        await createPaymentIntent(
          "fundraiser_donation",
          donation.id,
          paymentMethod,
        ),
      );
      notify("Donasi dibuat, silakan selesaikan pembayaran");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Donasi belum dapat diproses",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal donation-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <LocalizedCopy>{payment ? (
          <QrisPaymentPanel
            payment={payment}
            onPaid={() => {
              void paid().then(() =>
                notify("Terima kasih, donasi tercatat untuk kampanye ini."),
              );
            }}
            onOpenActivity={() => {
              close();
              window.dispatchEvent(
                new CustomEvent("slivadoc:open-activity", {
                  detail: { type: "donation", id: payment.reference_id },
                }),
              );
            }}
          />
        ) : (
          <>
            <span className="section-eyebrow"><LocalizedCopy>{"DONASI TRANSPARAN"}</LocalizedCopy></span>
            <h2><LocalizedCopy>{item.title}</LocalizedCopy></h2>
            <p>
              <LocalizedCopy>{money.format(item.raised_amount)}</LocalizedCopy><LocalizedCopy>{" sudah terkumpul untuk"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
              <LocalizedCopy>{item.beneficiary_name}</LocalizedCopy><LocalizedCopy>{"."}</LocalizedCopy></p>
            <form className="world-form" onSubmit={submit}>
              <label>
                <span><LocalizedCopy>{"Nominal donasi"}</LocalizedCopy></span>
                <LocalizedInput
                  inputMode="numeric"
                  value={integer.format(Number(amount || 0))}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/\D/g, ""))
                  }
                  required
                />
                <LocalizedInput type="hidden" name="amount" value={amount} />
              </label>
              <label>
                <span><LocalizedCopy>{"Pesan dukungan"}</LocalizedCopy></span>
                <LocalizedTextarea name="message" placeholder="Semoga lekas pulih…" />
              </label>
              <label className="fund-check">
                <LocalizedInput name="anonymous" type="checkbox" />
                <span><LocalizedCopy>{"Tampilkan sebagai donatur anonim"}</LocalizedCopy></span>
              </label>
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={busy}
              />
              <LocalizedButton
                className="primary-button full"
                disabled={busy || !paymentMethod || Number(amount) < 10000}
              >
                <LocalizedCopy>{busy
                  ? "Membuat pembayaran…"
                  : `Donasi ${money.format(Number(amount || 0))}`}</LocalizedCopy>
              </LocalizedButton>
            </form>
          </>
        )}</LocalizedCopy>
      </section>
    </div>
  );
}

function CreateFundraiserModal({
  pet,
  close,
  notify,
  created,
}: {
  pet: Pet;
  close: () => void;
  notify: (message: string) => void;
  created: () => Promise<void>;
}) {
  const [goal, setGoal] = useState("1000000");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await createFundraiser({
        pet_id: pet.id || undefined,
        title: values.title,
        story: values.story,
        beneficiary_name: values.beneficiary_name,
        city: values.city,
        goal_amount: Number(goal),
        medical_document_urls: [],
        ends_at: values.ends_at
          ? new Date(String(values.ends_at)).toISOString()
          : undefined,
      });
      await created();
      notify("Campaign dikirim untuk verifikasi Slivadoc");
      close();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Campaign belum dapat dibuat",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal form-modal fundraiser-create-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"AJUKAN PENGGALANGAN DANA"}</LocalizedCopy></span>
        <h2><LocalizedCopy>{"Bantu hewan mendapatkan perawatan"}</LocalizedCopy></h2>
        <p className="muted-copy"><LocalizedCopy>{"Identitas, cerita, dan dokumen medis akan diperiksa sebelum campaign dipublikasikan."}</LocalizedCopy></p>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span><LocalizedCopy>{"Judul campaign"}</LocalizedCopy></span>
            <LocalizedInput name="title" minLength={5} required />
          </label>
          <label>
            <span><LocalizedCopy>{"Nama penerima"}</LocalizedCopy></span>
            <LocalizedInput
              name="beneficiary_name"
              defaultValue={pet.name || "Hewan rescue"}
              required
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Kota"}</LocalizedCopy></span>
            <LocalizedInput name="city" minLength={2} required />
          </label>
          <label>
            <span><LocalizedCopy>{"Cerita dan kebutuhan medis"}</LocalizedCopy></span>
            <LocalizedTextarea name="story" minLength={30} required />
          </label>
          <label>
            <span><LocalizedCopy>{"Target dana"}</LocalizedCopy></span>
            <LocalizedInput
              inputMode="numeric"
              value={integer.format(Number(goal || 0))}
              onChange={(event) =>
                setGoal(event.target.value.replace(/\D/g, ""))
              }
              required
            />
            <LocalizedInput type="hidden" name="goal_amount" value={goal} />
          </label>
          <label>
            <span><LocalizedCopy>{"Batas campaign"}</LocalizedCopy></span>
            <SlivaDatePicker name="ends_at" type="date" required />
          </label>
          <LocalizedButton
            className="primary-button full"
            disabled={busy || Number(goal) < 100000}
          >
            <LocalizedCopy>{busy ? "Mengirim…" : "Kirim untuk verifikasi"}</LocalizedCopy>
          </LocalizedButton>
        </form>
      </section>
    </div>
  );
}
