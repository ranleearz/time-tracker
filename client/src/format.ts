import { formatDuration } from "@tracker/shared";

export function tzOffsetMinutes(): number {
  return new Date().getTimezoneOffset();
}

export function todayInput(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shiftDay(day: string, amount: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const value = new Date(year, month - 1, date);
  value.setDate(value.getDate() + amount);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function monthStart(day: string): string {
  return `${day.slice(0, 8)}01`;
}

export function formatLongDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, date));
}

export function formatShortDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(year, month - 1, date));
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function elapsedLabel(startedAt: string, endedAt: string | null, now: number): string {
  const end = endedAt ? new Date(endedAt).getTime() : now;
  const seconds = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000));
  return formatDuration(seconds);
}

export { formatDuration };
