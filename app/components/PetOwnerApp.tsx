"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon, type IconName } from "./Icon";
import AddPetExperience from "./integrations/AddPetExperience";
import CommunityExperience from "./integrations/CommunityExperience";
import LocationModal from "./integrations/LocationModal";
import SlivaCareDrawer from "./integrations/SlivaCareDrawer";
import PlatformDiscovery from "./platform/PlatformDiscovery";
import CareMarketplace from "./platform/CareMarketplace";
import PawDatingExperience from "./pawdating/PawDatingExperience";
import type { LocationResult } from "../lib/petowner-api";
import { downloadPetMedicalPDF } from "../lib/pet-pdf";
import { finiteNumber } from "../lib/safe-number";
import {
  PLATFORM_API_URL,
  activateLostPetMode,
  clearPlatformCache,
  closeLostPetMode,
  createPetOwnerBooking,
  getDiscoveryProducts,
  getDiscoveryServices,
  getMedicalRecords,
  globalSearch,
  getPetFamily,
  getLostPetMode,
  getPetOwnerBootstrap,
  invitePetFamily,
  revokePetFamily,
  isPetOwnerAuthenticated,
  readAllNotifications,
  readNotification,
  togglePetOwnerFavorite,
  updatePetOwnerPet,
  updatePetOwnerProfile,
  getCareReminders,
  getPublicCampaigns,
  createCareReminder,
  completeCareReminder,
  snoozeCareReminder,
  type ActivityItem,
  type DiscoveryProduct,
  type FamilyAccess,
  type MedicalRecord,
  type NotificationItem,
  type GlobalSearchResult,
  type PetOwnerBootstrap,
  type CareReminder,
  type PublicCampaign,
} from "../lib/platform-api";
import {
  formatRupiah,
  type AppView,
  type Pet,
  type Product,
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
  { id: "favorites", label: "Favorit Saya", icon: "heart" },
  { id: "community", label: "Komunitas", icon: "users" },
  { id: "academy", label: "Pet Academy", icon: "sparkle" },
  { id: "events", label: "Pet Event", icon: "calendar" },
  { id: "petspot", label: "PetSpot", icon: "map" },
  { id: "pethub", label: "PetHub", icon: "video" },
  { id: "consult", label: "Konsultasi Dokter", icon: "heart" },
  { id: "adoption", label: "Adopsi", icon: "paw" },
  { id: "documents", label: "Pet Documents", icon: "download" },
  { id: "pawdating", label: "PAW Dating", icon: "heart" },
  { id: "profile", label: "Akun", icon: "user" },
];

const titles: Record<AppView, { title: string; subtitle: string }> = {
  home: { title: "Selamat datang di Slivadoc", subtitle: "Semua kebutuhan pet tersinkron dalam satu tempat." },
  pets: { title: "Hewan Saya", subtitle: "Satu tempat untuk semua profil dan kebutuhan mereka." },
  discover: { title: "Jelajahi Layanan", subtitle: "Temukan perawatan terbaik di sekitar kamu." },
  bookings: { title: "Aktivitas", subtitle: "Pantau booking, konsultasi, dan pesanan Slivadoc." },
  health: { title: "Pusat Kesehatan", subtitle: "Riwayat lengkap dan jadwal perawatan pet pilihanmu." },
  shop: { title: "Sliva Pet Shop", subtitle: "Kebutuhan pilihan yang dikurasi dokter hewan." },
  community: { title: "Komunitas", subtitle: "Berbagi, belajar, dan membantu sesama pet parent." },
  academy: { title: "Pet Academy", subtitle: "Program training terverifikasi untuk pet dan pet parent." },
  events: { title: "Pet Event", subtitle: "Festival, workshop, meet-up, dan aktivitas pet pilihan." },
  petspot: { title: "PetSpot", subtitle: "Temukan cafe, mall, taman, dan playground yang pet friendly." },
  pethub: { title: "PetHub", subtitle: "Live streaming, video, channel, dan pet thread dalam satu hub." },
  consult: { title: "Konsultasi Dokter Hewan", subtitle: "Chat, voice call, atau video call dengan dokter terverifikasi." },
  adoption: { title: "Adopsi Bertanggung Jawab", subtitle: "Temukan teman baru dengan screening dan pendampingan Slivadoc." },
  documents: { title: "Pet Documents", subtitle: "Akte pet dan dokumen perjalanan pesawat atau kapal dalam satu alur." },
  pawdating: { title: "PAW Dating", subtitle: "Temukan pasangan sehat dengan screening, silsilah, dan persetujuan yang aman." },
  favorites: { title: "Favorit Saya", subtitle: "Semua layanan dan tempat yang kamu simpan." },
  notifications: { title: "Notifikasi", subtitle: "Update kesehatan, booking, pesanan, komunitas, dan keamanan." },
  profile: { title: "Akun & Keluarga", subtitle: "Kelola profil, pembayaran, keamanan, dan benefit." },
};

const featureSearchItems: GlobalSearchResult[] = navItems.map((item) => ({
  category: "feature",
  id: item.id,
  title: item.label,
  subtitle: titles[item.id].subtitle,
  route: item.id,
}));

const protectedViews:AppView[]=["pets","bookings","health","consult","documents","pawdating","favorites","notifications","profile"];

function apiPetToView(pet:PetOwnerBootstrap["pets"][number]):Pet {const months=Number(pet.age_months||0);const years=Math.floor(months/12);const remaining=months%12;return {id:pet.id,name:pet.name,type:(pet.species?.toLowerCase()==="cat"?"Cat":pet.species?.toLowerCase()==="rabbit"?"Rabbit":pet.species?.toLowerCase()==="bird"?"Bird":pet.species?.toLowerCase()==="dog"?"Dog":"Other"),breed:pet.breed,age:[years?`${years} tahun`:"",remaining?`${remaining} bulan`:""].filter(Boolean).join(" ")||"Belum diisi",weight:`${pet.weight_kg||0} kg`,gender:pet.sex==="female"?"Betina":"Jantan",color:pet.color||"#8aa5b7",avatar:pet.species?.toLowerCase()==="cat"?"🐈":pet.species?.toLowerCase()==="rabbit"?"🐇":"🐕",photoUrl:pet.photo_url,birthDate:pet.birth_date,healthScore:Number(pet.health_score||0),nextCare:pet.last_medical_record_at?`Update medis ${new Date(pet.last_medical_record_at).toLocaleDateString("id-ID")}`:"Belum ada jadwal",microchip:pet.microchip_number||"Belum terdaftar",notes:pet.medical_notes,allergies:pet.allergies};}

export default function PetOwnerApp() {
  const [activeView, setActiveView] = useState<AppView>("home");
  const [petProfiles, setPetProfiles] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [account, setAccount] = useState<PetOwnerBootstrap["user"]|null>(null);
  const [authenticated,setAuthenticated]=useState(false);
  const [bootstrapLoading,setBootstrapLoading]=useState(true);
  const [notifications,setNotifications]=useState<NotificationItem[]>([]);
  const [activities,setActivities]=useState<ActivityItem[]>([]);
  const [points,setPoints]=useState(0);
  const [remoteProducts,setRemoteProducts]=useState<DiscoveryProduct[]>([]);
  const [remoteServices,setRemoteServices]=useState<Service[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationResult | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  const selectedPet = petProfiles.find((pet) => pet.id === selectedPetId) ?? petProfiles[0] ?? {id:"",name:"pet kamu",type:"Other",breed:"Profil belum ditambahkan",age:"—",weight:"—",gender:"—",color:"#8aa5b7",avatar:"🐾",healthScore:0,nextCare:"Login untuk melihat data",microchip:"Belum terdaftar"};
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const serviceCatalog=remoteServices;
  const productCatalog:Product[]=remoteProducts.map((item)=>({id:item.id,name:item.name,brand:item.category,price:item.price,rating:0,sold:`Stok ${item.stock}`,emoji:item.category.toLowerCase().includes("food")?"🥣":"🛍️",category:item.category,badge:item.available?undefined:"Stok habis"}));

  useEffect(() => {
    const savedLocation = window.localStorage.getItem("slivadoc.location");
    const savedCart = window.localStorage.getItem("slivadoc.cart");
    try {
      queueMicrotask(() => {
        if (savedLocation) setCurrentLocation(JSON.parse(savedLocation));
        if (savedCart) setCart(JSON.parse(savedCart));
        const requested=new URLSearchParams(window.location.search).get("view") as AppView|null;
        const savedView=window.localStorage.getItem("slivadoc.active_view") as AppView|null;
        const view=requested&&titles[requested]?requested:savedView&&titles[savedView]?savedView:"home";
        setActiveView(view);
      });
    } catch { window.localStorage.removeItem("slivadoc.location"); }
  }, []);

  useEffect(() => { window.localStorage.setItem("slivadoc.cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { const listener = (event: Event) => { setToast(`Detail ${(event as CustomEvent<string>).detail} dibuka`); window.setTimeout(() => setToast(""), 2600); }; window.addEventListener("slivadoc:notice", listener); return () => window.removeEventListener("slivadoc:notice", listener); }, []);
  useEffect(() => { const listener = () => setLoginOpen(true); window.addEventListener("slivadoc:login-required", listener); return () => window.removeEventListener("slivadoc:login-required", listener); }, []);
  useEffect(() => { const listener = (event:Event) => {const view=(event as CustomEvent<AppView>).detail;if(!view)return;if(protectedViews.includes(view)&&!authenticated)setLoginOpen(true);else setActiveView(view)};window.addEventListener("slivadoc:navigate",listener);return()=>window.removeEventListener("slivadoc:navigate",listener)}, [authenticated]);

  const notify: Notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  async function loadBootstrap(){setBootstrapLoading(true);const loggedIn=isPetOwnerAuthenticated();setAuthenticated(loggedIn);if(!loggedIn){setAccount(null);setPetProfiles([]);setNotifications([]);setActivities([]);setFavoriteIds([]);setPoints(0);setBootstrapLoading(false);return}try{clearPlatformCache();const data=await getPetOwnerBootstrap();const mapped=data.pets.map(apiPetToView);setAccount(data.user);setPetProfiles(mapped);setSelectedPetId(current=>mapped.some(item=>item.id===current)?current:mapped[0]?.id??"");setNotifications(data.notifications);setActivities(data.activities);setFavoriteIds(data.favorites.map(item=>item.entity_id));setPoints(data.points.balance);setAuthenticated(true)}catch(error){localStorage.removeItem("slivadoc.access_token");localStorage.removeItem("slivadoc.refresh_token");setAuthenticated(false);notify(error instanceof Error?error.message:"Session pet owner berakhir")}finally{setBootstrapLoading(false)}}
  useEffect(()=>{queueMicrotask(()=>{void loadBootstrap()})},[]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{void Promise.all([getDiscoveryServices(currentLocation?{latitude:currentLocation.latitude,longitude:currentLocation.longitude}:undefined),getDiscoveryProducts()]).then(([serviceResponse,productResponse])=>{setRemoteServices(serviceResponse.data.map((item,index)=>{const distance=finiteNumber(item.distance_km);return {id:item.id,branchId:item.branch_id,priceValue:item.price,name:item.name,type:item.category.toLowerCase().includes("groom")?"Grooming":item.category.toLowerCase().includes("hotel")?"Pet Hotel":item.category.toLowerCase().includes("home")?"Home Care":"Clinic",distance:distance!==null?`${distance.toFixed(1)} km`:item.city,rating:finiteNumber(item.rating)??0,reviews:finiteNumber(item.review_count)??0,price:`Mulai ${formatRupiah(item.price)}`,status:"Tersedia untuk booking",address:`${item.branch_name} · ${item.address}`,emoji:item.category.toLowerCase().includes("groom")?"🛁":"🏥",accent:["mint","blue","violet","peach"][index%4],tags:[item.business_name,`${item.duration_minutes} menit`,item.city]}}));setRemoteProducts(productResponse.data)}).catch(()=>{setRemoteServices([]);setRemoteProducts([])})},[currentLocation]);

  const navigate=(view:AppView)=>{if(protectedViews.includes(view)&&!authenticated){setLoginOpen(true);return}setActiveView(view);window.localStorage.setItem("slivadoc.active_view",view);const url=new URL(window.location.href);if(view==="home")url.searchParams.delete("view");else url.searchParams.set("view",view);window.history.pushState({view},"",`${url.pathname}${url.search}${url.hash}`)};

  const openBooking = (service?: Service) => {
    if(!authenticated){setLoginOpen(true);return}
    if(!service){notify("Pilih layanan dari halaman Jelajahi terlebih dahulu");setActiveView("discover");return}
    setSelectedService(service);
    setBookingSuccess(false);
    setBookingOpen(true);
  };

  const toggleFavorite = async (entityType:string,id: string) => {
    if(!authenticated){setLoginOpen(true);return}
    try{const result=await togglePetOwnerFavorite(entityType,id);setFavoriteIds((current)=>result.favorite?[...new Set([...current,id])]:current.filter(item=>item!==id));notify(result.favorite?"Ditambahkan ke favorit":"Dihapus dari favorit")}catch(error){notify(error instanceof Error?error.message:"Favorit belum dapat diperbarui")}
  };

  const addToCart = (id: string) => {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    notify("Produk ditambahkan ke keranjang");
  };

  if(bootstrapLoading)return <div className="petowner-loading"><Logo/><div className="petowner-loading-paw">🐾</div><h1>Menyiapkan rumah digital pet-mu</h1><p>Menyinkronkan profil, kesehatan, aktivitas, dan komunitas.</p><span><i/></span></div>;

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} setActiveView={navigate} notify={notify} account={account} authenticated={authenticated} onLogin={()=>setLoginOpen(true)} />

      <main className="main-shell">
        <Topbar
          selectedPet={selectedPet}
          petProfiles={petProfiles}
          selectedPetId={selectedPetId}
          setSelectedPetId={setSelectedPetId}
          locationLabel={currentLocation?.label.split(",").slice(0, 2).join(", ") ?? "Pilih lokasi spesifik"}
          onOpenLocation={() => setLocationOpen(true)}
          cartCount={cartCount}
          onOpenNotifications={() => setNotificationOpen(true)}
          onOpenCart={() => setCartOpen(true)}
          notify={notify}
          account={account}
          points={points}
          authenticated={authenticated}
          navigate={navigate}
          onLogin={()=>setLoginOpen(true)}
        />

        <div className="page-content">
          <PageHeading activeView={activeView} selectedPet={selectedPet} account={account} />
          {activeView === "home" && (
            <HomeView
              selectedPet={selectedPet}
              setActiveView={navigate}
              openBooking={openBooking}
              setChatOpen={setChatOpen}
              notify={notify}
              services={serviceCatalog}
              activities={activities}
            />
          )}
          {activeView === "pets" && (
            <PetsView
              petProfiles={petProfiles}
              selectedPetId={selectedPetId}
              setSelectedPetId={setSelectedPetId}
              setAddPetOpen={setAddPetOpen}
              setActiveView={navigate}
              notify={notify}
              onChanged={loadBootstrap}
            />
          )}
          {activeView === "discover" && (
            <DiscoverView
              favorites={favoriteIds}
              toggleFavorite={(id)=>void toggleFavorite("service",id)}
              openBooking={openBooking}
              notify={notify}
              serviceCatalog={serviceCatalog}
            />
          )}
          {activeView === "bookings" && (
            <BookingsView openBooking={openBooking} setActiveView={navigate} notify={notify} activities={activities} points={points} />
          )}
          {activeView === "health" && <HealthView pet={selectedPet} notify={notify} />}
          {activeView === "shop" && (
            <ShopView addToCart={addToCart} setCartOpen={setCartOpen} notify={notify} productCatalog={productCatalog} petName={selectedPet.name} favorites={favoriteIds} toggleFavorite={(id)=>void toggleFavorite("product",id)} />
          )}
          {activeView === "community" && <CommunityExperience notify={notify} onOpenLocation={() => setLocationOpen(true)} />}
          {(["academy", "events", "petspot", "pethub"] as AppView[]).includes(activeView) && (
            <PlatformDiscovery mode={activeView as "academy" | "events" | "petspot" | "pethub"} petName={selectedPet.name} ownerName={account?.full_name} ownerEmail={account?.email} notify={notify} navigate={navigate} />
          )}
          {(["consult", "adoption", "documents"] as AppView[]).includes(activeView) && (
            <CareMarketplace mode={activeView as "consult" | "adoption" | "documents"} pet={selectedPet} notify={notify} />
          )}
          {activeView === "pawdating" && <PawDatingExperience pet={selectedPet} notify={notify} />}
          {activeView === "favorites" && <FavoritesView services={serviceCatalog.filter(item=>favoriteIds.includes(item.id))} products={productCatalog.filter(item=>favoriteIds.includes(item.id))} openBooking={openBooking} addToCart={addToCart} remove={(type,id)=>toggleFavorite(type,id)}/>} 
          {activeView === "notifications" && <NotificationCenter items={notifications} setItems={setNotifications} notify={notify}/>} 
          {activeView === "profile" && account && <ProfileView notify={notify} account={account} petCount={petProfiles.length} points={points} onChanged={loadBootstrap} onLogout={()=>{localStorage.removeItem("slivadoc.access_token");localStorage.removeItem("slivadoc.refresh_token");void loadBootstrap();navigate("home")}} />}
        </div>
      </main>

      <MobileNav activeView={activeView} setActiveView={navigate} cartCount={cartCount} authenticated={authenticated} />

      <button className="floating-chat" type="button" onClick={() => setChatOpen(true)} aria-label="Buka chat SlivaCare">
        <Icon name="chat" size={22} />
        <span>SlivaCare</span>
        <i />
      </button>

      {notificationOpen && <NotificationDrawer onClose={() => setNotificationOpen(false)} notify={notify} items={notifications} setItems={setNotifications} seeAll={()=>{setNotificationOpen(false);navigate("notifications")}} />}
      {chatOpen && <SlivaCareDrawer pet={selectedPet} owner={account??undefined} onClose={() => setChatOpen(false)} notify={notify} />}
      {cartOpen && <CartDrawer cart={cart} setCart={setCart} onClose={() => setCartOpen(false)} notify={notify} productCatalog={productCatalog} />}
      {addPetOpen && <AddPetExperience onClose={() => setAddPetOpen(false)} notify={notify} onSaved={(pet) => { setPetProfiles((current) => [...current, pet]); setSelectedPetId(pet.id); }} />}
      {locationOpen && <LocationModal current={currentLocation} onClose={() => setLocationOpen(false)} onSelect={(location) => { setCurrentLocation(location); window.localStorage.setItem("slivadoc.location", JSON.stringify(location)); setLocationOpen(false); notify("Lokasi layanan berhasil diperbarui"); }} />}
      {bookingOpen && selectedService && (
        <BookingModal
          service={selectedService}
          pet={selectedPet}
          success={bookingSuccess}
          setSuccess={setBookingSuccess}
          onClose={() => setBookingOpen(false)}
          onBooked={async()=>{await loadBootstrap();setBookingSuccess(true)}}
        />
      )}
      {loginOpen && <PetOwnerLogin close={() => setLoginOpen(false)} notify={notify} onSuccess={loadBootstrap} />}

      {toast && (
        <div className="toast" role="status">
          <span className="toast-check"><Icon name="check" size={15} /></span>
          {toast}
        </div>
      )}
    </div>
  );
}

function PetOwnerLogin({close,notify,onSuccess}:{close:()=>void;notify:Notify;onSuccess:()=>Promise<void>}){
  const[mode,setMode]=useState<"login"|"register">("login");const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");const[visible,setVisible]=useState(false);const[password,setPassword]=useState("");const passwordValid=/(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/.test(password);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage("");const values=Object.fromEntries(new FormData(event.currentTarget));try{const endpoint=mode==="login"?"/api/v1/auth/login":"/api/v1/auth/petowner/register";const response=await fetch(`${PLATFORM_API_URL}${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});const data=await response.json();if(!response.ok)throw new Error(data.message||"Login belum dapat diproses");if(mode==="register"){setMessage(`OTP sudah dikirim ke ${values.email}. Verifikasi melalui halaman akun.`);return}localStorage.setItem("slivadoc.access_token",data.access_token);localStorage.setItem("slivadoc.refresh_token",data.refresh_token);clearPlatformCache();await onSuccess();notify("Login berhasil. Selamat datang di Slivadoc.");close()}catch(error){setMessage(error instanceof Error?error.message:"Login gagal")}finally{setBusy(false)}}
  return <div className="modal-overlay" onMouseDown={close}><section className="modal petowner-login" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close} aria-label="Tutup"><Icon name="close"/></button><div className="login-brand"><Logo/><span>Pet Owner</span></div><span className="world-kicker">AKUN PET FAMILY</span><h2>{mode==="login"?"Senang melihatmu kembali":"Mulai perjalanan pet parent"}</h2><p>Profil pet, rekam medis, booking, komunitas, dan benefit tersinkron aman dalam satu akun.</p><form className="world-form login-form" onSubmit={submit}>{mode==="register"&&<><label><span>Nama lengkap</span><input name="full_name" placeholder="Nama sesuai identitas" required/></label><label><span>WhatsApp</span><input name="phone" inputMode="tel" placeholder="08xxxxxxxxxx" required/></label></>}<label><span>Email</span><input name="email" type="email" autoComplete="email" placeholder="petparent@email.com" required/></label><label><span>Password</span><span className="password-input"><input name="password" value={password} onChange={event=>setPassword(event.target.value)} type={visible?"text":"password"} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="Minimal 8 karakter" minLength={8} pattern="(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}" title="Wajib berisi huruf, angka, dan simbol" required/><button type="button" onClick={()=>setVisible(value=>!value)} aria-label={visible?"Sembunyikan password":"Tampilkan password"}>{visible?"◉":"◎"}</button></span><small>Gunakan kombinasi huruf, angka, dan simbol.</small></label>{message&&<div className="form-message">{message}</div>}<button className="primary-button full" disabled={busy||!passwordValid}>{busy?<><span className="button-spinner"/> Memproses…</>:mode==="login"?"Masuk ke Slivadoc":"Daftar & kirim OTP"}</button></form><button className="text-button login-switch" onClick={()=>{setMode(mode==="login"?"register":"login");setMessage("");setPassword("")}}>{mode==="login"?"Belum punya akun? Daftar gratis":"Sudah punya akun? Login"}</button></section></div>
}

function Logo() {
  return (
    <div className="brand" aria-label="Slivadoc">
      <span className="brand-mark"><Icon name="paw" size={22} /></span>
      <span className="brand-copy"><b>sliva</b><strong>doc</strong></span>
    </div>
  );
}

function Sidebar({ activeView, setActiveView, notify, account, authenticated, onLogin }: { activeView: AppView; setActiveView: (view: AppView) => void; notify: Notify;account:PetOwnerBootstrap["user"]|null;authenticated:boolean;onLogin:()=>void }) {
  return (
    <aside className="sidebar">
      <Logo />
      <p className="nav-eyebrow">MENU UTAMA</p>
      <nav className="side-nav" aria-label="Navigasi utama">
        {navItems.filter(item=>authenticated||item.id!=="profile").map((item) => (
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
      {authenticated&&account?<button className="side-profile" type="button" onClick={()=>setActiveView("profile")}><div className="avatar avatar-blue">{account.full_name.split(" ").map(value=>value[0]).slice(0,2).join("")}</div><span><b>{account.full_name}</b><small>Pet Parent • Akun aktif</small></span><Icon name="chevron"/></button>:<button className="side-login-button" type="button" onClick={onLogin}><Icon name="user"/> Masuk ke akun</button>}
    </aside>
  );
}

function Topbar({
  selectedPet,
  petProfiles,
  selectedPetId,
  setSelectedPetId,
  locationLabel,
  onOpenLocation,
  cartCount,
  onOpenNotifications,
  onOpenCart,
  notify,
  account,
  points,
  authenticated,
  navigate,
  onLogin,
}: {
  selectedPet: Pet;
  petProfiles: Pet[];
  selectedPetId: string;
  setSelectedPetId: (id: string) => void;
  locationLabel: string;
  onOpenLocation: () => void;
  cartCount: number;
  onOpenNotifications: () => void;
  onOpenCart: () => void;
  notify: Notify;
  account:PetOwnerBootstrap["user"]|null;
  points:number;
  authenticated:boolean;
  navigate:(view:AppView)=>void;
  onLogin:()=>void;
}) {
  const[searchOpen,setSearchOpen]=useState(false);const[query,setQuery]=useState("");const[category,setCategory]=useState("");const[results,setResults]=useState<GlobalSearchResult[]>([]);const[busy,setBusy]=useState(false);
  useEffect(()=>{if(query.trim().length<2)return;const timer=window.setTimeout(()=>{const normalized=query.trim().toLowerCase();const featureResults=(category===""||category==="feature")?featureSearchItems.filter(item=>`${item.title} ${item.subtitle}`.toLowerCase().includes(normalized)):[];setBusy(true);void globalSearch(query.trim(),category==="feature"?"":category).then(response=>{const combined=[...featureResults,...response.data];setResults(combined.filter((item,index)=>combined.findIndex(value=>value.category===item.category&&value.id===item.id)===index))}).catch(()=>setResults(featureResults)).finally(()=>setBusy(false))},280);return()=>window.clearTimeout(timer)},[query,category]);
  function choose(result:GlobalSearchResult){const route=result.route as AppView;if(titles[route])navigate(route);else notify(`${result.title} · ${result.subtitle}`);setSearchOpen(false);setQuery("")}
  return (
    <header className="topbar">
      <div className="mobile-brand"><Logo /></div>
      <button className="location-picker" type="button" onClick={onOpenLocation}>
        <span><Icon name="map" size={18} /></span>
        <span><small>Lokasi kamu</small><b>{locationLabel}</b></span>
        <Icon name="chevron" size={15} />
      </button>
      <label className={`global-search ${searchOpen?"open":""}`}>
        <Icon name="search" size={18} />
        <input value={query} placeholder="Cari dokter, layanan, produk..." onFocus={()=>setSearchOpen(true)} onChange={event=>{setQuery(event.target.value);setSearchOpen(true);if(event.target.value.trim().length<2)setResults([])}} />
        <kbd>⌘ K</kbd>
        {searchOpen&&<div className="owner-search-results"><header><b>Cari di seluruh Slivadoc</b><button type="button" onClick={()=>setSearchOpen(false)}>Tutup</button></header><div className="owner-search-tabs">{[["","Semua"],["feature","Fitur"],["service","Layanan"],["product","Produk"],["petspot","PetSpot"],["event","Event"],["academy","Academy"],["veterinarian","Dokter"]].map(([value,label])=><button type="button" className={category===value?"active":""} key={value||"all"} onClick={()=>setCategory(value)}>{label}</button>)}</div>{busy?<p>Memuat hasil…</p>:query.trim().length<2?<p>Ketik minimal 2 karakter untuk mulai mencari.</p>:results.length?results.map(item=><button type="button" key={`${item.category}-${item.id}`} onClick={()=>choose(item)}><span>{item.category.slice(0,1).toUpperCase()}</span><div><b>{item.title}</b><small>{item.category} · {item.subtitle}</small></div><Icon name="chevron"/></button>):<p>Tidak ada hasil yang cocok.</p>}</div>}
      </label>
      <div className="top-actions">
        <button className="point-pill" type="button" onClick={() => authenticated?navigate("bookings"):onLogin()}>
          <span>✦</span><b>{points.toLocaleString("id-ID")}</b><small>pts</small>
        </button>
        {authenticated&&petProfiles.length>0&&<label className="pet-switcher compact-select">
          <span className="pet-mini">{selectedPet.avatar}</span>
          <select aria-label="Pilih hewan" value={selectedPetId} onChange={(event) => setSelectedPetId(event.target.value)}>
            {petProfiles.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
          </select>
        </label>}
        <button className="icon-button" type="button" onClick={onOpenCart} aria-label="Keranjang">
          <Icon name="cart" />
          {cartCount > 0 && <span className="counter">{cartCount}</span>}
        </button>
        <button className="icon-button" type="button" onClick={authenticated?onOpenNotifications:onLogin} aria-label="Notifikasi">
          <Icon name="bell" />
          <span className="notif-dot" />
        </button>{!authenticated&&<button className="top-login" type="button" onClick={onLogin}>Masuk</button>}{authenticated&&account&&<button className="top-account" type="button" onClick={()=>navigate("profile")}>{account.full_name.split(" ").map(value=>value[0]).slice(0,2).join("")}</button>}
      </div>
    </header>
  );
}

function PageHeading({ activeView, selectedPet,account }: { activeView: AppView; selectedPet: Pet;account:PetOwnerBootstrap["user"]|null }) {
  const item = titles[activeView];
  const date=new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date());
  return (
    <div className="page-heading">
      <div>
        <div className="heading-kicker"><span className="live-dot" />{date}</div>
        <h1>{activeView==="home"&&account?`Selamat datang, ${account.full_name.split(" ")[0]}!`:item.title}</h1>
        <p>{activeView === "health" ? `Riwayat lengkap dan jadwal perawatan ${selectedPet.name}.` : item.subtitle}</p>
      </div>
      {activeView !== "home" && (
        <button className="secondary-button heading-action" type="button" onClick={() => downloadViewSummary(activeView)}><Icon name="download" size={17} /> Unduh ringkasan</button>
      )}
    </div>
  );
}

function HomeView({ selectedPet, setActiveView, openBooking, setChatOpen, notify,services,activities }: { selectedPet: Pet; setActiveView: (view: AppView) => void; openBooking: (service?: Service) => void; setChatOpen: (value: boolean) => void; notify: Notify;services:Service[];activities:ActivityItem[] }) {
  const[campaign,setCampaign]=useState<PublicCampaign|null>(null);
  useEffect(()=>{void getPublicCampaigns().then(response=>setCampaign(response.data[0]??null)).catch(()=>setCampaign(null))},[]);
  const quickActions: { label: string; note: string; icon: string; color: string; action: () => void }[] = [
    { label: "Buat Booking", note: "Klinik & grooming", icon: "📅", color: "blue", action: () => openBooking() },
    { label: "Tanya Dokter", note: "Chat atau video", icon: "👩🏻‍⚕️", color: "mint", action: () => setChatOpen(true) },
    { label: "Home Service", note: "Dokter ke rumah", icon: "🏠", color: "peach", action: () => {const service=services.find(item=>item.type==="Home Care");if(service)openBooking(service);else setActiveView("discover")} },
    { label: "Darurat 24/7", note: "Bantuan cepat", icon: "🚑", color: "red", action: () => notify("Menghubungkan ke hotline darurat 24/7") },
    { label: "Beli Produk", note: "Same day delivery", icon: "🛍️", color: "violet", action: () => setActiveView("shop") },
    { label: "Pet Hotel", note: "Titip dengan aman", icon: "🏡", color: "yellow", action: () => {const service=services.find(item=>item.type==="Pet Hotel");if(service)openBooking(service);else setActiveView("discover")} },
    { label: "Pet Academy", note: "Training & kelas", icon: "🎓", color: "mint", action: () => setActiveView("academy") },
    { label: "Pet Event", note: "Event di kotamu", icon: "🎟️", color: "peach", action: () => setActiveView("events") },
    { label: "PetSpot", note: "Tempat pet friendly", icon: "📍", color: "blue", action: () => setActiveView("petspot") },
    { label: "PetHub Live", note: "Live & pet thread", icon: "▶️", color: "violet", action: () => setActiveView("pethub") },
  ];

  return (
    <div className="home-layout">
      <section className="hero-card">
        <Image
          className="hero-image"
          src="/slivadoc-pet-hero.png"
          alt="Pet owner bersama anjing golden retriever dan kucing abu-abu"
          fill
          priority
          unoptimized
          sizes="(max-width: 900px) 100vw, 70vw"
        />
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

      {campaign&&<section className="public-campaign-banner" style={{backgroundImage:`linear-gradient(90deg,rgba(5,32,52,.94),rgba(5,32,52,.35)),url(${campaign.banner_url})`}}><div><span>REKOMENDASI SLIVADOC</span><h2>{campaign.name}</h2><p>{campaign.objective}</p><button type="button" onClick={()=>setActiveView(({events:"events",pethub:"pethub",petspot:"petspot",community:"community",home:"discover"} as Partial<Record<string,AppView>>)[campaign.placement]??"discover")}>Lihat selengkapnya <Icon name="chevron" size={15}/></button></div></section>}

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
            <div className="pet-health-copy"><b>{selectedPet.name}</b><span>{selectedPet.breed} • {selectedPet.age}</span><small>{selectedPet.nextCare}</small></div>
            <div className="health-score" style={{ "--score": `${selectedPet.healthScore * 3.6}deg` } as React.CSSProperties}>
              <div><b>{selectedPet.healthScore}</b><small>/100</small></div>
            </div>
          </div>
          <div className="metric-row">
            <div><span>⚖️</span><small>Berat badan</small><b>{selectedPet.weight}</b><em className="good">Profil pet</em></div>
            <div><span>🪪</span><small>Microchip</small><b>{selectedPet.microchip}</b><em>Identitas pet</em></div>
            <div><span>🩺</span><small>Catatan medis</small><b>{selectedPet.nextCare}</b><em className="good">Tersinkron</em></div>
          </div>
          <div className="health-alert"><span>💡</span><p><b>Data kesehatan {selectedPet.name}</b><small>Nilai, profil, dan riwayat di halaman ini berasal dari akun pet yang sedang dipilih.</small></p><button type="button" onClick={() => setActiveView("health")}>Buka kesehatan</button></div>
        </section>

        <section className="panel care-panel">
          <div className="panel-heading">
            <div><span className="section-eyebrow">CARE PLAN</span><h3>Perawatan terdekat</h3></div>
            <button className="round-button" type="button" onClick={() => notify("Pengingat baru ditambahkan") }><Icon name="plus" size={18} /></button>
          </div>
          <div className="timeline-list">
            {activities.slice(0,4).map((care, index) => (
              <div className="timeline-item" key={care.id}>
                <div className={`timeline-date ${index === 0 ? "today" : ""}`}><b>{new Date(care.starts_at||care.occurred_at).toLocaleDateString("id-ID",{day:"2-digit"})}</b><small>{new Date(care.starts_at||care.occurred_at).toLocaleDateString("id-ID",{month:"short"})}</small></div>
                <div className="timeline-icon blue">{care.category==="booking"?"📅":care.category==="consultation"?"💬":care.category==="order"?"📦":"🐾"}</div>
                <div className="timeline-copy"><b>{care.title}</b><span>{care.description}</span><small><Icon name="clock" size={13} /> {new Date(care.starts_at||care.occurred_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</small></div>
                <button type="button" className="more-button" onClick={() => setActiveView("bookings")}><Icon name="chevron" /></button>
              </div>
            ))}
            {activities.length===0&&<div className="empty-state compact">Belum ada perawatan atau transaksi pada akun ini.</div>}
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
          {services.length===0&&<div className="empty-state compact">Belum ada layanan yang tersedia di area ini.</div>}
        </div>
      </section>
    </div>
  );
}

function PetsView({ petProfiles, selectedPetId, setSelectedPetId, setAddPetOpen, setActiveView, notify,onChanged }: { petProfiles: Pet[]; selectedPetId: string; setSelectedPetId: (id: string) => void; setAddPetOpen: (value: boolean) => void; setActiveView: (view: AppView) => void; notify: Notify;onChanged:()=>Promise<void> }) {
  const[modal,setModal]=useState<"id"|"edit"|"notes"|"family"|"lost"|null>(null);
  const pet = petProfiles.find((item) => item.id === selectedPetId) ?? petProfiles[0];
  if(!pet)return <div className="empty-state"><span>🐾</span><h3>Belum ada pet di akunmu</h3><p>Tambahkan profil pertama untuk mulai menyimpan identitas dan kesehatan.</p><button className="primary-button" onClick={()=>setAddPetOpen(true)}>Tambah pet</button></div>;
  return (
    <div className="two-column-page">
      <section>
        <div className="pet-card-grid">
          {petProfiles.map((item) => (
            <button className={`pet-profile-card ${selectedPetId === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => setSelectedPetId(item.id)}>
              <span className="pet-profile-avatar" style={{ background: `${item.color}24` }}>{item.photoUrl ? <img src={item.photoUrl} alt={item.name} /> : item.avatar}<i><Icon name="check" size={11} /></i></span>
              <span className="pet-profile-copy"><b>{item.name}</b><small>{item.breed}</small><em>{item.gender} • {item.age}</em></span>
              <span className="pet-score-small"><b>{item.healthScore}</b><small>Health</small></span>
            </button>
          ))}
          <button className="add-pet-card" type="button" onClick={() => setAddPetOpen(true)}><span><Icon name="plus" size={25} /></span><b>Tambah hewan</b><small>Buat profil untuk anggota keluarga baru</small></button>
        </div>

        <section className="panel pet-detail-panel">
          <div className="panel-heading"><div><span className="section-eyebrow">PET IDENTITY</span><h3>Profil {pet.name}</h3></div><button className="secondary-button small" type="button" onClick={() => setModal("edit")}><Icon name="edit" size={15} /> Edit profil</button></div>
          <div className="pet-identity-banner">
            <div className="pet-id-avatar">{pet.avatar}</div>
            <div><span className="verified-badge"><Icon name="shield" size={13} /> Identitas terverifikasi</span><h2>{pet.name}</h2><p>{pet.breed} • {pet.gender}</p><small>Microchip: {pet.microchip}</small></div>
            <button type="button" onClick={() => setModal("id")}><span>▦</span><small>Tampilkan Pet ID</small></button>
          </div>
          <div className="info-grid">
            <Info label="Tanggal lahir" value="21 Juni 2023" />
            <Info label="Usia" value={pet.age} />
            <Info label="Berat terakhir" value={pet.weight} />
            <Info label="Warna" value={pet.type === "Dog" ? "Golden" : "Blue gray"} />
            <Info label="Sterilisasi" value="Sudah" />
            <Info label="Golongan darah" value={pet.type === "Dog" ? "DEA 1.1+" : "A"} />
          </div>
          <div className="pet-notes"><span>📝</span><div><b>Catatan khusus</b><p>{pet.notes||"Belum ada catatan khusus."}{pet.allergies?` · Alergi: ${pet.allergies}`:""}</p></div><button type="button" onClick={() => setModal("notes")}><Icon name="edit" size={16} /></button></div>
        </section>
      </section>

      <aside className="right-stack">
        <section className="panel compact-panel"><div className="panel-heading"><h3>Ringkasan perawatan</h3><span className="score-chip">{pet.healthScore}/100</span></div><Progress label="Profil kesehatan" value={100} /><Progress label="Vaksin wajib" value={80} /><Progress label="Preventive care" value={75} /><button className="full-soft-button" type="button" onClick={() => setActiveView("health")}>Buka pusat kesehatan <Icon name="arrow" size={15} /></button></section>
        <section className="panel compact-panel"><div className="panel-heading"><h3>Akses keluarga</h3><button className="round-button" type="button" onClick={() => setModal("family")}><Icon name="plus" size={16} /></button></div><p className="muted-copy">Undang co-parent, caregiver, dokter, atau viewer dengan izin terperinci.</p><button className="full-soft-button" type="button" onClick={()=>setModal("family")}>Kelola akses keluarga</button></section>
        <section className="lost-mode-card"><span>📍</span><div><b>Lost Pet Mode</b><p>Aktifkan peringatan dan bagikan profil {pet.name} ke komunitas sekitar.</p><button type="button" onClick={() => setModal("lost")}>Kelola Lost Pet Mode</button></div></section>
      </aside>
      {modal==="id"&&<PetIDModal pet={pet} close={()=>setModal(null)}/>} {modal==="edit"&&<PetEditModal pet={pet} close={()=>setModal(null)} changed={onChanged} notify={notify}/>} {modal==="notes"&&<PetNotesModal pet={pet} close={()=>setModal(null)} changed={onChanged} notify={notify}/>} {modal==="family"&&<FamilyModal pet={pet} close={()=>setModal(null)} notify={notify}/>} {modal==="lost"&&<LostModeModal pet={pet} close={()=>setModal(null)} notify={notify}/>} 
    </div>
  );
}

function PetIDModal({pet,close}:{pet:Pet;close:()=>void}){return <div className="modal-overlay" onMouseDown={close}><section className="modal pet-id-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close"/></button><div className="pet-id-card"><span className="pet-id-logo"><Logo/></span><div className="pet-id-photo">{pet.photoUrl?<img src={pet.photoUrl} alt={pet.name}/>:pet.avatar}</div><span className="verified-badge"><Icon name="shield" size={13}/> Slivadoc Pet ID</span><h2>{pet.name}</h2><p>{pet.breed} · {pet.gender}</p><div className="pet-id-qr" aria-label={`Kode Pet ID ${pet.id}`}><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><code>{pet.id}</code><dl><div><dt>Microchip</dt><dd>{pet.microchip}</dd></div><div><dt>Health score</dt><dd>{pet.healthScore}/100</dd></div></dl><small>Pindai untuk membuka identitas darurat terverifikasi Slivadoc.</small></div></section></div>}

function PetEditModal({pet,close,changed,notify}:{pet:Pet;close:()=>void;changed:()=>Promise<void>;notify:Notify}){const[busy,setBusy]=useState(false);async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const values=Object.fromEntries(new FormData(event.currentTarget));try{await updatePetOwnerPet(pet.id,{name:values.name,breed:values.breed,sex:values.sex,birth_date:values.birth_date,color:values.color,weight_kg:Number(values.weight_kg),microchip_number:values.microchip_number,allergies:pet.allergies||"",medical_notes:pet.notes||"",vaccination_status:"complete",photo_url:pet.photoUrl||""});await changed();notify("Profil pet berhasil diperbarui");close()}catch(error){notify(error instanceof Error?error.message:"Profil belum dapat diperbarui")}finally{setBusy(false)}}return <div className="modal-overlay" onMouseDown={close}><section className="modal form-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close"/></button><span className="section-eyebrow">PET IDENTITY</span><h2>Edit profil {pet.name}</h2><form className="world-form" onSubmit={submit}><label><span>Nama</span><input name="name" defaultValue={pet.name} minLength={2} required/></label><label><span>Ras</span><input name="breed" defaultValue={pet.breed}/></label><div className="form-row"><label><span>Jenis kelamin</span><select name="sex" defaultValue={pet.gender==="Betina"?"female":"male"}><option value="male">Jantan</option><option value="female">Betina</option></select></label><label><span>Tanggal lahir</span><input name="birth_date" type="date" defaultValue={pet.birthDate?.slice(0,10)}/></label></div><div className="form-row"><label><span>Berat (kg)</span><input name="weight_kg" type="number" step="0.1" defaultValue={parseFloat(pet.weight)}/></label><label><span>Warna</span><input name="color" defaultValue={pet.color}/></label></div><label><span>Nomor microchip</span><input name="microchip_number" defaultValue={pet.microchip==="Belum terdaftar"?"":pet.microchip}/></label><button className="primary-button full" disabled={busy}>{busy?"Menyimpan…":"Simpan perubahan"}</button></form></section></div>}

function PetNotesModal({pet,close,changed,notify}:{pet:Pet;close:()=>void;changed:()=>Promise<void>;notify:Notify}){const[busy,setBusy]=useState(false);async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const values=Object.fromEntries(new FormData(event.currentTarget));try{await updatePetOwnerPet(pet.id,{name:pet.name,breed:pet.breed,sex:pet.gender==="Betina"?"female":"male",birth_date:pet.birthDate?.slice(0,10)||"",color:pet.color,weight_kg:parseFloat(pet.weight),microchip_number:pet.microchip==="Belum terdaftar"?"":pet.microchip,allergies:values.allergies,medical_notes:values.medical_notes,vaccination_status:"complete",photo_url:pet.photoUrl||""});await changed();notify("Catatan khusus tersimpan");close()}catch(error){notify(error instanceof Error?error.message:"Catatan belum dapat disimpan")}finally{setBusy(false)}}return <div className="modal-overlay" onMouseDown={close}><section className="modal form-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close"/></button><span className="section-eyebrow">CATATAN KHUSUS</span><h2>Kebutuhan penting {pet.name}</h2><form className="world-form" onSubmit={submit}><label><span>Alergi</span><textarea name="allergies" defaultValue={pet.allergies} placeholder="Contoh: protein ayam"/></label><label><span>Perilaku, preferensi, dan catatan medis</span><textarea name="medical_notes" defaultValue={pet.notes} placeholder="Tuliskan hal yang perlu diketahui dokter, groomer, atau caregiver" rows={5}/></label><button className="primary-button full" disabled={busy}>{busy?"Menyimpan…":"Simpan catatan"}</button></form></section></div>}

function FamilyModal({pet,close,notify}:{pet:Pet;close:()=>void;notify:Notify}){const[items,setItems]=useState<FamilyAccess[]>([]);const[busy,setBusy]=useState(false);const[loading,setLoading]=useState(true);async function reload(){await Promise.resolve();setLoading(true);try{setItems((await getPetFamily(pet.id)).data)}catch(error){notify(error instanceof Error?error.message:"Akses keluarga belum dapat dimuat")}finally{setLoading(false)}}useEffect(()=>{let cancelled=false;void getPetFamily(pet.id).then(response=>{if(!cancelled)setItems(response.data)}).catch(error=>notify(error instanceof Error?error.message:"Akses keluarga belum dapat dimuat")).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[pet.id,notify]);
async function invite(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const values=Object.fromEntries(new FormData(event.currentTarget));try{await invitePetFamily(pet.id,{email:values.email,full_name:values.full_name,role:values.role,permissions:["profile","health","booking"]});event.currentTarget.reset();await reload();notify("Undangan keluarga berhasil dibuat")}catch(error){notify(error instanceof Error?error.message:"Undangan belum dapat dibuat")}finally{setBusy(false)}}async function revoke(id:string){try{await revokePetFamily(id);await reload();notify("Akses berhasil dicabut")}catch(error){notify(error instanceof Error?error.message:"Akses belum dapat dicabut")}}return <div className="modal-overlay" onMouseDown={close}><section className="modal family-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close"/></button><span className="section-eyebrow">AKSES KELUARGA · {pet.name.toUpperCase()}</span><h2>Orang yang dipercaya</h2><div className="family-access-list">{loading?<p>Memuat akses…</p>:items.map(item=><div key={item.id}><span>{item.full_name.split(" ").map(value=>value[0]).slice(0,2).join("")}</span><p><b>{item.full_name}</b><small>{item.email} · {item.role} · {item.status}</small></p>{item.role!=="owner"&&<button onClick={()=>void revoke(item.id)}>Cabut</button>}</div>)}</div><form className="world-form family-invite" onSubmit={invite}><h3>Undang anggota</h3><label><span>Nama lengkap</span><input name="full_name" required/></label><label><span>Email</span><input name="email" type="email" required/></label><label><span>Role akses</span><select name="role"><option value="co_parent">Co-parent</option><option value="caregiver">Caregiver</option><option value="veterinarian">Dokter</option><option value="viewer">Viewer</option></select></label><button className="primary-button full" disabled={busy}>{busy?"Mengirim…":"Kirim undangan"}</button></form></section></div>}

function LostModeModal({pet,close,notify}:{pet:Pet;close:()=>void;notify:Notify}){const[mode,setMode]=useState<Awaited<ReturnType<typeof getLostPetMode>>|null>(null);const[busy,setBusy]=useState(false);useEffect(()=>{void getLostPetMode(pet.id).then(setMode).catch(()=>setMode({active:false}))},[pet.id]);async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const values=Object.fromEntries(new FormData(event.currentTarget));try{const result=await activateLostPetMode(pet.id,{last_seen_at:new Date(String(values.last_seen_at)).toISOString(),last_seen_location:values.last_seen_location,latitude:values.latitude?Number(values.latitude):null,longitude:values.longitude?Number(values.longitude):null,radius_km:Number(values.radius_km),description:values.description,contact_phone:values.contact_phone,reward_amount:Number(values.reward_amount||0)});setMode(result);notify(result.message)}catch(error){notify(error instanceof Error?error.message:"Lost Pet Mode belum dapat diaktifkan")}finally{setBusy(false)}}async function found(){setBusy(true);try{await closeLostPetMode(pet.id,"found");setMode({active:false,status:"found"});notify(`${pet.name} ditandai sudah ditemukan`)}catch(error){notify(error instanceof Error?error.message:"Laporan belum dapat ditutup")}finally{setBusy(false)}}return <div className="modal-overlay" onMouseDown={close}><section className="modal lost-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close"/></button><span className="section-eyebrow">LOST PET EMERGENCY</span><h2>{mode?.active?`Pencarian ${pet.name} sedang aktif`:`Aktifkan Lost Pet Mode`}</h2>{mode?.active?<div className="lost-active"><span>📡</span><p>Komunitas radius {mode.radius_km} km sudah menerima laporan dari {mode.last_seen_location}.</p><code>{mode.public_token}</code><button className="primary-button full" disabled={busy} onClick={()=>void found()}>{busy?"Memproses…":`${pet.name} sudah ditemukan`}</button></div>:<form className="world-form" onSubmit={submit}><label><span>Terakhir terlihat</span><input name="last_seen_at" type="datetime-local" required/></label><label><span>Lokasi terakhir</span><input name="last_seen_location" placeholder="Nama tempat / alamat lengkap" required/></label><div className="form-row"><label><span>Latitude</span><input name="latitude" type="number" step="any"/></label><label><span>Longitude</span><input name="longitude" type="number" step="any"/></label></div><label><span>Radius notifikasi</span><select name="radius_km" defaultValue="10"><option value="3">3 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option></select></label><label><span>Kronologi & ciri khusus</span><textarea name="description" required/></label><label><span>Nomor kontak</span><input name="contact_phone" required/></label><label><span>Imbalan (opsional)</span><input name="reward_amount" type="number" min="0"/></label><button className="primary-button full" disabled={busy}>{busy?"Mengaktifkan jaringan…":"Aktifkan peringatan komunitas"}</button></form>}</section></div>}

function DiscoverView({ favorites, toggleFavorite, openBooking, notify,serviceCatalog }: { favorites: string[]; toggleFavorite: (id: string) => void|Promise<void>; openBooking: (service: Service) => void; notify: Notify;serviceCatalog:Service[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [sort,setSort]=useState<"recommended"|"distance"|"rating"|"price">("recommended");
  const [filterOpen,setFilterOpen]=useState(false);
  const [detail,setDetail]=useState<Service|null>(null);
  const filters = ["Semua", "Clinic", "Grooming", "Pet Shop", "Pet Hotel", "Home Care"];
  const result = useMemo(()=>serviceCatalog.filter((service) => (filter === "Semua" || service.type === filter) && `${service.name} ${service.address} ${service.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
    if(sort==="distance")return (Number.parseFloat(a.distance)||Number.MAX_SAFE_INTEGER)-(Number.parseFloat(b.distance)||Number.MAX_SAFE_INTEGER);
    if(sort==="rating")return b.rating-a.rating||b.reviews-a.reviews;
    if(sort==="price")return (a.priceValue??Number.MAX_SAFE_INTEGER)-(b.priceValue??Number.MAX_SAFE_INTEGER);
    return b.rating-a.rating||b.reviews-a.reviews||(Number.parseFloat(a.distance)||Number.MAX_SAFE_INTEGER)-(Number.parseFloat(b.distance)||Number.MAX_SAFE_INTEGER);
  }),[serviceCatalog,filter,query,sort]);
  const reset=()=>{setQuery("");setFilter("Semua");setSort("recommended")};
  return (
    <div>
      <section className="discover-search-card">
        <div><span className="soft-badge white"><Icon name="map" size={14} /> SEMUA LOKASI</span><h2>Apa yang dibutuhkan hewanmu hari ini?</h2><p>Dokter, grooming, penitipan, dan home service yang telah diverifikasi Slivadoc.</p></div>
        <label><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama klinik atau layanan" /><button type="button" onClick={() => notify(`Menampilkan hasil untuk “${query || "semua layanan"}”`)}>Cari</button></label>
      </section>
      <div className="filter-bar">
        <div className="filter-pills">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <button className="secondary-button small discover-filter-button" type="button" onClick={()=>setFilterOpen(true)}><Icon name="filter" size={16} /> Filter</button>
      </div>
      <div className="discover-result-head"><p><b>{result.length} layanan</b> dari seluruh area layanan Slivadoc</p><select aria-label="Urutkan layanan" value={sort} onChange={event=>setSort(event.target.value as typeof sort)}><option value="recommended">Paling direkomendasikan</option><option value="distance">Jarak terdekat</option><option value="rating">Rating tertinggi</option><option value="price">Harga terendah</option></select></div>
      <div className="service-list-grid">
        {result.map((service) => (
          <article className="service-result-card" key={service.id}>
            <div className={`service-result-cover ${service.accent}`}><span>{service.emoji}</span><em>{service.type}</em><button type="button" aria-label="Favorit" className={favorites.includes(service.id) ? "favorite" : ""} onClick={() => toggleFavorite(service.id)}><Icon name="heart" size={18} /></button></div>
            <div className="service-result-body"><div className="service-name-row"><div><h3>{service.name}</h3><p><Icon name="map" size={14} /> {service.distance} • {service.address}</p></div><span className="rating-box"><span><Icon name="star" size={12}/><b>{service.rating>0?service.rating.toFixed(1):"—"}</b></span><small>{service.reviews.toLocaleString("id-ID")} ulasan</small></span></div><div className="tag-row">{service.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="availability"><span className="live-dot" /><b>{service.status}</b></div><div className="service-result-footer"><div><small>Estimasi harga</small><b>{service.price}</b></div><button className="secondary-button small" type="button" onClick={() => setDetail(service)}>Lihat detail</button><button className="primary-button small" type="button" onClick={() => openBooking(service)}>Booking</button></div></div>
          </article>
        ))}
      </div>
      {result.length === 0 && <div className="empty-state"><span>🔎</span><h3>Layanan belum ditemukan</h3><p>Coba kata kunci atau kategori lain.</p><button className="primary-button small" type="button" onClick={reset}>Reset pencarian</button></div>}
      {filterOpen&&<div className="filter-panel-backdrop" onMouseDown={()=>setFilterOpen(false)}><section className="discover-filter-panel" onMouseDown={event=>event.stopPropagation()}><header><div><span className="section-eyebrow">FILTER JELAJAHI</span><h2>Temukan layanan yang pas</h2></div><button className="modal-close" onClick={()=>setFilterOpen(false)} aria-label="Tutup"><Icon name="close"/></button></header><label><span>Jenis layanan</span><div className="filter-panel-pills">{filters.map(item=><button type="button" key={item} className={filter===item?"active":""} onClick={()=>setFilter(item)}>{item}</button>)}</div></label><label><span>Urutkan berdasarkan</span><select value={sort} onChange={event=>setSort(event.target.value as typeof sort)}><option value="recommended">Paling direkomendasikan</option><option value="distance">Jarak terdekat</option><option value="rating">Rating tertinggi</option><option value="price">Harga terendah</option></select></label><footer><button className="secondary-button" type="button" onClick={()=>{reset();notify("Filter layanan direset")}}>Reset</button><button className="primary-button" type="button" onClick={()=>setFilterOpen(false)}>Tampilkan {result.length} hasil</button></footer></section></div>}
      {detail&&<ServiceDetail service={detail} close={()=>setDetail(null)} book={()=>{setDetail(null);openBooking(detail)}}/>}
    </div>
  );
}

function BookingsView({ openBooking, setActiveView, notify,activities,points }: { openBooking: (service?: Service) => void; setActiveView: (view: AppView) => void; notify: Notify;activities:ActivityItem[];points:number }) {
  const [tab,setTab]=useState("Mendatang");const[detail,setDetail]=useState<ActivityItem|null>(null);
  const upcoming=activities.filter(item=>item.starts_at&&new Date(item.starts_at)>new Date());const live=activities.filter(item=>["in_progress","active","on_the_way"].includes(item.status));const history=activities.filter(item=>!upcoming.includes(item)&&!live.includes(item));const visible=tab==="Mendatang"?upcoming:tab==="Berlangsung"?live:history;
  return <div><div className="activity-summary-grid"><SummaryCard icon="📅" value={String(upcoming.length)} label="Booking mendatang" tone="blue" onClick={()=>setTab("Mendatang")}/><SummaryCard icon="📦" value={String(live.filter(item=>item.category==="order").length)} label="Pesanan dalam proses" tone="violet" onClick={()=>setTab("Berlangsung")}/><SummaryCard icon="💬" value={String(live.filter(item=>item.category==="consultation").length)} label="Konsultasi aktif" tone="mint" onClick={()=>setTab("Berlangsung")}/><SummaryCard icon="✦" value={points.toLocaleString("id-ID")} label="Sliva Points" tone="yellow" onClick={()=>notify(points?`Saldo ${points.toLocaleString("id-ID")} poin. Rumus: floor(transaksi bersih / Rp10.000) × multiplier membership.`:"Belum ada transaksi terbayar, jadi Sliva Point masih 0.")}/></div><div className="tabs"><button className={tab==="Mendatang"?"active":""} onClick={()=>setTab("Mendatang")}>Mendatang <span>{upcoming.length}</span></button><button className={tab==="Berlangsung"?"active":""} onClick={()=>setTab("Berlangsung")}>Berlangsung <span>{live.length}</span></button><button className={tab==="Riwayat"?"active":""} onClick={()=>setTab("Riwayat")}>Riwayat <span>{history.length}</span></button></div><div className="booking-list">{visible.length?visible.map(item=><article className="booking-card" key={item.id}><div className="booking-icon blue">{item.category==="booking"?"📅":item.category==="consultation"?"💬":item.category==="order"?"📦":"🐾"}</div><div className="booking-copy"><div><span className="status-badge confirmed">{item.status}</span><small>{item.category.toUpperCase()}</small></div><h3>{item.title}</h3><p>{item.description}</p><span className="pet-inline">{item.starts_at?new Date(item.starts_at).toLocaleString("id-ID") : new Date(item.occurred_at).toLocaleString("id-ID")}</span></div><div className="booking-actions">{item.metadata?.latitude&&<a className="secondary-button small" href={`https://www.google.com/maps/dir/?api=1&destination=${item.metadata.latitude},${item.metadata.longitude}`} target="_blank" rel="noreferrer"><Icon name="map" size={15}/> Petunjuk arah</a>}<button className="primary-button small" onClick={()=>setDetail(item)}>{item.action_label||"Lihat detail"}</button></div></article>):<div className="empty-state"><span>🗓️</span><h3>Belum ada aktivitas</h3><p>Data akan muncul setelah booking, konsultasi, atau transaksi dibuat.</p></div>}</div><div className="activity-bottom-banner"><div><span>⚡</span><p><b>Butuh layanan lain?</b><small>Booking dokter, grooming, home care, atau hotel dalam beberapa langkah.</small></p></div><button className="primary-button" onClick={()=>openBooking()}>Buat booking baru</button><button className="ghost-text" onClick={()=>setActiveView("discover")}>Jelajahi layanan</button></div>{detail&&<ActivityDetail item={detail} close={()=>setDetail(null)}/>}</div>;
}

function HealthView({ pet, notify }: { pet: Pet; notify: Notify }) {
  const [tab,setTab]=useState("all");
  const [records,setRecords]=useState<MedicalRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [detail,setDetail]=useState<MedicalRecord|null>(null);
  const [reminders,setReminders]=useState<CareReminder[]>([]);
  const [reminderOpen,setReminderOpen]=useState(false);
  useEffect(()=>{void getMedicalRecords(pet.id).then(response=>setRecords(response.data)).catch(error=>{setRecords([]);notify(error instanceof Error?error.message:"Rekam medis belum dapat dimuat")}).finally(()=>setLoading(false))},[pet.id,notify]);
  const loadReminders=useCallback(async()=>{try{setReminders((await getCareReminders()).data.filter(item=>item.pet_id===pet.id))}catch(error){notify(error instanceof Error?error.message:"Pengingat belum dapat dimuat")}},[pet.id,notify]);
  useEffect(()=>{queueMicrotask(()=>void loadReminders())},[loadReminders]);
  const latest=records[0];
  const categories=[{id:"all",label:"Semua"},{id:"consultation",label:"Konsultasi"},{id:"vaccination",label:"Vaksin"},{id:"medication",label:"Obat"},{id:"laboratory",label:"Laboratorium"}];
  const visible=tab==="all"?records:records.filter(record=>record.record_type.toLowerCase().includes(tab));
  function download(){
    downloadPetMedicalPDF(pet,records);
  }
  return <div className="health-page">
    <section className="health-hero-panel">
      <div className="health-pet"><span>{pet.avatar}</span><div><small>PROFIL KESEHATAN TERSINKRON</small><h2>{pet.name}</h2><p>{pet.breed} • {pet.weight}</p></div></div>
      <div className="health-hero-score"><div style={{"--score":`${pet.healthScore*3.6}deg`} as React.CSSProperties}><span><b>{pet.healthScore}</b><small>skor sehat</small></span></div></div>
      <div className="health-hero-meta"><span><small>Alergi</small><b>{pet.allergies||"Tidak tercatat"}</b></span><span><small>Dokter terakhir</small><b>{latest?.doctor_name||"Belum ada"}</b></span><span><small>Update terakhir</small><b>{latest?new Date(latest.occurred_at).toLocaleDateString("id-ID"):"Belum ada record"}</b></span></div>
      <button type="button" className="secondary-button small" disabled={!records.length} onClick={download}><Icon name="download" size={16}/> Unduh data</button>
    </section>
    <section className="health-account-facts">
      <article><span>🪪</span><small>Microchip</small><b>{pet.microchip}</b></article>
      <article><span>🩺</span><small>Total rekam medis</small><b>{records.length}</b></article>
      <article><span>⚖️</span><small>Berat terbaru</small><b>{latest?.weight_kg?`${latest.weight_kg} kg`:pet.weight}</b></article>
      <article><span>🌡️</span><small>Suhu terakhir</small><b>{latest?.temperature_c?`${latest.temperature_c} °C`:"Belum ada"}</b></article>
    </section>
    <section className="panel care-reminder-panel"><div className="panel-heading"><div><span className="section-eyebrow">PENGINGAT PERAWATAN</span><h3>Jadwal penting {pet.name}</h3></div><button className="primary-button small" type="button" onClick={()=>setReminderOpen(true)}><Icon name="plus" size={15}/> Tambah pengingat</button></div><div className="care-reminder-list">{reminders.filter(item=>["scheduled","snoozed"].includes(item.status)).length?reminders.filter(item=>["scheduled","snoozed"].includes(item.status)).map(item=><article key={item.id}><span>{item.reminder_type==="vaccination"?"💉":item.reminder_type==="medication"?"💊":item.reminder_type==="grooming"?"✂️":"🔔"}</span><div><b>{item.title}</b><small>{new Date(item.due_at).toLocaleString("id-ID")} · {item.recurrence==="once"?"Satu kali":`Berulang ${item.recurrence}`}</small><p>{item.notes||`Pengingat untuk ${item.pet_name}`}</p></div><div><button type="button" onClick={async()=>{await snoozeCareReminder(item.id,1440);await loadReminders();notify("Pengingat ditunda satu hari")}}>Tunda 1 hari</button><button className="complete" type="button" onClick={async()=>{await completeCareReminder(item.id);await loadReminders();notify("Perawatan ditandai selesai")}}>Selesai</button></div></article>):<div className="empty-state compact">Belum ada pengingat. Tambahkan jadwal vaksin, obat, grooming, atau kontrol berikutnya.</div>}</div></section>
    {(pet.notes||pet.allergies)&&<section className="panel health-special-note"><span>⚠️</span><div><small>CATATAN KHUSUS</small><b>{pet.allergies&&`Alergi: ${pet.allergies}`}</b><p>{pet.notes||"Tidak ada catatan medis tambahan."}</p></div></section>}
    <div className="tabs wide">{categories.map(item=><button type="button" className={tab===item.id?"active":""} key={item.id} onClick={()=>setTab(item.id)}>{item.label}<span>{item.id==="all"?records.length:records.filter(record=>record.record_type.toLowerCase().includes(item.id)).length}</span></button>)}</div>
    <section className="panel health-record-api"><div className="panel-heading"><div><span className="section-eyebrow">PET MEDICAL RECORD</span><h3>Riwayat {pet.name}</h3></div><small>Catatan kesehatan terpilih</small></div>
      {loading?<div className="empty-state compact">Memuat rekam medis {pet.name}…</div>:visible.length?<div className="record-list">{visible.map(record=><article key={record.id}><span className="record-icon">🩺</span><div><small>{record.record_type.toUpperCase()} • {new Date(record.occurred_at).toLocaleString("id-ID")}</small><b>{record.title}</b><p>{record.diagnosis||record.clinical_notes||record.complaint||"Tidak ada keterangan tambahan"}</p><em>{record.doctor_name||"Dokter belum dicatat"}</em></div><button type="button" onClick={()=>setDetail(record)}>Lihat detail</button></article>)}</div>:<div className="empty-state"><span>🩺</span><h3>Belum ada rekam medis</h3><p>Record akan muncul setelah pemeriksaan atau konsultasi untuk {pet.name}.</p></div>}
    </section>
    {detail&&<div className="modal-overlay" onMouseDown={()=>setDetail(null)}><section className="modal medical-record-detail" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={()=>setDetail(null)}><Icon name="close"/></button><span className="section-eyebrow">{detail.record_type.toUpperCase()}</span><h2>{detail.title}</h2><p>{new Date(detail.occurred_at).toLocaleString("id-ID")} · {detail.doctor_name||"Dokter belum dicatat"}</p><dl>{[["Keluhan",detail.complaint],["Diagnosis",detail.diagnosis],["Perawatan",detail.treatment],["Catatan klinis",detail.clinical_notes],["Kontrol berikutnya",detail.next_control_at?new Date(detail.next_control_at).toLocaleString("id-ID"):""]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><button className="primary-button full" onClick={()=>setDetail(null)}>Selesai</button></section></div>}
    {reminderOpen&&<ReminderModal pet={pet} close={()=>setReminderOpen(false)} notify={notify} created={loadReminders}/>}
  </div>;
}

function ReminderModal({pet,close,notify,created}:{pet:Pet;close:()=>void;notify:Notify;created:()=>Promise<void>}){const[busy,setBusy]=useState(false);async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const values=Object.fromEntries(new FormData(event.currentTarget));try{await createCareReminder({pet_id:pet.id,reminder_type:values.reminder_type,title:values.title,notes:values.notes,due_at:new Date(String(values.due_at)).toISOString(),timezone:"Asia/Jakarta",recurrence:values.recurrence,recurrence_days:values.recurrence==="custom"?Number(values.recurrence_days||30):null,lead_minutes:[10080,1440,120],channels:["in_app","email"]});await created();notify("Pengingat berhasil dijadwalkan");close()}catch(error){notify(error instanceof Error?error.message:"Pengingat belum dapat dibuat")}finally{setBusy(false)}}return <div className="modal-overlay" onMouseDown={close}><section className="modal form-modal reminder-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close"/></button><span className="section-eyebrow">PENGINGAT PERAWATAN</span><h2>Jadwalkan untuk {pet.name}</h2><p className="muted-copy">Notifikasi disiapkan 7 hari, 1 hari, dan 2 jam sebelum jadwal.</p><form className="world-form" onSubmit={submit}><label><span>Jenis perawatan</span><select name="reminder_type"><option value="vaccination">Vaksinasi</option><option value="medication">Obat</option><option value="deworming">Obat cacing</option><option value="flea_tick">Kutu & caplak</option><option value="grooming">Grooming</option><option value="follow_up">Kontrol dokter</option><option value="document">Dokumen</option><option value="custom">Lainnya</option></select></label><label><span>Judul</span><input name="title" minLength={3} placeholder="Contoh: Booster rabies" required/></label><label><span>Tanggal & waktu</span><input name="due_at" type="datetime-local" required/></label><div className="form-row"><label><span>Pengulangan</span><select name="recurrence" defaultValue="yearly"><option value="once">Satu kali</option><option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option><option value="quarterly">Tiga bulanan</option><option value="yearly">Tahunan</option><option value="custom">Jarak khusus</option></select></label><label><span>Jarak khusus (hari)</span><input name="recurrence_days" type="number" min="1" defaultValue="30"/></label></div><label><span>Catatan</span><textarea name="notes" placeholder="Dosis, klinik, atau persiapan khusus"/></label><button className="primary-button full" disabled={busy}>{busy?"Menjadwalkan…":"Simpan pengingat"}</button></form></section></div>}
function ShopView({ addToCart, setCartOpen, notify,productCatalog,petName,favorites,toggleFavorite }: { addToCart: (id: string) => void; setCartOpen: (value: boolean) => void; notify: Notify;productCatalog:Product[];petName:string;favorites:string[];toggleFavorite:(id:string)=>void }) {
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const categories = ["Semua",...Array.from(new Set(productCatalog.map(item=>item.category)))];
  const filtered = productCatalog.filter((product) => (category === "Semua" || product.category === category) && product.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <section className="shop-banner"><div><span className="soft-badge white">DIKURASI OLEH DOKTER HEWAN</span><h2>Belanja lebih tepat untuk kebutuhan mereka.</h2><p>Rekomendasi personal, produk asli, dan pengiriman same day.</p><button className="primary-button white-button" type="button" onClick={() => {setCategory("Semua");notify(`Rekomendasi untuk ${petName} sudah ditampilkan`)}}>Lihat rekomendasi {petName}</button></div><span className="shop-illustration">🛍️<i>🐕</i></span></section>
      <div className="shop-tools"><label><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari makanan, obat, mainan..." /></label><button className="secondary-button" type="button" onClick={() => setCartOpen(true)}><Icon name="cart" size={17} /> Keranjang</button></div>
      <div className="category-scroll">{categories.map((item) => <button type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}><span>{item === "Semua" ? "✨" : item === "Makanan" ? "🥣" : item === "Kesehatan" ? "🩺" : item === "Vitamin" ? "💊" : item === "Kebutuhan" ? "🧴" : item === "Mainan" ? "🧸" : "🎀"}</span>{item}</button>)}</div>
      <div className="shop-section-head"><div><span className="section-eyebrow">PILIHAN UNTUK {petName.toUpperCase()}</span><h3>Rekomendasi dokter</h3></div><select aria-label="Urutkan produk"><option>Paling relevan</option><option>Terlaris</option><option>Harga terendah</option></select></div>
      <div className="product-grid">{filtered.map((product) => <article className="product-card" key={product.id}><div className="product-visual"><span>{product.emoji}</span>{product.badge && <em>{product.badge}</em>}<button className={favorites.includes(product.id)?"favorite":""} type="button" aria-label="Simpan produk" onClick={() => toggleFavorite(product.id)}><Icon name="heart" size={17} /></button></div><div className="product-body"><small>{product.brand} <i>✓</i></small><h3>{product.name}</h3><p>{product.rating>0&&<><Icon name="star" size={13} /> <b>{product.rating}</b> • </>}{product.sold}</p><div className="product-price"><span><b>{formatRupiah(product.price)}</b>{product.originalPrice && <del>{formatRupiah(product.originalPrice)}</del>}</span><button type="button" disabled={product.badge==="Stok habis"} onClick={() => addToCart(product.id)} aria-label={`Tambah ${product.name} ke keranjang`}><Icon name="plus" size={18} /></button></div></div></article>)}</div>
    </div>
  );
}

function ProfileView({ notify,account,petCount,points,onLogout,onChanged }: { notify: Notify;account:PetOwnerBootstrap["user"];petCount:number;points:number;onLogout:()=>void;onChanged:()=>Promise<void> }) {
  const initials=account.full_name.split(" ").map(value=>value[0]).slice(0,2).join("");
  const[edit,setEdit]=useState(false);const[confirmLogout,setConfirmLogout]=useState(false);
  return <div className="profile-layout">
    <section className="profile-main-card"><div className="profile-cover"><span>SLIVADOC PET FAMILY</span></div><div className="profile-person"><div className="profile-photo">{initials}</div><div><h2>{account.full_name}</h2><p>{account.email} · {account.phone||"Nomor telepon belum diisi"}</p><span className="gold-member">✓ AKUN PET OWNER AKTIF</span></div><button className="secondary-button small" onClick={()=>setEdit(true)}><Icon name="edit" size={15}/> Edit profil</button></div><div className="profile-stats"><span><b>{petCount}</b><small>Hewan</small></span><span><b>{points.toLocaleString("id-ID")}</b><small>Sliva Points</small></span><span><b>{points>0?"Member":"Regular"}</b><small>Status</small></span><span><b>Aktif</b><small>Sinkronisasi</small></span></div></section>
    <div className="profile-grid">
      <section className="panel profile-section"><div className="panel-heading"><div><span className="section-eyebrow">DATA AKUN</span><h3>Identitas pet parent</h3></div><span className="active-chip">Aktif</span></div><dl className="account-detail-list"><div><dt>Nama lengkap</dt><dd>{account.full_name}</dd></div><div><dt>Email login</dt><dd>{account.email}</dd></div><div><dt>Nomor telepon</dt><dd>{account.phone||"Belum diisi"}</dd></div><div><dt>Jumlah pet</dt><dd>{petCount}</dd></div></dl></section>
      <section className="panel profile-section"><div className="panel-heading"><div><span className="section-eyebrow">SLIVA POINT</span><h3>Saldo dan aturan klaim</h3></div><span className="point-profile-badge">{points.toLocaleString("id-ID")}</span></div><div className="point-rule-card"><span>✦</span><div><b>{points?points.toLocaleString("id-ID")+" poin tersedia":"Belum ada poin"}</b><p>Poin hanya dihitung dari transaksi berstatus lunas. Rumus dasar: floor(nilai transaksi bersih ÷ Rp10.000) × multiplier membership. Refund membatalkan poin transaksi terkait.</p></div></div>{points===0&&<div className="zero-transaction">Belum ada transaksi lunas pada akun ini, sehingga saldo poin adalah 0.</div>}</section>
      <section className="panel profile-section span-2"><div className="panel-heading"><div><span className="section-eyebrow">PRIVASI & SESI</span><h3>Keamanan akun</h3></div></div><p className="muted-copy">Data profil ditampilkan langsung dari akun yang sedang login. Keluar akan mengakhiri sesi pada perangkat ini.</p><div className="profile-danger"><span><b>Keluar dari perangkat ini</b><small>Kamu dapat masuk kembali menggunakan email dan kata sandi.</small></span><button className="secondary-button" type="button" onClick={()=>setConfirmLogout(true)}><Icon name="logout" size={16}/> Keluar akun</button></div></section>
    </div>
    {edit&&<ProfileEditModal account={account} close={()=>setEdit(false)} notify={notify} changed={onChanged}/>} {confirmLogout&&<div className="modal-overlay" onMouseDown={()=>setConfirmLogout(false)}><section className="modal confirm-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={()=>setConfirmLogout(false)}><Icon name="close"/></button><span className="section-eyebrow">KONFIRMASI KELUAR</span><h2>Keluar dari akun?</h2><p>Sesi Slivadoc di perangkat ini akan diakhiri. Data dan profil pet tetap aman.</p><footer><button className="secondary-button" onClick={()=>setConfirmLogout(false)}>Tetap masuk</button><button className="danger-button" onClick={()=>{notify("Kamu sudah keluar dari akun");onLogout()}}>Ya, keluar</button></footer></section></div>}
  </div>;
}
function ProfileEditModal({account,close,notify,changed}:{account:PetOwnerBootstrap["user"];close:()=>void;notify:Notify;changed:()=>Promise<void>}){const[busy,setBusy]=useState(false);async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const values=Object.fromEntries(new FormData(event.currentTarget));try{await updatePetOwnerProfile({full_name:String(values.full_name),phone:String(values.phone)});await changed();notify("Profil berhasil diperbarui");close()}catch(error){notify(error instanceof Error?error.message:"Profil belum dapat diperbarui")}finally{setBusy(false)}}return <div className="modal-overlay" onMouseDown={close}><section className="modal form-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close"/></button><span className="section-eyebrow">DATA AKUN</span><h2>Edit profil pet parent</h2><form className="world-form" onSubmit={submit}><label><span>Nama lengkap</span><input name="full_name" defaultValue={account.full_name} minLength={2} required/></label><label><span>Email login</span><input value={account.email} disabled/></label><label><span>Nomor telepon</span><input name="phone" defaultValue={account.phone}/></label><button className="primary-button full" disabled={busy}>{busy?"Menyimpan…":"Simpan perubahan"}</button></form></section></div>}
function ServiceDetail({service,close,book}:{service:Service;close:()=>void;book:()=>void}){return <div className="modal-overlay" onMouseDown={close}><section className="modal service-detail-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close"/></button><div className={`service-detail-visual ${service.accent}`}><span>{service.emoji}</span><em>{service.type}</em></div><span className="section-eyebrow">LAYANAN TERVERIFIKASI</span><h2>{service.name}</h2><p><Icon name="map" size={14}/> {service.distance} · {service.address}</p><div className="tag-row">{service.tags.map(tag=><span key={tag}>{tag}</span>)}</div><dl className="service-detail-facts"><div><dt>Status</dt><dd>{service.status}</dd></div><div><dt>Harga</dt><dd>{service.price}</dd></div><div><dt>Rating & ulasan</dt><dd>{service.rating>0?`★ ${service.rating.toFixed(1)} · ${service.reviews.toLocaleString("id-ID")} ulasan`:`— · ${service.reviews.toLocaleString("id-ID")} ulasan`}</dd></div></dl><button className="primary-button full" onClick={book}>Booking layanan</button></section></div>}

function ActivityDetail({item,close}:{item:ActivityItem;close:()=>void}){const icon=item.category==="booking"?"📅":item.category==="consultation"?"💬":item.category==="order"?"📦":"🐾";const metadata=Object.entries(item.metadata||{}).filter(([key,value])=>!['latitude','longitude'].includes(key)&&(typeof value==="string"||typeof value==="number"));return <div className="modal-overlay" onMouseDown={close}><section className="modal activity-detail-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" onClick={close}><Icon name="close"/></button><header className="activity-detail-hero"><span>{icon}</span><div><small>{item.category.toUpperCase()}</small><h2>{item.title}</h2><em>{item.status.replaceAll("_"," ")}</em></div></header><div className="activity-detail-copy"><span className="activity-detail-label">RINGKASAN AKTIVITAS</span><p>{item.description}</p></div><dl><div className="activity-detail-time"><dt>Waktu</dt><dd>{new Date(item.starts_at||item.occurred_at).toLocaleString("id-ID",{dateStyle:"full",timeStyle:"short"})}</dd></div>{metadata.map(([key,value])=><div key={key}><dt>{key.replaceAll("_"," ")}</dt><dd>{String(value)}</dd></div>)}</dl><footer>{item.metadata?.latitude&&<a className="secondary-button" href={`https://www.google.com/maps/dir/?api=1&destination=${item.metadata.latitude},${item.metadata.longitude}`} target="_blank" rel="noreferrer"><Icon name="map" size={16}/> Petunjuk arah</a>}<button className="primary-button" type="button" onClick={close}>Selesai</button></footer></section></div>}

function FavoritesView({services,products,openBooking,addToCart,remove}:{services:Service[];products:Product[];openBooking:(service:Service)=>void;addToCart:(id:string)=>void;remove:(type:string,id:string)=>void|Promise<void>}){const empty=!services.length&&!products.length;return <div><div className="favorites-intro"><span>♡</span><div><h2>Koleksi favoritmu</h2><p>Layanan dan produk favorit tersimpan pada akun di semua perangkat.</p></div></div>{services.length>0&&<><div className="panel-heading"><div><span className="section-eyebrow">LAYANAN</span><h3>Favorit layanan</h3></div></div><div className="service-list-grid">{services.map(service=><article className="service-result-card" key={service.id}><div className={`service-result-cover ${service.accent}`}><span>{service.emoji}</span><em>{service.type}</em><button className="favorite" onClick={()=>void remove("service",service.id)} aria-label={`Hapus ${service.name} dari favorit`}><Icon name="heart"/></button></div><div className="service-result-body"><h3>{service.name}</h3><p>{service.address}</p><div className="service-result-footer"><b>{service.price}</b><button className="primary-button small" onClick={()=>openBooking(service)}>Booking</button></div></div></article>)}</div></>}{products.length>0&&<><div className="panel-heading favorite-product-heading"><div><span className="section-eyebrow">PRODUK</span><h3>Favorit produk</h3></div></div><div className="product-grid">{products.map(product=><article className="product-card" key={product.id}><div className="product-visual"><span>{product.emoji}</span><button className="favorite" onClick={()=>void remove("product",product.id)} aria-label={`Hapus ${product.name} dari favorit`}><Icon name="heart"/></button></div><div className="product-body"><small>{product.brand}</small><h3>{product.name}</h3><div className="product-price"><b>{formatRupiah(product.price)}</b><button onClick={()=>addToCart(product.id)}><Icon name="plus"/></button></div></div></article>)}</div></>}{empty&&<div className="empty-state"><span>♡</span><h3>Belum ada favorit</h3><p>Tekan ikon hati di Jelajahi atau Pet Shop untuk menyimpan pilihan.</p></div>}</div>}

function NotificationCenter({items,setItems,notify}:{items:NotificationItem[];setItems:React.Dispatch<React.SetStateAction<NotificationItem[]>>;notify:Notify}){const[category,setCategory]=useState("");const categories=[...new Set(items.map(item=>item.category))];const visible=category?items.filter(item=>item.category===category):items;async function open(item:NotificationItem){try{if(!item.read_at){await readNotification(item.id);setItems(current=>current.map(value=>value.id===item.id?{...value,read_at:new Date().toISOString()}:value))}notify(item.title)}catch(error){notify(error instanceof Error?error.message:"Notifikasi belum dapat dibuka")}}return <div><div className="notification-center-head"><div><b>{items.filter(item=>!item.read_at).length}</b><span>belum dibaca</span></div><button disabled={!items.some(item=>!item.read_at)} onClick={async()=>{await readAllNotifications(category);setItems(current=>current.map(item=>!category||item.category===category?{...item,read_at:item.read_at||new Date().toISOString()}:item))}}>Tandai semua dibaca</button></div><div className="notification-filter-tabs"><button className={!category?"active":""} onClick={()=>setCategory("")}>Semua</button>{categories.map(value=><button key={value} className={category===value?"active":""} onClick={()=>setCategory(value)}>{value}</button>)}</div><section className="panel notification-center-list">{visible.length?visible.map(item=><button className={!item.read_at?"unread":""} key={item.id} onClick={()=>void open(item)}><span>{item.category==="health"?"🩺":item.category==="booking"?"📅":item.category==="points"?"✦":"🔔"}</span><div><small>{item.category.toUpperCase()}</small><b>{item.title}</b><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString("id-ID")}</time></div>{!item.read_at&&<i/>}</button>):<div className="empty-state compact">Tidak ada notifikasi pada kategori ini.</div>}</section></div>}

function MobileNav({activeView,setActiveView,cartCount,authenticated}:{activeView:AppView;setActiveView:(view:AppView)=>void;cartCount:number;authenticated:boolean}){
  const[more,setMore]=useState(false);
  const primaryIds:AppView[]=["home","discover","community","bookings"];
  const items=primaryIds.map(id=>navItems.find(item=>item.id===id)).filter((item):item is (typeof navItems)[number]=>Boolean(item));
  const moreActive=more||!primaryIds.includes(activeView);
  return <>
    <nav className="mobile-nav" aria-label="Navigasi utama">
      {items.map(item=><button type="button" key={item.id} className={activeView===item.id?"active":""} onClick={()=>{setMore(false);setActiveView(item.id)}}><span><Icon name={item.icon} size={22}/></span><small>{item.label}</small></button>)}
      <button type="button" className={moreActive?"active":""} onClick={()=>setMore(true)} aria-expanded={more}><span><Icon name="more" size={22}/>{cartCount>0&&<i>{cartCount}</i>}</span><small>Lainnya</small></button>
    </nav>
    {more&&<div className="mobile-more-backdrop" onMouseDown={()=>setMore(false)}><section className="mobile-more-sheet" onMouseDown={event=>event.stopPropagation()}><header><div><span>SEMUA FITUR SLIVADOC</span><h2>Mau ke mana?</h2></div><button onClick={()=>setMore(false)} aria-label="Tutup"><Icon name="close"/></button></header><div>{navItems.filter(item=>!primaryIds.includes(item.id)&&(authenticated||item.id!=="profile")).map(item=><button key={item.id} onClick={()=>{setMore(false);setActiveView(item.id)}}><span><Icon name={item.icon}/></span><b>{item.label}</b>{item.id==="shop"&&cartCount>0&&<em>{cartCount}</em>}</button>)}</div></section></div>}
  </>
}

function NotificationDrawer({ onClose, notify,items,setItems,seeAll }: { onClose: () => void; notify: Notify;items:NotificationItem[];setItems:React.Dispatch<React.SetStateAction<NotificationItem[]>>;seeAll:()=>void }) {
  async function markAll(){try{await readAllNotifications();setItems(current=>current.map(item=>({...item,read_at:item.read_at||new Date().toISOString()})));notify("Semua notifikasi ditandai dibaca")}catch(error){notify(error instanceof Error?error.message:"Notifikasi belum dapat diperbarui")}}
  async function open(item:NotificationItem){if(!item.read_at){await readNotification(item.id);setItems(current=>current.map(value=>value.id===item.id?{...value,read_at:new Date().toISOString()}:value))}notify(item.title)}
  return <div className="overlay" onMouseDown={onClose}><aside className="drawer notification-drawer" onMouseDown={(event)=>event.stopPropagation()}><header><div><span className="section-eyebrow">UPDATE TERBARU</span><h2>Notifikasi</h2></div><button type="button" onClick={onClose}><Icon name="close"/></button></header><div className="notification-category-chips">{[...new Set(items.map(item=>item.category))].map(value=><span key={value}>{value}</span>)}</div><button className="mark-read" type="button" disabled={!items.some(item=>!item.read_at)} onClick={()=>void markAll()}>Tandai semua sudah dibaca</button><div className="notification-list">{items.length?items.map(item=><Notification key={item.id} icon={item.category==="health"?"💊":item.category==="order"?"📦":item.category==="points"?"✦":"🔔"} tone={item.category==="health"?"mint":item.category==="points"?"yellow":"blue"} title={item.title} note={item.body} time={new Date(item.created_at).toLocaleString("id-ID")} unread={!item.read_at} onClick={()=>void open(item)}/>):<div className="empty-state compact">Belum ada notifikasi.</div>}</div><button className="full-soft-button" type="button" onClick={seeAll}>Lihat semua berdasarkan kategori</button></aside></div>;
}

function BookingModal({ service, pet, success, setSuccess, onClose,onBooked }: { service: Service; pet: Pet; success: boolean; setSuccess: (value: boolean) => void; onClose: () => void;onBooked:()=>Promise<void> }) {
  const [step, setStep] = useState(1);
  const toLocalDate=(value:Date)=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
  const availableDates=Array.from({length:5},(_,index)=>{const value=new Date();value.setDate(value.getDate()+index+1);return value});
  const [date, setDate] = useState(()=>toLocalDate(availableDates[0]));
  const [time, setTime] = useState("16.00");
  const[notes,setNotes]=useState("");const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
  const formattedDate=new Date(`${date}T12:00:00`).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  async function confirm(){if(!service.branchId){setMessage("Cabang layanan ini belum menerima booking.");return}setBusy(true);setMessage("");try{const [hour,minute]=time.split(".").map(Number);const scheduled=new Date(`${date}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`);await createPetOwnerBooking({pet_id:pet.id,service_id:service.id,branch_id:service.branchId,scheduled_at:scheduled.toISOString(),notes});await onBooked();setSuccess(true)}catch(error){setMessage(error instanceof Error?error.message:"Booking belum dapat dibuat")}finally{setBusy(false)}}
  if (success) return <div className="modal-overlay"><div className="modal success-modal"><button className="modal-close" type="button" onClick={onClose}><Icon name="close" /></button><span className="success-animation"><Icon name="check" size={34} /></span><small>BOOKING BERHASIL</small><h2>Jadwal {pet.name} sudah aman!</h2><p>{service.name} telah menerima permintaan booking kamu.</p><div className="success-ticket"><span>{service.emoji}</span><div><small>{formattedDate} • {time} WIB</small><b>{service.name}</b><p>{pet.avatar} {pet.name} • {service.name}</p></div></div><button className="primary-button full" type="button" onClick={onClose}>Lihat aktivitas</button><button className="ghost-text" type="button" onClick={onClose}>Kembali ke beranda</button></div></div>;
  return <div className="modal-overlay" onMouseDown={onClose}><div className="modal booking-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-eyebrow">BOOKING LAYANAN</span><h2>{service.name}</h2></div><button className="modal-close" type="button" onClick={onClose}><Icon name="close" /></button></header><div className="stepper">{[1,2,3].map((item) => <div key={item} className={step >= item ? "active" : ""}><span>{step > item ? <Icon name="check" size={13} /> : item}</span><small>{item === 1 ? "Layanan" : item === 2 ? "Jadwal" : "Konfirmasi"}</small></div>)}</div>{step === 1 && <div className="booking-step"><label className="field-label">Pilih hewan</label><button className="selected-pet-box" type="button"><span>{pet.avatar}</span><div><b>{pet.name}</b><small>{pet.breed} • {pet.weight}</small></div><i><Icon name="check" size={15} /></i></button><label className="field-label">Layanan yang dipilih</label><div className="service-option selected"><span>{service.emoji}</span><div><b>{service.name}</b><small>{service.tags.join(" · ")}</small></div><strong>{service.price}</strong><i><Icon name="check" size={13} /></i></div></div>}{step === 2 && <div className="booking-step"><label className="field-label">Pilih tanggal</label><div className="date-options">{availableDates.map((item) => {const value=toLocalDate(item);return <button className={date === value ? "selected" : ""} type="button" key={value} onClick={() => setDate(value)}><small>{item.toLocaleDateString("id-ID",{weekday:"short"}).toUpperCase()}</small><b>{item.getDate()}</b><span>{item.toLocaleDateString("id-ID",{month:"short"})}</span></button>})}</div><label className="field-label">Pilih waktu</label><div className="time-options">{["09.00","10.30","13.00","14.30","16.00","17.30"].map((item) => <button type="button" key={item} className={time === item ? "selected" : ""} onClick={() => setTime(item)}>{item}</button>)}</div><label className="field-label">Catatan khusus <small>(opsional)</small></label><textarea value={notes} onChange={event=>setNotes(event.target.value)} maxLength={1000} placeholder="Ceritakan keluhan atau kebutuhan khusus pet..." /></div>}{step === 3 && <div className="booking-step"><div className="booking-summary"><div className={`summary-service ${service.accent}`}>{service.emoji}</div><div><span className="status-badge confirmed">Tersedia untuk booking</span><h3>{service.name}</h3><p>{service.address}</p></div></div><div className="summary-lines"><span><small>Hewan</small><b>{pet.avatar} {pet.name}</b></span><span><small>Layanan</small><b>{service.name}</b></span><span><small>Jadwal</small><b>{formattedDate} • {time} WIB</b></span><span className="total"><small>Total pembayaran</small><b>{formatRupiah(service.priceValue||0)}</b></span></div>{notes&&<p className="booking-note">Catatan: {notes}</p>}<label className="consent"><input type="checkbox" defaultChecked /> Saya menyetujui kebijakan pembatalan dan penggunaan data kesehatan.</label></div>}{message&&<div className="form-message">{message}</div>}<footer><button className="secondary-button" type="button" disabled={busy} onClick={() => step === 1 ? onClose() : setStep(step - 1)}>{step === 1 ? "Batal" : "Kembali"}</button><button className="primary-button" type="button" disabled={busy} onClick={() => step < 3 ? setStep(step + 1) : void confirm()}>{busy?"Menyimpan booking…":step < 3 ? "Lanjutkan" : "Konfirmasi booking"} <Icon name="arrow" size={16} /></button></footer></div></div>;
}

function CartDrawer({ cart, setCart, onClose, notify,productCatalog }: { cart: Record<string, number>; setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>; onClose: () => void; notify: Notify;productCatalog:Product[] }) {
  const[voucher,setVoucher]=useState("");const items = productCatalog.filter((product) => cart[product.id]);
  const subtotal = items.reduce((sum, item) => sum + item.price * cart[item.id], 0);
  const update = (id: string, amount: number) => setCart((current) => { const next = { ...current, [id]: Math.max(0, (current[id] ?? 0) + amount) }; if (!next[id]) delete next[id]; return next; });
  return <div className="overlay" onMouseDown={onClose}><aside className="drawer cart-drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-eyebrow">SLIVA PET SHOP</span><h2>Keranjangmu</h2></div><button type="button" onClick={onClose}><Icon name="close" /></button></header>{items.length === 0 ? <div className="empty-state compact"><span>🛒</span><h3>Keranjang masih kosong</h3><p>Yuk, pilih kebutuhan terbaik untuk mereka.</p><button className="primary-button small" type="button" onClick={onClose}>Mulai belanja</button></div> : <><div className="cart-items">{items.map((item) => <div className="cart-item" key={item.id}><span>{item.emoji}</span><div><small>{item.brand}</small><b>{item.name}</b><strong>{formatRupiah(item.price)}</strong></div><div className="quantity"><button type="button" onClick={() => update(item.id, -1)}>−</button><b>{cart[item.id]}</b><button type="button" onClick={() => update(item.id, 1)}>+</button></div></div>)}</div><label className="voucher"><span>🎟️</span><input value={voucher} onChange={event=>setVoucher(event.target.value.replace(/[^A-Za-z0-9]/g,""))} minLength={6} placeholder="Minimal 6 huruf/angka" /><button type="button" disabled={voucher.length<6} onClick={() => notify(`Voucher ${voucher.toUpperCase()} sedang diverifikasi`)}>Pakai</button></label><div className="cart-summary"><span><small>Subtotal</small><b>{formatRupiah(subtotal)}</b></span><span><small>Pengiriman</small><b className="good">Gratis</b></span><span><small>Biaya layanan</small><b>Rp2.500</b></span><span className="total"><small>Total</small><b>{formatRupiah(subtotal + 2500)}</b></span></div><button className="primary-button full" type="button" onClick={() => notify("Pembayaran sedang disiapkan")}>Lanjut ke pembayaran <Icon name="arrow" size={16} /></button></>}</aside></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><small>{label}</small><b>{value}</b></div>; }
function Progress({ label, value }: { label: string; value: number }) { return <div className="progress-row"><span><small>{label}</small><b>{value}%</b></span><div><i style={{ width: `${value}%` }} /></div></div>; }
function SummaryCard({ icon, value, label, tone,onClick }: { icon: string; value: string; label: string; tone: string;onClick?:()=>void }) { return <button className="activity-summary-card" type="button" onClick={onClick}><span className={tone}>{icon}</span><p><b>{value}</b><small>{label}</small></p><Icon name="chevron" size={16} /></button>; }
function Notification({ icon, tone, title, note, time, unread,onClick }: { icon: string; tone: string; title: string; note: string; time: string; unread?: boolean;onClick?:()=>void }) { return <button type="button" className={`notification ${unread ? "unread" : ""}`} onClick={onClick??(() => window.dispatchEvent(new CustomEvent("slivadoc:notice", { detail: title })))}><span className={tone}>{icon}</span><p><b>{title}</b><small>{note}</small><em>{time}</em></p>{unread && <i />}</button>; }

function downloadViewSummary(view: AppView) {
  const content = [`Slivadoc Pet Owner · ${titles[view].title}`, titles[view].subtitle, `Dibuat: ${new Date().toLocaleString("id-ID")}`, "", "Ringkasan ini dibuat dari informasi pada akun dan tampilan yang sedang aktif."].join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `slivadoc-${view}-summary.txt`; anchor.click(); URL.revokeObjectURL(url);
}
