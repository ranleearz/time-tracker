import { Router } from "express";
import { rangeQuerySchema } from "../../../shared/src/index.ts";
import { userIdOf } from "../auth/middleware.ts";
import { asyncHandler } from "../http/async.ts";
import { parseQuery } from "../http/validate.ts";
import { reportCsv, reportFor } from "./service.ts";

export const reportRouter = Router();

reportRouter.get(
  "/export.csv",
  asyncHandler(async (req, res) => {
    const query = parseQuery(rangeQuerySchema, req.query);
    const csv = await reportCsv(userIdOf(req), query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="srez-${query.from}-${query.to}.csv"`);
    res.send(csv);
  }),
);

reportRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = parseQuery(rangeQuerySchema, req.query);
    const report = await reportFor(userIdOf(req), query);
    res.json({ report });
  }),
);
