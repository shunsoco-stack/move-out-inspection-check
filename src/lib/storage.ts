import { validDatabase } from "./validation.ts";
import type { Database } from "./types.ts";

export const STORAGE_KEY = "moc:v1";

export function parseStorage(raw: string): Database | null {
  try {
    const value: unknown = JSON.parse(raw);
    return validDatabase(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveDatabase(database: Database): void {
  if (!validDatabase(database))
    throw new Error("入力値を確認してください。保存できない項目があります。");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}
