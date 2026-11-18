import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.ts";
import { authRouter } from "./auth/routes.ts";
import { requireAuth } from "./auth/middleware.ts";
import { entryRouter, timerRouter } from "./entries/routes.ts";
import { HttpError } from "./http/errors.ts";
import { projectRouter } from "./projects/routes.ts";
import { reportRouter } from "./reports/routes.ts";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use("/api/projects", requireAuth, projectRouter);
  app.use("/api/entries", requireAuth, entryRouter);
  app.use("/api/timer", requireAuth, timerRouter);
  app.use("/api/reports", requireAuth, reportRouter);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Маршрут не найден" });
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  });
  return app;
}
