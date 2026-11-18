import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "退去立会い・原状回復チェック",
  description:
    "部屋ごとの状態と写真を記録し、負担区分から精算見積の下書きまで。みずほし不動産管理の架空データによるデモです。",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#244e44" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
