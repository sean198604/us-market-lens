"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Database, Filter, Search, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HS_CHAPTERS, usdCompact, usdFull } from "@/lib/trade";
import { useTradePartners } from "@/hooks/use-trade-partners";

type QueryResult = {
  source: string;
  quality: string;
  partnerName: string;
  period: string;
  generatedAt: string;
  rows: Array<{ hsCode: string; hsName: string; valueUsd: number; found: boolean; aggregation: boolean }>;
};

export default function SearchPage() {
  const partners = useTradePartners();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [partner, setPartner] = useState("156");
  const [period, setPeriod] = useState("2025");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const matches = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return HS_CHAPTERS.slice(0, 20);
    return HS_CHAPTERS.filter((item) => item.code.includes(value) || item.name.toLowerCase().includes(value)).slice(0, 20);
  }, [query]);

  async function runSearch() {
    const raw = query.trim();
    const codes = /^\d+(?:\s*,\s*\d+)*$/.test(raw)
      ? raw.split(",").map((item) => item.trim())
      : matches.map((item) => item.code);
    if (!codes.length) { setError("没有匹配的 HS 品类"); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/comtrade/query?partner=${partner}&period=${period}&hs=${encodeURIComponent(codes.join(","))}`);
      const payload = await response.json() as QueryResult & { error?: string; detail?: string };
      if (!response.ok) throw new Error(payload.detail || payload.error || "查询失败");
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "查询失败");
    } finally { setLoading(false); }
  }

  function exportCsv() {
    if (!result) return;
    const rows = [["period", "origin", "hs_code", "category", "value_usd", "source"], ...result.rows.map((row) => [result.period, result.partnerName, row.hsCode, row.hsName, row.valueUsd, result.source])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `us-import-${result.partnerName}-${result.period}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">DATA EXPLORER</p><h1 className="mt-1 text-2xl font-bold tracking-tight">官方贸易数据检索</h1><p className="mt-2 text-sm text-slate-500">按 HS 编码、品类关键词、来源地和年度检索美国进口额。</p></div><Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-800"><ShieldCheck className="mr-1 size-3.5" />结果可追溯至 UN Comtrade</Badge></div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_170px_130px_auto]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void runSearch()} placeholder="输入 84、85 或机械、家具等关键词" className="h-11 pl-9" /></div>
          <Select value={partner} onValueChange={setPartner}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent className="max-h-[320px]">{partners.map((item) => <SelectItem key={item.code} value={item.code}>来源：{item.name}</SelectItem>)}</SelectContent></Select>
          <Select value={period} onValueChange={setPeriod}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{[2025,2024,2023,2022,2021].map((year) => <SelectItem key={year} value={String(year)}>{year} 年</SelectItem>)}</SelectContent></Select>
          <Button className="h-11 bg-blue-600 px-6 hover:bg-blue-700" onClick={() => void runSearch()} disabled={loading}><Filter />{loading ? "查询中" : "执行查询"}</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{matches.slice(0, 10).map((item) => <button key={item.code} onClick={() => setQuery(item.code)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><span className="font-mono font-semibold">{item.code}</span> {item.name}</button>)}</div>
        {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3"><div><p className="font-bold">查询结果</p><p className="mt-1 text-xs text-slate-500">{result ? `${result.period} · 美国自${result.partnerName}进口` : "输入条件后执行查询"}</p></div>{result && <Button variant="outline" size="sm" onClick={exportCsv}><ArrowDownToLine />导出 CSV</Button>}</div>
          {!result ? <div className="grid min-h-72 place-items-center px-6 text-center"><div><Database className="mx-auto size-9 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">等待查询</p><p className="mt-1 text-xs text-slate-400">可输入单个编码、逗号分隔的多个编码，或中文关键词。</p></div></div> : <Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-5">HS 编码</TableHead><TableHead>品类</TableHead><TableHead>数据状态</TableHead><TableHead className="text-right">进口额</TableHead><TableHead className="pr-5 text-right">分析</TableHead></TableRow></TableHeader><TableBody>{result.rows.map((row) => <TableRow key={row.hsCode}><TableCell className="pl-5 font-mono font-semibold">{row.hsCode}</TableCell><TableCell>{row.hsName}</TableCell><TableCell>{row.found ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">已发布</Badge> : <Badge variant="secondary">无记录</Badge>}</TableCell><TableCell className="text-right"><p className="font-semibold">{usdCompact(row.valueUsd)}</p><p className="mt-0.5 text-xs text-slate-400">{usdFull(row.valueUsd)}</p></TableCell><TableCell className="pr-5 text-right"><Button asChild variant="ghost" size="sm" className="text-blue-700"><a href={`/drilldown?hs=${row.hsCode}&partner=${partner}`}><ArrowUpRight />钻取</a></Button></TableCell></TableRow>)}</TableBody></Table>}
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-bold">HS 章节目录</p><p className="mt-1 text-xs text-slate-500">点击编码加入检索条件</p><div className="mt-4 max-h-[520px] space-y-1 overflow-y-auto pr-1 scrollbar-thin">{HS_CHAPTERS.map((item) => <button key={item.code} onClick={() => setQuery(item.code)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"><span className="w-7 font-mono font-semibold text-blue-700">{item.code}</span><span className="min-w-0 flex-1 truncate text-slate-600">{item.name}</span></button>)}</div></aside>
      </div>
    </main>
  );
}
