import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSeed } from "../src/lib/seed.ts";
import { validDatabase } from "../src/lib/validation.ts";
import { validateBackup, createBackup } from "../src/lib/backup.ts";
import { parseStorage } from "../src/lib/storage.ts";
import { csvCell, estimateCsv, estimateFilename } from "../src/lib/csv.ts";

const now = new Date("2026-11-18T12:00:00+09:00");

function backupFixture() {
  const { database, samples } = createSeed(now);
  return {
    version: 1,
    exportedAt: now.toISOString(),
    database,
    photos: samples.map((sample) => ({ ...sample, data: "data:image/jpeg;base64,YWJjZA==" })),
  };
}

test("既定データは検証を通る", () => assert.equal(validDatabase(createSeed(now).database), true));
test("5件と24枚を生成", () => {
  const seed = createSeed(now);
  assert.equal(seed.database.inspections.length, 5);
  assert.equal(seed.samples.length, 24);
});
test("実施済3件・下書き2件・予定2件", () => {
  const entries = createSeed(now).database.inspections;
  assert.equal(entries.filter((entry) => entry.status !== "予定").length, 3);
  assert.equal(entries.filter((entry) => entry.status === "見積下書き済み").length, 2);
  assert.equal(entries.filter((entry) => entry.status === "予定").length, 2);
});
test("具体的なメモを重複させない", () => {
  const notes = createSeed(now)
    .database.inspections.flatMap((entry) =>
      entry.rooms.flatMap((room) => room.items.map((item) => item.note)),
    )
    .filter(Boolean);
  assert.equal(notes.length, 12);
  assert.equal(new Set(notes).size, notes.length);
  assert.ok(notes.every((note) => note.length > 20 && !note.includes("さん：")));
});
test("物件ごとに異なる原因と状態", () => {
  const entries = createSeed(now).database.inspections.slice(0, 3);
  const summaries = entries.map((entry) =>
    JSON.stringify(
      entry.rooms.flatMap((room) => room.items.map((item) => [item.condition, item.cause])),
    ),
  );
  assert.equal(new Set(summaries).size, 3);
});
test("並び順は名字ランキング順ではない", () => {
  const names = createSeed(now).database.inspections.map((entry) => entry.tenant);
  assert.deepEqual(names, ["花村 紬", "榎本 航", "久世 千晴", "真壁 遼", "水瀬 梢"]);
});
test("立会い時刻・間隔は均等ではない", () => {
  const entries = createSeed(now).database.inspections;
  assert.equal(new Set(entries.map((entry) => entry.time)).size, 5);
  const sorted = entries.map((entry) => Date.parse(entry.date)).sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((date, index) => date - sorted[index]);
  assert.ok(new Set(gaps).size > 2);
});
test("シードの属性をindex循環で割り当てない", () => {
  const source = readFileSync("src/lib/seed.ts", "utf8");
  assert.doesNotMatch(source, /(?:index|idx|\bi)\s*%/);
});
test("日付を変えると相対でシードも移動", () => {
  const a = createSeed(now).database.inspections[0];
  const b = createSeed(new Date("2026-11-19T12:00:00+09:00")).database.inspections[0];
  assert.equal(Date.parse(b.date) - Date.parse(a.date), 86400000);
});
test("画像の構図と色は複数", () => {
  const samples = createSeed(now).samples;
  assert.ok(new Set(samples.map((sample) => sample.tone)).size >= 10);
  assert.equal(new Set(samples.map((sample) => sample.kind)).size, 4);
  assert.equal(new Set(samples.map((sample) => sample.takenAt)).size, 24);
});
test("正常バックアップを往復", () => {
  const backup = backupFixture();
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(backup))), backup);
});
test("書き出しは参照のある写真だけ", () => {
  const backup = backupFixture();
  const result = createBackup(
    backup.database,
    [...backup.photos, { ...backup.photos[0], id: "orphan" }],
    now,
  );
  assert.equal(result.photos.length, 24);
});

const invalidCases = [
  [
    "バージョン違い",
    (value) => {
      value.version = 2;
    },
  ],
  [
    "写真不足",
    (value) => {
      value.photos.pop();
    },
  ],
  [
    "写真重複",
    (value) => {
      value.photos.push(value.photos[0]);
    },
  ],
  [
    "写真の所属違い",
    (value) => {
      value.photos[0].roomId = "wrong";
    },
  ],
  [
    "SVGを拒否",
    (value) => {
      value.photos[0].data = "data:image/svg+xml;base64,PHN2Zz4=";
    },
  ],
  [
    "外部URLを拒否",
    (value) => {
      value.photos[0].data = "https://example.com/photo.jpg";
    },
  ],
  [
    "不正な撮影時刻",
    (value) => {
      value.photos[0].takenAt = "bad";
    },
  ],
  [
    "負の単価",
    (value) => {
      value.database.settings.templates[0].price = -1;
    },
  ],
  [
    "無限の敷金",
    (value) => {
      value.database.inspections[0].deposit = Infinity;
    },
  ],
  [
    "不正な日付",
    (value) => {
      value.database.inspections[0].moveOut = "2026-02-30";
    },
  ],
  [
    "逆転した入居期間",
    (value) => {
      value.database.inspections[0].moveIn = "2099-01-01";
    },
  ],
  [
    "重複ID",
    (value) => {
      value.database.inspections[1].id = value.database.inspections[0].id;
    },
  ],
  [
    "未知の状態",
    (value) => {
      value.database.inspections[0].rooms[0].items[0].condition = "unknown";
    },
  ],
  [
    "100%超の割合",
    (value) => {
      value.database.inspections[0].rooms[0].items[0].ratio = 1.01;
    },
  ],
  [
    "空のテンプレート",
    (value) => {
      value.database.settings.templates = [];
    },
  ],
  [
    "不正な間取り",
    (value) => {
      value.database.inspections[0].plan = "XX";
    },
  ],
];

for (const [label, mutate] of invalidCases)
  test(`バックアップ拒否: ${label}`, () => {
    const value = backupFixture();
    mutate(value);
    assert.throws(() => validateBackup(value));
  });
test("壊れたJSONは既定に戻す対象", () => assert.equal(parseStorage("{"), null));
test("nullも既定に戻す対象", () => assert.equal(parseStorage("null"), null));
test("正常保存データを読む", () =>
  assert.ok(parseStorage(JSON.stringify(createSeed(now).database))));
test("CSVはBOM付き", () =>
  assert.equal(estimateCsv(createSeed(now).database.inspections[0]).charCodeAt(0), 0xfeff));
test("CSVの引用符と改行を保護", () => assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"'));
test("CSV式の実行を抑止", () => assert.equal(csvCell("=1+1"), '"\'=1+1"'));
test("CSVファイル名は日本日付", () =>
  assert.equal(
    estimateFilename({ property: "こもれびテラス", unit: "203" }, now),
    "精算見積_こもれびテラス_203_2026-11-18.csv",
  ));
test("CSVファイル名の禁止文字を除去", () =>
  assert.equal(
    estimateFilename({ property: "a/b", unit: "2:3" }, now),
    "精算見積_a_b_2_3_2026-11-18.csv",
  ));
