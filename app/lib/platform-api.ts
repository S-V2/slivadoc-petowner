export const PLATFORM_API_URL = process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080";

export type PlatformList<T> = { data: T[]; count: number };
export type AcademyProgram = { id: string; academy_id: string; academy_name: string; title: string; category: string; level: string; description: string; duration_weeks: number; session_count: number; price: number; capacity: number; cover_url: string; status: string; trainer_name: string; trainer_rating: number; next_schedule: string };
export type PetEvent = { id: string; title: string; slug: string; category: string; description: string; banner_url: string; venue: string; address: string; city: string; latitude?: number; longitude?: number; starts_at: string; ends_at: string; capacity: number; registered_count: number; price: number; status: string; featured: boolean };
export type PetSpot = { id: string; name: string; category: string; description: string; address: string; city: string; latitude: number; longitude: number; phone: string; website_url: string; cover_url: string; pet_facilities: string[]; opening_hours: Record<string,string>; rating: number; review_count: number; verified: boolean; distance_km?: number };
export type PetHubStream = { id: string; title: string; description: string; thumbnail_url: string; playback_url: string; provider: string; status: string; scheduled_at?: string; started_at?: string; viewer_count: number; channel_name: string; channel_handle: string; channel_avatar_url: string; verified: boolean };
export type PetHubPost = { id: string; author_name: string; content: string; media_url: string; post_type: string; like_count: number; comment_count: number; repost_count: number; created_at: string; channel_name: string; channel_handle: string; channel_avatar_url: string; verified: boolean };

function accessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("slivadoc.access_token") ?? window.localStorage.getItem("access_token") ?? "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = accessToken();
  const response = await fetch(`${PLATFORM_API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Platform API belum tersedia");
  return payload as T;
}

export const getAcademyPrograms = () => request<PlatformList<AcademyProgram>>("/api/v1/public/academy/programs");
export const enrollAcademy = (input: { program_id: string; participant_name: string; pet_name: string }) => request<{ id: string; status: string; amount: number; message: string }>("/api/v1/academy/enrollments", { method: "POST", body: JSON.stringify(input) });
export const getPetEvents = () => request<PlatformList<PetEvent>>("/api/v1/public/events");
export const registerEvent = (eventId: string, input: { participant_name: string; participant_email: string; ticket_quantity: number }) => request<{ id: string; qr_token: string; status: string; amount: number }>(`/api/v1/events/${eventId}/registrations`, { method: "POST", body: JSON.stringify(input) });
export const getPetSpots = (coords?: { latitude: number; longitude: number }) => request<PlatformList<PetSpot>>(`/api/v1/public/petspots${coords ? `?latitude=${coords.latitude}&longitude=${coords.longitude}` : ""}`);
export const getPetHubStreams = () => request<PlatformList<PetHubStream>>("/api/v1/public/pethub/streams");
export const getPetHubFeed = () => request<PlatformList<PetHubPost>>("/api/v1/public/pethub/feed");
export const createPetHubPost = (input: { author_name: string; content: string; post_type: string; media_url?: string }) => request<{ id: string; message: string }>("/api/v1/pethub/posts", { method: "POST", body: JSON.stringify(input) });
export const reactPetHubPost = (postId: string) => request<{ liked: boolean }>(`/api/v1/pethub/posts/${postId}/reactions`, { method: "POST" });
