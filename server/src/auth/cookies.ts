import type { Response } from "express";
import { config } from "../config.ts";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
};

export function setAccessCookie(res: Response, access: string) {
  res.cookie("access_token", access, {
    ...base,
    path: "/",
    maxAge: config.accessTtlSec * 1000,
  });
}

export function setRefreshCookie(res: Response, refresh: string) {
  res.cookie("refresh_token", refresh, {
    ...base,
    path: "/api/auth",
    maxAge: config.refreshTtlSec * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", { ...base, path: "/" });
  res.clearCookie("refresh_token", { ...base, path: "/api/auth" });
}
