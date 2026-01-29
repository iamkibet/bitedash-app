export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10)
    return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;
  return phone;
}

export function isValidKenyanPhone(phone: string): boolean {
  const n = normalizePhone(phone);
  return /^\+254\d{9}$/.test(n);
}
