"use client";
import { useEffect } from "react";

export function alignMobileTab(tab: HTMLElement) {
  if (window.innerWidth > 860) return;
  const rail = tab.closest<HTMLElement>('[role="tablist"], [data-tab-rail], .petowner-world-nav, .world-toolbar > div, .petspot-categories');
  if (!rail || rail.scrollWidth <= rail.clientWidth) return;
  if (getComputedStyle(rail).display === "flex") {
    rail.dataset.tabRail = "true";
    const last = rail.lastElementChild as HTMLElement | null;
    rail.style.setProperty("--tab-rail-tail", `${Math.max(0, rail.clientWidth - (last?.offsetWidth ?? 0))}px`);
  }
  const left = tab.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft - 4;
  rail.scrollTo({ left: Math.max(0, left), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}
export function HorizontalTabPositioning() {
  useEffect(() => {
    const clicked = (event: MouseEvent) => {
      const tab = event.target instanceof Element ? event.target.closest<HTMLElement>('button, [role="tab"]') : null;
      if (tab) requestAnimationFrame(() => { if (tab.isConnected) alignMobileTab(tab); });
    };
    document.addEventListener("click", clicked);
    return () => document.removeEventListener("click", clicked);
  }, []);
  return null;
}
