"use client";
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
      <div className="adoption-passport-placeholder">
        🐾<small>Foto belum tersedia</small>
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
      {photos.length > 1 && (
        <div className="adoption-gallery-controls">
          <button
            type="button"
            aria-label="Foto sebelumnya"
            onClick={() =>
              setIndex((index + photos.length - 1) % photos.length)
            }
          >
            ‹
          </button>
          <span>
            {index + 1} / {photos.length}
          </span>
          <button
            type="button"
            aria-label="Foto berikutnya"
            onClick={() => setIndex((index + 1) % photos.length)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
