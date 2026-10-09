import { LocalizedImage as Image } from "./LocalizedCopy";

export function BrandMark({
  size = 40,
  priority = false,
  className = "brand-mark",
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      className={className}
      src="/brand/slivadoc-logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      priority={priority}
    />
  );
}

export function BrandLogo({
  markOnly = false,
  priority = false,
}: {
  markOnly?: boolean;
  priority?: boolean;
}) {
  const size = markOnly ? 86 : 40;

  return (
    <div
      className={`brand ${markOnly ? "brand--mark-only" : ""}`}
      aria-label="Slivadoc"
    >
      <BrandMark size={size} priority={priority} />
      {!markOnly && (
        <span className="brand-copy">
          <b>sliva</b>
          <strong>doc</strong>
        </span>
      )}
    </div>
  );
}
