export type Condition = "問題なし" | "汚れ" | "傷" | "破損" | "欠品";

export type Cause = "通常損耗・経年劣化" | "借主の故意・過失・善管注意義務違反" | "不明";

export type Burden = "貸主" | "借主" | "保留";

export type Template = {
  id: string;
  part: string;
  name: string;
  unit: string;
  price: number;
  depreciates: boolean;
};

export type Item = Template & {
  checked: boolean;
  condition: Condition;
  cause: Cause;
  burden: Burden;
  note: string;
  quantity: number;
  ratio: number | null;
  photos: string[];
};

export type Room = { id: string; name: string; items: Item[] };

export type Inspection = {
  id: string;
  property: string;
  unit: string;
  plan: string;
  moveIn: string;
  moveOut: string;
  date: string;
  time: string;
  tenant: string;
  attendant: string;
  deposit: number;
  status: "予定" | "実施済み" | "見積下書き済み";
  completedAt: string | null;
  cleaningClause: boolean;
  cleaningPrice: number;
  rooms: Room[];
};

export type Settings = { templates: Template[]; cleaningClause: boolean; cleaningPrice: number };

export type Database = { version: 1; inspections: Inspection[]; settings: Settings };

export type Photo = {
  id: string;
  inspectionId: string;
  roomId: string;
  itemId: string;
  label: string;
  takenAt: string;
  data: string;
};

export type Backup = { version: 1; exportedAt: string; database: Database; photos: Photo[] };
