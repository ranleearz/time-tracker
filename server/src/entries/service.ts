import { randomUUID } from "node:crypto";
import type { Interval, TimeEntry } from "../../../shared/src/index.ts";
import {
  addDays,
  assertBounds,
  findOverlap,
  hasOpenConflict,
  localDayStartUtc,
} from "../../../shared/src/index.ts";
import type { Queryable } from "../db/pool.ts";
import { db } from "../db/pool.ts";
import { withTransaction } from "../db/transaction.ts";
import { HttpError, pgCode } from "../http/errors.ts";
import { projectOwned } from "../projects/service.ts";

const entrySql = `
  SELECT e.id,
         e.project_id,
         p.name AS project_name,
         p.color AS project_color,
         e.description,
         e.started_at,
         e.ended_at,
         e.created_at,
         e.updated_at
  FROM time_entries e
  JOIN projects p ON p.id = e.project_id
`;

type EntryRow = {
  id: string;
  project_id: string;
  project_name: string;
  project_color: string;
  description: string;
  started_at: Date;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export function mapEntry(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    projectColor: row.project_color,
    description: row.description,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at ? row.ended_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function lockUser(db: Queryable, userId: string) {
  await db.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [userId]);
}

async function loadIntervals(db: Queryable, userId: string): Promise<Interval[]> {
  const result = await db.query<{ id: string; started_at: Date; ended_at: Date | null }>(
    `SELECT id, started_at, ended_at FROM time_entries WHERE user_id = $1`,
    [userId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }));
}

async function assertInterval(db: Queryable, userId: string, candidate: Interval, now: Date) {
  const problem = assertBounds(candidate.startedAt, candidate.endedAt, now);
  if (problem) throw new HttpError(400, problem);
  const existing = await loadIntervals(db, userId);
  if (hasOpenConflict(candidate, existing)) throw new HttpError(409, "Уже есть запущенный таймер");
  if (findOverlap(candidate, existing, now)) {
    throw new HttpError(409, "Интервал пересекается с существующей записью");
  }
}

export async function getEntry(db: Queryable, userId: string, id: string): Promise<TimeEntry | null> {
  const result = await db.query<EntryRow>(`${entrySql} WHERE e.user_id = $1 AND e.id = $2`, [userId, id]);
  const row = result.rows[0];
  return row ? mapEntry(row) : null;
}

export async function getRunning(userId: string): Promise<TimeEntry | null> {
  const result = await db.query<{ id: string }>(
    `SELECT id FROM time_entries WHERE user_id = $1 AND ended_at IS NULL`,
    [userId],
  );
  const id = result.rows[0]?.id;
  if (!id) return null;
  return getEntry(db, userId, id);
}

export async function listEntries(
  userId: string,
  query: { from: string; to: string; projectId?: string; tzOffsetMinutes: number },
): Promise<TimeEntry[]> {
  const from = localDayStartUtc(query.from, query.tzOffsetMinutes);
  const to = localDayStartUtc(addDays(query.to, 1), query.tzOffsetMinutes);
  const result = await db.query<EntryRow>(
    `${entrySql}
     WHERE e.user_id = $1
       AND e.started_at >= $2
       AND e.started_at < $3
       AND ($4::uuid IS NULL OR e.project_id = $4)
     ORDER BY e.started_at DESC`,
    [userId, from, to, query.projectId ?? null],
  );
  return result.rows.map(mapEntry);
}

async function requireActiveProject(db: Queryable, userId: string, projectId: string, allowArchived: boolean) {
  const project = await projectOwned(db, userId, projectId);
  if (!project) throw new HttpError(404, "Проект не найден");
  if (project.archived && !allowArchived) throw new HttpError(400, "Проект в архиве");
}

export async function createEntry(
  userId: string,
  input: { projectId: string; description: string; startedAt: string; endedAt: string },
): Promise<TimeEntry> {
  try {
    return await withTransaction(async (db) => {
      await lockUser(db, userId);
      await requireActiveProject(db, userId, input.projectId, false);
      const candidate: Interval = {
        id: randomUUID(),
        startedAt: new Date(input.startedAt),
        endedAt: new Date(input.endedAt),
      };
      await assertInterval(db, userId, candidate, new Date());
      await db.query(
        `INSERT INTO time_entries (id, user_id, project_id, description, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [candidate.id, userId, input.projectId, input.description, candidate.startedAt, candidate.endedAt],
      );
      const entry = await getEntry(db, userId, candidate.id);
      if (!entry) throw new HttpError(500, "Не удалось сохранить запись");
      return entry;
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (pgCode(error) === "23514") throw new HttpError(400, "Окончание должно быть позже начала");
    throw error;
  }
}

export async function updateEntry(
  userId: string,
  id: string,
  input: { projectId?: string; description?: string; startedAt?: string; endedAt?: string | null },
): Promise<TimeEntry> {
  try {
    return await withTransaction(async (db) => {
      await lockUser(db, userId);
      const current = await getEntry(db, userId, id);
      if (!current) throw new HttpError(404, "Запись не найдена");
      const projectId = input.projectId ?? current.projectId;
      const projectChanged = projectId !== current.projectId;
      await requireActiveProject(db, userId, projectId, !projectChanged);
      const endedAt =
        input.endedAt === undefined ? current.endedAt : input.endedAt;
      const candidate: Interval = {
        id,
        startedAt: new Date(input.startedAt ?? current.startedAt),
        endedAt: endedAt ? new Date(endedAt) : null,
      };
      await assertInterval(db, userId, candidate, new Date());
      await db.query(
        `UPDATE time_entries
         SET project_id = $3,
             description = $4,
             started_at = $5,
             ended_at = $6,
             updated_at = now()
         WHERE id = $1 AND user_id = $2`,
        [id, userId, projectId, input.description ?? current.description, candidate.startedAt, candidate.endedAt],
      );
      const entry = await getEntry(db, userId, id);
      if (!entry) throw new HttpError(404, "Запись не найдена");
      return entry;
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (pgCode(error) === "23505") throw new HttpError(409, "Уже есть запущенный таймер");
    if (pgCode(error) === "23514") throw new HttpError(400, "Окончание должно быть позже начала");
    throw error;
  }
}

export async function deleteEntry(userId: string, id: string): Promise<void> {
  const result = await db.query(`DELETE FROM time_entries WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!result.rowCount) throw new HttpError(404, "Запись не найдена");
}

export async function startTimer(
  userId: string,
  input: { projectId: string; description: string },
): Promise<{ stopped: TimeEntry | null; started: TimeEntry }> {
  try {
    return await withTransaction(async (db) => {
      await lockUser(db, userId);
      await requireActiveProject(db, userId, input.projectId, false);
      const running = await db.query<{ id: string }>(
        `SELECT id FROM time_entries WHERE user_id = $1 AND ended_at IS NULL FOR UPDATE`,
        [userId],
      );
      let stopped: TimeEntry | null = null;
      let startedAt = new Date();
      const runningId = running.rows[0]?.id;
      if (runningId) {
        const closed = await db.query<{ ended_at: Date }>(
          `UPDATE time_entries
           SET ended_at = GREATEST(clock_timestamp(), started_at + interval '1 millisecond'),
               updated_at = clock_timestamp()
           WHERE id = $1
           RETURNING ended_at`,
          [runningId],
        );
        startedAt = closed.rows[0].ended_at;
        stopped = await getEntry(db, userId, runningId);
      }
      const id = randomUUID();
      const candidate: Interval = { id, startedAt, endedAt: null };
      await assertInterval(db, userId, candidate, new Date());
      await db.query(
        `INSERT INTO time_entries (id, user_id, project_id, description, started_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, userId, input.projectId, input.description, startedAt],
      );
      const started = await getEntry(db, userId, id);
      if (!started) throw new HttpError(500, "Не удалось запустить таймер");
      return { stopped, started };
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (pgCode(error) === "23505") throw new HttpError(409, "Уже есть запущенный таймер");
    throw error;
  }
}

export async function stopTimer(userId: string): Promise<TimeEntry> {
  return withTransaction(async (db) => {
    await lockUser(db, userId);
    const result = await db.query<{ id: string }>(
      `UPDATE time_entries
       SET ended_at = GREATEST(clock_timestamp(), started_at + interval '1 millisecond'),
           updated_at = clock_timestamp()
       WHERE user_id = $1 AND ended_at IS NULL
       RETURNING id`,
      [userId],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new HttpError(409, "Таймер не запущен");
    const entry = await getEntry(db, userId, id);
    if (!entry) throw new HttpError(404, "Запись не найдена");
    return entry;
  });
}
