"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import type { Pet } from "../../data/mock";
import {
  createPawDatingHealthReport,
  createPawDatingProfile,
  getMyPawDatingProfiles,
  getPawDatingCompatibility,
  getPawDatingInterests,
  getPawDatingProfile,
  getPawDatingProfiles,
  getPawDatingStandards,
  isPetOwnerAuthenticated,
  respondPawDatingInterest,
  sendPawDatingInterest,
  submitPawDatingProfile,
  type PawDatingCompatibility,
  type PawDatingHealthReport,
  type PawDatingInterest,
  type PawDatingProfile,
  type PawDatingStandards,
} from "../../lib/platform-api";

type Tab = "discover" | "mine" | "requests" | "standards";
type Notify = (message: string) => void;

const demoProfiles: PawDatingProfile[] = [
  { id:"a8000000-0000-4000-8000-000000000002", name:"Bella", species:"dog", breed:"Golden Retriever", sex:"female", birth_date:"2022-02-14", age_months:54, weight_kg:27.1, color:"cream", city:"Bandung", distance_km:118, profile_level:4, level_name:"Level 4 · Genetic & Pedigree Verified", pedigree_status:"champion", description:"Tenang, cerdas, dan memiliki screening genetik breed-specific lengkap serta silsilah terverifikasi.", temperament:["calm","smart","affectionate"], traits:["Champion line","Therapy temperament","House trained"], preferred_breeds:["Golden Retriever"], photo_urls:[], health_score:98, breeding_history_count:0, health_verification:"verified", eligibility_status:"eligible", risk_level:"low", health_valid_until:"2027-02-06", owner_display:"Pet parent terverifikasi" },
  { id:"a8000000-0000-4000-8000-000000000003", name:"Coco", species:"dog", breed:"Poodle", sex:"female", birth_date:"2020-11-05", age_months:69, weight_kg:6.2, color:"apricot", city:"Jakarta Selatan", distance_km:7.4, profile_level:3, level_name:"Level 3 · Genetic Cleared", pedigree_status:"registered", description:"Mini Poodle penuh energi dengan pemeriksaan fisik, reproduksi, dan panel genetik terverifikasi.", temperament:["playful","alert","people oriented"], traits:["Agility","Small breed","Trained"], preferred_breeds:["Poodle"], photo_urls:[], health_score:91, breeding_history_count:0, health_verification:"verified", eligibility_status:"eligible", risk_level:"low", health_valid_until:"2027-01-16", owner_display:"Pet parent terverifikasi" },
  { id:"a8000000-0000-4000-8000-000000000004", name:"Nala", species:"dog", breed:"Corgi", sex:"female", birth_date:"2023-04-09", age_months:40, weight_kg:10.8, color:"tan-white", city:"Tangerang Selatan", distance_km:19.2, profile_level:2, level_name:"Level 2 · Health Verified", pedigree_status:"none", description:"Aktif dan sosial. Pemeriksaan dasar dokter lengkap; panel genetik lanjutan masih perlu diselesaikan.", temperament:["active","social","curious"], traits:["Herding instinct","Playful"], preferred_breeds:["Corgi"], photo_urls:[], health_score:84, breeding_history_count:0, health_verification:"verified", eligibility_status:"conditional", risk_level:"medium", health_valid_until:"2026-11-12", owner_display:"Pet parent terverifikasi" },
  { id:"a8000000-0000-4000-8000-000000000005", name:"Luna", species:"cat", breed:"British Shorthair", sex:"female", birth_date:"2022-08-20", age_months:48, weight_kg:4.8, color:"grey", city:"Jakarta Selatan", distance_km:3.1, profile_level:3, level_name:"Level 3 · Genetic Cleared", pedigree_status:"pedigree", description:"Tenang, pedigree terdaftar, serta hasil tes FeLV, FIV, PKD dan golongan darah terdokumentasi.", temperament:["calm","independent","gentle"], traits:["Indoor","Pedigree","Socialized"], preferred_breeds:["British Shorthair"], photo_urls:[], health_score:94, breeding_history_count:0, health_verification:"verified", eligibility_status:"eligible", risk_level:"low", health_valid_until:"2027-01-27", owner_display:"Pet parent terverifikasi" },
  { id:"a8000000-0000-4000-8000-000000000006", name:"Oreo", species:"cat", breed:"Persian", sex:"male", birth_date:"2021-09-18", age_months:59, weight_kg:5.6, color:"black-white", city:"Depok", distance_km:24.6, profile_level:2, level_name:"Level 2 · Health Verified", pedigree_status:"registered", description:"Persian jantan ramah dengan vaksin lengkap dan pemeriksaan kesehatan dasar aktif.", temperament:["friendly","calm","affectionate"], traits:["Indoor","Groomed routinely"], preferred_breeds:["Persian"], photo_urls:[], health_score:86, breeding_history_count:0, health_verification:"verified", eligibility_status:"conditional", risk_level:"medium", health_valid_until:"2026-11-05", owner_display:"Pet parent terverifikasi" },
];

const demoStandards: PawDatingStandards = {
  principles:["Kesejahteraan pet selalu lebih utama daripada permintaan breeding","Persetujuan kedua pet parent wajib sebelum identitas kontak dibuka","Hasil match bukan jaminan aman; pemeriksaan dokter pra-breeding tetap wajib","Pairing beda spesies, jenis kelamin sama, penyakit menular positif, atau kekerabatan dekat otomatis diblokir"],
  levels:[
    {level:1,name:"Identity Verified",requirements:["Identitas dan kepemilikan pet","Microchip atau dokumen pendukung","Usia minimum sesuai spesies"]},
    {level:2,name:"Health Verified",requirements:["Pemeriksaan fisik","Vaksin dan antiparasit aktif","Tes reproduksi dan penyakit menular"]},
    {level:3,name:"Genetic Cleared",requirements:["Semua Level 2","Panel genetik sesuai ras","Ortopedi, jantung, dan mata sesuai indikasi"]},
    {level:4,name:"Genetic & Pedigree Verified",requirements:["Semua Level 3","Pedigree terverifikasi","Silsilah induk untuk pemeriksaan kekerabatan"]},
  ],
  minimum_age_months:{dog:18,cat:12,rabbit:8,other:12}, report_validity_days:180,
  blocked_conditions:["Brucellosis atau penyakit menular positif","Risiko genetik kritis pada pairing","Hubungan induk–anak atau saudara kandung","Pet dinyatakan tidak layak oleh dokter","Laporan kesehatan kedaluwarsa"],
};

const demoHealth: PawDatingHealthReport = {
  id:"health-demo", examination_at:"2026-08-10", valid_until:"2027-02-06", clinic_name:"Slivadoc Veterinary Center", veterinarian_name:"drh. Maya Anindita", veterinarian_license:"STRV-JKT-3174-2025", verification_level:4, verification_status:"verified", eligibility_status:"eligible", risk_level:"low",
  physical_exam:{general:"Normal",body_condition_score:"5/9",reproductive:"Normal"}, vaccination_checks:{rabies:"Valid",core:"Valid"}, parasite_checks:{fecal:"Negative",ectoparasite:"Negative"}, infectious_disease_tests:{brucellosis:"Negative"}, reproductive_tests:{fertility:"Fit",ultrasound:"Normal"}, genetic_tests:[{test:"PRA1 / PRA2",result:"Clear"},{test:"Ichthyosis",result:"Clear"},{test:"Degenerative Myelopathy",result:"Clear"}], orthopedic_checks:{hip:"OFA Good",elbow:"Normal"}, cardiac_checks:{echo:"Clear"}, ophthalmic_checks:{eye_exam:"Clear"}, laboratory_results:[{panel:"CBC / Chemistry",result:"Dalam nilai rujukan"}], findings:"Tidak ada temuan yang membatasi.", recommendations:"Pertahankan berat badan dan lakukan review pra-breeding.", restrictions:[],
};

const levelTone = ["", "identity", "health", "genetic", "pedigree"];
const speciesEmoji = (profile:PawDatingProfile) => profile.species === "cat" ? "🐈" : profile.species === "rabbit" ? "🐇" : "🐕";
const ageText = (months:number) => `${Math.floor(months/12)} th ${months%12} bln`;
const titleCase = (value:string) => value.replaceAll("_"," ").replace(/\b\w/g,(char)=>char.toUpperCase());

export default function PawDatingExperience({pet,notify}:{pet:Pet;notify:Notify}) {
  const [tab,setTab] = useState<Tab>("discover");
  const [profiles,setProfiles] = useState<PawDatingProfile[]>(demoProfiles);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState("");
  const [species,setSpecies] = useState("");
  const [sex,setSex] = useState("");
  const [level,setLevel] = useState("2");
  const [health,setHealth] = useState("80");
  const [city,setCity] = useState("");
  const [distance,setDistance] = useState("200");
  const [selected,setSelected] = useState<PawDatingProfile|null>(null);
  const [myProfiles,setMyProfiles] = useState<PawDatingProfile[]>([]);
  const [interests,setInterests] = useState<PawDatingInterest[]>([]);
  const [standards,setStandards] = useState<PawDatingStandards>(demoStandards);
  const [sourceProfileId,setSourceProfileId] = useState("");
  const [compatibility,setCompatibility] = useState<PawDatingCompatibility|null>(null);
  const [interestOpen,setInterestOpen] = useState(false);
  const [message,setMessage] = useState("Halo, kami tertarik berdiskusi setelah meninjau laporan kesehatan kedua pet.");
  const [createOpen,setCreateOpen] = useState(false);
  const [submitting,setSubmitting] = useState(false);

  useEffect(()=>{ void loadProfiles(); },[species,sex,level,health,city,distance]);
  useEffect(()=>{ getPawDatingStandards().then(setStandards).catch(()=>setStandards(demoStandards)); },[]);
  useEffect(()=>{ if(tab==="mine"||tab==="requests") void loadPrivateData(); },[tab]);

  async function loadProfiles(){
    setLoading(true);
    const params=new URLSearchParams();
    if(species) params.set("species",species); if(sex) params.set("sex",sex); if(level) params.set("min_level",level); if(health) params.set("min_health_score",health); if(city) params.set("city",city); if(distance) params.set("max_distance_km",distance);
    try { const result=await getPawDatingProfiles(params.toString()); setProfiles(result.data); }
    catch { setProfiles(demoProfiles); }
    finally { setLoading(false); }
  }

  async function loadPrivateData(){
    if(!isPetOwnerAuthenticated()) return;
    try {
      const [mine,requests]=await Promise.all([getMyPawDatingProfiles(),getPawDatingInterests()]);
      setMyProfiles(mine.data); setInterests(requests.data); if(!sourceProfileId&&mine.data[0]) setSourceProfileId(mine.data[0].id);
    } catch(error){ notify(error instanceof Error?error.message:"Data akun belum dapat dimuat"); }
  }

  const visibleProfiles=useMemo(()=>profiles.filter((profile)=>{
    const needle=search.toLowerCase().trim();
    return (!needle||`${profile.name} ${profile.breed} ${profile.city}`.toLowerCase().includes(needle))&&(!species||profile.species===species)&&(!sex||profile.sex===sex)&&profile.profile_level>=Number(level||1)&&profile.health_score>=Number(health||0)&&(!city||profile.city.toLowerCase().includes(city.toLowerCase()))&&(!profile.distance_km||profile.distance_km<=Number(distance||9999));
  }),[profiles,search,species,sex,level,health,city,distance]);

  async function openProfile(profile:PawDatingProfile){
    setSelected(profile); setCompatibility(null);
    try { const detail=await getPawDatingProfile(profile.id); setSelected(detail); } catch { /* keep complete offline preview */ }
  }

  async function checkCompatibility(){
    if(!selected) return;
    if(!isPetOwnerAuthenticated()){ window.dispatchEvent(new Event("slivadoc:login-required")); return; }
    let source=sourceProfileId;
    if(!source){
      try { const mine=await getMyPawDatingProfiles(); setMyProfiles(mine.data); source=mine.data[0]?.id??""; setSourceProfileId(source); } catch { /* handled below */ }
    }
    if(!source){ notify("Buat profil PAW Dating pet Anda terlebih dahulu"); setSelected(null); setTab("mine"); return; }
    setSubmitting(true);
    try { const result=await getPawDatingCompatibility(selected.id,source); setCompatibility(result.compatibility); }
    catch(error){ notify(error instanceof Error?error.message:"Skor belum dapat dihitung"); }
    finally { setSubmitting(false); }
  }

  async function sendInterest(event:FormEvent){
    event.preventDefault(); if(!selected||!sourceProfileId) return; setSubmitting(true);
    try { const result=await sendPawDatingInterest(selected.id,{source_profile_id:sourceProfileId,interest_type:"interest",introduction_message:message}); setCompatibility(result.compatibility); setInterestOpen(false); notify(result.message); }
    catch(error){ notify(error instanceof Error?error.message:"Permintaan belum dapat dikirim"); }
    finally { setSubmitting(false); }
  }

  async function respond(interest:PawDatingInterest,action:"accept"|"decline"){
    try { const result=await respondPawDatingInterest(interest.id,action); setInterests((items)=>items.map((item)=>item.id===interest.id?{...item,status:result.status}:item)); notify(action==="accept"?"Match dibuat. Ruang diskusi sudah aman dibuka.":"Permintaan ditolak dengan aman."); }
    catch(error){ notify(error instanceof Error?error.message:"Respons belum dapat disimpan"); }
  }

  const requireLogin=()=>{ if(!isPetOwnerAuthenticated()){window.dispatchEvent(new Event("slivadoc:login-required"));return false}return true };

  return <section className="pawdating-shell">
    <div className="pawdating-hero">
      <div className="pawdating-hero-copy">
        <span className="pawdating-kicker">♡ RESPONSIBLE PET MATCHMAKING</span>
        <h2>Pasangan tepat dimulai dari<br/><em>kesehatan yang jelas.</em></h2>
        <p>Temukan pet yang kompatibel berdasarkan kesehatan, genetik, silsilah, karakter, usia, dan jarak—dengan verifikasi dokter serta persetujuan dua arah.</p>
        <div className="pawdating-hero-actions">
          <button className="paw-primary" type="button" onClick={()=>setTab("discover")}>Temukan pasangan</button>
          <button className="paw-secondary" type="button" onClick={()=>{if(requireLogin()){setCreateOpen(true)}}}>+ Buat profil pet</button>
        </div>
        <div className="paw-trust-row"><span>✓ Health report</span><span>✓ Genetic screening</span><span>✓ Mutual consent</span></div>
      </div>
      <div className="pawdating-hero-visual" aria-label="Pet parent bersama anjing dan kucing">
        <div className="paw-hero-score"><strong>96</strong><span>Health score</span></div>
        <div className="paw-hero-verified">✓ Level 4 verified</div>
      </div>
    </div>

    <div className="paw-welfare-banner"><span>🛡️</span><div><strong>Welfare-first, bukan sekadar swipe.</strong><p>PAW Dating tidak menjamin hasil breeding. Keputusan akhir wajib mengikuti pemeriksaan dan rekomendasi dokter hewan.</p></div><button type="button" onClick={()=>setTab("standards")}>Lihat standar →</button></div>

    <nav className="paw-tabs" aria-label="Menu PAW Dating">
      {([{id:"discover",label:"Jelajahi",count:visibleProfiles.length},{id:"mine",label:"Profil saya"},{id:"requests",label:"Permintaan",count:interests.filter((item)=>item.status==="pending").length},{id:"standards",label:"Health standards"}] as Array<{id:Tab;label:string;count?:number}>).map((item)=><button key={item.id} type="button" className={tab===item.id?"active":""} onClick={()=>setTab(item.id)}>{item.label}{item.count!==undefined&&<small>{item.count}</small>}</button>)}
    </nav>

    {tab==="discover"&&<>
      <div className="paw-filters">
        <label className="paw-search"><span>⌕</span><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Cari nama, ras, atau kota..." /></label>
        <label><span>Spesies</span><select value={species} onChange={(event)=>setSpecies(event.target.value)}><option value="">Semua</option><option value="dog">Anjing</option><option value="cat">Kucing</option><option value="rabbit">Kelinci</option></select></label>
        <label><span>Gender</span><select value={sex} onChange={(event)=>setSex(event.target.value)}><option value="">Semua</option><option value="male">Jantan</option><option value="female">Betina</option></select></label>
        <label><span>Minimum level</span><select value={level} onChange={(event)=>setLevel(event.target.value)}><option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3</option><option value="4">Level 4</option></select></label>
        <label><span>Health score</span><select value={health} onChange={(event)=>setHealth(event.target.value)}><option value="0">Semua</option><option value="80">80+</option><option value="90">90+</option><option value="95">95+</option></select></label>
        <label><span>Jarak</span><select value={distance} onChange={(event)=>setDistance(event.target.value)}><option value="25">≤ 25 km</option><option value="100">≤ 100 km</option><option value="200">≤ 200 km</option><option value="9999">Semua</option></select></label>
      </div>
      <div className="paw-result-head"><div><h3>Pet terverifikasi untuk {pet.name}</h3><p>{visibleProfiles.length} profil sesuai filter dan standar minimum Anda.</p></div><label>Kota <input value={city} onChange={(event)=>setCity(event.target.value)} placeholder="Jakarta Selatan" /></label></div>
      {loading?<div className="paw-loading"><i/><i/><i/></div>:visibleProfiles.length===0?<Empty title="Belum ada profil yang sesuai" text="Coba longgarkan level, health score, jarak, atau kota." action="Reset filter" onAction={()=>{setSpecies("");setSex("");setLevel("1");setHealth("0");setCity("");setDistance("9999")}}/>:<div className="paw-profile-grid">{visibleProfiles.map((profile)=><ProfileCard key={profile.id} profile={profile} onOpen={()=>void openProfile(profile)} />)}</div>}
    </>}

    {tab==="mine"&&<PrivateGate title="Kelola profil PAW Dating" text="Login diperlukan untuk membuat profil, mengunggah health report, dan mengatur visibilitas." requireLogin={requireLogin}>
      <div className="paw-section-head"><div><h3>Profil pet saya</h3><p>Setiap pet melewati verifikasi bertahap sebelum tampil ke publik.</p></div><button className="paw-primary" type="button" onClick={()=>setCreateOpen(true)}>+ Buat profil</button></div>
      {myProfiles.length===0?<Empty title="Belum ada profil PAW Dating" text="Buat profil, lengkapi screening kesehatan, lalu kirim untuk review dokter." action="Mulai verifikasi" onAction={()=>setCreateOpen(true)}/>:<div className="paw-my-grid">{myProfiles.map((profile)=><article key={profile.id} className="paw-my-card"><div className={`paw-avatar ${profile.species}`}>{speciesEmoji(profile)}</div><div><span className={`paw-level ${levelTone[profile.profile_level]}`}>L{profile.profile_level} · {profile.level_name?.split("·")[1]}</span><h4>{profile.name}</h4><p>{profile.breed} · {profile.city}</p><div className="paw-progress"><i style={{width:`${profile.health_score}%`}}/></div><small>Health score {profile.health_score}/100 · Status {titleCase(profile.status??"draft")}</small></div><button type="button" onClick={()=>notify(`Editor profil ${profile.name} dibuka`)}>Kelola →</button></article>)}</div>}
    </PrivateGate>}

    {tab==="requests"&&<PrivateGate title="Permintaan dan match" text="Identitas dan ruang percakapan hanya terbuka setelah kedua pet parent menyetujui." requireLogin={requireLogin}>
      <div className="paw-section-head"><div><h3>Permintaan pasangan</h3><p>Tinjau profil dan laporan kesehatan sebelum menerima.</p></div><span className="paw-safe-chip">🔒 Kontak tetap privat</span></div>
      {interests.length===0?<Empty title="Belum ada permintaan" text="Ketertarikan yang Anda kirim atau terima akan muncul di sini." action="Mulai jelajahi" onAction={()=>setTab("discover")}/>:<div className="paw-request-list">{interests.map((interest)=><article key={interest.id}><div className="paw-request-icon">♡</div><div><span>{interest.direction==="incoming"?"Permintaan masuk":"Terkirim"}</span><h4>{interest.source_name} × {interest.target_name}</h4><p>{interest.introduction_message||"Ingin mendiskusikan kecocokan pet."}</p><small>{titleCase(interest.interest_type)} · {new Date(interest.created_at).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</small></div><div className="paw-request-status"><b className={interest.status}>{titleCase(interest.status)}</b>{interest.direction==="incoming"&&interest.status==="pending"&&<><button type="button" onClick={()=>void respond(interest,"accept")}>Terima</button><button className="muted" type="button" onClick={()=>void respond(interest,"decline")}>Tolak</button></>}</div></article>)}</div>}
    </PrivateGate>}

    {tab==="standards"&&<StandardsView standards={standards} notify={notify}/>} 

    {selected&&<ProfileDetail profile={selected} health={selected.health_report??demoHealth} compatibility={compatibility} sourceProfiles={myProfiles} sourceProfileId={sourceProfileId} setSourceProfileId={setSourceProfileId} onClose={()=>{setSelected(null);setCompatibility(null)}} onCheck={()=>void checkCompatibility()} onInterest={()=>{if(requireLogin()){if(!compatibility){void checkCompatibility()}setInterestOpen(true)}}} submitting={submitting} notify={notify}/>} 
    {interestOpen&&selected&&<div className="paw-modal-backdrop" onMouseDown={()=>setInterestOpen(false)}><form className="paw-small-modal" onSubmit={sendInterest} onMouseDown={(event)=>event.stopPropagation()}><button className="paw-modal-close" type="button" onClick={()=>setInterestOpen(false)}>×</button><span className="paw-modal-mark">♡</span><h3>Kirim ketertarikan ke {selected.name}</h3><p>Pesan akan diteruskan ke pet parent. Nomor telepon tetap tersembunyi hingga keduanya setuju.</p><label>Pesan perkenalan<textarea value={message} minLength={20} maxLength={1000} onChange={(event)=>setMessage(event.target.value)} required/></label><div className="paw-modal-actions"><button className="paw-secondary" type="button" onClick={()=>setInterestOpen(false)}>Batal</button><button className="paw-primary" type="submit" disabled={submitting}>{submitting?"Mengirim...":"Kirim dengan aman"}</button></div></form></div>}
    {createOpen&&<CreateProfileModal pet={pet} onClose={()=>setCreateOpen(false)} onCreated={()=>{setCreateOpen(false);void loadPrivateData();setTab("mine")}} notify={notify}/>} 
  </section>;
}

function ProfileCard({profile,onOpen}:{profile:PawDatingProfile;onOpen:()=>void}){
  return <article className="paw-profile-card" onClick={onOpen} tabIndex={0} onKeyDown={(event)=>{if(event.key==="Enter")onOpen()}}>
    <div className={`paw-profile-art ${profile.species}`}><span>{speciesEmoji(profile)}</span><div className={`paw-level ${levelTone[profile.profile_level]}`}>✦ Level {profile.profile_level}</div><button type="button" aria-label={`Simpan ${profile.name}`} onClick={(event)=>{event.stopPropagation();window.dispatchEvent(new CustomEvent("slivadoc:notice",{detail:`${profile.name} disimpan`}))}}>♡</button></div>
    <div className="paw-profile-body"><div className="paw-profile-name"><div><h4>{profile.name}</h4><p>{profile.breed} · {profile.sex==="female"?"Betina":"Jantan"}</p></div><div className="paw-score"><strong>{profile.health_score}</strong><span>health</span></div></div><div className="paw-profile-meta"><span>◷ {ageText(profile.age_months)}</span><span>⌖ {profile.distance_km?`${profile.distance_km} km`:profile.city}</span><span>♙ {titleCase(profile.pedigree_status)}</span></div><div className="paw-tags">{profile.temperament.slice(0,3).map((tag)=><span key={tag}>{titleCase(tag)}</span>)}</div><div className="paw-clearance"><i>✓</i><div><b>{profile.eligibility_status==="eligible"?"Layak berdasarkan report":"Layak bersyarat"}</b><small>Valid s.d. {new Date(profile.health_valid_until).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</small></div><strong>{profile.risk_level==="low"?"Low risk":"Review"}</strong></div></div>
  </article>;
}

function ProfileDetail({profile,health,compatibility,sourceProfiles,sourceProfileId,setSourceProfileId,onClose,onCheck,onInterest,submitting,notify}:{profile:PawDatingProfile;health:PawDatingHealthReport;compatibility:PawDatingCompatibility|null;sourceProfiles:PawDatingProfile[];sourceProfileId:string;setSourceProfileId:(value:string)=>void;onClose:()=>void;onCheck:()=>void;onInterest:()=>void;submitting:boolean;notify:Notify}){
  const sections=[
    ["Pemeriksaan fisik",health.physical_exam],["Vaksinasi",health.vaccination_checks],["Parasit",health.parasite_checks],["Penyakit menular",health.infectious_disease_tests],["Reproduksi",health.reproductive_tests],["Ortopedi",health.orthopedic_checks],["Jantung",health.cardiac_checks],["Mata",health.ophthalmic_checks],
  ] as Array<[string,Record<string,string>|undefined]>;
  return <div className="paw-drawer-backdrop" onMouseDown={onClose}><aside className="paw-detail" onMouseDown={(event)=>event.stopPropagation()}><button className="paw-modal-close" type="button" onClick={onClose}>×</button>
    <div className={`paw-detail-cover ${profile.species}`}><span>{speciesEmoji(profile)}</span><div className={`paw-level ${levelTone[profile.profile_level]}`}>✦ Level {profile.profile_level} verified</div></div>
    <div className="paw-detail-head"><div><h3>{profile.name} <small>{profile.sex==="female"?"♀":"♂"}</small></h3><p>{profile.breed} · {ageText(profile.age_months)} · {profile.city}</p></div><div className="paw-score large"><strong>{profile.health_score}</strong><span>health score</span></div></div>
    <p className="paw-detail-desc">{profile.description}</p><div className="paw-tags">{[...profile.temperament,...profile.traits].slice(0,5).map((item)=><span key={item}>{titleCase(item)}</span>)}</div>
    <section className="paw-report"><div className="paw-report-head"><div><span>🩺</span><div><h4>Verified health report</h4><p>{health.clinic_name} · {health.veterinarian_name}</p></div></div><b>✓ VERIFIED</b></div><div className="paw-report-summary"><div><span>Status breeding</span><strong>{titleCase(health.eligibility_status)}</strong></div><div><span>Risk level</span><strong>{titleCase(health.risk_level)}</strong></div><div><span>Valid sampai</span><strong>{new Date(health.valid_until).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</strong></div></div>
      <div className="paw-report-grid">{sections.map(([title,data])=><details key={title}><summary><span>✓ {title}</span><b>Clear</b></summary><div>{Object.entries(data??{status:"Terdokumentasi"}).map(([key,value])=><p key={key}><span>{titleCase(key)}</span><strong>{titleCase(String(value))}</strong></p>)}</div></details>)}</div>
      <details className="paw-genetic"><summary><span>🧬 Panel genetik spesifik ras</span><b>{health.genetic_tests?.length??0} hasil</b></summary><div>{(health.genetic_tests??[]).map((test)=><p key={test.test}><span>{test.test}</span><strong>✓ {test.result}</strong></p>)}</div></details>
      <div className="paw-vet-note"><strong>Catatan dokter</strong><p>{health.findings} {health.recommendations}</p><small>STRV {health.veterinarian_license} · Ditandatangani secara digital</small></div>
    </section>
    {compatibility&&<section className={`paw-compatibility ${compatibility.grade}`}><div className="paw-compat-head"><div className="paw-compat-ring" style={{"--score":`${compatibility.score*3.6}deg`} as CSSProperties}><strong>{compatibility.score}</strong><span>/100</span></div><div><span>Compatibility report</span><h4>{titleCase(compatibility.grade)}</h4><p>Skor membantu screening awal, bukan pengganti dokter.</p></div></div><div className="paw-breakdown">{Object.entries(compatibility.breakdown).map(([key,value])=><div key={key}><span>{titleCase(key)}</span><i><b style={{width:`${Math.min(100,value*5)}%`}}/></i><strong>{value}</strong></div>)}</div>{compatibility.risk_flags.length>0&&<div className="paw-risk-flags">{compatibility.risk_flags.map((flag)=><span key={flag}>! {flag}</span>)}</div>}</section>}
    <div className="paw-detail-actions">{sourceProfiles.length>0&&<label>Bandingkan dengan<select value={sourceProfileId} onChange={(event)=>setSourceProfileId(event.target.value)}>{sourceProfiles.map((source)=><option key={source.id} value={source.id}>{source.name} · L{source.profile_level}</option>)}</select></label>}<button className="paw-secondary" type="button" disabled={submitting} onClick={onCheck}>{submitting?"Menghitung...":"Hitung kecocokan"}</button><button className="paw-primary" type="button" onClick={onInterest}>♡ Kirim ketertarikan</button></div>
    <div className="paw-safety-actions"><button type="button" onClick={()=>notify(`${profile.name} disimpan ke favorit`)}>♡ Simpan</button><button type="button" onClick={()=>notify("Form laporan dibuka untuk tim welfare")}>⚑ Laporkan profil</button></div>
  </aside></div>;
}

function StandardsView({standards,notify}:{standards:PawDatingStandards;notify:Notify}){
  return <div className="paw-standards"><div className="paw-standards-intro"><span>SLIVADOC WELFARE STANDARD</span><h3>Empat level verifikasi,<br/>satu tujuan: pet yang sehat.</h3><p>Semakin tinggi level, semakin lengkap data kesehatan dan silsilah yang diverifikasi oleh dokter serta tim welfare Slivadoc.</p><button className="paw-secondary" type="button" onClick={()=>notify("Panduan health screening disiapkan untuk diunduh")}>↓ Unduh checklist</button></div><div className="paw-level-list">{standards.levels.map((item)=><article key={item.level} className={levelTone[item.level]}><div><strong>0{item.level}</strong><span>LEVEL</span></div><section><h4>{item.name}</h4>{item.requirements.map((requirement)=><p key={requirement}>✓ {requirement}</p>)}</section>{item.level===2&&<em>Minimum publish</em>}</article>)}</div><div className="paw-blocked"><div><span>⛔</span><div><h4>Kondisi yang otomatis memblokir pairing</h4><p>Sistem tidak akan mengirim interest bila salah satu kondisi berikut terdeteksi.</p></div></div><ul>{standards.blocked_conditions.map((condition)=><li key={condition}>{condition}</li>)}</ul></div><div className="paw-principles">{standards.principles.map((principle,index)=><article key={principle}><span>0{index+1}</span><p>{principle}</p></article>)}</div></div>;
}

function PrivateGate({title,text,requireLogin,children}:{title:string;text:string;requireLogin:()=>boolean;children:ReactNode}){
  if(isPetOwnerAuthenticated()) return <>{children}</>;
  return <div className="paw-login-gate"><div>🔐</div><span>PRIVATE & SECURE</span><h3>{title}</h3><p>{text}</p><button className="paw-primary" type="button" onClick={requireLogin}>Login untuk melanjutkan</button><small>Kontak dan medical document dienkripsi serta hanya dibuka sesuai izin.</small></div>;
}

function Empty({title,text,action,onAction}:{title:string;text:string;action:string;onAction:()=>void}){return <div className="paw-empty"><span>♡</span><h4>{title}</h4><p>{text}</p><button className="paw-secondary" type="button" onClick={onAction}>{action}</button></div>}

function CreateProfileModal({pet,onClose,onCreated,notify}:{pet:Pet;onClose:()=>void;onCreated:()=>void;notify:Notify}){
  const [step,setStep]=useState(1); const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({city:"Jakarta Selatan",description:`${pet.name} adalah ${pet.breed} yang sehat, ramah, dan dibesarkan bersama keluarga.`,pedigree:"none",registry:"",registration:"",temperament:"friendly, calm, social",preferred:pet.breed,maxDistance:"100",clinic:"Slivadoc Veterinary Center",doctor:"drh. Maya Anindita",license:"STRV-JKT-3174-2025",exam:"2026-08-24",valid:"2027-02-20"});
  const petIds:Record<string,string>={"pet-milo":"31000000-0000-4000-8000-000000000001","pet-luna":"31000000-0000-4000-8000-000000000002"};
  const set=(key:string,value:string)=>setForm((current)=>({...current,[key]:value}));
  async function save(){setBusy(true);try{const profile=await createPawDatingProfile({pet_id:petIds[pet.id]??pet.id,city:form.city,pedigree_status:form.pedigree,registry_name:form.registry,registration_number:form.registration,description:form.description,temperament:form.temperament.split(",").map((item)=>item.trim()).filter(Boolean),traits:["family raised"],preferred_breeds:form.preferred.split(",").map((item)=>item.trim()).filter(Boolean),preferred_age_min_months:18,preferred_age_max_months:84,max_distance_km:Number(form.maxDistance),photo_urls:[],visibility:"public"});await createPawDatingHealthReport(profile.id,{examination_at:`${form.exam}T00:00:00Z`,valid_until:`${form.valid}T00:00:00Z`,clinic_name:form.clinic,veterinarian_name:form.doctor,veterinarian_license:form.license,physical_exam:{general:"normal"},vaccination_checks:{status:"valid"},parasite_checks:{status:"negative"},infectious_disease_tests:{status:"pending review"},reproductive_tests:{status:"pending review"},genetic_tests:[],orthopedic_checks:{},cardiac_checks:{},ophthalmic_checks:{},laboratory_results:[],findings:"",recommendations:"",restrictions:[],document_urls:[]});await submitPawDatingProfile(profile.id);notify("Profil dan laporan kesehatan berhasil dikirim untuk review");onCreated()}catch(error){notify(error instanceof Error?error.message:"Profil belum dapat dibuat")}finally{setBusy(false)}}
  return <div className="paw-modal-backdrop" onMouseDown={onClose}><div className="paw-create-modal" onMouseDown={(event)=>event.stopPropagation()}><button className="paw-modal-close" type="button" onClick={onClose}>×</button><div className="paw-create-head"><span>PAW DATING PROFILE</span><h3>Verifikasi {pet.name}</h3><div>{[1,2,3].map((item)=><i key={item} className={step>=item?"active":""}>{item}</i>)}</div></div>{step===1&&<div className="paw-form-step"><h4>Identitas & preferensi</h4><div className="paw-pet-preview"><span>{pet.avatar}</span><div><strong>{pet.name}</strong><p>{pet.breed} · {pet.gender} · {pet.age}</p></div><b>✓ Pet saya</b></div><div className="paw-form-grid"><label>Kota<input value={form.city} onChange={(event)=>set("city",event.target.value)} required/></label><label>Jarak maksimum<select value={form.maxDistance} onChange={(event)=>set("maxDistance",event.target.value)}><option value="25">25 km</option><option value="100">100 km</option><option value="200">200 km</option></select></label><label>Pedigree<select value={form.pedigree} onChange={(event)=>set("pedigree",event.target.value)}><option value="none">Belum ada</option><option value="registered">Registered</option><option value="pedigree">Pedigree</option><option value="champion">Champion</option></select></label><label>Registry<input value={form.registry} onChange={(event)=>set("registry",event.target.value)} placeholder="PERKIN / ICA"/></label><label className="wide">Nomor registrasi<input value={form.registration} onChange={(event)=>set("registration",event.target.value)} placeholder="Opsional"/></label><label className="wide">Tentang {pet.name}<textarea minLength={20} value={form.description} onChange={(event)=>set("description",event.target.value)} required/></label><label>Temperamen<input value={form.temperament} onChange={(event)=>set("temperament",event.target.value)} /></label><label>Ras preferensi<input value={form.preferred} onChange={(event)=>set("preferred",event.target.value)} /></label></div></div>}{step===2&&<div className="paw-form-step"><h4>Dokumen health screening</h4><p className="paw-form-info">Data ini akan berstatus <b>submitted</b> dan hanya naik level setelah dokter Slivadoc memverifikasi dokumen asli.</p><div className="paw-form-grid"><label>Klinik / rumah sakit<input value={form.clinic} onChange={(event)=>set("clinic",event.target.value)} required/></label><label>Nama dokter<input value={form.doctor} onChange={(event)=>set("doctor",event.target.value)} required/></label><label>Nomor STRV / SIP<input value={form.license} onChange={(event)=>set("license",event.target.value)} /></label><label>Tanggal pemeriksaan<input type="date" value={form.exam} onChange={(event)=>set("exam",event.target.value)} required/></label><label>Valid sampai<input type="date" value={form.valid} onChange={(event)=>set("valid",event.target.value)} required/></label><label>Dokumen asli<button className="paw-upload" type="button" onClick={()=>notify("Pemilih dokumen health report dibuka")}>＋ Unggah PDF / foto</button></label></div><div className="paw-checklist">{["Pemeriksaan fisik & BCS","Vaksin dan antiparasit","Penyakit menular","Pemeriksaan reproduksi","Panel genetik sesuai ras","Ortopedi / jantung / mata"].map((item,index)=><label key={item}><input type="checkbox" defaultChecked={index<4}/><span>{item}</span><small>{index<4?"Terlampir":"Jika tersedia"}</small></label>)}</div></div>}{step===3&&<div className="paw-form-step"><h4>Persetujuan welfare</h4><div className="paw-review-card"><span>{pet.avatar}</span><div><h4>{pet.name}</h4><p>{form.city} · {titleCase(form.pedigree)} · radius {form.maxDistance} km</p><b>Level awal: Identity Verified</b></div></div><label className="paw-consent"><input type="checkbox" required/><span>Saya menyatakan data pet dan dokumen kesehatan benar, memiliki hak atas pet ini, dan menyetujui verifikasi dokter serta moderasi welfare Slivadoc.</span></label><label className="paw-consent"><input type="checkbox" required/><span>Saya memahami hasil kompatibilitas bukan izin otomatis untuk breeding dan pemeriksaan pra-breeding tetap wajib.</span></label></div>}<div className="paw-form-actions"><button className="paw-secondary" type="button" onClick={()=>step===1?onClose():setStep((value)=>value-1)}>{step===1?"Batal":"Kembali"}</button>{step<3?<button className="paw-primary" type="button" onClick={()=>setStep((value)=>value+1)}>Lanjutkan →</button>:<button className="paw-primary" type="button" disabled={busy} onClick={()=>void save()}>{busy?"Mengirim...":"Kirim untuk review"}</button>}</div></div></div>;
}
