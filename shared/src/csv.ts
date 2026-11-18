import type { TimeEntry } from "./types.ts";
import { dayKey, durationSeconds, formatDuration, formatStamp } from "./time.ts";

export type CsvRow = {
  date: string;
  project: string;
  description: string;
  start: string;
  end: string;
  duration: string;
};

function neutralize(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

function cell(value: string): string {
  const safe = neutralize(value);
  if (/[",\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

export function toCsv(rows: CsvRow[]): string {
  const header = ["Дата", "Проект", "Описание", "Старт", "Стоп", "Длительность"];
  const lines = [
    header,
    ...rows.map((row) => [row.date, row.project, row.description, row.start, row.end, row.duration]),
  ];
  return `\uFEFF${lines.map((line) => line.map(cell).join(",")).join("\r\n")}\r\n`;
}

export function entriesToCsv(entries: TimeEntry[], offsetMinutes: number, now: Date): string {
  const rows = entries.map((entry) => {
    const started = new Date(entry.startedAt);
    const ended = entry.endedAt ? new Date(entry.endedAt) : null;
    return {
      date: dayKey(started, offsetMinutes),
      project: entry.projectName,
      description: entry.description,
      start: formatStamp(started, offsetMinutes),
      end: ended ? formatStamp(ended, offsetMinutes) : "",
      duration: formatDuration(durationSeconds(started, ended, now)),
    };
  });
  return toCsv(rows);
}
