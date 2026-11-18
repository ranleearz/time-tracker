import { useEffect, useState, type FormEvent } from "react";
import type { TimeEntry } from "@tracker/shared";
import { Alert, controlClass, dangerClass, Field, messageOf, primaryClass, quietClass } from "../components/ui.tsx";
import { useData } from "../data/DataProvider.tsx";
import { elapsedLabel, formatClock, formatLongDay, fromLocalInput, todayInput, toLocalInput } from "../format.ts";

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

export function TrackerPage() {
  const data = useData();
  const now = useNow(Boolean(data.running));
  const activeProjects = data.projects.filter((project) => !project.archived);
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (projectId || activeProjects.length === 0) return;
    setProjectId(activeProjects[0].id);
  }, [activeProjects, projectId]);

  useEffect(() => {
    if (!data.running) return;
    setProjectId(data.running.projectId);
    const field = document.getElementById("timer-description");
    if (document.activeElement !== field) setDescription(data.running.description);
  }, [data.running]);

  const sameAsRunning =
    data.running !== null &&
    data.running.projectId === projectId &&
    data.running.description === description.trim();

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm uppercase tracking-[0.16em] text-muted">сегодня</p>
        <h1 className="mt-1 text-3xl font-semibold capitalize tracking-tight">{formatLongDay(todayInput())}</h1>
      </header>
      <section className="rounded-[28px] border border-line bg-card p-5 shadow-[0_16px_40px_rgba(23,33,30,0.04)] md:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-col gap-4">
            <Field label="Проект">
              <select className={controlClass} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                {activeProjects.length === 0 ? <option value="">Нет активных проектов</option> : null}
                {data.running && !activeProjects.some((project) => project.id === data.running?.projectId) ? (
                  <option value={data.running.projectId}>{data.running.projectName}</option>
                ) : null}
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Описание">
              <input
                id="timer-description"
                className={controlClass}
                placeholder="Над чем работаете"
                value={description}
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>
          <div className="lg:text-right">
            <div className="font-mono text-5xl tracking-tight tabular-nums md:text-6xl">
              {data.running ? elapsedLabel(data.running.startedAt, null, now) : "00:00:00"}
            </div>
            <p className="mt-2 text-sm text-muted">
              {data.running ? `идёт с ${formatClock(data.running.startedAt)}` : "таймер остановлен"}
            </p>
          </div>
        </div>
        {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          {data.running ? (
            <button className={quietClass} type="button" disabled={pending} onClick={() => void run(() => data.stop())}>
              Стоп
            </button>
          ) : null}
          {!data.running || !sameAsRunning ? (
            <button
              className={primaryClass}
              type="button"
              disabled={pending || !projectId}
              onClick={() => void run(() => data.start(projectId, description.trim()))}
            >
              {data.running ? "Перезапустить" : "Старт"}
            </button>
          ) : null}
          {!projectId && !data.running ? (
            <p className="self-center text-sm text-muted">Сначала создайте проект.</p>
          ) : null}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Записи за сегодня</h2>
          <button className={quietClass} type="button" onClick={() => setManual((value) => !value)}>
            {manual ? "Скрыть форму" : "Добавить вручную"}
          </button>
        </div>
        {manual ? (
          <ManualForm
            projectId={projectId || activeProjects[0]?.id || ""}
            projects={activeProjects}
            onCancel={() => setManual(false)}
            onCreate={async (input) => {
              await data.createEntry(input);
              setManual(false);
            }}
          />
        ) : null}
        {data.loading ? <p className="text-sm text-muted">Загружаем записи...</p> : null}
        {!data.loading && data.entries.length === 0 ? (
          <p className="rounded-[24px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            За сегодня ещё ничего не записано.
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {data.entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              now={now}
              projects={data.projects}
              onSave={(input) => data.updateEntry(entry.id, input)}
              onDelete={() => data.deleteEntry(entry.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ManualForm({
  projectId,
  projects,
  onCancel,
  onCreate,
}: {
  projectId: string;
  projects: { id: string; name: string }[];
  onCancel: () => void;
  onCreate: (input: { projectId: string; description: string; startedAt: string; endedAt: string }) => Promise<void>;
}) {
  const end = new Date();
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  const [form, setForm] = useState({
    projectId,
    description: "",
    startedAt: toLocalInput(start.toISOString()),
    endedAt: toLocalInput(end.toISOString()),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onCreate({
        projectId: form.projectId,
        description: form.description.trim(),
        startedAt: fromLocalInput(form.startedAt),
        endedAt: fromLocalInput(form.endedAt),
      });
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-[24px] border border-line bg-card p-4 md:grid-cols-2">
      <Field label="Проект">
        <select className={controlClass} value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Описание">
        <input className={controlClass} value={form.description} maxLength={500} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </Field>
      <Field label="Начало">
        <input className={controlClass} type="datetime-local" step={1} value={form.startedAt} onChange={(event) => setForm({ ...form, startedAt: event.target.value })} required />
      </Field>
      <Field label="Конец">
        <input className={controlClass} type="datetime-local" step={1} value={form.endedAt} onChange={(event) => setForm({ ...form, endedAt: event.target.value })} required />
      </Field>
      {error ? <div className="md:col-span-2"><Alert>{error}</Alert></div> : null}
      <div className="flex gap-3 md:col-span-2">
        <button className={primaryClass} type="submit" disabled={pending || !form.projectId}>Сохранить</button>
        <button className={quietClass} type="button" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}

function EntryCard({
  entry,
  now,
  projects,
  onSave,
  onDelete,
}: {
  entry: TimeEntry;
  now: number;
  projects: { id: string; name: string; color: string; archived: boolean }[];
  onSave: (input: { projectId: string; description: string; startedAt: string; endedAt: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: entry.projectId,
    description: entry.description,
    startedAt: toLocalInput(entry.startedAt),
    endedAt: entry.endedAt ? toLocalInput(entry.endedAt) : "",
  });

  useEffect(() => {
    if (editing) return;
    setForm({
      projectId: entry.projectId,
      description: entry.description,
      startedAt: toLocalInput(entry.startedAt),
      endedAt: entry.endedAt ? toLocalInput(entry.endedAt) : "",
    });
  }, [editing, entry]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSave({
        projectId: form.projectId,
        description: form.description.trim(),
        startedAt: toLocalInput(entry.startedAt) === form.startedAt ? entry.startedAt : fromLocalInput(form.startedAt),
        endedAt:
          entry.endedAt && form.endedAt && toLocalInput(entry.endedAt) === form.endedAt
            ? entry.endedAt
            : form.endedAt
              ? fromLocalInput(form.endedAt)
              : null,
      });
      setEditing(false);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await onDelete();
    } catch (reason) {
      setError(messageOf(reason));
      setPending(false);
    }
  }

  if (editing) {
    const choices = projects.filter((project) => !project.archived || project.id === entry.projectId);
    return (
      <form onSubmit={save} className="grid gap-3 rounded-[24px] border border-line bg-card p-4 md:grid-cols-2">
        <Field label="Проект">
          <select className={controlClass} value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
            {choices.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Описание">
          <input className={controlClass} value={form.description} maxLength={500} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </Field>
        <Field label="Начало">
          <input className={controlClass} type="datetime-local" step={1} value={form.startedAt} onChange={(event) => setForm({ ...form, startedAt: event.target.value })} required />
        </Field>
        <Field label="Конец">
          <input className={controlClass} type="datetime-local" step={1} value={form.endedAt} onChange={(event) => setForm({ ...form, endedAt: event.target.value })} />
        </Field>
        {error ? <div className="md:col-span-2"><Alert>{error}</Alert></div> : null}
        <div className="flex gap-3 md:col-span-2">
          <button className={primaryClass} type="submit" disabled={pending}>Сохранить</button>
          <button className={quietClass} type="button" onClick={() => setEditing(false)}>Отмена</button>
        </div>
      </form>
    );
  }

  return (
    <article className="flex flex-col gap-3 rounded-[24px] border border-line bg-card px-4 py-4 sm:flex-row sm:items-center">
      <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: entry.projectColor }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{entry.projectName}</h3>
          {entry.endedAt === null ? (
            <span className="rounded-full bg-[#f8e7df] px-2 py-0.5 text-xs text-accent-deep">идёт</span>
          ) : null}
        </div>
        <p className="truncate text-sm text-muted">{entry.description || "Без описания"}</p>
        <p className="mt-1 text-sm">
          {formatClock(entry.startedAt)}
          {" – "}
          {entry.endedAt ? formatClock(entry.endedAt) : "сейчас"}
        </p>
        {error ? <div className="mt-2"><Alert>{error}</Alert></div> : null}
      </div>
      <div className="font-mono text-lg tabular-nums">{elapsedLabel(entry.startedAt, entry.endedAt, now)}</div>
      <div className="flex gap-2">
        <button className={quietClass} type="button" onClick={() => setEditing(true)}>Править</button>
        <button className={dangerClass} type="button" disabled={pending} onClick={() => void remove()}>Удалить</button>
      </div>
    </article>
  );
}
