import "dotenv/config";
import { createServer } from "node:http";
import cloudinaryPackage from "cloudinary";
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
  parseAllowedOrigins,
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

const nominatimBase =
  process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
if (
  !process.env.NOMINATIM_BASE_URL ||
  nominatimBase.includes("nominatim.openstreetmap.org")
) {
  console.warn(
    "[PetOwner API] WARNING: NOMINATIM_BASE_URL is using the public OpenStreetMap instance. Production traffic requires a dedicated Nominatim instance.",
  );
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
    openai: Boolean(process.env.OPENAI_API_KEY),
    map: "openstreetmap-nominatim",
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

app.get(
  "/api/location/reverse",
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
      const base =
        process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
      const url = new URL("/reverse", base);
      url.search = new URLSearchParams({
        format: "jsonv2",
        lat: String(latitude),
        lon: String(longitude),
        zoom: "18",
        addressdetails: "1",
      }).toString();
      const result = await fetch(url, {
        headers: {
          "User-Agent":
            process.env.NOMINATIM_USER_AGENT || "SlivadocPetOwner/0.1",
        },
      });
      if (!result.ok) throw new Error(`Nominatim failed (${result.status})`);
      const data = await result.json();
      const payload = {
        latitude,
        longitude,
        label: data.display_name,
        address: data.address,
        provider: "OpenStreetMap/Nominatim",
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
      const base =
        process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
      const url = new URL("/search", base);
      url.search = new URLSearchParams({
        format: "jsonv2",
        q: rawQ,
        countrycodes: "id",
        limit: "6",
        addressdetails: "1",
      }).toString();
      const result = await fetch(url, {
        headers: {
          "User-Agent":
            process.env.NOMINATIM_USER_AGENT || "SlivadocPetOwner/0.1",
        },
      });
      if (!result.ok) throw new Error(`Nominatim failed (${result.status})`);
      const data = await result.json();
      const payload = data.map((item) => ({
        id: String(item.place_id),
        label: item.display_name,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        type: item.type,
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
      .json({ error: "image_too_large", message: "Ukuran maksimal foto 8 MB" });
  response.status(500).json({
    error: "internal_error",
    message: "Terjadi gangguan pada Pet Owner API",
  });
});

server.listen(port, () =>
  console.log(`Slivadoc Pet Owner API ready at http://localhost:${port}`),
);
