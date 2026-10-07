"use client";
import { LocalizedCopy, LocalizedButton } from "../LocalizedCopy";
import Image from "next/image";
import { useState } from "react";

export function AdoptionGallery({
  photos,
  name,
}: {
  photos: string[];
  name: string;
}) {
  const [index, setIndex] = useState(0);
  if (!photos.length)
    return (
      <div className="adoption-passport-placeholder"><LocalizedCopy>{"🐾"}</LocalizedCopy><small><LocalizedCopy>{"Foto belum tersedia"}</LocalizedCopy></small>
      </div>
    );
  return (
    <div className="adoption-passport-gallery">
      <Image
        src={photos[index % photos.length]}
        alt={`Foto ${index + 1} ${name}`}
        width={900}
        height={640}
        unoptimized
      />
      <LocalizedCopy>{photos.length > 1 && (
        <div className="adoption-gallery-controls">
          <LocalizedButton
            type="button"
            aria-label="Foto sebelumnya"
            onClick={() =>
              setIndex((index + photos.length - 1) % photos.length)
            }
          ><LocalizedCopy>{"‹"}</LocalizedCopy></LocalizedButton>
          <span>
            <LocalizedCopy>{index + 1}</LocalizedCopy><LocalizedCopy>{" / "}</LocalizedCopy><LocalizedCopy>{photos.length}</LocalizedCopy>
          </span>
          <LocalizedButton
            type="button"
            aria-label="Foto berikutnya"
            onClick={() => setIndex((index + 1) % photos.length)}
          ><LocalizedCopy>{"›"}</LocalizedCopy></LocalizedButton>
        </div>
      )}</LocalizedCopy>
    </div>
  );
}
