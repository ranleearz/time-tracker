import assert from "node:assert/strict";
import test from "node:test";
import { entriesToCsv, toCsv } from "../../shared/src/csv.ts";
import type { TimeEntry } from "../../shared/src/types.ts";

test("csv quotes commas, quotes and newlines and prefixes formulas", () => {
  const csv = toCsv([
    {
      date: "2026-03-18",
      project: "Сайт",
      description: 'выгрузка, "отчёт"\nвторая строка',
      start: "2026-03-18 10:00",
      end: "2026-03-18 11:00",
      duration: "01:00:00",
    },
    {
      date: "2026-03-18",
      project: "=SUM(A1)",
      description: "обычное",
      start: "2026-03-18 12:00",
      end: "",
      duration: "00:30:00",
    },
  ]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /"выгрузка, ""отчёт""\nвторая строка"/);
  assert.match(csv, /'=SUM\(A1\)/);
  assert.match(csv, /^\uFEFFДата,Проект,Описание,Старт,Стоп,Длительность\r\n/);
});

test("open entry is exported with an empty stop and duration until now", () => {
  const entry: TimeEntry = {
    id: "1",
    projectId: "p",
    projectName: "Архив",
    projectColor: "#1f6f5b",
    description: "черновик",
    startedAt: "2026-03-18T09:00:00.000Z",
    endedAt: null,
    createdAt: "2026-03-18T09:00:00.000Z",
    updatedAt: "2026-03-18T09:00:00.000Z",
  };
  const csv = entriesToCsv([entry], -180, new Date("2026-03-18T09:30:00.000Z"));
  assert.match(csv, /2026-03-18,Архив,черновик,2026-03-18 12:00,,00:30:00/);
});
