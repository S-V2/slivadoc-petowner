# Slivadoc Pet Owner API

Companion service (Express + Socket.IO) untuk aplikasi Pet Owner Slivadoc.

## Environment Variables

| Variable | Default | Deskripsi |
| --- | --- | --- |
| `PORT` | `8090` | Port HTTP server |
| `TRUST_PROXY_HOPS` | `0` | Jumlah hop reverse proxy (set `1` di belakang Caddy / Docker Compose) |
| `CORS_ORIGINS` | (lihat catatan) | Daftar origin yang diizinkan (dipisahkan koma). Di development (`NODE_ENV !== 'production'`), origin `localhost:3000`, `3001`, `5173`, `8081` aktif secara default. Di production, hanya origin eksplisit yang diizinkan. |
| `SLIVADOC_API_URL` | `http://localhost:8080` | URL platform API Slivadoc (wajib diset pada deployment container) |
| `PHOTON_BASE_URL` | `http://photon:2322` | URL instance Photon (geocoder self-hosted) |
| `CLOUDINARY_CLOUD_NAME` | - | Cloudinary cloud name untuk upload foto |
| `CLOUDINARY_API_KEY` | - | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | - | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | `slivadoc/petowner` | Folder upload Cloudinary |
| `OPENAI_API_KEY` | - | OpenAI API key untuk SlivaCare |
| `OPENAI_MODEL` | `gpt-5.6-luna` | OpenAI model untuk SlivaCare |

## Health Check

Endpoint `GET /health` mengembalikan status service dan probe platform backend:

```json
{
  "status": "ok",
  "service": "slivadoc-petowner-api",
  "platform": {
    "configured": true,
    "host": "api.slivadoc.xyz",
    "reachable": true
  }
}
```

## Endpoint Lokasi

| Endpoint | Deskripsi |
| --- | --- |
| `GET /api/location/reverse?lat=&lng=` | Reverse geocoding via Photon |
| `GET /api/location/search?q=` | Pencarian lokasi via Photon (dibatasi Indonesia) |

Kedua endpoint lokasi sekarang memerlukan autentikasi (`Authorization: Bearer <token>` Slivadoc); tanpa token mengembalikan `401 authentication_required`.
