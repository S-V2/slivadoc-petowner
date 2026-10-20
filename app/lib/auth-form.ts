// Reading validity is passive. checkValidity() dispatches invalid events and
// must only be used when the user actually submits the form.
export function authFormIsValid(form: HTMLFormElement | null): boolean {
  return Boolean(
    form &&
    Array.from(form.elements).every(
      (field) =>
        !("validity" in field) || (field as HTMLInputElement).validity.valid,
    ),
  );
}
