import { Platform } from "react-native";
import { io } from "socket.io-client";

export const PETOWNER_API_URL = process.env.EXPO_PUBLIC_PETOWNER_API_URL
  ?? (Platform.OS === "android" ? "http://10.0.2.2:8090" : "http://localhost:8090");
export const PLATFORM_API_URL = process.env.EXPO_PUBLIC_PLATFORM_API_URL
  ?? (Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080");

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

let platformAccessToken = "";
export function setPlatformAccessToken(token: string) { platformAccessToken = token; }

async function platformRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PLATFORM_API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(platformAccessToken ? { Authorization: `Bearer ${platformAccessToken}` } : {}), ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Platform API tidak tersedia");
  return payload as T;
}

export type WorldItem = { id: string; title?: string; name?: string; description?: string; category?: string; academy_name?: string; trainer_name?: string; full_name?: string; doctor_name?: string; specialties?: string[]; mode?: string; veterinarian_id?: string; duration_minutes?: number; total_fee?: number; processing_days?: number; requirements?: string[]; breed?: string; sex?: string; species?: string; age_months?: number; health_status?: string; health_score?: number; health_valid_until?: string; health_verification?: string; eligibility_status?: string; risk_level?: string; profile_level?: number; level_name?: string; pedigree_status?: string; temperament?: string[]; vaccinated?: boolean; sterilized?: boolean; personality?: string[]; price?: number; next_schedule?: string; starts_at?: string; venue?: string; address?: string; city?: string; latitude?: number; longitude?: number; rating?: number; distance_km?: number; pet_facilities?: string[]; status?: string; viewer_count?: number; channel_name?: string; playback_url?: string; content?: string; author_name?: string; like_count?: number; comment_count?: number };
export const getMobileAcademy = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/academy/programs");
export const getMobileEvents = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/events");
export const getMobilePetSpots = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/petspots");
export const getMobileStreams = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/pethub/streams");
export const getMobilePetHubFeed = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/pethub/feed");
export const getMobileVeterinarians = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/veterinarians");
export const getMobileConsultationPlans = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/consultation-plans");
export const getMobileAdoptions = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/adoptions");
export const getMobileDocumentProducts = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/pet-documents");
export const getMobilePawDatingProfiles = () => platformRequest<{ data: WorldItem[] }>("/api/v1/public/pawdating/profiles?min_level=2&min_health_score=80&max_distance_km=200");
export const sendMobilePawDatingInterest = (targetProfileId:string) => platformRequest<{id:string;status:string;message:string}>(`/api/v1/pawdating/profiles/${targetProfileId}/interests`, { method:"POST", body:JSON.stringify({ source_profile_id:"a8000000-0000-4000-8000-000000000001", interest_type:"interest", introduction_message:"Halo, kami tertarik mendiskusikan kecocokan pet setelah meninjau laporan kesehatan kedua pet." }) });
export const createMobileConsultation = (plan: WorldItem, complaint: string) => platformRequest<{ id: string; room_key: string }>("/api/v1/consultations", { method: "POST", body: JSON.stringify({ veterinarian_id: plan.veterinarian_id, plan_id: plan.id, complaint, scheduled_at: new Date(Date.now()+3600000).toISOString() }) });
export const applyMobileAdoption = (listingId: string) => platformRequest<{ id: string }>(`/api/v1/adoptions/${listingId}/applications`, { method: "POST", body: JSON.stringify({ applicant_name: "Evans Moris", phone: "081200000000", address: "Jakarta", housing_type: "house", has_other_pets: true, experience: "Pet parent", reason: "Siap memberi rumah permanen dan perawatan terbaik." }) });
export const createMobileDocumentRequest = (productId: string) => platformRequest<{ id: string; request_number: string }>("/api/v1/pet-document-requests", { method: "POST", body: JSON.stringify({ product_id: productId, origin_city: "Jakarta", destination_city: "Bali", transport_type: "flight", submitted_documents: [] }) });
export const commentMobilePetHubPost = (postId: string, content: string) => platformRequest<{ id: string }>(`/api/v1/pethub/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ content }) });
export const enrollMobileAcademy = (programId: string) => platformRequest<{ message: string }>("/api/v1/academy/enrollments", { method: "POST", body: JSON.stringify({ program_id: programId, participant_name: "Evans Moris", pet_name: "Milo" }) });
export const registerMobileEvent = (eventId: string) => platformRequest<{ id: string; qr_token: string }>(`/api/v1/events/${eventId}/registrations`, { method: "POST", body: JSON.stringify({ participant_name: "Evans Moris", participant_email: "evans@slivadoc.local", ticket_quantity: 1 }) });
export const createMobilePetHubPost = (content: string) => platformRequest<{ id: string }>("/api/v1/pethub/posts", { method: "POST", body: JSON.stringify({ author_name: "Evans Moris", content, post_type: "thread" }) });
export const reactMobilePetHubPost = (postId: string) => platformRequest<{ liked: boolean }>(`/api/v1/pethub/posts/${postId}/reactions`, { method: "POST" });

export function askSlivaCare(message: string, history: AssistantMessage[]) {
  return request<{ answer: string; mode: "openai" | "offline_dataset"; degraded?: boolean; fallbackReason?: string; notice?: string }>("/api/assistant/chat", {
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
