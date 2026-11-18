import { defaultSettings, expandRooms } from "./rooms.ts";
import { japanDate, localTimestamp, shiftDays, shiftMonths } from "./dates.ts";
import { suggestBurden } from "./burden.ts";
import type { Cause, Condition, Database, Inspection } from "./types.ts";

export type SampleSpec = {
  id: string;
  inspectionId: string;
  roomId: string;
  itemId: string;
  label: string;
  takenAt: string;
  kind: "floor" | "wall" | "mold" | "screen";
  tone: string;
  detail: number;
};

const RECORDS = [
  {
    id: "komorebi",
    property: "こもれびテラス",
    unit: "203",
    plan: "1LDK",
    tenant: "花村 紬",
    attendant: "三枝 直人",
    months: 18,
    days: -2,
    time: "10:15",
    deposit: 85000,
    status: "見積下書き済み",
    cleaningClause: true,
  },
  {
    id: "nagi",
    property: "凪の庭レジデンス",
    unit: "402",
    plan: "2DK",
    tenant: "榎本 航",
    attendant: "小野寺 葵",
    months: 48,
    days: -6,
    time: "14:10",
    deposit: 120000,
    status: "見積下書き済み",
    cleaningClause: false,
  },
  {
    id: "tsukino",
    property: "月の栞ハイツ",
    unit: "105",
    plan: "1K",
    tenant: "久世 千晴",
    attendant: "三枝 直人",
    months: 84,
    days: -11,
    time: "11:35",
    deposit: 60000,
    status: "実施済み",
    cleaningClause: false,
  },
  {
    id: "aoba",
    property: "青葉小径コート",
    unit: "301",
    plan: "2LDK",
    tenant: "真壁 遼",
    attendant: "小野寺 葵",
    months: 31,
    days: 1,
    time: "13:30",
    deposit: 110000,
    status: "予定",
    cleaningClause: true,
  },
  {
    id: "sora",
    property: "そらいろ荘",
    unit: "102",
    plan: "1DK",
    tenant: "水瀬 梢",
    attendant: "三枝 直人",
    months: 62,
    days: 4,
    time: "09:45",
    deposit: 70000,
    status: "予定",
    cleaningClause: false,
  },
] as const;

type Finding = {
  inspection: string;
  room: string;
  item: string;
  condition: Condition;
  cause: Cause;
  note: string;
  quantity: number;
  kind: SampleSpec["kind"];
  tone: string;
  detail: number;
  minute: number;
};

const FINDINGS: Finding[] = [
  {
    inspection: "komorebi",
    room: "洋室1",
    item: "floor",
    condition: "傷",
    cause: "借主の故意・過失・善管注意義務違反",
    note: "ペット可住戸。窓際のCFに爪の跡が集中。幅約60cmの範囲を確認。",
    quantity: 2.4,
    kind: "floor",
    tone: "#b99b74",
    detail: 31,
    minute: 8,
  },
  {
    inspection: "komorebi",
    room: "リビング",
    item: "wall",
    condition: "傷",
    cause: "借主の故意・過失・善管注意義務違反",
    note: "ソファ背面のクロスに猫の引っかき跡。補修対象は一面の下半分。",
    quantity: 5.5,
    kind: "wall",
    tone: "#d9d0b8",
    detail: 77,
    minute: 19,
  },
  {
    inspection: "komorebi",
    room: "バルコニー",
    item: "door",
    condition: "破損",
    cause: "不明",
    note: "網戸の右下に約8cmの裂け。入居時写真との照合が必要。",
    quantity: 1,
    kind: "screen",
    tone: "#b3c8bd",
    detail: 46,
    minute: 34,
  },
  {
    inspection: "komorebi",
    room: "玄関",
    item: "wall",
    condition: "汚れ",
    cause: "通常損耗・経年劣化",
    note: "シューズボックス背面に軽い電気焼け。日常使用の範囲と判断。",
    quantity: 1.2,
    kind: "wall",
    tone: "#e1d5ba",
    detail: 18,
    minute: 3,
  },
  {
    inspection: "nagi",
    room: "洋室1",
    item: "wall",
    condition: "汚れ",
    cause: "借主の故意・過失・善管注意義務違反",
    note: "喫煙によるヤニと臭いを確認。北側壁のクロス張替えを想定。",
    quantity: 18.6,
    kind: "wall",
    tone: "#ccb786",
    detail: 63,
    minute: 16,
  },
  {
    inspection: "nagi",
    room: "キッチン",
    item: "ceiling",
    condition: "汚れ",
    cause: "借主の故意・過失・善管注意義務違反",
    note: "換気扇周辺に固着した油汚れ。通常清掃では除去しにくい状態。",
    quantity: 4.8,
    kind: "wall",
    tone: "#c7b894",
    detail: 92,
    minute: 9,
  },
  {
    inspection: "nagi",
    room: "浴室",
    item: "equipment",
    condition: "汚れ",
    cause: "借主の故意・過失・善管注意義務違反",
    note: "排水口の詰まりと目地の黒カビ。換気設備は正常に動作。",
    quantity: 1,
    kind: "mold",
    tone: "#b6c9ce",
    detail: 54,
    minute: 27,
  },
  {
    inspection: "nagi",
    room: "洋室2",
    item: "door",
    condition: "破損",
    cause: "借主の故意・過失・善管注意義務違反",
    note: "収納扉の取っ手が外れている。外れた部品は室内に保管。",
    quantity: 1,
    kind: "screen",
    tone: "#baa18c",
    detail: 29,
    minute: 38,
  },
  {
    inspection: "tsukino",
    room: "洋室1",
    item: "wall",
    condition: "汚れ",
    cause: "通常損耗・経年劣化",
    note: "南向き窓周りに日焼け。家具の設置跡との色差が見られる。",
    quantity: 9.2,
    kind: "wall",
    tone: "#e6d4ab",
    detail: 38,
    minute: 14,
  },
  {
    inspection: "tsukino",
    room: "玄関",
    item: "floor",
    condition: "傷",
    cause: "通常損耗・経年劣化",
    note: "上がり框の表面に浅い擦れ。長期使用による摩耗と判断。",
    quantity: 0.8,
    kind: "floor",
    tone: "#99846e",
    detail: 83,
    minute: 4,
  },
  {
    inspection: "tsukino",
    room: "浴室",
    item: "equipment",
    condition: "問題なし",
    cause: "通常損耗・経年劣化",
    note: "水栓と排水を通水確認。清掃が行き届き、水漏れも見られない。",
    quantity: 1,
    kind: "mold",
    tone: "#d5e0dd",
    detail: 0,
    minute: 23,
  },
  {
    inspection: "tsukino",
    room: "バルコニー",
    item: "door",
    condition: "問題なし",
    cause: "通常損耗・経年劣化",
    note: "網戸の開閉は滑らか。網のたわみや穴もなく継続使用できる。",
    quantity: 1,
    kind: "screen",
    tone: "#ccd7bf",
    detail: 0,
    minute: 31,
  },
];

export function createSeed(now: Date): { database: Database; samples: SampleSpec[] } {
  const today = japanDate(now);
  const settings = defaultSettings();
  const inspections: Inspection[] = RECORDS.map((record) => {
    const date = shiftDays(today, record.days);
    const rooms = expandRooms(record.plan, settings.templates);
    if (record.status !== "予定")
      rooms.forEach((room) =>
        room.items.forEach((item) => {
          item.checked = true;
          item.cause = "通常損耗・経年劣化";
          item.burden = "貸主";
        }),
      );
    return {
      id: record.id,
      property: record.property,
      unit: record.unit,
      plan: record.plan,
      tenant: record.tenant,
      attendant: record.attendant,
      moveIn: shiftMonths(date, -record.months),
      moveOut: date,
      date,
      time: record.time,
      deposit: record.deposit,
      status: record.status,
      completedAt:
        record.status === "予定"
          ? null
          : new Date(Date.parse(localTimestamp(date, record.time)) + 55 * 60000).toISOString(),
      cleaningClause: record.cleaningClause,
      cleaningPrice: record.id === "nagi" ? 38000 : record.id === "tsukino" ? 24000 : 30000,
      rooms,
    };
  });
  const samples: SampleSpec[] = [];
  FINDINGS.forEach((finding) => {
    const inspection = inspections.find((entry) => entry.id === finding.inspection)!;
    const room = inspection.rooms.find((entry) => entry.name === finding.room)!;
    const item = room.items.find((entry) => entry.id === finding.item)!;
    Object.assign(item, {
      condition: finding.condition,
      cause: finding.cause,
      burden: suggestBurden(finding.cause),
      note: finding.note,
      quantity: finding.quantity,
    });
    const base = {
      inspectionId: inspection.id,
      roomId: room.id,
      itemId: item.id,
      label: `${room.name} / ${item.name}`,
      kind: finding.kind,
      tone: finding.tone,
    };
    const before =
      Date.parse(localTimestamp(inspection.date, inspection.time)) + finding.minute * 60000;
    const overview = {
      ...base,
      id: `${inspection.id}-${room.id}-${item.id}-wide`,
      takenAt: new Date(before).toISOString(),
      detail: finding.detail,
    };
    const closeup = {
      ...base,
      id: `${inspection.id}-${room.id}-${item.id}-close`,
      takenAt: new Date(before + 43000).toISOString(),
      detail: finding.detail ? finding.detail + 11 : 0,
    };
    samples.push(overview, closeup);
    item.photos = [overview.id, closeup.id];
  });
  return { database: { version: 1, inspections, settings }, samples };
}
