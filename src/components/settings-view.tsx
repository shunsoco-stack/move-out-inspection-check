import { useState } from "react";
import { useStore } from "./store";
import type { Template } from "@/lib/types";

export function SettingsView() {
  const { database, update, notify } = useStore();
  const [settings, setSettings] = useState(() => structuredClone(database.settings));
  function patch(id: string, values: Partial<Template>) {
    setSettings({
      ...settings,
      templates: settings.templates.map((entry) =>
        entry.id === id ? { ...entry, ...values } : entry,
      ),
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">WORKSPACE SETTINGS</span>
          <h1>チェック設定</h1>
          <p>新しい立会いに使うチェック項目と、単価の既定値。</p>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (update({ ...database, settings }))
            notify("設定を保存しました。次回の立会い登録から適用します。");
        }}
      >
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>チェック項目テンプレート・単価表</h2>
              <p className="muted">
                各部屋に展開されます。既存の記録は個別画面で調整してください。
              </p>
            </div>
          </div>
          <div className="template-list">
            {settings.templates.map((template) => (
              <div className="template-card" key={template.id}>
                <div className="form-grid three">
                  <label>
                    部位
                    <select
                      value={template.part}
                      onChange={(event) => patch(template.id, { part: event.target.value })}
                    >
                      {["床", "壁", "天井", "建具", "設備"].map((part) => (
                        <option key={part}>{part}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    チェック項目
                    <input
                      required
                      maxLength={100}
                      value={template.name}
                      onChange={(event) => patch(template.id, { name: event.target.value })}
                    />
                  </label>
                  <label>
                    単価（税抜・円）
                    <input
                      type="number"
                      required
                      min="0"
                      max="1000000"
                      value={template.price}
                      onChange={(event) =>
                        patch(template.id, { price: Number(event.target.value) })
                      }
                    />
                  </label>
                </div>
                <div className="template-options">
                  <label>
                    単位
                    <select
                      value={template.unit}
                      onChange={(event) => patch(template.id, { unit: event.target.value })}
                    >
                      <option>㎡</option>
                      <option>枚</option>
                      <option>箇所</option>
                    </select>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={template.depreciates}
                      onChange={(event) =>
                        patch(template.id, { depreciates: event.target.checked })
                      }
                    />
                    6年で残存1円（クロス・CF等）
                  </label>
                  <button
                    type="button"
                    className="danger-text"
                    disabled={settings.templates.length === 1}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        templates: settings.templates.filter((entry) => entry.id !== template.id),
                      })
                    }
                  >
                    項目を削除
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={settings.templates.length >= 30}
            onClick={() =>
              setSettings({
                ...settings,
                templates: [
                  ...settings.templates,
                  {
                    id: crypto.randomUUID(),
                    name: "追加のチェック項目",
                    part: "設備",
                    unit: "箇所",
                    price: 0,
                    depreciates: false,
                  },
                ],
              })
            }
          >
            ＋ チェック項目を追加
          </button>
        </section>
        <section className="panel">
          <h2>ハウスクリーニング・特約の既定</h2>
          <div className="form-grid">
            <label>
              クリーニング単価（税抜・円）
              <input
                type="number"
                required
                min="0"
                max="1000000"
                value={settings.cleaningPrice}
                onChange={(event) =>
                  setSettings({ ...settings, cleaningPrice: Number(event.target.value) })
                }
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.cleaningClause}
                onChange={(event) =>
                  setSettings({ ...settings, cleaningClause: event.target.checked })
                }
              />
              借主負担の特約ありを既定にする
            </label>
          </div>
          <p className="muted">
            特約は立会いごとに内容と有効性を確認してください。既定値だけで借主負担を確定しません。
          </p>
        </section>
        <button className="primary" type="submit">
          設定を保存する
        </button>
      </form>
    </>
  );
}
