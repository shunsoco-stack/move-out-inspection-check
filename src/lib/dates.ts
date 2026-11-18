const DAY = 86_400_000;

export function japanDate(now: Date): string {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}

export function japanTime(now: Date): string {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(11, 16);
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function shiftDays(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export function shiftMonths(value: string, months: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function tenancyMonths(start: string, end: string): number {
  if (!validDate(start) || !validDate(end) || end < start) return 0;
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const months = (ey - sy) * 12 + em - sm;
  return Math.max(0, months - (shiftMonths(start, months) > end ? 1 : 0));
}

export function daysSince(date: string, now: Date): number {
  return Math.round((Date.parse(japanDate(now)) - Date.parse(date)) / DAY);
}

export function tenureLabel(months: number): string {
  return `${Math.floor(months / 12)}年${months % 12}か月`;
}

export function localTimestamp(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}
