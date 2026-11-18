import type { Photo } from "./types.ts";

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("moc-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("写真保存領域を開けません。ブラウザの保存設定を確認してください。"));
  });
}

export async function readPhotos(): Promise<Photo[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction("photos").objectStore("photos").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function writePhotos(photos: Photo[], replace = false): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("photos", "readwrite");
      const store = transaction.objectStore("photos");
      if (replace) store.clear();
      photos.forEach((photo) => store.put(photo));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error("写真を保存できません。空き容量を確認してください。"));
      transaction.onabort = () => reject(new Error("写真の保存が中断されました。"));
    });
  } finally {
    database.close();
  }
}
