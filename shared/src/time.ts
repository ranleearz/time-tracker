export type Interval = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
};

export function durationSeconds(startedAt: Date, endedAt: Date | null, now: Date): number {
  const end = endedAt ?? now;
  const diff = end.getTime() - startedAt.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / 1000);
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date | null,
  now: Date,
): boolean {
  const aStop = aEnd ?? now;
  const bStop = bEnd ?? now;
  return aStart < bStop && bStart < aStop;
}

export function findOverlap(candidate: Interval, existing: Interval[], now: Date): Interval | null {
  for (const item of existing) {
    if (item.id === candidate.id) continue;
    if (rangesOverlap(candidate.startedAt, candidate.endedAt, item.startedAt, item.endedAt, now)) {
      return item;
    }
  }
  return null;
}

export function hasOpenConflict(candidate: Interval, existing: Interval[]): boolean {
  if (candidate.endedAt !== null) return false;
  return existing.some((item) => item.id !== candidate.id && item.endedAt === null);
}

export function assertBounds(startedAt: Date, endedAt: Date | null, now: Date): string | null {
  if (Number.isNaN(startedAt.getTime())) return "Некорректное время начала";
  if (endedAt && Number.isNaN(endedAt.getTime())) return "Некорректное время окончания";
  const latest = now.getTime() + 60_000;
  if (startedAt.getTime() > latest) return "Начало не может быть в будущем";
  if (endedAt && endedAt.getTime() > latest) return "Окончание не может быть в будущем";
  if (endedAt && endedAt.getTime() <= startedAt.getTime()) return "Окончание должно быть позже начала";
  return null;
}

export function localDayStartUtc(day: string, offsetMinutes: number): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new Error("bad day");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, date) + offsetMinutes * 60_000);
}

export function addDays(day: string, amount: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  utc.setUTCDate(utc.getUTCDate() + amount);
  return utc.toISOString().slice(0, 10);
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    if (days.length > 400) break;
  }
  return days;
}

export function dayKey(instant: Date, offsetMinutes: number): string {
  const local = new Date(instant.getTime() - offsetMinutes * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatStamp(instant: Date, offsetMinutes: number): string {
  const local = new Date(instant.getTime() - offsetMinutes * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}
