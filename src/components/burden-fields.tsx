import { CAUSES, suggestBurden, tenantRatio } from "@/lib/burden";
import type { Burden, Cause, Item } from "@/lib/types";

export function BurdenFields({
  item,
  months,
  onChange,
}: {
  item: Item;
  months: number;
  onChange: (patch: Partial<Item>) => void;
}) {
  const ratio = tenantRatio(item, months);
  return (
    <div className="burden-fields">
      <label>
        原因の区分
        <select
          value={item.cause}
          onChange={(event) => {
            const cause = event.target.value as Cause;
            onChange({ cause, burden: suggestBurden(cause), ratio: null });
          }}
        >
          {CAUSES.map((cause) => (
            <option key={cause}>{cause}</option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          負担区分（上書き可）
          <select
            value={item.burden}
            onChange={(event) => onChange({ burden: event.target.value as Burden })}
          >
            {["貸主", "借主", "保留"].map((burden) => (
              <option key={burden}>{burden}</option>
            ))}
          </select>
        </label>
        <label>
          借主負担割合（%）
          <input
            type="number"
            min="0"
            max="100"
            step="0.0001"
            placeholder="自動計算"
            disabled={item.burden !== "借主"}
            value={item.ratio === null ? "" : Number((item.ratio * 100).toFixed(4))}
            onChange={(event) =>
              onChange({
                ratio:
                  event.target.value === ""
                    ? null
                    : Math.min(1, Math.max(0, Number(event.target.value) / 100)),
              })
            }
          />
        </label>
      </div>
      <div className="calculation-note">
        <strong>
          {item.burden === "保留"
            ? "負担区分は保留中です"
            : `借主 ${(ratio * 100).toFixed(4)}% / 貸主 ${((1 - ratio) * 100).toFixed(4)}%`}
        </strong>
        <p>
          {item.depreciates
            ? `6年（72か月）で残存1円。入居 ${months}か月。`
            : "この項目には6年償却を適用しません。"}
        </p>
        {item.depreciates && (
          <p>参考割合 = [1円 ＋ (工事費 − 1円) × max(0, 1 − 入居月数 ÷ 72)] ÷ 工事費</p>
        )}
        <small>
          工事費 = 単価 ×
          数量。1円未満の工事費は全額を上限とします。通常損耗は貸主負担。自動計算は法的判断ではありません。
        </small>
        {item.ratio !== null && (
          <button className="text-button" onClick={() => onChange({ ratio: null })}>
            上書きを解除して自動計算に戻す
          </button>
        )}
      </div>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={item.depreciates}
          onChange={(event) => onChange({ depreciates: event.target.checked, ratio: null })}
        />
        6年で残存1円の計算を適用（クロス・CF等）
      </label>
      <div className="form-grid three">
        <label>
          単価（税抜・円）
          <input
            type="number"
            min="0"
            max="1000000"
            step="1"
            value={item.price}
            onChange={(event) => onChange({ price: Number(event.target.value) })}
          />
        </label>
        <label>
          数量
          <input
            type="number"
            min="0"
            max="10000"
            step="0.01"
            value={item.quantity}
            onChange={(event) => onChange({ quantity: Number(event.target.value) })}
          />
        </label>
        <label>
          単位
          <select value={item.unit} onChange={(event) => onChange({ unit: event.target.value })}>
            <option>㎡</option>
            <option>枚</option>
            <option>箇所</option>
          </select>
        </label>
      </div>
    </div>
  );
}
