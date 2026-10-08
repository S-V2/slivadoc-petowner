"use client";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { SlivaFilePicker } from "../SlivaFilePicker";
import { LocalizedCopy, LocalizedButton, LocalizedInput, LocalizedTextarea } from "../LocalizedCopy";
import { SlivaDatePicker } from "../SlivaDatePicker";
import { usePetOwnerFlow } from "../PetOwnerFlow";
import { SlivaSelect } from "../SlivaSelect";
import { worldLabel } from "../../../shared/world-presentation";
import { CatalogStatus } from "../WorldCatalogStatus";
import { WorldPhoto } from "../WorldPhoto";
import { Icon } from "../Icon";
import { WorldCollectionHeader } from "../WorldCollectionHeader";
import { DiscountBadge } from "../DiscountBadge";

import NextImage from "next/image";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { io, type Socket } from "socket.io-client";
import {
  startConsultationMedia,
  type ConsultationMedia,
} from "../../lib/consultation-sfu";
import type { Pet } from "../../lib/petowner-domain";
import {
  applyAdoption,
  createAdoptionListing,
  createConsultation,
  createTrainerConsultation,
  createDocumentRequest,
  createPaymentIntent,
  getAdoptions,
  getConsultationPlans,
  getConsultationMessages,
  getAccessToken,
  getCurrentPetOwnerUserID,
  getDocumentProducts,
  getMyConsultations,
  getTrainerAvailability,
  getVeterinarianAvailability,
  getTrainerConsultationPlans,
  getTrainers,
  getVeterinarians,
  sendConsultationMessage,
  type AdoptionListing,
  type Consultation,
  type ConsultationPlan,
  type DocumentProduct,
  type PaymentIntent,
  type Trainer,
  type TrainerAvailabilitySlot,
  type TrainerConsultationPlan,
  type Veterinarian,
  type VeterinarianAvailabilitySlot,
} from "../../lib/platform-api";
import { QrisPaymentPanel, PaymentMethodPicker } from "../payments/QrisPayment";
import { RequirementUploads, type UploadedDocument } from "./DocumentUploads";
import { MyAdoptionApplications, MyAdoptionListings } from "./AdoptionManager";
import { AdoptionGallery } from "./AdoptionGallery";
import { uploadImage } from "../../lib/petowner-api";

type PayableConsultation = Consultation & { qrisPayment?: PaymentIntent };
type ConsultProviderFilter = "all" | "veterinarian" | "trainer";

type Props = {
  mode: "consult" | "adoption" | "documents";
  pet: Pet;
  pets?: Pet[];
  notify: (message: string) => void;
  initialVeterinarianId?: string;
};
const money = new Intl.NumberFormat(petOwnerIntlLocale(), {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
// planCharge is what the customer actually pays: consultation_plans carries a
// discount_percent the backend applies when it creates the order, so quoting
// plan.price alone advertises a price nobody is charged. The rounding matches
// operations/care_social.go — half up to whole rupiah on the payable.
function planCharge(
  plan: Pick<ConsultationPlan, "price" | "discount_percent">,
): number {
  return Math.round((plan.price * (100 - plan.discount_percent)) / 100);
}

function hasSpecialty(specialties: string[] | undefined, selected: string) {
  return (
    selected === "all" ||
    (specialties ?? []).some(
      (specialty) => specialty.trim().toLocaleLowerCase("id") === selected,
    )
  );
}

export default function CareMarketplace({
  mode,
  pet,
  pets = [pet],
  notify,
  initialVeterinarianId,
}: Props) {
  const { requireLogin, requirePet } = usePetOwnerFlow();
  const [doctors, setDoctors] = useState<Veterinarian[]>([]);
  const [plans, setPlans] = useState<ConsultationPlan[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerPlans, setTrainerPlans] = useState<TrainerConsultationPlan[]>(
    [],
  );
  const [adoptions, setAdoptions] = useState<AdoptionListing[]>([]);
  const [documents, setDocuments] = useState<DocumentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const retryCatalog = () => { setLoading(true); setLoadError(false); setCatalogVersion(value => value + 1); };
  const [selectedDoctor, setSelectedDoctor] = useState<Veterinarian | null>(
    null,
  );
  const [selectedPlan, setSelectedPlan] = useState<ConsultationPlan | null>(
    null,
  );
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [selectedTrainerPlan, setSelectedTrainerPlan] =
    useState<TrainerConsultationPlan | null>(null);
  const [selectedAdoption, setSelectedAdoption] =
    useState<AdoptionListing | null>(null);
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentProduct | null>(null);
  const [pendingPayment, setPendingPayment] =
    useState<PayableConsultation | null>(null);
  const [room, setRoom] = useState<Consultation | null>(null);
  const [filter, setFilter] = useState("all");
  const [consultProvider, setConsultProvider] =
    useState<ConsultProviderFilter>("all");
  const [consultSpecialty, setConsultSpecialty] = useState("all");
  const [consultQuery, setConsultQuery] = useState("");
  const [adoptionComposer, setAdoptionComposer] = useState(false);
  const [adoptionVersion, setAdoptionVersion] = useState(0);
  const [adoptionSearch, setAdoptionSearch] = useState("");
  const [adoptionTab, setAdoptionTab] = useState<
    "browse" | "listings" | "applications"
  >("browse");
  const [species, setSpecies] = useState("all");
  const [sex, setSex] = useState("all");
  const [size, setSize] = useState("all");
  const [city, setCity] = useState("all");
  const [health, setHealth] = useState("all");
  const deferredConsultQuery = useDeferredValue(consultQuery);
  const handledInitialVeterinarian = useRef("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mode === "consult") {
        const values = await Promise.allSettled([
          getVeterinarians(),
          getConsultationPlans(),
          getTrainers(),
          getTrainerConsultationPlans(),
        ]);
        if (cancelled) return;
        const [v, p, t, tp] = values;
        if (v?.status === "rejected" && t?.status === "rejected") throw v.reason;
        if (v?.status === "fulfilled") setDoctors(v.value.data);
        if (p?.status === "fulfilled") setPlans(p.value.data);
        if (t?.status === "fulfilled") setTrainers(t.value.data);
        if (tp?.status === "fulfilled") setTrainerPlans(tp.value.data);
      } else if (mode === "adoption") {
        const result = await getAdoptions();
        if (!cancelled) setAdoptions(result.data);
      } else {
        const result = await getDocumentProducts();
        if (!cancelled) setDocuments(result.data);
      }
    })().catch(error => {
      if (cancelled) return;
      setLoadError(true);
      notify(error instanceof Error ? error.message : "Data belum dapat dimuat");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
    };
  }, [mode, notify, catalogVersion]);
  useEffect(() => {
    if (
      mode !== "consult" ||
      !initialVeterinarianId ||
      !doctors.length ||
      handledInitialVeterinarian.current === initialVeterinarianId
    )
      return;
    handledInitialVeterinarian.current = initialVeterinarianId;
    const doctor = doctors.find((item) => item.id === initialVeterinarianId);
    if (!doctor) {
      notify(
        "Dokter yang dipilih sudah tidak tersedia. Silakan pilih dokter lain.",
      );
      return;
    }
    queueMicrotask(() => {
      setConsultProvider("veterinarian");
      setConsultSpecialty("all");
      setSelectedPlan(null);
      setSelectedDoctor(doctor);
    });
  }, [doctors, initialVeterinarianId, mode, notify]);
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
  const selectedTrainerPlans = useMemo(
    () =>
      selectedTrainer
        ? trainerPlans.filter((plan) => plan.trainer_id === selectedTrainer.id)
        : trainerPlans,
    [selectedTrainer, trainerPlans],
  );
  const consultationSpecialties = useMemo(() => {
    const providers = [
      ...(consultProvider !== "trainer" ? doctors : []),
      ...(consultProvider !== "veterinarian" ? trainers : []),
    ];
    const specialties = new Map<string, string>();
    providers.forEach((provider) =>
      (provider.specialties ?? []).forEach((specialty) => {
        const value = specialty.trim();
        if (value) specialties.set(value.toLocaleLowerCase("id"), value);
      }),
    );
    return [...specialties.entries()].sort((left, right) =>
      left[1].localeCompare(right[1], "id"),
    );
  }, [consultProvider, doctors, trainers]);
  const filteredDoctors = useMemo(() => {
    if (consultProvider === "trainer") return [];
    const query = deferredConsultQuery.trim().toLocaleLowerCase("id");
    return doctors.filter(
      (doctor) =>
        (filter === "all" || doctor.availability_status === "online") &&
        hasSpecialty(doctor.specialties, consultSpecialty) &&
        (!query ||
          `${doctor.full_name} ${doctor.strv_number} ${(doctor.specialties ?? []).join(" ")} ${(doctor.languages ?? []).join(" ")} ${doctor.bio}`
            .toLocaleLowerCase("id")
            .includes(query)),
    );
  }, [
    consultProvider,
    consultSpecialty,
    deferredConsultQuery,
    doctors,
    filter,
  ]);
  const filteredTrainers = useMemo(() => {
    if (consultProvider === "veterinarian") return [];
    const query = deferredConsultQuery.trim().toLocaleLowerCase("id");
    return trainers.filter(
      (trainer) =>
        (filter === "all" || trainer.availability_status === "online") &&
        hasSpecialty(trainer.specialties, consultSpecialty) &&
        (!query ||
          `${trainer.full_name} ${trainer.certification} ${(trainer.specialties ?? []).join(" ")} ${(trainer.languages ?? []).join(" ")} ${trainer.bio}`
            .toLocaleLowerCase("id")
            .includes(query)),
    );
  }, [
    consultProvider,
    consultSpecialty,
    deferredConsultQuery,
    filter,
    trainers,
  ]);
  const chooseConsultProvider = (provider: ConsultProviderFilter) => {
    setConsultProvider(provider);
    setConsultSpecialty("all");
  };
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
      <div className="world-collection world-collection--consult" data-collection="consult">
        <WorldCollectionHeader mode="consult">
              <LocalizedButton
                className="primary-button"
                onClick={() =>
                  document
                    .querySelector("#consult-provider-list")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              ><LocalizedCopy>{"Jelajahi provider"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                className="secondary-button"
                onClick={() => {
                  void getMyConsultations()
                    .then((response) => {
                      const latest = response.data[0];
                      if (!latest) notify("Belum ada konsultasi aktif");
                      else if (latest.payment_status === "refund_pending")
                        notify(
                          "Menunggu verifikasi pengembalian manual. Dana belum dinyatakan dikembalikan.",
                        );
                      else if (latest.payment_status === "refunded")
                        notify(
                          "Pengembalian dana konsultasi sudah dicatat sebagai terverifikasi.",
                        );
                      else if (latest.payment_status !== "paid")
                        notify(
                          "Konsultasi belum dibayar. Periksa pembayaran melalui Aktivitas.",
                        );
                      else setRoom(latest);
                    })
                    .catch((error) =>
                      notify(
                        error instanceof Error
                          ? error.message
                          : "Konsultasi belum dapat dimuat.",
                      ),
                    );
                }}
              ><LocalizedCopy>{"Konsultasi saya"}</LocalizedCopy></LocalizedButton>
        </WorldCollectionHeader>
        <div className="care-trust">
          <span><LocalizedCopy>{"✓ Dokter & trainer terverifikasi"}</LocalizedCopy></span>
          <span><LocalizedCopy>{"🔒 Room privat"}</LocalizedCopy></span>
          <span><LocalizedCopy>{"📅 Slot jadwal real-time"}</LocalizedCopy></span>
          <span><LocalizedCopy>{"⚡ Provider online saat ini"}</LocalizedCopy></span>
        </div>
        <aside className="consult-safety-note" role="note">
          <b><LocalizedCopy>{"Butuh pertolongan darurat?"}</LocalizedCopy></b>
          <span><LocalizedCopy>{"Konsultasi online bukan layanan gawat darurat. Segera bawa pet ke klinik atau rumah sakit hewan terdekat bila sulit bernapas, kejang, perdarahan berat, atau tidak sadar."}</LocalizedCopy></span>
        </aside>
        <section
          id="consult-provider-list"
          className="section-title-world consult-section-title"
        >
          <div>
            <span>
              <LocalizedCopy>{consultProvider === "trainer"
                ? "PET TRAINER TERSEDIA"
                : consultProvider === "veterinarian"
                  ? "DOKTER HEWAN TERSEDIA"
                  : "PROVIDER KONSULTASI TERSEDIA"}</LocalizedCopy>
            </span>
            <h2>
              <LocalizedCopy>{consultProvider === "trainer"
                ? "Pilih pet trainer"
                : consultProvider === "veterinarian"
                  ? "Pilih dokter hewan"
                  : "Pilih dokter atau pet trainer"}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"untuk "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy>
            </h2>
          </div>
          <div className="consult-toolbar">
            <label className="consult-provider-search">
              <span className="sr-only"><LocalizedCopy>{"Cari provider konsultasi"}</LocalizedCopy></span>
              <LocalizedInput
                type="search"
                value={consultQuery}
                onChange={(event) => setConsultQuery(event.target.value)}
                placeholder="Cari nama, spesialisasi, gejala, atau bahasa…"
                aria-label="Cari dokter hewan atau pet trainer"
              />
            </label>
            <div className="hub-tabs" aria-label="Jenis provider konsultasi">
              <LocalizedButton
                className={consultProvider === "all" ? "active" : ""}
                aria-pressed={consultProvider === "all"}
                onClick={() => chooseConsultProvider("all")}
              ><LocalizedCopy>{"Semua"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                className={consultProvider === "veterinarian" ? "active" : ""}
                aria-pressed={consultProvider === "veterinarian"}
                onClick={() => chooseConsultProvider("veterinarian")}
              ><LocalizedCopy>{"Dokter Hewan"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                className={consultProvider === "trainer" ? "active" : ""}
                aria-pressed={consultProvider === "trainer"}
                onClick={() => chooseConsultProvider("trainer")}
              ><LocalizedCopy>{"Pet Trainer"}</LocalizedCopy></LocalizedButton>
            </div>
            <label className="consult-specialty-filter">
              <span><LocalizedCopy>{"Spesialisasi"}</LocalizedCopy></span>
              <SlivaSelect
                aria-label="Filter spesialisasi konsultasi"
                value={consultSpecialty}
                onChange={(event) => setConsultSpecialty(event.target.value)}
              >
                <option value="all">Semua spesialisasi</option>
                {consultationSpecialties.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SlivaSelect>
            </label>
            <div className="hub-tabs" aria-label="Status provider">
              <LocalizedButton
                className={filter === "all" ? "active" : ""}
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              ><LocalizedCopy>{"Semua"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                className={filter === "online" ? "active" : ""}
                aria-pressed={filter === "online"}
                onClick={() => setFilter("online")}
              ><LocalizedCopy>{"Online"}</LocalizedCopy></LocalizedButton>
            </div>
          </div>
        </section>
        <CatalogStatus loading={loading} error={loadError} empty={false} title="" note="" onRetry={retryCatalog}/>
        {!loading && !loadError && filteredDoctors.length > 0 && (
          <section className="consult-provider-section">
            <LocalizedCopy>{consultProvider === "all" && <h3><LocalizedCopy>{"Dokter Hewan"}</LocalizedCopy></h3>}</LocalizedCopy>
            <div className="doctor-grid">
              <LocalizedCopy>{filteredDoctors.map((doctor, index) => (
                <article className="doctor-card" key={doctor.id}>
                  <div className={`doctor-photo doctor-${index % 3}`}>
                    <WorldPhoto avatar src={doctor.photo_url} alt={doctor.full_name} sizes="72px"/>
                    <i className={doctor.availability_status}>
                      <LocalizedCopy>{doctor.availability_status === "online"
                        ? "● Online"
                        : worldLabel(doctor.availability_status)}</LocalizedCopy>
                    </i>
                  </div>
                  <div>
                    <small><LocalizedCopy>{"✓ DOKTER TERVERIFIKASI"}</LocalizedCopy></small>
                    <h3><LocalizedCopy preserve>{doctor.full_name}</LocalizedCopy></h3>
                    <p><LocalizedCopy>{doctor.specialties.join(" · ")}</LocalizedCopy></p>
                    <div className="doctor-rating">
                      <b><LocalizedCopy>{"★ "}</LocalizedCopy><LocalizedCopy>{doctor.rating}</LocalizedCopy></b>
                      <span>
                        <LocalizedCopy>{doctor.consultation_count.toLocaleString(petOwnerIntlLocale())}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"konsultasi"}</LocalizedCopy></span>
                      <span><LocalizedCopy>{doctor.experience_years}</LocalizedCopy><LocalizedCopy>{" tahun"}</LocalizedCopy></span>
                    </div>
                    <span className="consult-provider-credential"><LocalizedCopy>{"STRV "}</LocalizedCopy><LocalizedCopy>{doctor.strv_number}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{(doctor.languages ?? []).join(", ") ||
                        "Bahasa Indonesia"}</LocalizedCopy>
                    </span>
                    <em><LocalizedCopy>{doctor.bio}</LocalizedCopy></em>
                    <footer>
                      <span><LocalizedCopy>{"Mulai "}</LocalizedCopy><b><LocalizedCopy>{money.format(doctor.starting_price)}</LocalizedCopy></b>
                      </span>
                      <LocalizedButton
                        className="primary-button"
                        onClick={() => {
                          setSelectedPlan(null);
                          setSelectedDoctor(doctor);
                        }}
                      ><LocalizedCopy>{"Lihat paket"}</LocalizedCopy></LocalizedButton>
                    </footer>
                  </div>
                </article>
              ))}</LocalizedCopy>
            </div>
          </section>
        )}
        {!loading && !loadError && filteredTrainers.length > 0 && (
          <section className="consult-provider-section">
            <LocalizedCopy>{consultProvider === "all" && <h3><LocalizedCopy>{"Pet Trainer"}</LocalizedCopy></h3>}</LocalizedCopy>
            <div className="doctor-grid">
              <LocalizedCopy>{filteredTrainers.map((trainer, index) => (
                <article className="doctor-card" key={trainer.id}>
                  <div className={`doctor-photo doctor-${index % 3}`}>
                    <WorldPhoto avatar src={trainer.photo_url} alt={trainer.full_name} sizes="72px"/>
                    <i className={trainer.availability_status}>
                      <LocalizedCopy>{trainer.availability_status === "online"
                        ? "● Online"
                        : worldLabel(trainer.availability_status)}</LocalizedCopy>
                    </i>
                  </div>
                  <div>
                    <small><LocalizedCopy>{"✓ PET TRAINER TERVERIFIKASI"}</LocalizedCopy></small>
                    <h3><LocalizedCopy preserve>{trainer.full_name}</LocalizedCopy></h3>
                    <p><LocalizedCopy>{trainer.specialties.join(" · ")}</LocalizedCopy></p>
                    <div className="doctor-rating">
                      <b><LocalizedCopy>{"★ "}</LocalizedCopy><LocalizedCopy>{trainer.rating}</LocalizedCopy></b>
                      <span>
                        <LocalizedCopy>{trainer.consultation_count.toLocaleString(petOwnerIntlLocale())}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"sesi"}</LocalizedCopy></span>
                      <span><LocalizedCopy>{trainer.experience_years}</LocalizedCopy><LocalizedCopy>{" tahun"}</LocalizedCopy></span>
                    </div>
                    <span className="consult-provider-credential">
                      <LocalizedCopy>{trainer.certification || "Trainer terverifikasi"}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{(trainer.languages ?? []).join(", ") ||
                        "Bahasa Indonesia"}</LocalizedCopy>
                    </span>
                    <em><LocalizedCopy>{trainer.bio}</LocalizedCopy></em>
                    <footer>
                      <span><LocalizedCopy>{"Mulai "}</LocalizedCopy><b><LocalizedCopy>{money.format(trainer.starting_price)}</LocalizedCopy></b>
                      </span>
                      <LocalizedButton
                        className="primary-button"
                        onClick={() => {
                          setSelectedTrainer(trainer);
                          setSelectedTrainerPlan(null);
                        }}
                      ><LocalizedCopy>{"Lihat paket"}</LocalizedCopy></LocalizedButton>
                    </footer>
                  </div>
                </article>
              ))}</LocalizedCopy>
            </div>
          </section>
        )}
        {!loading && !loadError && filteredDoctors.length === 0 && filteredTrainers.length === 0 && (
          <div className="consult-filter-empty" role="status">
            <span><LocalizedCopy>{"🔎"}</LocalizedCopy></span>
            <div>
              <h3><LocalizedCopy>{"Provider belum ditemukan"}</LocalizedCopy></h3>
              <p><LocalizedCopy>{"Coba pilih jenis provider, spesialisasi, atau status yang lain."}</LocalizedCopy></p>
            </div>
          </div>
        )}
        {selectedDoctor && (
          <div
            className="modal-overlay"
            onMouseDown={() => {
              setSelectedDoctor(null);
              setSelectedPlan(null);
            }}
          >
            <section
              className="modal care-modal"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <LocalizedButton
                className="modal-close"
                onClick={() => {
                  setSelectedDoctor(null);
                  setSelectedPlan(null);
                }}
              ><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
              <div className="care-doctor-head">
                <span><LocalizedCopy>{"👩🏻‍⚕️"}</LocalizedCopy></span>
                <div>
                  <small><LocalizedCopy>{"✓ STRV "}</LocalizedCopy><LocalizedCopy>{selectedDoctor.strv_number}</LocalizedCopy></small>
                  <h2><LocalizedCopy preserve>{selectedDoctor.full_name}</LocalizedCopy></h2>
                  <p><LocalizedCopy>{selectedDoctor.specialties.join(" · ")}</LocalizedCopy></p>
                  <p><LocalizedCopy>{selectedDoctor.bio}</LocalizedCopy></p>
                </div>
              </div>
              <h3><LocalizedCopy>{"Pilih cara konsultasi"}</LocalizedCopy></h3>
              <div className="plan-grid">
                <LocalizedCopy catalogue>{doctorPlans.map((plan) => (
                  <LocalizedButton
                    key={plan.id}
                    className={selectedPlan?.id === plan.id ? "active" : ""}
                    onClick={() => requirePet() && setSelectedPlan(plan)}
                  >
                    <i>
                      <LocalizedCopy>{plan.mode === "chat"
                        ? "💬"
                        : plan.mode === "voice"
                          ? "📞"
                          : plan.mode === "video"
                            ? "🎥"
                            : "✦"}</LocalizedCopy>
                    </i>
                    <span>
                      <b><LocalizedCopy catalogue>{plan.name}</LocalizedCopy></b>
                      <small><LocalizedCopy catalogue>{plan.description}</LocalizedCopy></small>
                      <em>
                        <LocalizedCopy>{plan.duration_minutes >= 60 && plan.mode === "chat"
                          ? "24 jam"
                          : `${plan.duration_minutes} menit`}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"· follow-up "}</LocalizedCopy><LocalizedCopy>{plan.followup_days}</LocalizedCopy><LocalizedCopy>{" hari"}</LocalizedCopy></em>
                    </span>
                    <LocalizedCopy>{plan.discount_percent > 0 ? (
                      <strong className="plan-price-discounted">
                        <s><LocalizedCopy>{money.format(plan.price)}</LocalizedCopy></s>
                        <span><LocalizedCopy>{money.format(planCharge(plan))}</LocalizedCopy></span>
                      </strong>
                    ) : (
                      <strong><LocalizedCopy>{money.format(plan.price)}</LocalizedCopy></strong>
                    )}</LocalizedCopy>
                    <LocalizedCopy>{plan.discount_percent > 0 && (
                      <DiscountBadge percent={plan.discount_percent} />
                    )}</LocalizedCopy>
                  </LocalizedButton>
                ))}</LocalizedCopy>
              </div>
              <LocalizedCopy>{selectedPlan && (
                <ConsultBooking
                  key={selectedPlan.id}
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
              )}</LocalizedCopy>
            </section>
          </div>
        )}
        {selectedTrainer && (
          <div
            className="modal-overlay"
            onMouseDown={() => setSelectedTrainer(null)}
          >
            <section
              className="modal care-modal"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <LocalizedButton
                className="modal-close"
                onClick={() => setSelectedTrainer(null)}
                aria-label="Tutup pilihan trainer"
              ><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
              <div className="care-doctor-head">
                <span><LocalizedCopy>{"🐾"}</LocalizedCopy></span>
                <div>
                  <small><LocalizedCopy>{"✓ TRAINER TERVERIFIKASI · "}</LocalizedCopy><LocalizedCopy>{selectedTrainer.certification}</LocalizedCopy>
                  </small>
                  <h2><LocalizedCopy preserve>{selectedTrainer.full_name}</LocalizedCopy></h2>
                  <p><LocalizedCopy>{selectedTrainer.specialties.join(" · ")}</LocalizedCopy></p>
                  <p><LocalizedCopy>{selectedTrainer.bio}</LocalizedCopy></p>
                </div>
              </div>
              <h3><LocalizedCopy>{"Pilih cara konsultasi"}</LocalizedCopy></h3>
              <div className="plan-grid">
                <LocalizedCopy catalogue>{selectedTrainerPlans.map((plan) => (
                  <LocalizedButton
                    key={plan.id}
                    className={
                      selectedTrainerPlan?.id === plan.id ? "active" : ""
                    }
                    onClick={() => requirePet() && setSelectedTrainerPlan(plan)}
                  >
                    <i>
                      <LocalizedCopy>{plan.mode === "chat"
                        ? "💬"
                        : plan.mode === "voice"
                          ? "📞"
                          : plan.mode === "video"
                            ? "🎥"
                            : "✦"}</LocalizedCopy>
                    </i>
                    <span>
                      <b><LocalizedCopy catalogue>{plan.name}</LocalizedCopy></b>
                      <small><LocalizedCopy catalogue>{plan.description}</LocalizedCopy></small>
                      <em>
                        <LocalizedCopy>{plan.duration_minutes}</LocalizedCopy><LocalizedCopy>{" menit · follow-up"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                        <LocalizedCopy>{plan.followup_days}</LocalizedCopy><LocalizedCopy>{" hari"}</LocalizedCopy></em>
                    </span>
                    <LocalizedCopy>{plan.discount_percent > 0 ? (
                      <strong className="plan-price-discounted">
                        <s><LocalizedCopy>{money.format(plan.price)}</LocalizedCopy></s>
                        <span><LocalizedCopy>{money.format(planCharge(plan))}</LocalizedCopy></span>
                      </strong>
                    ) : (
                      <strong><LocalizedCopy>{money.format(plan.price)}</LocalizedCopy></strong>
                    )}</LocalizedCopy>
                    <LocalizedCopy>{plan.discount_percent > 0 && (
                      <DiscountBadge percent={plan.discount_percent} />
                    )}</LocalizedCopy>
                  </LocalizedButton>
                ))}</LocalizedCopy>
              </div>
              <LocalizedCopy>{selectedTrainerPlan && (
                <TrainerConsultBooking
                  key={selectedTrainerPlan.id}
                  pet={pet}
                  trainer={selectedTrainer}
                  plan={selectedTrainerPlan}
                  notify={notify}
                  complete={(value) => {
                    setPendingPayment(value);
                    setSelectedTrainer(null);
                    setSelectedTrainerPlan(null);
                  }}
                />
              )}</LocalizedCopy>
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
      </div>
    );
  if (mode === "adoption")
    return (
      <div className="world-collection world-collection--adoption" data-collection="adoption">
        <WorldCollectionHeader mode="adoption"><LocalizedButton className="primary-button" onClick={() => requirePet() && setAdoptionComposer(true)}><Icon name="plus" size={15}/><LocalizedCopy>{"Ajukan pet saya"}</LocalizedCopy></LocalizedButton></WorldCollectionHeader>
        <div className="adoption-steps">
          <LocalizedCopy>{[
            "Pilih pet",
            "Isi screening",
            "Interview & home visit",
            "Meet & greet",
            "Serah terima",
          ].map((item, i) => (
            <span key={item}>
              <i><LocalizedCopy>{i + 1}</LocalizedCopy></i>
              <b><LocalizedCopy>{item}</LocalizedCopy></b>
            </span>
          ))}</LocalizedCopy>
        </div>
        <div className="hub-tabs adoption-tabs" aria-label="Menu adopsi">
          <LocalizedCopy>{(
            [
              ["browse", "Jelajahi"],
              ["listings", "Listing saya"],
              ["applications", "Lamaran saya"],
            ] as const
          ).map(([key, label]) => (
            <LocalizedButton
              key={key}
              className={adoptionTab === key ? "active" : ""}
              aria-pressed={adoptionTab === key}
              onClick={() =>
                (key === "browse" || requireLogin()) &&
                setAdoptionTab(key)
              }
            >
              <LocalizedCopy>{label}</LocalizedCopy>
            </LocalizedButton>
          ))}</LocalizedCopy>
        </div>
        {adoptionTab === "listings" && (
          <MyAdoptionListings key={adoptionVersion} notify={notify} />
        )}
        {adoptionTab === "applications" && (
          <MyAdoptionApplications notify={notify} />
        )}
        {adoptionTab === "browse" && (
          <>
            <section
              className="adoption-filter-panel"
              aria-label="Filter adopsi"
            >
              <label className="adoption-search">
                <span><LocalizedCopy>{"⌕"}</LocalizedCopy></span>
                <LocalizedInput
                  value={adoptionSearch}
                  onChange={(event) => setAdoptionSearch(event.target.value)}
                  placeholder="Cari nama, ras, kota, atau karakter pet…"
                />
              </label>
              <SlivaSelect
                value={species}
                onChange={(event) => setSpecies(event.target.value)}
                aria-label="Jenis hewan"
              >
                <option value="all">Semua hewan</option>
                <option value="dog">Anjing</option>
                <option value="cat">Kucing</option>
              </SlivaSelect>
              <SlivaSelect
                value={sex}
                onChange={(event) => setSex(event.target.value)}
                aria-label="Jenis kelamin"
              >
                <option value="all">Semua gender</option>
                <option value="male">Jantan</option>
                <option value="female">Betina</option>
              </SlivaSelect>
              <SlivaSelect
                value={size}
                onChange={(event) => setSize(event.target.value)}
                aria-label="Ukuran"
              >
                <option value="all">Semua ukuran</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </SlivaSelect>
              <SlivaSelect
                value={city}
                onChange={(event) => setCity(event.target.value)}
                aria-label="Kota"
              >
                <option value="all">Semua kota</option>
                {adoptionCities.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </SlivaSelect>
              <SlivaSelect
                value={health}
                onChange={(event) => setHealth(event.target.value)}
                aria-label="Standar kesehatan"
              >
                <option value="all">Semua kesehatan</option>
                <option value="vaccinated">Sudah vaksin</option>
                <option value="sterilized">Sudah steril</option>
              </SlivaSelect>
            </section>
            <div className="adoption-result-count">
              <b><LocalizedCopy>{filteredAdoptions.length}</LocalizedCopy><LocalizedCopy>{" pet"}</LocalizedCopy></b>
              <span><LocalizedCopy>{"sesuai filter dan siap dikenalkan"}</LocalizedCopy></span>
            </div>
            <div className="adoption-grid">
              <CatalogStatus loading={loading} error={loadError} empty={!filteredAdoptions.length} title="Belum ada pet yang cocok" note="Ubah kombinasi filter untuk melihat kandidat adopsi lain." onRetry={retryCatalog}/>
              <LocalizedCopy>{(loading || loadError ? [] : filteredAdoptions).map((item, index) => (
                <article className="adoption-card" key={item.id}>
                  <div className={`adoption-photo adoption-${index % 3}`}>
                    <WorldPhoto src={item.photo_urls?.[0]} alt={item.name}/>
                    <LocalizedCopy>{item.featured && <i><LocalizedCopy>{"PILIHAN"}</LocalizedCopy></i>}</LocalizedCopy>
                    <span className="adoption-source"><Icon name={item.source_type === "pet_owner" ? "user" : "shield"} size={11}/><LocalizedCopy>{item.source_type === "pet_owner" ? "Pet owner" : "Mitra penyelamat"}</LocalizedCopy></span>
                  </div>
                  <div>
                    <h3><LocalizedCopy>{item.name}</LocalizedCopy></h3>
                    <p>
                      <LocalizedCopy>{item.breed}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{item.age_months < 12
                        ? `${item.age_months} bulan`
                        : `${Math.floor(item.age_months / 12)} tahun`}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{item.sex === "male"
                        ? "Jantan"
                        : item.sex === "female"
                          ? "Betina"
                          : item.sex}</LocalizedCopy>
                    </p>
                    <span className="world-card-location"><Icon name="map" size={12}/><LocalizedCopy>{item.city}</LocalizedCopy></span>
                    <div className="health-checks">
                      <span className={item.vaccinated ? "pass" : "pending"}><b aria-hidden="true">{item.vaccinated ? "✓" : "—"}</b><LocalizedCopy>{"Vaksin"}</LocalizedCopy><span className="sr-only"><LocalizedCopy>{item.vaccinated ? "Sudah vaksin" : "Vaksin belum dikonfirmasi"}</LocalizedCopy></span></span>
                      <span className={item.sterilized ? "pass" : "pending"}><b aria-hidden="true">{item.sterilized ? "✓" : "—"}</b><LocalizedCopy>{"Steril"}</LocalizedCopy><span className="sr-only"><LocalizedCopy>{item.sterilized ? "Sudah steril" : "Sterilisasi belum dikonfirmasi"}</LocalizedCopy></span></span>
                    </div>
                    <footer>
                      <b>
                        <LocalizedCopy>{item.adoption_fee
                          ? money.format(item.adoption_fee)
                          : "Tanpa biaya"}</LocalizedCopy>
                      </b>
                      <LocalizedButton
                        className="primary-button"
                        onClick={() => setSelectedAdoption(item)}
                      ><LocalizedCopy>{"Kenalan"}</LocalizedCopy></LocalizedButton>
                    </footer>
                  </div>
                </article>
              ))}</LocalizedCopy>
            </div>
          </>
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
            pets={pets.filter(
              (item) => !item.accessRole || item.accessRole === "owner",
            )}
            close={() => setAdoptionComposer(false)}
            notify={notify}
            created={async () => {
              setAdoptionVersion((v) => v + 1);
              setAdoptionTab("listings");
            }}
          />
        )}
      </div>
    );
  return (
    <div className="world-collection world-collection--documents" data-collection="documents">
      <WorldCollectionHeader mode="documents"/>
      <section className="document-assurance">
        <span><LocalizedCopy>{"✓ Checklist sesuai kebutuhan"}</LocalizedCopy></span>
        <span><LocalizedCopy>{"✓ Status transparan"}</LocalizedCopy></span>
        <span><LocalizedCopy>{"✓ Dokumen digital tersimpan"}</LocalizedCopy></span>
      </section>
      <div className="document-product-grid">
        <CatalogStatus loading={loading} error={loadError} empty={!documents.length} title="Belum ada dokumen tersedia" note="Pilihan dokumen dari mitra akan muncul di sini." onRetry={retryCatalog}/>
        <LocalizedCopy>{(loading || loadError ? [] : documents).map((item, index) => (
          <article className="document-product-card" key={item.id}>
            <span className={`document-product-icon doc-${index % 4}`} aria-hidden="true"><Icon name={item.category.includes("flight") ? "send" : "shield"} size={27}/></span>
            <div>
              <small>
                <LocalizedCopy>{item.code}</LocalizedCopy><LocalizedCopy>{" · ESTIMASI "}</LocalizedCopy><LocalizedCopy>{item.processing_days}</LocalizedCopy><LocalizedCopy>{" HARI KERJA"}</LocalizedCopy></small>
              <h3><LocalizedCopy>{item.name}</LocalizedCopy></h3>
              <p><LocalizedCopy>{item.description}</LocalizedCopy></p>
              <span className="world-document-requirements"><Icon name="check" size={13}/><LocalizedCopy>{item.requirements.length}</LocalizedCopy> <LocalizedCopy>{"persyaratan"}</LocalizedCopy></span>
              <footer>
                <span>
                  <small><LocalizedCopy>{"Estimasi total"}</LocalizedCopy></small>
                  <b><LocalizedCopy>{money.format(item.total_fee)}</LocalizedCopy></b>
                </span>
                <LocalizedButton
                  className="primary-button"
                  onClick={() => setSelectedDocument(item)}
                ><LocalizedCopy>{"Lihat & ajukan"}</LocalizedCopy></LocalizedButton>
              </footer>
            </div>
          </article>
        ))}</LocalizedCopy>
      </div>
      <section className="document-process">
        <header>
          <small><LocalizedCopy>{"ALUR PENGAJUAN"}</LocalizedCopy></small>
          <h2><LocalizedCopy>{"Satu timeline, status selalu jelas"}</LocalizedCopy></h2>
        </header>
        <div>
          <LocalizedCopy>{[
            "Draft & checklist",
            "Verifikasi dokumen",
            "Pemeriksaan",
            "Proses instansi",
            "Dokumen terbit",
          ].map((item, i) => (
            <span key={item}>
              <i><LocalizedCopy>{i + 1}</LocalizedCopy></i>
              <b><LocalizedCopy>{item}</LocalizedCopy></b>
              <small>
                <LocalizedCopy>{i === 0
                  ? "Lengkapi persyaratan dengan panduan"
                  : i === 4
                    ? "Unduh dokumen digital"
                    : "Notifikasi setiap perubahan"}</LocalizedCopy>
              </small>
            </span>
          ))}</LocalizedCopy>
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
    </div>
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
        <LocalizedButton className="modal-close" onClick={close}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <LocalizedCopy>{consultation.qrisPayment ? (
          <QrisPaymentPanel
            payment={consultation.qrisPayment}
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
            <h2><LocalizedCopy>{"Pembayaran belum dibuat"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Tutup dialog dan pilih paket kembali."}</LocalizedCopy></p>
          </>
        )}</LocalizedCopy>
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
  const { requirePet } = usePetOwnerFlow();
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<VeterinarianAvailabilitySlot[]>([]);
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");

  useEffect(() => {
    let cancelled = false;
    getVeterinarianAvailability(doctor.id, plan.id)
      .then((result) => {
        if (cancelled) return;
        setSlots(result.data);
        setTimezone(result.timezone || "Asia/Jakarta");
      })
      .catch((error) => {
        if (!cancelled)
          notify(
            error instanceof Error
              ? error.message
              : "Slot jadwal dokter belum dapat dimuat",
          );
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctor.id, notify, plan.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requirePet()) return;
    if (planCharge(plan) > 0 && !paymentMethod) return;
    if (plan.mode !== "chat" && !selectedSlot) {
      notify("Pilih slot jadwal yang tersedia untuk telepon atau video call.");
      return;
    }
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
        scheduled_at: selectedSlot || undefined,
      });
      const qrisPayment =
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
        qrisPayment,
        doctor_name: doctor.full_name,
        plan_name: plan.name,
        mode: plan.mode,
        pet_name: pet.name,
        scheduled_at: selectedSlot || undefined,
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
        <span><LocalizedCopy>{"Keluhan utama "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></span>
        <LocalizedTextarea
          name="complaint"
          placeholder="Ceritakan gejala, sejak kapan, pola makan, dan perubahan perilaku…"
          required
          minLength={5}
        />
      </label>
      <div>
        <label>
          <span><LocalizedCopy>{"Gejala (pisahkan koma)"}</LocalizedCopy></span>
          <LocalizedInput name="symptoms" placeholder="gatal, nafsu makan turun" />
        </label>
        <label>
          <span><LocalizedCopy>{"Slot jadwal · "}</LocalizedCopy><LocalizedCopy>{timezone}</LocalizedCopy></span>
          <SlivaSelect aria-label={`Slot jadwal · ${timezone}`}
            value={selectedSlot}
            onChange={(event) => setSelectedSlot(event.target.value)}
            required={plan.mode !== "chat"}
            disabled={availabilityLoading}
          >
            {plan.mode === "chat" && <option value="">Mulai segera</option>}
            {plan.mode !== "chat" && <option value="">Pilih jadwal</option>}
            {slots.map((slot) => (
              <option value={slot.starts_at} key={slot.starts_at}>
                {new Intl.DateTimeFormat(petOwnerIntlLocale(), {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: timezone,
                }).format(new Date(slot.starts_at))}{" "}
                · {slot.duration_minutes} menit
              </option>
            ))}
          </SlivaSelect>
        </label>
      </div>
      <LocalizedCopy>{!availabilityLoading && plan.mode !== "chat" && slots.length === 0 && (
        <p className="consult-slot-empty"><LocalizedCopy>{"Belum ada slot dokter untuk 14 hari ke depan. Pilih paket chat atau dokter lain."}</LocalizedCopy></p>
      )}</LocalizedCopy>
      <div className="checkout-line">
        <span><LocalizedCopy>{"Total paket"}</LocalizedCopy></span>
        <LocalizedCopy>{plan.discount_percent > 0 ? (
          <b className="plan-price-discounted">
            <s><LocalizedCopy>{money.format(plan.price)}</LocalizedCopy></s>
            <span><LocalizedCopy>{money.format(planCharge(plan))}</LocalizedCopy></span>
          </b>
        ) : (
          <b><LocalizedCopy>{money.format(plan.price)}</LocalizedCopy></b>
        )}</LocalizedCopy>
      </div>
      <LocalizedCopy>{planCharge(plan) > 0 && (
        <PaymentMethodPicker
          value={paymentMethod}
          onChange={setPaymentMethod}
          disabled={busy}
        />
      )}</LocalizedCopy>
      <LocalizedButton
        className="primary-button full"
        disabled={
          busy ||
          availabilityLoading ||
          (planCharge(plan) > 0 && !paymentMethod) ||
          (plan.mode !== "chat" && !slots.length)
        }
      >
        <LocalizedCopy>{busy
          ? "Membuat pembayaran…"
          : planCharge(plan) > 0
            ? "Lanjut ke pembayaran"
            : "Mulai konsultasi gratis"}</LocalizedCopy>
      </LocalizedButton>
    </form>
  );
}

function TrainerConsultBooking({
  pet,
  trainer,
  plan,
  notify,
  complete,
}: {
  pet: Pet;
  trainer: Trainer;
  plan: TrainerConsultationPlan;
  notify: (message: string) => void;
  complete: (consultation: PayableConsultation) => void;
}) {
  const { requirePet } = usePetOwnerFlow();
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<TrainerAvailabilitySlot[]>([]);
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");

  useEffect(() => {
    let cancelled = false;
    getTrainerAvailability(trainer.id, plan.id)
      .then((result) => {
        if (cancelled) return;
        setSlots(result.data);
        setTimezone(result.timezone || "Asia/Jakarta");
      })
      .catch((error) => {
        if (!cancelled)
          notify(
            error instanceof Error
              ? error.message
              : "Slot jadwal trainer belum dapat dimuat",
          );
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notify, plan.id, trainer.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requirePet()) return;
    if (planCharge(plan) > 0 && !paymentMethod) return;
    if (plan.mode !== "chat" && !selectedSlot) {
      notify("Pilih slot jadwal yang tersedia untuk telepon atau video call.");
      return;
    }
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await createTrainerConsultation({
        ...(/^[0-9a-f-]{36}$/i.test(pet.id) ? { pet_id: pet.id } : {}),
        trainer_id: trainer.id,
        plan_id: plan.id,
        goal: values.goal,
        behavior_notes: String(values.behavior_notes || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        scheduled_at: selectedSlot || undefined,
      });
      const qrisPayment =
        result.amount > 0
          ? await createPaymentIntent("consultation", result.id, paymentMethod)
          : undefined;
      notify(
        result.amount > 0
          ? "Booking trainer dibuat. Selesaikan pembayaran untuk membuka room."
          : "Booking trainer gratis berhasil dibuat.",
      );
      complete({
        ...result,
        qrisPayment,
        doctor_name: trainer.full_name,
        trainer_name: trainer.full_name,
        provider_name: trainer.full_name,
        provider_type: "trainer",
        plan_name: plan.name,
        mode: plan.mode,
        pet_name: pet.name,
        scheduled_at: selectedSlot || undefined,
      });
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Booking atau pembayaran trainer belum dapat dibuat",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="consult-booking" onSubmit={submit}>
      <label>
        <span><LocalizedCopy>{"Tujuan latihan "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></span>
        <LocalizedTextarea
          name="goal"
          placeholder="Contoh: mengurangi reaktivitas saat bertemu anjing lain…"
          required
          minLength={5}
        />
      </label>
      <div>
        <label>
          <span><LocalizedCopy>{"Catatan perilaku (pisahkan koma)"}</LocalizedCopy></span>
          <LocalizedInput
            name="behavior_notes"
            placeholder="menarik leash, mudah terdistraksi"
          />
        </label>
        <label>
          <span><LocalizedCopy>{"Slot jadwal · "}</LocalizedCopy><LocalizedCopy>{timezone}</LocalizedCopy></span>
          <SlivaSelect aria-label={`Slot jadwal · ${timezone}`}
            value={selectedSlot}
            onChange={(event) => setSelectedSlot(event.target.value)}
            required={plan.mode !== "chat"}
            disabled={availabilityLoading}
          >
            {plan.mode === "chat" && <option value="">Mulai segera</option>}
            {plan.mode !== "chat" && <option value="">Pilih jadwal</option>}
            {slots.map((slot) => (
              <option value={slot.starts_at} key={slot.starts_at}>
                {new Intl.DateTimeFormat(petOwnerIntlLocale(), {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: timezone,
                }).format(new Date(slot.starts_at))}{" "}
                · {slot.duration_minutes} menit
              </option>
            ))}
          </SlivaSelect>
        </label>
      </div>
      <LocalizedCopy>{!availabilityLoading && plan.mode !== "chat" && slots.length === 0 && (
        <p className="consult-slot-empty"><LocalizedCopy>{"Belum ada slot untuk 14 hari ke depan. Pilih paket chat atau trainer lain."}</LocalizedCopy></p>
      )}</LocalizedCopy>
      <div className="checkout-line">
        <span><LocalizedCopy>{"Total paket"}</LocalizedCopy></span>
        <LocalizedCopy>{plan.discount_percent > 0 ? (
          <b className="plan-price-discounted">
            <s><LocalizedCopy>{money.format(plan.price)}</LocalizedCopy></s>
            <span><LocalizedCopy>{money.format(planCharge(plan))}</LocalizedCopy></span>
          </b>
        ) : (
          <b><LocalizedCopy>{money.format(plan.price)}</LocalizedCopy></b>
        )}</LocalizedCopy>
      </div>
      <LocalizedCopy>{planCharge(plan) > 0 && (
        <PaymentMethodPicker
          value={paymentMethod}
          onChange={setPaymentMethod}
          disabled={busy}
        />
      )}</LocalizedCopy>
      <LocalizedButton
        className="primary-button full"
        disabled={
          busy ||
          availabilityLoading ||
          (planCharge(plan) > 0 && !paymentMethod) ||
          (plan.mode !== "chat" && !slots.length)
        }
      >
        <LocalizedCopy>{busy
          ? "Membuat pembayaran…"
          : planCharge(plan) > 0
            ? "Booking & lanjut pembayaran"
            : "Booking konsultasi gratis"}</LocalizedCopy>
      </LocalizedButton>
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
  const pendingTracks = useRef<
    Array<{ sessionId: string; trackName: string; kind?: string }>
  >([]);
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
    pendingTracks.current = [];
    localMedia.current?.replaceChildren();
    remoteMedia.current?.replaceChildren();
    setCall("idle");
  }, []);
  const connectMedia = useCallback(
    async (video: boolean) => {
      const accessToken = getAccessToken();
      if (!accessToken)
        throw new Error("Login diperlukan untuk membuka media.");
      const announcedTracks = pendingTracks.current;
      endCall();
      pendingTracks.current = announcedTracks;
      mediaRef.current = await startConsultationMedia({
        realtimeURL: realtime,
        consultationId: consultation.id,
        accessToken,
        video,
        localContainer: localMedia.current,
        remoteContainer: remoteMedia.current,
      });
      const queuedTracks = pendingTracks.current;
      pendingTracks.current = [];
      if (queuedTracks.length > 0) await mediaRef.current.pull(queuedTracks);
      setCall("active");
    },
    [consultation.id, endCall, realtime],
  );
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getConsultationMessages(consultation.id),
      getCurrentPetOwnerUserID(),
    ])
      .then(([response, userID]) => {
        if (cancelled) return;
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
    const token = getAccessToken();
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
      (payload: {
        fromUserId?: string;
        sessionId?: string;
        tracks?: { sessionId?: string; trackName: string; kind?: string }[];
      }) => {
        if (
          payload.fromUserId &&
          payload.fromUserId === currentUserIdRef.current
        )
          return;
        const tracks = (payload.tracks || []).map((track) => ({
          ...track,
          sessionId: track.sessionId ?? payload.sessionId ?? "",
        }));
        if (mediaRef.current) {
          void mediaRef.current.pull(tracks).catch((error) => {
            endCall();
            notify(
              error instanceof Error ? error.message : "Koneksi media gagal.",
            );
          });
        } else pendingTracks.current = tracks;
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
      notify(
        error instanceof Error
          ? error.message
          : "Izinkan kamera dan mikrofon untuk memulai panggilan",
      );
    }
  }
  async function accept() {
    const socket = socketRef.current;
    if (!socket) return;
    try {
      await connectMedia(incomingMode === "video");
      socket.emit("call:accept", {
        consultationId: consultation.id,
        mode: incomingMode,
      });
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Panggilan belum dapat diterima",
      );
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
        <LocalizedButton className="modal-close" onClick={close}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <header>
          <div>
            <small><LocalizedCopy>{state}</LocalizedCopy></small>
            <h2>
              <LocalizedCopy>{consultation.provider_name ||
                consultation.trainer_name ||
                consultation.doctor_name}</LocalizedCopy>
            </h2>
            <p>
              <LocalizedCopy preserve>{consultation.pet_name}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{consultation.plan_name}</LocalizedCopy>
            </p>
          </div>
          <div>
            <LocalizedCopy>{voiceAllowed && (
              <LocalizedButton onClick={() => void startCall(false)}><LocalizedCopy>{"📞"}</LocalizedCopy></LocalizedButton>
            )}</LocalizedCopy>
            <LocalizedCopy>{videoAllowed && (
              <LocalizedButton onClick={() => void startCall(true)}><LocalizedCopy>{"🎥"}</LocalizedCopy></LocalizedButton>
            )}</LocalizedCopy>
            <LocalizedButton
              className="danger"
              onClick={() => {
                socketRef.current?.emit("call:end", {
                  consultationId: consultation.id,
                });
                endCall();
              }}
            ><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
          </div>
        </header>
        <div
          className="webrtc-stage"
          style={{ display: call === "idle" ? "none" : undefined }}
        >
          <div
            ref={remoteMedia}
            className="sfu-remote-media"
            style={{ width: "100%", height: "100%" }}
          />
          <div
            ref={localMedia}
            className="sfu-local-media"
            style={{
              position: "absolute",
              right: 12,
              bottom: 12,
              width: 150,
              height: 100,
              overflow: "hidden",
              border: "2px solid white",
              borderRadius: 12,
              background: "#102f45",
            }}
          />
          <LocalizedCopy>{call === "ringing" && (
            <div className="inline-actions">
              <LocalizedButton className="primary-button" onClick={() => void accept()}><LocalizedCopy>{"Terima panggilan"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                className="secondary-button"
                onClick={() => {
                  socketRef.current?.emit("call:reject", {
                    consultationId: consultation.id,
                  });
                  endCall();
                }}
              ><LocalizedCopy>{"Tolak"}</LocalizedCopy></LocalizedButton>
            </div>
          )}</LocalizedCopy>
        </div>
        <div className="consult-messages">
          <LocalizedCopy>{messages.length === 0 && (
            <div className="room-welcome">
              <span><LocalizedCopy>{"🩺"}</LocalizedCopy></span>
              <b><LocalizedCopy>{"Ruang konsultasi privat"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Pesan disimpan aman dan dirangkum ke medical record."}</LocalizedCopy></small>
            </div>
          )}</LocalizedCopy>
          <LocalizedCopy>{messages.map((m) => (
            <p className={m.mine ? "mine" : ""} key={m.id}>
              <LocalizedCopy>{m.body}</LocalizedCopy>
            </p>
          ))}</LocalizedCopy>
        </div>
        <footer>
          <LocalizedInput
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Tulis pesan untuk dokter…"
          />
          <LocalizedButton onClick={send}><LocalizedCopy>{"Kirim"}</LocalizedCopy></LocalizedButton>
        </footer>
      </section>
    </div>
  );
}

function AdoptionListingModal({
  pet,
  pets,
  close,
  notify,
  created,
}: {
  pet: Pet;
  pets: Pet[];
  close: () => void;
  notify: (m: string) => void;
  created: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [petID, setPetID] = useState(
    pets.some((item) => item.id === pet.id) ? pet.id : (pets[0]?.id ?? ""),
  );
  const selectedPet = pets.find((item) => item.id === petID);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  async function upload(files: FileList | null) {
    if (!files || uploading) return;
    if (photos.length + files.length > 10) {
      notify("Maksimal 10 foto");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/"))
          throw new Error("Gunakan file foto");
        const result = await uploadImage(file);
        setPhotos((current) => [...current, result.url]);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload foto gagal");
    } finally {
      setUploading(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || uploading || !selectedPet) return;
    pending.current = true;
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await createAdoptionListing({
        pet_id: selectedPet.id,
        city: values.city,
        description: values.description,
        personality: String(values.personality || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        health_status: values.health_status,
        vaccinated: values.vaccinated === "yes",
        sterilized: values.sterilized === "yes",
        photo_urls: photos.length
          ? photos
          : selectedPet.photoUrl
            ? [selectedPet.photoUrl]
            : [],
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
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal form-modal adoption-listing-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ajukan pet untuk adopsi"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton className="modal-close" onClick={close}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"AJUKAN PET SAYA"}</LocalizedCopy></span>
        <h2><LocalizedCopy>{"Mulai pet passport adopsi"}</LocalizedCopy></h2>
        <p className="muted-copy"><LocalizedCopy>{"Hanya pet milikmu yang dapat diajukan. Data identitas dan kesehatan akan diperiksa sebelum listing tampil."}</LocalizedCopy></p>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span><LocalizedCopy>{"Pet"}</LocalizedCopy></span>
            <SlivaSelect aria-label="Pet"
              value={petID}
              disabled={uploading || busy}
              onChange={(event) => {
                setPetID(event.target.value);
                setPhotos([]);
              }}
              required
            >
              <option value="" disabled>
                Pilih pet dari koleksi
              </option>
              {pets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.breed}
                </option>
              ))}
            </SlivaSelect>
          </label>
          <label>
            <span><LocalizedCopy>{"Galeri foto (maksimal 10)"}</LocalizedCopy></span>
            <SlivaFilePicker
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || busy}
              onChange={(event) => void upload(event.target.files)}
            />
            <small>
              <LocalizedCopy>{uploading
                ? "Mengunggah foto…"
                : photos.length
                  ? `${photos.length} foto diunggah`
                  : "Foto profil pet dipakai jika tidak menambah foto."}</LocalizedCopy>
            </small>
          </label>
          <LocalizedCopy>{photos.length > 0 && (
            <div className="adoption-upload-grid">
              <LocalizedCopy>{photos.map((url, index) => (
                <LocalizedButton
                  type="button"
                  key={url}
                  onClick={() =>
                    setPhotos((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                  aria-label={`Hapus foto ${index + 1}`}
                  disabled={uploading || busy}
                >
                  <NextImage
                    src={url}
                    alt={`Foto pet ${index + 1}`}
                    width={120}
                    height={120}
                    unoptimized
                  />
                  <span><LocalizedCopy>{"×"}</LocalizedCopy></span>
                </LocalizedButton>
              ))}</LocalizedCopy>
            </div>
          )}</LocalizedCopy>
          <label>
            <span><LocalizedCopy>{"Kota domisili"}</LocalizedCopy></span>
            <LocalizedInput name="city" minLength={2} required />
          </label>
          <label>
            <span><LocalizedCopy>{"Cerita & alasan adopsi"}</LocalizedCopy></span>
            <LocalizedTextarea
              name="description"
              minLength={20}
              placeholder="Ceritakan kebutuhan, kebiasaan, dan alasan mencari keluarga baru tanpa membagikan kontak pribadi."
              required
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Karakter (pisahkan koma)"}</LocalizedCopy></span>
            <LocalizedInput name="personality" placeholder="ramah, tenang, indoor" />
          </label>
          <label>
            <span><LocalizedCopy>{"Kondisi kesehatan"}</LocalizedCopy></span>
            <LocalizedTextarea
              name="health_status"
              placeholder="Pemeriksaan terakhir, obat rutin, atau kebutuhan khusus"
            />
          </label>
          <div className="form-two">
            <label>
              <span><LocalizedCopy>{"Status vaksin"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Status vaksin" name="vaccinated">
                <option value="no">Belum dikonfirmasi</option>
                <option value="yes">Sudah vaksin</option>
              </SlivaSelect>
            </label>
            <label>
              <span><LocalizedCopy>{"Sterilisasi"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Sterilisasi" name="sterilized">
                <option value="no">Belum dikonfirmasi</option>
                <option value="yes">Sudah</option>
              </SlivaSelect>
            </label>
          </div>
          <label>
            <span><LocalizedCopy>{"Biaya adopsi tetap (Rp) · 0 jika gratis"}</LocalizedCopy></span>
            <LocalizedInput
              name="adoption_fee"
              type="number"
              min="0"
              max="100000000"
              step="1"
              defaultValue="0"
            />
            <small><LocalizedCopy>{"Jelaskan alasan biaya di cerita pet. Tidak ada penawaran harga atau pembayaran saat screening."}</LocalizedCopy></small>
          </label>
          <div className="adoption-review-note"><LocalizedCopy>{"Setelah dikirim: pemeriksaan oleh tim Operasional & Pendamping Adopsi → publikasi → screening calon adopter → persetujuan pet owner → serah terima terpantau."}</LocalizedCopy></div>
          <LocalizedButton
            className="primary-button full"
            disabled={busy || uploading || !selectedPet}
          >
            <LocalizedCopy>{busy ? "Mengirim pengajuan…" : "Kirim untuk diperiksa"}</LocalizedCopy>
          </LocalizedButton>
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
  const { requirePet } = usePetOwnerFlow();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requirePet()) return;
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
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
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal adoption-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Pet passport ${item.name}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <LocalizedButton className="modal-close" onClick={close}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <LocalizedCopy>{step !== 2 && (
          <AdoptionGallery photos={item.photo_urls ?? []} name={item.name} />
        )}</LocalizedCopy>
        <LocalizedCopy>{step === 2 ? (
          <div className="world-success">
            <span><LocalizedCopy>{"✓"}</LocalizedCopy></span>
            <h2><LocalizedCopy>{"Pengajuan terkirim"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Tim pendamping dan pet owner akan meninjau kesiapan adopter sebelum menjadwalkan meet & greet bersama "}</LocalizedCopy><LocalizedCopy>{item.name}</LocalizedCopy><LocalizedCopy>{"."}</LocalizedCopy></p>
            <LocalizedButton className="primary-button" onClick={close}><LocalizedCopy>{"Selesai"}</LocalizedCopy></LocalizedButton>
          </div>
        ) : (
          <>
            <div className="care-doctor-head">
              <span><LocalizedCopy>{item.species.toLowerCase() === "cat" ? "🐈" : "🐕"}</LocalizedCopy></span>
              <div>
                <small><LocalizedCopy>{"RESPONSIBLE ADOPTION ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                  <LocalizedCopy>{item.source_type === "pet_owner" ? "PET OWNER" : "MITRA"}</LocalizedCopy>
                </small>
                <h2><LocalizedCopy>{"Kenalan dengan "}</LocalizedCopy><LocalizedCopy>{item.name}</LocalizedCopy></h2>
                <p>
                  <LocalizedCopy>{item.breed}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.city}</LocalizedCopy>
                </p>
              </div>
            </div>
            {step === 0 ? (
              <>
                <p><LocalizedCopy>{item.description}</LocalizedCopy></p>
                <div className="adoption-passport-fee">
                  <small><LocalizedCopy>{"BIAYA ADOPSI TETAP"}</LocalizedCopy></small>
                  <strong>
                    <LocalizedCopy>{item.adoption_fee
                      ? money.format(item.adoption_fee)
                      : "Tanpa biaya"}</LocalizedCopy>
                  </strong>
                  <p><LocalizedCopy>{"Pengajuan screening gratis. Biaya tidak ditarik otomatis dan bukan penawaran lelang."}</LocalizedCopy></p>
                </div>
                <div className="pet-tags">
                  <LocalizedCopy>{item.personality.map((trait) => (
                    <span key={trait}><LocalizedCopy>{trait}</LocalizedCopy></span>
                  ))}</LocalizedCopy>
                </div>
                <div className="world-detail-grid">
                  <span>
                    <small><LocalizedCopy>{"Diajukan oleh"}</LocalizedCopy></small>
                    <b><LocalizedCopy>{item.submitted_by_name}</LocalizedCopy></b>
                  </span>
                  <span>
                    <small><LocalizedCopy>{"Kesehatan"}</LocalizedCopy></small>
                    <b><LocalizedCopy>{item.health_status}</LocalizedCopy></b>
                  </span>
                  <span>
                    <small><LocalizedCopy>{"Vaksin"}</LocalizedCopy></small>
                    <b>
                      <LocalizedCopy>{item.vaccinated ? "Sudah vaksin" : "Belum dikonfirmasi"}</LocalizedCopy>
                    </b>
                  </span>
                  <span>
                    <small><LocalizedCopy>{"Sterilisasi"}</LocalizedCopy></small>
                    <b><LocalizedCopy>{item.sterilized ? "Sudah" : "Belum dikonfirmasi"}</LocalizedCopy></b>
                  </span>
                </div>
                <div className="adoption-review-note"><LocalizedCopy>{"1. Screening kesiapan keluarga · 2. Tinjauan pet owner & pendamping · 3. Meet & greet · 4. Persetujuan dan serah terima. Pengajuan bukan jaminan langsung diterima."}</LocalizedCopy></div>
                <LocalizedButton
                  className="primary-button full"
                  onClick={() => requirePet() && setStep(1)}
                ><LocalizedCopy>{"Mulai screening adopter"}</LocalizedCopy></LocalizedButton>
              </>
            ) : (
              <form className="world-form" onSubmit={submit}>
                <LocalizedButton
                  type="button"
                  className="secondary-button"
                  onClick={() => setStep(0)}
                ><LocalizedCopy>{"← Kembali ke pet passport"}</LocalizedCopy></LocalizedButton>
                <label>
                  <span><LocalizedCopy>{"Nama lengkap"}</LocalizedCopy></span>
                  <LocalizedInput name="applicant_name" required />
                </label>
                <label>
                  <span><LocalizedCopy>{"Nomor untuk verifikasi privat"}</LocalizedCopy></span>
                  <LocalizedInput name="phone" inputMode="tel" required />
                </label>
                <label>
                  <span><LocalizedCopy>{"Alamat tempat tinggal"}</LocalizedCopy></span>
                  <LocalizedTextarea name="address" required />
                </label>
                <label>
                  <span><LocalizedCopy>{"Tipe hunian"}</LocalizedCopy></span>
                  <SlivaSelect aria-label="Tipe hunian" name="housing_type">
                    <option>Rumah milik</option>
                    <option>Rumah sewa</option>
                    <option>Apartemen</option>
                  </SlivaSelect>
                </label>
                <label>
                  <span><LocalizedCopy>{"Memiliki pet lain?"}</LocalizedCopy></span>
                  <SlivaSelect aria-label="Memiliki pet lain?" name="has_other_pets">
                    <option value="no">Tidak</option>
                    <option value="yes">Ya</option>
                  </SlivaSelect>
                </label>
                <label>
                  <span><LocalizedCopy>{"Mengapa ingin mengadopsi "}</LocalizedCopy><LocalizedCopy>{item.name}</LocalizedCopy><LocalizedCopy>{"?"}</LocalizedCopy></span>
                  <LocalizedTextarea name="reason" minLength={10} required />
                </label>
                <label>
                  <span><LocalizedCopy>{"Pengalaman merawat pet"}</LocalizedCopy></span>
                  <LocalizedTextarea name="experience" />
                </label>
                <p className="muted-copy"><LocalizedCopy>{"Kontak disimpan untuk proses verifikasi dan tidak tampil pada posting atau percakapan publik."}</LocalizedCopy></p>
                <LocalizedButton className="primary-button full" disabled={busy}>
                  <LocalizedCopy>{busy ? "Mengirim pengajuan…" : "Kirim pengajuan screening"}</LocalizedCopy>
                </LocalizedButton>
              </form>
            )}
          </>
        )}</LocalizedCopy>
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
  const { requirePet } = usePetOwnerFlow();
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [requestNumber, setRequestNumber] = useState("");
  const [requestId, setRequestId] = useState("");
  const [uploaded, setUploaded] = useState<UploadedDocument[]>([]);
  const allUploaded = item.requirements.every((req) =>
    uploaded.some((doc) => doc.requirement === req),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requirePet()) return;
    if (item.total_fee > 0 && !paymentMethod) return;
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
        submitted_documents: uploaded,
      });
      setRequestNumber(result.request_number);
      setRequestId(result.id);
      if (result.amount > 0)
        setPayment(
          await createPaymentIntent(
            "document_request",
            result.id,
            paymentMethod,
          ),
        );
      else { close(); notify("Permohonan dokumen tersimpan di Aktivitas."); }
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
        <LocalizedButton className="modal-close" onClick={close}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
        <LocalizedCopy>{done ? (
          <div className="world-success">
            <span><LocalizedCopy>{"▤"}</LocalizedCopy></span>
            <h2><LocalizedCopy>{"Permohonan dibuat"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Nomor "}</LocalizedCopy><LocalizedCopy>{done}</LocalizedCopy><LocalizedCopy>{". Checklist dan status proses tersedia di Aktivitas."}</LocalizedCopy></p>
            <LocalizedButton
              className="primary-button"
              onClick={() => {
                close();
                window.dispatchEvent(
                  new CustomEvent("slivadoc:open-activity", {
                    detail: { type: "document", id: requestId },
                  }),
                );
              }}
            ><LocalizedCopy>{"Pantau dokumen"}</LocalizedCopy></LocalizedButton>
          </div>
        ) : payment ? (
          <QrisPaymentPanel
            payment={payment}
            onPaid={() => setDone(requestNumber)}
          />
        ) : (
          <>
            <small className="world-kicker">
              <LocalizedCopy>{item.code}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.processing_days}</LocalizedCopy><LocalizedCopy>{" HARI KERJA"}</LocalizedCopy></small>
            <h2><LocalizedCopy>{item.name}</LocalizedCopy></h2>
            <p><LocalizedCopy>{item.description}</LocalizedCopy></p>
            <form className="world-form" onSubmit={submit}>
              <label>
                <span><LocalizedCopy>{"Pet"}</LocalizedCopy></span>
                <LocalizedInput value={`${pet.name} · ${pet.breed}`} readOnly />
              </label>
              <LocalizedCopy>{item.category !== "birth_certificate" && (
                <>
                  <div className="form-two">
                    <label>
                      <span><LocalizedCopy>{"Kota asal"}</LocalizedCopy></span>
                      <LocalizedInput name="origin_city" required />
                    </label>
                    <label>
                      <span><LocalizedCopy>{"Kota / negara tujuan"}</LocalizedCopy></span>
                      <LocalizedInput name="destination_city" required />
                    </label>
                  </div>
                  <div className="form-two">
                    <label>
                      <span><LocalizedCopy>{"Tanggal berangkat"}</LocalizedCopy></span>
                      <SlivaDatePicker
                        name="departure_at"
                        type="datetime-local"
                        required
                      />
                    </label>
                    <label>
                      <span><LocalizedCopy>{"Transportasi"}</LocalizedCopy></span>
                      <SlivaSelect aria-label="Transportasi" name="transport_type">
                        <option value="flight">Pesawat</option>
                        <option value="ship">Kapal</option>
                      </SlivaSelect>
                    </label>
                  </div>
                </>
              )}</LocalizedCopy>
              <RequirementUploads
                requirements={item.requirements}
                value={uploaded}
                onChange={setUploaded}
                disabled={busy}
              />
              <div className="checkout-line">
                <span><LocalizedCopy>{"Estimasi biaya"}</LocalizedCopy></span>
                <b><LocalizedCopy>{money.format(item.total_fee)}</LocalizedCopy></b>
              </div>
              <LocalizedCopy>{item.total_fee > 0 && (
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  disabled={busy}
                />
              )}</LocalizedCopy>
              <LocalizedCopy>{!allUploaded && (
                <small className="requirement-upload-hint"><LocalizedCopy>{"Unggah semua dokumen persyaratan"}</LocalizedCopy></small>
              )}</LocalizedCopy>
              <LocalizedButton
                className="primary-button full"
                disabled={
                  busy || !allUploaded || (item.total_fee > 0 && !paymentMethod)
                }
              >
                <LocalizedCopy>{busy
                  ? "Membuat pembayaran…"
                  : item.total_fee > 0
                    ? "Ajukan & lanjut pembayaran"
                    : "Ajukan dokumen"}</LocalizedCopy>
              </LocalizedButton>
            </form>
          </>
        )}</LocalizedCopy>
      </section>
    </div>
  );
}
