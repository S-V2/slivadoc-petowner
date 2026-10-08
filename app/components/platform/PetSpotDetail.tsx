"use client";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { LocalizedCopy, LocalizedButton, LocalizedInput, LocalizedTextarea } from "../LocalizedCopy";
import { SlivaDatePicker } from "../SlivaDatePicker";
import { LocalizedImage as Image } from "../LocalizedCopy";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createPaymentIntent,
  createPetSpotReservation,
  getPetSpot,
  getPetSpotAvailability,
  isPetOwnerAuthenticated,
  togglePetOwnerFavorite,
  type PetSpot,
  type PetSpotUnit,
  type PetSpotReservation,
  type PaymentIntent,
} from "../../lib/platform-api";
import {
  isPetSpotStay,
  petSpotBookingWindow,
  petSpotCategory,
  petSpotQuote,
} from "../../lib/petspot-booking";
import { Icon } from "../Icon";
import { PaymentMethodPicker, QrisPaymentPanel } from "../payments/QrisPayment";

const money = new Intl.NumberFormat(petOwnerIntlLocale(), {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
type Section = "overview" | "facilities" | "reviews" | "booking";
const tabs: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Tentang" },
  { id: "facilities", label: "Fasilitas" },
  { id: "reviews", label: "Ulasan" },
  { id: "booking", label: "Reservasi" },
];

export function PetSpotDetail({
  item,
  ownerName,
  notify,
  gallery,
  close,
}: {
  item: PetSpot;
  ownerName: string;
  notify: (message: string) => void;
  gallery: (spot: PetSpot) => ReactNode;
  close: () => void;
}) {
  const [detail, setDetail] = useState<PetSpot>();
  const [detailError, setDetailError] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const spot = detail?.id === item.id ? { ...item, ...detail } : item;
  const heading = useRef<HTMLDivElement>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getPetSpot(item.id)
      .then((value) => {
        if (active) {
          setDetail(value);
          setDetailError("");
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setDetailError(
            cause instanceof Error
              ? cause.message
              : "Detail belum dapat dimuat",
          );
      });
    return () => {
      active = false;
    };
  }, [item.id, loadAttempt]);
  function select(value: Section) {
    setSection(value);
    heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  async function save() {
    if (!isPetOwnerAuthenticated()) {
      window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
      return;
    }
    setFavoriteBusy(true);
    try {
      const result = await togglePetOwnerFavorite("petspot", spot.id);
      notify(
        result.favorite
          ? "Tempat disimpan ke favorit"
          : "Tempat dihapus dari favorit",
      );
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Tempat belum dapat disimpan",
      );
    } finally {
      setFavoriteBusy(false);
    }
  }
  const facilities = spot.facility_details?.length
    ? spot.facility_details
    : (spot.pet_facilities ?? []);
  const policy = spot.reservation_policy ?? {};
  const rules = [
    ...(Array.isArray(policy.pet_rules) ? policy.pet_rules : []),
    ...(Array.isArray(policy.house_rules) ? policy.house_rules : []),
  ].filter((value): value is string => typeof value === "string");
  const maps =
    Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude)
      ? `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`
      : "";
  return (
    <div className="petspot-detail-scroll">
      <LocalizedCopy>{gallery(spot)}</LocalizedCopy>
      <div className="petspot-detail-body">
        <div className="petspot-detail-heading" ref={heading}>
          <span className="world-kicker">
            <LocalizedCopy>{petSpotCategory(spot.category)}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{spot.city}</LocalizedCopy>
          </span>
          <h2><LocalizedCopy>{spot.name}</LocalizedCopy></h2>
          <div className="petspot-detail-meta">
            <span><LocalizedCopy>{"★"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
              <LocalizedCopy>{spot.review_count
                ? Number(spot.rating).toFixed(1)
                : "Belum dinilai"}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"· "}</LocalizedCopy><LocalizedCopy>{spot.review_count || 0}</LocalizedCopy><LocalizedCopy>{" ulasan"}</LocalizedCopy></span>
            <LocalizedCopy>{spot.verified ? (
              <span className="petspot-verified"><LocalizedCopy>{"✓ Partner terverifikasi"}</LocalizedCopy></span>
            ) : null}</LocalizedCopy>
          </div>
          <p><LocalizedCopy>{spot.address}</LocalizedCopy></p>
        </div>
        <nav className="petspot-detail-tabs" aria-label="Detail tempat">
          <LocalizedCopy>{tabs
            .filter((tab) => tab.id !== "booking" || spot.reservable)
            .map((tab) => (
              <LocalizedButton
                type="button"
                key={tab.id}
                aria-pressed={section === tab.id}
                className={section === tab.id ? "active" : ""}
                onClick={() => select(tab.id)}
              >
                <LocalizedCopy>{tab.label}</LocalizedCopy>
              </LocalizedButton>
            ))}</LocalizedCopy>
        </nav>
        <LocalizedCopy>{!detail && !detailError ? (
          <div role="status" className="petspot-loading"><LocalizedCopy>{"Memuat informasi tempat, fasilitas, dan ulasan…"}</LocalizedCopy></div>
        ) : null}</LocalizedCopy>
        <LocalizedCopy>{detailError ? (
          <div className="petspot-error" role="alert">
            <LocalizedCopy>{detailError}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
            <LocalizedButton
              type="button"
              onClick={() => setLoadAttempt((value) => value + 1)}
            ><LocalizedCopy>{"Coba lagi"}</LocalizedCopy></LocalizedButton>
          </div>
        ) : null}</LocalizedCopy>
        <LocalizedCopy>{section === "overview" ? (
          <>
            <section className="petspot-detail-section">
              <h3><LocalizedCopy>{"Kenali tempatnya"}</LocalizedCopy></h3>
              <p>
                <LocalizedCopy>{spot.description || "Deskripsi belum ditambahkan pengelola."}</LocalizedCopy>
              </p>
              <div className="petspot-highlights">
                <LocalizedCopy>{facilities.slice(0, 4).map((facility) => (
                  <span
                    key={
                      typeof facility === "string" ? facility : facility.name
                    }
                  ><LocalizedCopy>{"✓ "}</LocalizedCopy><LocalizedCopy>{typeof facility === "string" ? facility : facility.name}</LocalizedCopy>
                  </span>
                ))}</LocalizedCopy>
              </div>
            </section>
            <section className="petspot-detail-section">
              <h3><LocalizedCopy>{"Lokasi & akses"}</LocalizedCopy></h3>
              <p>
                <LocalizedCopy>{spot.address}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{spot.city}</LocalizedCopy>
              </p>
              <div className="petspot-contact-actions">
                <LocalizedCopy>{maps ? (
                  <a href={maps} target="_blank" rel="noreferrer">
                    <Icon name="map" size={17} /><LocalizedCopy>{" Petunjuk arah"}</LocalizedCopy></a>
                ) : null}</LocalizedCopy>
                <LocalizedCopy>{spot.phone ? (
                  <a href={`tel:${spot.phone.replace(/[^+0-9]/g, "")}`}>
                    <Icon name="chat" size={17} /><LocalizedCopy>{" Hubungi tempat"}</LocalizedCopy></a>
                ) : null}</LocalizedCopy>
                <LocalizedCopy>{/^https:\/\//.test(spot.website_url ?? "") ? (
                  <a href={spot.website_url} target="_blank" rel="noreferrer"><LocalizedCopy>{"Website tempat ↗"}</LocalizedCopy></a>
                ) : null}</LocalizedCopy>
              </div>
            </section>
            <section className="petspot-detail-section">
              <h3><LocalizedCopy>{"Jam operasional"}</LocalizedCopy></h3>
              <LocalizedCopy>{Object.entries(spot.opening_hours ?? {}).length ? (
                <div className="petspot-hours-grid">
                  <LocalizedCopy>{Object.entries(spot.opening_hours).map(([day, hours]) => (
                    <div className="petspot-fact-row" key={day}>
                      <span><LocalizedCopy>{day === "daily" ? "Setiap hari" : day}</LocalizedCopy></span>
                      <b><LocalizedCopy>{hours}</LocalizedCopy></b>
                    </div>
                  ))}</LocalizedCopy>
                </div>
              ) : (
                <p><LocalizedCopy>{"Konfirmasi jam buka langsung kepada pengelola sebelum berkunjung."}</LocalizedCopy></p>
              )}</LocalizedCopy>
            </section>
            {spot.resources?.length ? (
              <section className="petspot-detail-section">
                <h3><LocalizedCopy>{"Pilihan tempat untukmu"}</LocalizedCopy></h3>
                <p><LocalizedCopy>{"Meja dan unit berasal dari pengelola. Ketersediaannya akan dicek sesuai jadwalmu."}</LocalizedCopy></p>
                <div className="petspot-resource-preview">
                  <LocalizedCopy>{spot.resources.map((resource) => (
                    <div key={resource.id}>
                      <LocalizedCopy>{resource.image_urls?.[0] ? (
                        <Image
                          src={resource.image_urls[0]}
                          alt={resource.name}
                          width={100}
                          height={84}
                          unoptimized
                        />
                      ) : (
                        <span className="petspot-resource-symbol"><LocalizedCopy>{"⌖"}</LocalizedCopy></span>
                      )}</LocalizedCopy>
                      <span>
                        <b><LocalizedCopy>{resource.name}</LocalizedCopy></b>
                        <small>
                          <LocalizedCopy>{resource.floor_name || resource.resource_type}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                          <LocalizedCopy>{resource.capacity}</LocalizedCopy><LocalizedCopy>{" tamu"}</LocalizedCopy></small>
                        <strong>
                          <LocalizedCopy>{money.format(resource.base_price)}</LocalizedCopy><LocalizedCopy>{" /"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                          <LocalizedCopy>{isPetSpotStay(spot.category)
                            ? resource.booking_rules?.rate_period === "month"
                              ? "30 malam"
                              : "malam"
                            : "reservasi"}</LocalizedCopy>
                        </strong>
                      </span>
                    </div>
                  ))}</LocalizedCopy>
                </div>
              </section>
            ) : null}
          </>
        ) : null}</LocalizedCopy>
        <LocalizedCopy>{section === "facilities" ? (
          <>
            <section className="petspot-detail-section">
              <h3><LocalizedCopy>{"Fasilitas untuk pet & pet parent"}</LocalizedCopy></h3>
              <div className="petspot-facility-grid">
                <LocalizedCopy>{facilities.map((facility) => (
                  <article
                    key={
                      typeof facility === "string" ? facility : facility.name
                    }
                  >
                    <span><LocalizedCopy>{"✓"}</LocalizedCopy></span>
                    <div>
                      <h4>
                        <LocalizedCopy>{typeof facility === "string"
                          ? facility
                          : facility.name}</LocalizedCopy>
                      </h4>
                      <LocalizedCopy>{typeof facility !== "string" && facility.description ? (
                        <p><LocalizedCopy>{facility.description}</LocalizedCopy></p>
                      ) : null}</LocalizedCopy>
                    </div>
                  </article>
                ))}</LocalizedCopy>
              </div>
              <LocalizedCopy>{!facilities.length ? (
                <p><LocalizedCopy>{"Fasilitas belum ditambahkan pengelola."}</LocalizedCopy></p>
              ) : null}</LocalizedCopy>
            </section>
            <section className="petspot-detail-section">
              <h3><LocalizedCopy>{"Pet policy & house rules"}</LocalizedCopy></h3>
              <LocalizedCopy>{policy.require_vaccine ? (
                <p><LocalizedCopy>{"✓ Bukti vaksin diperlukan sebelum kunjungan."}</LocalizedCopy></p>
              ) : null}</LocalizedCopy>
              <LocalizedCopy>{rules.length ? (
                <ul>
                  <LocalizedCopy>{rules.map((rule) => (
                    <li key={rule}><LocalizedCopy>{rule}</LocalizedCopy></li>
                  ))}</LocalizedCopy>
                </ul>
              ) : (
                <p><LocalizedCopy>{"Konfirmasi aturan leash, ukuran pet, dan area yang dapat diakses kepada pengelola."}</LocalizedCopy></p>
              )}</LocalizedCopy>
              <LocalizedCopy>{spot.reservable ? (
                <div className="petspot-policy-summary">
                  <LocalizedCopy>{typeof policy.minimum_notice_minutes === "number" ? (
                    <p><LocalizedCopy>{"Pesan minimal "}</LocalizedCopy><LocalizedCopy>{policy.minimum_notice_minutes}</LocalizedCopy><LocalizedCopy>{" menit sebelum jadwal."}</LocalizedCopy></p>
                  ) : null}</LocalizedCopy>
                  <LocalizedCopy>{typeof policy.maximum_party_size === "number" ? (
                    <p><LocalizedCopy>{"Maksimal "}</LocalizedCopy><LocalizedCopy>{policy.maximum_party_size}</LocalizedCopy><LocalizedCopy>{" tamu per reservasi."}</LocalizedCopy></p>
                  ) : null}</LocalizedCopy>
                  <LocalizedCopy>{typeof policy.cancellation_hours === "number" ? (
                    <p><LocalizedCopy>{"Batas pembatalan "}</LocalizedCopy><LocalizedCopy>{policy.cancellation_hours}</LocalizedCopy><LocalizedCopy>{" jam sebelum kunjungan"}</LocalizedCopy><LocalizedCopy>{Number(policy.cancellation_fee_percent) > 0
                        ? ` · biaya ${policy.cancellation_fee_percent}%`
                        : ""}</LocalizedCopy><LocalizedCopy>{"."}</LocalizedCopy></p>
                  ) : null}</LocalizedCopy>
                </div>
              ) : null}</LocalizedCopy>
            </section>
            {spot.supported_events?.length ? (
              <section className="petspot-detail-section">
                <h3><LocalizedCopy>{"Aktivitas & pengalaman"}</LocalizedCopy></h3>
                <div className="petspot-activities-grid">
                  <LocalizedCopy>{spot.supported_events.map((event) => (
                    <article key={event.name}>
                      <h4><LocalizedCopy>{event.name}</LocalizedCopy></h4>
                      <p><LocalizedCopy>{event.description}</LocalizedCopy></p>
                      <LocalizedCopy>{event.inclusions?.length ? (
                        <div className="petspot-highlights">
                          <LocalizedCopy>{event.inclusions.map((value) => (
                            <span key={value}><LocalizedCopy>{value}</LocalizedCopy></span>
                          ))}</LocalizedCopy>
                        </div>
                      ) : null}</LocalizedCopy>
                    </article>
                  ))}</LocalizedCopy>
                </div>
              </section>
            ) : null}
          </>
        ) : null}</LocalizedCopy>
        <LocalizedCopy>{section === "reviews" ? (
          <section className="petspot-detail-section">
            <h3><LocalizedCopy>{"Pengalaman pet parents"}</LocalizedCopy></h3>
            <div className="petspot-review-summary">
              <b><LocalizedCopy>{spot.review_count ? Number(spot.rating).toFixed(1) : "—"}</LocalizedCopy></b>
              <span><LocalizedCopy>{"Dari "}</LocalizedCopy><LocalizedCopy>{spot.review_count || 0}</LocalizedCopy><LocalizedCopy>{" ulasan pengunjung"}</LocalizedCopy></span>
            </div>
            <LocalizedCopy>{spot.reviews?.length ? (
              spot.reviews.map((review) => (
                <article className="petspot-review-card" key={review.id}>
                  <header>
                    <b><LocalizedCopy preserve>{review.reviewer_name}</LocalizedCopy></b>
                    <span><LocalizedCopy>{"★ "}</LocalizedCopy><LocalizedCopy>{review.rating}</LocalizedCopy><LocalizedCopy>{"/5"}</LocalizedCopy></span>
                  </header>
                  <small>
                    <LocalizedCopy>{review.verified_visit ? "Kunjungan terverifikasi · " : ""}</LocalizedCopy>
                    <LocalizedCopy>{new Intl.DateTimeFormat(petOwnerIntlLocale(), {
                      dateStyle: "medium",
                    }).format(new Date(review.created_at))}</LocalizedCopy>
                  </small>
                  <p><LocalizedCopy>{review.comment || "Rating tanpa komentar."}</LocalizedCopy></p>
                </article>
              ))
            ) : (
              <div className="petspot-empty"><LocalizedCopy>{"Belum ada ulasan. Cerita pengunjung akan tampil di sini, bukan rating buatan."}</LocalizedCopy></div>
            )}</LocalizedCopy>
          </section>
        ) : null}</LocalizedCopy>
        <LocalizedCopy>{spot.reservable ? (
          <div hidden={section !== "booking"}>
            <PetSpotBooking
              spot={spot}
              ownerName={ownerName}
              notify={notify}
              close={close}
            />
          </div>
        ) : null}</LocalizedCopy>
        <LocalizedCopy>{section !== "booking" ? (
          <footer className="petspot-detail-footer">
            <LocalizedButton
              type="button"
              className="secondary-button"
              disabled={favoriteBusy}
              onClick={() => void save()}
            >
              <Icon name="heart" size={18} /><LocalizedCopy>{" "}</LocalizedCopy>
              <LocalizedCopy>{favoriteBusy ? "Menyimpan…" : "Simpan tempat"}</LocalizedCopy>
            </LocalizedButton>
            <LocalizedCopy>{spot.reservable ? (
              <LocalizedButton
                type="button"
                className="primary-button"
                onClick={() => select("booking")}
              ><LocalizedCopy>{"Pilih jadwal & tempat →"}</LocalizedCopy></LocalizedButton>
            ) : (
              <span><LocalizedCopy>{"Reservasi aplikasi belum diaktifkan pengelola."}</LocalizedCopy></span>
            )}</LocalizedCopy>
          </footer>
        ) : null}</LocalizedCopy>
      </div>
    </div>
  );
}

function PetSpotBooking({
  spot,
  ownerName,
  notify,
  close,
}: {
  spot: PetSpot;
  ownerName: string;
  notify: (message: string) => void;
  close: () => void;
}) {
  const stay = isPetSpotStay(spot.category);
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState(stay ? "14:00" : "18:00");
  const [minutes, setMinutes] = useState(
    Number(spot.reservation_policy?.slot_minutes ?? 90),
  );
  const [guests, setGuests] = useState(2);
  const [pets, setPets] = useState(1);
  const [units, setUnits] = useState<PetSpotUnit[]>([]);
  const [unitID, setUnitID] = useState("");
  const [loadedWindow, setLoadedWindow] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(ownerName);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("");
  const [reservation, setReservation] = useState<PetSpotReservation>();
  const [payment, setPayment] = useState<PaymentIntent>();
  const [paid, setPaid] = useState(false);
  const dateWindow = useMemo(
    () =>
      petSpotBookingWindow({
        category: spot.category,
        date,
        endDate,
        time,
        minutes,
      }),
    [spot.category, date, endDate, time, minutes],
  );
  const windowKey = dateWindow
    ? `${dateWindow.starts_at}/${dateWindow.ends_at}/${guests}`
    : "";
  const requestSequence = useRef(0);
  const checking = Boolean(windowKey && loadedWindow !== windowKey);
  useEffect(() => {
    if (!dateWindow) return;
    let active = true;
    const sequence = ++requestSequence.current;
    void getPetSpotAvailability(
      spot.id,
      dateWindow.starts_at,
      dateWindow.ends_at,
      guests,
    )
      .then((value) => {
        if (active && sequence === requestSequence.current) {
          setUnits(
            value.data.filter(
              (unit) => !stay || ["room", "unit"].includes(unit.resource_type),
            ),
          );
          setLoadedWindow(windowKey);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Ketersediaan belum dapat dimuat",
          );
          setUnits([]);
          setLoadedWindow(windowKey);
        }
      });
    return () => {
      active = false;
    };
  }, [spot.id, dateWindow, guests, stay, windowKey]);
  const selected = !checking
    ? units.find(
        (unit) =>
          unit.id === unitID &&
          unit.available &&
          pets <=
            Number(
              unit.pet_policy?.pet_limit ?? unit.pet_policy?.max_pets ?? 99,
            ),
      )
    : undefined;
  const quote =
    selected && dateWindow
      ? petSpotQuote(spot, selected, dateWindow.days)
      : null;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  function changeWindow() {
    setUnitID("");
    setError("");
  }
  async function reserve(event: FormEvent) {
    event.preventDefault();
    if (!isPetOwnerAuthenticated()) {
      window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
      notify("Login untuk membuat reservasi");
      return;
    }
    if (!selected || !dateWindow || !method || busy || reservation) return;
    setBusy(true);
    setError("");
    try {
      const created = await createPetSpotReservation({
        resource_id: selected.id,
        guest_name: name.trim(),
        guest_phone: phone.trim(),
        guest_count: guests,
        pet_count: pets,
        starts_at: dateWindow.starts_at,
        ends_at: dateWindow.ends_at,
        special_request: note.trim(),
      });
      setReservation(created);
      try {
        setPayment(
          await createPaymentIntent("petspot_reservation", created.id, method),
        );
      } catch (cause) {
        setError(
          `${cause instanceof Error ? cause.message : "QRIS belum tersedia"}. Reservasi ${created.reservation_number} telah tersimpan. Lanjutkan DP dari Aktivitas sebelum batas waktu.`,
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Reservasi gagal dibuat",
      );
      setUnitID("");
    } finally {
      setBusy(false);
    }
  }
  if (paid)
    return (
      <section className="petspot-detail-section">
        <h3><LocalizedCopy>{"Reservasi terkonfirmasi ✓"}</LocalizedCopy></h3>
        <p>
          <LocalizedCopy>{reservation?.reservation_number}</LocalizedCopy><LocalizedCopy>{" · Detail tersedia di Aktivitas dan dashboard pengelola."}</LocalizedCopy></p>
        <LocalizedButton className="primary-button" onClick={close}><LocalizedCopy>{"Selesai"}</LocalizedCopy></LocalizedButton>
      </section>
    );
  if (payment)
    return <QrisPaymentPanel payment={payment} onPaid={() => setPaid(true)} />;
  return (
    <form
      className="petspot-booking-form world-form"
      onSubmit={(event) => void reserve(event)}
    >
      <section className="petspot-detail-section">
        <span className="world-kicker"><LocalizedCopy>{"01 · JADWAL KUNJUNGAN"}</LocalizedCopy></span>
        <h3><LocalizedCopy>{stay ? "Pilih masa tinggal" : "Kapan ingin berkunjung?"}</LocalizedCopy></h3>
        <p><LocalizedCopy>{"Waktu tempat: Asia/Jakarta (WIB). Pilih meja/unit sendiri setelah ketersediaan dicek."}</LocalizedCopy></p>
        <div className="petspot-form-grid">
          <label>
            <span><LocalizedCopy>{stay ? "Check-in" : "Tanggal kunjungan"}</LocalizedCopy></span>
            <SlivaDatePicker
              type="date"
              required
              min={today}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                changeWindow();
              }}
            />
          </label>
          <LocalizedCopy>{stay ? (
            <label>
              <span><LocalizedCopy>{"Check-out"}</LocalizedCopy></span>
              <SlivaDatePicker
                type="date"
                required
                min={date || today}
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  changeWindow();
                }}
              />
            </label>
          ) : (
            <label>
              <span><LocalizedCopy>{"Jam datang"}</LocalizedCopy></span>
              <SlivaDatePicker
                type="time"
                required
                value={time}
                onChange={(event) => {
                  setTime(event.target.value);
                  changeWindow();
                }}
              />
            </label>
          )}</LocalizedCopy>
          <LocalizedCopy>{!stay ? (
            <label>
              <span><LocalizedCopy>{"Durasi (menit)"}</LocalizedCopy></span>
              <LocalizedInput
                type="number"
                required
                min={Number(
                  spot.reservation_policy?.minimum_duration_minutes ?? 30,
                )}
                max={Number(
                  spot.reservation_policy?.maximum_duration_minutes ?? 1440,
                )}
                step={30}
                value={minutes}
                onChange={(event) => {
                  setMinutes(Number(event.target.value));
                  changeWindow();
                }}
              />
            </label>
          ) : null}</LocalizedCopy>
          <label>
            <span><LocalizedCopy>{stay ? "Penghuni" : "Jumlah tamu"}</LocalizedCopy></span>
            <LocalizedInput
              type="number"
              required
              min={1}
              max={Number(spot.reservation_policy?.maximum_party_size ?? 20)}
              value={guests}
              onChange={(event) => {
                setGuests(Number(event.target.value));
                changeWindow();
              }}
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Jumlah pet"}</LocalizedCopy></span>
            <LocalizedInput
              type="number"
              required
              min={0}
              max={20}
              value={pets}
              onChange={(event) => {
                setPets(Number(event.target.value));
                setUnitID("");
              }}
            />
          </label>
        </div>
        <LocalizedCopy>{stay ? (
          <p>
            <LocalizedCopy>{spot.category === "boarding_house"
              ? "Kosan minimal 30 malam."
              : "Minimal 1 malam."}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"Harga mengikuti periode unit dari pengelola."}</LocalizedCopy></p>
        ) : null}</LocalizedCopy>
        <LocalizedCopy>{date && (!stay || endDate) && !dateWindow ? (
          <p className="petspot-error"><LocalizedCopy>{"Durasi belum valid. Periksa tanggal dan waktu pilihanmu."}</LocalizedCopy></p>
        ) : null}</LocalizedCopy>
      </section>
      <section className="petspot-detail-section">
        <span className="world-kicker"><LocalizedCopy>{"02 · PILIH TEMPAT"}</LocalizedCopy></span>
        <h3><LocalizedCopy>{stay ? "Unit tersedia" : "Meja / area tersedia"}</LocalizedCopy></h3>
        <LocalizedCopy>{!dateWindow ? (
          <p><LocalizedCopy>{"Lengkapi jadwal agar kami dapat memeriksa ketersediaan."}</LocalizedCopy></p>
        ) : checking ? (
          <p role="status" className="petspot-loading"><LocalizedCopy>{"Memeriksa ketersediaan dari pengelola…"}</LocalizedCopy></p>
        ) : (
          <div className="petspot-unit-grid">
            <LocalizedCopy>{units.map((unit) => {
              const eligible =
                unit.available &&
                pets <=
                  Number(
                    unit.pet_policy?.pet_limit ??
                      unit.pet_policy?.max_pets ??
                      99,
                  );
              return (
                <LocalizedButton
                  type="button"
                  key={unit.id}
                  disabled={!eligible || Boolean(reservation)}
                  aria-pressed={unitID === unit.id}
                  className={`petspot-unit-choice ${unitID === unit.id ? "selected" : ""}`}
                  onClick={() => setUnitID(unit.id)}
                >
                  <LocalizedCopy>{unit.image_urls?.[0] ? (
                    <Image
                      src={unit.image_urls[0]}
                      alt={unit.name}
                      width={140}
                      height={100}
                      unoptimized
                    />
                  ) : null}</LocalizedCopy>
                  <span>
                    <b><LocalizedCopy>{unit.name}</LocalizedCopy></b>
                    <small>
                      <LocalizedCopy>{unit.code}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{unit.floor_name || "Area"}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{unit.capacity}</LocalizedCopy><LocalizedCopy>{" tamu"}</LocalizedCopy></small>
                    <LocalizedCopy>{unit.amenities?.length ? (
                      <small><LocalizedCopy>{unit.amenities.slice(0, 3).join(" · ")}</LocalizedCopy></small>
                    ) : null}</LocalizedCopy>
                    <strong>
                      <LocalizedCopy>{money.format(unit.base_price)}</LocalizedCopy><LocalizedCopy>{" /"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{stay
                        ? unit.booking_rules?.rate_period === "month"
                          ? "30 malam"
                          : "malam"
                        : "reservasi"}</LocalizedCopy>
                    </strong>
                    <em>
                      <LocalizedCopy>{!unit.available
                        ? "Sudah dipesan"
                        : !eligible
                          ? "Batas jumlah pet"
                          : unitID === unit.id
                            ? "✓ Pilihanmu"
                            : "Pilih tempat ini"}</LocalizedCopy>
                    </em>
                  </span>
                </LocalizedButton>
              );
            })}</LocalizedCopy>
            <LocalizedCopy>{!units.length ? (
              <p><LocalizedCopy>{"Tidak ada meja/unit yang cocok. Coba jadwal atau jumlah tamu lain."}</LocalizedCopy></p>
            ) : null}</LocalizedCopy>
          </div>
        )}</LocalizedCopy>
      </section>
      <LocalizedCopy>{quote ? (
        <section className="petspot-cost-summary">
          <h3><LocalizedCopy>{"Rincian reservasi"}</LocalizedCopy></h3>
          <div>
            <span><LocalizedCopy>{"Total "}</LocalizedCopy><LocalizedCopy>{selected?.name}</LocalizedCopy>
              <LocalizedCopy>{quote.periods > 1 ? ` · ${quote.periods} periode` : ""}</LocalizedCopy>
            </span>
            <b><LocalizedCopy>{money.format(quote.subtotal)}</LocalizedCopy></b>
          </div>
          <div>
            <span><LocalizedCopy>{"DP sekarang melalui QRIS"}</LocalizedCopy></span>
            <strong><LocalizedCopy>{money.format(quote.deposit)}</LocalizedCopy></strong>
          </div>
          <div>
            <span><LocalizedCopy>{"Sisa sesuai kebijakan pengelola"}</LocalizedCopy></span>
            <b><LocalizedCopy>{money.format(quote.remaining)}</LocalizedCopy></b>
          </div>
          <p><LocalizedCopy>{"Booking dikonfirmasi setelah DP terverifikasi. Ketersediaan ditahan sementara selama"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
            <LocalizedCopy>{Number(spot.reservation_policy?.hold_minutes ?? 15)}</LocalizedCopy><LocalizedCopy>{" menit."}</LocalizedCopy></p>
        </section>
      ) : null}</LocalizedCopy>
      <section className="petspot-detail-section">
        <span className="world-kicker"><LocalizedCopy>{"03 · DATA PEMESAN"}</LocalizedCopy></span>
        <div className="petspot-form-grid">
          <label>
            <span><LocalizedCopy>{"Nama lengkap"}</LocalizedCopy></span>
            <LocalizedInput
              required
              maxLength={180}
              autoComplete="name"
              placeholder="Nama sesuai akun"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Nomor HP"}</LocalizedCopy></span>
            <LocalizedInput
              required
              type="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
        </div>
        <label>
          <span><LocalizedCopy>{"Catatan untuk pengelola (opsional)"}</LocalizedCopy></span>
          <LocalizedTextarea
            placeholder="Contoh: area outdoor, membawa 2 anjing"
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </section>
      <LocalizedCopy>{reservation ? (
        <p className="petspot-policy-summary"><LocalizedCopy>{"Reservasi "}</LocalizedCopy><LocalizedCopy>{reservation.reservation_number}</LocalizedCopy><LocalizedCopy>{" tersimpan. Batas DP:"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
          <LocalizedCopy>{new Intl.DateTimeFormat(petOwnerIntlLocale(), {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "Asia/Jakarta",
          }).format(new Date(reservation.hold_expires_at))}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"WIB."}</LocalizedCopy></p>
      ) : null}</LocalizedCopy>
      <LocalizedCopy>{error ? (
        <p role="alert" className="petspot-error">
          <LocalizedCopy>{error}</LocalizedCopy>
        </p>
      ) : null}</LocalizedCopy>
      <PaymentMethodPicker value={method} onChange={setMethod} />
      <LocalizedButton
        type="submit"
        className="primary-button petspot-confirm"
        disabled={!selected || !method || busy || Boolean(reservation)}
      >
        <LocalizedCopy>{busy ? "Menyimpan reservasi…" : "Reservasi & bayar DP"}</LocalizedCopy>
      </LocalizedButton>
    </form>
  );
}
