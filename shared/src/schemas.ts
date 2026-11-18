import { z } from "zod";
import { projectColors } from "./types.ts";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Укажите корректный email")
    .max(254)
    .transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1, "Введите имя").max(80, "Имя длиннее 80 символов"),
  password: z
    .string()
    .min(8, "Пароль должен быть не короче 8 символов")
    .max(72, "Пароль длиннее 72 символов"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Укажите корректный email")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Введите пароль").max(72),
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(80, "Название длиннее 80 символов"),
  color: z.enum(projectColors, { message: "Выберите цвет из палитры" }),
});

export const projectUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Введите название").max(80, "Название длиннее 80 символов").optional(),
    color: z.enum(projectColors, { message: "Выберите цвет из палитры" }).optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Нет полей для обновления" });

export const projectListQuerySchema = z.object({
  includeArchived: z.enum(["true", "false"]).optional(),
});

export const timerStartSchema = z.object({
  projectId: z.string().uuid("Некорректный проект"),
  description: z.string().trim().max(500, "Описание длиннее 500 символов").default(""),
});

export const entryCreateSchema = z.object({
  projectId: z.string().uuid("Некорректный проект"),
  description: z.string().trim().max(500, "Описание длиннее 500 символов").default(""),
  startedAt: z.string().datetime({ message: "Некорректное время начала" }),
  endedAt: z.string().datetime({ message: "Некорректное время окончания" }),
});

export const entryUpdateSchema = z
  .object({
    projectId: z.string().uuid("Некорректный проект").optional(),
    description: z.string().trim().max(500, "Описание длиннее 500 символов").optional(),
    startedAt: z.string().datetime({ message: "Некорректное время начала" }).optional(),
    endedAt: z.string().datetime({ message: "Некорректное время окончания" }).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Нет полей для обновления" });

export const idParamSchema = z.object({
  id: z.string().uuid("Некорректный идентификатор"),
});

export const rangeQuerySchema = z
  .object({
    from: z.string().regex(dayPattern, "Дата начала в формате ГГГГ-ММ-ДД"),
    to: z.string().regex(dayPattern, "Дата конца в формате ГГГГ-ММ-ДД"),
    projectId: z.string().uuid("Некорректный проект").optional(),
    tzOffsetMinutes: z.coerce.number().int().min(-840).max(840).default(0),
  })
  .refine((value) => value.from <= value.to, { message: "Дата начала позже даты конца" })
  .refine((value) => {
    const from = Date.parse(`${value.from}T00:00:00.000Z`);
    const to = Date.parse(`${value.to}T00:00:00.000Z`);
    return (to - from) / 86_400_000 <= 366;
  }, { message: "Период не длиннее года" });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type TimerStartInput = z.infer<typeof timerStartSchema>;
export type EntryCreateInput = z.infer<typeof entryCreateSchema>;
export type EntryUpdateInput = z.infer<typeof entryUpdateSchema>;
export type RangeQuery = z.infer<typeof rangeQuerySchema>;
