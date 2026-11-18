import assert from "node:assert/strict";
import test from "node:test";
import { buildReport } from "../../shared/src/report.ts";
import type { TimeEntry } from "../../shared/src/types.ts";

function entry(partial: Partial<TimeEntry> & Pick<TimeEntry, "id" | "startedAt" | "endedAt">): TimeEntry {
  return {
    projectId: "alpha",
    projectName: "Альфа",
    projectColor: "#1d4e89",
    description: "",
    createdAt: partial.startedAt,
    updatedAt: partial.startedAt,
    ...partial,
  };
}

test("report sums projects, fills empty days and counts an open timer until now", () => {
  const now = new Date("2026-03-18T22:00:00.000Z");
  const report = buildReport(
    [
      entry({
        id: "1",
        startedAt: "2026-03-17T21:30:00.000Z",
        endedAt: "2026-03-17T22:00:00.000Z",
      }),
      entry({
        id: "2",
        projectId: "beta",
        projectName: "Бета",
        projectColor: "#b5452e",
        startedAt: "2026-03-18T21:00:00.000Z",
        endedAt: null,
      }),
    ],
    "2026-03-18",
    "2026-03-19",
    -180,
    now,
  );

  assert.equal(report.totalSeconds, 1800 + 3600);
  assert.deepEqual(
    report.byDay.map((slice) => [slice.day, slice.seconds]),
    [
      ["2026-03-18", 1800],
      ["2026-03-19", 3600],
    ],
  );
  assert.equal(report.byProject[0]?.projectName, "Бета");
  assert.equal(report.byProject[1]?.seconds, 1800);
});
