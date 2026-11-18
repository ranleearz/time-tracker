import type { TimeEntry } from "../../../shared/src/index.ts";
import { buildReport, entriesToCsv } from "../../../shared/src/index.ts";
import { listEntries } from "../entries/service.ts";

export async function reportFor(
  userId: string,
  query: { from: string; to: string; projectId?: string; tzOffsetMinutes: number },
) {
  const entries = await listEntries(userId, query);
  return buildReport(entries, query.from, query.to, query.tzOffsetMinutes, new Date());
}

export async function reportCsv(
  userId: string,
  query: { from: string; to: string; projectId?: string; tzOffsetMinutes: number },
) {
  const entries: TimeEntry[] = await listEntries(userId, query);
  return entriesToCsv(entries, query.tzOffsetMinutes, new Date());
}
