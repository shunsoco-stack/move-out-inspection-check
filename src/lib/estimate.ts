import { tenantRatio } from "./burden.ts";
import { tenancyMonths, tenureLabel } from "./dates.ts";
import type { Inspection } from "./types.ts";

export type EstimateLine = {
  label: string;
  price: number;
  quantity: number;
  unit: string;
  ratio: number;
  ratioBasis?: string;
  cost: number;
  tenant: number;
  landlord: number;
  pending: number;
};

export function calculateEstimate(inspection: Inspection) {
  const months = tenancyMonths(inspection.moveIn, inspection.moveOut);
  const lines: EstimateLine[] = inspection.rooms.flatMap((room) =>
    room.items
      .filter((item) => item.checked && item.condition !== "問題なし")
      .map((item) => {
        const cost = Math.floor(item.price * item.quantity + 1e-8);
        const ratio = tenantRatio(item, months);
        const tenant = Math.min(cost, Math.floor(cost * ratio + 1e-8));
        const pending = item.burden === "保留" ? cost : 0;
        return {
          label: `${room.name} / ${item.name}`,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
          ratio,
          ratioBasis:
            item.burden === "借主" &&
            item.ratio === null &&
            item.depreciates &&
            months > 0 &&
            cost > 1
              ? `耐用年数6年・経過${tenureLabel(months)}（入居期間）`
              : undefined,
          cost,
          tenant,
          landlord: pending ? 0 : cost - tenant,
          pending,
        };
      }),
  );
  const cleaning = Math.floor(inspection.cleaningPrice);
  if (cleaning > 0)
    lines.push({
      label: `ハウスクリーニング${inspection.cleaningClause ? "（特約あり）" : "（特約なし）"}`,
      price: cleaning,
      quantity: 1,
      unit: "式",
      ratio: inspection.cleaningClause ? 1 : 0,
      cost: cleaning,
      tenant: inspection.cleaningClause ? cleaning : 0,
      landlord: inspection.cleaningClause ? 0 : cleaning,
      pending: 0,
    });
  const tenantSubtotal = lines.reduce((sum, line) => sum + line.tenant, 0);
  const landlordSubtotal = lines.reduce((sum, line) => sum + line.landlord, 0);
  const pending = lines.reduce((sum, line) => sum + line.pending, 0);
  const tenantTax = Math.floor(tenantSubtotal * 0.1);
  const landlordTax = Math.floor(landlordSubtotal * 0.1);
  const tenantTotal = tenantSubtotal + tenantTax;
  return {
    lines,
    tenantSubtotal,
    landlordSubtotal,
    tenantTax,
    landlordTax,
    tenantTotal,
    landlordTotal: landlordSubtotal + landlordTax,
    pending,
    balance: inspection.deposit - tenantTotal,
  };
}

export function photoPages<T>(photos: T[]): T[][] {
  return Array.from({ length: Math.ceil(photos.length / 12) }, (_, index) =>
    photos.slice(index * 12, index * 12 + 12),
  );
}

export function money(value: number): string {
  return `${value.toLocaleString("ja-JP")}円`;
}

export function formatRatio(ratio: number): string {
  return `${Number((ratio * 100).toFixed(1))}%`;
}

export function burdenSummary(estimate: ReturnType<typeof calculateEstimate>) {
  return [
    {
      label: "貸主負担",
      amount: estimate.landlordSubtotal,
      count: estimate.lines.filter((line) => line.landlord > 0).length,
    },
    {
      label: "借主負担",
      amount: estimate.tenantSubtotal,
      count: estimate.lines.filter((line) => line.tenant > 0).length,
    },
    {
      label: "保留",
      amount: estimate.pending,
      count: estimate.lines.filter((line) => line.pending > 0).length,
    },
  ];
}
