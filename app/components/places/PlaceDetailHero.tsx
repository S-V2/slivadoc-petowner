"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { LocalizedCopy } from "../LocalizedCopy";
import { usePetOwnerI18n } from "../PetOwnerI18n";

type PlaceStat = { icon: IconName; value: string | number; label: string };

export function PlaceDetailHero({
  media, eyebrow, title, location, description, identity, status, actions, stats,
  className = "", headingLevel = 1,
}: {
  media: ReactNode;
  eyebrow: ReactNode;
  title: string;
  location: string;
  description?: string;
  identity?: ReactNode;
  status?: ReactNode;
  actions: ReactNode;
  stats: PlaceStat[];
  className?: string;
  headingLevel?: 1 | 2;
}) {
  const { t } = usePetOwnerI18n();
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className={`place-detail-hero ${className}`} aria-label={title}>
      <div className="place-detail-media">{media}</div>
      <div className="place-detail-identity">
        <div className="place-detail-topline">
          {identity}
          <span className="place-detail-eyebrow"><LocalizedCopy>{eyebrow}</LocalizedCopy></span>
        </div>
        <Heading><LocalizedCopy preserve>{title}</LocalizedCopy></Heading>
        <p className="place-detail-location"><Icon name="map" size={17} /><LocalizedCopy preserve>{location}</LocalizedCopy></p>
        {status ? <div className="place-detail-status">{status}</div> : null}
        {description ? <p className="place-detail-description"><LocalizedCopy catalogue>{description}</LocalizedCopy></p> : null}
        <ul className="place-detail-stats" aria-label={t("Ringkasan tempat")}>
          {stats.map(stat => (
            <li key={stat.label}>
              <span><Icon name={stat.icon} size={18} /></span>
              <div><b><LocalizedCopy>{stat.value}</LocalizedCopy></b><small><LocalizedCopy>{stat.label}</LocalizedCopy></small></div>
            </li>
          ))}
        </ul>
        <div className="place-detail-actions">{actions}</div>
      </div>
    </section>
  );
}
