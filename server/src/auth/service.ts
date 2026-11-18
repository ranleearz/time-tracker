import bcrypt from "bcrypt";
import type { UserPublic } from "../../../shared/src/index.ts";
import { config } from "../config.ts";
import { db } from "../db/pool.ts";
import { HttpError } from "../http/errors.ts";
import { createRefreshToken, hashRefreshToken, signAccess } from "./tokens.ts";

const dummyHash = bcrypt.hashSync("tracker-dummy-password", 12);

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
};

function toPublic(row: Pick<UserRow, "id" | "email" | "name">): UserPublic {
  return { id: row.id, email: row.email, name: row.name };
}

async function issueSession(userId: string) {
  const refresh = createRefreshToken();
  const expiresAt = new Date(Date.now() + config.refreshTtlSec * 1000);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashRefreshToken(refresh), expiresAt],
  );
  return { access: signAccess(userId), refresh };
}

export async function registerUser(input: { email: string; name: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const inserted = await db.query<UserRow>(
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
       RETURNING id, email, name, password_hash`,
      [input.email, input.name, passwordHash],
    );
    const user = inserted.rows[0];
    const session = await issueSession(user.id);
    return { user: toPublic(user), ...session };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "23505") {
      throw new HttpError(409, "Пользователь с таким email уже есть");
    }
    throw error;
  }
}

export async function loginUser(input: { email: string; password: string }) {
  const found = await db.query<UserRow>(
    `SELECT id, email, name, password_hash FROM users WHERE email = $1`,
    [input.email],
  );
  const user = found.rows[0];
  const match = await bcrypt.compare(input.password, user?.password_hash ?? dummyHash);
  if (!user || !match) throw new HttpError(401, "Неверный email или пароль");
  await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < now()`, [user.id]);
  const session = await issueSession(user.id);
  return { user: toPublic(user), ...session };
}

export async function refreshSession(refreshToken: string | undefined) {
  if (!refreshToken) throw new HttpError(401, "Сессия истекла");
  const tokenHash = hashRefreshToken(refreshToken);
  const found = await db.query<{ user_id: string; expires_at: Date }>(
    `SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  const row = found.rows[0];
  if (!row || row.expires_at.getTime() <= Date.now()) {
    if (row) await db.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash]);
    throw new HttpError(401, "Сессия истекла");
  }
  return signAccess(row.user_id);
}

export async function logoutUser(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await db.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [hashRefreshToken(refreshToken)]);
}

export async function currentUser(userId: string): Promise<UserPublic> {
  const found = await db.query<UserRow>(
    `SELECT id, email, name, password_hash FROM users WHERE id = $1`,
    [userId],
  );
  const user = found.rows[0];
  if (!user) throw new HttpError(401, "Сессия недействительна");
  return toPublic(user);
}
