import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency = "PHP", locale = "en-PH") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(
    amount / 100,
  );
}

export function formatDate(date: Date | string | null | undefined, locale = "en-PH") {
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    typeof date === "string" ? new Date(date) : date,
  );
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function storeHref(storeSlug: string, url: string): string {
  const value = url.trim();
  if (!value) return `/${storeSlug}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `/${storeSlug}${path}`;
}

export function timeAgo(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}
