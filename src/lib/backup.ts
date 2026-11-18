import { validDatabase } from "./validation.ts";
import type { Backup, Database, Photo } from "./types.ts";

export function validateBackup(value: unknown): Backup {
  if (!value || typeof value !== "object") throw new Error("バックアップの形式が違います。");
  const backup = value as Backup;
  if (
    backup.version !== 1 ||
    !validDatabase(backup.database) ||
    !Array.isArray(backup.photos) ||
    backup.photos.length > 5000 ||
    typeof backup.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(backup.exportedAt))
  )
    throw new Error("バージョンまたは保存データが不正です。");
  const references = new Map<string, string>();
  backup.database.inspections.forEach((inspection) =>
    inspection.rooms.forEach((room) =>
      room.items.forEach((item) =>
        item.photos.forEach((id) => references.set(id, `${inspection.id}/${room.id}/${item.id}`)),
      ),
    ),
  );
  const seen = new Set<string>();
  for (const photo of backup.photos) {
    if (
      !photo ||
      typeof photo.id !== "string" ||
      seen.has(photo.id) ||
      references.get(photo.id) !== `${photo.inspectionId}/${photo.roomId}/${photo.itemId}` ||
      typeof photo.label !== "string" ||
      photo.label.length > 500 ||
      typeof photo.takenAt !== "string" ||
      !Number.isFinite(Date.parse(photo.takenAt)) ||
      typeof photo.data !== "string" ||
      photo.data.length > 12000000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.data)
    )
      throw new Error("写真の形式・参照・重複を確認してください。");
    seen.add(photo.id);
  }
  if (seen.size !== references.size) throw new Error("写真が不足しています。");
  return backup;
}

export function createBackup(database: Database, photos: Photo[], now: Date): Backup {
  const ids = new Set(
    database.inspections.flatMap((inspection) =>
      inspection.rooms.flatMap((room) => room.items.flatMap((item) => item.photos)),
    ),
  );
  return validateBackup({
    version: 1,
    exportedAt: now.toISOString(),
    database,
    photos: photos.filter((photo) => ids.has(photo.id)),
  });
}

export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
