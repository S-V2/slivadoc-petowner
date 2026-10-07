"use client";
import { LocalizedInput, LocalizedButton, LocalizedCopy } from "./LocalizedCopy";
import { useId, useRef, useState, useEffect, type InputHTMLAttributes, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { calendarValue, dateKey, monthDays, parseCalendarDate, withinDateBounds, validCalendarValue, type CalendarKind } from "../../shared/calendar";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { SlivaSelect } from "./SlivaSelect";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { type?: CalendarKind };
export function SlivaDatePicker({ type = "date", value, defaultValue, onChange, min, max, ...props }: Props) {
  const { locale, t } = usePetOwnerI18n();
  const [localValue, setLocalValue] = useState(String(defaultValue ?? ""));
  const current = value === undefined ? localValue : String(value);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [month, setMonth] = useState(() => parseCalendarDate(current) ?? new Date());
  const [draftDay, setDraftDay] = useState(current.slice(0, 10) || dateKey(new Date()));
  const [draftTime, setDraftTime] = useState(type === "time" ? current || "09:00" : current.slice(11, 16) || "09:00");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const minimum = min === undefined ? undefined : String(min);
  const maximum = max === undefined ? undefined : String(max);
  useEffect(() => {
    inputRef.current?.setCustomValidity(current && !validCalendarValue(current, type, minimum, maximum) ? t("Pilih tanggal/jam yang valid sesuai batas jadwal.") : "");
  }, [current, type, minimum, maximum, t]);
  const close = () => { setOpen(false); inputRef.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [open]);
  const commit = (next: string) => {
    if (next && !validCalendarValue(next, type, minimum, maximum)) { setInvalid(true); return; }
    setInvalid(false);
    setLocalValue(next);
    const input = inputRef.current;
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, next);
      onChange?.({ target: input, currentTarget: input } as ChangeEvent<HTMLInputElement>);
    }
    close();
  };
  const launch = () => {
    setMonth(parseCalendarDate(current) ?? new Date());
    setDraftDay(current.slice(0, 10) || dateKey(new Date()));
    setDraftTime(type === "time" ? current || "09:00" : current.slice(11, 16) || "09:00");
    setOpen(true);
  };
  return <span className="sliva-date-field">
    <LocalizedInput {...props} ref={inputRef} type="text" value={current} min={undefined} max={undefined} inputMode="numeric"
      placeholder={props.placeholder ?? (type === "date" ? "YYYY-MM-DD" : type === "time" ? "HH:mm" : "YYYY-MM-DDTHH:mm")}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onChange={(event) => { setLocalValue(event.target.value); setInvalid(false); onChange?.(event); }} onInvalid={(event) => { event.preventDefault(); setInvalid(true); inputRef.current?.focus(); props.onInvalid?.(event); }} />
    <LocalizedButton type="button" className="sliva-date-launch" aria-label={t(type === "time" ? "Pilih jam" : "Pilih tanggal")} disabled={props.disabled} onClick={launch}><LocalizedCopy>{"▦"}</LocalizedCopy></LocalizedButton>
    <LocalizedCopy>{open && createPortal(<div className="sliva-calendar-backdrop" onClick={close}>
      <div ref={dialogRef} id={id} className="sliva-calendar" role="dialog" aria-modal="true" aria-label={t("Kalender Slivadoc")} onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); close(); }
          if (event.key === "Tab") {
            const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [role="combobox"], input')];
            const first = items[0], last = items.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <header><strong><LocalizedCopy>{t("Kalender Slivadoc")}</LocalizedCopy></strong><LocalizedButton type="button" onClick={close} aria-label={t("Tutup")}><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton></header>
        <LocalizedCopy>{type !== "time" && <>
          <div className="sliva-calendar-month">
            <LocalizedButton type="button" aria-label={t("Bulan sebelumnya")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}><LocalizedCopy>{"‹"}</LocalizedCopy></LocalizedButton>
            <SlivaSelect aria-label={t("Bulan")} value={month.getMonth()} onChange={(event) => setMonth(new Date(month.getFullYear(), Number(event.target.value), 1, 12))}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>{new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2026, index, 1))}</option>)}</SlivaSelect>
            <SlivaSelect aria-label={t("Tahun")} value={month.getFullYear()} onChange={(event) => setMonth(new Date(Number(event.target.value), month.getMonth(), 1, 12))}>{Array.from({ length: 131 }, (_, index) => { const year = new Date().getFullYear() - 100 + index; return <option key={year} value={year}>{year}</option>; })}</SlivaSelect>
            <LocalizedButton type="button" aria-label={t("Bulan berikutnya")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}><LocalizedCopy>{"›"}</LocalizedCopy></LocalizedButton>
          </div>
          <div className="sliva-calendar-grid" role="group" aria-label={t("Pilih tanggal")} onKeyDown={(event) => {
            const direction = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key as "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"];
            if (direction === undefined) return;
            event.preventDefault();
            const days = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
            const index = days.indexOf(document.activeElement as HTMLButtonElement);
            let next = index + direction;
            while (next >= 0 && next < days.length && days[next]?.disabled) next += direction;
            days[next]?.focus();
          }}>
            <LocalizedCopy>{Array.from({ length: 7 }, (_, index) => <small key={index}><LocalizedCopy>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 9, 5 + index))}</LocalizedCopy></small>)}</LocalizedCopy>
            <LocalizedCopy>{monthDays(month.getFullYear(), month.getMonth()).map((day) => { const key = dateKey(day); return <LocalizedButton type="button" key={key} aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(day)} aria-pressed={key === draftDay} disabled={!withinDateBounds(key, min === undefined ? undefined : String(min), max === undefined ? undefined : String(max))} className={`${day.getMonth() !== month.getMonth() ? "outside" : ""} ${key === draftDay ? "selected" : ""}`} onClick={() => { setDraftDay(key); if (type === "date") commit(key); }}><LocalizedCopy>{day.getDate()}</LocalizedCopy></LocalizedButton>; })}</LocalizedCopy>
          </div>
        </>}</LocalizedCopy>
        <LocalizedCopy>{type !== "date" && <div className="sliva-calendar-time"><strong><LocalizedCopy>{t("Pilih jam")}</LocalizedCopy></strong>
          <SlivaSelect aria-label={t("Jam")} value={draftTime.split(":")[0]} onChange={(event) => setDraftTime(`${event.target.value}:${draftTime.split(":")[1]}`)}>{Array.from({ length: 24 }, (_, n) => <option key={n} value={String(n).padStart(2, "0")}>{String(n).padStart(2, "0")}</option>)}</SlivaSelect><span><LocalizedCopy>{":"}</LocalizedCopy></span>
          <SlivaSelect aria-label={t("Menit")} value={draftTime.split(":")[1]} onChange={(event) => setDraftTime(`${draftTime.split(":")[0]}:${event.target.value}`)}>{Array.from({ length: 60 }, (_, n) => <option key={n} value={String(n).padStart(2, "0")}>{String(n).padStart(2, "0")}</option>)}</SlivaSelect>
        </div>}</LocalizedCopy>
        <footer><LocalizedCopy>{!props.required && <LocalizedButton type="button" onClick={() => commit("")}><LocalizedCopy>{t("Kosongkan")}</LocalizedCopy></LocalizedButton>}</LocalizedCopy><LocalizedButton type="button" onClick={close}><LocalizedCopy>{t("Batal")}</LocalizedCopy></LocalizedButton><LocalizedButton type="button" className="primary-button" disabled={type !== "time" && !withinDateBounds(draftDay, min === undefined ? undefined : String(min), max === undefined ? undefined : String(max))} onClick={() => commit(calendarValue(draftDay, draftTime, type))}><LocalizedCopy>{t("Selesai")}</LocalizedCopy></LocalizedButton></footer>
      </div>
    </div>, document.body)}</LocalizedCopy>
    {invalid && <small className="sliva-date-error" role="alert">{t("Pilih tanggal/jam yang valid sesuai batas jadwal.")}</small>}
  </span>;
}
