import type { Report, TimeEntry } from "./types.ts";
import { dayKey, durationSeconds, eachDay } from "./time.ts";

export function buildReport(
  entries: TimeEntry[],
  from: string,
  to: string,
  offsetMinutes: number,
  now: Date,
): Report {
  const byProjectMap = new Map<string, Report["byProject"][number]>();
  const byDayMap = new Map<string, number>();
  for (const day of eachDay(from, to)) byDayMap.set(day, 0);
  let totalSeconds = 0;

  for (const entry of entries) {
    const seconds = durationSeconds(
      new Date(entry.startedAt),
      entry.endedAt ? new Date(entry.endedAt) : null,
      now,
    );
    totalSeconds += seconds;
    const current = byProjectMap.get(entry.projectId) ?? {
      projectId: entry.projectId,
      projectName: entry.projectName,
      projectColor: entry.projectColor,
      seconds: 0,
    };
    current.seconds += seconds;
    byProjectMap.set(entry.projectId, current);
    const day = dayKey(new Date(entry.startedAt), offsetMinutes);
    if (byDayMap.has(day)) byDayMap.set(day, (byDayMap.get(day) ?? 0) + seconds);
  }

  return {
    totalSeconds,
    byProject: [...byProjectMap.values()].sort((a, b) => b.seconds - a.seconds || a.projectName.localeCompare(b.projectName, "ru")),
    byDay: [...byDayMap.entries()].map(([day, seconds]) => ({ day, seconds })),
    entries,
  };
}
