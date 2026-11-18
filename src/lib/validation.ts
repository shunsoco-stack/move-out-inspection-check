import { validDate } from "./dates.ts";
import { CAUSES } from "./burden.ts";
import { PLANS } from "./rooms.ts";
import type { Database, Template } from "./types.ts";

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, max = 200): value is string {
  return typeof value === "string" && value.length <= max;
}

function id(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

function number(value: unknown, max = 100000000): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;
}

function unique(values: unknown[]): boolean {
  return new Set(values).size === values.length;
}

function template(value: unknown): value is Template & Record<string, unknown> {
  return (
    object(value) &&
    id(value.id) &&
    text(value.part) &&
    text(value.name) &&
    !!value.name &&
    ["㎡", "枚", "箇所"].includes(value.unit as string) &&
    number(value.price, 1000000) &&
    typeof value.depreciates === "boolean"
  );
}

export function validDatabase(value: unknown): value is Database {
  if (
    !object(value) ||
    value.version !== 1 ||
    !object(value.settings) ||
    !Array.isArray(value.inspections) ||
    value.inspections.length > 200
  )
    return false;
  const settings = value.settings;
  if (
    !Array.isArray(settings.templates) ||
    !settings.templates.length ||
    settings.templates.length > 30 ||
    !settings.templates.every(template) ||
    !unique(settings.templates.map((entry) => entry.id)) ||
    typeof settings.cleaningClause !== "boolean" ||
    !number(settings.cleaningPrice, 1000000)
  )
    return false;
  const photoIds: string[] = [];
  for (const inspection of value.inspections) {
    if (
      !object(inspection) ||
      !id(inspection.id) ||
      !["property", "unit", "tenant", "attendant"].every(
        (key) => text(inspection[key]) && !!inspection[key],
      ) ||
      !PLANS.includes(inspection.plan as string)
    )
      return false;
    if (
      !["moveIn", "moveOut", "date"].every(
        (key) => typeof inspection[key] === "string" && validDate(inspection[key] as string),
      ) ||
      String(inspection.moveIn) > String(inspection.moveOut) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(inspection.time))
    )
      return false;
    if (
      !["予定", "実施済み", "見積下書き済み"].includes(String(inspection.status)) ||
      !number(inspection.deposit) ||
      !number(inspection.cleaningPrice, 1000000) ||
      typeof inspection.cleaningClause !== "boolean"
    )
      return false;
    if (
      inspection.status === "予定"
        ? inspection.completedAt !== null
        : typeof inspection.completedAt !== "string" ||
          !Number.isFinite(Date.parse(inspection.completedAt))
    )
      return false;
    if (
      !Array.isArray(inspection.rooms) ||
      !inspection.rooms.length ||
      inspection.rooms.length > 30 ||
      !unique(inspection.rooms.map((room) => room?.id))
    )
      return false;
    for (const room of inspection.rooms) {
      if (
        !object(room) ||
        !id(room.id) ||
        !text(room.name) ||
        !Array.isArray(room.items) ||
        !room.items.length ||
        room.items.length > 30 ||
        !unique(room.items.map((item) => item?.id))
      )
        return false;
      for (const item of room.items) {
        if (
          !template(item) ||
          !object(item) ||
          typeof item.checked !== "boolean" ||
          !["問題なし", "汚れ", "傷", "破損", "欠品"].includes(String(item.condition)) ||
          !CAUSES.includes(item.cause as never) ||
          !["貸主", "借主", "保留"].includes(String(item.burden)) ||
          !text(item.note, 3000) ||
          !number(item.quantity, 10000) ||
          !(item.ratio === null || number(item.ratio, 1)) ||
          !Array.isArray(item.photos) ||
          item.photos.length > 50 ||
          !item.photos.every(id)
        )
          return false;
        photoIds.push(...(item.photos as string[]));
      }
    }
  }
  return unique(photoIds) && unique(value.inspections.map((inspection) => inspection.id));
}
