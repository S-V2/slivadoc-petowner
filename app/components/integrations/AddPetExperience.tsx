"use client";

import { useRef, useState } from "react";
import type { Pet } from "../../data/mock";
import { uploadImage } from "../../lib/petowner-api";
import { Icon } from "../Icon";

type Props = {
  onClose: () => void;
  onSaved: (pet: Pet) => void;
  notify: (message: string) => void;
};

const typeOptions = [
  { label: "Anjing", value: "Dog", avatar: "🐕" },
  { label: "Kucing", value: "Cat", avatar: "🐈" },
  { label: "Kelinci", value: "Rabbit", avatar: "🐇" },
  { label: "Burung", value: "Bird", avatar: "🦜" },
  { label: "Lainnya", value: "Other", avatar: "🐾" },
] as const;

export default function AddPetExperience({ onClose, onSaved, notify }: Props) {
  const [type, setType] = useState<(typeof typeOptions)[number]>(typeOptions[0]);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("Jantan");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const choosePhoto = (selected?: File) => {
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) return notify("Format foto harus JPG, PNG, atau WebP");
    if (selected.size > 8 * 1024 * 1024) return notify("Ukuran foto maksimal 8 MB");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const save = async () => {
    if (!name.trim() || !breed.trim() || !birthDate) return notify("Lengkapi nama, ras, dan tanggal lahir");
    setLoading(true);
    try {
      let photoUrl: string | undefined;
      if (file) photoUrl = (await uploadImage(file, "pets")).url;
      const birth = new Date(birthDate);
      const months = Math.max(0, Math.floor((Date.now() - birth.getTime()) / 2_629_800_000));
      const pet: Pet = {
        id: `pet-${crypto.randomUUID()}`,
        name: name.trim(),
        type: type.value,
        breed: breed.trim(),
        age: months >= 12 ? `${Math.floor(months / 12)} tahun ${months % 12} bulan` : `${months} bulan`,
        weight: weight.trim() ? `${weight.trim()} kg` : "Belum diisi",
        gender,
        color: "#57b9f6",
        avatar: type.avatar,
        photoUrl,
        birthDate,
        healthScore: 60,
        nextCare: "Lengkapi profil kesehatan",
        microchip: "Belum terdaftar",
      };
      onSaved(pet);
      notify(photoUrl ? "Profil dan foto Cloudinary berhasil disimpan" : "Profil hewan berhasil disimpan");
      onClose();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Profil hewan belum dapat disimpan");
    } finally { setLoading(false); }
  };

  return <div className="modal-overlay" onMouseDown={onClose}><div className="modal add-pet-modal connected-pet-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-eyebrow">ANGGOTA KELUARGA BARU</span><h2>Tambah profil hewan</h2><p>Foto disimpan aman ke Cloudinary melalui server Slivadoc.</p></div><button className="modal-close" type="button" onClick={onClose}><Icon name="close" /></button></header><div className="pet-photo-upload">{preview ? <img src={preview} alt="Preview foto hewan" /> : <span>{type.avatar}</span>}<button type="button" onClick={() => inputRef.current?.click()}><Icon name="camera" size={15} /> {preview ? "Ganti foto" : "Tambah foto"}</button><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0])} /></div><label className="field-label">Jenis hewan</label><div className="pet-type-grid">{typeOptions.map((item) => <button type="button" className={type.value === item.value ? "selected" : ""} onClick={() => setType(item)} key={item.value}><span>{item.avatar}</span>{item.label}</button>)}</div><div className="form-grid"><label><span>Nama hewan *</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Snoppy" /></label><label><span>Ras *</span><input value={breed} onChange={(event) => setBreed(event.target.value)} placeholder="Contoh: Pomeranian" /></label><label><span>Jenis kelamin</span><select value={gender} onChange={(event) => setGender(event.target.value)}><option>Jantan</option><option>Betina</option><option>Belum diketahui</option></select></label><label><span>Tanggal lahir *</span><input value={birthDate} onChange={(event) => setBirthDate(event.target.value)} type="date" /></label><label><span>Berat badan</span><div className="unit-input"><input value={weight} onChange={(event) => setWeight(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="3.5" /><em>kg</em></div></label></div><div className="upload-security"><Icon name="shield" size={16} /><p><b>Upload aman</b><small>JPG, PNG, atau WebP • maksimal 8 MB • transform otomatis Cloudinary</small></p></div><footer><button className="secondary-button" type="button" onClick={onClose}>Batal</button><button className="primary-button" type="button" disabled={loading} onClick={save}>{loading ? "Menyimpan..." : "Simpan profil"} <Icon name="arrow" size={16} /></button></footer></div></div>;
}
