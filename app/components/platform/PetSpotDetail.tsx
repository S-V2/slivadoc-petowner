"use client";
import Image from "next/image";
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

const money = new Intl.NumberFormat("id-ID", {
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
      {gallery(spot)}
      <div className="petspot-detail-body">
        <div className="petspot-detail-heading" ref={heading}>
          <span className="world-kicker">
            {petSpotCategory(spot.category)} · {spot.city}
          </span>
          <h2>{spot.name}</h2>
          <div className="petspot-detail-meta">
            <span>
              ★{" "}
              {spot.review_count
                ? Number(spot.rating).toFixed(1)
                : "Belum dinilai"}{" "}
              · {spot.review_count || 0} ulasan
            </span>
            {spot.verified ? (
              <span className="petspot-verified">✓ Partner terverifikasi</span>
            ) : null}
          </div>
          <p>{spot.address}</p>
        </div>
        <nav className="petspot-detail-tabs" aria-label="Detail tempat">
          {tabs
            .filter((tab) => tab.id !== "booking" || spot.reservable)
            .map((tab) => (
              <button
                type="button"
                key={tab.id}
                aria-pressed={section === tab.id}
                className={section === tab.id ? "active" : ""}
                onClick={() => select(tab.id)}
              >
                {tab.label}
              </button>
            ))}
        </nav>
        {!detail && !detailError ? (
          <div role="status" className="petspot-loading">
            Memuat informasi tempat, fasilitas, dan ulasan…
          </div>
        ) : null}
        {detailError ? (
          <div className="petspot-error" role="alert">
            {detailError}{" "}
            <button
              type="button"
              onClick={() => setLoadAttempt((value) => value + 1)}
            >
              Coba lagi
            </button>
          </div>
        ) : null}
        {section === "overview" ? (
          <>
            <section className="petspot-detail-section">
              <h3>Kenali tempatnya</h3>
              <p>
                {spot.description || "Deskripsi belum ditambahkan pengelola."}
              </p>
              <div className="petspot-highlights">
                {facilities.slice(0, 4).map((facility) => (
                  <span
                    key={
                      typeof facility === "string" ? facility : facility.name
                    }
                  >
                    ✓ {typeof facility === "string" ? facility : facility.name}
                  </span>
                ))}
              </div>
            </section>
            <section className="petspot-detail-section">
              <h3>Lokasi & akses</h3>
              <p>
                {spot.address} · {spot.city}
              </p>
              <div className="petspot-contact-actions">
                {maps ? (
                  <a href={maps} target="_blank" rel="noreferrer">
                    <Icon name="map" size={17} /> Petunjuk arah
                  </a>
                ) : null}
                {spot.phone ? (
                  <a href={`tel:${spot.phone.replace(/[^+0-9]/g, "")}`}>
                    <Icon name="chat" size={17} /> Hubungi tempat
                  </a>
                ) : null}
                {/^https:\/\//.test(spot.website_url ?? "") ? (
                  <a href={spot.website_url} target="_blank" rel="noreferrer">
                    Website tempat ↗
                  </a>
                ) : null}
              </div>
            </section>
            <section className="petspot-detail-section">
              <h3>Jam operasional</h3>
              {Object.entries(spot.opening_hours ?? {}).length ? (
                Object.entries(spot.opening_hours).map(([day, hours]) => (
                  <div className="petspot-fact-row" key={day}>
                    <span>{day === "daily" ? "Setiap hari" : day}</span>
                    <b>{hours}</b>
                  </div>
                ))
              ) : (
                <p>
                  Konfirmasi jam buka langsung kepada pengelola sebelum
                  berkunjung.
                </p>
              )}
            </section>
            {spot.resources?.length ? (
              <section className="petspot-detail-section">
                <h3>Pilihan tempat untukmu</h3>
                <p>
                  Meja dan unit berasal dari pengelola. Ketersediaannya akan
                  dicek sesuai jadwalmu.
                </p>
                <div className="petspot-resource-preview">
                  {spot.resources.map((resource) => (
                    <div key={resource.id}>
                      {resource.image_urls?.[0] ? (
                        <Image
                          src={resource.image_urls[0]}
                          alt={resource.name}
                          width={100}
                          height={84}
                          unoptimized
                        />
                      ) : (
                        <span className="petspot-resource-symbol">⌖</span>
                      )}
                      <span>
                        <b>{resource.name}</b>
                        <small>
                          {resource.floor_name || resource.resource_type} ·{" "}
                          {resource.capacity} tamu
                        </small>
                        <strong>
                          {money.format(resource.base_price)} /{" "}
                          {isPetSpotStay(spot.category)
                            ? resource.booking_rules?.rate_period === "month"
                              ? "30 malam"
                              : "malam"
                            : "reservasi"}
                        </strong>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
        {section === "facilities" ? (
          <>
            <section className="petspot-detail-section">
              <h3>Fasilitas untuk pet & pet parent</h3>
              <div className="petspot-facility-grid">
                {facilities.map((facility) => (
                  <article
                    key={
                      typeof facility === "string" ? facility : facility.name
                    }
                  >
                    <span>✓</span>
                    <div>
                      <h4>
                        {typeof facility === "string"
                          ? facility
                          : facility.name}
                      </h4>
                      {typeof facility !== "string" && facility.description ? (
                        <p>{facility.description}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              {!facilities.length ? (
                <p>Fasilitas belum ditambahkan pengelola.</p>
              ) : null}
            </section>
            <section className="petspot-detail-section">
              <h3>Pet policy & house rules</h3>
              {policy.require_vaccine ? (
                <p>✓ Bukti vaksin diperlukan sebelum kunjungan.</p>
              ) : null}
              {rules.length ? (
                <ul>
                  {rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  Konfirmasi aturan leash, ukuran pet, dan area yang dapat
                  diakses kepada pengelola.
                </p>
              )}
              {spot.reservable ? (
                <div className="petspot-policy-summary">
                  {typeof policy.minimum_notice_minutes === "number" ? (
                    <p>
                      Pesan minimal {policy.minimum_notice_minutes} menit
                      sebelum jadwal.
                    </p>
                  ) : null}
                  {typeof policy.maximum_party_size === "number" ? (
                    <p>
                      Maksimal {policy.maximum_party_size} tamu per reservasi.
                    </p>
                  ) : null}
                  {typeof policy.cancellation_hours === "number" ? (
                    <p>
                      Batas pembatalan {policy.cancellation_hours} jam sebelum
                      kunjungan
                      {Number(policy.cancellation_fee_percent) > 0
                        ? ` · biaya ${policy.cancellation_fee_percent}%`
                        : ""}
                      .
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
            {spot.supported_events?.length ? (
              <section className="petspot-detail-section">
                <h3>Aktivitas & pengalaman</h3>
                {spot.supported_events.map((event) => (
                  <article key={event.name}>
                    <h4>{event.name}</h4>
                    <p>{event.description}</p>
                    {event.inclusions?.length ? (
                      <div className="petspot-highlights">
                        {event.inclusions.map((value) => (
                          <span key={value}>{value}</span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </section>
            ) : null}
          </>
        ) : null}
        {section === "reviews" ? (
          <section className="petspot-detail-section">
            <h3>Pengalaman pet parents</h3>
            <div className="petspot-review-summary">
              <b>{spot.review_count ? Number(spot.rating).toFixed(1) : "—"}</b>
              <span>Dari {spot.review_count || 0} ulasan pengunjung</span>
            </div>
            {spot.reviews?.length ? (
              spot.reviews.map((review) => (
                <article className="petspot-review-card" key={review.id}>
                  <header>
                    <b>{review.reviewer_name}</b>
                    <span>★ {review.rating}/5</span>
                  </header>
                  <small>
                    {review.verified_visit ? "Kunjungan terverifikasi · " : ""}
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                    }).format(new Date(review.created_at))}
                  </small>
                  <p>{review.comment || "Rating tanpa komentar."}</p>
                </article>
              ))
            ) : (
              <div className="petspot-empty">
                Belum ada ulasan. Cerita pengunjung akan tampil di sini, bukan
                rating buatan.
              </div>
            )}
          </section>
        ) : null}
        {spot.reservable ? (
          <div hidden={section !== "booking"}>
            <PetSpotBooking
              spot={spot}
              ownerName={ownerName}
              notify={notify}
              close={close}
            />
          </div>
        ) : null}
        {section !== "booking" ? (
          <footer className="petspot-detail-footer">
            <button
              type="button"
              className="secondary-button"
              disabled={favoriteBusy}
              onClick={() => void save()}
            >
              <Icon name="heart" size={18} />{" "}
              {favoriteBusy ? "Menyimpan…" : "Simpan tempat"}
            </button>
            {spot.reservable ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => select("booking")}
              >
                Pilih jadwal & tempat →
              </button>
            ) : (
              <span>Reservasi aplikasi belum diaktifkan pengelola.</span>
            )}
          </footer>
        ) : null}
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
          pets <= Number(unit.pet_policy?.pet_limit ?? unit.pet_policy?.max_pets ?? 99),
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
        <h3>Reservasi terkonfirmasi ✓</h3>
        <p>
          {reservation?.reservation_number} · Detail tersedia di Aktivitas dan
          dashboard pengelola.
        </p>
        <button className="primary-button" onClick={close}>
          Selesai
        </button>
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
        <span className="world-kicker">01 · JADWAL KUNJUNGAN</span>
        <h3>{stay ? "Pilih masa tinggal" : "Kapan ingin berkunjung?"}</h3>
        <p>
          Waktu tempat: Asia/Jakarta (WIB). Pilih meja/unit sendiri setelah
          ketersediaan dicek.
        </p>
        <div className="petspot-form-grid">
          <label>
            <span>{stay ? "Check-in" : "Tanggal kunjungan"}</span>
            <input
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
          {stay ? (
            <label>
              <span>Check-out</span>
              <input
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
              <span>Jam datang</span>
              <input
                type="time"
                required
                value={time}
                onChange={(event) => {
                  setTime(event.target.value);
                  changeWindow();
                }}
              />
            </label>
          )}
          {!stay ? (
            <label>
              <span>Durasi (menit)</span>
              <input
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
          ) : null}
          <label>
            <span>{stay ? "Penghuni" : "Jumlah tamu"}</span>
            <input
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
            <span>Jumlah pet</span>
            <input
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
        {stay ? (
          <p>
            {spot.category === "boarding_house"
              ? "Kosan minimal 30 malam."
              : "Minimal 1 malam."}{" "}
            Harga mengikuti periode unit dari pengelola.
          </p>
        ) : null}
        {date && (!stay || endDate) && !dateWindow ? (
          <p className="petspot-error">
            Durasi belum valid. Periksa tanggal dan waktu pilihanmu.
          </p>
        ) : null}
      </section>
      <section className="petspot-detail-section">
        <span className="world-kicker">02 · PILIH TEMPAT</span>
        <h3>{stay ? "Unit tersedia" : "Meja / area tersedia"}</h3>
        {!dateWindow ? (
          <p>Lengkapi jadwal agar kami dapat memeriksa ketersediaan.</p>
        ) : checking ? (
          <p role="status" className="petspot-loading">
            Memeriksa ketersediaan dari pengelola…
          </p>
        ) : (
          <div className="petspot-unit-grid">
            {units.map((unit) => {
              const eligible =
                unit.available &&
                pets <= Number(unit.pet_policy?.pet_limit ?? unit.pet_policy?.max_pets ?? 99);
              return (
                <button
                  type="button"
                  key={unit.id}
                  disabled={!eligible || Boolean(reservation)}
                  aria-pressed={unitID === unit.id}
                  className={`petspot-unit-choice ${unitID === unit.id ? "selected" : ""}`}
                  onClick={() => setUnitID(unit.id)}
                >
                  {unit.image_urls?.[0] ? (
                    <Image
                      src={unit.image_urls[0]}
                      alt={unit.name}
                      width={140}
                      height={100}
                      unoptimized
                    />
                  ) : null}
                  <span>
                    <b>{unit.name}</b>
                    <small>
                      {unit.code} · {unit.floor_name || "Area"} ·{" "}
                      {unit.capacity} tamu
                    </small>
                    {unit.amenities?.length ? (
                      <small>{unit.amenities.slice(0, 3).join(" · ")}</small>
                    ) : null}
                    <strong>
                      {money.format(unit.base_price)} /{" "}
                      {stay
                        ? unit.booking_rules?.rate_period === "month"
                          ? "30 malam"
                          : "malam"
                        : "reservasi"}
                    </strong>
                    <em>
                      {!unit.available
                        ? "Sudah dipesan"
                        : !eligible
                          ? "Batas jumlah pet"
                          : unitID === unit.id
                            ? "✓ Pilihanmu"
                            : "Pilih tempat ini"}
                    </em>
                  </span>
                </button>
              );
            })}
            {!units.length ? (
              <p>
                Tidak ada meja/unit yang cocok. Coba jadwal atau jumlah tamu
                lain.
              </p>
            ) : null}
          </div>
        )}
      </section>
      {quote ? (
        <section className="petspot-cost-summary">
          <h3>Rincian reservasi</h3>
          <div>
            <span>
              Total {selected?.name}
              {quote.periods > 1 ? ` · ${quote.periods} periode` : ""}
            </span>
            <b>{money.format(quote.subtotal)}</b>
          </div>
          <div>
            <span>DP sekarang melalui QRIS</span>
            <strong>{money.format(quote.deposit)}</strong>
          </div>
          <div>
            <span>Sisa sesuai kebijakan pengelola</span>
            <b>{money.format(quote.remaining)}</b>
          </div>
          <p>
            Booking dikonfirmasi setelah DP terverifikasi. Ketersediaan ditahan
            sementara selama{" "}
            {Number(spot.reservation_policy?.hold_minutes ?? 15)} menit.
          </p>
        </section>
      ) : null}
      <section className="petspot-detail-section">
        <span className="world-kicker">03 · DATA PEMESAN</span>
        <div className="petspot-form-grid">
          <label>
            <span>Nama lengkap</span>
            <input
              required
              maxLength={180}
              autoComplete="name"
              placeholder="Nama sesuai akun"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            <span>Nomor HP</span>
            <input
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
          <span>Catatan untuk pengelola (opsional)</span>
          <textarea
            placeholder="Contoh: area outdoor, membawa 2 anjing"
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </section>
      {reservation ? (
        <p className="petspot-policy-summary">
          Reservasi {reservation.reservation_number} tersimpan. Batas DP:{" "}
          {new Intl.DateTimeFormat("id-ID", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "Asia/Jakarta",
          }).format(new Date(reservation.hold_expires_at))}{" "}
          WIB.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="petspot-error">
          {error}
        </p>
      ) : null}
      <PaymentMethodPicker value={method} onChange={setMethod} />
      <button
        type="submit"
        className="primary-button petspot-confirm"
        disabled={!selected || !method || busy || Boolean(reservation)}
      >
        {busy ? "Menyimpan reservasi…" : "Reservasi & bayar DP"}
      </button>
    </form>
  );
}
