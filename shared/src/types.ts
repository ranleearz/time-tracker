export const projectColors = [
  "#1f6f5b",
  "#1d4e89",
  "#7a3e6d",
  "#b5452e",
  "#a16207",
  "#3f6212",
  "#0f5f73",
  "#3f3f46",
] as const;

export type ProjectColor = (typeof projectColors)[number];

export type UserPublic = {
  id: string;
  email: string;
  name: string;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  createdAt: string;
};

export type TimeEntry = {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  description: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReportProjectSlice = {
  projectId: string;
  projectName: string;
  projectColor: string;
  seconds: number;
};

export type ReportDaySlice = {
  day: string;
  seconds: number;
};

export type Report = {
  totalSeconds: number;
  byProject: ReportProjectSlice[];
  byDay: ReportDaySlice[];
  entries: TimeEntry[];
};

export type WsEvent =
  | { type: "entry.upserted"; entry: TimeEntry }
  | { type: "entry.deleted"; id: string }
  | { type: "project.upserted"; project: Project }
  | { type: "project.deleted"; id: string };

export function isWsEvent(value: unknown): value is WsEvent {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "entry.upserted" ||
    type === "entry.deleted" ||
    type === "project.upserted" ||
    type === "project.deleted"
  );
}
