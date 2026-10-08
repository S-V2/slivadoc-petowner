"use client";
import { SlivaFilePicker } from "../SlivaFilePicker";
import { LocalizedCopy } from "../LocalizedCopy";

import { useState } from "react";
import { uploadDocument } from "../../lib/petowner-api";

export type UploadedDocument = {
  requirement: string;
  url: string;
  file_name: string;
  mime_type: string;
};

type Props = {
  requirements: string[];
  value: UploadedDocument[];
  onChange: (docs: UploadedDocument[]) => void;
  disabled?: boolean;
};

export function RequirementUploads({
  requirements,
  value,
  onChange,
  disabled,
}: Props) {
  // One upload at a time: onChange below replaces the array from the render snapshot.
  const [uploading, setUploading] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function pick(requirement: string, file: File | undefined) {
    if (!file) return;
    setErrors((current) => ({ ...current, [requirement]: "" }));
    setUploading((current) => [...current, requirement]);
    try {
      const result = await uploadDocument(file, "documents");
      onChange([
        ...value.filter((doc) => doc.requirement !== requirement),
        {
          requirement,
          url: result.url,
          file_name: file.name,
          mime_type: result.mimeType || file.type,
        },
      ]);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [requirement]:
          error instanceof Error ? error.message : "Dokumen belum dapat diunggah",
      }));
    } finally {
      setUploading((current) => current.filter((item) => item !== requirement));
    }
  }

  return (
    <div className="requirement-upload">
      <LocalizedCopy>{requirements.map((requirement) => {
        const uploaded = value.find((doc) => doc.requirement === requirement);
        const busy = uploading.includes(requirement);
        const error = errors[requirement];
        return (
          <label key={requirement}>
            <span>
              <LocalizedCopy>{uploaded ? "✓" : "○"}</LocalizedCopy> <LocalizedCopy>{requirement}</LocalizedCopy>
            </span>
            <SlivaFilePicker
              type="file"
              accept="image/*,.pdf"
              disabled={disabled || uploading.length > 0}
              onChange={(event) => {
                void pick(requirement, event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <small
              className={error ? "error" : uploaded ? "done" : undefined}
              role={error ? "alert" : undefined}
            >
              <LocalizedCopy>{busy
                ? "Mengunggah…"
                : error
                  ? error
                  : uploaded
                    ? `Terunggah: ${uploaded.file_name}`
                    : "PDF, JPG, atau PNG maks. 10 MB"}</LocalizedCopy>
            </small>
          </label>
        );
      })}</LocalizedCopy>
    </div>
  );
}
