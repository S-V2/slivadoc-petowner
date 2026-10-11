"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDiscoveryBranch, type DiscoveryBranch } from "../../lib/platform-api";
import { branchPlace, clinicTypeLabel, directionsUrl } from "../../lib/clinic-directory";
import { PlaceVisitCard } from "../places/PlaceVisitCard";
import { ClinicOpenState } from "./ClinicBranchInfo";
import { LocalizedCopy } from "../LocalizedCopy";
import { usePetOwnerI18n } from "../PetOwnerI18n";
import "./manual-clinic.css";

export default function ManualClinicDetail({ placeID }: { placeID: string }) {
  const { language } = usePetOwnerI18n();
  const [result, setResult] = useState<{ id: string; branch?: DiscoveryBranch; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getDiscoveryBranch(placeID).then((branch) => {
      if (active) setResult({ id: placeID, branch });
    }).catch(() => {
      if (active) setResult({ id: placeID, error: "Tempat tidak tersedia atau belum dapat dimuat." });
    });
    return () => { active = false; };
  }, [placeID, attempt]);
  const branch = result?.id === placeID ? result.branch : undefined;
  return <main className="manual-clinic-detail">
    <Link className="manual-clinic-back" href="/?view=clinics">← <LocalizedCopy>{"Klinik & Petshop"}</LocalizedCopy></Link>
    {!result || result.id !== placeID ? <p role="status"><LocalizedCopy>{"Memuat informasi tempat…"}</LocalizedCopy></p> : !branch ? <section role="alert"><h1><LocalizedCopy>{result.error || "Tempat tidak tersedia"}</LocalizedCopy></h1><button className="secondary-button" onClick={() => setAttempt((n) => n + 1)}><LocalizedCopy>{"Coba lagi"}</LocalizedCopy></button></section> : <>
      <header className="manual-clinic-hero">
        {(branch.banner_url || branch.logo_url) && <div className="manual-clinic-photo"><Image src={(branch.banner_url || branch.logo_url)!} fill unoptimized sizes="(max-width: 800px) 100vw, 900px" alt={branch.business_name} /></div>}
        <div className="manual-clinic-title"><span>{clinicTypeLabel(branch.type, language)} · {branch.city}</span><h1>{branch.business_name}</h1><span className="clinic-directory-verification" data-verified={branch.verified === true}>{branch.verified ? "✓ Verified" : "Informasi tempat"}</span></div>
      </header>
      {branch.source === "manual" && <p className="manual-clinic-notice"><LocalizedCopy>{"Informasi tempat ini ditambahkan oleh Slivadoc. Pengelola belum memiliki akun di Slivadoc. Hubungi tempat langsung untuk memastikan layanan dan jam buka."}</LocalizedCopy></p>}
      {branch.description && <p className="manual-clinic-description">{branch.description}</p>}
      {branch.rating !== null && branch.review_count > 0 && <p className="manual-clinic-rating">★ {branch.rating.toFixed(1)} · {branch.review_count} <LocalizedCopy>{branch.source === "manual" ? "ulasan referensi dari data listing" : "ulasan"}</LocalizedCopy></p>}
      <PlaceVisitCard title={branch.business_name} address={[branch.address, branchPlace(branch)].filter(Boolean).join(", ")} hours={branch.opening_hours} phone={branch.phone} website={branch.website} directions={directionsUrl(branch)} status={<ClinicOpenState branch={branch} />} />
      {branch.source !== "manual" && branch.business_id && <Link className="primary-button" href={`/?view=shop&store=${branch.business_id}&branch=${branch.branch_id}`}><LocalizedCopy>{"Lihat toko"}</LocalizedCopy></Link>}
      <small className="manual-clinic-id">Place ID: {branch.place_id || branch.branch_id}</small>
    </>}
  </main>;
}
