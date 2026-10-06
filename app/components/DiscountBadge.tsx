export function DiscountBadge({ percent }: { percent?: number }) {
  const value = Math.min(100, Math.max(0, Math.round(percent || 0)));
  if (!value) return null;
  return (
    <span className="sliva-discount-ticket" aria-label={`Hemat ${value}%`}>
      <span aria-hidden="true">✦</span>
      <small>HEMAT</small>
      <b>{value}%</b>
    </span>
  );
}
