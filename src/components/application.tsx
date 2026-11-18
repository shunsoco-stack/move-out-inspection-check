"use client";

import { StoreProvider, AppLink, useStore } from "./store";
import { Icon } from "./icons";
import { InspectionList } from "./inspection-list";
import { InspectionOverview } from "./inspection-overview";
import { RoomCheck } from "./room-check";
import { EstimateView } from "./estimate-view";
import { SettingsView } from "./settings-view";
import { BackupView, AboutView } from "./utility-views";
import { japanDate } from "@/lib/dates";

const NAV = [
  { href: "/", label: "立会い一覧", icon: "list" },
  { href: "/settings", label: "チェック設定", icon: "settings" },
  { href: "/backup", label: "バックアップ", icon: "backup" },
  { href: "/about", label: "このデモについて", icon: "about" },
] as const;

function Workspace() {
  const { database, path, now, message, notify } = useStore();
  const segments = path.split("/").filter(Boolean);
  const inspection = database.inspections.find((entry) => entry.id === segments[1]);
  let screen = <InspectionList />;
  if (segments[0] === "settings") screen = <SettingsView />;
  else if (segments[0] === "backup") screen = <BackupView />;
  else if (segments[0] === "about") screen = <AboutView />;
  else if (segments[0] === "inspections") {
    if (!inspection)
      screen = (
        <div className="panel empty">
          <h1>立会いが見つかりません</h1>
          <p>このブラウザに保存されているデータを確認してください。</p>
          <AppLink href="/" className="button primary">
            一覧に戻る
          </AppLink>
        </div>
      );
    else if (segments[2] === "estimate")
      screen = <EstimateView key={inspection.id} inspection={inspection} />;
    else if (segments[2] === "rooms")
      screen = (
        <RoomCheck
          key={`${inspection.id}-${segments[3]}`}
          inspection={inspection}
          roomId={segments[3]}
        />
      );
    else screen = <InspectionOverview key={inspection.id} inspection={inspection} />;
  } else if (segments.length)
    screen = (
      <div className="panel empty">
        <h1>ページが見つかりません</h1>
        <AppLink href="/">立会い一覧へ</AppLink>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar no-print">
        <AppLink href="/" className="brand">
          <span className="brand-mark">
            <Icon name="check" size={25} />
          </span>
          <span>
            退去立会い<span className="brand-sub">原状回復チェック</span>
          </span>
        </AppLink>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="メインナビゲーション">
          {NAV.map((nav) => (
            <AppLink
              key={nav.href}
              href={nav.href}
              className={`nav-link ${(nav.href === "/" ? segments.length === 0 || segments[0] === "inspections" : path === nav.href) ? "active" : ""}`}
            >
              <Icon name={nav.icon} />
              <span>{nav.label}</span>
            </AppLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="local-dot" /> この端末に自動保存<p>みずほし不動産管理（架空）</p>
          <small>立会いの記録を、確かな次の一歩に。</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar no-print">
          <span className="topbar-title">
            みずほし不動産管理 <span className="muted">/ 退去立会い</span>
          </span>
          <div className="topbar-right">
            <span className="demo-pill">デモ用の架空データです</span>
            <span className="avatar">三</span>
          </div>
        </header>
        <main className="main-content" id="main">
          <div className="page-meta no-print">
            <span>INSPECTION WORKSPACE</span>
            <span>
              {japanDate(now)} <span className="muted">JST</span>
            </span>
          </div>
          {screen}
        </main>
        <footer className="footer no-print">
          デモ用の架空データです。記録と写真は、このブラウザに保存されます。
        </footer>
      </div>
      {message && (
        <div className="toast no-print" role="status">
          <span>{message}</span>
          <button aria-label="通知を閉じる" onClick={() => notify("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export function Application() {
  return (
    <StoreProvider>
      <Workspace />
    </StoreProvider>
  );
}
