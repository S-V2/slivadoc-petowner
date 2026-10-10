"use client";

import type { ReactNode } from "react";
import { openingHoursRows } from "../../lib/clinic-directory";
import { Icon } from "../Icon";
import { LocalizedCopy } from "../LocalizedCopy";
import { usePetOwnerI18n } from "../PetOwnerI18n";

export function PlaceVisitCard({
  title, eyebrow = "RENCANAKAN KUNJUNGAN", address, hours, directions, phone,
  website, status, note, className = "",
}: {
  title: string;
  eyebrow?: string;
  address: string;
  hours: Record<string, unknown>;
  directions?: string;
  phone?: string;
  website?: string;
  status?: ReactNode;
  note?: string;
  className?: string;
}) {
  const { t } = usePetOwnerI18n();
  const rows = openingHoursRows(hours);
  return (
    <section className={`place-visit-card ${className}`} aria-label={t(eyebrow === "CABANG YANG KAMU PILIH" ? "Cabang yang dipilih" : "Informasi kunjungan")}>
      <header>
        <span className="place-detail-eyebrow"><LocalizedCopy>{eyebrow}</LocalizedCopy></span>
        <h2><LocalizedCopy preserve>{title}</LocalizedCopy></h2>
        {status}
      </header>
      <div className="place-visit-address"><span><Icon name="map" size={20} /></span><p><LocalizedCopy preserve>{address}</LocalizedCopy></p></div>
      <div className="place-visit-hours">
        <h3><Icon name="clock" size={18} /><LocalizedCopy>{"Jam operasional"}</LocalizedCopy></h3>
        {rows.length ? <dl>{rows.map(row => <div key={row.day}><dt><LocalizedCopy>{row.day}</LocalizedCopy></dt><dd><LocalizedCopy>{row.hours}</LocalizedCopy></dd></div>)}</dl> : <p><LocalizedCopy>{"Konfirmasi jam operasional kepada pengelola sebelum berkunjung."}</LocalizedCopy></p>}
      </div>
      <div className="place-visit-actions">
        {directions ? <a className="primary-button" href={directions} target="_blank" rel="noreferrer"><Icon name="map" size={17} /><LocalizedCopy>{"Petunjuk arah"}</LocalizedCopy></a> : null}
        {phone ? <a className="secondary-button" href={`tel:${phone.replace(/[^+0-9]/g, "")}`}><Icon name="phone" size={17} /><LocalizedCopy>{"Hubungi tempat"}</LocalizedCopy></a> : null}
        {/^https:\/\//.test(website ?? "") ? <a className="secondary-button" href={website} target="_blank" rel="noreferrer"><Icon name="arrow" size={17} /><LocalizedCopy>{"Website tempat"}</LocalizedCopy></a> : null}
      </div>
      {note ? <p className="place-visit-note"><Icon name="paw" size={16} /><LocalizedCopy>{note}</LocalizedCopy></p> : null}
    </section>
  );
}
