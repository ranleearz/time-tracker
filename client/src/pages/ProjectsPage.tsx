import { useState, type FormEvent } from "react";
import { projectColors, type Project, type ProjectColor } from "@tracker/shared";
import { Alert, controlClass, dangerClass, Field, messageOf, primaryClass, quietClass } from "../components/ui.tsx";
import { useData } from "../data/DataProvider.tsx";

export function ProjectsPage() {
  const { projects, createProject, updateProject, deleteProject } = useData();
  const [showArchived, setShowArchived] = useState(false);
  const visible = projects.filter((project) => showArchived || !project.archived);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm uppercase tracking-[0.16em] text-muted">справочник</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Проекты</h1>
      </header>
      <CreateProject onCreate={createProject} />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{showArchived ? "Все проекты" : "Активные"}</h2>
        <button className={quietClass} type="button" onClick={() => setShowArchived((value) => !value)}>
          {showArchived ? "Скрыть архив" : "Показать архив"}
        </button>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-[24px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Проектов пока нет.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onUpdate={(input) => updateProject(project.id, input)}
              onDelete={() => deleteProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateProject({ onCreate }: { onCreate: (input: { name: string; color: ProjectColor }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<ProjectColor>(projectColors[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), color });
      setName("");
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[28px] border border-line bg-card p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Название">
          <input className={controlClass} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <button className={primaryClass} type="submit" disabled={pending}>
          Добавить
        </button>
      </div>
      <ColorPicker color={color} onChange={setColor} />
      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}
    </form>
  );
}

function ColorPicker({ color, onChange }: { color: string; onChange: (color: ProjectColor) => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {projectColors.map((item) => (
        <button
          key={item}
          type="button"
          aria-label={item}
          className={`h-8 w-8 rounded-full border-2 ${color === item ? "border-ink" : "border-transparent"}`}
          style={{ background: item }}
          onClick={() => onChange(item)}
        />
      ))}
    </div>
  );
}

function ProjectCard({
  project,
  onUpdate,
  onDelete,
}: {
  project: Project;
  onUpdate: (input: { name?: string; color?: ProjectColor; archived?: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(project.name);
  const [color, setColor] = useState<ProjectColor>(asColor(project.color));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await action();
      setEditing(false);
      setConfirming(false);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="rounded-[24px] border border-line bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ background: project.color }} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input className={controlClass} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
          ) : (
            <h3 className="truncate text-lg font-semibold">{project.name}</h3>
          )}
          <p className="mt-1 text-sm text-muted">{project.archived ? "В архиве" : "Активный"}</p>
        </div>
      </div>
      {editing ? <ColorPicker color={color} onChange={setColor} /> : null}
      {error ? <div className="mt-3"><Alert>{error}</Alert></div> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {editing ? (
          <button
            className={primaryClass}
            type="button"
            disabled={pending}
            onClick={() => void run(() => onUpdate({ name: name.trim(), color }))}
          >
            Сохранить
          </button>
        ) : (
          <button
            className={quietClass}
            type="button"
            onClick={() => {
              setName(project.name);
              setColor(asColor(project.color));
              setEditing(true);
            }}
          >
            Изменить
          </button>
        )}
        <button
          className={quietClass}
          type="button"
          disabled={pending}
          onClick={() => void run(() => onUpdate({ archived: !project.archived }))}
        >
          {project.archived ? "Вернуть" : "В архив"}
        </button>
        {confirming ? (
          <button className={dangerClass} type="button" disabled={pending} onClick={() => void run(onDelete)}>
            Подтвердить удаление
          </button>
        ) : (
          <button className={dangerClass} type="button" onClick={() => setConfirming(true)}>
            Удалить
          </button>
        )}
      </div>
    </article>
  );
}

function asColor(value: string): ProjectColor {
  return projectColors.find((color) => color === value) ?? projectColors[0];
}
