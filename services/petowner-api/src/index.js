import { createTranslationService, translationRequest } from "./translation.js";
import { join } from "node:path";
import "dotenv/config";
import { createServer } from "node:http";
import cloudinaryPackage from "cloudinary";
import { mediaUploadFailure } from "./media-upload-error.js";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { Server as SocketServer } from "socket.io";
import { z } from "zod";
import { answerPetQuestion } from "./pet-agent.js";
import {
  createCorsOriginValidator,
  isOriginAllowed,
  resolveAllowedOrigins,
} from "./cors.js";
import {
  bearerToken,
  createPlatformClient,
  petIDFromConversation,
  PlatformAuthError,
} from "./platform-client.js";

const port = Number(process.env.PORT || 8090);
const origins = resolveAllowedOrigins(
  process.env.CORS_ORIGINS,
  process.env.NODE_ENV,
);
const validateOrigin = createCorsOriginValidator(origins);
const corsOptions = {
  origin: validateOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
const platformBaseUrl =
  process.env.SLIVADOC_API_URL || "http://localhost:8080";
if (!process.env.SLIVADOC_API_URL) {
  console.warn(
    "[PetOwner API] WARNING: SLIVADOC_API_URL is unset. Defaulting to http://localhost:8080 which will fail in containerized environments.",
  );
}
let platformHost = "localhost:8080";
try {
  platformHost = new URL(platformBaseUrl).host;
} catch {
  platformHost = platformBaseUrl;
}
let platformReachable = false;
let lastPlatformProbe = 0;
let probeInFlight = false;

async function probePlatformHealth() {
  if (probeInFlight) return;
  probeInFlight = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${platformBaseUrl}/health/live`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    platformReachable = res.ok;
  } catch {
    platformReachable = false;
  } finally {
    lastPlatformProbe = Date.now();
    probeInFlight = false;
  }
}
probePlatformHealth().catch(() => {});

const platform = createPlatformClient(platformBaseUrl);

const photonBase = process.env.PHOTON_BASE_URL || "http://photon:2322";
if (!process.env.PHOTON_BASE_URL) {
  console.warn(
    "[PetOwner API] WARNING: PHOTON_BASE_URL is not set; defaulting to http://photon:2322. Set it to your self-hosted Photon instance.",
  );
}

function photonLabel(p) {
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  return (
    [p.name, street, p.district, p.city, p.state, p.country]
      .filter((part, i, parts) => part && parts.indexOf(part) === i)
      .join(", ") || "Lokasi"
  );
}

function photonResult(feature) {
  const p = feature.properties || {};
  const [longitude, latitude] = feature.geometry.coordinates;
  const address = {};
  for (const key of [
    "name",
    "housenumber",
    "street",
    "district",
    "city",
    "county",
    "state",
    "postcode",
    "country",
    "countrycode",
  ]) {
    if (p[key] !== undefined) address[key] = String(p[key]);
  }
  return {
    latitude,
    longitude,
    label: photonLabel(p),
    address,
    provider: "photon",
  };
}

async function photonFetch(path, params) {
  const url = new URL(path, photonBase);
  url.search = new URLSearchParams(params).toString();
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Photon failed (${result.status})`);
  return (await result.json()).features || [];
}

const locationLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const locationCache = new Map();
const LOCATION_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_LOCATION_CACHE_ENTRIES = 500;

function getCachedLocation(key) {
  const entry = locationCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    locationCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedLocation(key, data) {
  if (locationCache.size >= MAX_LOCATION_CACHE_ENTRIES) {
    const oldestKey = locationCache.keys().next().value;
    if (oldestKey) locationCache.delete(oldestKey);
  }
  locationCache.set(key, {
    data,
    expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
  });
}

const app = express();
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 0));
const server = createServer(app);
const io = new SocketServer(server, { cors: corsOptions });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_request, file, callback) =>
    callback(
      null,
      ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype),
    ),
});
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_request, file, callback) =>
    callback(
      null,
      [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/quicktime",
        "video/webm",
      ].includes(file.mimetype),
    ),
});

// Tax and commercial documents (faktur, invoice, bukti potong) are kept as
// uploaded: Cloudinary "raw" resources, so PDFs are neither transformed nor
// caught by the account's PDF delivery restriction for image resources.
const documentFormats = ["application/pdf", "image/jpeg", "image/png"];
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) =>
    callback(null, documentFormats.includes(file.mimetype)),
});

const cloudinary = cloudinaryPackage.v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use((request, response, next) => {
  const originAllowed = isOriginAllowed(request.headers.origin, origins);
  if (
    request.method === "OPTIONS" &&
    request.headers.origin &&
    !originAllowed
  ) {
    return response
      .status(403)
      .json({ error: "cors_origin_denied", message: "Origin tidak diizinkan" });
  }
  if (
    request.headers["access-control-request-private-network"] === "true" &&
    originAllowed
  ) {
    response.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 180,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

async function requirePlatformUser(request, response, next) {
  try {
    const token = bearerToken(request.headers.authorization);
    request.platformToken = token;
    request.platformUser = await platform.identity(token);
    next();
  } catch (error) {
    response
      .status(error instanceof PlatformAuthError ? error.status : 401)
      .json({
        error: "authentication_required",
        message: "Login Slivadoc diperlukan",
      });
  }
}

const translate = createTranslationService({ baseURL: process.env.SLIVA_TRANSLATION_URL, cacheDir: join(process.env.DATA_DIR || "/tmp/slivadoc-petowner", "translations") });
app.post("/api/translations", rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }), async (request, response) => {
  const parsed = translationRequest.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "invalid_translation_request" });
  try { const translations = await translate(parsed.data); response.json({ translations, target: "en" }); }
  catch (error) { response.status(error.message === "translation_busy" ? 429 : 503).json({ error: "translation_unavailable", message: "Translation is temporarily unavailable. Please try again." }); }
});

app.get("/health", (_request, response) => {
  if (Date.now() - lastPlatformProbe > 30_000) {
    probePlatformHealth().catch(() => {});
  }
  response.json({
    status: "ok",
    service: "slivadoc-petowner-api",
    platform: {
      configured: Boolean(process.env.SLIVADOC_API_URL),
      host: platformHost,
      reachable: platformReachable,
    },
  });
});
app.get("/api/config/status", (_request, response) =>
  response.json({
    cloudinary: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
    ),
    map: "photon-protomaps",
    realtime: true,
  }),
);

app.post(
  "/api/uploads/images",
  requirePlatformUser,
  upload.single("file"),
  async (request, response, next) => {
    try {
      if (!request.file)
        return response.status(400).json({ error: "image_required" });
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return response.status(503).json({
          error: "cloudinary_not_configured",
          message: "Isi credential Cloudinary pada services/petowner-api/.env",
        });
      }
      const folder = `${process.env.CLOUDINARY_FOLDER || "slivadoc/petowner"}/${request.body.folder || "pets"}`;
      const result = await new Promise((resolveUpload, rejectUpload) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
            transformation: [
              {
                width: 1600,
                height: 1600,
                crop: "limit",
                quality: "auto",
                fetch_format: "auto",
              },
            ],
          },
          (error, uploaded) =>
            error ? rejectUpload(error) : resolveUpload(uploaded),
        );
        stream.end(request.file.buffer);
      });
      response.status(201).json({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/uploads/documents",
  requirePlatformUser,
  documentUpload.single("file"),
  async (request, response, next) => {
    try {
      if (!request.file)
        return response.status(400).json({
          error: "document_required",
          message: "Pilih berkas PDF, JPG, atau PNG maksimal 10 MB",
        });
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return response.status(503).json({
          error: "cloudinary_not_configured",
          message: "Penyimpanan dokumen belum dikonfigurasi",
        });
      }
      const requestedFolder = String(request.body.folder || "documents")
        .replace(/[^a-z0-9/_-]/gi, "")
        .slice(0, 80);
      const folder = `${process.env.CLOUDINARY_FOLDER || "slivadoc/petowner"}/${requestedFolder || "documents"}`;
      const result = await new Promise((resolveUpload, rejectUpload) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: "raw" },
          (error, uploaded) =>
            error ? rejectUpload(error) : resolveUpload(uploaded),
        );
        stream.end(request.file.buffer);
      });
      response.status(201).json({
        url: result.secure_url,
        publicId: result.public_id,
        mimeType: request.file.mimetype,
        bytes: request.file.size,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/uploads/media",
  requirePlatformUser,
  mediaUpload.single("file"),
  async (request, response) => {
    try {
      if (!request.file)
        return response.status(400).json({
          error: "media_required",
          message: "Pilih foto atau video yang ingin diunggah",
        });
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return response.status(503).json({
          error: "cloudinary_not_configured",
          message: "Penyimpanan media belum dikonfigurasi",
        });
      }
      const resourceType = request.file.mimetype.startsWith("video/")
        ? "video"
        : "image";
      const requestedFolder = String(request.body.folder || "pethub")
        .replace(/[^a-z0-9/_-]/gi, "")
        .slice(0, 80);
      const folder = `${process.env.CLOUDINARY_FOLDER || "slivadoc/petowner"}/${requestedFolder || "pethub"}`;
      const result = await new Promise((resolveUpload, rejectUpload) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: resourceType,
            timeout: 15000,
            ...(resourceType === "image"
              ? {
                  transformation: [
                    {
                      width: 1600,
                      height: 1600,
                      crop: "limit",
                      quality: "auto",
                      fetch_format: "auto",
                    },
                  ],
                }
              : {}),
          },
          (error, uploaded) =>
            error ? rejectUpload(error) : resolveUpload(uploaded),
        );
        stream.end(request.file.buffer);
      });
      const thumbnailUrl =
        resourceType === "video"
          ? cloudinary.url(result.public_id, {
              resource_type: "video",
              format: "jpg",
              secure: true,
              transformation: [
                { start_offset: "0", width: 720, height: 960, crop: "fill" },
              ],
            })
          : result.secure_url;
      response.status(201).json({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType,
        thumbnailUrl,
        width: result.width,
        height: result.height,
        duration: result.duration,
      });
    } catch (error) {
      const failure = mediaUploadFailure(error);
      response.status(failure.status).json({ error: failure.error, message: failure.message });
    }
  },
);

app.get(
  "/api/location/reverse",
  requirePlatformUser,
  locationLimiter,
  async (request, response, next) => {
    try {
      const latRaw = request.query.lat;
      const lngRaw = request.query.lng;
      if (
        latRaw === undefined ||
        lngRaw === undefined ||
        latRaw === "" ||
        lngRaw === ""
      ) {
        return response.status(400).json({
          error: "invalid_params",
          message: "Parameter lat (-90..90) dan lng (-180..180) diperlukan",
        });
      }
      const latitude = Number(latRaw);
      const longitude = Number(lngRaw);
      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        return response.status(400).json({
          error: "invalid_params",
          message:
            "Parameter lat (-90..90) dan lng (-180..180) di luar rentang valid",
        });
      }
      const cacheKey = `reverse:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      const cached = getCachedLocation(cacheKey);
      if (cached) {
        return response.json(cached);
      }
      const [feature] = await photonFetch("/reverse", {
        lat: String(latitude),
        lon: String(longitude),
        lang: "id",
      });
      const payload = feature
        ? photonResult(feature)
        : {
            latitude,
            longitude,
            label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            address: {},
            provider: "photon",
          };
      setCachedLocation(cacheKey, payload);
      response.json(payload);
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/location/search",
  requirePlatformUser,
  locationLimiter,
  async (request, response, next) => {
    try {
      const rawQ =
        typeof request.query.q === "string" ? request.query.q.trim() : "";
      if (!rawQ || rawQ.length < 1 || rawQ.length > 160) {
        return response.status(400).json({
          error: "invalid_params",
          message: "Parameter q (1-160 karakter) diperlukan",
        });
      }
      const cacheKey = `search:${rawQ.toLowerCase()}`;
      const cached = getCachedLocation(cacheKey);
      if (cached) {
        return response.json(cached);
      }
      // bbox = Indonesia; Photon has no country filter
      const features = await photonFetch("/api", {
        q: rawQ,
        bbox: "95,-11,141,6",
        lang: "id",
        limit: "6",
      });
      const payload = features.map((feature) => ({
        id:
          `${feature.properties?.osm_type ?? ""}${feature.properties?.osm_id ?? ""}` ||
          feature.geometry.coordinates.join(","),
        ...photonResult(feature),
        type: feature.properties?.osm_value,
      }));
      setCachedLocation(cacheKey, payload);
      response.json(payload);
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/assistant/chat",
  requirePlatformUser,
  rateLimit({ windowMs: 60_000, limit: 20 }),
  async (request, response, next) => {
    try {
      const result = await answerPetQuestion(
        { ...request.body, userId: request.platformUser.id },
        {
          openAIKey: process.env.OPENAI_API_KEY,
          openAIModel: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        },
      );
      response.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  },
);

app.all(/^\/api\/community(?:\/.*)?$/, (_request, response) =>
  response.status(410).json({
    error: "legacy_community_removed",
    message:
      "Gunakan Community Slivadoc yang tersimpan pada database platform.",
  }),
);

io.use(async (socket, next) => {
  try {
    const token = String(socket.handshake.auth?.token || "");
    socket.data.platformToken = token;
    socket.data.platformUser = await platform.identity(token);
    next();
  } catch {
    next(new Error("authentication_required"));
  }
});

io.on("connection", (socket) => {
  socket.on(
    "chat:join",
    async ({ conversationId = "" } = {}, acknowledge = () => {}) => {
      try {
        const petID = petIDFromConversation(conversationId);
        if (!petID) throw new PlatformAuthError("Percakapan tidak valid", 400);
        const history = await platform.careHistory(
          socket.data.platformToken,
          petID,
        );
        await socket.join(`chat:${conversationId}`);
        const messages = (history.data || []).map((item) => ({
          id: item.id,
          conversationId,
          senderId: item.sender_id,
          senderName: item.sender_name,
          body: item.body,
          createdAt: item.created_at,
        }));
        socket.emit("chat:history", messages);
        acknowledge({ ok: true, count: messages.length });
      } catch (error) {
        acknowledge({ ok: false, error: error.message || "room_denied" });
      }
    },
  );
  socket.on("chat:send", async (payload = {}, acknowledge = () => {}) => {
    try {
      const input = z
        .object({
          conversationId: z.string().min(1).max(120),
          body: z.string().trim().min(1).max(2000),
        })
        .parse(payload);
      const petID = petIDFromConversation(input.conversationId);
      if (!petID || !socket.rooms.has(`chat:${input.conversationId}`))
        throw new PlatformAuthError("Buka room terlebih dahulu", 403);
      const persisted = await platform.createCareMessage(
        socket.data.platformToken,
        petID,
        input.body,
      );
      const message = {
        id: persisted.id,
        conversationId: input.conversationId,
        senderId: persisted.sender_id,
        senderName: persisted.sender_name,
        body: persisted.body,
        createdAt: persisted.created_at,
      };
      io.to(`chat:${input.conversationId}`).emit("chat:message", message);
      acknowledge({ ok: true, message });
    } catch (error) {
      acknowledge({ ok: false, error: error.message });
    }
  });
});

app.use((error, _request, response, _next) => {
  void _next;
  console.error(error);
  if (error instanceof z.ZodError)
    return response
      .status(400)
      .json({ error: "validation_error", details: error.issues });
  if (error?.code === "LIMIT_FILE_SIZE")
    return response
      .status(413)
      .json({ error: _request.path === "/api/uploads/documents" ? "document_too_large" : "image_too_large", message: _request.path === "/api/uploads/documents" ? "Ukuran maksimal dokumen 10 MB" : "Ukuran maksimal foto 8 MB" });
  response.status(500).json({
    error: "internal_error",
    message: "Terjadi gangguan pada Pet Owner API",
  });
});

server.listen(port, () =>
  console.log(`Slivadoc Pet Owner API ready at http://localhost:${port}`),
);
