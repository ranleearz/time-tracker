import { dayKey, type Project, type TimeEntry, type WsEvent } from "@tracker/shared";

export type Snapshot = {
  projects: Project[];
  entries: TimeEntry[];
  running: TimeEntry | null;
};

function compareProjects(a: Project, b: Project): number {
  if (a.archived !== b.archived) return a.archived ? 1 : -1;
  return a.name.localeCompare(b.name, "ru");
}

function placeEntry(entries: TimeEntry[], entry: TimeEntry, day: string, offset: number): TimeEntry[] {
  const next = entries.filter((item) => item.id !== entry.id);
  if (dayKey(new Date(entry.startedAt), offset) !== day) return next;
  next.push(entry);
  next.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return next;
}

export function applyEvent(state: Snapshot, event: WsEvent, day: string, offset: number): Snapshot {
  if (event.type === "project.deleted") {
    return { ...state, projects: state.projects.filter((project) => project.id !== event.id) };
  }
  if (event.type === "project.upserted") {
    const projects = state.projects.filter((project) => project.id !== event.project.id);
    projects.push(event.project);
    projects.sort(compareProjects);
    return { ...state, projects };
  }
  if (event.type === "entry.deleted") {
    return {
      ...state,
      entries: state.entries.filter((entry) => entry.id !== event.id),
      running: state.running?.id === event.id ? null : state.running,
    };
  }
  return {
    ...state,
    entries: placeEntry(state.entries, event.entry, day, offset),
    running:
      event.entry.endedAt === null
        ? event.entry
        : state.running?.id === event.entry.id
          ? null
          : state.running,
  };
}
