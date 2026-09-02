"use client";

import NextImage from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { io, type Socket } from "socket.io-client";
import { startConsultationMedia, type ConsultationMedia } from "../../lib/consultation-sfu";
import type { Pet } from "../../data/mock";
import {
  applyAdoption,
  createAdoptionListing,
  createConsultation,
  createDocumentRequest,
  createPaymentIntent,
  getAdoptions,
  getConsultationPlans,
  getConsultationMessages,
  getCurrentPetOwnerUserID,
  getDocumentProducts,
  getMyConsultations,
  getVeterinarians,
  isPetOwnerAuthenticated,
  sendConsultationMessage,
  type AdoptionListing,
  type Consultation,
  type ConsultationPlan,
  type DocumentProduct,
  type PaymentIntent,
  type Veterinarian,
} from "../../lib/platform-api";
import {
  BatpayPaymentPanel,
  PaymentMethodPicker,
} from "../payments/BatpayPayment";

type PayableConsultation = Consultation & { batpay?: PaymentIntent };

type Props = {
  mode: "consult" | "adoption" | "documents";
  pet: Pet;
  notify: (message: string) => void;
};
const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
// planCharge is what the customer actually pays: consultation_plans carries a
// discount_percent the backend applies when it creates the order, so quoting
// plan.price alone advertises a price nobody is charged. The rounding matches
// operations/care_social.go — half up to whole rupiah on the payable.
function planCharge(plan: ConsultationPlan): number {
  return Math.round((plan.price * (100 - plan.discount_percent)) / 100);
}
function requireLogin(notify: (message: string) => void) {
  if (isPetOwnerAuthenticated()) return true;
  notify("Silakan login terlebih dahulu untuk melanjutkan.");
  window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
  return false;
}

export default function CareMarketplace({ mode, pet, notify }: Props) {
  const [doctors, setDoctors] = useState<Veterinarian[]>([]);
  const [plans, setPlans] = useState<ConsultationPlan[]>([]);
  const [adoptions, setAdoptions] = useState<AdoptionListing[]>([]);
  const [documents, setDocuments] = useState<DocumentProduct[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Veterinarian | null>(
    null,
  );
  const [selectedPlan, setSelectedPlan] = useState<ConsultationPlan | null>(
    null,
  );
  const [selectedAdoption, setSelectedAdoption] =
    useState<AdoptionListing | null>(null);
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentProduct | null>(null);
  const [pendingPayment, setPendingPayment] =
    useState<PayableConsultation | null>(null);
  const [room, setRoom] = useState<Consultation | null>(null);
  const [filter, setFilter] = useState("all");
  const [adoptionComposer, setAdoptionComposer] = useState(false);
  const [adoptionSearch, setAdoptionSearch] = useState("");
  const [species, setSpecies] = useState("all");
  const [sex, setSex] = useState("all");
  const [size, setSize] = useState("all");
  const [city, setCity] = useState("all");
  const [health, setHealth] = useState("all");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mode === "consult") {
        const values = await Promise.allSettled([
          getVeterinarians(),
          getConsultationPlans(),
          ...(isPetOwnerAuthenticated() ? [getMyConsultations()] : []),
        ]);
        if (cancelled) return;
        const [v, p, c] = values;
        if (v?.status === "fulfilled") setDoctors(v.value.data);
        if (p?.status === "fulfilled") setPlans(p.value.data);
        if (c?.status === "fulfilled") setConsultations(c.value.data);
      } else if (mode === "adoption") {
        const result = await getAdoptions();
        if (!cancelled) setAdoptions(result.data);
      } else {
        const result = await getDocumentProducts();
        if (!cancelled) setDocuments(result.data);
      }
    })().catch(
      (error) =>
        !cancelled &&
        notify(
          error instanceof Error ? error.message : "Data belum dapat dimuat",
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [mode, notify]);
  const doctorPlans = useMemo(
    () =>
      selectedDoctor
        ? plans.filter(
            (p) =>
              p.veterinarian_id === selectedDoctor.id ||
              selectedDoctor.id.startsWith("vet-"),
          )
        : plans,
    [plans, selectedDoctor],
  );
  const adoptionCities = useMemo(
    () => [...new Set(adoptions.map((item) => item.city))].sort(),
    [adoptions],
  );
  const filteredAdoptions = useMemo(
    () =>
      adoptions.filter((item) => {
        const query = adoptionSearch.trim().toLowerCase();
        const matchesQuery =
          !query ||
          `${item.name} ${item.breed} ${item.city} ${item.description}`
            .toLowerCase()
            .includes(query);
        const matchesHealth =
          health === "all" ||
          (health === "vaccinated" && item.vaccinated) ||
          (health === "sterilized" && item.sterilized);
        return (
          matchesQuery &&
          (species === "all" || item.species.toLowerCase() === species) &&
          (sex === "all" || item.sex.toLowerCase() === sex) &&
          (size === "all" || item.size.toLowerCase() === size) &&
          (city === "all" || item.city === city) &&
          matchesHealth
        );
      }),
    [adoptions, adoptionSearch, species, sex, size, city, health],
  );
  if (mode === "consult")
    return (
      <>
        <section className="care-hero">
          <div>
            <span>SLIVADOC VIRTUAL VET</span>
            <h2>Dokter hewan, sedekat layar kamu.</h2>
            <p>
              Pilih chat, voice call, video call, atau paket bundling. Setiap
              konsultasi otomatis masuk ke medical record {pet.name}.
            </p>
            <div>
              <button
                className="primary-button"
                onClick={() =>
                  document
                    .querySelector("#doctor-list")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Cari dokter online
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  consultations[0]
                    ? setRoom(consultations[0])
                    : notify("Belum ada konsultasi aktif")
                }
              >
                Konsultasi saya
              </button>
            </div>
          </div>
          <aside>
            <b>24/7</b>
            <small>dokter terverifikasi</small>
            <span>Chat langsung · Panggilan privat · Resep digital</span>
          </aside>
        </section>
        <div className="care-trust">
          <span>✓ STRV terverifikasi</span>
          <span>🔒 Room privat</span>
          <span>🩺 Medical record terintegrasi</span>
          <span>⚡ Dokter online saat ini</span>
        </div>
        <section id="doctor-list" className="section-title-world">
          <div>
            <span>DOKTER TERSEDIA</span>
            <h2>Pilih dokter untuk {pet.name}</h2>
          </div>
          <div className="hub-tabs">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Semua
            </button>
            <button
              className={filter === "online" ? "active" : ""}
              onClick={() => setFilter("online")}
            >
              Online sekarang
            </button>
          </div>
        </section>
        <div className="doctor-grid">
          {doctors
            .filter(
              (d) => filter === "all" || d.availability_status === "online",
            )
            .map((doctor, index) => (
              <article className="doctor-card" key={doctor.id}>
                <div className={`doctor-photo doctor-${index % 3}`}>
                  {doctor.photo_url ? (
                    <NextImage
                      src={doctor.photo_url}
                      alt={doctor.full_name}
                      width={480}
                      height={480}
                      unoptimized
                    />
                  ) : (
                    <span>👩🏻‍⚕️</span>
                  )}
                  <i className={doctor.availability_status}>
                    {doctor.availability_status === "online"
                      ? "● Online"
                      : doctor.availability_status}
                  </i>
                </div>
                <div>
                  <small>✓ DOKTER TERVERIFIKASI</small>
                  <h3>{doctor.full_name}</h3>
                  <p>{doctor.specialties.join(" · ")}</p>
                  <div className="doctor-rating">
                    <b>★ {doctor.rating}</b>
                    <span>
                      {doctor.consultation_count.toLocaleString("id-ID")}{" "}
                      konsultasi
                    </span>
                    <span>{doctor.experience_years} tahun</span>
                  </div>
                  <em>{doctor.bio}</em>
                  <footer>
                    <span>
                      Mulai <b>{money.format(doctor.starting_price)}</b>
                    </span>
                    <button
                      className="primary-button"
                      onClick={() => setSelectedDoctor(doctor)}
                    >
                      Lihat paket
                    </button>
                  </footer>
                </div>
              </article>
            ))}
        </div>
        {selectedDoctor && (
          <div
            className="modal-overlay"
            onMouseDown={() => setSelectedDoctor(null)}
          >
            <section
              className="modal care-modal"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setSelectedDoctor(null)}
              >
                ×
              </button>
              <div className="care-doctor-head">
                <span>👩🏻‍⚕️</span>
                <div>
                  <small>✓ STRV {selectedDoctor.strv_number}</small>
                  <h2>{selectedDoctor.full_name}</h2>
                  <p>{selectedDoctor.specialties.join(" · ")}</p>
                </div>
              </div>
              <h3>Pilih cara konsultasi</h3>
              <div className="plan-grid">
                {doctorPlans.map((plan) => (
                  <button
                    key={plan.id}
                    className={selectedPlan?.id === plan.id ? "active" : ""}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <i>
                      {plan.mode === "chat"
                        ? "💬"
                        : plan.mode === "voice"
                          ? "📞"
                          : plan.mode === "video"
                            ? "🎥"
                            : "✦"}
                    </i>
                    <span>
                      <b>{plan.name}</b>
                      <small>{plan.description}</small>
                      <em>
                        {plan.duration_minutes >= 60 && plan.mode === "chat"
                          ? "24 jam"
                          : `${plan.duration_minutes} menit`}{" "}
                        · follow-up {plan.followup_days} hari
                      </em>
                    </span>
                    {plan.discount_percent > 0 ? (
                      <strong className="plan-price-discounted">
                        <s>{money.format(plan.price)}</s>
                        <span>{money.format(planCharge(plan))}</span>
                      </strong>
                    ) : (
                      <strong>{money.format(plan.price)}</strong>
                    )}
                    {plan.discount_percent > 0 && (
                      <mark>Hemat {plan.discount_percent}%</mark>
                    )}
                  </button>
                ))}
              </div>
              {selectedPlan && (
                <ConsultBooking
                  pet={pet}
                  doctor={selectedDoctor}
                  plan={selectedPlan}
                  notify={notify}
                  complete={(value) => {
                    setPendingPayment(value);
                    setSelectedDoctor(null);
                    setSelectedPlan(null);
                  }}
                />
              )}
            </section>
          </div>
        )}
        {pendingPayment && (
          <ConsultationPayment
            consultation={pendingPayment}
            close={() => setPendingPayment(null)}
            notify={notify}
            openRoom={(value) => {
              setPendingPayment(null);
              setRoom(value);
            }}
          />
        )}
        {room && (
          <ConsultationRoom
            consultation={room}
            close={() => setRoom(null)}
            notify={notify}
          />
        )}
      </>
    );
  if (mode === "adoption")
    return (
      <>
        <section className="adoption-hero">
          <div>
            <span>ADOPT WITH CONFIDENCE</span>
            <h2>Dari pet parent, untuk keluarga baru.</h2>
            <p>
              Pet owner dapat mengajukan pet miliknya. Tim pendamping memeriksa
              identitas, kesehatan, kesiapan adopter, dan proses serah terima.
            </p>
            <button
              className="primary-button"
              onClick={() => requireLogin(notify) && setAdoptionComposer(true)}
            >
              Ajukan pet saya
            </button>
          </div>
          <aside>
            ♡<b>Responsible adoption</b>
            <small>Bukan jual beli hewan</small>
          </aside>
        </section>
        <div className="adoption-steps">
          {[
            "Pilih pet",
            "Isi screening",
            "Interview & home visit",
            "Meet & greet",
            "Serah terima",
          ].map((item, i) => (
            <span key={item}>
              <i>{i + 1}</i>
              <b>{item}</b>
            </span>
          ))}
        </div>
        <section className="adoption-filter-panel" aria-label="Filter adopsi">
          <label className="adoption-search">
            <span>⌕</span>
            <input
              value={adoptionSearch}
              onChange={(event) => setAdoptionSearch(event.target.value)}
              placeholder="Cari nama, ras, kota, atau karakter pet…"
            />
          </label>
          <select
            value={species}
            onChange={(event) => setSpecies(event.target.value)}
            aria-label="Jenis hewan"
          >
            <option value="all">Semua hewan</option>
            <option value="dog">Anjing</option>
            <option value="cat">Kucing</option>
          </select>
          <select
            value={sex}
            onChange={(event) => setSex(event.target.value)}
            aria-label="Jenis kelamin"
          >
            <option value="all">Semua gender</option>
            <option value="male">Jantan</option>
            <option value="female">Betina</option>
          </select>
          <select
            value={size}
            onChange={(event) => setSize(event.target.value)}
            aria-label="Ukuran"
          >
            <option value="all">Semua ukuran</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            aria-label="Kota"
          >
            <option value="all">Semua kota</option>
            {adoptionCities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={health}
            onChange={(event) => setHealth(event.target.value)}
            aria-label="Standar kesehatan"
          >
            <option value="all">Semua kesehatan</option>
            <option value="vaccinated">Sudah vaksin</option>
            <option value="sterilized">Sudah steril</option>
          </select>
        </section>
        <div className="adoption-result-count">
          <b>{filteredAdoptions.length} pet</b>
          <span>sesuai filter dan siap dikenalkan</span>
        </div>
        <div className="adoption-grid">
          {filteredAdoptions.map((item, index) => (
            <article className="adoption-card" key={item.id}>
              <div className={`adoption-photo adoption-${index % 3}`}>
                {item.photo_urls?.[0] ? (
                  <NextImage
                    src={item.photo_urls[0]}
                    alt={item.name}
                    width={640}
                    height={480}
                    unoptimized
                  />
                ) : (
                  <span>
                    {item.species.toLowerCase() === "cat" ? "🐈" : "🐕"}
                  </span>
                )}
                {item.featured && <i>PILIHAN</i>}
              </div>
              <div>
                <small>⌖ {item.city}</small>
                <span className="adoption-source">
                  {item.source_type === "pet_owner"
                    ? "Diajukan pet owner"
                    : "Mitra penyelamat"}{" "}
                  · {item.submitted_by_name}
                </span>
                <h3>{item.name}</h3>
                <p>
                  {item.breed} · {Math.max(1, Math.round(item.age_months / 12))}{" "}
                  tahun ·{" "}
                  {item.sex === "male"
                    ? "Jantan"
                    : item.sex === "female"
                      ? "Betina"
                      : item.sex}
                </p>
                <em>{item.description}</em>
                <div className="pet-tags">
                  {item.personality.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
                <div className="health-checks">
                  <span className={item.vaccinated ? "pass" : "pending"}>
                    ✓ {item.vaccinated ? "Vaksin lengkap" : "Vaksin proses"}
                  </span>
                  <span className={item.sterilized ? "pass" : "pending"}>
                    ✓ {item.sterilized ? "Steril" : "Belum steril"}
                  </span>
                </div>
                <footer>
                  <b>
                    {item.adoption_fee
                      ? `Donasi ${money.format(item.adoption_fee)}`
                      : "Tanpa biaya"}
                  </b>
                  <button
                    className="primary-button"
                    onClick={() => setSelectedAdoption(item)}
                  >
                    Kenalan
                  </button>
                </footer>
              </div>
            </article>
          ))}
        </div>
        {filteredAdoptions.length === 0 && (
          <div className="empty-state">
            <span>🐾</span>
            <h3>Belum ada pet yang cocok</h3>
            <p>Ubah kombinasi filter untuk melihat kandidat adopsi lain.</p>
          </div>
        )}
        {selectedAdoption && (
          <AdoptionModal
            item={selectedAdoption}
            close={() => setSelectedAdoption(null)}
            notify={notify}
          />
        )}{" "}
        {adoptionComposer && (
          <AdoptionListingModal
            pet={pet}
            close={() => setAdoptionComposer(false)}
            notify={notify}
            created={async () => setAdoptions((await getAdoptions()).data)}
          />
        )}
      </>
    );
  return (
    <>
      <section className="document-hero">
        <div>
          <span>SLIVADOC PET DOCUMENT CONCIERGE</span>
          <h2>Urus dokumen pet tanpa bingung.</h2>
          <p>
            Akte pet, surat kesehatan, vaksin, microchip, karantina, hingga izin
            perjalanan pesawat dan kapal—dipandu checklist dan status yang
            transparan.
          </p>
        </div>
        <aside>
          <span>▤</span>
          <b>Dokumen terverifikasi</b>
          <small>Diproses bersama dokter & partner resmi</small>
        </aside>
      </section>
      <section className="document-assurance">
        <span>✓ Checklist sesuai kebutuhan</span>
        <span>✓ Status transparan</span>
        <span>✓ Dokumen digital tersimpan</span>
      </section>
      <div className="document-product-grid">
        {documents.map((item, index) => (
          <article className="document-product-card" key={item.id}>
            <span className={`document-product-icon doc-${index % 4}`}>
              {item.category.includes("flight")
                ? "✈"
                : item.category === "ship"
                  ? "⚓"
                  : "▤"}
            </span>
            <div>
              <small>
                {item.code} · ESTIMASI {item.processing_days} HARI KERJA
              </small>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <b className="requirement-title">Yang perlu disiapkan</b>
              <ul>
                {item.requirements.slice(0, 4).map((req) => (
                  <li key={req}>✓ {req}</li>
                ))}
              </ul>
              <footer>
                <span>
                  <small>Estimasi total</small>
                  <b>{money.format(item.total_fee)}</b>
                </span>
                <button
                  className="primary-button"
                  onClick={() => setSelectedDocument(item)}
                >
                  Lihat & ajukan
                </button>
              </footer>
            </div>
          </article>
        ))}
      </div>
      <section className="document-process">
        <header>
          <small>ALUR PENGAJUAN</small>
          <h2>Satu timeline, status selalu jelas</h2>
        </header>
        <div>
          {[
            "Draft & checklist",
            "Verifikasi dokumen",
            "Pemeriksaan",
            "Proses instansi",
            "Dokumen terbit",
          ].map((item, i) => (
            <span key={item}>
              <i>{i + 1}</i>
              <b>{item}</b>
              <small>
                {i === 0
                  ? "Lengkapi persyaratan dengan panduan"
                  : i === 4
                    ? "Unduh dokumen digital"
                    : "Notifikasi setiap perubahan"}
              </small>
            </span>
          ))}
        </div>
      </section>
      {selectedDocument && (
        <DocumentModal
          item={selectedDocument}
          pet={pet}
          close={() => setSelectedDocument(null)}
          notify={notify}
        />
      )}
    </>
  );
}

function ConsultationPayment({
  consultation,
  close,
  notify,
  openRoom,
}: {
  consultation: PayableConsultation;
  close: () => void;
  notify: (m: string) => void;
  openRoom: (c: Consultation) => void;
}) {
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal payment-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          ×
        </button>
        {consultation.batpay ? (
          <BatpayPaymentPanel
            payment={consultation.batpay}
            onPaid={() => {
              notify("Pembayaran berhasil. Ruang konsultasi sudah aktif.");
              openRoom({
                ...consultation,
                payment_status: "paid",
                status: "waiting",
              });
            }}
          />
        ) : (
          <>
            <h2>Pembayaran belum dibuat</h2>
            <p>Tutup dialog dan pilih paket kembali.</p>
          </>
        )}
      </section>
    </div>
  );
}

function ConsultBooking({
  pet,
  doctor,
  plan,
  notify,
  complete,
}: {
  pet: Pet;
  doctor: Veterinarian;
  plan: ConsultationPlan;
  notify: (m: string) => void;
  complete: (c: PayableConsultation) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("qris");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireLogin(notify)) return;
    setBusy(true);
    const v = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await createConsultation({
        ...(/^[0-9a-f-]{36}$/i.test(pet.id) ? { pet_id: pet.id } : {}),
        veterinarian_id: doctor.id,
        plan_id: plan.id,
        complaint: v.complaint,
        symptoms: String(v.symptoms || "")
          .split(",")
          .filter(Boolean),
        scheduled_at: v.scheduled_at
          ? new Date(String(v.scheduled_at)).toISOString()
          : undefined,
      });
      const batpay =
        result.amount > 0
          ? await createPaymentIntent("consultation", result.id, paymentMethod)
          : undefined;
      notify(
        result.amount > 0
          ? "Konsultasi dibuat. Selesaikan pembayaran untuk membuka room."
          : "Konsultasi gratis berhasil dibuat.",
      );
      complete({
        ...result,
        batpay,
        doctor_name: doctor.full_name,
        plan_name: plan.name,
        mode: plan.mode,
        pet_name: pet.name,
      });
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Konsultasi atau pembayaran belum dapat dibuat",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="consult-booking" onSubmit={submit}>
      <label>
        <span>Keluhan utama {pet.name}</span>
        <textarea
          name="complaint"
          placeholder="Ceritakan gejala, sejak kapan, pola makan, dan perubahan perilaku…"
          required
          minLength={5}
        />
      </label>
      <div>
        <label>
          <span>Gejala (pisahkan koma)</span>
          <input name="symptoms" placeholder="gatal, nafsu makan turun" />
        </label>
        <label>
          <span>Jadwal</span>
          <input name="scheduled_at" type="datetime-local" required />
        </label>
      </div>
      <div className="checkout-line">
        <span>Total paket</span>
        {plan.discount_percent > 0 ? (
          <b className="plan-price-discounted">
            <s>{money.format(plan.price)}</s>
            <span>{money.format(planCharge(plan))}</span>
          </b>
        ) : (
          <b>{money.format(plan.price)}</b>
        )}
      </div>
      {planCharge(plan) > 0 && (
        <PaymentMethodPicker
          value={paymentMethod}
          onChange={setPaymentMethod}
          disabled={busy}
        />
      )}
      <button className="primary-button full" disabled={busy}>
        {busy
          ? "Membuat pembayaran…"
          : planCharge(plan) > 0
            ? "Lanjut ke pembayaran"
            : "Mulai konsultasi gratis"}
      </button>
    </form>
  );
}

function ConsultationRoom({
  consultation,
  close,
  notify,
}: {
  consultation: Consultation;
  close: () => void;
  notify: (m: string) => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const mediaRef = useRef<ConsultationMedia | null>(null);
  const currentUserIdRef = useRef("");
  const localMedia = useRef<HTMLDivElement | null>(null);
  const remoteMedia = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<
    Array<{ id: string; body: string; mine: boolean }>
  >([]);
  const [text, setText] = useState("");
  const [state, setState] = useState("Menghubungkan room…");
  const [call, setCall] = useState<"idle" | "ringing" | "active">("idle");
  const [incomingMode, setIncomingMode] = useState<"voice" | "video">("voice");
  // Each plan sells one call channel: the seeded plans give `voice` its
  // voice_minutes, `video` its video_minutes, and only `bundle` carries both,
  // so the room must offer exactly what was paid for. Video is the premium
  // channel and is opt-in per mode — an unrecognised mode (reachable only by
  // widening the consultation_plans.mode CHECK) degrades to voice-only instead
  // of handing out a video consultation on a cheaper package.
  const voiceAllowed = consultation.mode !== "chat";
  const videoAllowed =
    consultation.mode === "video" || consultation.mode === "bundle";
  const realtime =
    process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:8091";
  const endCall = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    localMedia.current?.replaceChildren();
    remoteMedia.current?.replaceChildren();
    setCall("idle");
  }, []);
  const connectMedia = useCallback(
    async (video: boolean) => {
      const accessToken =
        localStorage.getItem("slivadoc.access_token") ||
        localStorage.getItem("access_token");
      if (!accessToken) throw new Error("Login diperlukan untuk membuka media.");
      endCall();
      mediaRef.current = await startConsultationMedia({
        realtimeURL: realtime,
        consultationId: consultation.id,
        accessToken,
        video,
        localContainer: localMedia.current,
        remoteContainer: remoteMedia.current,
      });
      setCall("active");
    },
    [consultation.id, endCall, realtime],
  );
  useEffect(() => {
    let cancelled = false;
    void getConsultationMessages(consultation.id)
      .then((response) => {
        if (cancelled) return;
        const userID = getCurrentPetOwnerUserID();
        setMessages(
          response.data.map((item) => ({
            id: item.id,
            body: item.body,
            mine: item.sender_user_id === userID,
          })),
        );
      })
      .catch((error) => {
        if (!cancelled)
          notify(
            error instanceof Error
              ? error.message
              : "Riwayat pesan belum dapat dimuat",
          );
      });
    const token =
      localStorage.getItem("slivadoc.access_token") ||
      localStorage.getItem("access_token");
    if (!token) {
      queueMicrotask(() => setState("Login diperlukan"));
      return;
    }
    const socket = io(realtime, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    let currentUserId = "";
    socket.emit(
      "consultation:join",
      { consultationId: consultation.id },
      (r: { ok: boolean; userId?: string }) => {
        currentUserIdRef.current = r.userId || "";
        currentUserId = r.userId || "";
        setState(
          r.ok ? "● Dokter dan room terhubung" : "Room belum dapat dibuka",
        );
      },
    );
    socket.on("consultation:message", (m) =>
      setMessages((v) => {
        const optimistic = v.find((x) => x.id === m.clientMessageId);
        if (optimistic)
          return v.map((x) =>
            x.id === m.clientMessageId ? { ...x, id: m.id || x.id } : x,
          );
        return v.some((x) => x.id === m.id)
          ? v
          : [
              ...v,
              {
                id: m.id || m.clientMessageId,
                body: m.body,
                mine: m.senderUserId === currentUserId,
              },
            ];
      }),
    );
    socket.on("call:ring", (p: { mode?: string }) => {
      setIncomingMode(p.mode === "video" ? "video" : "voice");
      setCall("ringing");
    });
    socket.on("call:accept", () => setCall("active"));
    socket.on("call:reject", () => {
      endCall();
      notify("Panggilan ditolak oleh penerima");
    });
    socket.on("call:end", endCall);
    socket.on(
      "call:tracks",
      (payload: { fromUserId?: string; sessionId?: string; tracks?: { sessionId?: string; trackName: string; kind?: string }[] }) => {
        if (payload.fromUserId && payload.fromUserId === currentUserIdRef.current) return;
        void mediaRef.current?.pull(
          (payload.tracks || []).map((track) => ({
            ...track,
            sessionId: track.sessionId ?? payload.sessionId ?? "",
          })),
        );
      },
    );
    return () => {
      cancelled = true;
      socket.disconnect();
      endCall();
    };
  }, [consultation.id, endCall, notify, realtime]);
  async function startCall(video: boolean) {
    const socket = socketRef.current;
    if (!socket) return;
    try {
      await connectMedia(video);
      socket.emit("call:ring", {
        consultationId: consultation.id,
        mode: video ? "video" : "voice",
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Izinkan kamera dan mikrofon untuk memulai panggilan");
    }
  }
  async function accept() {
    const socket = socketRef.current;
    if (!socket) return;
    try {
      await connectMedia(incomingMode === "video");
      socket.emit("call:accept", { consultationId: consultation.id, mode: incomingMode });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Panggilan belum dapat diterima");
    }
  }
  async function send() {
    if (!text.trim()) return;
    const id = crypto.randomUUID();
    const body = text.trim();
    const socket = socketRef.current;
    setMessages((v) => [...v, { id, body, mine: true }]);
    setText("");
    if (socket?.connected) {
      socket.emit(
        "consultation:message",
        {
          consultationId: consultation.id,
          clientMessageId: id,
          messageType: "text",
          body,
        },
        (r: { ok: boolean }) => {
          if (!r.ok) {
            setMessages((current) => current.filter((item) => item.id !== id));
            notify("Pesan gagal dikirim");
          }
        },
      );
      return;
    }
    try {
      await sendConsultationMessage(consultation.id, {
        client_message_id: id,
        message_type: "text",
        body,
      });
      notify("Realtime terputus; pesan tetap tersimpan melalui API.");
    } catch (error) {
      setMessages((current) => current.filter((item) => item.id !== id));
      notify(error instanceof Error ? error.message : "Pesan gagal dikirim");
    }
  }
  return (
    <div className="modal-overlay">
      <section className="modal consult-room-modal">
        <button className="modal-close" onClick={close}>
          ×
        </button>
        <header>
          <div>
            <small>{state}</small>
            <h2>{consultation.doctor_name}</h2>
            <p>
              {consultation.pet_name} · {consultation.plan_name}
            </p>
          </div>
          <div>
            {voiceAllowed && (
              <button onClick={() => void startCall(false)}>📞</button>
            )}
            {videoAllowed && (
              <button onClick={() => void startCall(true)}>🎥</button>
            )}
            <button
              className="danger"
              onClick={() => {
                socketRef.current?.emit("call:end", {
                  consultationId: consultation.id,
                });
                endCall();
              }}
            >
              ×
            </button>
          </div>
        </header>
        <div className="webrtc-stage" style={{ display: call === "idle" ? "none" : undefined }}>
          <div ref={remoteMedia} className="sfu-remote-media" style={{ width: "100%", height: "100%" }} />
          <div
            ref={localMedia}
            className="sfu-local-media"
            style={{ position: "absolute", right: 12, bottom: 12, width: 150, height: 100, overflow: "hidden", border: "2px solid white", borderRadius: 12, background: "#102f45" }}
          />
          {call === "ringing" && (
            <div className="inline-actions">
              <button className="primary-button" onClick={() => void accept()}>
                Terima panggilan
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  socketRef.current?.emit("call:reject", {
                    consultationId: consultation.id,
                  });
                  endCall();
                }}
              >
                Tolak
              </button>
            </div>
          )}
        </div>
        <div className="consult-messages">
          {messages.length === 0 && (
            <div className="room-welcome">
              <span>🩺</span>
              <b>Ruang konsultasi privat</b>
              <small>
                Pesan disimpan aman dan dirangkum ke medical record.
              </small>
            </div>
          )}
          {messages.map((m) => (
            <p className={m.mine ? "mine" : ""} key={m.id}>
              {m.body}
            </p>
          ))}
        </div>
        <footer>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Tulis pesan untuk dokter…"
          />
          <button onClick={send}>Kirim</button>
        </footer>
      </section>
    </div>
  );
}

function AdoptionListingModal({
  pet,
  close,
  notify,
  created,
}: {
  pet: Pet;
  close: () => void;
  notify: (m: string) => void;
  created: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await createAdoptionListing({
        pet_id: pet.id,
        city: values.city,
        description: values.description,
        personality: String(values.personality || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        health_status: values.health_status,
        vaccinated: values.vaccinated === "yes",
        sterilized: values.sterilized === "yes",
        photo_urls: pet.photoUrl ? [pet.photoUrl] : [],
        adoption_fee: Number(values.adoption_fee || 0),
      });
      await created();
      notify("Pengajuan adopsi masuk ke tim pendamping untuk diperiksa");
      close();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Pengajuan belum dapat dibuat",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal form-modal adoption-listing-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          ×
        </button>
        <span className="section-eyebrow">AJUKAN PET SAYA</span>
        <h2>Carikan keluarga baru untuk {pet.name}</h2>
        <p className="muted-copy">
          Hanya pet milikmu yang dapat diajukan. Data identitas dan kesehatan
          akan diperiksa sebelum listing tampil.
        </p>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span>Pet</span>
            <input value={`${pet.name} · ${pet.breed}`} readOnly />
          </label>
          <label>
            <span>Kota domisili</span>
            <input name="city" minLength={2} required />
          </label>
          <label>
            <span>Cerita & alasan adopsi</span>
            <textarea
              name="description"
              minLength={20}
              placeholder="Ceritakan kebutuhan, kebiasaan, dan alasan mencari keluarga baru tanpa membagikan kontak pribadi."
              required
            />
          </label>
          <label>
            <span>Karakter (pisahkan koma)</span>
            <input name="personality" placeholder="ramah, tenang, indoor" />
          </label>
          <label>
            <span>Kondisi kesehatan</span>
            <textarea
              name="health_status"
              placeholder="Pemeriksaan terakhir, obat rutin, atau kebutuhan khusus"
            />
          </label>
          <div className="form-two">
            <label>
              <span>Status vaksin</span>
              <select name="vaccinated">
                <option value="yes">Lengkap</option>
                <option value="no">Belum lengkap</option>
              </select>
            </label>
            <label>
              <span>Sterilisasi</span>
              <select name="sterilized">
                <option value="yes">Sudah</option>
                <option value="no">Belum</option>
              </select>
            </label>
          </div>
          <label>
            <span>Donasi biaya perawatan (opsional)</span>
            <input name="adoption_fee" type="number" min="0" defaultValue="0" />
          </label>
          <div className="adoption-review-note">
            Setelah dikirim: pemeriksaan oleh tim Operasional & Pendamping
            Adopsi → publikasi → screening calon adopter → persetujuan pet owner
            → serah terima terpantau.
          </div>
          <button className="primary-button full" disabled={busy}>
            {busy ? "Mengirim pengajuan…" : "Kirim untuk diperiksa"}
          </button>
        </form>
      </section>
    </div>
  );
}

function AdoptionModal({
  item,
  close,
  notify,
}: {
  item: AdoptionListing;
  close: () => void;
  notify: (m: string) => void;
}) {
  const [step, setStep] = useState(0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireLogin(notify)) return;
    const v = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await applyAdoption(item.id, {
        ...v,
        has_other_pets: v.has_other_pets === "yes",
      });
      setStep(2);
      notify("Pengajuan adopsi berhasil dikirim");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Pengajuan belum dapat dikirim",
      );
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal adoption-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          ×
        </button>
        {step === 2 ? (
          <div className="world-success">
            <span>✓</span>
            <h2>Pengajuan terkirim</h2>
            <p>
              Tim pendamping dan pet owner akan meninjau kesiapan adopter
              sebelum menjadwalkan meet & greet bersama {item.name}.
            </p>
            <button className="primary-button" onClick={close}>
              Selesai
            </button>
          </div>
        ) : (
          <>
            <div className="care-doctor-head">
              <span>{item.species.toLowerCase() === "cat" ? "🐈" : "🐕"}</span>
              <div>
                <small>
                  RESPONSIBLE ADOPTION ·{" "}
                  {item.source_type === "pet_owner" ? "PET OWNER" : "MITRA"}
                </small>
                <h2>Kenalan dengan {item.name}</h2>
                <p>
                  {item.breed} · {item.city}
                </p>
              </div>
            </div>
            {step === 0 ? (
              <>
                <p>{item.description}</p>
                <div className="world-detail-grid">
                  <span>
                    <small>Diajukan oleh</small>
                    <b>{item.submitted_by_name}</b>
                  </span>
                  <span>
                    <small>Kesehatan</small>
                    <b>{item.health_status}</b>
                  </span>
                  <span>
                    <small>Vaksin</small>
                    <b>{item.vaccinated ? "Lengkap" : "Dalam proses"}</b>
                  </span>
                  <span>
                    <small>Sterilisasi</small>
                    <b>{item.sterilized ? "Sudah" : "Belum"}</b>
                  </span>
                </div>
                <button
                  className="primary-button full"
                  onClick={() => setStep(1)}
                >
                  Mulai screening adopter
                </button>
              </>
            ) : (
              <form className="world-form" onSubmit={submit}>
                <label>
                  <span>Nama lengkap</span>
                  <input name="applicant_name" required />
                </label>
                <label>
                  <span>Nomor untuk verifikasi privat</span>
                  <input name="phone" inputMode="tel" required />
                </label>
                <label>
                  <span>Alamat tempat tinggal</span>
                  <textarea name="address" required />
                </label>
                <label>
                  <span>Tipe hunian</span>
                  <select name="housing_type">
                    <option>Rumah milik</option>
                    <option>Rumah sewa</option>
                    <option>Apartemen</option>
                  </select>
                </label>
                <label>
                  <span>Memiliki pet lain?</span>
                  <select name="has_other_pets">
                    <option value="no">Tidak</option>
                    <option value="yes">Ya</option>
                  </select>
                </label>
                <label>
                  <span>Mengapa ingin mengadopsi {item.name}?</span>
                  <textarea name="reason" required />
                </label>
                <label>
                  <span>Pengalaman merawat pet</span>
                  <textarea name="experience" />
                </label>
                <p className="muted-copy">
                  Kontak disimpan untuk proses verifikasi dan tidak tampil pada
                  posting atau percakapan publik.
                </p>
                <button className="primary-button full">
                  Kirim pengajuan screening
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function DocumentModal({
  item,
  pet,
  close,
  notify,
}: {
  item: DocumentProduct;
  pet: Pet;
  close: () => void;
  notify: (m: string) => void;
}) {
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [requestNumber, setRequestNumber] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireLogin(notify)) return;
    setBusy(true);
    const v = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await createDocumentRequest({
        ...(/^[0-9a-f-]{36}$/i.test(pet.id) ? { pet_id: pet.id } : {}),
        product_id: item.id,
        origin_city: v.origin_city,
        destination_city: v.destination_city,
        departure_at: v.departure_at
          ? new Date(String(v.departure_at)).toISOString()
          : undefined,
        transport_type: v.transport_type,
        submitted_documents: [],
      });
      setRequestNumber(result.request_number);
      if (result.amount > 0)
        setPayment(
          await createPaymentIntent(
            "document_request",
            result.id,
            paymentMethod,
          ),
        );
      else setDone(result.request_number);
      notify(
        result.amount > 0
          ? "Permohonan dibuat, selesaikan pembayaran"
          : "Permohonan dokumen berhasil dibuat",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Permohonan atau pembayaran belum dapat dibuat",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal document-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          ×
        </button>
        {done ? (
          <div className="world-success">
            <span>▤</span>
            <h2>Permohonan dibuat</h2>
            <p>
              Nomor {done}. Checklist dan status proses tersedia di Aktivitas.
            </p>
            <button className="primary-button" onClick={close}>
              Pantau dokumen
            </button>
          </div>
        ) : payment ? (
          <BatpayPaymentPanel
            payment={payment}
            onPaid={() => setDone(requestNumber)}
          />
        ) : (
          <>
            <small className="world-kicker">
              {item.code} · {item.processing_days} HARI KERJA
            </small>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <form className="world-form" onSubmit={submit}>
              <label>
                <span>Pet</span>
                <input value={`${pet.name} · ${pet.breed}`} readOnly />
              </label>
              {item.category !== "birth_certificate" && (
                <>
                  <div className="form-two">
                    <label>
                      <span>Kota asal</span>
                      <input name="origin_city" required />
                    </label>
                    <label>
                      <span>Kota / negara tujuan</span>
                      <input name="destination_city" required />
                    </label>
                  </div>
                  <div className="form-two">
                    <label>
                      <span>Tanggal berangkat</span>
                      <input
                        name="departure_at"
                        type="datetime-local"
                        required
                      />
                    </label>
                    <label>
                      <span>Transportasi</span>
                      <select name="transport_type">
                        <option value="flight">Pesawat</option>
                        <option value="ship">Kapal</option>
                      </select>
                    </label>
                  </div>
                </>
              )}
              <div className="requirement-upload">
                {item.requirements.map((req) => (
                  <label key={req}>
                    <span>✓ {req}</span>
                    <input type="file" accept="image/*,.pdf" />
                    <button type="button">Unggah</button>
                  </label>
                ))}
              </div>
              <div className="checkout-line">
                <span>Estimasi biaya</span>
                <b>{money.format(item.total_fee)}</b>
              </div>
              {item.total_fee > 0 && (
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  disabled={busy}
                />
              )}
              <button className="primary-button full" disabled={busy}>
                {busy
                  ? "Membuat pembayaran…"
                  : item.total_fee > 0
                    ? "Ajukan & lanjut pembayaran"
                    : "Ajukan dokumen"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
