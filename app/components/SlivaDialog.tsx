"use client";
import { useSyncExternalStore, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePetOwnerI18n } from "./PetOwnerI18n";
type Request = { title: string; resolve: (accepted: boolean) => void };
const queue: Request[] = [];
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };
export function confirmSlivaDialog(title: string) { return new Promise<boolean>(resolve => { queue.push({title,resolve}); emit(); }); }
export function SlivaDialogHost() {
  const request = useSyncExternalStore(listener => {listeners.add(listener);return () => {listeners.delete(listener);};}, () => queue[0], () => undefined);
  const { t } = usePetOwnerI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!request) return; const previous = document.activeElement as HTMLElement | null; ref.current?.querySelector<HTMLElement>("button")?.focus(); return () => previous?.focus(); }, [request]);
  if (!request) return null;
  const finish = (accepted: boolean) => { queue.shift(); request.resolve(accepted); emit(); };
  return createPortal(<div className="sliva-calendar-backdrop" onClick={() => finish(false)}><div ref={ref} className="sliva-calendar" role="alertdialog" aria-modal="true" aria-label={t("Konfirmasi")} onClick={event => event.stopPropagation()} onKeyDown={event => {if(event.key === "Escape") finish(false); if(event.key === "Tab") {const buttons=ref.current?.querySelectorAll("button");if(buttons?.length){event.preventDefault(); const index=[...buttons].indexOf(document.activeElement as HTMLButtonElement);buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();}}}}><h2>{t("Konfirmasi")}</h2><p>{t(request.title)}</p><footer><button type="button" onClick={() => finish(false)}>{t("Batal")}</button><button type="button" className="primary-button" onClick={() => finish(true)}>{t("Hapus")}</button></footer></div></div>,document.body);
}
