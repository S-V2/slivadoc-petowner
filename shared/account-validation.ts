export const normalizePhoneInput = (value: string) => value.replace(/[^0-9]/g, "").slice(0, 16);
export const validPhone = (value: string) => /^0[0-9]{8,15}$/.test(value);
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const validPassword = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
export function profileValidation(name: string, phone: string, email: string) {
  return {
    name: name.trim().length < 3 ? "Nama lengkap wajib diisi, minimal 3 karakter." : "",
    phone: !validPhone(phone) ? "Nomor telepon wajib diisi dengan 9–16 angka dan diawali 0." : "",
    email: !validEmail(email) ? "Email login belum valid." : "",
  };
}
