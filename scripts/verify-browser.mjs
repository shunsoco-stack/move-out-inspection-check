import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const library = process.env.PLAYWRIGHT_CORE_PATH;

if (!library)
  throw new Error("PLAYWRIGHT_CORE_PATHに既存のplaywright-coreのパスを指定してください。");

const { chromium } = await import(pathToFileURL(library).href);
const project = process.cwd();
const profile = resolve(project, ".cache/browser-check");

assert.ok(profile.startsWith(project + sep));
await mkdir(profile, { recursive: true });

const context = await chromium.launchPersistentContext(profile, {
  executablePath:
    process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  viewport: { width: 1440, height: 1000 },
});

const page = context.pages()[0];
const errors = [];
const origin = process.env.TEST_ORIGIN || "http://localhost:3000";

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`${message.text()} ${message.location().url}`);
});
page.on("dialog", (dialog) => dialog.accept());

async function open(path) {
  const response = await page.goto(origin + path);
  assert.equal(response.status(), 200, path);
  await page.locator(".app-shell").waitFor();
}

async function noOverflow() {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "横スクロールなし",
  );
}

try {
  await open("/");
  assert.equal(await page.locator(".inspection-row").count(), 5);
  await noOverflow();
  await open("/inspections/komorebi/rooms/room-4");
  const card = page.locator(".check-card").first();
  await card.getByLabel("借主負担割合（%）").fill("35");
  await card.getByLabel("確認メモ").fill("ブラウザ検証：窓際の傷を確認。");
  await page.reload();
  await page.locator(".app-shell").waitFor();
  assert.equal(await card.getByLabel("借主負担割合（%）").inputValue(), "35");
  const imageData = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3200;
    canvas.height = 2400;
    canvas.getContext("2d").fillRect(0, 0, 3200, 2400);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await card.locator('input[type="file"]').setInputFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(imageData, "base64"),
  });
  await page.getByRole("status").filter({ hasText: "1枚の写真を保存しました" }).waitFor();
  assert.equal(await card.locator(".photo-card").count(), 3);
  const dimensions = await card
    .locator("img")
    .last()
    .evaluate((image) => [image.naturalWidth, image.naturalHeight]);
  assert.deepEqual(dimensions, [1600, 1200]);
  await open("/inspections/komorebi/estimate");
  await page.getByRole("button", { name: "下書きを保存" }).click();
  const csvEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV出力" }).click();
  const csv = await csvEvent;
  assert.ok(csv.suggestedFilename().startsWith("精算見積_こもれびテラス_203_"));
  await page.emulateMedia({ media: "print" });
  assert.equal(
    await page.locator(".print-cover").evaluate((element) => getComputedStyle(element).breakAfter),
    "page",
  );
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  assert.ok(pdf.length > 10000);
  assert.equal(
    (pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length,
    3,
    "表紙・明細・写真の3ページ",
  );
  await page.emulateMedia({ media: "screen" });
  await open("/backup");
  const backupEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "バックアップを書き出す（JSON）" }).click();
  const backupDownload = await backupEvent;
  const stream = await backupDownload.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const backupBuffer = Buffer.concat(chunks);
  assert.equal(JSON.parse(backupBuffer.toString()).photos.length, 25);
  await page
    .locator("#backup-import")
    .setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: backupBuffer });
  await page.getByRole("status").filter({ hasText: "写真を含めてデータを保存しました" }).waitFor();
  await page.locator("#backup-import").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await page.getByRole("status").filter({ hasText: "バージョンまたは保存データが不正" }).waitFor();
  await open("/");
  await page.getByRole("button", { name: "＋ 立会いを登録" }).click();
  await page.getByLabel("物件名（架空）").fill("検証用こはる荘");
  await page.getByLabel("号室", { exact: true }).fill("206");
  await page.getByLabel("借主名（架空）").fill("架空 花子");
  const yesterday = new Date(Date.now() + 9 * 3600000 - 86400000).toISOString().slice(0, 10);
  await page.getByLabel("立会い日", { exact: true }).fill(yesterday);
  await page.getByRole("button", { name: "立会いを登録する" }).click();
  await page.getByRole("heading", { name: "立会いの概要", exact: true }).waitFor();
  const newPath = new URL(page.url()).pathname;
  assert.ok(!newPath.includes("_shell"));
  await open(newPath);
  assert.ok((await page.locator("h1").innerText()).includes("検証用こはる荘"));
  const roomPaths = await page
    .locator(".room-card")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  for (const roomPath of roomPaths) {
    await open(roomPath);
    for (const button of await page.getByRole("button", { name: "✓ 問題なし", exact: true }).all())
      await button.click();
  }
  await open(newPath);
  await page.getByRole("button", { name: "立会いを実施済みにする" }).click();
  await open(`${newPath}/estimate`);
  await page.getByRole("button", { name: "下書きを保存" }).click();
  await page.getByRole("status").filter({ hasText: "見積の下書きを保存しました" }).waitFor();
  await open("/settings");
  await page.getByLabel("単価（税抜・円）", { exact: true }).first().fill("3456");
  await page.getByRole("button", { name: "設定を保存する" }).click();
  await page.reload();
  await page.locator(".app-shell").waitFor();
  assert.equal(
    await page.getByLabel("単価（税抜・円）", { exact: true }).first().inputValue(),
    "3456",
  );
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of [
    "/",
    newPath,
    "/inspections/komorebi/rooms/room-4",
    "/inspections/komorebi/estimate",
    "/settings",
    "/backup",
    "/about",
  ]) {
    await open(path);
    await noOverflow();
  }
  await page.getByRole("button", { name: "既定データに戻す", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "写真を含めてデータを保存しました" }).waitFor();
  await open("/");
  assert.equal(await page.locator(".inspection-row").count(), 5);
  await page.evaluate(() => localStorage.setItem("moc:v1", "broken"));
  await page.reload();
  await page.getByRole("status").filter({ hasText: "保存データが壊れていたため" }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.locator(".inspection-row").first().waitFor();
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 全画面・375px・新規ID再読込・写真縮小・CSV・印刷・JSON復元/拒否・破損復旧・オフライン / console errors 0",
  );
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}
