import { calculateEstimate, formatRatio } from "./estimate.ts";
import { japanDate } from "./dates.ts";
import type { Inspection } from "./types.ts";

export function csvCell(value: string | number): string {
  const raw = String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function estimateFilename(
  inspection: Pick<Inspection, "property" | "unit">,
  now: Date,
): string {
  const safe = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 80);
  return `精算見積_${safe(inspection.property)}_${safe(inspection.unit)}_${japanDate(now)}.csv`;
}

export function estimateCsv(inspection: Inspection): string {
  const estimate = calculateEstimate(inspection);
  const rows: (string | number)[][] = [
    ["精算見積の下書き", inspection.property, inspection.unit, inspection.date],
    ["項目", "単価", "数量", "単位", "借主割合", "借主負担", "貸主負担", "保留"],
    ...estimate.lines.map((line) => [
      line.label,
      line.price,
      line.quantity,
      line.unit,
      formatRatio(line.ratio),
      line.tenant,
      line.landlord,
      line.pending,
    ]),
    ["小計", "", "", "", "", estimate.tenantSubtotal, estimate.landlordSubtotal, estimate.pending],
    ["消費税10%（切り捨て）", "", "", "", "", estimate.tenantTax, estimate.landlordTax],
    ["税込合計", "", "", "", "", estimate.tenantTotal, estimate.landlordTotal],
    ["敷金", inspection.deposit],
    [estimate.balance >= 0 ? "返金見込" : "追加請求見込", Math.abs(estimate.balance)],
  ];
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
