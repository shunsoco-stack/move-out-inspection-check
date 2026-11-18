import { useState } from "react";
import { AppLink, useStore } from "./store";
import { Icon } from "./icons";
import { BurdenFields } from "./burden-fields";
import { PhotoGallery } from "./photo-gallery";
import { tenancyMonths } from "@/lib/dates";
import { progress } from "@/lib/rooms";
import { resizePhoto } from "@/lib/photos";
import type { Condition, Inspection, Item, Photo } from "@/lib/types";

const CONDITIONS: Condition[] = ["問題なし", "汚れ", "傷", "破損", "欠品"];

export function RoomCheck({ inspection, roomId }: { inspection: Inspection; roomId: string }) {
  const { updateInspection, photos, addPhotos, notify } = useStore();
  const [busy, setBusy] = useState(false);
  const room = inspection.rooms.find((entry) => entry.id === roomId);
  if (!room)
    return (
      <div className="panel empty">
        <h1>部屋が見つかりません</h1>
        <AppLink href={`/inspections/${inspection.id}`}>概要に戻る</AppLink>
      </div>
    );
  const checked = progress([room]);
  const months = tenancyMonths(inspection.moveIn, inspection.moveOut);
  function changedInspection(itemId: string, patch: Partial<Item>): Inspection {
    return {
      ...inspection,
      status: inspection.status === "見積下書き済み" ? "実施済み" : inspection.status,
      rooms: inspection.rooms.map((entry) =>
        entry.id === roomId
          ? {
              ...entry,
              items: entry.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
            }
          : entry,
      ),
    };
  }
  function change(itemId: string, patch: Partial<Item>) {
    updateInspection(changedInspection(itemId, patch));
  }
  async function upload(files: FileList | null, item: Item) {
    if (!files?.length || !room) return;
    if (item.photos.length + files.length > 50) {
      notify("写真は1項目50枚までです。");
      return;
    }
    setBusy(true);
    try {
      const additions: Photo[] = [];
      for (const file of Array.from(files))
        additions.push({
          id: crypto.randomUUID(),
          inspectionId: inspection.id,
          roomId,
          itemId: item.id,
          label: `${room.name} / ${item.name}`,
          takenAt: new Date().toISOString(),
          data: await resizePhoto(file),
        });
      await addPhotos(
        additions,
        changedInspection(item.id, {
          photos: [...item.photos, ...additions.map((photo) => photo.id)],
        }),
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "写真を処理できませんでした。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AppLink className="back-link" href={`/inspections/${inspection.id}`}>
        ← {inspection.property} {inspection.unit}号室
      </AppLink>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ROOM INSPECTION</span>
          <h1>{room.name}のチェック</h1>
          <p>状態を選び、気になる箇所に原因と写真を残しましょう。</p>
        </div>
        <span className="badge drafted">
          {checked.checked} / {checked.total} 確認済み
        </span>
      </div>
      <nav className="room-tabs" aria-label="部屋を切り替え">
        {inspection.rooms.map((entry) => (
          <AppLink
            key={entry.id}
            href={`/inspections/${inspection.id}/rooms/${entry.id}`}
            className={entry.id === roomId ? "selected" : ""}
          >
            {entry.name}
          </AppLink>
        ))}
      </nav>
      <fieldset className="room-fieldset" disabled={busy}>
        <legend className="visually-hidden">{room.name}のチェック項目</legend>
        {room.items.map((item) => (
          <section className="panel check-card" key={item.id}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">{item.part}</span>
                <h2>{item.name}</h2>
              </div>
              <span className={`badge ${item.checked ? "drafted" : "scheduled"}`}>
                {item.checked ? "✓ 確認済み" : "未確認"}
              </span>
            </div>
            <div className="condition-buttons" aria-label={`${item.name}の状態`}>
              {CONDITIONS.map((condition) => (
                <button
                  key={condition}
                  type="button"
                  aria-pressed={item.checked && item.condition === condition}
                  className={item.checked && item.condition === condition ? "selected" : ""}
                  onClick={() =>
                    change(item.id, {
                      condition,
                      checked: true,
                      ...(condition === "問題なし"
                        ? { cause: "通常損耗・経年劣化", burden: "貸主", ratio: null }
                        : {}),
                    })
                  }
                >
                  {condition === "問題なし" ? "✓ " : ""}
                  {condition}
                </button>
              ))}
            </div>
            {item.checked && item.condition !== "問題なし" && (
              <BurdenFields
                item={item}
                months={months}
                onChange={(patch) => change(item.id, patch)}
              />
            )}
            <label>
              確認メモ
              <textarea
                maxLength={3000}
                rows={3}
                placeholder="位置・大きさ・原因の判断材料などを記録"
                value={item.note}
                onChange={(event) => change(item.id, { note: event.target.value })}
              />
            </label>
            <div className="photo-toolbar">
              <div className="file-control">
                <input
                  className="visually-hidden"
                  type="file"
                  id={`photo-${roomId}-${item.id}`}
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(event) => {
                    void upload(event.target.files, item);
                    event.target.value = "";
                  }}
                />
                <label className="button" htmlFor={`photo-${roomId}-${item.id}`}>
                  <Icon name="photo" />
                  {busy ? "写真を保存中…" : "写真を撮る・選ぶ"}
                </label>
              </div>
              <span className="muted">{item.photos.length}枚 · 長辺1600pxに縮小</span>
            </div>
            <PhotoGallery
              photos={photos.filter((photo) => item.photos.includes(photo.id))}
              onRemove={(id) => {
                if (window.confirm("この写真を記録から削除しますか？"))
                  change(item.id, { photos: item.photos.filter((photoId) => photoId !== id) });
              }}
            />
            {item.checked && (
              <button
                type="button"
                className="text-button"
                onClick={() => change(item.id, { checked: false })}
              >
                未確認に戻す
              </button>
            )}
          </section>
        ))}
      </fieldset>
      <div className="action-bar">
        <span role="status">
          {busy ? "写真を保存しています…" : "変更はこの端末に自動保存されます"}
        </span>
        <AppLink className="button primary" href={`/inspections/${inspection.id}`}>
          部屋の一覧に戻る <Icon name="check" />
        </AppLink>
      </div>
    </>
  );
}
