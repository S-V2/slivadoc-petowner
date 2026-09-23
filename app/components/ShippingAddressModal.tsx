"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import type { LocationResult } from "../lib/petowner-api";
import {
  createPetOwnerShippingAddress,
  getPetOwnerDistricts,
  getPetOwnerProvinces,
  getPetOwnerRegencies,
  getPetOwnerVillages,
  updatePetOwnerShippingAddress,
  type PetOwnerShippingAddress,
  type RegionOption,
} from "../lib/platform-api";

type Notify = (message: string) => void;
type RegionLevel = "province" | "regency" | "district" | "village";
type RegionIDs = Record<RegionLevel, string>;
type Regions = Record<RegionLevel, RegionOption[]>;
type AddressForm = {
  label: string;
  name: string;
  phone: string;
  address: string;
  post_code: string;
};

const levels: RegionLevel[] = ["province", "regency", "district", "village"];


function emptyRegions(): Regions {
  return { province: [], regency: [], district: [], village: [] };
}

function optionFromSaved(value?: { code: string; name: string }) {
  return value ? { id: value.code, code: value.code, name: value.name } : null;
}

function mergeOption(options: RegionOption[], option: RegionOption | null) {
  if (!option || options.some((item) => item.code === option.code)) return options;
  return [option, ...options];
}

function validForm(form: AddressForm, regionIDs: RegionIDs) {
  return (
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 8 &&
    form.address.trim().length >= 8 &&
    /^\d{5}$/.test(form.post_code.trim()) &&
    Object.values(regionIDs).every(Boolean)
  );
}

export default function ShippingAddressModal({
  account,
  current,
  currentLocation,
  onOpenLocation,
  close,
  notify,
  onSaved,
}: {
  account: { full_name: string; phone: string };
  current: PetOwnerShippingAddress | null;
  currentLocation: LocationResult | null;
  onOpenLocation: () => void;
  close: () => void;
  notify: Notify;
  onSaved: (address: PetOwnerShippingAddress) => void;
}) {
  const [form, setForm] = useState<AddressForm>(() => ({
    label: current?.label ?? "Rumah",
    name: current?.recipient_name ?? account.full_name,
    phone: current?.phone ?? account.phone,
    address: current?.address ?? "",
    post_code: current?.post_code ?? "",
  }));
  const [regionIDs, setRegionIDs] = useState<RegionIDs>(() => ({
    province: current?.province.code ?? "",
    regency: current?.regency.code ?? "",
    district: current?.district.code ?? "",
    village: current?.village.code ?? "",
  }));
  const [regions, setRegions] = useState<Regions>(() => ({
    province: mergeOption([], optionFromSaved(current?.province)),
    regency: mergeOption([], optionFromSaved(current?.regency)),
    district: mergeOption([], optionFromSaved(current?.district)),
    village: mergeOption([], optionFromSaved(current?.village)),
  }));
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const next = emptyRegions();
        next.province = mergeOption(
          (await getPetOwnerProvinces()).data,
          optionFromSaved(current?.province),
        );
        if (current?.province.code) {
          next.regency = mergeOption(
            (await getPetOwnerRegencies(current.province.code)).data,
            optionFromSaved(current.regency),
          );
        }
        if (current?.regency.code) {
          next.district = mergeOption(
            (await getPetOwnerDistricts(current.regency.code)).data,
            optionFromSaved(current.district),
          );
        }
        if (current?.district.code) {
          next.village = mergeOption(
            (await getPetOwnerVillages(current.district.code)).data,
            optionFromSaved(current.village),
          );
        }
        if (live) setRegions(next);
      } catch (error) {
        if (live) notify(error instanceof Error ? error.message : "Wilayah belum dapat dimuat");
      } finally {
        if (live) setLoadingRegions(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [current, notify]);

  async function loadRegions(level: RegionLevel, parentCode: string) {
    const result =
      level === "province"
        ? await getPetOwnerProvinces()
        : level === "regency"
          ? await getPetOwnerRegencies(parentCode)
          : level === "district"
            ? await getPetOwnerDistricts(parentCode)
            : await getPetOwnerVillages(parentCode);
    setRegions((value) => ({ ...value, [level]: result.data }));
  }

  function selectRegion(level: RegionLevel, code: string) {
    const index = levels.indexOf(level);
    setRegionIDs((value) => {
      const next = { ...value, [level]: code };
      for (let child = index + 1; child < levels.length; child += 1) {
        next[levels[child]] = "";
      }
      return next;
    });
    setRegions((value) => {
      const next = { ...value };
      for (let child = index + 1; child < levels.length; child += 1) {
        next[levels[child]] = [];
      }
      return next;
    });
    if (code && index < levels.length - 1) {
      void loadRegions(levels[index + 1], code).catch((error) =>
        notify(error instanceof Error ? error.message : "Wilayah belum dapat dimuat"),
      );
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validForm(form, regionIDs)) {
      notify("Lengkapi nama, alamat, wilayah, dan kode pos terlebih dahulu");
      return;
    }
    const selected = Object.fromEntries(
      levels.map((level) => [
        level,
        regions[level].find((option) => option.code === regionIDs[level]),
      ]),
    ) as Record<RegionLevel, RegionOption | undefined>;
    if (levels.some((level) => !selected[level])) {
      notify("Wilayah pengiriman belum lengkap");
      return;
    }
    setBusy(true);
    try {
      const input = {
        label: form.label.trim(),
        recipient_name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        post_code: form.post_code.trim(),
        province: { code: selected.province!.code, name: selected.province!.name },
        regency: { code: selected.regency!.code, name: selected.regency!.name },
        district: { code: selected.district!.code, name: selected.district!.name },
        village: { code: selected.village!.code, name: selected.village!.name },
        latitude: currentLocation?.latitude ?? current?.latitude ?? null,
        longitude: currentLocation?.longitude ?? current?.longitude ?? null,
      };
      const result = current
        ? await updatePetOwnerShippingAddress(current.id, input)
        : await createPetOwnerShippingAddress(input);
      onSaved(result.address);
      notify(result.message);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Alamat belum dapat disimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section className="modal form-modal shipping-address-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={close} aria-label="Tutup alamat pengiriman">
          <Icon name="close" />
        </button>
        <span className="section-eyebrow">ALAMAT PENGIRIMAN</span>
        <h2>{current ? "Ubah alamat" : "Tambah alamat"}</h2>
        <p className="shipping-address-help">Alamat ini dipakai cart untuk menghitung cabang terdekat dan ongkir.</p>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span>Label alamat</span>
            <input value={form.label} onChange={(event) => setForm((value) => ({ ...value, label: event.target.value }))} required placeholder="Rumah, kantor, kos" />
          </label>
          <div className="form-row">
            <label>
              <span>Nama penerima</span>
              <input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required />
            </label>
            <label>
              <span>No. WhatsApp</span>
              <input value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} required />
            </label>
          </div>
          <label>
            <span>Alamat lengkap</span>
            <textarea value={form.address} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} rows={3} required placeholder="Nama jalan, nomor rumah, RT/RW" />
          </label>
          <div className="cart-location-row">
            <span>
              <small>Koordinat untuk menentukan cabang terdekat</small>
              <b>{currentLocation?.label ?? (current?.latitude ? "Lokasi tersimpan" : "Belum dipilih")}</b>
            </span>
            <button type="button" onClick={onOpenLocation}>{currentLocation ? "Ubah lokasi" : "Pilih lokasi"}</button>
          </div>
          <div className="form-row">
            {levels.slice(0, 2).map((level) => (
              <label key={level}>
                <span>{level === "province" ? "Provinsi" : "Kabupaten / kota"}</span>
                <select value={regionIDs[level]} disabled={loadingRegions || (level !== "province" && !regionIDs[levels[levels.indexOf(level) - 1]])} onChange={(event) => selectRegion(level, event.target.value)}>
                  <option value="">Pilih {level === "province" ? "provinsi" : "kabupaten / kota"}</option>
                  {regions[level].map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="form-row">
            {levels.slice(2).map((level) => (
              <label key={level}>
                <span>{level === "district" ? "Kecamatan" : "Kelurahan / desa"}</span>
                <select value={regionIDs[level]} disabled={loadingRegions || !regionIDs[levels[levels.indexOf(level) - 1]]} onChange={(event) => selectRegion(level, event.target.value)}>
                  <option value="">Pilih {level === "district" ? "kecamatan" : "kelurahan / desa"}</option>
                  {regions[level].map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
                </select>
              </label>
            ))}
          </div>
          <label>
            <span>Kode pos</span>
            <input inputMode="numeric" value={form.post_code} onChange={(event) => setForm((value) => ({ ...value, post_code: event.target.value.replace(/\D/g, "").slice(0, 5) }))} required placeholder="12345" />
          </label>
          <button className="primary-button full" disabled={busy}>{busy ? "Menyimpan alamat…" : "Simpan alamat utama"}</button>
        </form>
      </section>
    </div>
  );
}
