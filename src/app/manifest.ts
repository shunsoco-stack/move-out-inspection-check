import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "退去立会い・原状回復チェック",
    short_name: "退去立会い",
    description: "現地の確認から精算見積の下書きまで",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8f7",
    theme_color: "#244e44",
    lang: "ja",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
