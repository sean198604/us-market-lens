"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ArrowUpRight, BrainCircuit, CircleAlert, Lightbulb, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usdCompact } from "@/lib/trade";
import { useTradePartners } from "@/hooks/use-trade-partners";

type InsightData = {
  source: string;
  generatedAt: string;
  partnerCode: string;
  partnerName: string;
  latestYear: number;
  previousYear: number;
  summary: { totalUsd: number; trackedUsd: number; trackedShare: number; topThreeConcentration: number; positiveCategories: number };
  categories: Array<{ hsCode: string; hsName: string; valueUsd: number; previousValueUsd: number; yoy: number; share: number; score: number }>;
  methodology: string;
};

const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export default function InsightsPage() {
  const partners = useTradePartners();
  const [partner, setPartner] = useState("156");
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`/api/comtrade/insights?partner=${partner}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json() as InsightData & { error?: string; detail?: string }; if (!response.ok) throw new Error(payload.detail || payload.error || "洞察加载失败"); return payload; })
      .then(setData)
      .catch((caught) => { if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "洞察加载失败"); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [partner, reload]);

  const fastest = data ? [...data.categories].sort((a, b) => b.yoy - a.yoy)[0] : null;
  const largest = data ? [...data.categories].sort((a, b) => b.valueUsd - a.valueUsd)[0] : null;
  const weakest = data ? [...data.categories].sort((a, b) => a.yoy - b.yoy)[0] : null;

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">INSIGHT CENTER</p><h1 className="mt-1 text-2xl font-bold tracking-tight">自动洞察与机会排序</h1><p className="mt-2 text-sm text-slate-500">将官方金额转换为可解释的增长、份额、集中度和优先级信号。</p></div><div className="flex gap-2"><Select value={partner} onValueChange={setPartner}><SelectTrigger className="h-10 w-44"><SelectValue /></SelectTrigger><SelectContent className="max-h-[320px]">{partners.map((item) => <SelectItem key={item.code} value={item.code}>来源：{item.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" className="h-10" disabled={loading} onClick={() => setReload((value) => value + 1)}><RefreshCw className={loading ? "animate-spin" : ""} />刷新</Button></div></div>

      {loading && !data && <div className="mt-6 grid min-h-80 place-items-center rounded-xl border border-slate-200 bg-white"><div className="text-center"><BrainCircuit className="mx-auto size-9 animate-pulse text-blue-600"/><p className="mt-3 text-sm font-medium">正在计算机会信号</p><p className="mt-1 text-xs text-slate-400">读取两个完整年度并应用透明规则</p></div></div>}
      {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

      {data && <>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <InsightCard icon={TrendingUp} eyebrow="增长最快" title={fastest?.hsName ?? "—"} metric={fastest ? signed(fastest.yoy) : "—"} copy={`HS ${fastest?.hsCode}，${data.latestYear} 年进口额 ${usdCompact(fastest?.valueUsd ?? 0)}。`} tone="green" />
          <InsightCard icon={Target} eyebrow="规模最大" title={largest?.hsName ?? "—"} metric={usdCompact(largest?.valueUsd ?? 0)} copy={`占美国自${data.partnerName}进口 ${largest?.share.toFixed(1)}%。`} tone="blue" />
          <InsightCard icon={CircleAlert} eyebrow="降幅最大" title={weakest?.hsName ?? "—"} metric={weakest ? signed(weakest.yoy) : "—"} copy="建议核查关税、供应转移和统计口径变化。" tone="amber" />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6"><div className="flex items-start justify-between gap-2"><div><p className="font-bold">机会矩阵</p><p className="mt-1 text-xs text-slate-500">横轴：品类占比 · 纵轴：同比增长 · 气泡：进口规模</p></div><Badge variant="outline">{data.latestYear}</Badge></div><div className="mt-5 h-[380px]"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 380 }}><ScatterChart margin={{ top: 12, right: 24, bottom: 16, left: 0 }}><CartesianGrid stroke="#e8edf3" strokeDasharray="4 4"/><XAxis type="number" dataKey="share" name="份额" unit="%" axisLine={false} tickLine={false}/><YAxis type="number" dataKey="yoy" name="同比" unit="%" axisLine={false} tickLine={false}/><ZAxis type="number" dataKey="valueUsd" range={[90, 720]} /><Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value, name) => name === "valueUsd" ? [usdCompact(Number(value)), "进口额"] : [`${Number(value).toFixed(1)}%`, name === "share" ? "份额" : "同比"]} /><Scatter data={data.categories} fill="#2563eb" /></ScatterChart></ResponsiveContainer></div></section>

          <section className="rounded-xl border border-slate-200 bg-[#0d1724] p-5 text-white shadow-sm lg:p-6"><div className="flex items-center gap-2 text-cyan-300"><Sparkles className="size-4"/><p className="text-xs font-semibold uppercase tracking-[.14em]">决策摘要</p></div><h2 className="mt-4 text-xl font-bold">{data.positiveCategories} 个重点品类保持正增长</h2><p className="mt-3 text-sm leading-6 text-slate-300">所列品类覆盖美国自{data.partnerName}进口的 {data.summary.trackedShare.toFixed(1)}%，前三大品类占所列品类金额的 {data.summary.topThreeConcentration.toFixed(1)}%。</p><div className="mt-5 space-y-3">{data.categories.slice(0, 4).map((item, index) => <a key={item.hsCode} href={`/drilldown?hs=${item.hsCode}&partner=${partner}`} className="block rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{index + 1}. {item.hsName}</p><p className="mt-1 text-xs text-slate-400">HS {item.hsCode} · 同比 {signed(item.yoy)}</p></div><span className="text-lg font-bold text-cyan-300">{item.score.toFixed(0)}</span></div><Progress value={item.score} className="mt-2 h-1.5" /></a>)}</div></section>
        </div>

        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><p className="font-bold">机会排行榜</p><p className="mt-1 text-xs text-slate-500">每个分数都可回溯到同比和份额</p></div><Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700"><Lightbulb className="mr-1 size-3.5"/>规则生成，不是黑箱模型</Badge></div><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-5">排名</TableHead><TableHead>品类</TableHead><TableHead className="text-right">进口额</TableHead><TableHead className="text-right">同比</TableHead><TableHead className="text-right">份额</TableHead><TableHead>机会分</TableHead><TableHead className="pr-5 text-right">操作</TableHead></TableRow></TableHeader><TableBody>{data.categories.map((item, index) => <TableRow key={item.hsCode}><TableCell className="pl-5 font-semibold">#{index + 1}</TableCell><TableCell><p className="font-medium">{item.hsName}</p><p className="mt-0.5 text-xs text-slate-400">HS {item.hsCode}</p></TableCell><TableCell className="text-right font-medium">{usdCompact(item.valueUsd)}</TableCell><TableCell className={`text-right font-semibold ${item.yoy >= 0 ? "text-emerald-700" : "text-red-700"}`}>{signed(item.yoy)}</TableCell><TableCell className="text-right">{item.share.toFixed(1)}%</TableCell><TableCell><div className="flex items-center gap-2"><Progress value={item.score} className="h-2 w-24"/><span className="text-xs font-semibold">{item.score.toFixed(0)}</span></div></TableCell><TableCell className="pr-5 text-right"><Button asChild variant="ghost" size="sm" className="text-blue-700"><a href={`/drilldown?hs=${item.hsCode}&partner=${partner}`}><ArrowUpRight />钻取</a></Button></TableCell></TableRow>)}</TableBody></Table></section>
        <p className="mt-4 text-xs leading-5 text-slate-500">方法：{data.methodology} 数据源：{data.source}；洞察用于筛选优先级，不替代客户订单、价格和毛利验证。</p>
      </>}
    </main>
  );
}

function InsightCard({ icon: Icon, eyebrow, title, metric, copy, tone }: { icon: typeof TrendingUp; eyebrow: string; title: string; metric: string; copy: string; tone: "green" | "blue" | "amber" }) {
  const theme = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">{eyebrow}</p><h2 className="mt-2 text-lg font-bold">{title}</h2></div><span className={`grid size-10 place-items-center rounded-lg ${theme}`}><Icon className="size-5"/></span></div><p className={`mt-4 text-2xl font-bold ${theme.split(" ")[1]}`}>{metric}</p><p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p></section>;
}
