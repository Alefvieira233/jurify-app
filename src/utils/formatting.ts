/**
 * Shared formatting utilities — single source of truth for presentation helpers.
 * Consolidates the former formatters.ts (deleted) into this file.
 */

/* ── Avatar ── */
const AVATAR_PALETTE = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#9333ea', '#0d9488',
];

/** Returns 1-2 letter initials from a full name. */
export function getInitials(name: string | null, fallback = '?'): string {
  if (!name?.trim()) return fallback.charAt(0).toUpperCase();
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

/** Returns a deterministic hex color for an avatar based on a seed string. */
export function getAvatarHex(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0]!;
}

/* ── Numbers / Currency ── */

/** Formats a number as BRL currency with no decimal places (R$ 1.500). */
export const fmtCurrency = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

/** Formats a number as BRL currency with two decimal places (R$ 1.500,00). */
export const fmtCurrencyFull = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/** Formats a number with pt-BR grouping separators. */
export const fmtNumber = (v: number): string =>
  new Intl.NumberFormat('pt-BR').format(v);

/** Formats a value as a percentage with one decimal place (e.g. 85.0%). */
export const fmtPercentage = (v: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v / 100);

/* ── Dates ── */

/** Formats a date as dd/mm (pt-BR). */
export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** Formats a datetime as dd/mm HH:mm (pt-BR). */
export const fmtDateTime = (iso: string): string =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

/** Formats a datetime as HH:mm (message timestamp). */
export const fmtMessageTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Formats a datetime as full locale string dd/mm/yyyy HH:mm:ss (pt-BR). */
export const fmtDateTimeFull = (iso: string): string =>
  new Date(iso).toLocaleString('pt-BR');

/** Returns a human-readable relative time string (agora / Xmin / Xh / ontem / dd/mm). */
export function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ontem';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/* ── Strings ── */

/** Truncates text to length, appending "…" if needed. */
export const truncate = (text: string, length: number): string =>
  text.length > length ? text.substring(0, length) + '…' : text;

/** Capitalizes the first letter and lowercases the rest. */
export const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

/* ── Document / Contact numbers ── */

/** Formats a Brazilian phone number: (11) 99999-9999 or (11) 9999-9999. */
export function fmtPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (cleaned.length === 10) return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return phone;
}

/** Formats a CPF: 000.000.000-00. */
export function fmtCPF(cpf: string): string {
  return cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/** Formats a CNPJ: 00.000.000/0000-00. */
export function fmtCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/* ── Files ── */

/** Formats a byte count as a human-readable file size (Bytes, KB, MB, GB). */
export function fmtFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'] as const;
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
}
