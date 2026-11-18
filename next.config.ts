import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.MOC_STATIC_EXPORT === "1" ? "export" : undefined,
  ...(process.env.MOC_STATIC_EXPORT !== "1"
    ? {
        async rewrites() {
          return [{ source: "/inspections/:path*", destination: "/" }];
        },
      }
    : {}),
  turbopack: {
    // 親フォルダのlockfileをルートと誤認して入れ子の .next を作らないよう、
    // このプロジェクト直下をルートに固定する。
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
