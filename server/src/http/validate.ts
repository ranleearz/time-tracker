import type { Request } from "express";
import type { ZodTypeAny, output } from "zod";
import { HttpError } from "./errors.ts";

export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): output<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "Некорректные данные");
  }
  return result.data;
}

export function parseQuery<S extends ZodTypeAny>(schema: S, query: Request["query"]): output<S> {
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    flat[key] = Array.isArray(value) ? value[0] : value;
  }
  if (flat.projectId === "") delete flat.projectId;
  return parseBody(schema, flat);
}
