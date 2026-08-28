export const PLATFORM_API_URL = process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080";

export type PlatformList<T> = { data: T[]; count: number };
export type PetOwnerPet = { id:string;name:string;species:string;species_group:string;species_common_name:string;species_scientific_name:string;species_attributes:Record<string,unknown>;emoji:string;type:string;breed:string;sex:string;birth_date?:string;age_months:number;color:string;weight_kg:number;microchip_number:string;allergies:string;medical_notes:string;vaccination_status:string;photo_url:string;medical_record_count:number;last_medical_record_at?:string;health_score:number };
export type PetSpecies = { code:string;label:string;group:string;scientific_name:string;emoji:string;care_profile:string;profile_schema:{required:string[];optional:string[]} };
export type PetOwnerUser = { id:string;email:string;full_name:string;phone:string;member_since:string };
export type NotificationItem = { id:string;category:string;title:string;body:string;action_route:string;read_at?:string|null;created_at:string };
export type ActivityItem = { id:string;pet_id:string;category:string;reference_id:string;title:string;description:string;status:string;action_route:string;action_label:string;metadata:Record<string,string|number|boolean|null>;starts_at?:string;occurred_at:string };
export type FavoriteItem = { entity_type:string;entity_id:string;created_at:string };
export type PointsSummary = { balance:number;earned:number;redeemed:number;formula:string };
export type PetOwnerBootstrap = { user:PetOwnerUser;pets:PetOwnerPet[];notifications:NotificationItem[];unread_notifications:number;activities:ActivityItem[];favorites:FavoriteItem[];points:PointsSummary };
export type FamilyAccess = { id:string;member_user_id:string;email:string;full_name:string;role:string;permissions:string[];status:string;accepted_at?:string;created_at:string };
export type LostPetMode = { active:boolean;id?:string;public_token?:string;status?:string;last_seen_at?:string;last_seen_location?:string;latitude?:number;longitude?:number;radius_km?:number;description?:string;contact_phone?:string;reward_amount?:number };
export type DiscoveryService = { id:string;branch_id:string;business_id:string;business_name:string;branch_name:string;name:string;category:string;duration_minutes:number;price:number;address:string;city:string;latitude?:number|null;longitude?:number|null;distance_km?:number|null;rating?:number|null;review_count?:number|null };
export type DiscoveryProduct = { id:string;name:string;sku:string;barcode:string;category:string;description:string;price:number;stock:number;minimum_stock:number;available:boolean };
export type GlobalSearchResult = { category:string;id:string;title:string;subtitle:string;route:string };
export type MedicalRecord = { id:string;record_type:string;title:string;complaint:string;diagnosis:string;treatment:string;clinical_notes:string;doctor_name:string;occurred_at:string;weight_kg?:number;temperature_c?:number;attachments:unknown[];prescriptions:unknown[];next_control_at?:string };
export type CommunityPost = { id:string;user_id:string;author_name:string;pet_id:string;pet_name:string;group_id:string;group_name:string;body:string;category:string;image_url:string;location:string;like_count:number;comment_count:number;liked:boolean;created_at:string };
export type CommunityComment = { id:string;user_id:string;author_name:string;body:string;parent_id?:string;created_at:string };
export type CommunityGroup = { id:string;name:string;slug:string;description:string;category:string;city:string;cover_url:string;visibility:string;member_count:number;owner:boolean;joined:boolean;membership_status?:""|"pending"|"active"|"blocked" };
export type CommunityGroupMessage = { id:string;sender_user_id:string;sender_name:string;body:string;created_at:string;mine:boolean };
export type AcademyProgram = { id: string; academy_id: string; academy_name: string; title: string; category: string; level: string; description: string; duration_weeks: number; session_count: number; price: number; capacity: number; cover_url: string; status: string; trainer_name: string; trainer_rating: number; next_schedule: string };
export type PetEvent = { id: string; title: string; slug: string; category: string; description: string; banner_url: string; venue: string; address: string; city: string; latitude?: number; longitude?: number; starts_at: string; ends_at: string; capacity: number; registered_count: number; price: number; status: string; featured: boolean };
export type PetSpot = { id: string; name: string; category: string; description: string; address: string; city: string; latitude: number; longitude: number; phone: string; website_url: string; cover_url: string; pet_facilities: string[]; opening_hours: Record<string,string>; rating: number; review_count: number; verified: boolean; distance_km?: number|null };
export type PetHubStream = { id: string; channel_id:string; title: string; description: string; thumbnail_url: string; playback_url: string; provider: string; status: string; scheduled_at?: string; started_at?: string; viewer_count: number; channel_name: string; channel_handle: string; channel_avatar_url: string; verified: boolean };
export type PetHubPost = { id: string; channel_id?:string; author_name: string; content: string; media_url: string; post_type: string; like_count: number; comment_count: number; repost_count: number; created_at: string; channel_name: string; channel_handle: string; channel_avatar_url: string; verified: boolean;following?:boolean };
export type Veterinarian = { id: string; full_name: string; strv_number: string; specialties: string[]; bio: string; photo_url: string; experience_years: number; rating: number; consultation_count: number; languages: string[]; availability_status: string; starting_price: number };
export type ConsultationPlan = { id: string; veterinarian_id: string; doctor_name: string; name: string; mode: "chat"|"voice"|"video"|"bundle"; description: string; duration_minutes: number; followup_days: number; chat_quota: number; voice_minutes: number; video_minutes: number; price: number; discount_percent: number; features: string[] };
export type Consultation = { id: string; order_number: string; room_key: string; amount: number; status: string; payment_status?: string; doctor_name?: string; plan_name?: string; mode?: string; pet_name?: string; scheduled_at?: string; payment?: { method?: string; status?: string; mode?: string; qr_string?: string; actions?: Array<{name?:string;method?:string;url?:string}> } };
export type ConsultationMessage = { id:string;sender_user_id:string;sender_name:string;client_message_id:string;message_type:string;body:string;attachment_url:string;read_at?:string;created_at:string };
export type AdoptionListing = { id: string; name: string; species: string; breed: string; sex: string; age_months: number; size: string; city: string; description: string; personality: string[]; health_status: string; vaccinated: boolean; sterilized: boolean; photo_urls: string[]; adoption_fee: number; featured: boolean; source_type:string; submitted_by_name:string };
export type CareReminder = { id:string;pet_id:string;pet_name:string;reminder_type:string;title:string;notes:string;due_at:string;timezone:string;recurrence:string;recurrence_days?:number;lead_minutes:number[];channels:string[];status:string;last_completed_at?:string };
export type DocumentProduct = { id: string; code: string; name: string; category: string; description: string; requirements: string[]; processing_days: number; service_fee: number; government_fee: number; total_fee: number };
export type PublicCampaign = { id:string;name:string;campaign_type:string;objective:string;banner_url:string;placement:string;audience:string;starts_on:string;ends_on:string };
export type PetshipPlace = { id:string;name:string;category:string;address:string;city:string;latitude:number;longitude:number;geofence_radius_m:number;active_petowners:number;distance_km?:number|null };
export type PetshipPresence = { id:string;pet_name:string;species:string;breed:string;photo_url:string;owner_first_name:string;message:string;checked_in_at:string;last_seen_at:string };
export type Fundraiser = { id:string;title:string;slug:string;story:string;beneficiary_name:string;city:string;goal_amount:number;raised_amount:number;progress_percent:number;cover_url:string;ends_at?:string;published_at?:string;donor_count:number };
export type MyFundraiser = { id:string;title:string;slug:string;status:string;goal_amount:number;raised_amount:number;moderation_notes:string;created_at:string };
export type PaymentMethod = { code:string;method:"qris"|"virtual_account";bank_code?:string;label:string;description:string };
export type PaymentIntent = { id:string;order_id:string;provider:string;method:"qris"|"virtual_account";bank_code?:string;status:string;payment_status:string;amount:number;currency:string;reference_type:string;reference_id:string;provider_reference_no?:string;qr_string?:string;qr_url?:string;va_number?:string;va_name?:string;expires_at?:string;paid_at?:string };
export type PetHubComment = { id: string; user_id: string; author_name: string; content: string; created_at: string };
export type PetHubStory = { id: string; user_id: string; author_name: string; photo_url: string; caption: string; view_count: number; expires_at: string; created_at: string };
export type PawDatingProfile = { id: string; pet_id?: string; name: string; species: string; breed: string; sex: "male"|"female"; birth_date: string; age_months: number; weight_kg: number; color: string; city: string; distance_km?: number; profile_level: number; level_name: string; pedigree_status: string; description: string; temperament: string[]; traits: string[]; preferred_breeds?: string[]; photo_urls: string[]; health_score: number; breeding_history_count: number; health_verification: string; eligibility_status: string; risk_level: string; health_valid_until: string; owner_display: string; status?: string; visibility?: string; health_report?: PawDatingHealthReport };
export type PawDatingHealthReport = { id: string; examination_at: string; valid_until: string; clinic_name: string; veterinarian_name: string; veterinarian_license: string; verification_level: number; verification_status: string; eligibility_status: string; risk_level: string; physical_exam?: Record<string,string>; vaccination_checks?: Record<string,string>; parasite_checks?: Record<string,string>; infectious_disease_tests?: Record<string,string>; reproductive_tests?: Record<string,string>; genetic_tests?: Array<{test:string;result:string}>; orthopedic_checks?: Record<string,string>; cardiac_checks?: Record<string,string>; ophthalmic_checks?: Record<string,string>; laboratory_results?: Array<{panel:string;result:string}>; findings: string; recommendations: string; restrictions: string[] };
export type PawDatingCompatibility = { score: number; grade: "excellent"|"good"|"manual_review"|"blocked"; breakdown: Record<string,number>; risk_flags: string[]; recommendations: string[] };
export type PawDatingInterest = { id:string; status:string; interest_type:string; introduction_message:string; created_at:string; source_profile_id:string; source_name:string; target_profile_id:string; target_name:string; direction:"incoming"|"outgoing";match_id?:string };
export type PawDatingMessage = { id:string;sender_user_id:string;sender_name:string;message_type:string;body:string;attachment_url:string;read_at?:string;created_at:string };
export type PawDatingStandards = { principles:string[]; levels:Array<{level:number;name:string;requirements:string[]}>; minimum_age_months:Record<string,number>; report_validity_days:number; blocked_conditions:string[] };

function accessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("slivadoc.access_token") ?? window.localStorage.getItem("access_token") ?? "";
}

function tokenUserID(){try{const token=accessToken();if(!token)return"";const payload=JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))) as {sub?:string};return payload.sub??""}catch{return""}}

const responseCache = new Map<string,{expires:number;value:unknown}>();
const inFlight = new Map<string,Promise<unknown>>();

export function clearPlatformCache(){responseCache.clear();inFlight.clear()}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = accessToken();
  const method=String(init.method??"GET").toUpperCase();
  const key=`${method}:${path}:${token.slice(-16)}`;
  if(method==="GET"){
    const cached=responseCache.get(key);if(cached&&cached.expires>Date.now())return cached.value as T;
    const pending=inFlight.get(key);if(pending)return pending as Promise<T>;
  }
  const active=typeof document!=="undefined"&&document.activeElement instanceof HTMLButtonElement?document.activeElement:null;
  if(method!=="GET"&&active){active.disabled=true;active.classList.add("api-button-loading");active.setAttribute("aria-busy","true")}
  const run=(async()=>{const response = await fetch(`${PLATFORM_API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Layanan sedang belum tersedia. Coba lagi sebentar.");
    if(method==="GET")responseCache.set(key,{expires:Date.now()+15_000,value:payload});else clearPlatformCache();
    return payload as T;})();
  if(method==="GET")inFlight.set(key,run);
  try{return await run}finally{if(method==="GET")inFlight.delete(key);if(method!=="GET"&&active){active.disabled=false;active.classList.remove("api-button-loading");active.removeAttribute("aria-busy")}}
}

export const getAcademyPrograms = () => request<PlatformList<AcademyProgram>>("/api/v1/public/academy/programs");
export const trackAcademyProgramClick = (programId: string) => request<void>(`/api/v1/public/academy/programs/${programId}/click`, { method: "POST" });
export const enrollAcademy = (input: { program_id: string; participant_name: string; pet_name: string }) => request<{ id: string; status: string; amount: number; message: string }>("/api/v1/academy/enrollments", { method: "POST", body: JSON.stringify(input) });
export const getPetEvents = () => request<PlatformList<PetEvent>>("/api/v1/public/events");
export const registerEvent = (eventId: string, input: { participant_name: string; participant_email: string; ticket_quantity: number }) => request<{ id: string; qr_token: string; status: string; amount: number }>(`/api/v1/events/${eventId}/registrations`, { method: "POST", body: JSON.stringify(input) });
export const getPetSpots = (options?: { latitude?: number; longitude?: number; search?:string; category?:string; max_distance_km?:number }) => {const query=new URLSearchParams();Object.entries(options??{}).forEach(([key,value])=>{if(value!==undefined&&value!=="")query.set(key,String(value))});return request<PlatformList<PetSpot>>(`/api/v1/public/petspots${query.size?`?${query}`:""}`)};
export const getPetHubStreams = () => request<PlatformList<PetHubStream>>("/api/v1/public/pethub/streams");
export const getPetHubFeed = (options?:{tab?:string;type?:string;search?:string}) => {const query=new URLSearchParams();Object.entries(options??{}).forEach(([key,value])=>{if(value)query.set(key,value)});if(options?.tab==="following"&&tokenUserID())query.set("viewer_id",tokenUserID());return request<PlatformList<PetHubPost>>(`/api/v1/public/pethub/feed${query.size?`?${query}`:""}`)};
export const createPetHubPost = (input: { author_name: string; content: string; post_type: string; media_url?: string }) => request<{ id: string; message: string }>("/api/v1/pethub/posts", { method: "POST", body: JSON.stringify(input) });
export const reactPetHubPost = (postId: string) => request<{ liked: boolean }>(`/api/v1/pethub/posts/${postId}/reactions`, { method: "POST" });
export const togglePetHubChannel = (channelId:string) => request<{channel_id:string;following:boolean}>(`/api/v1/pethub/channels/${channelId}/follow`,{method:"POST"});
export const isPetOwnerAuthenticated = () => Boolean(accessToken());
export const getVeterinarians = () => request<PlatformList<Veterinarian>>("/api/v1/public/veterinarians");
export const getConsultationPlans = (veterinarianId?: string) => request<PlatformList<ConsultationPlan>>(`/api/v1/public/consultation-plans${veterinarianId ? `?veterinarian_id=${veterinarianId}` : ""}`);
export const createConsultation = (input: Record<string, unknown>) => request<Consultation>("/api/v1/consultations", { method: "POST", body: JSON.stringify(input) });
export const getMyConsultations = () => request<PlatformList<Consultation>>("/api/v1/consultations");
export const getConsultationMessages = (consultationId:string) => request<PlatformList<ConsultationMessage>>(`/api/v1/consultations/${consultationId}/messages`);
export const sendConsultationMessage = (consultationId:string,input:{client_message_id:string;message_type:string;body:string;attachment_url?:string}) => request<{id:string;created_at:string;client_message_id:string}>(`/api/v1/consultations/${consultationId}/messages`,{method:"POST",body:JSON.stringify(input)});
export const getCurrentPetOwnerUserID = () => tokenUserID();
export const getAdoptions = () => request<PlatformList<AdoptionListing>>("/api/v1/public/adoptions");
export const applyAdoption = (listingId: string, input: Record<string, unknown>) => request<{id:string;status:string}>(`/api/v1/adoptions/${listingId}/applications`, { method: "POST", body: JSON.stringify(input) });
export const getMyAdoptionListings = () => request<PlatformList<Record<string,unknown>>>("/api/v1/petowner/adoptions");
export const createAdoptionListing = (input:Record<string,unknown>) => request<{id:string;status:string;message:string}>("/api/v1/petowner/adoptions",{method:"POST",body:JSON.stringify(input)});
export const getDocumentProducts = () => request<PlatformList<DocumentProduct>>("/api/v1/public/pet-documents");
export const getPublicCampaigns = () => request<PlatformList<PublicCampaign>>("/api/v1/public/campaigns");
export const getPetshipPlaces=(options?:{latitude?:number;longitude?:number})=>{const q=new URLSearchParams();Object.entries(options??{}).forEach(([key,value])=>{if(value!==undefined)q.set(key,String(value))});return request<PlatformList<PetshipPlace>&{privacy:string}>(`/api/v1/public/petship/places${q.size?`?${q}`:""}`)};
export const getPetshipPresences=(placeId:string)=>request<PlatformList<PetshipPresence>>(`/api/v1/public/petship/places/${placeId}/presences`);
export const checkInPetship=(input:{pet_id:string;place_id:string;visibility:"nearby"|"friends";message:string})=>request<{id:string;expires_at:string;message:string}>("/api/v1/petowner/petship/presence",{method:"PUT",body:JSON.stringify(input)});
export const heartbeatPetship=()=>request<{expires_at:string}>("/api/v1/petowner/petship/heartbeat",{method:"POST"});
export const checkoutPetship=()=>request<{message:string}>("/api/v1/petowner/petship/presence",{method:"DELETE"});
export const getFundraisers=()=>request<PlatformList<Fundraiser>>("/api/v1/public/fundraisers");
export const getMyFundraisers=()=>request<PlatformList<MyFundraiser>>("/api/v1/petowner/fundraisers");
export const createFundraiser=(input:Record<string,unknown>)=>request<{id:string;status:string;message:string}>("/api/v1/petowner/fundraisers",{method:"POST",body:JSON.stringify(input)});
export const createFundraiserDonation=(fundraiserId:string,input:{amount:number;message:string;anonymous:boolean})=>request<{id:string;payment_reference:string;payment_status:string;amount:number;mode:string;message:string}>(`/api/v1/petowner/fundraisers/${fundraiserId}/donations`,{method:"POST",body:JSON.stringify(input)});
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
export const updatePawDatingProfile = (profileId:string,input:Record<string,unknown>) => request<{id:string;message:string}>(`/api/v1/pawdating/profiles/${profileId}`, { method:"PATCH", body:JSON.stringify(input) });
export const createPawDatingHealthReport = (profileId:string,input:Record<string,unknown>) => request<{id:string;verification_status:string;message:string}>(`/api/v1/pawdating/profiles/${profileId}/health-reports`, { method:"POST", body:JSON.stringify(input) });
export const submitPawDatingProfile = (profileId:string) => request<{id:string;status:string;message:string}>(`/api/v1/pawdating/profiles/${profileId}/submit`, { method:"POST" });
export const getPawDatingCompatibility = (targetId:string,sourceId:string) => request<{compatibility:PawDatingCompatibility}>(`/api/v1/pawdating/profiles/${targetId}/compatibility?source_profile_id=${sourceId}`);
export const sendPawDatingInterest = (targetId:string,input:{source_profile_id:string;interest_type:"interest"|"super_interest";introduction_message:string}) => request<{id:string;status:string;compatibility:PawDatingCompatibility;message:string}>(`/api/v1/pawdating/profiles/${targetId}/interests`, { method:"POST", body:JSON.stringify(input) });
export const getPawDatingInterests = () => request<PlatformList<PawDatingInterest>>("/api/v1/pawdating/interests");
export const respondPawDatingInterest = (interestId:string,action:"accept"|"decline") => request<{id:string;status:string;match_id?:string;message?:string}>(`/api/v1/pawdating/interests/${interestId}`, { method:"PATCH", body:JSON.stringify({action}) });
export const getPawDatingMessages = (matchId:string) => request<PlatformList<PawDatingMessage>>(`/api/v1/pawdating/matches/${matchId}/messages`);
export const createPawDatingMessage = (matchId:string,body:string) => request<{id:string;created_at:string}>(`/api/v1/pawdating/matches/${matchId}/messages`, { method:"POST", body:JSON.stringify({message_type:"text",body}) });
export const reportPawDatingProfile = (profileId:string,category:string,details:string) => request<{id:string;status:string;message:string}>("/api/v1/pawdating/reports", { method:"POST", body:JSON.stringify({profile_id:profileId,category,details,evidence_urls:[]}) });

export const getPetOwnerBootstrap=()=>request<PetOwnerBootstrap>("/api/v1/petowner/bootstrap");
export const getPetSpecies=()=>request<PlatformList<PetSpecies>>("/api/v1/public/pet-species");
export const updatePetOwnerProfile=(input:{full_name:string;phone:string})=>request<{full_name:string;phone:string;message:string}>("/api/v1/petowner/profile",{method:"PATCH",body:JSON.stringify(input)});
export const createPetOwnerPet=(input:Record<string,unknown>)=>request<{id:string;species:string;species_group:string;message:string}>("/api/v1/petowner/pets",{method:"POST",body:JSON.stringify(input)});
export const updatePetOwnerPet=(petId:string,input:Record<string,unknown>)=>request<{id:string;message:string}>(`/api/v1/petowner/pets/${petId}`,{method:"PATCH",body:JSON.stringify(input)});
export const getPetFamily=(petId:string)=>request<PlatformList<FamilyAccess>>(`/api/v1/petowner/pets/${petId}/family`);
export const invitePetFamily=(petId:string,input:Record<string,unknown>)=>request<{id:string;message:string}>(`/api/v1/petowner/pets/${petId}/family`,{method:"POST",body:JSON.stringify(input)});
export const revokePetFamily=(accessId:string)=>request<{message:string}>(`/api/v1/petowner/family/${accessId}`,{method:"DELETE"});
export const getLostPetMode=(petId:string)=>request<LostPetMode>(`/api/v1/petowner/pets/${petId}/lost-mode`);
export const activateLostPetMode=(petId:string,input:Record<string,unknown>)=>request<LostPetMode&{message:string}>(`/api/v1/petowner/pets/${petId}/lost-mode`,{method:"POST",body:JSON.stringify(input)});
export const closeLostPetMode=(petId:string,status:"found"|"closed")=>request<{status:string;message:string}>(`/api/v1/petowner/pets/${petId}/lost-mode`,{method:"PATCH",body:JSON.stringify({status})});
export const getNotifications=(category="",limit=100)=>request<{data:NotificationItem[];count:number;unread_count:number}>(`/api/v1/notifications?limit=${limit}&category=${encodeURIComponent(category)}`);
export const readNotification=(id:string)=>request<{read:boolean}>(`/api/v1/notifications/${id}/read`,{method:"PATCH"});
export const readAllNotifications=(category="")=>request<{updated:number}>(`/api/v1/notifications/read-all?category=${encodeURIComponent(category)}`,{method:"PATCH"});
export const togglePetOwnerFavorite=(entity_type:string,entity_id:string)=>request<{favorite:boolean}>("/api/v1/petowner/favorites/toggle",{method:"POST",body:JSON.stringify({entity_type,entity_id})});
export const getPetOwnerActivities=(category="")=>request<PlatformList<ActivityItem>>(`/api/v1/petowner/activities?category=${encodeURIComponent(category)}`);
export const getPetOwnerPoints=()=>request<{balance:number;earned:number;redeemed:number;formula:Record<string,unknown>;transactions:unknown[]}>("/api/v1/petowner/points");
export const getDiscoveryServices=(options?:{search?:string;category?:string;latitude?:number;longitude?:number})=>{const q=new URLSearchParams();Object.entries(options??{}).forEach(([key,value])=>{if(value!==undefined&&value!=="")q.set(key,String(value))});return request<PlatformList<DiscoveryService>>(`/api/v1/public/discovery/services${q.size?`?${q}`:""}`)};
export const getDiscoveryProducts=(search="",category="")=>request<PlatformList<DiscoveryProduct>>(`/api/v1/public/discovery/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`);
export const globalSearch=(query:string,category="")=>request<PlatformList<GlobalSearchResult>>(`/api/v1/public/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`);
export const createPetOwnerBooking=(input:Record<string,unknown>)=>request<{id:string;booking_code:string;amount:number;status:string;message:string}>("/api/v1/petowner/bookings",{method:"POST",body:JSON.stringify(input)});
export const getPaymentMethods=()=>request<PlatformList<PaymentMethod>&{provider:string;currency:string}>("/api/v1/payment-methods");
export const createPaymentIntent=(referenceType:string,referenceId:string,paymentMethod:string)=>request<PaymentIntent>("/api/v1/payment-intents",{method:"POST",headers:{"Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({reference_type:referenceType,reference_id:referenceId,payment_method:paymentMethod})});
export const getPaymentIntent=(paymentId:string)=>request<PaymentIntent>(`/api/v1/payment-intents/${paymentId}`);
export const createPetOwnerOrder=(items:Array<{product_id:string;quantity:number}>)=>request<{id:string;order_number:string;subtotal:number;platform_fee:number;amount:number;status:string;payment_status:string;reference_type:string}>("/api/v1/petowner/orders",{method:"POST",body:JSON.stringify({items})});
export const getMedicalRecords=(petId:string)=>request<PlatformList<MedicalRecord>>(`/api/v1/pets/${petId}/medical-records`);
export const getCommunityPosts=(options?:{tab?:string;search?:string})=>{const q=new URLSearchParams();Object.entries(options??{}).forEach(([key,value])=>{if(value)q.set(key,value)});return request<PlatformList<CommunityPost>>(`/api/v1/public/community/posts${q.size?`?${q}`:""}`)};
export const createCommunityPost=(input:Record<string,unknown>)=>request<{id:string;created_at:string;message:string}>("/api/v1/community/posts",{method:"POST",body:JSON.stringify(input)});
export const reactCommunityPost=(postId:string)=>request<{liked:boolean;like_count:number}>(`/api/v1/community/posts/${postId}/reactions`,{method:"POST"});
export const getCommunityComments=(postId:string)=>request<PlatformList<CommunityComment>>(`/api/v1/community/posts/${postId}/comments`);
export const createCommunityComment=(postId:string,body:string)=>request<{id:string;created_at:string;message:string}>(`/api/v1/community/posts/${postId}/comments`,{method:"POST",body:JSON.stringify({body})});
export const getCommunityGroups=(search="")=>request<PlatformList<CommunityGroup>>(`/api/v1/public/community/groups?search=${encodeURIComponent(search)}`);
export const createCommunityGroup=(input:Record<string,unknown>)=>request<{id:string;slug:string;message:string}>("/api/v1/community/groups",{method:"POST",body:JSON.stringify(input)});
export const joinCommunityGroup=(groupId:string)=>request<{joined:boolean;message:string}>(`/api/v1/community/groups/${groupId}/join`,{method:"POST"});
export const getCommunityGroupMessages=(groupId:string)=>request<PlatformList<CommunityGroupMessage>>(`/api/v1/community/groups/${groupId}/messages`);
export const createCommunityGroupMessage=(groupId:string,body:string)=>request<{id:string;created_at:string}>(`/api/v1/community/groups/${groupId}/messages`,{method:"POST",body:JSON.stringify({body})});
export const getCareReminders=()=>request<PlatformList<CareReminder>>("/api/v1/petowner/reminders");
export const createCareReminder=(input:Record<string,unknown>)=>request<{id:string;message:string}>("/api/v1/petowner/reminders",{method:"POST",body:JSON.stringify(input)});
export const completeCareReminder=(id:string)=>request<{id:string;message:string}>(`/api/v1/petowner/reminders/${id}/complete`,{method:"POST"});
export const snoozeCareReminder=(id:string,minutes:number)=>request<{id:string;message:string}>(`/api/v1/petowner/reminders/${id}/snooze`,{method:"POST",body:JSON.stringify({minutes})});
