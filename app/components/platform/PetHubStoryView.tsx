"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  isPetOwnerAuthenticated,
  viewPetHubStory,
  type PetHubStory,
} from "../../lib/platform-api";

export function PetHubStoryView({
  story,
  notify,
}: {
  story: PetHubStory;
  notify: (message: string) => void;
}) {
  const [views, setViews] = useState(story.view_count);
  useEffect(() => {
    let active = true;
    if (isPetOwnerAuthenticated())
      void viewPetHubStory(story.id)
        .then((r) => {
          if (active) setViews(r.view_count);
        })
        .catch(() => {
          if (active) notify("Jumlah penonton story belum dapat diperbarui");
        });
    return () => {
      active = false;
    };
  }, [story.id, notify]);
  const url = story.media_url || story.photo_url;
  return (
    <div className="hub-story-view">
      <h2>{story.author_name}</h2>
      {story.media_type === "video" ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          aria-label={`Story video ${story.author_name}`}
        />
      ) : (
        <Image
          src={url}
          alt={story.caption || `Story ${story.author_name}`}
          width={720}
          height={1280}
          unoptimized
        />
      )}
      <p>{story.caption}</p>
      <small>
        {views} penonton · Tayang sampai{" "}
        {new Date(story.expires_at).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </small>
    </div>
  );
}
