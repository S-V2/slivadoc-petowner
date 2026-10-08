import { useState } from "react";
import { createRoot } from "react-dom/client";
import { SlivaSelect } from "../../app/components/SlivaSelect";
import "../../app/sliva-select.css";

function Fixture() {
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [submitted, setSubmitted] = useState("");
  return (
    <main style={{ maxWidth: 600, margin: "30px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1>Dropdown Slivadoc</h1>
      <form
        style={{ display: "grid", gap: 16 }}
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          Role akses
          <SlivaSelect name="role" aria-label="Role akses" defaultValue="caregiver">
            <option value="owner" disabled>Owner</option>
            <option value="caregiver">Caregiver</option>
            <option value="viewer">Viewer</option>
          </SlivaSelect>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Kategori wajib
          <SlivaSelect name="category" aria-label="Kategori wajib" defaultValue="" required>
            <option value="">Pilih kategori</option>
            <option value="health">Kesehatan</option>
            <option value="nutrition">Nutrisi</option>
          </SlivaSelect>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Provinsi
          <SlivaSelect name="province" aria-label="Provinsi" value={province} onChange={(event) => { setProvince(event.target.value); setCity(""); }}>
            <option value="">Pilih provinsi</option>
            <optgroup label="Sumatera"><option value="aceh">Aceh</option><option value="sumut">Sumatera Utara</option><option value="sumbar">Sumatera Barat</option></optgroup>
            <optgroup label="Jawa"><option value="jakarta">DKI Jakarta</option><option value="jabar">Jawa Barat</option><option value="jateng">Jawa Tengah</option><option value="jatim">Jawa Timur</option><option value="banten">Banten</option><option value="yogyakarta">DI Yogyakarta</option></optgroup>
          </SlivaSelect>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Kabupaten / kota
          <SlivaSelect name="city" aria-label="Kabupaten / kota" value={city} disabled={!province} onChange={(event) => setCity(event.target.value)}>
            <option value="">Pilih kabupaten / kota</option>
            {province === "jabar" ? <><option value="bandung">Kota Bandung</option><option value="bogor">Kota Bogor</option></> : <option value="other">Kota lainnya</option>}
          </SlivaSelect>
        </label>
        <SlivaSelect name="tickets" aria-label="Jumlah tiket"><option>1</option><option>2</option></SlivaSelect>
        <button type="submit">Kirim formulir</button>
        <button type="reset">Reset formulir</button>
      </form>
      <p role="status" aria-label="Hasil formulir">{submitted}</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
