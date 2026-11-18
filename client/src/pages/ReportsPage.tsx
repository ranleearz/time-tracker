import { useEffect, useState } from "react";
import { dayKey, formatDuration, type Report } from "@tracker/shared";
import { api, downloadReport } from "../api.ts";
import { Alert, controlClass, Field, messageOf, primaryClass, quietClass } from "../components/ui.tsx";
import { useData } from "../data/DataProvider.tsx";
import { formatClock, formatShortDay, monthStart, shiftDay, todayInput, tzOffsetMinutes } from "../format.ts";

export function ReportsPage() {
  const { projects } = useData();
  const today = todayInput();
  const [from, setFrom] = useState(shiftDay(today, -6));
  const [to, setTo] = useState(today);
  const [projectId, setProjectId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return;
    let cancelled = false;
    setPending(true);
    setError(null);
    const params = new URLSearchParams({
      from,
      to,
      tzOffsetMinutes: String(tzOffsetMinutes()),
    });
    if (projectId) params.set("projectId", projectId);
    api<{ report: Report }>(`/api/reports?${params}`)
      .then((result) => {
        if (!cancelled) setReport(result.report);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(messageOf(reason));
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, projectId]);

  const maxProject = Math.max(...(report?.byProject.map((item) => item.seconds) ?? [0]), 1);
  const maxDay = Math.max(...(report?.byDay.map((item) => item.seconds) ?? [0]), 1);
  const firstDay = report?.byDay[0];
  const lastDay = report?.byDay.at(-1);

  async function exportCsv() {
    setError(null);
    try {
      await downloadReport(from, to, projectId, tzOffsetMinutes());
    } catch (reason) {
      setError(messageOf(reason));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-muted">сводка</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Отчёты</h1>
        </div>
        <button className={primaryClass} type="button" onClick={() => void exportCsv()}>
          Скачать CSV
        </button>
      </header>
      <section className="grid gap-4 rounded-[28px] border border-line bg-card p-5 md:grid-cols-4">
        <Field label="С">
          <input className={controlClass} type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="По">
          <input className={controlClass} type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Field label="Проект">
          <select className={controlClass} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Все проекты</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end gap-2">
          <button className={quietClass} type="button" onClick={() => { setFrom(shiftDay(today, -6)); setTo(today); }}>
            7 дней
          </button>
          <button className={quietClass} type="button" onClick={() => { setFrom(monthStart(today)); setTo(today); }}>
            Месяц
          </button>
        </div>
      </section>
      {error ? <Alert>{error}</Alert> : null}
      <p className="text-sm text-muted">
        {pending ? "Считаем..." : "Открытый таймер посчитан до текущего момента. День берётся по началу записи."}
      </p>
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Всего" value={formatDuration(report?.totalSeconds ?? 0)} />
        <Stat label="Записей" value={String(report?.entries.length ?? 0)} />
        <Stat label="Проектов" value={String(report?.byProject.length ?? 0)} />
      </section>
      <section className="rounded-[28px] border border-line bg-card p-5">
        <h2 className="font-semibold">По дням</h2>
        <div className="mt-4 flex h-32 items-end gap-1">
          {(report?.byDay ?? []).map((day) => (
            <div key={day.day} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
              <div
                className="rounded-t bg-accent/80"
                style={{ height: `${Math.max(day.seconds > 0 ? 8 : 0, (day.seconds / maxDay) * 100)}%` }}
                title={`${formatShortDay(day.day)} ${formatDuration(day.seconds)}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>{firstDay ? formatShortDay(firstDay.day) : ""}</span>
          <span>{lastDay ? formatShortDay(lastDay.day) : ""}</span>
        </div>
      </section>
      <section className="rounded-[28px] border border-line bg-card p-5">
        <h2 className="font-semibold">По проектам</h2>
        <div className="mt-4 flex flex-col gap-3">
          {(report?.byProject ?? []).length === 0 ? <p className="text-sm text-muted">За период пусто.</p> : null}
          {report?.byProject.map((item) => (
            <div key={item.projectId}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="truncate">{item.projectName}</span>
                <span className="font-mono tabular-nums">{formatDuration(item.seconds)}</span>
              </div>
              <div className="h-2 rounded-full bg-line">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${(item.seconds / maxProject) * 100}%`, background: item.projectColor }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="overflow-hidden rounded-[28px] border border-line bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#f7f1e6] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Дата</th>
              <th className="px-4 py-3 font-medium">Проект</th>
              <th className="px-4 py-3 font-medium">Описание</th>
              <th className="px-4 py-3 font-medium">Интервал</th>
              <th className="px-4 py-3 font-medium">Длительность</th>
            </tr>
          </thead>
          <tbody>
            {(report?.entries ?? []).map((entry) => (
              <tr key={entry.id} className="border-t border-line">
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatShortDay(dayKey(new Date(entry.startedAt), tzOffsetMinutes()))}
                </td>
                <td className="px-4 py-3">{entry.projectName}</td>
                <td className="max-w-56 truncate px-4 py-3">{entry.description || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatClock(entry.startedAt)} – {entry.endedAt ? formatClock(entry.endedAt) : "идёт"}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">
                  {formatDuration(
                    Math.max(
                      0,
                      Math.floor(
                        ((entry.endedAt ? new Date(entry.endedAt).getTime() : Date.now()) -
                          new Date(entry.startedAt).getTime()) /
                          1000,
                      ),
                    ),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-line bg-card px-4 py-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl tabular-nums">{value}</div>
    </div>
  );
}
