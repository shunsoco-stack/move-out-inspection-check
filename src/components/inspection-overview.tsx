import { useState } from "react";
import { AppLink, useStore } from "./store";
import { InspectionForm } from "./inspection-form";
import { Icon } from "./icons";
import { progress } from "@/lib/rooms";
import { daysSince, localTimestamp, tenancyMonths, tenureLabel } from "@/lib/dates";
import { burdenSummary, calculateEstimate, money } from "@/lib/estimate";
import type { Inspection } from "@/lib/types";

export function InspectionOverview({ inspection }: { inspection: Inspection }) {
  const { now, updateInspection, notify } = useStore();
  const [editing, setEditing] = useState(false);
  const checked = progress(inspection.rooms);
  const months = tenancyMonths(inspection.moveIn, inspection.moveOut);
  const elapsed = daysSince(inspection.moveOut, now);
  const burdens = burdenSummary(calculateEstimate(inspection));
  const issues = inspection.rooms
    .flatMap((room) => room.items)
    .filter((item) => item.checked && item.condition !== "問題なし");
  function complete() {
    if (Date.parse(localTimestamp(inspection.date, inspection.time)) > Date.now()) {
      notify("未来の立会いは完了できません。立会い日時を確認してください。");
      return;
    }
    if (
      updateInspection({ ...inspection, status: "実施済み", completedAt: new Date().toISOString() })
    )
      notify("立会いを実施済みにしました。見積の下書きを作成できます。");
  }
  return (
    <>
      <AppLink href="/" className="back-link">
        ← 立会い一覧
      </AppLink>
      <div className="page-heading">
        <div>
          <span className="eyebrow">INSPECTION / {inspection.unit}</span>
          <h1>
            {inspection.property} <small>{inspection.unit}号室</small>
          </h1>
          <p>
            {inspection.plan} · {inspection.date} {inspection.time} · {inspection.status}
          </p>
        </div>
        <button onClick={() => setEditing(!editing)}>立会い情報を編集</button>
      </div>
      {editing && <InspectionForm existing={inspection} onClose={() => setEditing(false)} />}
      <div className="overview-grid">
        <section className="panel">
          <h2>立会いの概要</h2>
          <dl className="details">
            <div>
              <dt>借主名（架空）</dt>
              <dd>{inspection.tenant}</dd>
            </div>
            <div>
              <dt>立会い者</dt>
              <dd>{inspection.attendant}</dd>
            </div>
            <div>
              <dt>入居日 → 退去日</dt>
              <dd>
                {inspection.moveIn} → {inspection.moveOut}
              </dd>
            </div>
            <div>
              <dt>入居期間</dt>
              <dd>
                {tenureLabel(months)} <span className="muted">（{months}か月）</span>
              </dd>
            </div>
            <div>
              <dt>敷金</dt>
              <dd>{money(inspection.deposit)}</dd>
            </div>
            <div>
              <dt>退去からの経過</dt>
              <dd>{elapsed >= 0 ? `${elapsed}日` : `退去まで${-elapsed}日`}</dd>
            </div>
          </dl>
        </section>
        <section className="panel progress-summary">
          <span className="eyebrow">CHECK PROGRESS</span>
          <h2>部屋の確認状況</h2>
          <strong className="large-number">
            {checked.percent}
            <small>%</small>
          </strong>
          <div className="progress-track">
            <span style={{ width: `${checked.percent}%` }} />
          </div>
          <p>
            {checked.checked} / {checked.total}項目を確認済み
          </p>
          <div className="summary-tags">
            <span>要確認 {issues.length}項目</span>
            <span>負担保留 {issues.filter((item) => item.burden === "保留").length}項目</span>
          </div>
        </section>
      </div>
      <section className="panel burden-summary" aria-labelledby="burden-summary-title">
        <div className="section-heading">
          <h2 id="burden-summary-title">負担区分の内訳</h2>
          <AppLink href={`/inspections/${inspection.id}/estimate`}>見積の明細へ →</AppLink>
        </div>
        <dl className="burden-totals">
          {burdens.map((burden) => (
            <div key={burden.label}>
              <dt>
                {burden.label} <small>{burden.count}件</small>
              </dt>
              <dd>{money(burden.amount)}</dd>
            </div>
          ))}
        </dl>
        <p className="muted">
          税抜・確認済みの要対応項目とクリーニングを集計。件数は負担額がある明細数です。分担する明細は貸主・借主の両方に含み、保留は請求額に含みません。
        </p>
      </section>
      <div className="section-heading">
        <div>
          <h2>部屋ごとのチェック</h2>
          <p className="muted">部屋を選んで、状態・原因・写真を記録します。</p>
        </div>
        <span className="count-label">{inspection.rooms.length} ROOMS</span>
      </div>
      <div className="rooms-grid">
        {inspection.rooms.map((room, index) => {
          const result = progress([room]);
          return (
            <AppLink
              className="panel room-card"
              key={room.id}
              href={`/inspections/${inspection.id}/rooms/${room.id}`}
            >
              <div className="room-card-top">
                <span className="room-number">{String(index + 1).padStart(2, "0")}</span>
                <span className={`badge ${result.percent === 100 ? "drafted" : "scheduled"}`}>
                  {result.percent === 100 ? "✓ 確認済み" : "未完了"}
                </span>
              </div>
              <h3>{room.name}</h3>
              <p>
                {result.checked} / {result.total}項目{" "}
                <span>写真{room.items.flatMap((item) => item.photos).length}枚</span>
              </p>
              <div className="progress-track">
                <span style={{ width: `${result.percent}%` }} />
              </div>
              <span className="room-open">
                チェックを開く <Icon name="arrow" size={18} />
              </span>
            </AppLink>
          );
        })}
      </div>
      <div className="action-bar">
        <span>
          {checked.percent === 100
            ? "すべての項目を確認しました。"
            : "未確認の項目をチェックしましょう。"}
        </span>
        <div className="button-row">
          {inspection.status === "予定" && (
            <button disabled={checked.percent !== 100} onClick={complete}>
              立会いを実施済みにする
            </button>
          )}
          <AppLink href={`/inspections/${inspection.id}/estimate`} className="button primary">
            精算見積の下書きへ <Icon name="arrow" />
          </AppLink>
        </div>
      </div>
    </>
  );
}
