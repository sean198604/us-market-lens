import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./components/app-shell";

export const metadata: Metadata = {
  title: "US Market Lens｜美国官方进口数据",
  description: "无需登录，在局域网查看美国官方年度进口额、月度更新与 HS 品类结构。",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className="antialiased"><AppShell>{children}</AppShell></body></html>;
}
