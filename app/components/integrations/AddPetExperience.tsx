"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Pet } from "../../data/mock";
import {
  createPetOwnerPet,
  getPetSpecies,
  type PetSpecies,
} from "../../lib/platform-api";
import { uploadImage } from "../../lib/petowner-api";
import { Icon } from "../Icon";

type Props = {
  onClose: () => void;
  onSaved: (pet: Pet) => void;
  notify: (message: string) => void;
};
const groupLabels: Record<string, string> = {
  dog: "Anjing",
  cat: "Kucing",
  small_mammal: "Mamalia kecil & eksotis",
  bird: "Burung & unggas",
  reptile: "Reptil",
  amphibian: "Amfibi",
  fish: "Ikan",
  aquatic: "Akuatik",
  arachnid: "Arachnida",
  insect: "Serangga",
  equine: "Kuda & equine",
  farm_animal: "Hewan ternak",
  other: "Spesies lainnya",
};
const groupToPetType = (group: string): Pet["type"] =>
  ({
    dog: "Dog",
    cat: "Cat",
    small_mammal: "Small Mammal",
    bird: "Bird",
    reptile: "Reptile",
    amphibian: "Amphibian",
    fish: "Fish",
    aquatic: "Aquatic",
    arachnid: "Arachnid",
    insect: "Insect",
    equine: "Equine",
    farm_animal: "Farm Animal",
  })[group] as Pet["type"] ?? "Other";

export default function AddPetExperience({ onClose, onSaved, notify }: Props) {
  const [speciesOptions, setSpeciesOptions] = useState<PetSpecies[]>([]);
  const [speciesCode, setSpeciesCode] = useState("");
  const [customSpecies, setCustomSpecies] = useState("");
  const [customScientificName, setCustomScientificName] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("male");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const species =
    speciesOptions.find((item) => item.code === speciesCode) ?? null;
  const groupedSpecies = useMemo(
    () =>
      speciesOptions.reduce<Record<string, PetSpecies[]>>((groups, item) => {
        (groups[item.group] ??= []).push(item);
        return groups;
      }, {}),
    [speciesOptions],
  );
  useEffect(() => {
    let active = true;
    void getPetSpecies()
      .then((result) => {
        if (!active) return;
        setSpeciesOptions(result.data);
        setSpeciesCode(result.data[0]?.code ?? "");
      })
      .catch((cause) =>
        notify(
          cause instanceof Error
            ? cause.message
            : "Katalog spesies belum dapat dimuat",
        ),
      );
    return () => {
      active = false;
    };
  }, [notify]);
  function choosePhoto(selected?: File) {
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type))
      return notify("Format foto harus JPG, PNG, atau WebP");
    if (selected.size > 8 * 1024 * 1024)
      return notify("Ukuran foto maksimal 8 MB");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }
  async function save() {
    if (!name.trim() || !species)
      return notify("Lengkapi nama dan pilih jenis hewan");
    if (species.code === "other" && customSpecies.trim().length < 2)
      return notify("Isi nama spesies untuk pilihan Spesies lainnya");
    setLoading(true);
    try {
      let photoUrl = "";
      if (file) photoUrl = (await uploadImage(file, "pets")).url;
      const result = await createPetOwnerPet({
        name: name.trim(),
        species: species.code,
        species_common_name:
          species.code === "other" ? customSpecies.trim() : species.label,
        species_scientific_name:
          species.code === "other"
            ? customScientificName.trim()
            : species.scientific_name,
        breed: breed.trim(),
        sex: gender,
        birth_date: birthDate,
        color: "",
        weight_kg: Number(weight || 0),
        photo_url: photoUrl,
      });
      onSaved({
        id: result.id,
        name: name.trim(),
        type: groupToPetType(species.group),
        speciesCode: species.code,
        speciesGroup: species.group,
        breed: breed.trim(),
        age: birthDate ? "Profil baru · usia dihitung server" : "Belum diisi",
        weight: weight ? `${weight} kg` : "Belum diisi",
        gender: gender === "female" ? "Betina" : "Jantan",
        color: "#57b9f6",
        avatar: species.emoji,
        photoUrl,
        birthDate,
        healthScore: 55,
        nextCare: "Lengkapi profil kesehatan",
        microchip: "Belum terdaftar",
      });
      notify(result.message);
      onClose();
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Profil hewan belum dapat disimpan",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal add-pet-modal connected-pet-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-eyebrow">ANGGOTA KELUARGA BARU</span>
            <h2>Tambah profil hewan</h2>
            <p>Lengkapi identitas dasar agar perawatan lebih personal.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="pet-photo-upload">
          {preview ? (
            <NextImage
              src={preview}
              alt="Preview foto hewan"
              width={320}
              height={320}
              unoptimized
            />
          ) : (
            <span>{species?.emoji ?? "🐾"}</span>
          )}
          <button type="button" onClick={() => inputRef.current?.click()}>
            <Icon name="camera" size={15} />{" "}
            {preview ? "Ganti foto" : "Tambah foto"}
          </button>
          <input
            ref={inputRef}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => choosePhoto(event.target.files?.[0])}
          />
        </div>
        <label className="field-label" htmlFor="pet-species">Jenis hewan *</label>
        <div className="species-picker">
          <span aria-hidden="true">{species?.emoji ?? "🐾"}</span>
          <select
            id="pet-species"
            value={speciesCode}
            disabled={!speciesOptions.length}
            onChange={(event) => setSpeciesCode(event.target.value)}
          >
            {!speciesOptions.length && <option>Memuat katalog spesies…</option>}
            {Object.entries(groupedSpecies).map(([group, items]) => (
              <optgroup key={group} label={groupLabels[group] ?? group}>
                {items.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.emoji} {item.label}
                    {item.scientific_name ? ` · ${item.scientific_name}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {species && (
          <p className="species-hint">
            {groupLabels[species.group] ?? species.group} · profil perawatan {species.care_profile.replaceAll("_", " ")}
          </p>
        )}
        <div className="form-grid">
          {species?.code === "other" && (
            <>
              <label>
                <span>Nama umum spesies *</span>
                <input value={customSpecies} onChange={(event) => setCustomSpecies(event.target.value)} placeholder="Contoh: kelabang gurun" />
              </label>
              <label>
                <span>Nama ilmiah (opsional)</span>
                <input value={customScientificName} onChange={(event) => setCustomScientificName(event.target.value)} placeholder="Genus species" />
              </label>
            </>
          )}
          <label>
            <span>Nama hewan *</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Snoppy"
            />
          </label>
          <label>
            <span>Ras / varietas (opsional)</span>
            <input
              value={breed}
              onChange={(event) => setBreed(event.target.value)}
              placeholder="Contoh: Pomeranian"
            />
          </label>
          <label>
            <span>Jenis kelamin</span>
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
            >
              <option value="male">Jantan</option>
              <option value="female">Betina</option>
            </select>
          </label>
          <label>
            <span>Tanggal lahir / menetas (opsional)</span>
            <input
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              type="date"
            />
          </label>
          <label>
            <span>Berat badan</span>
            <div className="unit-input">
              <input
                value={weight}
                onChange={(event) =>
                  setWeight(event.target.value.replace(/[^0-9.]/g, ""))
                }
                inputMode="decimal"
                placeholder="3.5"
              />
              <em>kg</em>
            </div>
          </label>
        </div>
        <div className="upload-security">
          <Icon name="shield" size={16} />
          <p>
            <b>Upload aman</b>
            <small>JPG, PNG, atau WebP • maksimal 8 MB.</small>
          </p>
        </div>
        <footer>
          <button className="secondary-button" type="button" onClick={onClose}>
            Batal
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={loading || !species}
            onClick={() => void save()}
          >
            {loading ? "Menyimpan..." : "Simpan profil"}{" "}
            <Icon name="arrow" size={16} />
          </button>
        </footer>
      </div>
    </div>
  );
}
