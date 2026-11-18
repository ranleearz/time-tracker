import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";
import { HttpError } from "../http/errors.ts";

export function signAccess(userId: string): string {
  return jwt.sign({ sub: userId, kind: "access" }, config.accessSecret, {
    expiresIn: config.accessTtlSec,
  });
}

export function verifyAccess(token: string): { sub: string } {
  try {
    const payload = jwt.verify(token, config.accessSecret);
    if (typeof payload === "string" || payload.sub === undefined || payload.kind !== "access") {
      throw new HttpError(401, "Сессия недействительна");
    }
    return { sub: String(payload.sub) };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Сессия истекла");
  }
}

export function createRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(`${config.refreshSecret}.${token}`).digest("hex");
}
