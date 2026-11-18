import test from "node:test";
import assert from "node:assert/strict";
import {
  japanDate,
  japanTime,
  validDate,
  shiftDays,
  shiftMonths,
  tenancyMonths,
  daysSince,
  tenureLabel,
} from "../src/lib/dates.ts";
import { createSeed } from "../src/lib/seed.ts";

const moments = [
  "2026-11-18T00:05:00+09:00",
  "2026-11-18T08:10:00+09:00",
  "2026-11-18T12:20:00+09:00",
  "2026-11-18T23:59:00+09:00",
  "2026-12-01T00:01:00+09:00",
  "2026-04-30T23:58:00+09:00",
  "2028-02-28T11:00:00+09:00",
  "2028-02-29T00:10:00+09:00",
  "2028-03-01T00:01:00+09:00",
  "2027-01-01T00:00:00+09:00",
];

for (const moment of moments) {
  test(`完了・写真が過去で予定だけ未来: ${moment}`, () => {
    const now = new Date(moment);
    const { database, samples } = createSeed(now);
    for (const inspection of database.inspections) {
      const start = Date.parse(`${inspection.date}T${inspection.time}:00+09:00`);
      assert.ok(inspection.time >= "09:30" && inspection.time <= "17:30");
      if (inspection.status === "予定") {
        assert.ok(start > now.getTime());
        assert.equal(inspection.completedAt, null);
      } else {
        assert.ok(start < now.getTime());
        assert.ok(Date.parse(inspection.completedAt) < now.getTime());
        assert.ok(inspection.date < japanDate(now));
      }
    }
    for (const photo of samples) {
      assert.ok(Date.parse(photo.takenAt) < now.getTime());
      const inspection = database.inspections.find((entry) => entry.id === photo.inspectionId);
      assert.ok(Date.parse(photo.takenAt) <= Date.parse(inspection.completedAt));
    }
  });
}

for (const [start, end, expected] of [
  ["2020-01-31", "2020-02-29", 1],
  ["2021-01-31", "2021-02-28", 1],
  ["2020-02-29", "2021-02-28", 12],
  ["2020-02-29", "2021-02-27", 11],
  ["2023-03-15", "2026-03-14", 35],
  ["2023-03-15", "2026-03-15", 36],
  ["2020-11-18", "2026-11-18", 72],
  ["2019-11-18", "2026-11-18", 84],
  ["2026-11-18", "2026-11-18", 0],
  ["2026-11-18", "2026-11-17", 0],
])
  test(`入居月数 ${start} → ${end}`, () => assert.equal(tenancyMonths(start, end), expected));

test("日本時間で日付を跨ぐ", () =>
  assert.equal(japanDate(new Date("2026-11-17T15:01:00Z")), "2026-11-18"));
test("日本時間の時刻", () => assert.equal(japanTime(new Date("2026-11-17T15:01:00Z")), "00:01"));
test("不正な2月30日を拒否", () => assert.equal(validDate("2028-02-30"), false));
test("非うるう年の29日を拒否", () => assert.equal(validDate("2027-02-29"), false));
test("うるう日の受理", () => assert.equal(validDate("2028-02-29"), true));
test("日付形式の拒否", () => assert.equal(validDate("2026/11/18"), false));
test("月末の月加算を丸める", () => assert.equal(shiftMonths("2026-01-31", 1), "2026-02-28"));
test("年を跨ぐ月減算", () => assert.equal(shiftMonths("2026-01-31", -1), "2025-12-31"));
test("日加算は月末を跨ぐ", () => assert.equal(shiftDays("2028-02-29", 1), "2028-03-01"));
test("0時台も経過日数は日本日付", () =>
  assert.equal(daysSince("2026-11-17", new Date("2026-11-18T00:01:00+09:00")), 1));
test("未来の退去は負の日数", () =>
  assert.equal(daysSince("2026-11-20", new Date("2026-11-18T12:00:00+09:00")), -2));
test("18か月の表示", () => assert.equal(tenureLabel(18), "1年6か月"));
