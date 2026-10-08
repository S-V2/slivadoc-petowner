"use client";
import { useState } from "react";
import NextImage from "next/image";
import { LocalizedButton, LocalizedCopy } from "./LocalizedCopy";
import "../pet-brand-marquee.css";
const brands = [{ name: "Perro", file: "perro.png" }, { name: "Royal Canin", file: "royal-canin.svg" }, { name: "Kucingku", file: "kucingku.png" }];
export function PetBrandMarquee() {
  const [paused, setPaused] = useState(false);
  return <section className="pet-brand-marquee" aria-label="Brand pet">
    <header><div><small><LocalizedCopy>{"DUNIA BRAND PET"}</LocalizedCopy></small><h2><LocalizedCopy>{"Kenali brand favoritmu."}</LocalizedCopy></h2></div><LocalizedButton className="pet-brand-pause" type="button" aria-label={paused ? "Putar animasi brand" : "Jeda animasi brand"} onClick={() => setPaused(value => !value)}>{paused ? "▷" : "Ⅱ"}</LocalizedButton></header>
    <div className="pet-brand-window"><div className={`pet-brand-track${paused ? " is-paused" : ""}`}>
      {[0, 1, 2, 3].map(copy => <div className="pet-brand-group" key={copy} aria-hidden={copy > 0 || undefined}>{brands.map(brand => <span key={brand.name}><NextImage src={`/brand/pet-brands/${brand.file}`} alt={copy === 0 ? brand.name : ""} width={112} height={40} unoptimized/></span>)}</div>)}
    </div></div>
  </section>;
}
