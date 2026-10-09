/** Only return to Career after signing in; never accept external destinations. */
export function careerReturnPath(value: string | null): string | null {
  if (
    !value ||
    !/^\/career(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?(?:[?#].*)?$/.test(value)
  )
    return null;
  return value;
}
export function careerLoginURL(path: string) {
  return `/?view=home&login=1&returnTo=${encodeURIComponent(careerReturnPath(path) ?? "/career")}`;
}
