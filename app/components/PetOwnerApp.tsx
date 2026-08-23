"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon, type IconName } from "./Icon";
import {
  careTimeline,
  communityPosts,
  formatRupiah,
  medicalRecords,
  pets,
  products,
  services,
  type AppView,
  type Pet,
  type Service,
} from "../data/mock";

type Notify = (message: string) => void;

const navItems: { id: AppView; label: string; icon: IconName }[] = [
  { id: "home", label: "Beranda", icon: "home" },
  { id: "pets", label: "Hewan Saya", icon: "paw" },
  { id: "discover", label: "Jelajahi", icon: "search" },
  { id: "bookings", label: "Aktivitas", icon: "calendar" },
  { id: "health", label: "Kesehatan", icon: "heart" },
  { id: "shop", label: "Pet Shop", icon: "bag" },
  { id: "community", label: "Komunitas", icon: "users" },
  { id: "profile", label: "Akun", icon: "user" },
];

const titles: Record<AppView, { title: string; subtitle: string }> = {
  home: { title: "Selamat siang, Evans!", subtitle: "Milo dan Luna dalam kondisi baik hari ini." },
  pets: { title: "Hewan Saya", subtitle: "Satu tempat untuk semua profil dan kebutuhan mereka." },
  discover: { title: "Jelajahi Layanan", subtitle: "Temukan perawatan terbaik di sekitar kamu." },
  bookings: { title: "Aktivitas", subtitle: "Pantau booking, konsultasi, dan pesanan Slivadoc." },
  health: { title: "Pusat Kesehatan", subtitle: "Riwayat lengkap dan jadwal perawatan Milo." },
  shop: { title: "Sliva Pet Shop", subtitle: "Kebutuhan pilihan yang dikurasi dokter hewan." },
  community: { title: "Komunitas", subtitle: "Berbagi, belajar, dan membantu sesama pet parent." },
  profile: { title: "Akun & Keluarga", subtitle: "Kelola profil, pembayaran, keamanan, dan benefit." },
};

export default function PetOwnerApp() {
  const [activeView, setActiveView] = useState<AppView>("home");
  const [selectedPetId, setSelectedPetId] = useState(pets[0].id);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(["svc-pawsitive"]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");

  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? pets[0];
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);

  const notify: Notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const openBooking = (service: Service = services[0]) => {
    setSelectedService(service);
    setBookingSuccess(false);
    setBookingOpen(true);
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    notify(favoriteIds.includes(id) ? "Dihapus dari favorit" : "Ditambahkan ke favorit");
  };

  const addToCart = (id: string) => {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    notify("Produk ditambahkan ke keranjang");
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} setActiveView={setActiveView} notify={notify} />

      <main className="main-shell">
        <Topbar
          selectedPet={selectedPet}
          selectedPetId={selectedPetId}
          setSelectedPetId={setSelectedPetId}
          cartCount={cartCount}
          onOpenNotifications={() => setNotificationOpen(true)}
          onOpenCart={() => setCartOpen(true)}
          notify={notify}
        />

        <div className="page-content">
          <PageHeading activeView={activeView} selectedPet={selectedPet} />
          {activeView === "home" && (
            <HomeView
              selectedPet={selectedPet}
              setActiveView={setActiveView}
              openBooking={openBooking}
              setChatOpen={setChatOpen}
              notify={notify}
            />
          )}
          {activeView === "pets" && (
            <PetsView
              selectedPetId={selectedPetId}
              setSelectedPetId={setSelectedPetId}
              setAddPetOpen={setAddPetOpen}
              setActiveView={setActiveView}
              notify={notify}
            />
          )}
          {activeView === "discover" && (
            <DiscoverView
              favorites={favoriteIds}
              toggleFavorite={toggleFavorite}
              openBooking={openBooking}
              notify={notify}
            />
          )}
          {activeView === "bookings" && (
            <BookingsView openBooking={openBooking} setActiveView={setActiveView} notify={notify} />
          )}
          {activeView === "health" && <HealthView pet={selectedPet} notify={notify} />}
          {activeView === "shop" && (
            <ShopView addToCart={addToCart} setCartOpen={setCartOpen} notify={notify} />
          )}
          {activeView === "community" && <CommunityView notify={notify} />}
          {activeView === "profile" && <ProfileView notify={notify} />}
        </div>
      </main>

      <MobileNav activeView={activeView} setActiveView={setActiveView} cartCount={cartCount} />

      <button className="floating-chat" type="button" onClick={() => setChatOpen(true)} aria-label="Buka chat SlivaCare">
        <Icon name="chat" size={22} />
        <span>SlivaCare</span>
        <i />
      </button>

      {notificationOpen && <NotificationDrawer onClose={() => setNotificationOpen(false)} notify={notify} />}
      {chatOpen && <ChatDrawer onClose={() => setChatOpen(false)} notify={notify} />}
      {cartOpen && <CartDrawer cart={cart} setCart={setCart} onClose={() => setCartOpen(false)} notify={notify} />}
      {addPetOpen && <AddPetModal onClose={() => setAddPetOpen(false)} notify={notify} />}
      {bookingOpen && selectedService && (
        <BookingModal
          service={selectedService}
          pet={selectedPet}
          success={bookingSuccess}
          setSuccess={setBookingSuccess}
          onClose={() => setBookingOpen(false)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast-check"><Icon name="check" size={15} /></span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Logo() {
  return (
    <div className="brand" aria-label="Slivadoc">
      <span className="brand-mark"><Icon name="paw" size={22} /></span>
      <span className="brand-copy"><b>sliva</b><strong>doc</strong></span>
    </div>
  );
}

function Sidebar({ activeView, setActiveView, notify }: { activeView: AppView; setActiveView: (view: AppView) => void; notify: Notify }) {
  return (
    <aside className="sidebar">
      <Logo />
      <p className="nav-eyebrow">MENU UTAMA</p>
      <nav className="side-nav" aria-label="Navigasi utama">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={activeView === item.id ? "active" : ""}
            onClick={() => setActiveView(item.id)}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
            {item.id === "bookings" && <em>3</em>}
          </button>
        ))}
      </nav>
      <div className="side-spacer" />
      <button className="side-premium" type="button" onClick={() => notify("Halaman SlivaCare+ segera dibuka") }>
        <span className="premium-icon"><Icon name="sparkle" size={21} /></span>
        <span><b>SlivaCare+</b><small>Proteksi lengkap mulai Rp49rb</small></span>
        <Icon name="chevron" size={17} />
      </button>
      <button className="side-help" type="button" onClick={() => notify("Pusat bantuan dibuka") }>
        <span>?</span> Pusat Bantuan
      </button>
      <div className="side-profile">
        <div className="avatar avatar-blue">EM</div>
        <span><b>Evans Moris</b><small>Pet Parent • Gold</small></span>
        <button type="button" aria-label="Menu akun" onClick={() => notify("Menu akun dibuka") }><Icon name="more" /></button>
      </div>
    </aside>
  );
}

function Topbar({
  selectedPet,
  selectedPetId,
  setSelectedPetId,
  cartCount,
  onOpenNotifications,
  onOpenCart,
  notify,
}: {
  selectedPet: Pet;
  selectedPetId: string;
  setSelectedPetId: (id: string) => void;
  cartCount: number;
  onOpenNotifications: () => void;
  onOpenCart: () => void;
  notify: Notify;
}) {
  return (
    <header className="topbar">
      <div className="mobile-brand"><Logo /></div>
      <button className="location-picker" type="button" onClick={() => notify("Pilih lokasi layanan") }>
        <span><Icon name="map" size={18} /></span>
        <span><small>Lokasi kamu</small><b>Kebayoran Baru, Jakarta</b></span>
        <Icon name="chevron" size={15} />
      </button>
      <label className="global-search">
        <Icon name="search" size={18} />
        <input placeholder="Cari dokter, layanan, produk..." onKeyDown={(event) => event.key === "Enter" && notify(`Mencari “${event.currentTarget.value}”`)} />
        <kbd>⌘ K</kbd>
      </label>
      <div className="top-actions">
        <button className="point-pill" type="button" onClick={() => notify("Kamu memiliki 2.450 Sliva Points") }>
          <span>✦</span><b>2.450</b><small>pts</small>
        </button>
        <label className="pet-switcher compact-select">
          <span className="pet-mini">{selectedPet.avatar}</span>
          <select aria-label="Pilih hewan" value={selectedPetId} onChange={(event) => setSelectedPetId(event.target.value)}>
            {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
          </select>
        </label>
        <button className="icon-button" type="button" onClick={onOpenCart} aria-label="Keranjang">
          <Icon name="cart" />
          {cartCount > 0 && <span className="counter">{cartCount}</span>}
        </button>
        <button className="icon-button" type="button" onClick={onOpenNotifications} aria-label="Notifikasi">
          <Icon name="bell" />
          <span className="notif-dot" />
        </button>
      </div>
    </header>
  );
}

function PageHeading({ activeView, selectedPet }: { activeView: AppView; selectedPet: Pet }) {
  const item = titles[activeView];
  return (
    <div className="page-heading">
      <div>
        <div className="heading-kicker"><span className="live-dot" />Minggu, 23 Agustus 2026</div>
        <h1>{item.title}</h1>
        <p>{activeView === "health" ? `Riwayat lengkap dan jadwal perawatan ${selectedPet.name}.` : item.subtitle}</p>
      </div>
      {activeView !== "home" && (
        <button className="secondary-button heading-action" type="button"><Icon name="download" size={17} /> Unduh ringkasan</button>
      )}
    </div>
  );
}

function HomeView({ selectedPet, setActiveView, openBooking, setChatOpen, notify }: { selectedPet: Pet; setActiveView: (view: AppView) => void; openBooking: (service?: Service) => void; setChatOpen: (value: boolean) => void; notify: Notify }) {
  const quickActions: { label: string; note: string; icon: string; color: string; action: () => void }[] = [
    { label: "Buat Booking", note: "Klinik & grooming", icon: "📅", color: "blue", action: () => openBooking() },
    { label: "Tanya Dokter", note: "Chat atau video", icon: "👩🏻‍⚕️", color: "mint", action: () => setChatOpen(true) },
    { label: "Home Service", note: "Dokter ke rumah", icon: "🏠", color: "peach", action: () => openBooking(services[3]) },
    { label: "Darurat 24/7", note: "Bantuan cepat", icon: "🚑", color: "red", action: () => notify("Menghubungkan ke hotline darurat 24/7") },
    { label: "Beli Produk", note: "Same day delivery", icon: "🛍️", color: "violet", action: () => setActiveView("shop") },
    { label: "Pet Hotel", note: "Titip dengan aman", icon: "🏡", color: "yellow", action: () => openBooking(services[2]) },
  ];

  return (
    <div className="home-layout">
      <section className="hero-card">
        <Image className="hero-image" src="/slivadoc-pet-hero.png" alt="Pet owner bersama anjing golden retriever dan kucing abu-abu" fill priority sizes="(max-width: 900px) 100vw, 70vw" />
        <div className="hero-overlay" />
        <div className="hero-copy">
          <span className="soft-badge"><Icon name="shield" size={14} /> TERLINDUNGI SLIVACARE+</span>
          <h2>Satu aplikasi untuk seluruh kebahagiaan mereka.</h2>
          <p>Rawat, pantau, dan dapatkan bantuan profesional kapan pun {selectedPet.name} membutuhkannya.</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => openBooking()}><Icon name="calendar" size={17} /> Buat booking</button>
            <button className="ghost-button" type="button" onClick={() => setChatOpen(true)}><Icon name="chat" size={17} /> Tanya dokter</button>
          </div>
        </div>
      </section>

      <section className="quick-grid" aria-label="Akses cepat">
        {quickActions.map((item) => (
          <button className="quick-card" type="button" key={item.label} onClick={item.action}>
            <span className={`quick-icon ${item.color}`}>{item.icon}</span>
            <span><b>{item.label}</b><small>{item.note}</small></span>
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="panel health-snapshot">
          <div className="panel-heading">
            <div><span className="section-eyebrow">HEALTH SNAPSHOT</span><h3>Kondisi {selectedPet.name}</h3></div>
            <button type="button" className="link-button" onClick={() => setActiveView("health")}>Lihat detail <Icon name="arrow" size={15} /></button>
          </div>
          <div className="pet-health-main">
            <div className="pet-large-avatar">{selectedPet.avatar}<i className="online-mark"><Icon name="check" size={11} /></i></div>
            <div className="pet-health-copy"><b>{selectedPet.name}</b><span>{selectedPet.breed} • {selectedPet.age}</span><small>Data diperbarui 12 Agu 2026</small></div>
            <div className="health-score" style={{ "--score": `${selectedPet.healthScore * 3.6}deg` } as React.CSSProperties}>
              <div><b>{selectedPet.healthScore}</b><small>/100</small></div>
            </div>
          </div>
          <div className="metric-row">
            <div><span>⚖️</span><small>Berat badan</small><b>{selectedPet.weight}</b><em className="good">Stabil</em></div>
            <div><span>💉</span><small>Vaksin</small><b>4 dari 5</b><em className="warn">1 akan datang</em></div>
            <div><span>🛡️</span><small>Proteksi</small><b>Aktif</b><em className="good">s.d. Agu 2027</em></div>
          </div>
          <div className="health-alert"><span>💡</span><p><b>Insight untuk {selectedPet.name}</b><small>Waktunya menyiapkan vaksin DHPPi. Booking sebelum 4 September agar proteksi tetap optimal.</small></p><button type="button" onClick={() => openBooking()}>Atur jadwal</button></div>
        </section>

        <section className="panel care-panel">
          <div className="panel-heading">
            <div><span className="section-eyebrow">CARE PLAN</span><h3>Perawatan terdekat</h3></div>
            <button className="round-button" type="button" onClick={() => notify("Pengingat baru ditambahkan") }><Icon name="plus" size={18} /></button>
          </div>
          <div className="timeline-list">
            {careTimeline.map((care, index) => (
              <div className="timeline-item" key={care.id}>
                <div className={`timeline-date ${index === 0 ? "today" : ""}`}><b>{care.date.split(" ")[0]}</b><small>{care.date.split(" ").slice(1).join(" ") || ""}</small></div>
                <div className={`timeline-icon ${care.tone}`}>{care.icon}</div>
                <div className="timeline-copy"><b>{care.title}</b><span>{care.note}</span><small><Icon name="clock" size={13} /> {care.time}</small></div>
                <button type="button" className="more-button" onClick={() => notify(`Opsi ${care.title}`)}><Icon name="more" /></button>
              </div>
            ))}
          </div>
          <button className="full-soft-button" type="button" onClick={() => setActiveView("bookings")}>Lihat semua aktivitas <Icon name="arrow" size={16} /></button>
        </section>
      </div>

      <section className="panel nearby-panel">
        <div className="panel-heading">
          <div><span className="section-eyebrow">REKOMENDASI DI SEKITARMU</span><h3>Layanan pilihan untuk {selectedPet.name}</h3></div>
          <button type="button" className="link-button" onClick={() => setActiveView("discover")}>Jelajahi semua <Icon name="arrow" size={15} /></button>
        </div>
        <div className="service-row">
          {services.slice(0, 4).map((service) => (
            <article className="service-mini-card" key={service.id}>
              <div className={`service-cover ${service.accent}`}><span>{service.emoji}</span><em>{service.type}</em></div>
              <div className="service-card-body"><div className="service-title"><b>{service.name}</b><span><Icon name="star" size={13} /> {service.rating}</span></div><p><Icon name="map" size={13} /> {service.distance} • {service.status}</p><div><strong>{service.price}</strong><button type="button" onClick={() => openBooking(service)}>Pilih</button></div></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PetsView({ selectedPetId, setSelectedPetId, setAddPetOpen, setActiveView, notify }: { selectedPetId: string; setSelectedPetId: (id: string) => void; setAddPetOpen: (value: boolean) => void; setActiveView: (view: AppView) => void; notify: Notify }) {
  const pet = pets.find((item) => item.id === selectedPetId) ?? pets[0];
  return (
    <div className="two-column-page">
      <section>
        <div className="pet-card-grid">
          {pets.map((item) => (
            <button className={`pet-profile-card ${selectedPetId === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => setSelectedPetId(item.id)}>
              <span className="pet-profile-avatar" style={{ background: `${item.color}24` }}>{item.avatar}<i><Icon name="check" size={11} /></i></span>
              <span className="pet-profile-copy"><b>{item.name}</b><small>{item.breed}</small><em>{item.gender} • {item.age}</em></span>
              <span className="pet-score-small"><b>{item.healthScore}</b><small>Health</small></span>
            </button>
          ))}
          <button className="add-pet-card" type="button" onClick={() => setAddPetOpen(true)}><span><Icon name="plus" size={25} /></span><b>Tambah hewan</b><small>Buat profil untuk anggota keluarga baru</small></button>
        </div>

        <section className="panel pet-detail-panel">
          <div className="panel-heading"><div><span className="section-eyebrow">PET IDENTITY</span><h3>Profil {pet.name}</h3></div><button className="secondary-button small" type="button" onClick={() => notify("Mode edit profil diaktifkan") }><Icon name="edit" size={15} /> Edit profil</button></div>
          <div className="pet-identity-banner">
            <div className="pet-id-avatar">{pet.avatar}</div>
            <div><span className="verified-badge"><Icon name="shield" size={13} /> Identitas terverifikasi</span><h2>{pet.name}</h2><p>{pet.breed} • {pet.gender}</p><small>Microchip: {pet.microchip}</small></div>
            <button type="button" onClick={() => notify("Pet ID siap dibagikan") }><span>▦</span><small>Tampilkan Pet ID</small></button>
          </div>
          <div className="info-grid">
            <Info label="Tanggal lahir" value="21 Juni 2023" />
            <Info label="Usia" value={pet.age} />
            <Info label="Berat terakhir" value={pet.weight} />
            <Info label="Warna" value={pet.type === "Dog" ? "Golden" : "Blue gray"} />
            <Info label="Sterilisasi" value="Sudah" />
            <Info label="Golongan darah" value={pet.type === "Dog" ? "DEA 1.1+" : "A"} />
          </div>
          <div className="pet-notes"><span>📝</span><div><b>Catatan khusus</b><p>Alergi ringan terhadap protein ayam. Lebih nyaman diperiksa sambil ditemani owner.</p></div><button type="button" onClick={() => notify("Catatan siap diedit") }><Icon name="edit" size={16} /></button></div>
        </section>
      </section>

      <aside className="right-stack">
        <section className="panel compact-panel"><div className="panel-heading"><h3>Ringkasan perawatan</h3><span className="score-chip">{pet.healthScore}/100</span></div><Progress label="Profil kesehatan" value={100} /><Progress label="Vaksin wajib" value={80} /><Progress label="Preventive care" value={75} /><button className="full-soft-button" type="button" onClick={() => setActiveView("health")}>Buka pusat kesehatan <Icon name="arrow" size={15} /></button></section>
        <section className="panel compact-panel"><div className="panel-heading"><h3>Akses keluarga</h3><button className="round-button" type="button" onClick={() => notify("Undangan keluarga siap dikirim") }><Icon name="plus" size={16} /></button></div><Family name="Evans Moris" role="Pemilik utama" initials="EM" /><Family name="Michelle Cheahn" role="Co-parent" initials="MC" /><Family name="drh. Amanda" role="Dokter utama" initials="AP" green /></section>
        <section className="lost-mode-card"><span>📍</span><div><b>Lost Pet Mode</b><p>Aktifkan peringatan dan bagikan profil {pet.name} ke komunitas sekitar.</p><button type="button" onClick={() => notify("Lost Pet Mode memerlukan konfirmasi lokasi")}>Pelajari fitur</button></div></section>
      </aside>
    </div>
  );
}

function DiscoverView({ favorites, toggleFavorite, openBooking, notify }: { favorites: string[]; toggleFavorite: (id: string) => void; openBooking: (service: Service) => void; notify: Notify }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Semua");
  const filters = ["Semua", "Clinic", "Grooming", "Pet Shop", "Pet Hotel", "Home Care"];
  const result = services.filter((service) => (filter === "Semua" || service.type === filter) && service.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <section className="discover-search-card">
        <div><span className="soft-badge white"><Icon name="map" size={14} /> JAKARTA SELATAN</span><h2>Apa yang dibutuhkan hewanmu hari ini?</h2><p>Dokter, grooming, penitipan, dan home service yang telah diverifikasi Slivadoc.</p></div>
        <label><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama klinik atau layanan" /><button type="button" onClick={() => notify(`Menampilkan hasil untuk “${query || "semua layanan"}”`)}>Cari</button></label>
      </section>
      <div className="filter-bar">
        <div className="filter-pills">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <button className="secondary-button small" type="button" onClick={() => notify("Filter lanjutan dibuka") }><Icon name="filter" size={16} /> Filter</button>
      </div>
      <div className="discover-result-head"><p><b>{result.length} layanan</b> ditemukan di dekat Kebayoran Baru</p><select aria-label="Urutkan layanan"><option>Paling direkomendasikan</option><option>Jarak terdekat</option><option>Rating tertinggi</option><option>Harga terendah</option></select></div>
      <div className="service-list-grid">
        {result.map((service) => (
          <article className="service-result-card" key={service.id}>
            <div className={`service-result-cover ${service.accent}`}><span>{service.emoji}</span><em>{service.type}</em><button type="button" aria-label="Favorit" className={favorites.includes(service.id) ? "favorite" : ""} onClick={() => toggleFavorite(service.id)}><Icon name="heart" size={18} /></button></div>
            <div className="service-result-body"><div className="service-name-row"><div><h3>{service.name}</h3><p><Icon name="map" size={14} /> {service.distance} • {service.address}</p></div><span className="rating-box"><b>{service.rating}</b><Icon name="star" size={12} /><small>{service.reviews}</small></span></div><div className="tag-row">{service.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="availability"><span className="live-dot" /><b>{service.status}</b></div><div className="service-result-footer"><div><small>Estimasi harga</small><b>{service.price}</b></div><button className="secondary-button small" type="button" onClick={() => notify(`Detail ${service.name} dibuka`) }>Lihat detail</button><button className="primary-button small" type="button" onClick={() => openBooking(service)}>Booking</button></div></div>
          </article>
        ))}
      </div>
      {result.length === 0 && <div className="empty-state"><span>🔎</span><h3>Layanan belum ditemukan</h3><p>Coba kata kunci atau kategori lain.</p><button className="primary-button small" type="button" onClick={() => { setQuery(""); setFilter("Semua"); }}>Reset pencarian</button></div>}
    </div>
  );
}

function BookingsView({ openBooking, setActiveView, notify }: { openBooking: (service?: Service) => void; setActiveView: (view: AppView) => void; notify: Notify }) {
  const [tab, setTab] = useState("Mendatang");
  return (
    <div>
      <div className="activity-summary-grid"><SummaryCard icon="📅" value="2" label="Booking mendatang" tone="blue" /><SummaryCard icon="📦" value="1" label="Pesanan dalam proses" tone="violet" /><SummaryCard icon="💬" value="3" label="Konsultasi aktif" tone="mint" /><SummaryCard icon="✦" value="2.450" label="Sliva Points" tone="yellow" /></div>
      <div className="tabs"><button className={tab === "Mendatang" ? "active" : ""} type="button" onClick={() => setTab("Mendatang")}>Mendatang <span>2</span></button><button className={tab === "Berlangsung" ? "active" : ""} type="button" onClick={() => setTab("Berlangsung")}>Berlangsung <span>1</span></button><button className={tab === "Riwayat" ? "active" : ""} type="button" onClick={() => setTab("Riwayat")}>Riwayat</button></div>
      {tab === "Mendatang" && <div className="booking-list">
        <article className="booking-card featured"><div className="booking-date"><span>SEP</span><b>04</b><small>16.00</small></div><div className="booking-icon mint">💉</div><div className="booking-copy"><div><span className="status-badge confirmed">Terkonfirmasi</span><small>Booking #SLV-260904-128</small></div><h3>Vaksin DHPPi tahunan</h3><p>Pawsitive Vet Kemang • drh. Amanda Putri</p><span className="pet-inline">🐕 Milo</span></div><div className="booking-actions"><button type="button" className="secondary-button small" onClick={() => notify("Rute menuju klinik dibuka") }><Icon name="map" size={15} /> Petunjuk arah</button><button type="button" className="primary-button small" onClick={() => notify("Detail booking dibuka")}>Detail booking</button></div></article>
        <article className="booking-card"><div className="booking-date"><span>SEP</span><b>12</b><small>09.30</small></div><div className="booking-icon violet">🛁</div><div className="booking-copy"><div><span className="status-badge waiting">Menunggu konfirmasi</span><small>Booking #SLV-260912-203</small></div><h3>Complete Grooming Package</h3><p>Fluffy House Grooming • Antar jemput</p><span className="pet-inline">🐈 Luna</span></div><div className="booking-actions"><button type="button" className="secondary-button small" onClick={() => notify("Jadwal dapat diubah hingga H-1")}>Ubah jadwal</button><button type="button" className="primary-button small" onClick={() => notify("Detail booking dibuka")}>Lihat detail</button></div></article>
      </div>}
      {tab === "Berlangsung" && <article className="booking-card order-live"><div className="booking-icon blue">📦</div><div className="booking-copy"><div><span className="status-badge onway">Dalam perjalanan</span><small>Order #ORD-0823-921</small></div><h3>Pesanan Pet Shop Same Day</h3><p>Kurir menuju alamatmu • Estimasi tiba 14.35–14.50</p><div className="delivery-progress"><i /><i /><i className="active" /><i /></div></div><div className="booking-actions"><button className="secondary-button small" type="button" onClick={() => notify("Chat kurir dibuka")}>Chat kurir</button><button className="primary-button small" type="button" onClick={() => notify("Pelacakan live dibuka")}>Lacak pesanan</button></div></article>}
      {tab === "Riwayat" && <div className="panel history-table"><div className="history-row head"><span>Aktivitas</span><span>Hewan</span><span>Tanggal</span><span>Total</span><span>Status</span><span /></div>{medicalRecords.map((record, index) => <div className="history-row" key={record.id}><span><i>{record.icon}</i><b>{record.title}</b><small>{record.clinic}</small></span><span>{index === 1 ? "Luna" : "Milo"}</span><span>{record.date}</span><span>{index === 0 ? "Rp185.000" : "Rp240.000"}</span><span><em>Selesai</em></span><span><button type="button" onClick={() => notify("Invoice berhasil diunduh") }><Icon name="download" size={17} /></button></span></div>)}</div>}
      <div className="activity-bottom-banner"><div><span>⚡</span><p><b>Butuh layanan lain?</b><small>Booking dokter, grooming, home care, atau hotel dalam beberapa langkah.</small></p></div><button className="primary-button" type="button" onClick={() => openBooking()}>Buat booking baru</button><button className="ghost-text" type="button" onClick={() => setActiveView("discover")}>Jelajahi layanan</button></div>
    </div>
  );
}

function HealthView({ pet, notify }: { pet: Pet; notify: Notify }) {
  const [tab, setTab] = useState("Ringkasan");
  return (
    <div className="health-page">
      <section className="health-hero-panel">
        <div className="health-pet"><span>{pet.avatar}</span><div><small>PROFIL KESEHATAN</small><h2>{pet.name}</h2><p>{pet.breed} • {pet.weight}</p></div></div>
        <div className="health-hero-score"><div style={{ "--score": `${pet.healthScore * 3.6}deg` } as React.CSSProperties}><span><b>{pet.healthScore}</b><small>Excellent</small></span></div><p>Naik <b>+3 poin</b> dari bulan lalu</p></div>
        <div className="health-hero-meta"><span><small>Alergi</small><b>Protein ayam</b></span><span><small>Dokter utama</small><b>drh. Amanda Putri</b></span><span><small>Update terakhir</small><b>12 Agu 2026</b></span></div>
        <button type="button" className="secondary-button small" onClick={() => notify("Health report diunduh") }><Icon name="download" size={16} /> Health report</button>
      </section>
      <div className="tabs wide">{["Ringkasan", "Rekam Medis", "Vaksin", "Obat & Pengingat", "Dokumen"].map((item) => <button type="button" className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}{item === "Obat & Pengingat" && <span>1</span>}</button>)}</div>
      {tab === "Ringkasan" && <div className="health-content-grid">
        <section className="panel"><div className="panel-heading"><h3>Preventive care</h3><button className="link-button" type="button" onClick={() => setTab("Vaksin")}>Lihat detail <Icon name="arrow" size={14} /></button></div><div className="care-ring-row"><div className="large-progress-ring"><span><b>4/5</b><small>Lengkap</small></span></div><div className="care-checklist"><CheckItem done title="Vaksin rabies" note="Berlaku sampai Sep 2026" /><CheckItem done title="Obat cacing" note="Diberikan 18 Jul 2026" /><CheckItem done title="Flea & tick" note="Perlindungan aktif" /><CheckItem title="Vaksin DHPPi" note="Jatuh tempo 4 Sep 2026" /></div></div></section>
        <section className="panel"><div className="panel-heading"><h3>Tren berat badan</h3><span className="good-chip">Ideal</span></div><div className="weight-chart"><div className="chart-labels"><span>30</span><span>29</span><span>28</span><span>27</span></div><svg viewBox="0 0 500 150" preserveAspectRatio="none" aria-label="Grafik berat Milo"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#43a9f4" stopOpacity=".25"/><stop offset="1" stopColor="#43a9f4" stopOpacity="0"/></linearGradient></defs><path d="M0,110 C70,100 90,70 150,82 S250,45 310,70 S420,42 500,47 L500,150 L0,150Z" fill="url(#area)"/><path d="M0,110 C70,100 90,70 150,82 S250,45 310,70 S420,42 500,47" fill="none" stroke="#43a9f4" strokeWidth="4"/><circle cx="500" cy="47" r="6" fill="#fff" stroke="#43a9f4" strokeWidth="4"/></svg><div className="chart-months"><span>Mar</span><span>Apr</span><span>Mei</span><span>Jun</span><span>Jul</span><span>Agu</span></div></div><div className="weight-footer"><span><small>Sekarang</small><b>28.4 kg</b></span><span><small>Ideal breed</small><b>27–32 kg</b></span><span><small>Perubahan</small><b className="good">+0.2 kg</b></span></div></section>
        <section className="panel medical-summary"><div className="panel-heading"><h3>Rekam medis terbaru</h3><button className="link-button" type="button" onClick={() => setTab("Rekam Medis")}>Lihat semua <Icon name="arrow" size={14} /></button></div>{medicalRecords.slice(0, 2).map((record) => <div className="medical-row" key={record.id}><span>{record.icon}</span><div><small>{record.type} • {record.date}</small><b>{record.title}</b><p>{record.diagnosis}</p><em>{record.doctor} • {record.clinic}</em></div><button type="button" onClick={() => notify("Detail rekam medis dibuka") }><Icon name="chevron" size={17} /></button></div>)}</section>
        <section className="panel"><div className="panel-heading"><h3>Obat aktif</h3><button className="round-button" type="button" onClick={() => notify("Tambah obat baru") }><Icon name="plus" size={16} /></button></div><div className="medicine-card"><span>💊</span><div><small>SETIAP HARI • 19.00</small><b>Omega Skin & Coat</b><p>1 tablet setelah makan • Sisa 18 tablet</p><div><i style={{ width: "70%" }} /></div></div><button type="button" onClick={() => notify("Obat ditandai sudah diberikan") }><Icon name="check" size={16} /> Tandai</button></div><div className="refill-note"><span>🔔</span><p>Ingatkan beli lagi dalam <b>14 hari</b></p><button type="button" onClick={() => notify("Auto-repeat diaktifkan")}>Aktifkan auto-repeat</button></div></section>
      </div>}
      {tab === "Rekam Medis" && <RecordList notify={notify} />}
      {tab === "Vaksin" && <VaccineList notify={notify} />}
      {tab === "Obat & Pengingat" && <MedicationList notify={notify} />}
      {tab === "Dokumen" && <DocumentGrid notify={notify} />}
    </div>
  );
}

function ShopView({ addToCart, setCartOpen, notify }: { addToCart: (id: string) => void; setCartOpen: (value: boolean) => void; notify: Notify }) {
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const categories = ["Semua", "Makanan", "Kesehatan", "Vitamin", "Kebutuhan", "Mainan", "Aksesori"];
  const filtered = products.filter((product) => (category === "Semua" || product.category === category) && product.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <section className="shop-banner"><div><span className="soft-badge white">DIKURASI OLEH DOKTER HEWAN</span><h2>Belanja lebih tepat untuk kebutuhan mereka.</h2><p>Rekomendasi personal, produk asli, dan pengiriman same day.</p><button className="primary-button white-button" type="button" onClick={() => notify("Rekomendasi Milo ditampilkan")}>Lihat rekomendasi Milo</button></div><span className="shop-illustration">🛍️<i>🐕</i></span></section>
      <div className="shop-tools"><label><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari makanan, obat, mainan..." /></label><button className="secondary-button" type="button" onClick={() => setCartOpen(true)}><Icon name="cart" size={17} /> Keranjang</button></div>
      <div className="category-scroll">{categories.map((item) => <button type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}><span>{item === "Semua" ? "✨" : item === "Makanan" ? "🥣" : item === "Kesehatan" ? "🩺" : item === "Vitamin" ? "💊" : item === "Kebutuhan" ? "🧴" : item === "Mainan" ? "🧸" : "🎀"}</span>{item}</button>)}</div>
      <div className="shop-section-head"><div><span className="section-eyebrow">PILIHAN UNTUK MILO</span><h3>Rekomendasi dokter</h3></div><select aria-label="Urutkan produk"><option>Paling relevan</option><option>Terlaris</option><option>Harga terendah</option></select></div>
      <div className="product-grid">{filtered.map((product) => <article className="product-card" key={product.id}><div className="product-visual"><span>{product.emoji}</span>{product.badge && <em>{product.badge}</em>}<button type="button" aria-label="Simpan produk" onClick={() => notify("Produk disimpan ke wishlist") }><Icon name="heart" size={17} /></button></div><div className="product-body"><small>{product.brand} <i>✓</i></small><h3>{product.name}</h3><p><Icon name="star" size={13} /> <b>{product.rating}</b> • Terjual {product.sold}</p><div className="product-price"><span><b>{formatRupiah(product.price)}</b>{product.originalPrice && <del>{formatRupiah(product.originalPrice)}</del>}</span><button type="button" onClick={() => addToCart(product.id)} aria-label={`Tambah ${product.name} ke keranjang`}><Icon name="plus" size={18} /></button></div></div></article>)}</div>
      <section className="repeat-banner"><span>🔁</span><div><b>Jangan sampai stok makanan Milo habis</b><p>Atur langganan otomatis, ubah kapan saja, dan hemat hingga 10% setiap pengiriman.</p></div><button className="secondary-button small" type="button" onClick={() => notify("Pengaturan auto-repeat dibuka")}>Atur auto-repeat</button></section>
    </div>
  );
}

function CommunityView({ notify }: { notify: Notify }) {
  const [tab, setTab] = useState("Untuk Kamu");
  const [liked, setLiked] = useState<string[]>([]);
  return (
    <div className="community-layout">
      <section>
        <div className="community-tabs">{["Untuk Kamu", "Mengikuti", "Grup Saya", "Adopsi", "Lost & Found"].map((item) => <button type="button" className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}{item === "Lost & Found" && <i />}</button>)}</div>
        <div className="create-post"><span className="avatar avatar-blue">EM</span><button type="button" onClick={() => notify("Composer posting dibuka")}>Bagikan cerita tentang Milo dan Luna...</button><button type="button" aria-label="Tambah foto" onClick={() => notify("Pilih foto untuk posting") }><Icon name="camera" size={19} /></button></div>
        {communityPosts.map((post) => <article className="community-post" key={post.id}><header><span className="post-avatar">{post.avatar}</span><div><b>{post.author}</b><small>{post.group} • {post.time}</small></div><span className="post-tag">{post.tag}</span><button type="button" onClick={() => notify("Menu posting dibuka") }><Icon name="more" /></button></header><p>{post.body}</p><div className="post-visual"><span>{post.pet}</span><i>SLIVADOC COMMUNITY</i></div><footer><button type="button" className={liked.includes(post.id) ? "liked" : ""} onClick={() => setLiked((current) => current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id])}><Icon name="heart" size={18} /> {post.likes + (liked.includes(post.id) ? 1 : 0)}</button><button type="button" onClick={() => notify("Kolom komentar dibuka") }><Icon name="chat" size={18} /> {post.comments} komentar</button><button type="button" onClick={() => notify("Pilihan berbagi dibuka") }><Icon name="arrow" size={18} /> Bagikan</button></footer></article>)}
      </section>
      <aside className="right-stack community-side"><section className="panel compact-panel"><div className="panel-heading"><h3>Grup untukmu</h3><button className="link-button" type="button" onClick={() => notify("Semua grup ditampilkan")}>Lihat semua</button></div><Group emoji="🐕" name="Golden Retriever Jakarta" members="12,8rb anggota" notify={notify} /><Group emoji="🍲" name="Healthy Homemade Pet Food" members="8,4rb anggota" notify={notify} /><Group emoji="🏥" name="Tanya Dokter Hewan" members="21,2rb anggota" notify={notify} /></section><section className="adoption-card"><span>🐾</span><h3>Buka rumah, ubah satu kehidupan.</h3><p>Temukan hewan terverifikasi yang siap menjadi bagian keluargamu.</p><button type="button" onClick={() => { setTab("Adopsi"); notify("Menampilkan adopsi terverifikasi"); }}>Jelajahi adopsi</button></section><section className="panel compact-panel"><div className="panel-heading"><h3>Pet parent terdekat</h3><span className="live-dot" /></div><div className="nearby-avatars"><span>👩🏻</span><span>👨🏻</span><span>👩🏽</span><span>👨🏼</span><span>+42</span></div><p className="muted-copy">42 pet parent aktif dalam radius 3 km.</p><button className="full-soft-button" type="button" onClick={() => notify("Peta komunitas dibuka") }><Icon name="map" size={16} /> Lihat di peta</button></section></aside>
    </div>
  );
}

function ProfileView({ notify }: { notify: Notify }) {
  return (
    <div className="profile-layout">
      <section className="profile-main-card"><div className="profile-cover"><span>SLIVADOC PET FAMILY</span></div><div className="profile-person"><div className="profile-photo">EM<button type="button" onClick={() => notify("Ubah foto profil") }><Icon name="camera" size={14} /></button></div><div><h2>Evans Moris Cheahn</h2><p>Pet Parent sejak April 2026 • Jakarta Barat</p><span className="gold-member">✦ GOLD MEMBER</span></div><button className="secondary-button small" type="button" onClick={() => notify("Mode edit profil diaktifkan") }><Icon name="edit" size={15} /> Edit profil</button></div><div className="profile-stats"><span><b>2</b><small>Hewan</small></span><span><b>12</b><small>Booking</small></span><span><b>2.450</b><small>Sliva Points</small></span><span><b>Gold</b><small>Membership</small></span></div></section>
      <div className="profile-grid">
        <section className="panel profile-section"><div className="panel-heading"><div><span className="section-eyebrow">KEANGGOTAAN</span><h3>SlivaCare+ Family</h3></div><span className="active-chip">Aktif</span></div><div className="membership-card"><div><span><Icon name="shield" /></span><p><b>Family Protection</b><small>Melindungi Milo & Luna</small></p></div><h3>Rp149.000<small>/bulan</small></h3><ul><li><Icon name="check" size={14} /> Konsultasi chat tanpa batas</li><li><Icon name="check" size={14} /> Cashback perawatan hingga 20%</li><li><Icon name="check" size={14} /> Emergency assistance 24/7</li></ul><button className="full-soft-button" type="button" onClick={() => notify("Detail benefit ditampilkan")}>Kelola langganan <Icon name="chevron" size={16} /></button></div></section>
        <section className="panel profile-section"><div className="panel-heading"><div><span className="section-eyebrow">PEMBAYARAN</span><h3>Dompet & metode bayar</h3></div><button className="round-button" type="button" onClick={() => notify("Tambah metode pembayaran") }><Icon name="plus" size={16} /></button></div><button className="wallet-card" type="button" onClick={() => notify("Riwayat SlivaPay dibuka") }><span><Icon name="wallet" /></span><p><small>Saldo SlivaPay</small><b>Rp425.000</b></p><Icon name="chevron" size={17} /></button><Payment logo="VISA" name="•••• 8421" note="Kartu utama" notify={notify} /><Payment logo="GPay" name="GoPay" note="Terhubung" notify={notify} /></section>
        <section className="panel profile-section span-2"><div className="panel-heading"><div><span className="section-eyebrow">PENGATURAN AKUN</span><h3>Preferensi & keamanan</h3></div></div><div className="settings-grid"><Setting icon="bell" label="Notifikasi" note="Pengingat perawatan, promo, komunitas" notify={notify} /><Setting icon="users" label="Keluarga & akses" note="2 anggota memiliki akses" notify={notify} /><Setting icon="shield" label="Privasi & keamanan" note="PIN, biometrik, dan sesi aktif" notify={notify} /><Setting icon="map" label="Alamat tersimpan" note="Rumah, kantor, dan 1 alamat lain" notify={notify} /><Setting icon="settings" label="Bahasa & tampilan" note="Bahasa Indonesia • Sistem" notify={notify} /><Setting icon="download" label="Data & dokumen" note="Unduh arsip data Slivadoc" notify={notify} /></div></section>
      </div>
      <section className="profile-danger"><button type="button" onClick={() => notify("Pusat bantuan dibuka")}>Pusat Bantuan</button><button type="button" onClick={() => notify("Syarat & privasi dibuka")}>Syarat & Privasi</button><button type="button" onClick={() => notify("Konfirmasi keluar diperlukan")}>Keluar dari akun</button><span>Slivadoc Pet Owner v0.1.0 • UI Prototype</span></section>
    </div>
  );
}

function MobileNav({ activeView, setActiveView, cartCount }: { activeView: AppView; setActiveView: (view: AppView) => void; cartCount: number }) {
  const items = navItems.filter((item) => ["home", "discover", "bookings", "shop", "profile"].includes(item.id));
  return <nav className="mobile-nav">{items.map((item) => <button type="button" key={item.id} className={activeView === item.id ? "active" : ""} onClick={() => setActiveView(item.id)}><span><Icon name={item.icon} size={20} />{item.id === "shop" && cartCount > 0 && <i>{cartCount}</i>}</span><small>{item.label}</small></button>)}</nav>;
}

function NotificationDrawer({ onClose, notify }: { onClose: () => void; notify: Notify }) {
  return <div className="overlay" onMouseDown={onClose}><aside className="drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-eyebrow">UPDATE TERBARU</span><h2>Notifikasi</h2></div><button type="button" onClick={onClose}><Icon name="close" /></button></header><button className="mark-read" type="button" onClick={() => notify("Semua notifikasi ditandai dibaca")}>Tandai semua sudah dibaca</button><div className="notification-list"><Notification icon="💊" tone="blue" title="Waktunya obat Milo" note="Omega Skin & Coat • 1 tablet setelah makan" time="5 menit" unread /><Notification icon="📦" tone="violet" title="Pesanan sedang diantar" note="Kurir Arif akan tiba dalam 20–30 menit." time="12 menit" unread /><Notification icon="💉" tone="mint" title="Vaksin DHPPi segera jatuh tempo" note="Atur jadwal sebelum 4 September 2026." time="2 jam" unread /><Notification icon="✦" tone="yellow" title="Kamu mendapat 250 Sliva Points" note="Dari transaksi di Pawsitive Vet Kemang." time="Kemarin" /></div><button className="full-soft-button" type="button" onClick={() => notify("Semua riwayat notifikasi ditampilkan")}>Lihat semua notifikasi</button></aside></div>;
}

function ChatDrawer({ onClose, notify }: { onClose: () => void; notify: Notify }) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const send = () => { if (!message.trim()) return; setSent((current) => [...current, message]); setMessage(""); };
  return <div className="overlay" onMouseDown={onClose}><aside className="drawer chat-drawer" onMouseDown={(event) => event.stopPropagation()}><header className="chat-header"><div className="doctor-avatar">👩🏻‍⚕️<i /></div><div><h3>SlivaCare Assistant</h3><p>Dokter tersedia • Balas ±2 menit</p></div><button className="video-call" type="button" onClick={() => notify("Menyiapkan video call dengan dokter") }><Icon name="video" size={18} /></button><button type="button" onClick={onClose}><Icon name="close" /></button></header><div className="chat-context"><span>🐕</span><p><small>KONSULTASI UNTUK</small><b>Milo • Golden Retriever</b></p><button type="button" onClick={() => notify("Ganti profil hewan")}>Ganti</button></div><div className="chat-messages"><span className="chat-date">Hari ini</span><div className="message doctor"><span>👩🏻‍⚕️</span><p>Halo Evans! Saya SlivaCare Assistant. Ada yang bisa kami bantu untuk Milo hari ini?<small>12.04</small></p></div><div className="quick-replies"><button type="button" onClick={() => setMessage("Konsultasi gejala")}>🩺 Konsultasi gejala</button><button type="button" onClick={() => setMessage("Tanya obat dan dosis")}>💊 Tanya obat</button><button type="button" onClick={() => setMessage("Bantuan darurat")}>🚑 Darurat</button></div>{sent.map((text, index) => <div className="message me" key={`${text}-${index}`}><p>{text}<small>12.{10 + index} ✓✓</small></p></div>)}</div><div className="chat-input"><button type="button" onClick={() => notify("Lampirkan foto atau dokumen")}>＋</button><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder="Tulis pesan..." /><button type="button" onClick={send}><Icon name="arrow" size={18} /></button></div></aside></div>;
}

function BookingModal({ service, pet, success, setSuccess, onClose }: { service: Service; pet: Pet; success: boolean; setSuccess: (value: boolean) => void; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState("27 Agu");
  const [time, setTime] = useState("16.00");
  if (success) return <div className="modal-overlay"><div className="modal success-modal"><button className="modal-close" type="button" onClick={onClose}><Icon name="close" /></button><span className="success-animation"><Icon name="check" size={34} /></span><small>BOOKING BERHASIL</small><h2>Jadwal {pet.name} sudah aman!</h2><p>{service.name} telah menerima permintaan booking kamu.</p><div className="success-ticket"><span>{service.emoji}</span><div><small>{date} • {time} WIB</small><b>{service.name}</b><p>{pet.avatar} {pet.name} • General Consultation</p></div></div><button className="primary-button full" type="button" onClick={onClose}>Lihat aktivitas</button><button className="ghost-text" type="button" onClick={onClose}>Kembali ke beranda</button></div></div>;
  return <div className="modal-overlay" onMouseDown={onClose}><div className="modal booking-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-eyebrow">BOOKING LAYANAN</span><h2>{service.name}</h2></div><button className="modal-close" type="button" onClick={onClose}><Icon name="close" /></button></header><div className="stepper">{[1,2,3].map((item) => <div key={item} className={step >= item ? "active" : ""}><span>{step > item ? <Icon name="check" size={13} /> : item}</span><small>{item === 1 ? "Layanan" : item === 2 ? "Jadwal" : "Konfirmasi"}</small></div>)}</div>{step === 1 && <div className="booking-step"><label className="field-label">Pilih hewan</label><button className="selected-pet-box" type="button"><span>{pet.avatar}</span><div><b>{pet.name}</b><small>{pet.breed} • {pet.weight}</small></div><i><Icon name="check" size={15} /></i></button><label className="field-label">Pilih layanan</label><div className="service-option selected"><span>🩺</span><div><b>General Consultation</b><small>Pemeriksaan umum dan konsultasi dokter</small></div><strong>Rp85.000</strong><i><Icon name="check" size={13} /></i></div><div className="service-option"><span>💉</span><div><b>Vaccination Package</b><small>Konsultasi, vaksin, dan buku vaksin digital</small></div><strong>Rp240.000</strong></div></div>}{step === 2 && <div className="booking-step"><label className="field-label">Pilih tanggal</label><div className="date-options">{["25 Agu","26 Agu","27 Agu","28 Agu","29 Agu"].map((item) => <button className={date === item ? "selected" : ""} type="button" key={item} onClick={() => setDate(item)}><small>{item === "27 Agu" ? "KAM" : item === "25 Agu" ? "SEL" : item === "26 Agu" ? "RAB" : item === "28 Agu" ? "JUM" : "SAB"}</small><b>{item.split(" ")[0]}</b><span>{item.split(" ")[1]}</span></button>)}</div><label className="field-label">Pilih waktu</label><div className="time-options">{["09.00","10.30","13.00","14.30","16.00","17.30"].map((item) => <button type="button" key={item} className={time === item ? "selected" : ""} onClick={() => setTime(item)}>{item}</button>)}</div><label className="field-label">Catatan untuk dokter <small>(opsional)</small></label><textarea placeholder="Ceritakan keluhan atau hal yang perlu diketahui dokter..." /></div>}{step === 3 && <div className="booking-step"><div className="booking-summary"><div className={`summary-service ${service.accent}`}>{service.emoji}</div><div><span className="status-badge confirmed">Slot tersedia</span><h3>{service.name}</h3><p>{service.address}</p></div></div><div className="summary-lines"><span><small>Hewan</small><b>{pet.avatar} {pet.name}</b></span><span><small>Layanan</small><b>General Consultation</b></span><span><small>Jadwal</small><b>{date} 2026 • {time} WIB</b></span><span><small>Biaya layanan</small><b>Rp85.000</b></span><span><small>Biaya platform</small><b>Rp2.500</b></span><span className="total"><small>Total pembayaran</small><b>Rp87.500</b></span></div><label className="consent"><input type="checkbox" defaultChecked /> Saya menyetujui kebijakan pembatalan dan data kesehatan Slivadoc.</label></div>}<footer><button className="secondary-button" type="button" onClick={() => step === 1 ? onClose() : setStep(step - 1)}>{step === 1 ? "Batal" : "Kembali"}</button><button className="primary-button" type="button" onClick={() => step < 3 ? setStep(step + 1) : setSuccess(true)}>{step < 3 ? "Lanjutkan" : "Konfirmasi & bayar"} <Icon name="arrow" size={16} /></button></footer></div></div>;
}

function CartDrawer({ cart, setCart, onClose, notify }: { cart: Record<string, number>; setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>; onClose: () => void; notify: Notify }) {
  const items = products.filter((product) => cart[product.id]);
  const subtotal = items.reduce((sum, item) => sum + item.price * cart[item.id], 0);
  const update = (id: string, amount: number) => setCart((current) => { const next = { ...current, [id]: Math.max(0, (current[id] ?? 0) + amount) }; if (!next[id]) delete next[id]; return next; });
  return <div className="overlay" onMouseDown={onClose}><aside className="drawer cart-drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-eyebrow">SLIVA PET SHOP</span><h2>Keranjangmu</h2></div><button type="button" onClick={onClose}><Icon name="close" /></button></header>{items.length === 0 ? <div className="empty-state compact"><span>🛒</span><h3>Keranjang masih kosong</h3><p>Yuk, pilih kebutuhan terbaik untuk mereka.</p><button className="primary-button small" type="button" onClick={onClose}>Mulai belanja</button></div> : <><div className="cart-items">{items.map((item) => <div className="cart-item" key={item.id}><span>{item.emoji}</span><div><small>{item.brand}</small><b>{item.name}</b><strong>{formatRupiah(item.price)}</strong></div><div className="quantity"><button type="button" onClick={() => update(item.id, -1)}>−</button><b>{cart[item.id]}</b><button type="button" onClick={() => update(item.id, 1)}>+</button></div></div>)}</div><label className="voucher"><span>🎟️</span><input placeholder="Masukkan kode voucher" /><button type="button" onClick={() => notify("Voucher SLIVAPET10 berhasil digunakan")}>Pakai</button></label><div className="cart-summary"><span><small>Subtotal</small><b>{formatRupiah(subtotal)}</b></span><span><small>Pengiriman</small><b className="good">Gratis</b></span><span><small>Biaya layanan</small><b>Rp2.500</b></span><span className="total"><small>Total</small><b>{formatRupiah(subtotal + 2500)}</b></span></div><button className="primary-button full" type="button" onClick={() => notify("Checkout dummy berhasil dibuka")}>Lanjut ke pembayaran <Icon name="arrow" size={16} /></button></>}</aside></div>;
}

function AddPetModal({ onClose, notify }: { onClose: () => void; notify: Notify }) {
  const [type, setType] = useState("Anjing");
  return <div className="modal-overlay" onMouseDown={onClose}><div className="modal add-pet-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-eyebrow">ANGGOTA KELUARGA BARU</span><h2>Tambah profil hewan</h2><p>Data dasar dapat dilengkapi nanti.</p></div><button className="modal-close" type="button" onClick={onClose}><Icon name="close" /></button></header><div className="pet-photo-upload"><span>🐾</span><button type="button" onClick={() => notify("Pilih foto hewan") }><Icon name="camera" size={15} /> Tambah foto</button></div><label className="field-label">Jenis hewan</label><div className="pet-type-grid">{["Anjing","Kucing","Kelinci","Burung","Lainnya"].map((item) => <button type="button" className={type === item ? "selected" : ""} onClick={() => setType(item)} key={item}><span>{item === "Anjing" ? "🐕" : item === "Kucing" ? "🐈" : item === "Kelinci" ? "🐇" : item === "Burung" ? "🦜" : "🐾"}</span>{item}</button>)}</div><div className="form-grid"><label><span>Nama hewan</span><input placeholder="Contoh: Milo" /></label><label><span>Ras</span><select><option>Pilih ras</option><option>Golden Retriever</option><option>Pomeranian</option><option>Mixed breed</option></select></label><label><span>Jenis kelamin</span><select><option>Jantan</option><option>Betina</option></select></label><label><span>Tanggal lahir</span><input type="date" /></label></div><footer><button className="secondary-button" type="button" onClick={onClose}>Batal</button><button className="primary-button" type="button" onClick={() => { notify("Profil hewan baru disimpan sebagai draft"); onClose(); }}>Simpan profil <Icon name="arrow" size={16} /></button></footer></div></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><small>{label}</small><b>{value}</b></div>; }
function Progress({ label, value }: { label: string; value: number }) { return <div className="progress-row"><span><small>{label}</small><b>{value}%</b></span><div><i style={{ width: `${value}%` }} /></div></div>; }
function Family({ name, role, initials, green }: { name: string; role: string; initials: string; green?: boolean }) { return <div className="family-row"><span className={`avatar ${green ? "avatar-green" : "avatar-blue"}`}>{initials}</span><p><b>{name}</b><small>{role}</small></p><Icon name="chevron" size={15} /></div>; }
function SummaryCard({ icon, value, label, tone }: { icon: string; value: string; label: string; tone: string }) { return <div className="activity-summary-card"><span className={tone}>{icon}</span><p><b>{value}</b><small>{label}</small></p><Icon name="chevron" size={16} /></div>; }
function CheckItem({ done, title, note }: { done?: boolean; title: string; note: string }) { return <div className="check-item"><span className={done ? "done" : ""}>{done ? <Icon name="check" size={13} /> : "!"}</span><p><b>{title}</b><small>{note}</small></p></div>; }
function Notification({ icon, tone, title, note, time, unread }: { icon: string; tone: string; title: string; note: string; time: string; unread?: boolean }) { return <button type="button" className={`notification ${unread ? "unread" : ""}`}><span className={tone}>{icon}</span><p><b>{title}</b><small>{note}</small><em>{time} lalu</em></p>{unread && <i />}</button>; }
function Group({ emoji, name, members, notify }: { emoji: string; name: string; members: string; notify: Notify }) { return <div className="group-row"><span>{emoji}</span><p><b>{name}</b><small>{members}</small></p><button type="button" onClick={() => notify(`Bergabung ke ${name}`)}>Gabung</button></div>; }
function Payment({ logo, name, note, notify }: { logo: string; name: string; note: string; notify: Notify }) { return <button className="payment-row" type="button" onClick={() => notify(`Kelola ${name}`)}><span>{logo}</span><p><b>{name}</b><small>{note}</small></p><Icon name="chevron" size={15} /></button>; }
function Setting({ icon, label, note, notify }: { icon: IconName; label: string; note: string; notify: Notify }) { return <button className="setting-row" type="button" onClick={() => notify(`${label} dibuka`)}><span><Icon name={icon} size={19} /></span><p><b>{label}</b><small>{note}</small></p><Icon name="chevron" size={16} /></button>; }

function RecordList({ notify }: { notify: Notify }) { return <section className="panel record-list"><div className="record-toolbar"><label><Icon name="search" size={17} /><input placeholder="Cari rekam medis" /></label><button className="secondary-button small" type="button" onClick={() => notify("Filter rekam medis dibuka") }><Icon name="filter" size={15} /> Filter</button><button className="primary-button small" type="button" onClick={() => notify("Form unggah rekam medis dibuka") }><Icon name="plus" size={15} /> Tambah data</button></div>{medicalRecords.map((record) => <article key={record.id}><span>{record.icon}</span><div><small>{record.type} • {record.date}</small><h3>{record.title}</h3><p>{record.diagnosis}</p><em>{record.doctor} • {record.clinic}</em></div><button className="secondary-button small" type="button" onClick={() => notify("Dokumen rekam medis diunduh") }><Icon name="download" size={15} /> Unduh</button></article>)}</section>; }
function VaccineList({ notify }: { notify: Notify }) { return <div className="vaccine-grid">{["Rabies","DHPPi","Bordetella","Leptospirosis","Canine Influenza"].map((item,index) => <article className={`panel vaccine-card ${index === 1 ? "due" : ""}`} key={item}><span>{index === 1 ? "⏳" : "💉"}</span><div><small>{index === 1 ? "JATUH TEMPO 4 SEP" : "TERLINDUNGI"}</small><h3>{item}</h3><p>{index === 1 ? "Vaksin tahunan perlu diperbarui" : "Dosis terakhir 4 September 2025"}</p></div><button type="button" onClick={() => notify(index === 1 ? "Booking vaksin dibuka" : "Sertifikat vaksin dibuka")}>{index === 1 ? "Booking" : "Sertifikat"}</button></article>)}</div>; }
function MedicationList({ notify }: { notify: Notify }) { return <div className="medication-page"><section className="panel"><div className="panel-heading"><h3>Jadwal hari ini</h3><button className="primary-button small" type="button" onClick={() => notify("Tambah jadwal obat") }><Icon name="plus" size={15} /> Tambah obat</button></div><div className="medicine-schedule"><span>19.00</span><i>💊</i><div><b>Omega Skin & Coat</b><small>1 tablet • Setelah makan malam</small></div><button type="button" onClick={() => notify("Pemberian obat dicatat") }><Icon name="check" size={15} /> Sudah diberikan</button></div></section><section className="panel medication-history"><h3>Riwayat 7 hari</h3><div>{["S","S","R","K","J","S","M"].map((day,index) => <span key={`${day}-${index}`} className={index < 6 ? "done" : ""}><small>{day}</small><i>{index < 6 ? <Icon name="check" size={13} /> : "•"}</i></span>)}</div><p>Kepatuhan minggu ini <b>100%</b> — luar biasa!</p></section></div>; }
function DocumentGrid({ notify }: { notify: Notify }) { return <div className="document-grid">{["Sertifikat vaksin 2025","Hasil lab CBC","Resep Omega Tabs","Invoice Pawsitive Vet","Pet insurance policy","Microchip certificate"].map((item,index) => <button className="document-card" type="button" key={item} onClick={() => notify(`${item} dibuka`)}><span>{index < 2 ? "📄" : index === 2 ? "💊" : index === 4 ? "🛡️" : "🏷️"}</span><p><b>{item}</b><small>PDF • {index + 1}.2 MB</small></p><Icon name="download" size={17} /></button>)}</div>; }
