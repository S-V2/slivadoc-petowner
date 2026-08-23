import "dotenv/config";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import cloudinaryPackage from "cloudinary";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { Server as SocketServer } from "socket.io";
import { z } from "zod";
import { JsonStore } from "./store.js";
import { answerPetQuestion } from "./pet-agent.js";

const port = Number(process.env.PORT || 8090);
const origins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:8081")
  .split(",").map((item) => item.trim()).filter(Boolean);
const dataDir = resolve(process.env.DATA_DIR || new URL("../data", import.meta.url).pathname);
const store = new JsonStore(resolve(dataDir, "petowner.json"));
await store.load();

const app = express();
const server = createServer(app);
const io = new SocketServer(server, { cors: { origin: origins, credentials: true } });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});

const cloudinary = cloudinaryPackage.v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: "draft-8", legacyHeaders: false }));

app.get("/health", (_request, response) => response.json({ status: "ok", service: "slivadoc-petowner-api" }));
app.get("/api/config/status", (_request, response) => response.json({
  cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
  openai: Boolean(process.env.OPENAI_API_KEY),
  map: "openstreetmap-nominatim",
  realtime: true,
}));

app.post("/api/uploads/images", upload.single("file"), async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ error: "image_required" });
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return response.status(503).json({ error: "cloudinary_not_configured", message: "Isi credential Cloudinary pada services/petowner-api/.env" });
    }
    const folder = `${process.env.CLOUDINARY_FOLDER || "slivadoc/petowner"}/${request.body.folder || "pets"}`;
    const result = await new Promise((resolveUpload, rejectUpload) => {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "image", transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }] }, (error, uploaded) => error ? rejectUpload(error) : resolveUpload(uploaded));
      stream.end(request.file.buffer);
    });
    response.status(201).json({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height });
  } catch (error) { next(error); }
});

app.get("/api/location/reverse", async (request, response, next) => {
  try {
    const latitude = z.coerce.number().min(-90).max(90).parse(request.query.lat);
    const longitude = z.coerce.number().min(-180).max(180).parse(request.query.lng);
    const base = process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
    const url = new URL("/reverse", base);
    url.search = new URLSearchParams({ format: "jsonv2", lat: String(latitude), lon: String(longitude), zoom: "18", addressdetails: "1" }).toString();
    const result = await fetch(url, { headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT || "SlivadocPetOwner/0.1" } });
    if (!result.ok) throw new Error(`Nominatim failed (${result.status})`);
    const data = await result.json();
    response.json({ latitude, longitude, label: data.display_name, address: data.address, provider: "OpenStreetMap/Nominatim" });
  } catch (error) { next(error); }
});

app.get("/api/location/search", async (request, response, next) => {
  try {
    const query = z.string().trim().min(3).max(160).parse(request.query.q);
    const base = process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
    const url = new URL("/search", base);
    url.search = new URLSearchParams({ format: "jsonv2", q: query, countrycodes: "id", limit: "6", addressdetails: "1" }).toString();
    const result = await fetch(url, { headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT || "SlivadocPetOwner/0.1" } });
    if (!result.ok) throw new Error(`Nominatim failed (${result.status})`);
    const data = await result.json();
    response.json(data.map((item) => ({ id: String(item.place_id), label: item.display_name, latitude: Number(item.lat), longitude: Number(item.lon), type: item.type })));
  } catch (error) { next(error); }
});

app.post("/api/assistant/chat", rateLimit({ windowMs: 60_000, limit: 20 }), async (request, response, next) => {
  try {
    const result = await answerPetQuestion(request.body, { openAIKey: process.env.OPENAI_API_KEY, openAIModel: process.env.OPENAI_MODEL || "gpt-5.6-luna" });
    response.status(result.status).json(result.body);
  } catch (error) { next(error); }
});

app.get("/api/community/posts", (_request, response) => {
  response.json(store.snapshot().posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

const postSchema = z.object({
  author: z.string().trim().min(2).max(80),
  petName: z.string().trim().max(80).default(""),
  body: z.string().trim().min(3).max(3000),
  tag: z.string().trim().max(40).default("Cerita"),
  imageUrl: z.string().url().optional(),
  location: z.string().trim().max(240).optional(),
});

app.post("/api/community/posts", async (request, response, next) => {
  try {
    const input = postSchema.parse(request.body);
    const post = { id: randomUUID(), ...input, likes: 0, likedBy: [], comments: [], createdAt: new Date().toISOString() };
    await store.update((state) => state.posts.push(post));
    io.to("community").emit("community:new-post", post);
    response.status(201).json(post);
  } catch (error) { next(error); }
});

app.post("/api/community/posts/:id/like", async (request, response, next) => {
  try {
    const userId = z.string().trim().min(1).max(120).parse(request.body.userId);
    let updated;
    await store.update((state) => {
      const post = state.posts.find((item) => item.id === request.params.id);
      if (!post) return;
      post.likedBy ??= [];
      post.likedBy = post.likedBy.includes(userId) ? post.likedBy.filter((id) => id !== userId) : [...post.likedBy, userId];
      post.likes = post.likedBy.length;
      updated = post;
    });
    if (!updated) return response.status(404).json({ error: "post_not_found" });
    io.to("community").emit("community:update", updated);
    response.json(updated);
  } catch (error) { next(error); }
});

app.post("/api/community/posts/:id/comments", async (request, response, next) => {
  try {
    const input = z.object({ author: z.string().trim().min(2).max(80), body: z.string().trim().min(1).max(1000) }).parse(request.body);
    let updated;
    await store.update((state) => {
      const post = state.posts.find((item) => item.id === request.params.id);
      if (!post) return;
      post.comments ??= [];
      post.comments.push({ id: randomUUID(), ...input, createdAt: new Date().toISOString() });
      updated = post;
    });
    if (!updated) return response.status(404).json({ error: "post_not_found" });
    io.to("community").emit("community:update", updated);
    response.status(201).json(updated);
  } catch (error) { next(error); }
});

io.on("connection", (socket) => {
  socket.on("community:join", () => socket.join("community"));
  socket.on("chat:join", ({ conversationId = "slivacare-lobby" } = {}) => {
    socket.join(`chat:${conversationId}`);
    socket.emit("chat:history", store.snapshot().messages[conversationId] ?? []);
  });
  socket.on("chat:send", async (payload = {}, acknowledge = () => {}) => {
    try {
      const input = z.object({ conversationId: z.string().min(1).max(120), senderId: z.string().min(1).max(120), senderName: z.string().min(1).max(80), body: z.string().trim().min(1).max(2000) }).parse(payload);
      const message = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
      await store.update((state) => { state.messages[input.conversationId] ??= []; state.messages[input.conversationId].push(message); state.messages[input.conversationId] = state.messages[input.conversationId].slice(-200); });
      io.to(`chat:${input.conversationId}`).emit("chat:message", message);
      acknowledge({ ok: true, message });
    } catch (error) { acknowledge({ ok: false, error: error.message }); }
  });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error instanceof z.ZodError) return response.status(400).json({ error: "validation_error", details: error.issues });
  if (error?.code === "LIMIT_FILE_SIZE") return response.status(413).json({ error: "image_too_large", message: "Ukuran maksimal foto 8 MB" });
  response.status(500).json({ error: "internal_error", message: "Terjadi gangguan pada Pet Owner API" });
});

server.listen(port, () => console.log(`Slivadoc Pet Owner API ready at http://localhost:${port}`));
