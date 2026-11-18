import assert from "node:assert/strict";
import test from "node:test";
import {
  assertBounds,
  durationSeconds,
  findOverlap,
  hasOpenConflict,
  localDayStartUtc,
} from "../../shared/src/time.ts";

const now = new Date("2026-03-18T12:00:00.000Z");

test("duration of a closed interval is whole seconds", () => {
  const started = new Date("2026-03-18T10:00:00.000Z");
  const ended = new Date("2026-03-18T10:01:30.500Z");
  assert.equal(durationSeconds(started, ended, now), 90);
});

test("an open interval is measured until now", () => {
  const started = new Date("2026-03-18T11:00:00.000Z");
  assert.equal(durationSeconds(started, null, now), 3600);
});

test("intervals that only touch do not overlap", () => {
  const overlap = findOverlap(
    {
      id: "a",
      startedAt: new Date("2026-03-18T08:00:00.000Z"),
      endedAt: new Date("2026-03-18T09:00:00.000Z"),
    },
    [
      {
        id: "b",
        startedAt: new Date("2026-03-18T09:00:00.000Z"),
        endedAt: new Date("2026-03-18T10:00:00.000Z"),
      },
    ],
    now,
  );
  assert.equal(overlap, null);
});

test("a partial overlap is rejected", () => {
  const overlap = findOverlap(
    {
      id: "new",
      startedAt: new Date("2026-03-18T09:30:00.000Z"),
      endedAt: new Date("2026-03-18T10:30:00.000Z"),
    },
    [
      {
        id: "old",
        startedAt: new Date("2026-03-18T09:00:00.000Z"),
        endedAt: new Date("2026-03-18T10:00:00.000Z"),
      },
    ],
    now,
  );
  assert.equal(overlap?.id, "old");
});

test("the same interval is not treated as its own overlap", () => {
  const interval = {
    id: "same",
    startedAt: new Date("2026-03-18T09:00:00.000Z"),
    endedAt: new Date("2026-03-18T10:00:00.000Z"),
  };
  assert.equal(findOverlap(interval, [interval], now), null);
});

test("an open timer overlaps a manual interval inside it", () => {
  const overlap = findOverlap(
    {
      id: "manual",
      startedAt: new Date("2026-03-18T11:15:00.000Z"),
      endedAt: new Date("2026-03-18T11:45:00.000Z"),
    },
    [
      {
        id: "running",
        startedAt: new Date("2026-03-18T11:00:00.000Z"),
        endedAt: null,
      },
    ],
    now,
  );
  assert.equal(overlap?.id, "running");
});

test("a second open timer conflicts even when it starts later", () => {
  const candidate = {
    id: "next",
    startedAt: new Date("2026-03-18T18:00:00.000Z"),
    endedAt: null,
  };
  const existing = [
    {
      id: "current",
      startedAt: new Date("2026-03-18T11:00:00.000Z"),
      endedAt: null,
    },
  ];
  assert.equal(hasOpenConflict(candidate, existing), true);
  assert.equal(hasOpenConflict({ ...candidate, id: "current" }, existing), false);
  assert.equal(hasOpenConflict({ ...candidate, endedAt: now }, existing), false);
});

test("bounds reject a reversed interval and a future end", () => {
  assert.equal(
    assertBounds(new Date("2026-03-18T10:00:00.000Z"), new Date("2026-03-18T09:00:00.000Z"), now),
    "Окончание должно быть позже начала",
  );
  assert.equal(
    assertBounds(new Date("2026-03-18T12:00:00.000Z"), new Date("2026-03-18T13:00:00.000Z"), now),
    "Окончание не может быть в будущем",
  );
  assert.equal(
    assertBounds(new Date("2026-03-18T10:00:00.000Z"), new Date("2026-03-18T11:00:00.000Z"), now),
    null,
  );
});

test("local midnight for UTC+3 is three hours earlier in UTC", () => {
  const start = localDayStartUtc("2026-03-19", -180);
  assert.equal(start.toISOString(), "2026-03-18T21:00:00.000Z");
});
