import { AppLink, useStore } from "./store";
import { PhotoGallery } from "./photo-gallery";
import { calculateEstimate, money, photoPages } from "@/lib/estimate";
import { estimateCsv, estimateFilename } from "@/lib/csv";
import { download } from "@/lib/backup";
import { tenancyMonths, tenureLabel } from "@/lib/dates";
import { progress } from "@/lib/rooms";
import type { Inspection } from "@/lib/types";

export function EstimateView({ inspection }: { inspection: Inspection }) {
  const { updateInspection, photos, notify } = useStore();
  const estimate = calculateEstimate(inspection);
  const refs = new Set(
    inspection.rooms.flatMap((room) => room.items.flatMap((item) => item.photos)),
  );
  const pages = photoPages(photos.filter((photo) => refs.has(photo.id)));
  const checked = progress(inspection.rooms);
  function saveDraft() {
    if (inspection.status === "予定" || checked.percent < 100) {
      notify("すべての項目を確認し、概要画面で立会いを実施済みにしてください。");
      return;
    }
    if (updateInspection({ ...inspection, status: "見積下書き済み" }))
      notify("見積の下書きを保存しました。負担保留の項目は引き続き確認してください。");
  }
  return (
    <>
      <div className="no-print">
        <AppLink className="back-link" href={`/inspections/${inspection.id}`}>
          ← 立会いの概要
        </AppLink>
        <div className="page-heading">
          <div>
            <span className="eyebrow">SETTLEMENT DRAFT</span>
            <h1>精算見積の下書き</h1>
            <p>負担の根拠と金額を確認して、精算の準備を。</p>
          </div>
          <div className="button-row">
            <button
              onClick={() =>
                download(
                  estimateCsv(inspection),
                  estimateFilename(inspection, new Date()),
                  "text/csv;charset=utf-8",
                )
              }
            >
              CSV出力
            </button>
            <button onClick={() => window.print()}>印刷・PDF保存</button>
            <button className="primary" onClick={saveDraft}>
              下書きを保存
            </button>
          </div>
        </div>
        <section className="panel">
          <h2>ハウスクリーニング</h2>
          <div className="form-grid">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={inspection.cleaningClause}
                onChange={(event) =>
                  updateInspection({
                    ...inspection,
                    status: inspection.status === "見積下書き済み" ? "実施済み" : inspection.status,
                    cleaningClause: event.target.checked,
                  })
                }
              />
              借主負担の有効な特約を確認した
            </label>
            <label>
              金額（税抜・円）
              <input
                type="number"
                min="0"
                max="1000000"
                value={inspection.cleaningPrice}
                onChange={(event) =>
                  updateInspection({
                    ...inspection,
                    status: inspection.status === "見積下書き済み" ? "実施済み" : inspection.status,
                    cleaningPrice: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <p className="muted">
            特約がない場合は貸主負担です。金額・範囲の妥当性と特約の有効性は担当者が確認してください。
          </p>
        </section>
        {checked.percent < 100 && (
          <p className="warning">
            未確認が{checked.total - checked.checked}
            項目あります。現時点の確認済み項目だけを集計しています。
          </p>
        )}
        {estimate.pending > 0 && (
          <p className="warning">
            負担保留 {money(estimate.pending)}
            （税抜）は請求額に含めていません。返金・追加請求は暫定額です。
          </p>
        )}
      </div>
      <article className="estimate-paper">
        <section className="print-cover">
          <div className="document-heading">
            <div>
              <span className="eyebrow">MOVE-OUT SETTLEMENT</span>
              <h2>原状回復 精算見積書</h2>
            </div>
            <span className="draft-stamp">下書き</span>
          </div>
          <p className="document-property">
            {inspection.property} {inspection.unit}号室
          </p>
          <dl className="details">
            <div>
              <dt>立会い日</dt>
              <dd>
                {inspection.date} {inspection.time}
              </dd>
            </div>
            <div>
              <dt>借主名</dt>
              <dd>{inspection.tenant} 様（架空）</dd>
            </div>
            <div>
              <dt>立会い者</dt>
              <dd>{inspection.attendant}</dd>
            </div>
            <div>
              <dt>入居期間</dt>
              <dd>
                {inspection.moveIn} 〜 {inspection.moveOut} /{" "}
                {tenureLabel(tenancyMonths(inspection.moveIn, inspection.moveOut))}
              </dd>
            </div>
          </dl>
          <div className="settlement-summary">
            <span>{estimate.balance >= 0 ? "敷金からの返金見込" : "追加請求見込"}</span>
            <strong>{money(Math.abs(estimate.balance))}</strong>
            <small>
              敷金 {money(inspection.deposit)} − 借主負担（税込）{money(estimate.tenantTotal)}
            </small>
          </div>
          <div className="print-only">
            <p>みずほし不動産管理（架空）</p>
            <p>デモ用の架空データです。担当者確認前の下書きです。</p>
            <p>
              負担保留：{money(estimate.pending)}（税抜） / 未確認：
              {checked.total - checked.checked}項目
            </p>
            <p>
              計算と負担区分は参考値です。契約内容・現況・双方の確認を踏まえた法的判断を代替しません。
            </p>
          </div>
        </section>
        <section className="print-details">
          <h3>
            精算明細 <small>金額は税抜</small>
          </h3>
          <div className="table-scroll">
            <table className="estimate-table">
              <thead>
                <tr>
                  <th>項目</th>
                  <th>単価 × 数量</th>
                  <th>借主割合</th>
                  <th>借主負担</th>
                  <th>貸主負担</th>
                  <th>保留</th>
                </tr>
              </thead>
              <tbody>
                {estimate.lines.map((line, index) => (
                  <tr key={index}>
                    <td>{line.label}</td>
                    <td>
                      {money(line.price)} × {line.quantity}
                      {line.unit}
                    </td>
                    <td>{(line.ratio * 100).toFixed(4)}%</td>
                    <td>{money(line.tenant)}</td>
                    <td>{money(line.landlord)}</td>
                    <td>{line.pending ? money(line.pending) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3}>小計</th>
                  <td>{money(estimate.tenantSubtotal)}</td>
                  <td>{money(estimate.landlordSubtotal)}</td>
                  <td>{money(estimate.pending)}</td>
                </tr>
                <tr>
                  <th colSpan={3}>消費税10%（切り捨て）</th>
                  <td>{money(estimate.tenantTax)}</td>
                  <td>{money(estimate.landlordTax)}</td>
                  <td>—</td>
                </tr>
                <tr>
                  <th colSpan={3}>税込合計</th>
                  <td>{money(estimate.tenantTotal)}</td>
                  <td>{money(estimate.landlordTotal)}</td>
                  <td>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="document-note">
            工事費（単価×数量）の1円未満を切り捨て、借主負担も1円未満切り捨て。差額を貸主負担とします。消費税は負担者別の小計に対して計算します。
          </p>
          <p className="document-note">
            クロス・CF等：割合 = [1円 + (工事費 − 1円) × max(0, 1 − 入居月数 ÷ 72)] ÷
            工事費。担当者の上書き値を優先します。
          </p>
          <p className="document-note">
            国土交通省「原状回復をめぐるトラブルとガイドライン」の考え方を参考にした簡易計算です。入居前の使用年数・施工範囲・特約などは別途確認してください。
          </p>
          <p className="document-note">
            負担保留 {money(estimate.pending)}（税抜）は請求対象外。デモ用の架空データです。
          </p>
        </section>
      </article>
      {pages.map((page, index) => (
        <section className="panel photo-print-page" key={index}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                PHOTO RECORDS {index + 1} / {pages.length}
              </span>
              <h2>記録写真</h2>
            </div>
            <span>
              {inspection.property} {inspection.unit}号室
            </span>
          </div>
          <PhotoGallery photos={page} />
          <p className="muted">デモ用の架空データです。イラストは実在写真ではありません。</p>
        </section>
      ))}
    </>
  );
}
