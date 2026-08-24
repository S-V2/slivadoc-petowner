export const PLATFORM_API_URL = process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080";

export type PlatformList<T> = { data: T[]; count: number };
export type AcademyProgram = { id: string; academy_id: string; academy_name: string; title: string; category: string; level: string; description: string; duration_weeks: number; session_count: number; price: number; capacity: number; cover_url: string; status: string; trainer_name: string; trainer_rating: number; next_schedule: string };
export type PetEvent = { id: string; title: string; slug: string; category: string; description: string; banner_url: string; venue: string; address: string; city: string; latitude?: number; longitude?: number; starts_at: string; ends_at: string; capacity: number; registered_count: number; price: number; status: string; featured: boolean };
export type PetSpot = { id: string; name: string; category: string; description: string; address: string; city: string; latitude: number; longitude: number; phone: string; website_url: string; cover_url: string; pet_facilities: string[]; opening_hours: Record<string,string>; rating: number; review_count: number; verified: boolean; distance_km?: number };
export type PetHubStream = { id: string; title: string; description: string; thumbnail_url: string; playback_url: string; provider: string; status: string; scheduled_at?: string; started_at?: string; viewer_count: number; channel_name: string; channel_handle: string; channel_avatar_url: string; verified: boolean };
export type PetHubPost = { id: string; author_name: string; content: string; media_url: string; post_type: string; like_count: number; comment_count: number; repost_count: number; created_at: string; channel_name: string; channel_handle: string; channel_avatar_url: string; verified: boolean };
export type Veterinarian = { id: string; full_name: string; strv_number: string; specialties: string[]; bio: string; photo_url: string; experience_years: number; rating: number; consultation_count: number; languages: string[]; availability_status: string; starting_price: number };
export type ConsultationPlan = { id: string; veterinarian_id: string; doctor_name: string; name: string; mode: "chat"|"voice"|"video"|"bundle"; description: string; duration_minutes: number; followup_days: number; chat_quota: number; voice_minutes: number; video_minutes: number; price: number; discount_percent: number; features: string[] };
export type Consultation = { id: string; order_number: string; room_key: string; amount: number; status: string; payment_status?: string; doctor_name?: string; plan_name?: string; mode?: string; pet_name?: string; scheduled_at?: string; payment?: { method?: string; status?: string; mode?: string; qr_string?: string; actions?: Array<{name?:string;method?:string;url?:string}> } };
export type AdoptionListing = { id: string; name: string; species: string; breed: string; sex: string; age_months: number; size: string; city: string; description: string; personality: string[]; health_status: string; vaccinated: boolean; sterilized: boolean; photo_urls: string[]; adoption_fee: number; featured: boolean };
export type DocumentProduct = { id: string; code: string; name: string; category: string; description: string; requirements: string[]; processing_days: number; service_fee: number; government_fee: number; total_fee: number };
export type PetHubComment = { id: string; user_id: string; author_name: string; content: string; created_at: string };
export type PetHubStory = { id: string; user_id: string; author_name: string; photo_url: string; caption: string; view_count: number; expires_at: string; created_at: string };
export type PawDatingProfile = { id: string; pet_id?: string; name: string; species: string; breed: string; sex: "male"|"female"; birth_date: string; age_months: number; weight_kg: number; color: string; city: string; distance_km?: number; profile_level: number; level_name: string; pedigree_status: string; description: string; temperament: string[]; traits: string[]; preferred_breeds?: string[]; photo_urls: string[]; health_score: number; breeding_history_count: number; health_verification: string; eligibility_status: string; risk_level: string; health_valid_until: string; owner_display: string; status?: string; visibility?: string; health_report?: PawDatingHealthReport };
export type PawDatingHealthReport = { id: string; examination_at: string; valid_until: string; clinic_name: string; veterinarian_name: string; veterinarian_license: string; verification_level: number; verification_status: string; eligibility_status: string; risk_level: string; physical_exam?: Record<string,string>; vaccination_checks?: Record<string,string>; parasite_checks?: Record<string,string>; infectious_disease_tests?: Record<string,string>; reproductive_tests?: Record<string,string>; genetic_tests?: Array<{test:string;result:string}>; orthopedic_checks?: Record<string,string>; cardiac_checks?: Record<string,string>; ophthalmic_checks?: Record<string,string>; laboratory_results?: Array<{panel:string;result:string}>; findings: string; recommendations: string; restrictions: string[] };
export type PawDatingCompatibility = { score: number; grade: "excellent"|"good"|"manual_review"|"blocked"; breakdown: Record<string,number>; risk_flags: string[]; recommendations: string[] };
export type PawDatingInterest = { id:string; status:string; interest_type:string; introduction_message:string; created_at:string; source_profile_id:string; source_name:string; target_profile_id:string; target_name:string; direction:"incoming"|"outgoing" };
export type PawDatingStandards = { principles:string[]; levels:Array<{level:number;name:string;requirements:string[]}>; minimum_age_months:Record<string,number>; report_validity_days:number; blocked_conditions:string[] };

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
export const isPetOwnerAuthenticated = () => Boolean(accessToken());
export const getVeterinarians = () => request<PlatformList<Veterinarian>>("/api/v1/public/veterinarians");
export const getConsultationPlans = (veterinarianId?: string) => request<PlatformList<ConsultationPlan>>(`/api/v1/public/consultation-plans${veterinarianId ? `?veterinarian_id=${veterinarianId}` : ""}`);
export const createConsultation = (input: Record<string, unknown>) => request<Consultation>("/api/v1/consultations", { method: "POST", body: JSON.stringify(input) });
export const simulateConsultationPaid = (id: string) => request<{consultation_id:string;payment_status:string}>(`/api/v1/consultations/${id}/simulate-paid`, { method: "POST" });
export const getMyConsultations = () => request<PlatformList<Consultation>>("/api/v1/consultations");
export const getAdoptions = () => request<PlatformList<AdoptionListing>>("/api/v1/public/adoptions");
export const applyAdoption = (listingId: string, input: Record<string, unknown>) => request<{id:string;status:string}>(`/api/v1/adoptions/${listingId}/applications`, { method: "POST", body: JSON.stringify(input) });
export const getDocumentProducts = () => request<PlatformList<DocumentProduct>>("/api/v1/public/pet-documents");
export const createDocumentRequest = (input: Record<string, unknown>) => request<{id:string;request_number:string;amount:number;status:string}>("/api/v1/pet-document-requests", { method: "POST", body: JSON.stringify(input) });
export const getPetHubComments = (postId: string) => request<PlatformList<PetHubComment>>(`/api/v1/pethub/posts/${postId}/comments`);
export const createPetHubComment = (postId: string, content: string) => request<{id:string}>(`/api/v1/pethub/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ content }) });
export const getPetHubStories = () => request<PlatformList<PetHubStory>>("/api/v1/public/pethub/stories");
export const createPetHubStory = (photoUrl: string, caption: string) => request<{id:string;expires_in:number}>("/api/v1/pethub/stories", { method: "POST", body: JSON.stringify({ photo_url: photoUrl, caption }) });
export const getPawDatingProfiles = (query = "") => request<PlatformList<PawDatingProfile>>(`/api/v1/public/pawdating/profiles${query ? `?${query}` : ""}`);
export const getPawDatingProfile = (profileId:string) => request<PawDatingProfile>(`/api/v1/public/pawdating/profiles/${profileId}`);
export const getPawDatingStandards = () => request<PawDatingStandards>("/api/v1/public/pawdating/standards");
export const getMyPawDatingProfiles = () => request<PlatformList<PawDatingProfile>>("/api/v1/pawdating/profiles");
export const createPawDatingProfile = (input:Record<string,unknown>) => request<{id:string;status:string;profile_level:number;message:string}>("/api/v1/pawdating/profiles", { method:"POST", body:JSON.stringify(input) });
export const createPawDatingHealthReport = (profileId:string,input:Record<string,unknown>) => request<{id:string;verification_status:string;message:string}>(`/api/v1/pawdating/profiles/${profileId}/health-reports`, { method:"POST", body:JSON.stringify(input) });
export const submitPawDatingProfile = (profileId:string) => request<{id:string;status:string;message:string}>(`/api/v1/pawdating/profiles/${profileId}/submit`, { method:"POST" });
export const getPawDatingCompatibility = (targetId:string,sourceId:string) => request<{compatibility:PawDatingCompatibility}>(`/api/v1/pawdating/profiles/${targetId}/compatibility?source_profile_id=${sourceId}`);
export const sendPawDatingInterest = (targetId:string,input:{source_profile_id:string;interest_type:"interest"|"super_interest";introduction_message:string}) => request<{id:string;status:string;compatibility:PawDatingCompatibility;message:string}>(`/api/v1/pawdating/profiles/${targetId}/interests`, { method:"POST", body:JSON.stringify(input) });
export const getPawDatingInterests = () => request<PlatformList<PawDatingInterest>>("/api/v1/pawdating/interests");
export const respondPawDatingInterest = (interestId:string,action:"accept"|"decline") => request<{id:string;status:string;message?:string}>(`/api/v1/pawdating/interests/${interestId}`, { method:"PATCH", body:JSON.stringify({action}) });
