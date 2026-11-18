import type { Burden, Cause, Item } from "./types.ts";

export const CAUSES: Cause[] = ["通常損耗・経年劣化", "借主の故意・過失・善管注意義務違反", "不明"];

export function suggestBurden(cause: Cause): Burden {
  if (cause === CAUSES[0]) return "貸主";
  if (cause === CAUSES[1]) return "借主";
  return "保留";
}

export function remainingRatio(months: number, cost: number): number {
  if (cost <= 0) return 0;
  const residual = Math.min(1, cost);
  return (residual + (cost - residual) * Math.max(0, 1 - Math.max(0, months) / 72)) / cost;
}

export function tenantRatio(item: Item, months: number): number {
  if (item.burden !== "借主") return 0;
  if (item.ratio !== null) return Math.max(0, Math.min(1, item.ratio));
  const cost = Math.floor(item.price * item.quantity + 1e-8);
  return item.depreciates ? remainingRatio(months, cost) : 1;
}
