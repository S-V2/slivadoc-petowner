export type CareerLanguage = "id" | "en";
export type CareerText = Record<CareerLanguage, string>;
export type CareerField = {
  id: string;
  label: CareerText;
  kind: "text" | "textarea" | "url";
  required: boolean;
  min_length: number;
  max_length: number;
};
export type CareerPosition = {
  id: string;
  title: CareerText;
  department: string;
  status: "open" | "talent_pool" | "closed";
  summary: CareerText;
  responsibilities: CareerText[];
  requirements: CareerText[];
  fields: CareerField[];
  employment_types?: string[];
  work_mode?: "on_site" | "hybrid" | "remote";
  city?: string;
  region?: string;
  revision?: number;
  published_at?: string | null;
  closes_at?: string | null;
  updated_at?: string;
};
export type CareerCatalog = { data: CareerPosition[]; consent_version: string };
export type CareerDraft = {
  employment_type?: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  education: string;
  experience: string;
  availability: string;
  motivation: string;
  answers: Record<string, string>;
  consent: boolean;
  truth_declaration: boolean;
};
export type CareerApplication = CareerDraft & {
  position_id: string;
  position_revision?: number;
  request_key: string;
  language: CareerLanguage;
  consent_version: string;
};
export const MAX_CAREER_RESUME = 5 * 1024 * 1024;
export const emptyCareerDraft = (): CareerDraft => ({
  employment_type: "",
  full_name: "",
  email: "",
  phone: "",
  city: "",
  education: "",
  experience: "",
  availability: "",
  motivation: "",
  answers: {},
  consent: false,
  truth_declaration: false,
});
export const careerDepartments: Record<string, CareerText> = {
  pet_services: { id: "Jasa Pet Care", en: "Pet Care Services" },
  engineering: { id: "Engineering", en: "Engineering" },
  product: { id: "Produk & Data", en: "Product & Data" },
  marketing: { id: "Marketing & Komunitas", en: "Marketing & Community" },
  commercial: { id: "Sales & Kemitraan", en: "Sales & Partnerships" },
  operations: { id: "Operasional", en: "Operations" },
  medical: { id: "Medis & Veteriner", en: "Medical & Veterinary" },
  corporate: { id: "Corporate & People", en: "Corporate & People" },
  early_careers: {
    id: "Magang & Awal Karier",
    en: "Internships & Early Careers",
  },
};
export const careerEmploymentTypes: Record<string, CareerText> = {
  FULL_TIME: { id: "Full-time", en: "Full-time" },
  PART_TIME: { id: "Part-time", en: "Part-time" },
  CONTRACTOR: { id: "Freelance / Kontrak", en: "Freelance / Contract" },
  TEMPORARY: { id: "Sementara", en: "Temporary" },
  INTERN: { id: "Magang", en: "Internship" },
  VOLUNTEER: { id: "Relawan", en: "Volunteer" },
  PER_DIEM: { id: "Harian", en: "Per diem" },
  OTHER: { id: "Lainnya", en: "Other" },
};
export function careerLocationArea(p: CareerPosition): string {
  return [...new Set([p.city?.trim(), p.region?.trim()].filter(Boolean))].join(
    ", ",
  );
}
export function careerLocation(p: CareerPosition, lang: CareerLanguage) {
  const area = careerLocationArea(p);
  if (!area && p.work_mode === "remote")
    return lang === "id" ? "Remote · Indonesia" : "Remote · Indonesia";
  return [area, "Indonesia"].filter(Boolean).join(", ");
}
export const careerCopy = {
  id: {
    back: "Kembali",
    home: "Beranda",
    eyebrow: "GROW WITH SLIVADOC",
    title: "Karier yang berarti.",
    titleAccent: "Dampak untuk setiap pet.",
    intro:
      "Bawa ide, keahlian, dan kepedulianmu. Bersama, kita membangun pengalaman pet care yang lebih baik di Indonesia.",
    explore: "Jelajahi peluang",
    positions: "Temukan ruang untuk bertumbuh",
    positionsNote:
      "Pilih tim yang cocok dengan keahlianmu, lalu kenalkan dirimu lewat formulir khusus posisi tersebut.",
    all: "Semua tim",
    search: "Cari posisi atau keahlian",
    results: "posisi",
    open: "Lowongan aktif",
    talent_pool: "Talent pool",
    talentNote:
      "Pendaftaran minat untuk kesempatan mendatang. Ini bukan konfirmasi lowongan aktif; tim rekrutmen dapat menghubungi jika ada kebutuhan yang sesuai.",
    location: "Indonesia · Detail penempatan dibahas saat seleksi",
    detail: "Lihat posisi",
    apply: "Isi formulir",
    about: "Tentang peran ini",
    responsibilities: "Kontribusimu",
    requirements: "Bekal yang dibutuhkan",
    formTitle: "Kenalkan dirimu",
    formIntro:
      "Semua isian bertanda * wajib diisi. Jawaban khusus di bawah mengikuti posisi yang kamu pilih.",
    personal: "01 · Profil kandidat",
    role: "02 · Keahlian sesuai posisi",
    documents: "03 · CV & persetujuan",
    employment_type: "Pilihan jenis kerja",
    allTypes: "Semua jenis kerja",
    chooseType: "Pilih jenis kerja",
    full_name: "Nama lengkap",
    email: "Email aktif",
    phone: "Nomor telepon",
    city: "Kota / domisili",
    education: "Pendidikan / latar pembelajaran",
    experience: "Pengalaman relevan (tahun)",
    availability: "Kapan kamu bisa mulai?",
    motivation: "Mengapa ingin bergabung dengan Slivadoc?",
    motivationHint: "Ceritakan motivasi dan kontribusimu, minimal 30 karakter.",
    resume: "CV / resume",
    upload: "Pilih CV PDF",
    uploadHint:
      "PDF saja, maksimal 5 MB. CV disimpan secara privat untuk ditinjau tim rekrutmen.",
    consent:
      "Saya menyetujui pemrosesan data lamaran dan CV untuk penilaian rekrutmen serta dihubungi terkait posisi ini, setelah membaca Kebijakan Privasi.",
    truth:
      "Saya menyatakan informasi lamaran benar dan dokumen ini milik saya atau saya berhak membagikannya.",
    privacy: "Baca Kebijakan Privasi",
    submit: "Kirim lamaran",
    sending: "Mengirim lamaran…",
    success: "Lamaranmu sudah diterima!",
    successNote:
      "Simpan nomor referensi ini. Tim rekrutmen dapat menghubungimu melalui kontak yang kamu berikan apabila profilmu sesuai dengan kebutuhan tim.",
    reference: "Nomor referensi",
    browse: "Lihat posisi lainnya",
    retry: "Coba lagi",
    loadError: "Posisi belum dapat dimuat. Periksa koneksi lalu coba lagi.",
    empty: "Belum ada posisi yang cocok dengan pencarianmu.",
    clear: "Hapus pencarian",
    required: "Wajib diisi",
    invalid: "Periksa isian ini",
    emailError: "Masukkan email yang valid.",
    phoneError: "Gunakan 8–15 digit angka saja.",
    experienceError: "Masukkan 0–60 tahun; 0 untuk awal karier.",
    lengthError: "Periksa panjang jawaban",
    urlError: "Gunakan tautan HTTPS lengkap.",
    resumeError: "Pilih CV berformat PDF maksimal 5 MB.",
    consentError: "Persetujuan ini wajib diberikan.",
    check: "Lengkapi isian yang ditandai sebelum mengirim.",
    networkError: "Lamaran belum terkirim. Periksa koneksi dan coba lagi.",
    noFee: "Rekrutmen tanpa biaya",
    noFeeNote:
      "Jangan melakukan pembayaran untuk mengikuti proses rekrutmen Slivadoc.",
    process: "Langkah kecil, peluang besar",
    steps: ["Temukan timmu", "Kirim profil & CV", "Diskusi jika sesuai"],
    stepNotes: [
      "Jelajahi peran sesuai minat dan keahlian.",
      "Jawab pertanyaan yang relevan dengan posisi.",
      "Tim meninjau profil berdasarkan kebutuhan.",
    ],
    values: ["Peduli setiap pet", "Berkarya bersama", "Terus bertumbuh"],
    valueNotes: [
      "Bangun layanan dengan empati.",
      "Satukan beragam keahlian.",
      "Belajar lewat tantangan nyata.",
    ],
    backPositions: "Kembali ke posisi",
    readPrivacy: "Kebijakan privasi kandidat",
    privacyNote:
      "Data kontak, jawaban, dan CV yang kamu kirim dipakai tim rekrutmen Slivadoc untuk menilai kecocokan dan menghubungimu terkait lamaran. CV tidak ditampilkan di katalog publik. Jangan sertakan NIK, nomor rekening, atau data sensitif yang tidak diperlukan.",
    close: "Tutup",
    min: "Min.",
    chars: "karakter",
    fileSelected: "CV dipilih",
    language: "Bahasa",
  },
  en: {
    back: "Back",
    home: "Home",
    eyebrow: "GROW WITH SLIVADOC",
    title: "Meaningful careers.",
    titleAccent: "An impact for every pet.",
    intro:
      "Bring your ideas, skills, and care. Together, we can build better pet care experiences across Indonesia.",
    explore: "Explore opportunities",
    positions: "Find your place to grow",
    positionsNote:
      "Choose a team that matches your skills, then introduce yourself through a role-specific application.",
    all: "All teams",
    search: "Search roles or skills",
    results: "positions",
    open: "Open position",
    talent_pool: "Talent pool",
    talentNote:
      "Register your interest in future opportunities. This is not a confirmed active vacancy; recruitment may contact you when a suitable need arises.",
    location: "Indonesia · Placement details discussed during selection",
    detail: "View role",
    apply: "Start application",
    about: "About this role",
    responsibilities: "Your contribution",
    requirements: "What you bring",
    formTitle: "Introduce yourself",
    formIntro:
      "All fields marked * are required. The questions below are tailored to your selected role.",
    personal: "01 · Candidate profile",
    role: "02 · Role-specific experience",
    documents: "03 · Resume & consent",
    employment_type: "Employment preference",
    allTypes: "All employment types",
    chooseType: "Choose employment type",
    full_name: "Full name",
    email: "Active email",
    phone: "Phone number",
    city: "City / location",
    education: "Education / learning background",
    experience: "Relevant experience (years)",
    availability: "When can you start?",
    motivation: "Why would you like to join Slivadoc?",
    motivationHint:
      "Tell us your motivation and contribution in at least 30 characters.",
    resume: "CV / resume",
    upload: "Choose PDF resume",
    uploadHint:
      "PDF only, up to 5 MB. Resumes are stored privately for recruitment review.",
    consent:
      "I consent to processing my application and resume for recruitment assessment and to being contacted about this role, after reading the Privacy Policy.",
    truth:
      "I confirm my application is accurate and I own or am authorized to share these documents.",
    privacy: "Read Privacy Policy",
    submit: "Submit application",
    sending: "Submitting application…",
    success: "Your application is in!",
    successNote:
      "Keep this reference number. Recruitment may contact you using the details you provided if your profile matches the team's needs.",
    reference: "Reference number",
    browse: "Browse more roles",
    retry: "Try again",
    loadError:
      "We couldn't load positions. Check your connection and try again.",
    empty: "No positions match your search.",
    clear: "Clear search",
    required: "Required",
    invalid: "Please check this field",
    emailError: "Enter a valid email address.",
    phoneError: "Use 8–15 digits only.",
    experienceError: "Enter 0–60 years; use 0 for early careers.",
    lengthError: "Check your answer length",
    urlError: "Enter a complete HTTPS URL.",
    resumeError: "Choose a PDF resume up to 5 MB.",
    consentError: "This agreement is required.",
    check: "Complete the highlighted fields before submitting.",
    networkError:
      "Your application hasn't been sent. Check your connection and retry.",
    noFee: "No recruitment fees",
    noFeeNote: "Never make a payment to take part in Slivadoc recruitment.",
    process: "Small steps, real possibilities",
    steps: [
      "Find your team",
      "Send your profile & CV",
      "Connect if there's a fit",
    ],
    stepNotes: [
      "Explore roles that match your interests and skills.",
      "Answer questions relevant to your chosen role.",
      "The team reviews profiles against hiring needs.",
    ],
    values: ["Care for every pet", "Create together", "Keep growing"],
    valueNotes: [
      "Build services with empathy.",
      "Bring diverse skills together.",
      "Learn through real challenges.",
    ],
    backPositions: "Back to positions",
    readPrivacy: "Candidate privacy notice",
    privacyNote:
      "Slivadoc recruitment uses the contact details, answers, and resume you submit to assess your fit and contact you about your application. Resumes are not shown in the public catalog. Do not include identity numbers, bank details, or unnecessary sensitive data.",
    close: "Close",
    min: "Min.",
    chars: "characters",
    fileSelected: "Resume selected",
    language: "Language",
  },
} as const;
export type CareerBasicField = keyof Pick<
  CareerDraft,
  | "full_name"
  | "email"
  | "phone"
  | "city"
  | "education"
  | "experience"
  | "availability"
  | "motivation"
>;
export const careerBasicFields: {
  id: CareerBasicField;
  max: number;
  min: number;
  kind: "text" | "email" | "tel" | "number" | "textarea";
}[] = [
  { id: "full_name", min: 2, max: 180, kind: "text" },
  { id: "email", min: 3, max: 255, kind: "email" },
  { id: "phone", min: 8, max: 15, kind: "tel" },
  { id: "city", min: 2, max: 120, kind: "text" },
  { id: "education", min: 2, max: 200, kind: "text" },
  { id: "experience", min: 1, max: 2, kind: "number" },
  { id: "availability", min: 2, max: 200, kind: "text" },
  { id: "motivation", min: 30, max: 2000, kind: "textarea" },
];
export function validCareerResume(
  file: { name: string; size?: number } | null,
) {
  return Boolean(
    file &&
    /\.pdf$/i.test(file.name) &&
    file.size &&
    file.size > 0 &&
    file.size <= MAX_CAREER_RESUME,
  );
}
export function careerErrors(
  draft: CareerDraft,
  position: CareerPosition,
  file: { name: string; size?: number } | null,
  language: CareerLanguage,
) {
  const c = careerCopy[language],
    errors: Record<string, string> = {};
  const types = position.employment_types ?? [];
  if (types.length > 1 && !types.includes(draft.employment_type ?? ""))
    errors.employment_type = c.required;
  for (const f of careerBasicFields) {
    const v = draft[f.id].trim();
    if (v.length < f.min || v.length > f.max)
      errors[f.id] = !v ? c.required : `${c.lengthError} (${f.min}–${f.max})`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
    errors.email = c.emailError;
  if (!/^\d{8,15}$/.test(draft.phone)) errors.phone = c.phoneError;
  if (!/^(?:[0-9]|[1-5][0-9]|60)$/.test(draft.experience))
    errors.experience = c.experienceError;
  for (const f of position.fields) {
    const v = (draft.answers[f.id] ?? "").trim();
    if ((f.required && v.length < f.min_length) || v.length > f.max_length)
      errors[`answers.${f.id}`] = !v
        ? c.required
        : `${c.lengthError} (${f.min_length}–${f.max_length})`;
    if (f.kind === "url" && v) {
      try {
        const u = new URL(v);
        if (
          u.protocol !== "https:" ||
          !u.hostname.includes(".") ||
          u.username ||
          u.password
        )
          throw new Error();
      } catch {
        errors[`answers.${f.id}`] = c.urlError;
      }
    }
  }
  if (!validCareerResume(file)) errors.resume = c.resumeError;
  if (!draft.consent) errors.consent = c.consentError;
  if (!draft.truth_declaration) errors.truth_declaration = c.consentError;
  return errors;
}
export async function getCareerCatalog(
  baseURL: string,
  signal?: AbortSignal,
): Promise<CareerCatalog> {
  const r = await fetch(`${baseURL}/api/v1/public/careers`, { signal });
  if (!r.ok) throw new Error("careers_unavailable");
  return r.json();
}
export class CareerSubmissionError extends Error {
  code: string;
  fields: Record<string, string>;
  constructor(code: string, fields: Record<string, string> = {}) {
    super(code);
    this.code = code;
    this.fields = fields;
  }
}
export async function sendCareerApplication(
  baseURL: string,
  form: FormData,
  auth: { getToken: () => string; refresh: () => Promise<unknown> },
) {
  if (!auth.getToken()) throw new CareerSubmissionError("login_required");
  const send = () =>
    fetch(`${baseURL}/api/v1/public/career-applications`, {
      method: "POST",
      body: form,
      headers: { Authorization: `Bearer ${auth.getToken()}` },
    });
  let response = await send();
  if (response.status === 401) {
    try {
      await auth.refresh();
      response = await send();
    } catch {
      throw new CareerSubmissionError("login_required");
    }
  }
  if (response.status === 401)
    throw new CareerSubmissionError("login_required");
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new CareerSubmissionError(
      result.code ?? "network_error",
      result.fields ?? {},
    );
  if (typeof result.id !== "string")
    throw new CareerSubmissionError("network_error");
  return result as { id: string; status: string };
}
export function careerSubmitError(error: unknown, language: CareerLanguage) {
  const en = language === "en";
  switch (error instanceof CareerSubmissionError ? error.code : "") {
    case "login_required":
      return en
        ? "Your session ended. Please sign in again."
        : "Sesi berakhir. Silakan masuk kembali.";
    case "already_applied":
      return en
        ? "An application for this email and position was already received."
        : "Lamaran untuk email dan posisi ini sudah diterima.";
    case "position_closed":
      return en
        ? "This position is now closed. Please choose another role."
        : "Posisi ini sudah ditutup. Silakan pilih posisi lainnya.";
    case "application_limit":
      return en
        ? "Daily submission limit reached. Please try tomorrow."
        : "Batas pengiriman harian tercapai. Silakan coba besok.";
    case "invalid_resume":
    case "invalid_upload":
      return careerCopy[language].resumeError;
    case "invalid_application":
      return careerCopy[language].check;
    default:
      return careerCopy[language].networkError;
  }
}
// This identifies retries only; it is never an authorization credential.
export function careerRequestKey() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === "x" ? n : (n & 3) | 8).toString(16);
  });
}
