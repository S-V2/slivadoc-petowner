"use client";
import { Children, useState, type ReactNode, type ComponentPropsWithRef } from "react";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import { translateText } from "../../shared/i18n";

export function LocalizedCopy({ children, preserve = false, catalogue = false }: { children?: ReactNode; preserve?: boolean; catalogue?: boolean }) {
  const { language } = usePetOwnerI18n();
  return <>{Children.map(children, child => typeof child === "string" && !preserve ? translateText(child, language, catalogue) : child)}</>;
}
export function LocalizedInput(props: ComponentPropsWithRef<"input">) {
  const { t } = usePetOwnerI18n();
  const [error,setError]=useState("");
  return <><input {...props} placeholder={props.placeholder ? t(props.placeholder) : undefined} aria-label={props["aria-label"] ? t(props["aria-label"]) : undefined} title={props.title ? t(props.title) : undefined} aria-invalid={error ? true : props["aria-invalid"]}
    onChange={event=>{if(event.currentTarget.validity.valid)setError("");props.onChange?.(event);}}
    onInvalid={event=>{event.preventDefault();if(!props.onInvalid&&!props["aria-hidden"]){setError(event.currentTarget.validity.valueMissing?"Kolom ini wajib diisi.":"Masukkan format data yang valid.");}props.onInvalid?.(event);}} />{error&&<small className="sliva-field-error" role="alert">{t(error)}</small>}</>;
}
export function LocalizedTextarea(props: ComponentPropsWithRef<"textarea">) {
  const { t } = usePetOwnerI18n();
  const [error,setError]=useState("");
  return <><textarea {...props} placeholder={props.placeholder ? t(props.placeholder) : undefined} aria-label={props["aria-label"] ? t(props["aria-label"]) : undefined} aria-invalid={error ? true : props["aria-invalid"]} onChange={event=>{if(event.currentTarget.validity.valid)setError("");props.onChange?.(event);}} onInvalid={event=>{event.preventDefault();if(!props.onInvalid)setError("Kolom ini wajib diisi.");props.onInvalid?.(event);}} />{error&&<small className="sliva-field-error" role="alert">{t(error)}</small>}</>;
}
export function LocalizedButton(props: ComponentPropsWithRef<"button">) {
  const { t } = usePetOwnerI18n();
  return <button {...props} aria-label={props["aria-label"] ? t(props["aria-label"]) : undefined} title={props.title ? t(props.title) : undefined}>{props.children}</button>;
}
