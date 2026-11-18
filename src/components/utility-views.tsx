import { useState } from "react";
import { useStore } from "./store";
import { createBackup, download, validateBackup } from "@/lib/backup";
import { japanDate } from "@/lib/dates";

export function BackupView() {
  const { database, photos, restore, notify } = useStore();
  const [busy, setBusy] = useState(false);
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 150 * 1024 * 1024) throw new Error("150MB以下のJSONを選んでください。");
      const backup = validateBackup(JSON.parse(await file.text()));
      if (
        !window.confirm(
          `${backup.database.inspections.length}件の立会い・${backup.photos.length}枚の写真で、この端末のデータを置き換えますか？`,
        )
      )
        return;
      await restore(backup.database, backup.photos);
    } catch (error) {
      notify(error instanceof Error ? error.message : "バックアップを読み込めませんでした。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR LOCAL DATA</span>
          <h1>バックアップ</h1>
          <p>記録と写真をひとつのファイルに。大切な確認結果を手元に残す。</p>
        </div>
      </div>
      <div className="overview-grid">
        <section className="panel">
          <span className="feature-number">01</span>
          <h2>データを書き出す</h2>
          <p>
            立会い、チェック結果、設定、写真のすべてをJSONで保存します。写真はbase64形式で含まれます。
          </p>
          <p className="muted">現在 {database.inspections.length}件の立会いを保存しています。</p>
          <button
            className="primary"
            onClick={() => {
              try {
                const backup = createBackup(database, photos, new Date());
                download(
                  JSON.stringify(backup),
                  `退去立会いバックアップ_${japanDate(new Date())}.json`,
                  "application/json",
                );
                notify("バックアップを書き出しました。");
              } catch (error) {
                notify(error instanceof Error ? error.message : "書き出しに失敗しました。");
              }
            }}
          >
            バックアップを書き出す（JSON）
          </button>
        </section>
        <section className="panel">
          <span className="feature-number">02</span>
          <h2>データを読み込む</h2>
          <p>
            このアプリで書き出したJSONを選んでください。形式と写真を検証した後、現在のデータを置き換えます。
          </p>
          <p className="muted">読み込み前に、今の記録の書き出しをおすすめします。</p>
          <div className="file-control">
            <input
              className="visually-hidden"
              id="backup-import"
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(event) => {
                void importFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <label className="button" htmlFor="backup-import">
              バックアップを読み込む（JSON）
            </label>
          </div>
          {busy && <p role="status">データを確認しています…</p>}
        </section>
      </div>
      <div className="guidance">
        <p>
          ブラウザのデータ削除や端末の変更では、保存した記録が失われます。バックアップは別の安全な場所に保管してください。
        </p>
      </div>
    </>
  );
}

export function AboutView() {
  const { reset, notify } = useStore();
  const [busy, setBusy] = useState(false);
  async function resetData() {
    if (!window.confirm("登録・編集した記録と写真を消去して、既定の架空データに戻しますか？"))
      return;
    setBusy(true);
    try {
      await reset();
    } catch (error) {
      notify(error instanceof Error ? error.message : "初期化に失敗しました。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ABOUT THIS DEMO</span>
          <h1>このデモについて</h1>
          <p>退去の現場で、確認した事実を整理するためのワークスペース。</p>
        </div>
      </div>
      <div className="prose panel">
        <h2>デモ用の架空データです</h2>
        <p>
          「みずほし不動産管理（架空）」の担当者が使う、退去立会い・原状回復チェックのデモです。物件・人名・金額・記録はすべて架空で、サンプル画像はcanvasで描いたイラストです。
        </p>
        <h2>保存先とプライバシー</h2>
        <p>
          立会い情報と設定はlocalStorage（moc:v1）、写真はIndexedDB（moc-photos）に保存します。外部API、メール送信、電子署名の機能はありません。端末・ブラウザを変えても自動では同期されません。同じデータを複数タブで同時編集せず、バックアップを定期的に保存してください。
        </p>
        <h2>負担区分・割合は参考値です</h2>
        <p>
          通常損耗・経年劣化は貸主、借主の故意・過失・善管注意義務違反は借主という初期値を提案します。日焼けしたクロスは通常損耗、タバコのヤニやペットの傷は借主側の原因を検討する例です。原因が不明な場合は保留とし、請求額から除きます。
        </p>
        <p>
          クロス・クッションフロア等は6年（72か月）で残存1円となる簡易計算です。入居期間を使用年数の代わりに用いるため、入居前の施工時期は別途確認してください。フローリング全面張替えなど、6年を適用しない項目はチェック画面で適用を解除できます。
        </p>
        <p>
          国土交通省「原状回復をめぐるトラブルとガイドライン」の考え方を参考にしています。契約内容、施工範囲、故意・過失の有無、特約の有効性等を判断するものではありません。最終判断は担当者が確認し、区分と割合を上書きしてください。
        </p>
        <h2>このアプリの範囲</h2>
        <p>
          部屋の状態と写真の記録、負担区分の整理、精算見積の下書きに絞っています。契約・更新・解約通知、検品サイン、修理の手配や進捗、募集・家賃管理は扱いません。
        </p>
        <h2>既定データに戻す</h2>
        <p>
          5件の立会いと24枚のサンプル画像を、現在の日本時間から生成し直します。編集内容は置き換わります。
        </p>
        <button className="danger-button" disabled={busy} onClick={() => void resetData()}>
          {busy ? "データを戻しています…" : "既定データに戻す"}
        </button>
      </div>
    </>
  );
}
