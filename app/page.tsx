"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Database, Globe2, Lightbulb, ListFilter, RefreshCw, ScanSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useTradePartners } from "@/hooks/use-trade-partners";

type CategoryValue = { code: string; name: string; valueUsd: number };
type PeriodData = { period: string; totalUsd: number; categories: CategoryValue[] };
type MarketData = {
  source: string;
  sourceUrl: string;
  reporter: string;
  partnerCode: string;
  partnerName: string;
  generatedAt: string;
  valueBasis: string;
  quality: "official_aggregate";
  annual: PeriodData[];
  latestMonth: PeriodData | null;
  limitation: string;
};

const categoryNames: Record<string, string> = {
  "39": "塑料及制品", "61": "针织服装", "62": "非针织服装", "64": "鞋靴",
  "84": "机械设备", "85": "电气设备", "87": "车辆及零部件", "94": "家具与照明",
};

const categoryList = (rows: Array<[string, number]>): CategoryValue[] => rows.map(([code, valueUsd]) => ({ code, name: categoryNames[code], valueUsd }));

const chinaSnapshot: MarketData = {
  source: "UN Comtrade Public API（内置快照）",
  sourceUrl: "https://comtradeplus.un.org/",
  reporter: "美国",
  partnerCode: "156",
  partnerName: "中国",
  generatedAt: "2026-09-16T00:00:00.000Z",
  valueBasis: "官方贸易统计中的美国进口额（CIF/Primary Value）",
  quality: "official_aggregate",
  limitation: "这是美国按来源地和 HS 品类汇总的官方进口金额，不是单一公司的采购金额。",
  annual: [
    { period: "2021", totalUsd: 541531352242, categories: categoryList([["39",27052280077],["61",13078430785],["62",8924111707],["64",12292908454],["84",115635822543],["85",135123701673],["87",17348304284],["94",31446804124]]) },
    { period: "2022", totalUsd: 575688091172, categories: categoryList([["39",26411860948],["61",13585815682],["62",10061764185],["64",14779538546],["84",112770281180],["85",145807695770],["87",19596487864],["94",29666363241]]) },
    { period: "2023", totalUsd: 448017376384, categories: categoryList([["39",20155171998],["61",9996062695],["62",7807753622],["64",10039054349],["84",85889376499],["85",126679090396],["87",16413985103],["94",20285543547]]) },
    { period: "2024", totalUsd: 462620339617, categories: categoryList([["39",21525338487],["61",10634348302],["62",7759566838],["64",10277179176],["84",85129763877],["85",127057532501],["87",17989320024],["94",20935586566]]) },
    { period: "2025", totalUsd: 327476103023, categories: categoryList([["39",16874223492],["61",6808400966],["62",5143802193],["64",7084905234],["84",52277122691],["85",84032316556],["87",13225531277],["94",14532796509]]) },
  ],
  latestMonth: {
    period: "2026-07",
    totalUsd: 28856635423,
    categories: categoryList([["39",1505577850],["61",686753332],["62",459098003],["64",609024049],["84",4713240938],["85",6393741502],["87",1050675608],["94",1129249227]]),
  },
};

const usd = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 100_000_000) return `US$${Number((value / 100_000_000).toFixed(1))}亿`;
  if (absolute >= 10_000) return `US$${Number((value / 10_000).toFixed(1))}万`;
  return `US$${Number(value.toFixed(1))}`;
};
const percent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
const chinaTime = (value: string) => {
  const date = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};

export default function Home() {
  const partners = useTradePartners();
  const [partner, setPartner] = useState("156");
  const [market, setMarket] = useState<MarketData | null>(chinaSnapshot);
  const [selectedYear, setSelectedYear] = useState("2025");
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLive(false);
    if (partner !== "156") setMarket(null);

    fetch(`/api/comtrade/market?partner=${partner}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as MarketData & { error?: string; detail?: string };
        if (!response.ok) throw new Error(payload.detail || payload.error || "官方数据请求失败");
        return payload;
      })
      .then((payload) => {
        setMarket(payload);
        setSelectedYear(payload.annual.at(-1)?.period ?? "2025");
        setLive(true);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (partner === "156") {
          setMarket(chinaSnapshot);
          toast.warning("实时源暂时繁忙，当前显示已核验的内置官方快照");
        } else {
          toast.error(error instanceof Error ? error.message : "官方数据请求失败");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [partner, reloadToken]);

  const annual = market?.annual ?? [];
  const yearData = annual.find((item) => item.period === selectedYear) ?? annual.at(-1) ?? null;
  const yearIndex = annual.findIndex((item) => item.period === yearData?.period);
  const previous = yearIndex > 0 ? annual[yearIndex - 1] : null;
  const growth = yearData && previous ? (yearData.totalUsd / previous.totalUsd - 1) * 100 : 0;
  const categoryRows = useMemo(() => [...(yearData?.categories ?? [])].sort((a, b) => b.valueUsd - a.valueUsd), [yearData]);
  const trackedTotal = categoryRows.reduce((sum, item) => sum + item.valueUsd, 0);
  const chartData = annual.map((item) => ({ year: item.period, value: item.totalUsd / 1_000_000_000 }));

  return (
    <main className="min-h-screen bg-[#f3f6fa] text-slate-950">
      <Toaster position="top-right" richColors />
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,.06)] lg:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#0b57d0]">美国进口市场</p>{loading && <Badge variant="secondary" className="text-slate-600"><RefreshCw className="mr-1 size-3 animate-spin" />正在刷新</Badge>}</div>
              <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">按来源地查看年度进口额与品类结构</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">数据直接来自 UN Comtrade 公共接口，不需要账户或 API Key。默认内置中国快照，实时源繁忙时仍可查看。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={partner} onValueChange={setPartner}><SelectTrigger className="h-10 w-[180px] bg-white"><SelectValue /></SelectTrigger><SelectContent className="max-h-[320px]">{partners.map((item) => <SelectItem key={item.code} value={item.code}>来源：{item.name}</SelectItem>)}</SelectContent></Select>
              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!annual.length}><SelectTrigger className="h-10 w-[118px] bg-white"><SelectValue /></SelectTrigger><SelectContent>{annual.map((item) => <SelectItem key={item.period} value={item.period}>{item.period} 年</SelectItem>)}</SelectContent></Select>
              <Button variant="outline" className="h-10" disabled={loading} onClick={() => setReloadToken((value) => value + 1)}><RefreshCw className={loading ? "animate-spin" : ""} />刷新数据</Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <WorkflowLink href="/companies" icon={Building2} title="企业公开情报" detail="SEC、GLEIF 与联邦奖项交叉核验" />
            <WorkflowLink href="/search" icon={ListFilter} title="多维数据检索" detail="按 HS、来源地和期间查询并导出明细" />
            <WorkflowLink href="/drilldown" icon={ScanSearch} title="品类深度钻取" detail="查看五年趋势、月度节奏和国家对比" />
            <WorkflowLink href="/insights" icon={Lightbulb} title="自动机会洞察" detail="用增长、份额和波动率排序优先级" />
          </div>

          {!market && loading && <div className="mt-8 grid min-h-56 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500"><div className="text-center"><RefreshCw className="mx-auto mb-3 size-6 animate-spin text-blue-600" />正在读取官方数据，通常需要数秒</div></div>}
          {!market && !loading && <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><AlertTriangle className="mr-2 inline size-4" />官方接口暂时无法访问，请稍后点击刷新。</div>}

          {market && yearData && (
            <>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label={`${yearData.period} 年美国自${market.partnerName}进口`} value={usd(yearData.totalUsd)} detail="官方年度进口额" tone="blue" />
                <Metric label="同比变化" value={percent(growth)} detail={previous ? `相比 ${previous.period} 年` : "首年无对比"} tone={growth >= 0 ? "green" : "amber"} />
                <Metric label="最新月度" value={market.latestMonth ? usd(market.latestMonth.totalUsd) : "暂无"} detail={market.latestMonth ? `${market.latestMonth.period} 已发布` : "等待统计发布"} />
                <Metric label="所列 8 类占全年" value={`${yearData.totalUsd ? (trackedTotal / yearData.totalUsd * 100).toFixed(1) : "0.0"}%`} detail="其余 HS 品类未在图中展开" />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                <section className="rounded-xl border border-slate-200 p-5 lg:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">五年进口趋势</p><p className="mt-1 text-xs text-slate-500">单位：十亿美元 · 美国自{market.partnerName}进口总额</p></div><Badge variant="outline" className={live ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}>{live ? "实时官方数据" : "内置官方快照"}</Badge></div>
                  <div className="mt-5 h-[290px]"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 290 }}><AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="tradeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1677ff" stopOpacity={0.28} /><stop offset="100%" stopColor="#1677ff" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5eaf0" strokeDasharray="4 4" /><XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(value) => `$${value}B`} /><Tooltip formatter={(value) => [`$${Number(value).toFixed(1)}B`, "进口额"]} /><Area dataKey="value" type="monotone" stroke="#1677ff" strokeWidth={3} fill="url(#tradeFill)" dot={{ r: 4, fill: "white", stroke: "#1677ff", strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div>
                </section>

                <section className="rounded-xl border border-slate-200 p-5 lg:p-6">
                  <div><p className="font-bold">{yearData.period} 年重点品类</p><p className="mt-1 text-xs text-slate-500">HS 章节进口额 · 十亿美元</p></div>
                  <div className="mt-5 h-[290px]"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 460, height: 290 }}><BarChart data={categoryRows.map((item) => ({ ...item, value: item.valueUsd / 1_000_000_000 }))} layout="vertical" margin={{ left: 8, right: 18 }}><CartesianGrid horizontal={false} stroke="#edf1f5" /><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={82} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#475569" }} /><Tooltip formatter={(value) => [`$${Number(value).toFixed(1)}B`, "进口额"]} /><Bar dataKey="value" fill="#1677ff" radius={[0, 5, 5, 0]} barSize={18} /></BarChart></ResponsiveContainer></div>
                </section>
              </div>

              <section className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-4"><div><p className="font-bold">年度品类明细</p><p className="mt-1 text-xs text-slate-500">每一项都是官方国家级汇总值，不是推算的公司采购额</p></div><Badge variant="outline">HS 2 位章节</Badge></div>
                <Table><TableHeader><TableRow><TableHead className="pl-5">品类</TableHead><TableHead>HS</TableHead>{annual.map((item) => <TableHead key={item.period} className="text-right">{item.period}</TableHead>)}</TableRow></TableHeader><TableBody>{Object.entries(categoryNames).map(([code, name]) => <TableRow key={code}><TableCell className="pl-5 font-medium">{name}</TableCell><TableCell><Badge variant="secondary" className="font-mono">{code}</Badge></TableCell>{annual.map((item) => <TableCell key={item.period} className="text-right font-medium">{usd(item.categories.find((entry) => entry.code === code)?.valueUsd ?? 0)}</TableCell>)}</TableRow>)}</TableBody></Table>
              </section>

              <section className="mt-5 grid gap-4 rounded-xl border border-blue-100 bg-blue-50/70 p-5 lg:grid-cols-2">
                <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700"><Database className="size-5" /></span><div><p className="font-bold text-blue-950">数据来源与期间</p><p className="mt-2 text-sm leading-6 text-blue-900/75">{market.valueBasis}。最新统计期间为 <strong>{market.latestMonth?.period ?? "未发布"}</strong>，本次获取时间为 {chinaTime(market.generatedAt)}（北京时间）。</p><a className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:underline" href={market.sourceUrl} target="_blank" rel="noreferrer"><Globe2 className="size-4" />查看 UN Comtrade 原始来源</a></div></div>
                <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700"><AlertTriangle className="size-5" /></span><div><p className="font-bold text-slate-950">客户级金额的真实边界</p><p className="mt-2 text-sm leading-6 text-slate-600">公开提单可以证明公司、供应商、日期、重量和品类，但通常不包含真实成交金额。因此本版不伪造任何公司的年度采购额；公司金额必须来自其订单、ERP、报关单或可审计财务资料。</p></div></div>
              </section>

              <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /><span>{market.limitation} UN Comtrade 聚合记录可能由已报告明细汇总，个别数量字段会因保密规则缺失，但金额口径保持官方来源标识。</span></div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "blue" | "green" | "amber" }) {
  const color = tone === "blue" ? "text-[#0b57d0]" : tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-slate-950";
  return <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold tracking-tight ${color}`}>{value}</p><p className="mt-1.5 text-xs text-slate-500">{detail}</p></div>;
}

function WorkflowLink({ href, icon: Icon, title, detail }: { href: string; icon: typeof ListFilter; title: string; detail: string }) {
  return <a href={href} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-blue-700 shadow-sm"><Icon className="size-5"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></span><ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"/></a>;
}
