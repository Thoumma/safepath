import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "2 ນທ", "3 ຊມ", "1 ວັນ" — short Lao relative time. */
export function agoLao(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s} ວິ`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ນທ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ຊມ`;
  return `${Math.floor(h / 24)} ວັນ`;
}

export function initials(name: string): string {
  const parts = name.replace(/^(ນາງ|ທ\.|ທ້າວ|ນາຍ)\s*/u, "").trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?");
}
