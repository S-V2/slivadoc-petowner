"use client";
import { useEffect, useState, type RefObject } from "react";
import { Icon } from "./Icon";
import { usePetOwnerI18n } from "./PetOwnerI18n";

/** Navigation follows real scroll position, including touch and trackpad scrolling. */
export function RailArrows({
  rail,
  label,
}: {
  rail: RefObject<HTMLDivElement | null>;
  label: string;
}) {
  const { t } = usePetOwnerI18n();
  const [edges, setEdges] = useState({ previous: false, next: false });
  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    const update = () =>
      setEdges({
        previous: node.scrollLeft > 2,
        next: node.scrollWidth - node.clientWidth - node.scrollLeft > 2,
      });
    const size = new ResizeObserver(update);
    const content = new MutationObserver(update);
    size.observe(node);
    content.observe(node, { childList: true, subtree: true });
    node.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      size.disconnect();
      content.disconnect();
      node.removeEventListener("scroll", update);
    };
  }, [rail]);
  function move(direction: number) {
    const node = rail.current;
    node?.scrollBy({
      left: direction * Math.max(240, node.clientWidth * 0.8),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <>
      {edges.previous && (
        <button
          type="button"
          className="rail-nav rail-nav-previous"
          aria-label={t(`Sebelumnya: ${label}`)}
          onClick={() => move(-1)}
        >
          <Icon name="arrow" />
        </button>
      )}
      {edges.next && (
        <button
          type="button"
          className="rail-nav rail-nav-next"
          aria-label={t(`Berikutnya: ${label}`)}
          onClick={() => move(1)}
        >
          <Icon name="arrow" />
        </button>
      )}
    </>
  );
}
