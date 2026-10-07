"""Independent CSV validation and delivery packaging (Python standard library)."""
import collections
import csv
import hashlib
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
out = root / "outputs/seo-2026-10-07"
summary = json.loads((out / "keyword-summary.json").read_text())
seen, regions, paths = set(), set(), set()
languages, clusters = collections.Counter(), collections.Counter()
with (out / "slivadoc-900000-keywords.csv").open(encoding="utf-8-sig", newline="") as source:
    for row in csv.DictReader(source):
        digest = hashlib.sha256(row["keyword"].encode()).digest()
        assert digest not in seen, f"Duplicate keyword: {row['keyword']}"
        seen.add(digest)
        assert row["monthly_search_volume"] == "", "Unmeasured volume must remain blank"
        assert not row["keyword"].startswith(("=", "+", "-", "@")), "CSV formula risk"
        assert row["target_path"].startswith("/"), "Target must be a site path"
        paths.add(row["target_path"])
        languages[row["language"]] += 1
        clusters[row["cluster"]] += 1
        regions.update(filter(None, row["region_code"].split("|")))
assert len(seen) == 900000
assert len(regions) == summary["totalRegions"] == 91599
assert dict(languages) == summary["counts"]["language"]
assert dict(clusters) == summary["counts"]["cluster"]
assert (out / "Slivadoc-SEO-Ringkasan.xlsx").exists()
result = {"uniqueKeywords": len(seen), "coveredRegionCodes": len(regions), "uniqueTargets": len(paths), "language": dict(languages), "clusters": len(clusters), "duplicateKeywords": 0, "volumeInvented": False}
(out / "validation.json").write_text(json.dumps(result, indent=2) + "\n")
readme = """SLIVADOC SEO — 7 OKTOBER 2026

900.000 kandidat keyword unik: 840.000 Indonesia dan 60.000 Inggris.
CSV lengkap dapat dibuka sebagai UTF-8. Kode wilayah harus diimpor sebagai teks.
Ringkasan XLSX berisi jumlah per cluster dan 503 seed keyword untuk tinjauan.

Keyword merupakan hasil perluasan taksonomi editorial dan data wilayah, bukan
data volume pencarian dari Google. Kolom monthly_search_volume sengaja kosong.
Validasi permintaan dan ketersediaan produk/mitra sebelum memilih prioritas.
Kolom readiness menjelaskan kebutuhan data/lokalisasi/kelayakan program.
Frasa negara lain adalah riset, bukan bukti Slivadoc melayani negara tersebut.

target_path adalah tujuan yang relevan, bukan perintah membuat satu halaman
per keyword. Jangan menempelkan bank ini dalam HTML atau meta keywords.
Desa/kelurahan bernama identik menggunakan beberapa kode dipisahkan | dan
diarahkan ke direktori induk. Cakupan kode wilayah tidak berarti ada mitra di
setiap daerah. Program lifetime mengikuti ketentuan 1.000 mitra pertama yang
ditemukan pada materi program; kuota dan kelayakan perlu konfirmasi onboarding.

Sumber: https://github.com/cahyadsn/wilayah (MIT, snapshot 2026-02-13).
Referensi SEO: https://developers.google.com/search/docs/essentials/spam-policies
Implementasi lokal belum merupakan deployment produksi atau indexing Google.
"""
(out / "README.txt").write_text(readme)
with zipfile.ZipFile(out / "Slivadoc-SEO-900000.zip", "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for name in ["slivadoc-900000-keywords.csv", "keyword-summary.json", "validation.json", "README.txt"]:
        archive.write(out / name, name)
    archive.write(root / "app/data/regions/LICENSE.txt", "REGION-DATA-LICENSE.txt")
print(json.dumps(result))
