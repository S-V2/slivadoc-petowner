import Image from "next/image";

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
      <Image
        className="brand-mark"
        src="/brand/slivadoc-logo.png"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        priority={priority}
      />
      {!markOnly && (
        <span className="brand-copy">
          <b>sliva</b>
          <strong>doc</strong>
        </span>
      )}
    </div>
  );
}
