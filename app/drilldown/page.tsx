"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowLeft, Database, GitCompareArrows, Layers3, RefreshCw, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hsName, usdCompact, usdFull } from "@/lib/trade";
import { useTradePartners } from "@/hooks/use-trade-partners";

type Drilldown = {
  source: string;
  generatedAt: string;
  hsCode: string;
  hsName: string;
  partnerCode: string;
  partnerName: string;
  metrics: { latestValueUsd: number; latestShare: number; yoy: number; cagr: number; volatility: number };
  annual: Array<{ period: string; valueUsd: number; totalUsd: number; share: number }>;
  monthly: Array<{ period: string; valueUsd: number }>;
  comparison: Array<{ partnerCode: string; partnerName: string; valueUsd: number }>;
};

const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export default function DrilldownPage() {
  const partners = useTradePartners();
  const params = useSearchParams();
  const [hs, setHs] = useState(params.get("hs") ?? "85");
  const [partner, setPartner] = useState(params.get("partner") ?? "156");
  const [data, setData] = useState<Drilldown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`/api/comtrade/drilldown?hs=${encodeURIComponent(hs)}&partner=${partner}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json() as Drilldown & { error?: string; detail?: string }; if (!response.ok) throw new Error(payload.detail || payload.error || "加载失败"); return payload; })
      .then(setData)
      .catch((caught) => { if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "加载失败"); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [requestKey]); // eslint-disable-line react-hooks/exhaustive-deps -- Draft filters are applied only when the user clicks Apply.

  const score = data ? Math.max(0, Math.min(100, 50 + data.metrics.yoy * 0.8 + data.metrics.cagr * 1.2 + Math.min(data.metrics.latestShare * 0.5, 20) - data.metrics.volatility * 0.4)) : 0;
  const scoreLabel = score >= 70 ? "高优先级" : score >= 50 ? "持续观察" : "谨慎评估";

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><Button asChild variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500"><a href="/search"><ArrowLeft />返回检索</a></Button><p className="text-sm font-semibold text-blue-700">CATEGORY DRILLDOWN</p><h1 className="mt-1 text-2xl font-bold tracking-tight">品类深度分析</h1><p className="mt-2 text-sm text-slate-500">拆解长期趋势、月度节奏、市场占比和来源地对比。</p></div>
        <div className="flex flex-wrap gap-2"><Input value={hs} onChange={(event) => setHs(event.target.value.replace(/\D/g, "").slice(0, 10))} className="h-10 w-32 font-mono" aria-label="HS 编码" /><Select value={partner} onValueChange={setPartner}><SelectTrigger className="h-10 w-44"><SelectValue /></SelectTrigger><SelectContent className="max-h-[320px]">{partners.map((item) => <SelectItem key={item.code} value={item.code}>来源：{item.name}</SelectItem>)}</SelectContent></Select><Button className="h-10 bg-blue-600 hover:bg-blue-700" disabled={loading || ![2,4,6,10].includes(hs.length)} onClick={() => setRequestKey((value) => value + 1)}><RefreshCw className={loading ? "animate-spin" : ""} />应用</Button></div>
      </div>

      {loading && !data && <div className="mt-6 grid min-h-80 place-items-center rounded-xl border border-slate-200 bg-white"><div className="text-center"><RefreshCw className="mx-auto size-7 animate-spin text-blue-600" /><p className="mt-3 text-sm font-medium">正在汇总五年与月度数据</p><p className="mt-1 text-xs text-slate-400">官方接口按期间逐项返回，通常需要十余秒</p></div></div>}
      {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

      {data && (
        <>
          <section className="mt-6 rounded-xl border border-slate-200 bg-[#0d1724] p-5 text-white shadow-sm lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge className="bg-blue-600">HS {data.hsCode}</Badge><Badge variant="outline" className="border-white/15 text-slate-300">美国自{data.partnerName}进口</Badge></div><h2 className="mt-3 text-2xl font-bold">{data.hsName || hsName(data.hsCode)}</h2><p className="mt-2 text-sm text-slate-400">{data.annual.at(-1)?.period} 年 · 官方聚合口径</p></div><div className="min-w-[240px] rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between"><span className="text-sm text-slate-300">机会评分</span><span className="text-lg font-bold text-cyan-300">{score.toFixed(0)}/100</span></div><Progress value={score} className="mt-3 h-2" /><p className="mt-2 text-xs text-slate-400">{scoreLabel} · 由增长、份额和波动率规则计算</p></div></div>
          </section>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={Database} label="最新年度进口额" value={usdCompact(data.metrics.latestValueUsd)} detail={usdFull(data.metrics.latestValueUsd)} /><Kpi icon={TrendingUp} label="年度同比" value={signed(data.metrics.yoy)} detail="最近完整年度" tone={data.metrics.yoy >= 0 ? "green" : "red"} /><Kpi icon={Layers3} label="来源地内品类占比" value={`${data.metrics.latestShare.toFixed(1)}%`} detail="品类 / 该来源全部进口" /><Kpi icon={Activity} label="增长波动率" value={`${data.metrics.volatility.toFixed(1)}%`} detail={`五年 CAGR ${signed(data.metrics.cagr)}`} /></div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <ChartCard title="五年年度趋势" subtitle="进口额（十亿美元）"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}><AreaChart data={data.annual.map((item) => ({ ...item, value: item.valueUsd / 1e9 }))}><defs><linearGradient id="drillFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity={0.3}/><stop offset="1" stopColor="#2563eb" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8edf3" strokeDasharray="4 4"/><XAxis dataKey="period" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}B`}/><Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}B`, "进口额"]}/><Area dataKey="value" type="monotone" stroke="#2563eb" strokeWidth={3} fill="url(#drillFill)" /></AreaChart></ResponsiveContainer></ChartCard>
            <ChartCard title="最近三个月" subtitle="进口额（十亿美元）"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}><BarChart data={data.monthly.map((item) => ({ ...item, value: item.valueUsd / 1e9 }))}><CartesianGrid vertical={false} stroke="#e8edf3"/><XAxis dataKey="period" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}B`}/><Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}B`, "进口额"]}/><Bar dataKey="value" fill="#06b6d4" radius={[6,6,0,0]} maxBarSize={54}/></BarChart></ResponsiveContainer></ChartCard>
          </div>

          <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><GitCompareArrows className="size-5 text-blue-600"/><div><p className="font-bold">主要来源地横向比较</p><p className="mt-1 text-xs text-slate-500">同一 HS 品类、同一完整年度</p></div></div><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-5">排名</TableHead><TableHead>来源地</TableHead><TableHead>相对规模</TableHead><TableHead className="pr-5 text-right">进口额</TableHead></TableRow></TableHeader><TableBody>{data.comparison.map((item, index) => { const max = data.comparison[0]?.valueUsd || 1; return <TableRow key={item.partnerCode}><TableCell className="pl-5 font-semibold">#{index + 1}</TableCell><TableCell>{item.partnerName}</TableCell><TableCell><div className="h-2 max-w-sm overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${item.valueUsd / max * 100}%` }} /></div></TableCell><TableCell className="pr-5 text-right font-semibold">{usdCompact(item.valueUsd)}</TableCell></TableRow>; })}</TableBody></Table></section>
        </>
      )}
    </main>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="font-bold">{title}</p><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><div className="mt-5 h-[280px]">{children}</div></section>;
}

function Kpi({ icon: Icon, label, value, detail, tone }: { icon: typeof Database; label: string; value: string; detail: string; tone?: "green" | "red" }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon className="size-4"/>{label}</div><p className={`mt-3 text-2xl font-bold ${tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-700" : "text-slate-950"}`}>{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}
