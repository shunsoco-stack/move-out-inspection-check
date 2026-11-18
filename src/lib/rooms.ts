import type { Room, Settings, Template } from "./types.ts";

export const PLANS = ["1K", "1DK", "1LDK", "2DK", "2LDK", "3LDK"];

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "floor",
    part: "床",
    name: "床・クッションフロア",
    unit: "㎡",
    price: 3200,
    depreciates: true,
  },
  { id: "wall", part: "壁", name: "壁クロス", unit: "㎡", price: 1400, depreciates: true },
  { id: "ceiling", part: "天井", name: "天井クロス", unit: "㎡", price: 1500, depreciates: true },
  { id: "door", part: "建具", name: "扉・窓・網戸", unit: "枚", price: 6500, depreciates: false },
  {
    id: "equipment",
    part: "設備",
    name: "備付設備・水まわり",
    unit: "箇所",
    price: 8000,
    depreciates: false,
  },
];

export function defaultSettings(): Settings {
  return {
    templates: structuredClone(DEFAULT_TEMPLATES),
    cleaningClause: false,
    cleaningPrice: 30000,
  };
}

export function roomNames(plan: string): string[] {
  if (!PLANS.includes(plan)) throw new Error("未対応の間取りです。");
  const living = plan.includes("L") ? ["リビング"] : [];
  const bedrooms = Array.from({ length: Number(plan[0]) }, (_, index) => `洋室${index + 1}`);
  return ["玄関", "キッチン", ...living, ...bedrooms, "浴室", "トイレ", "洗面所", "バルコニー"];
}

export function expandRooms(plan: string, templates: Template[]): Room[] {
  return roomNames(plan).map((name, index) => ({
    id: `room-${index + 1}`,
    name,
    items: templates.map((template) => ({
      ...template,
      checked: false,
      condition: "問題なし",
      cause: "不明",
      burden: "保留",
      note: "",
      quantity: 1,
      ratio: null,
      photos: [],
    })),
  }));
}

export function progress(rooms: Room[]): { checked: number; total: number; percent: number } {
  const items = rooms.flatMap((room) => room.items);
  const checked = items.filter((item) => item.checked).length;
  return {
    checked,
    total: items.length,
    percent: items.length ? Math.round((checked / items.length) * 100) : 0,
  };
}
