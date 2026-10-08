"use client";
import { useEffect } from "react";
const railSelector = '[role="tablist"], [data-tab-rail], .petowner-world-nav, .world-toolbar > div, .petspot-categories';
function resetRail(rail: HTMLElement) {
  rail.removeAttribute("data-tab-rail");
  rail.style.removeProperty("--tab-rail-tail");
  if (rail.scrollLeft) rail.scrollTo({ left: 0, behavior: "instant" });
}

export function alignMobileTab(tab: HTMLElement) {
  const rail = tab.closest<HTMLElement>(railSelector);
  if (!rail) return;
  const last = rail.lastElementChild as HTMLElement | null;
  // Measure the actual tabs, excluding the mobile tail left over from a narrower viewport.
  const contentRight = last ? last.getBoundingClientRect().right - rail.getBoundingClientRect().left + rail.scrollLeft : 0;
  if (window.innerWidth > 860 || contentRight <= rail.clientWidth) { resetRail(rail); return; }
  if (getComputedStyle(rail).display === "flex") {
    rail.dataset.tabRail = "true";
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
    const resized = () => document.querySelectorAll<HTMLElement>(railSelector).forEach(rail => {
      const selected = rail.querySelector<HTMLElement>('[aria-current="page"], [aria-selected="true"]');
      if (selected) alignMobileTab(selected);
      else if (window.innerWidth > 860) resetRail(rail);
    });
    document.addEventListener("click", clicked);
    window.addEventListener("resize", resized);
    return () => { document.removeEventListener("click", clicked); window.removeEventListener("resize", resized); };
  }, []);
  return null;
}
