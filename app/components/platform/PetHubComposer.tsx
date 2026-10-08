"use client";
import { SlivaVideo } from "../SlivaVideo";
import { SlivaFilePicker } from "../SlivaFilePicker";
import { LocalizedCopy, LocalizedButton, LocalizedTextarea } from "../LocalizedCopy";
import { useEffect, useRef, useState } from "react";
import { LocalizedImage as Image } from "../LocalizedCopy";
import { uploadPetHubMedia } from "../../lib/petowner-api";
import { createPetHubPost, createPetHubStory } from "../../lib/platform-api";

export function PetHubComposer({
  mode,
  close,
  onCreated,
  notify,
}: {
  mode: "feed" | "reel" | "story";
  close: () => void;
  onCreated: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [progress, setProgress] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    const urls = files.map((file) => URL.createObjectURL(file));
    queueMicrotask(() => {
      if (active) setPreviews(urls);
    });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);
  const limit = mode === "story" ? 300 : 2200;
  function choose(list: FileList | null) {
    const next = Array.from(list ?? []);
    if (
      next.length > 10 ||
      (mode !== "feed" && next.length > 1) ||
      next.some((f) => !/^image\//.test(f.type) && !/^video\//.test(f.type)) ||
      next.some((f) => f.size > 40 * 1024 * 1024) ||
      (next.some((f) => f.type.startsWith("video/")) && next.length > 1) ||
      (mode === "reel" && next.some((f) => !f.type.startsWith("video/")))
    ) {
      notify(
        "Pilih maksimal 10 foto atau satu video, maksimal 40 MB per file.",
      );
      return;
    }
    setFiles(next);
  }
  async function submit() {
    if (
      pending.current ||
      (mode !== "story" && caption.trim().length < 3) ||
      (mode !== "feed" && !files.length)
    )
      return;
    pending.current = true;
    setBusy(true);
    try {
      const media = [];
      for (const [index, file] of files.entries()) {
        setProgress(`Mengunggah ${index + 1}/${files.length}…`);
        media.push(
          await uploadPetHubMedia(
            file,
            mode === "story" ? "pethub/stories" : "pethub/posts",
          ),
        );
      }
      setProgress("Menerbitkan…");
      if (mode === "story")
        await createPetHubStory(
          media[0].url,
          caption.trim(),
          media[0].resourceType,
        );
      else
        await createPetHubPost({
          author_name: "",
          content: caption.trim(),
          post_type:
            media[0]?.resourceType === "video"
              ? "video"
              : media.length
                ? "photo"
                : "thread",
          media_urls: media.map((m) => m.url),
        });
      await onCreated();
      notify(
        mode === "story"
          ? "Story tayang selama 24 jam"
          : "Posting tersimpan dan diterbitkan",
      );
      close();
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Posting belum dapat diterbitkan",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      setProgress("");
    }
  }
  return (
    <div className="modal-world-body hub-composer">
      <small className="world-kicker"><LocalizedCopy>{"PETHUB CREATOR"}</LocalizedCopy></small>
      <h2>
        <LocalizedCopy>{mode === "story"
          ? "Story baru"
          : mode === "reel"
            ? "Reel baru"
            : "Bagikan momen pet kamu"}</LocalizedCopy>
      </h2>
      <p>
        <LocalizedCopy>{mode === "story"
          ? "Foto atau video singkat, tayang 24 jam."
          : mode === "reel"
            ? "Video vertikal dengan tombol interaksi di kanan."
            : "Teks, satu foto, album hingga 10 foto, atau satu video."}</LocalizedCopy>
      </p>
      <label className="hub-upload">
        <span><LocalizedCopy>{"Pilih "}</LocalizedCopy><LocalizedCopy>{mode === "reel" ? "video" : "foto / video"}</LocalizedCopy></span>
        <SlivaFilePicker
          aria-label="Pilih media PetHub"
          type="file"
          accept={mode === "reel" ? "video/*" : "image/*,video/*"}
          multiple={mode === "feed"}
          disabled={busy}
          onChange={(e) => choose(e.target.files)}
        />
      </label>
      <div className="hub-upload-previews">
        <LocalizedCopy>{files.map((file, index) => (
          <div key={`${file.name}-${index}`}>
            <LocalizedCopy>{file.type.startsWith("video/") ? (
              <SlivaVideo src={previews[index]} playsInline />
            ) : previews[index] ? (
              <Image
                src={previews[index]}
                alt={`Preview foto ${index + 1}`}
                width={400}
                height={400}
                unoptimized
              />
            ) : null}</LocalizedCopy>
            <LocalizedButton
              type="button"
              disabled={busy}
              aria-label={`Hapus media ${index + 1}`}
              onClick={() =>
                setFiles((current) => current.filter((_, i) => i !== index))
              }
            ><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
          </div>
        ))}</LocalizedCopy>
      </div>
      <label><LocalizedCopy>{"Caption"}</LocalizedCopy><LocalizedTextarea
          className="thread-input"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={busy}
          maxLength={limit}
          placeholder={
            mode === "story"
              ? "Tambahkan cerita singkat (opsional)…"
              : "Ceritakan momennya…"
          }
        />
      </label>
      <div className="composer-bottom">
        <span>
          <LocalizedCopy>{caption.length}</LocalizedCopy><LocalizedCopy>{"/"}</LocalizedCopy><LocalizedCopy>{limit}</LocalizedCopy>
        </span>
        <LocalizedButton
          className="primary-button"
          disabled={
            busy ||
            (mode !== "story" && caption.trim().length < 3) ||
            (mode !== "feed" && !files.length)
          }
          onClick={() => void submit()}
        >
          <LocalizedCopy>{busy ? progress : "Terbitkan"}</LocalizedCopy>
        </LocalizedButton>
      </div>
    </div>
  );
}
