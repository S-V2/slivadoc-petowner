import { Platform } from "react-native";
import { io } from "socket.io-client";

export const PETOWNER_API_URL = process.env.EXPO_PUBLIC_PETOWNER_API_URL
  ?? (Platform.OS === "android" ? "http://10.0.2.2:8090" : "http://localhost:8090");

export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type CommunityPost = { id: string; author: string; petName?: string; body: string; tag: string; imageUrl?: string; location?: string; likes: number; likedBy?: string[]; comments: Array<{ id: string; author: string; body: string; createdAt: string }>; createdAt: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PETOWNER_API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.answer ?? payload.message ?? payload.error ?? "Pet Owner API tidak tersedia");
  return payload as T;
}

export function askSlivaCare(message: string, history: AssistantMessage[]) {
  return request<{ answer: string; mode: "openai" | "offline_dataset" }>("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ message, history: history.slice(-8), userId: "petowner-evans-mobile", pet: { name: "Milo", species: "Dog", breed: "Golden Retriever", age: "3 tahun", weight: "28.4 kg" } }),
  });
}

export function reverseGeocode(latitude: number, longitude: number) {
  return request<{ latitude: number; longitude: number; label: string }>(`/api/location/reverse?lat=${latitude}&lng=${longitude}`);
}

export function getCommunityPosts() { return request<CommunityPost[]>("/api/community/posts"); }
export function createCommunityPost(body: string, tag = "Cerita", imageUrl?: string) { return request<CommunityPost>("/api/community/posts", { method: "POST", body: JSON.stringify({ author: "Evans Moris", petName: "Milo & Luna", body, tag, imageUrl }) }); }
export function toggleCommunityLike(postId: string) { return request<CommunityPost>(`/api/community/posts/${postId}/like`, { method: "POST", body: JSON.stringify({ userId: "petowner-evans-mobile" }) }); }

export async function uploadMobileImage(uri: string, mimeType = "image/jpeg", fileName = "pet-photo.jpg", folder = "pets") {
  const body = new FormData();
  body.append("folder", folder);
  body.append("file", { uri, type: mimeType, name: fileName } as unknown as Blob);
  const response = await fetch(`${PETOWNER_API_URL}/api/uploads/images`, { method: "POST", body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Upload foto gagal");
  return payload as { url: string; publicId: string };
}

export const realtime = io(PETOWNER_API_URL, { autoConnect: false, transports: ["websocket", "polling"] });
