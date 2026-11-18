import { Router } from "express";
import {
  entryCreateSchema,
  entryUpdateSchema,
  idParamSchema,
  rangeQuerySchema,
  timerStartSchema,
} from "../../../shared/src/index.ts";
import { userIdOf } from "../auth/middleware.ts";
import { asyncHandler } from "../http/async.ts";
import { parseBody, parseQuery } from "../http/validate.ts";
import { broadcast } from "../ws/hub.ts";
import {
  createEntry,
  deleteEntry,
  getRunning,
  listEntries,
  startTimer,
  stopTimer,
  updateEntry,
} from "./service.ts";

export const entryRouter = Router();
export const timerRouter = Router();

entryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = parseQuery(rangeQuerySchema, req.query);
    const entries = await listEntries(userIdOf(req), query);
    res.json({ entries });
  }),
);

entryRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = parseBody(entryCreateSchema, req.body);
    const entry = await createEntry(userIdOf(req), input);
    broadcast(userIdOf(req), { type: "entry.upserted", entry });
    res.status(201).json({ entry });
  }),
);

entryRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const params = parseBody(idParamSchema, req.params);
    const input = parseBody(entryUpdateSchema, req.body);
    const entry = await updateEntry(userIdOf(req), params.id, input);
    broadcast(userIdOf(req), { type: "entry.upserted", entry });
    res.json({ entry });
  }),
);

entryRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const params = parseBody(idParamSchema, req.params);
    await deleteEntry(userIdOf(req), params.id);
    broadcast(userIdOf(req), { type: "entry.deleted", id: params.id });
    res.status(204).end();
  }),
);

timerRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const entry = await getRunning(userIdOf(req));
    res.json({ entry });
  }),
);

timerRouter.post(
  "/start",
  asyncHandler(async (req, res) => {
    const input = parseBody(timerStartSchema, req.body);
    const result = await startTimer(userIdOf(req), input);
    const userId = userIdOf(req);
    if (result.stopped) broadcast(userId, { type: "entry.upserted", entry: result.stopped });
    broadcast(userId, { type: "entry.upserted", entry: result.started });
    res.status(201).json(result);
  }),
);

timerRouter.post(
  "/stop",
  asyncHandler(async (req, res) => {
    const entry = await stopTimer(userIdOf(req));
    broadcast(userIdOf(req), { type: "entry.upserted", entry });
    res.json({ entry });
  }),
);
