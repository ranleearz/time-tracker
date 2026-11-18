import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { EntryCreateInput, EntryUpdateInput, Project, ProjectColor, TimeEntry } from "@tracker/shared";
import { useAuth } from "../auth/AuthProvider.tsx";
import { api } from "../api.ts";
import { todayInput, tzOffsetMinutes } from "../format.ts";
import { connectSocket } from "../socket.ts";
import { applyEvent, type Snapshot } from "./apply.ts";

type DataValue = {
  projects: Project[];
  entries: TimeEntry[];
  running: TimeEntry | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  start: (projectId: string, description: string) => Promise<void>;
  stop: () => Promise<void>;
  createEntry: (input: EntryCreateInput) => Promise<void>;
  updateEntry: (id: string, input: EntryUpdateInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  createProject: (input: { name: string; color: ProjectColor }) => Promise<void>;
  updateProject: (id: string, input: { name?: string; color?: ProjectColor; archived?: boolean }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
};

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { revalidate } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot>({ projects: [], entries: [], running: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef(snapshot);
  const dayRef = useRef(todayInput());
  snapshotRef.current = snapshot;

  const commit = useCallback((next: Snapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const load = useCallback(
    async (day: string) => {
      const params = new URLSearchParams({
        from: day,
        to: day,
        tzOffsetMinutes: String(tzOffsetMinutes()),
      });
      const [projectRes, entryRes, timerRes] = await Promise.all([
        api<{ projects: Project[] }>("/api/projects?includeArchived=true"),
        api<{ entries: TimeEntry[] }>(`/api/entries?${params}`),
        api<{ entry: TimeEntry | null }>("/api/timer"),
      ]);
      dayRef.current = day;
      commit({
        projects: projectRes.projects,
        entries: entryRes.entries,
        running: timerRes.entry,
      });
    },
    [commit],
  );

  const reload = useCallback(async () => {
    await load(todayInput());
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    load(todayInput())
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Не удалось загрузить данные");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = todayInput();
      if (next !== dayRef.current) void load(next).catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    let failures = 0;
    return connectSocket(
      (event) => {
        failures = 0;
        commit(applyEvent(snapshotRef.current, event, dayRef.current, tzOffsetMinutes()));
      },
      async () => {
        if (failures >= 2) return false;
        failures += 1;
        return revalidate();
      },
    );
  }, [commit, revalidate]);

  const absorb = useCallback(
    (event: Parameters<typeof applyEvent>[1]) => {
      commit(applyEvent(snapshotRef.current, event, dayRef.current, tzOffsetMinutes()));
    },
    [commit],
  );

  const value = useMemo<DataValue>(
    () => ({
      projects: snapshot.projects,
      entries: snapshot.entries,
      running: snapshot.running,
      loading,
      error,
      reload,
      async start(projectId, description) {
        const result = await api<{ stopped: TimeEntry | null; started: TimeEntry }>("/api/timer/start", {
          method: "POST",
          body: JSON.stringify({ projectId, description }),
        });
        if (result.stopped) absorb({ type: "entry.upserted", entry: result.stopped });
        absorb({ type: "entry.upserted", entry: result.started });
      },
      async stop() {
        const result = await api<{ entry: TimeEntry }>("/api/timer/stop", { method: "POST" });
        absorb({ type: "entry.upserted", entry: result.entry });
      },
      async createEntry(input) {
        const result = await api<{ entry: TimeEntry }>("/api/entries", {
          method: "POST",
          body: JSON.stringify(input),
        });
        absorb({ type: "entry.upserted", entry: result.entry });
      },
      async updateEntry(id, input) {
        const result = await api<{ entry: TimeEntry }>(`/api/entries/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        });
        absorb({ type: "entry.upserted", entry: result.entry });
      },
      async deleteEntry(id) {
        await api(`/api/entries/${id}`, { method: "DELETE" });
        absorb({ type: "entry.deleted", id });
      },
      async createProject(input) {
        const result = await api<{ project: Project }>("/api/projects", {
          method: "POST",
          body: JSON.stringify(input),
        });
        absorb({ type: "project.upserted", project: result.project });
      },
      async updateProject(id, input) {
        const result = await api<{ project: Project }>(`/api/projects/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        });
        absorb({ type: "project.upserted", project: result.project });
      },
      async deleteProject(id) {
        await api(`/api/projects/${id}`, { method: "DELETE" });
        absorb({ type: "project.deleted", id });
      },
    }),
    [absorb, error, loading, reload, snapshot],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("data missing");
  return value;
}
