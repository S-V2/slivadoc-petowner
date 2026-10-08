"use client";
import { useId, useRef, useState, type ComponentPropsWithRef } from "react";
import { usePetOwnerI18n } from "./PetOwnerI18n";
export function SlivaFilePicker({ ref, ...props }: ComponentPropsWithRef<"input">) {
  const { t } = usePetOwnerI18n();
  const id = useId();
  const localRef = useRef<HTMLInputElement>(null);
  const [names,setNames]=useState("");
  const [invalid,setInvalid]=useState(false);
  const assign = (input: HTMLInputElement | null) => { localRef.current=input; if(typeof ref==="function")ref(input);else if(ref)ref.current=input; };
  if (props.hidden || props.style?.display === "none") return <input {...props} ref={assign} type="file" />;
  return <span className="sliva-file-field"><input {...props} id={props.id || id} ref={assign} type="file" className={`${props.className ?? ""} sliva-file-input`} tabIndex={-1} aria-hidden="true" onChange={event=>{setNames([...event.target.files ?? []].map(file=>file.name).join(", "));setInvalid(false);props.onChange?.(event);}} onInvalid={event=>{event.preventDefault();setInvalid(true);localRef.current?.parentElement?.querySelector("button")?.focus();props.onInvalid?.(event);}}/><button type="button" className="secondary-button" disabled={props.disabled} onClick={()=>localRef.current?.click()} aria-label={t(props["aria-label"]||"Pilih file")}>{t("Pilih file")}</button><span>{names||t("Belum ada file dipilih")}</span>{invalid&&<small role="alert">{t("Pilih file untuk melanjutkan.")}</small>}</span>;
}
