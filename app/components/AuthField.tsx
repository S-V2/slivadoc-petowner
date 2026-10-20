"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { LocalizedCopy, LocalizedInput } from "./LocalizedCopy";

type Props = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  accessory?: ReactNode;
};

export function AuthField({ label, hint, accessory, ...props }: Props) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [error, setError] = useState("");
  function validate(input: HTMLInputElement) {
    const validity = input.validity;
    setError(
      validity.valid
        ? ""
        : validity.valueMissing
          ? "Kolom ini wajib diisi."
          : props.title ||
            (validity.typeMismatch
              ? "Masukkan alamat email yang valid."
              : "Masukkan format data yang valid."),
    );
  }
  return (
    <div className="auth-field">
      <label htmlFor={id}>
        <LocalizedCopy>{label}</LocalizedCopy>
      </label>
      <div className="auth-input-shell">
        <LocalizedInput
          {...props}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [hint && `${id}-hint`, error && `${id}-error`]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onBlur={(event) => {
            // Do not move an action between pointer-down and pointer-up (e.g.
            // resend OTP or open a consent document) by inserting an error.
            const next = event.relatedTarget;
            if (!(
              next instanceof HTMLElement &&
              next.closest(
                'button, a, input[type="checkbox"], input[type="radio"]',
              )
            )) {
              validate(event.currentTarget);
            }
            props.onBlur?.(event);
          }}
          onChange={(event) => {
            const input = event.currentTarget;
            props.onChange?.(event);
            // Recheck the final DOM value after controlled fields normalize it.
            if (error) queueMicrotask(() => validate(input));
          }}
          onInvalid={(event) => {
            event.preventDefault();
            validate(event.currentTarget);
            props.onInvalid?.(event);
          }}
        />
        {accessory}
      </div>
      {hint && (
        <small id={`${id}-hint`}>
          <LocalizedCopy>{hint}</LocalizedCopy>
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="sliva-field-error" role="alert">
          <LocalizedCopy>{error}</LocalizedCopy>
        </small>
      )}
    </div>
  );
}
