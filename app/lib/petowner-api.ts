import { io, type Socket } from "socket.io-client";

export const PETOWNER_API_URL =
  process.env.NEXT_PUBLIC_PETOWNER_API_URL ?? "http://localhost:8090";

export type LocationResult = {
  latitude: number;
  longitude: number;
  label: string;
  address?: Record<string, string>;
  provider?: string;
};

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CommunityComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  author: string;
  petName?: string;
  body: string;
  tag: string;
  imageUrl?: string;
  location?: string;
  likes: number;
  likedBy?: string[];
  comments: CommunityComment[];
  createdAt: string;
};

export type RealtimeMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PETOWNER_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message ?? payload.answer ?? payload.error ?? "Pet Owner API tidak tersedia") as Error & { code?: string; status?: number };
    error.code = payload.error;
    error.status = response.status;
    throw error;
  }
  return payload as T;
}

export async function uploadImage(file: File, folder: "pets" | "community" | "documents" = "pets") {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);
  return apiFetch<{ url: string; publicId: string; width: number; height: number }>("/api/uploads/images", { method: "POST", body });
}

export function reverseGeocode(latitude: number, longitude: number) {
  return apiFetch<LocationResult>(`/api/location/reverse?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`);
}

export function searchLocation(query: string) {
  return apiFetch<Array<LocationResult & { id: string; type: string }>>(`/api/location/search?q=${encodeURIComponent(query)}`);
}

export function askSlivaCare(input: {
  message: string;
  userId: string;
  pet?: { name?: string; species?: string; breed?: string; age?: string; weight?: string };
  history: AssistantMessage[];
}) {
  return apiFetch<{ answer: string; mode: "openai" | "offline_dataset"; sources?: string[]; degraded?: boolean; fallbackReason?: string; notice?: string }>("/api/assistant/chat", { method: "POST", body: JSON.stringify(input) });
}

export function getCommunityPosts() {
  return apiFetch<CommunityPost[]>("/api/community/posts");
}

export function createCommunityPost(input: Pick<CommunityPost, "author" | "body" | "tag"> & Partial<Pick<CommunityPost, "petName" | "imageUrl" | "location">>) {
  return apiFetch<CommunityPost>("/api/community/posts", { method: "POST", body: JSON.stringify(input) });
}

export function toggleCommunityLike(postId: string, userId: string) {
  return apiFetch<CommunityPost>(`/api/community/posts/${postId}/like`, { method: "POST", body: JSON.stringify({ userId }) });
}

export function addCommunityComment(postId: string, author: string, body: string) {
  return apiFetch<CommunityPost>(`/api/community/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ author, body }) });
}

let socket: Socket | null = null;

export function realtimeSocket() {
  socket ??= io(PETOWNER_API_URL, { autoConnect: false, transports: ["websocket", "polling"] });
  return socket;
}
