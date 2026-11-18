"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createSeed } from "@/lib/seed";
import { drawSample } from "@/lib/samples";
import { readPhotos, writePhotos } from "@/lib/idb";
import { parseStorage, saveDatabase, STORAGE_KEY } from "@/lib/storage";
import { createBackup } from "@/lib/backup";
import type { Database, Inspection, Photo } from "@/lib/types";

type Store = {
  database: Database;
  photos: Photo[];
  now: Date;
  path: string;
  message: string;
  notify: (message: string) => void;
  navigate: (path: string) => void;
  update: (database: Database) => boolean;
  updateInspection: (inspection: Inspection) => boolean;
  addPhotos: (photos: Photo[], inspection: Inspection) => Promise<void>;
  restore: (database: Database, photos: Photo[]) => Promise<void>;
  reset: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("保存データを読み込み中です。");
  return store;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [database, setDatabase] = useState<Database | null>(null);
  const current = useRef<Database | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [path, setPath] = useState("/");
  const [message, notify] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const openedAt = new Date();
        const raw = localStorage.getItem(STORAGE_KEY);
        let loaded = raw ? parseStorage(raw) : null;
        let loadedPhotos = await readPhotos();
        if (loaded) {
          try {
            createBackup(loaded, loadedPhotos, openedAt);
          } catch {
            loaded = null;
          }
        }
        if (!loaded) {
          const seed = createSeed(openedAt);
          loaded = seed.database;
          loadedPhotos = seed.samples.map(drawSample);
          await writePhotos(loadedPhotos, true);
          saveDatabase(loaded);
          if (raw && active) notify("保存データが壊れていたため、既定データに戻しました。");
        }
        if (!active) return;
        current.current = loaded;
        setDatabase(loaded);
        setPhotos(loadedPhotos);
        setNow(openedAt);
        setPath(window.location.pathname);
      } catch (error) {
        if (active) {
          setFailed(true);
          notify(error instanceof Error ? error.message : "保存領域を読み込めません。");
        }
      }
    }
    void initialize();
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        if (active) notify("オフライン機能を登録できませんでした。通常の画面は利用できます。");
      });
    }
    return () => {
      active = false;
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  function update(next: Database): boolean {
    try {
      saveDatabase(next);
      current.current = next;
      setDatabase(next);
      return true;
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "保存に失敗しました。空き容量を確認してください。",
      );
      return false;
    }
  }

  function updateInspection(inspection: Inspection): boolean {
    const latest = current.current;
    return (
      !!latest &&
      update({
        ...latest,
        inspections: latest.inspections.map((entry) =>
          entry.id === inspection.id ? inspection : entry,
        ),
      })
    );
  }

  async function restore(next: Database, nextPhotos: Photo[]) {
    createBackup(next, nextPhotos, new Date());
    const oldPhotos = await readPhotos();
    await writePhotos(nextPhotos, true);
    if (!update(next)) {
      await writePhotos(oldPhotos, true);
      throw new Error("復元を中止しました。元のデータを保持しています。");
    }
    setPhotos(nextPhotos);
    notify("写真を含めてデータを保存しました。");
  }

  async function reset() {
    const seed = createSeed(new Date());
    await restore(seed.database, seed.samples.map(drawSample));
    setNow(new Date());
  }

  function navigate(next: string) {
    window.history.pushState(null, "", next);
    setPath(next);
    window.scrollTo(0, 0);
  }

  async function addPhotos(newPhotos: Photo[], inspection: Inspection) {
    await writePhotos(newPhotos);
    if (!updateInspection(inspection))
      throw new Error("写真の参照を保存できませんでした。もう一度お試しください。");
    setPhotos((previous) => [...previous, ...newPhotos]);
    notify(`${newPhotos.length}枚の写真を保存しました。`);
  }

  if (!database || !now)
    return (
      <main className="loading">
        <div className="brand-mark">✓</div>
        <h1>退去立会い・原状回復チェック</h1>
        <p role="status">{failed ? message : "立会いの記録を準備しています…"}</p>
        {failed && <button onClick={() => window.location.reload()}>もう一度読み込む</button>}
      </main>
    );

  return (
    <Context.Provider
      value={{
        database,
        photos,
        now,
        path,
        message,
        notify,
        navigate,
        update,
        updateInspection,
        addPhotos,
        restore,
        reset,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function AppLink({
  href,
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { navigate } = useStore();
  return (
    <a
      href={href}
      className={className}
      {...props}
      onClick={(event) => {
        if (
          event.button === 0 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          navigate(href);
        }
      }}
    >
      {children}
    </a>
  );
}
