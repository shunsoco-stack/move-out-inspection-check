import test from "node:test";
import assert from "node:assert/strict";
import { remainingRatio, suggestBurden, tenantRatio } from "../src/lib/burden.ts";
import { burdenSummary, calculateEstimate, formatRatio, photoPages } from "../src/lib/estimate.ts";
import { estimateCsv } from "../src/lib/csv.ts";
import { resizedDimensions } from "../src/lib/photos.ts";
import { createSeed } from "../src/lib/seed.ts";
import { expandRooms, roomNames, defaultSettings, progress } from "../src/lib/rooms.ts";

function fixture() {
  const inspection = createSeed(new Date("2026-11-18T12:00:00+09:00")).database.inspections[0];
  inspection.rooms = expandRooms("1K", defaultSettings().templates);
  inspection.cleaningPrice = 0;
  inspection.moveIn = "2023-01-01";
  inspection.moveOut = "2026-01-01";
  Object.assign(inspection.rooms[0].items[0], {
    checked: true,
    condition: "傷",
    burden: "借主",
    price: 10001,
    quantity: 1,
  });
  return inspection;
}

for (const [ratio, expected] of [
  [0.750032, "75%"],
  [0, "0%"],
  [1, "100%"],
  [0.625, "62.5%"],
  [0.1234, "12.3%"],
  [0.1236, "12.4%"],
  [0.0001, "0%"],
  [0.9999, "100%"],
]) {
  test(`割合表示 ${ratio} → ${expected}`, () => assert.equal(formatRatio(ratio), expected));
  test(`CSVの割合表示 ${ratio} → ${expected}・計算は元の精度`, () => {
    const entry = fixture();
    entry.rooms[0].items[0].ratio = ratio;
    const before = calculateEstimate(entry);
    assert.equal(estimateCsv(entry).split("\r\n")[2].split(",")[4], `"${expected}"`);
    assert.equal(before.lines[0].ratio, ratio);
    assert.equal(before.lines[0].tenant, Math.floor(10001 * ratio + 1e-8));
    assert.deepEqual(calculateEstimate(entry), before);
  });
}

test("自動償却の根拠を表示", () => {
  assert.equal(
    calculateEstimate(fixture()).lines[0].ratioBasis,
    "耐用年数6年・経過3年0か月（入居期間）",
  );
});
for (const change of [
  { ratio: 0.5 },
  { depreciates: false },
  { burden: "貸主" },
  { burden: "保留" },
]) {
  test(`自動償却でない行に根拠を付けない ${JSON.stringify(change)}`, () => {
    const entry = fixture();
    Object.assign(entry.rooms[0].items[0], change);
    assert.equal(calculateEstimate(entry).lines[0].ratioBasis, undefined);
  });
}
test("負担内訳は分担した明細を双方に数える", () => {
  const summary = burdenSummary(calculateEstimate(fixture()));
  assert.deepEqual(summary, [
    { label: "貸主負担", amount: 5000, count: 1 },
    { label: "借主負担", amount: 5001, count: 1 },
    { label: "保留", amount: 0, count: 0 },
  ]);
});
test("負担内訳で保留と特約クリーニングを分ける", () => {
  const entry = fixture();
  entry.rooms[0].items[0].burden = "保留";
  entry.cleaningPrice = 30000;
  entry.cleaningClause = true;
  assert.deepEqual(burdenSummary(calculateEstimate(entry)), [
    { label: "貸主負担", amount: 0, count: 0 },
    { label: "借主負担", amount: 30000, count: 1 },
    { label: "保留", amount: 10001, count: 1 },
  ]);
});
test("未確認とゼロ円を負担内訳の件数に含めない", () => {
  const entry = fixture();
  entry.rooms[0].items[0].checked = false;
  assert.ok(
    burdenSummary(calculateEstimate(entry)).every(
      (group) => group.count === 0 && group.amount === 0,
    ),
  );
});

for (const [months, expected] of [
  [0, 1],
  [18, 0.750025],
  [36, 0.50005],
  [72, 0.0001],
  [84, 0.0001],
  [-12, 1],
]) {
  test(`残存1円を含む負担割合 ${months}か月`, () =>
    assert.ok(Math.abs(remainingRatio(months, 10000) - expected) < 1e-10));
}
test("工事費ゼロで除算しない", () => assert.equal(remainingRatio(72, 0), 0));
test("1円の工事費は1円", () => assert.equal(remainingRatio(72, 1), 1));
test("1円未満を超過負担にしない", () => assert.equal(remainingRatio(72, 0.5), 1));
test("通常損耗の提案", () => assert.equal(suggestBurden("通常損耗・経年劣化"), "貸主"));
test("過失の提案", () => assert.equal(suggestBurden("借主の故意・過失・善管注意義務違反"), "借主"));
test("原因不明は保留", () => assert.equal(suggestBurden("不明"), "保留"));
test("割合の上書きを優先", () => {
  const item = fixture().rooms[0].items[0];
  item.ratio = 0.25;
  assert.equal(tenantRatio(item, 72), 0.25);
});
test("貸主区分では上書きがあっても借主ゼロ", () => {
  const item = fixture().rooms[0].items[0];
  item.burden = "貸主";
  item.ratio = 1;
  assert.equal(tenantRatio(item, 0), 0);
});
test("非償却項目は経過年数で減らさない", () => {
  const item = fixture().rooms[0].items[0];
  item.depreciates = false;
  assert.equal(tenantRatio(item, 120), 1);
});
test("工事費の端数は切り捨て", () => {
  const entry = fixture();
  entry.rooms[0].items[0].quantity = 0.333;
  assert.equal(calculateEstimate(entry).lines[0].cost, 3330);
});
test("借主と貸主の合計は工事費", () => {
  const result = calculateEstimate(fixture()).lines[0];
  assert.equal(result.tenant + result.landlord, result.cost);
});
test("6年経過後の借主負担は1円", () => {
  const entry = fixture();
  entry.moveIn = "2020-01-01";
  assert.equal(calculateEstimate(entry).lines[0].tenant, 1);
});
test("6年超でも1円", () => {
  const entry = fixture();
  entry.moveIn = "2010-01-01";
  assert.equal(calculateEstimate(entry).lines[0].tenant, 1);
});
test("端数工事費でも6年後に1円を残す", () => {
  const entry = fixture();
  entry.moveIn = "2020-01-01";
  entry.rooms[0].items[0].quantity = 0.333;
  assert.equal(calculateEstimate(entry).lines[0].tenant, 1);
});
test("保留の金額を請求しない", () => {
  const entry = fixture();
  entry.rooms[0].items[0].burden = "保留";
  const result = calculateEstimate(entry);
  assert.equal(result.pending, 10001);
  assert.equal(result.tenantTotal, 0);
  assert.equal(result.landlordTotal, 0);
});
test("未確認項目は見積に入れない", () => {
  const entry = fixture();
  entry.rooms[0].items[0].checked = false;
  assert.equal(calculateEstimate(entry).lines.length, 0);
});
test("問題なしは見積に入れない", () => {
  const entry = fixture();
  entry.rooms[0].items[0].condition = "問題なし";
  assert.equal(calculateEstimate(entry).lines.length, 0);
});
test("特約なしクリーニングは貸主", () => {
  const entry = fixture();
  entry.cleaningClause = false;
  entry.cleaningPrice = 30000;
  assert.equal(calculateEstimate(entry).lines.at(-1).landlord, 30000);
});
test("特約ありクリーニングは借主", () => {
  const entry = fixture();
  entry.cleaningClause = true;
  entry.cleaningPrice = 30000;
  assert.equal(calculateEstimate(entry).lines.at(-1).tenant, 30000);
});
test("税は小計に対して切り捨て", () => {
  const entry = fixture();
  entry.rooms[0].items[0].ratio = 1;
  entry.rooms[0].items[0].price = 1019;
  assert.equal(calculateEstimate(entry).tenantTax, 101);
});
test("敷金の返金", () => {
  const entry = fixture();
  entry.deposit = 10000;
  assert.ok(calculateEstimate(entry).balance > 0);
});
test("敷金不足は追加請求", () => {
  const entry = fixture();
  entry.deposit = 0;
  assert.ok(calculateEstimate(entry).balance < 0);
});
test("敷金と同額なら差額0", () => {
  const entry = fixture();
  entry.deposit = calculateEstimate(entry).tenantTotal;
  assert.equal(calculateEstimate(entry).balance, 0);
});

for (const [width, height, expected] of [
  [3200, 2400, { width: 1600, height: 1200 }],
  [2400, 3200, { width: 1200, height: 1600 }],
  [800, 560, { width: 800, height: 560 }],
  [1600, 1600, { width: 1600, height: 1600 }],
  [99999, 1, { width: 1600, height: 1 }],
])
  test(`写真縮小 ${width}x${height}`, () =>
    assert.deepEqual(resizedDimensions(width, height), expected));
test("幅0の画像を拒否", () => assert.throws(() => resizedDimensions(0, 100)));
test("非有限の画像を拒否", () => assert.throws(() => resizedDimensions(Infinity, 100)));
for (const count of [0, 1, 12, 13, 24, 25])
  test(`印刷写真${count}枚を12枚ずつ改ページ`, () => {
    const photos = Array.from({ length: count }, (_, index) => index);
    const pages = photoPages(photos);
    assert.equal(pages.length, Math.ceil(count / 12));
    assert.deepEqual(pages.flat(), photos);
    assert.ok(pages.every((page) => page.length <= 12));
  });
for (const plan of ["1K", "1DK", "1LDK", "2DK", "2LDK", "3LDK"])
  test(`${plan}のテンプレート展開`, () => {
    const rooms = expandRooms(plan, defaultSettings().templates);
    assert.equal(rooms.filter((room) => room.name.startsWith("洋室")).length, Number(plan[0]));
    assert.equal(
      rooms.some((room) => room.name === "リビング"),
      plan.includes("L"),
    );
    assert.ok(rooms.every((room) => room.items.length === 5));
    assert.equal(new Set(rooms.map((room) => room.id)).size, rooms.length);
  });
test("未知の間取りを拒否", () => assert.throws(() => roomNames("5X")));
test("テンプレートを変えても他の部屋に影響しない", () => {
  const rooms = expandRooms("1K", defaultSettings().templates);
  rooms[0].items[0].price = 1;
  assert.equal(rooms[1].items[0].price, 3200);
});
test("空の進捗は0", () => assert.deepEqual(progress([]), { checked: 0, total: 0, percent: 0 }));
