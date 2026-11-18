import { Router } from "express";
import { loginSchema, registerSchema } from "../../../shared/src/index.ts";
import { asyncHandler } from "../http/async.ts";
import { parseBody } from "../http/validate.ts";
import { clearAuthCookies, setAccessCookie, setRefreshCookie } from "./cookies.ts";
import { limitAuth, requireAuth, userIdOf } from "./middleware.ts";
import { currentUser, loginUser, logoutUser, refreshSession, registerUser } from "./service.ts";

export const authRouter = Router();

authRouter.post(
  "/register",
  limitAuth,
  asyncHandler(async (req, res) => {
    const input = parseBody(registerSchema, req.body);
    const session = await registerUser(input);
    setAccessCookie(res, session.access);
    setRefreshCookie(res, session.refresh);
    res.status(201).json({ user: session.user });
  }),
);

authRouter.post(
  "/login",
  limitAuth,
  asyncHandler(async (req, res) => {
    const input = parseBody(loginSchema, req.body);
    const session = await loginUser(input);
    setAccessCookie(res, session.access);
    setRefreshCookie(res, session.refresh);
    res.json({ user: session.user });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const access = await refreshSession(req.cookies?.refresh_token);
    setAccessCookie(res, access);
    res.status(204).end();
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await logoutUser(req.cookies?.refresh_token);
    clearAuthCookies(res);
    res.status(204).end();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await currentUser(userIdOf(req));
    res.json({ user });
  }),
);
