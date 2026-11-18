import { Router } from "express";
import {
  idParamSchema,
  projectCreateSchema,
  projectListQuerySchema,
  projectUpdateSchema,
} from "../../../shared/src/index.ts";
import { asyncHandler } from "../http/async.ts";
import { parseBody, parseQuery } from "../http/validate.ts";
import { userIdOf } from "../auth/middleware.ts";
import { broadcast } from "../ws/hub.ts";
import { createProject, deleteProject, listProjects, updateProject } from "./service.ts";

export const projectRouter = Router();

projectRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = parseQuery(projectListQuerySchema, req.query);
    const projects = await listProjects(userIdOf(req), query.includeArchived === "true");
    res.json({ projects });
  }),
);

projectRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = parseBody(projectCreateSchema, req.body);
    const project = await createProject(userIdOf(req), input);
    broadcast(userIdOf(req), { type: "project.upserted", project });
    res.status(201).json({ project });
  }),
);

projectRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const params = parseBody(idParamSchema, req.params);
    const input = parseBody(projectUpdateSchema, req.body);
    const project = await updateProject(userIdOf(req), params.id, input);
    broadcast(userIdOf(req), { type: "project.upserted", project });
    res.json({ project });
  }),
);

projectRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const params = parseBody(idParamSchema, req.params);
    await deleteProject(userIdOf(req), params.id);
    broadcast(userIdOf(req), { type: "project.deleted", id: params.id });
    res.status(204).end();
  }),
);
