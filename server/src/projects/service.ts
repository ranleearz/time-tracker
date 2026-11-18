import type { Project } from "../../../shared/src/index.ts";
import type { Queryable } from "../db/pool.ts";
import { db } from "../db/pool.ts";
import { HttpError, pgCode } from "../http/errors.ts";

type ProjectRow = {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  created_at: Date;
};

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    archived: row.archived,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listProjects(userId: string, includeArchived: boolean): Promise<Project[]> {
  const result = await db.query<ProjectRow>(
    `SELECT id, name, color, archived, created_at
     FROM projects
     WHERE user_id = $1 AND ($2::boolean OR archived = false)
     ORDER BY archived ASC, lower(name) ASC`,
    [userId, includeArchived],
  );
  return result.rows.map(mapProject);
}

export async function createProject(
  userId: string,
  input: { name: string; color: string },
): Promise<Project> {
  try {
    const result = await db.query<ProjectRow>(
      `INSERT INTO projects (user_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING id, name, color, archived, created_at`,
      [userId, input.name, input.color],
    );
    return mapProject(result.rows[0]);
  } catch (error) {
    if (pgCode(error) === "23505") throw new HttpError(409, "Проект с таким именем уже есть");
    throw error;
  }
}

export async function updateProject(
  userId: string,
  id: string,
  input: { name?: string; color?: string; archived?: boolean },
): Promise<Project> {
  const current = await db.query<ProjectRow>(
    `SELECT id, name, color, archived, created_at FROM projects WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  const row = current.rows[0];
  if (!row) throw new HttpError(404, "Проект не найден");
  const next = {
    name: input.name ?? row.name,
    color: input.color ?? row.color,
    archived: input.archived ?? row.archived,
  };
  try {
    const result = await db.query<ProjectRow>(
      `UPDATE projects
       SET name = $3, color = $4, archived = $5
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, color, archived, created_at`,
      [id, userId, next.name, next.color, next.archived],
    );
    return mapProject(result.rows[0]);
  } catch (error) {
    if (pgCode(error) === "23505") throw new HttpError(409, "Проект с таким именем уже есть");
    throw error;
  }
}

export async function deleteProject(userId: string, id: string): Promise<void> {
  try {
    const result = await db.query(`DELETE FROM projects WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (!result.rowCount) throw new HttpError(404, "Проект не найден");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (pgCode(error) === "23503") {
      throw new HttpError(409, "У проекта есть записи. Архивируйте его");
    }
    throw error;
  }
}

export async function projectOwned(db: Queryable, userId: string, projectId: string) {
  const result = await db.query<{ archived: boolean }>(
    `SELECT archived FROM projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  return result.rows[0] ?? null;
}
