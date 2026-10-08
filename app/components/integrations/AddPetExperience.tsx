"use client";
import { SlivaFilePicker } from "../SlivaFilePicker";
import { LocalizedCopy, LocalizedButton, LocalizedInput } from "../LocalizedCopy";
import { SlivaDatePicker } from "../SlivaDatePicker";

import { SlivaSelect } from "../SlivaSelect";
import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Pet } from "../../lib/petowner-domain";
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
  (({
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
  })[group] as Pet["type"]) ?? "Other";

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
            <span className="section-eyebrow"><LocalizedCopy>{"ANGGOTA KELUARGA BARU"}</LocalizedCopy></span>
            <h2><LocalizedCopy>{"Tambah profil hewan"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Lengkapi identitas dasar agar perawatan lebih personal."}</LocalizedCopy></p>
          </div>
          <LocalizedButton className="modal-close" type="button" onClick={onClose}>
            <Icon name="close" />
          </LocalizedButton>
        </header>
        <div className="pet-photo-upload">
          <LocalizedCopy>{preview ? (
            <NextImage
              src={preview}
              alt="Preview foto hewan"
              width={320}
              height={320}
              unoptimized
            />
          ) : (
            <span><LocalizedCopy>{species?.emoji ?? "🐾"}</LocalizedCopy></span>
          )}</LocalizedCopy>
          <LocalizedButton type="button" onClick={() => inputRef.current?.click()}>
            <Icon name="camera" size={15} /><LocalizedCopy>{" "}</LocalizedCopy>
            <LocalizedCopy>{preview ? "Ganti foto" : "Tambah foto"}</LocalizedCopy>
          </LocalizedButton>
          <SlivaFilePicker
            ref={inputRef}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => choosePhoto(event.target.files?.[0])}
          />
        </div>
        <label className="field-label" htmlFor="pet-species"><LocalizedCopy>{"Jenis hewan *"}</LocalizedCopy></label>
        <div className="species-picker">
          <span aria-hidden="true"><LocalizedCopy>{species?.emoji ?? "🐾"}</LocalizedCopy></span>
          <SlivaSelect aria-label="Jenis hewan"
            id="pet-species"
            value={speciesCode}
            disabled={!speciesOptions.length}
            onChange={(event) => setSpeciesCode(event.target.value)}
          >
            {!speciesOptions.length && <option>Memuat katalog spesies…</option>}
            {Object.entries(groupedSpecies).map(([group, items]) => (
              <optgroup key={group} label={groupLabels[group] ?? group}>
                <LocalizedCopy>{items.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.emoji} {item.label}
                    {item.scientific_name ? ` · ${item.scientific_name}` : ""}
                  </option>
                ))}</LocalizedCopy>
              </optgroup>
            ))}
          </SlivaSelect>
        </div>
        <LocalizedCopy>{species && (
          <p className="species-hint">
            <LocalizedCopy>{groupLabels[species.group] ?? species.group}</LocalizedCopy><LocalizedCopy>{" · profil perawatan"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
            <LocalizedCopy>{species.care_profile.replaceAll("_", " ")}</LocalizedCopy>
          </p>
        )}</LocalizedCopy>
        <div className="form-grid">
          <LocalizedCopy>{species?.code === "other" && (
            <>
              <label>
                <span><LocalizedCopy>{"Nama umum spesies *"}</LocalizedCopy></span>
                <LocalizedInput
                  value={customSpecies}
                  onChange={(event) => setCustomSpecies(event.target.value)}
                  placeholder="Contoh: kelabang gurun"
                />
              </label>
              <label>
                <span><LocalizedCopy>{"Nama ilmiah (opsional)"}</LocalizedCopy></span>
                <LocalizedInput
                  value={customScientificName}
                  onChange={(event) =>
                    setCustomScientificName(event.target.value)
                  }
                  placeholder="Genus species"
                />
              </label>
            </>
          )}</LocalizedCopy>
          <label>
            <span><LocalizedCopy>{"Nama hewan *"}</LocalizedCopy></span>
            <LocalizedInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Snoppy"
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Ras / varietas (opsional)"}</LocalizedCopy></span>
            <LocalizedInput
              value={breed}
              onChange={(event) => setBreed(event.target.value)}
              placeholder="Contoh: Pomeranian"
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Jenis kelamin"}</LocalizedCopy></span>
            <SlivaSelect aria-label="Jenis kelamin"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
            >
              <option value="male">Jantan</option>
              <option value="female">Betina</option>
            </SlivaSelect>
          </label>
          <label>
            <span><LocalizedCopy>{"Tanggal lahir / menetas (opsional)"}</LocalizedCopy></span>
            <SlivaDatePicker
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              type="date"
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Berat badan"}</LocalizedCopy></span>
            <div className="unit-input">
              <LocalizedInput
                value={weight}
                onChange={(event) =>
                  setWeight(event.target.value.replace(/[^0-9.]/g, ""))
                }
                inputMode="decimal"
                placeholder="3.5"
              />
              <em><LocalizedCopy>{"kg"}</LocalizedCopy></em>
            </div>
          </label>
        </div>
        <div className="upload-security">
          <Icon name="shield" size={16} />
          <p>
            <b><LocalizedCopy>{"Upload aman"}</LocalizedCopy></b>
            <small><LocalizedCopy>{"JPG, PNG, atau WebP • maksimal 8 MB."}</LocalizedCopy></small>
          </p>
        </div>
        <footer>
          <LocalizedButton className="secondary-button" type="button" onClick={onClose}><LocalizedCopy>{"Batal"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton
            className="primary-button"
            type="button"
            disabled={loading || !species}
            onClick={() => void save()}
          >
            <LocalizedCopy>{loading ? "Menyimpan..." : "Simpan profil"}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
            <Icon name="arrow" size={16} />
          </LocalizedButton>
        </footer>
      </div>
    </div>
  );
}
