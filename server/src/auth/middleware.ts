import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../http/errors.ts";
import { verifyAccess } from "./tokens.ts";

const hits = new Map<string, number[]>();

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token;
  if (typeof token !== "string" || token.length === 0) {
    next(new HttpError(401, "Требуется вход"));
    return;
  }
  try {
    req.userId = verifyAccess(token).sub;
    next();
  } catch (error) {
    next(error);
  }
}

export function userIdOf(req: Request): string {
  if (!req.userId) throw new HttpError(401, "Требуется вход");
  return req.userId;
}

export function limitAuth(req: Request, _res: Response, next: NextFunction) {
  const key = req.ip ?? "local";
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 20) {
    next(new HttpError(429, "Слишком много попыток, подождите минуту"));
    return;
  }
  recent.push(now);
  hits.set(key, recent);
  next();
}
