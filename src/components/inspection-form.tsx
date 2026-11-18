import { useState } from "react";
import { useStore } from "./store";
import { expandRooms, PLANS } from "@/lib/rooms";
import { japanDate, shiftMonths } from "@/lib/dates";
import type { Inspection } from "@/lib/types";

export function InspectionForm({
  onClose,
  existing,
}: {
  onClose: () => void;
  existing?: Inspection;
}) {
  const { database, now, update, notify, navigate } = useStore();
  const [error, setError] = useState("");
  const today = japanDate(now);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    if (field("moveIn") > field("moveOut")) {
      setError("退去日は入居日以降にしてください。");
      return;
    }
    const inspection: Inspection = {
      id: existing?.id ?? crypto.randomUUID(),
      property: field("property"),
      unit: field("unit"),
      plan: field("plan"),
      moveIn: field("moveIn"),
      moveOut: field("moveOut"),
      date: field("date"),
      time: field("time"),
      tenant: field("tenant"),
      attendant: field("attendant"),
      deposit: Number(form.get("deposit")),
      status: existing?.status ?? "予定",
      completedAt: existing?.completedAt ?? null,
      cleaningClause: existing?.cleaningClause ?? database.settings.cleaningClause,
      cleaningPrice: existing?.cleaningPrice ?? database.settings.cleaningPrice,
      rooms: existing?.rooms ?? expandRooms(field("plan"), database.settings.templates),
    };
    const inspections = existing
      ? database.inspections.map((entry) => (entry.id === existing.id ? inspection : entry))
      : [inspection, ...database.inspections];
    if (update({ ...database, inspections })) {
      notify(existing ? "立会い情報を更新しました。" : "立会いを登録しました。");
      onClose();
      navigate(`/inspections/${inspection.id}`);
    }
  }
  return (
    <section className="panel registration">
      <div className="section-heading">
        <div>
          <span className="eyebrow">INSPECTION DETAILS</span>
          <h2>{existing ? "立会い情報を編集" : "新しい立会いを登録"}</h2>
        </div>
        <button onClick={onClose}>閉じる</button>
      </div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            物件名（架空）
            <input
              name="property"
              required
              maxLength={100}
              defaultValue={existing?.property}
              placeholder="例：こもれびテラス"
            />
          </label>
          <label>
            号室
            <input
              name="unit"
              required
              maxLength={40}
              defaultValue={existing?.unit}
              placeholder="例：203"
            />
          </label>
          <label>
            間取り
            <select name="plan" defaultValue={existing?.plan ?? "1K"} disabled={!!existing}>
              {PLANS.map((plan) => (
                <option key={plan}>{plan}</option>
              ))}
            </select>
            {existing && <input type="hidden" name="plan" value={existing.plan} />}
          </label>
          <label>
            敷金（円）
            <input
              type="number"
              name="deposit"
              required
              min="0"
              max="100000000"
              step="1"
              defaultValue={existing?.deposit ?? 80000}
            />
          </label>
          <label>
            入居日
            <input
              type="date"
              name="moveIn"
              required
              defaultValue={existing?.moveIn ?? shiftMonths(today, -24)}
            />
          </label>
          <label>
            退去日
            <input type="date" name="moveOut" required defaultValue={existing?.moveOut ?? today} />
          </label>
          <label>
            立会い時刻
            <input
              type="time"
              name="time"
              required
              min="09:30"
              max="17:30"
              defaultValue={existing?.time ?? "13:30"}
            />
          </label>
          <label>
            立会い日
            <input type="date" name="date" required defaultValue={existing?.date ?? today} />
          </label>
          <label>
            借主名（架空）
            <input name="tenant" required maxLength={100} defaultValue={existing?.tenant} />
          </label>
          <label>
            立会い者
            <input
              name="attendant"
              required
              maxLength={100}
              defaultValue={existing?.attendant ?? "三枝 直人"}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <p className="muted">
          登録時のテンプレート・単価を適用します。既存の記録の間取りは変更できません。
        </p>
        <button className="primary" type="submit">
          {existing ? "変更を保存" : "立会いを登録する"}
          <span>＋</span>
        </button>
      </form>
    </section>
  );
}
