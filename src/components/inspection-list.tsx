import { useState } from "react";
import { AppLink, useStore } from "./store";
import { Icon } from "./icons";
import { InspectionForm } from "./inspection-form";
import { daysSince, tenancyMonths, tenureLabel } from "@/lib/dates";
import { progress } from "@/lib/rooms";

export function InspectionList() {
  const { database, now } = useStore();
  const [filter, setFilter] = useState("すべて");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const inspections = database.inspections;
  const scheduled = inspections.filter((entry) => entry.status === "予定");
  const pending = inspections.filter((entry) => entry.status === "実施済み");
  const drafted = inspections.filter((entry) => entry.status === "見積下書き済み");
  const visible = inspections.filter(
    (entry) =>
      (filter === "すべて" || entry.status === filter) &&
      `${entry.property} ${entry.unit} ${entry.tenant}`.includes(search),
  );
  const upcoming = [...scheduled].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  )[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>立会い一覧</h1>
          <p>現地の確認から、精算の下書きまで。一件ずつ、丁寧に。</p>
        </div>
        <button className="primary" onClick={() => setShowForm(!showForm)}>
          ＋ 立会いを登録
        </button>
      </div>
      {showForm && <InspectionForm onClose={() => setShowForm(false)} />}
      <div className="stats-grid">
        <button className="stat-card" onClick={() => setFilter("すべて")}>
          <span>登録されている立会い</span>
          <strong>
            {inspections.length}
            <small>件</small>
          </strong>
          <span className="stat-foot">
            すべての記録 <Icon name="arrow" size={16} />
          </span>
        </button>
        <button className="stat-card" onClick={() => setFilter("予定")}>
          <span>
            <i className="dot blue" />
            これからの立会い
          </span>
          <strong>
            {scheduled.length}
            <small>件</small>
          </strong>
          <span className="stat-foot">
            現地チェックの準備 <Icon name="arrow" size={16} />
          </span>
        </button>
        <button className="stat-card" onClick={() => setFilter("実施済み")}>
          <span>
            <i className="dot amber" />
            見積の作成待ち
          </span>
          <strong>
            {pending.length}
            <small>件</small>
          </strong>
          <span className="stat-foot">
            チェック結果から作成 <Icon name="arrow" size={16} />
          </span>
        </button>
        <button className="stat-card" onClick={() => setFilter("見積下書き済み")}>
          <span>
            <i className="dot green" />
            見積下書き済み
          </span>
          <strong>
            {drafted.length}
            <small>件</small>
          </strong>
          <span className="stat-foot">
            負担区分・金額を確認 <Icon name="arrow" size={16} />
          </span>
        </button>
      </div>
      {upcoming && (
        <div className="next-inspection">
          <div className="next-icon">
            <Icon name="home" size={24} />
          </div>
          <div>
            <span className="eyebrow">NEXT INSPECTION</span>
            <p>
              <strong>次の立会い</strong>
              <span>
                {upcoming.date}　{upcoming.time}
              </span>
              <span>
                {upcoming.property} {upcoming.unit}号室
              </span>
            </p>
          </div>
          <AppLink href={`/inspections/${upcoming.id}`} className="text-link">
            準備を確認 <Icon name="arrow" size={18} />
          </AppLink>
        </div>
      )}
      <section className="panel list-panel">
        <div className="list-toolbar">
          <div className="tabs" aria-label="ステータスで絞り込み">
            {["すべて", "予定", "実施済み", "見積下書き済み"].map((status) => (
              <button
                key={status}
                className={filter === status ? "selected" : ""}
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
              >
                {status}
                <span>
                  {status === "すべて"
                    ? inspections.length
                    : inspections.filter((entry) => entry.status === status).length}
                </span>
              </button>
            ))}
          </div>
          <label className="search">
            <span className="visually-hidden">物件・号室・借主名で検索</span>
            <input
              placeholder="物件名・号室で検索"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="table-caption">
          <span>{visible.length}件の立会い</span>
          <span>立会いの記録と進み具合</span>
        </div>
        <div className="inspection-table">
          <div className="inspection-table-head">
            <span>物件 / 号室</span>
            <span>立会い日時</span>
            <span>ステータス</span>
            <span>チェック状況</span>
            <span />
          </div>
          {visible.map((inspection) => {
            const checked = progress(inspection.rooms);
            const elapsed = daysSince(inspection.moveOut, now);
            return (
              <AppLink
                key={inspection.id}
                href={`/inspections/${inspection.id}`}
                className="inspection-row"
              >
                <div className="property-cell">
                  <span className="property-icon">
                    <Icon name="home" size={22} />
                  </span>
                  <div>
                    <strong>{inspection.property}</strong>
                    <p>
                      {inspection.unit}号室 <span className="divider">/</span> {inspection.plan}{" "}
                      <span className="divider">/</span> {inspection.tenant}
                    </p>
                    <small>
                      入居 {tenureLabel(tenancyMonths(inspection.moveIn, inspection.moveOut))}
                    </small>
                  </div>
                </div>
                <div className="date-cell">
                  <strong>{inspection.date}</strong>
                  <span>
                    {inspection.time} <span className="muted">立会い</span>
                  </span>
                  <small>{elapsed >= 0 ? `退去から${elapsed}日` : `退去まで${-elapsed}日`}</small>
                </div>
                <div>
                  <span
                    className={`badge ${inspection.status === "予定" ? "scheduled" : inspection.status === "実施済み" ? "pending" : "drafted"}`}
                  >
                    {inspection.status === "見積下書き済み" && "✓ "}
                    {inspection.status}
                  </span>
                </div>
                <div className="progress-cell">
                  <div>
                    <strong>
                      {checked.checked}
                      <small> / {checked.total}</small>
                    </strong>
                    <span>{checked.percent}%</span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${checked.percent}%` }} />
                  </div>
                  <small>
                    {inspection.rooms.length}部屋 · 写真
                    {
                      inspection.rooms.flatMap((room) => room.items.flatMap((item) => item.photos))
                        .length
                    }
                    枚
                  </small>
                </div>
                <span className="row-arrow">
                  <Icon name="arrow" />
                </span>
              </AppLink>
            );
          })}
        </div>
        {!visible.length && (
          <div className="empty">
            <p>該当する立会いはありません。</p>
            <button
              onClick={() => {
                setFilter("すべて");
                setSearch("");
              }}
            >
              絞り込みを解除
            </button>
          </div>
        )}
      </section>
      <div className="guidance">
        <Icon name="about" />
        <p>
          <strong>原状回復の負担は、原因と経過年数から。</strong>
          <br />
          通常損耗・経年劣化と借主の故意・過失を分けて記録しましょう。負担割合の自動計算は参考値です。
        </p>
        <AppLink href="/about">このデモについて ↗</AppLink>
      </div>
    </>
  );
}
