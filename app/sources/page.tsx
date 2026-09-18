"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDownToLine, CheckCircle2, Database, ExternalLink, KeyRound, RefreshCw, Server, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
type Source = { id: string; name: string; authority: string; coverage: string; cadence: string; companyLevel: boolean; valueLevel: string; free: boolean; keyRequirement: string; url: string; available: boolean; detail: string };
type Audit = { checkedAt: string; summary: { connected: number; total: number; companySources: number; paidSources: number }; sources: Source[]; runtime: { comtrade?: { cacheEntries?: number; cacheHits?: number }; openData?: { entries?: number; inFlight?: number } }; companySpend: { actualAvailable: boolean; rule: string } };
type Macro = { source: string; sourceUpdatedAt: string | null; observations: Array<{ year: string; valueUsd: number }>; scope: string };

const fields = [
  ["companyIdentity", "企业身份", "SEC / GLEIF 名称、代码、地址、状态", "源记录"],
  ["publicFinancials", "公开财务", "营业收入、成本、库存、应付账款", "SEC XBRL"],
  ["federalAwards", "联邦奖项", "企业作为受款方获得的联邦合同或拨款", "USAspending"],
  ["tradeValue", "进口金额", "美国按来源国、HS、期间汇总", "UN Comtrade"],
  ["macroCheck", "宏观校验", "美国全部商品进口年度总额", "World Bank"],
  ["companyPurchases", "公司采购额", "免费公共源无法直接提供", "必须由客户自有或授权数据补充"],
];

export default function SourcesPage() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [macro, setMacro] = useState<Macro | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true); setError("");
    try {
      const [auditResponse, macroResponse] = await Promise.all([fetch("/api/data-sources", { cache: "no-store" }), fetch("/api/open-data/macro", { cache: "no-store" })]);
      const auditPayload = await auditResponse.json() as Audit & { error?: string };
      const macroPayload = await macroResponse.json() as Macro & { error?: string };
      if (!auditResponse.ok) throw new Error(auditPayload.error || "数据源检测失败");
      setAudit(auditPayload);
      if (macroResponse.ok) setMacro(macroPayload);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "数据源检测失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function exportSnapshot() {
    const [market, sources, macroData] = await Promise.all([
      fetch("/api/comtrade/market?partner=156").then((item) => item.json()),
      fetch("/api/data-sources").then((item) => item.json()),
      fetch("/api/open-data/macro").then((item) => item.json()),
    ]);
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), market, sources, macro: macroData }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `us-market-lens-snapshot-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">DATA GOVERNANCE</p><h1 className="mt-1 text-2xl font-bold tracking-tight">免费数据源与口径治理</h1><p className="mt-2 text-sm text-slate-500">查看每个来源是否在线、覆盖什么，以及哪些指标绝不能混用。</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""}/>重新检测</Button><Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void exportSnapshot()}><ArrowDownToLine/>导出证据快照</Button></div></div>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Database} label="已接通" value={audit ? `${audit.summary.connected}/${audit.summary.total}` : "—"} detail="自动检测的数据源" />
        <Metric icon={ShieldCheck} label="企业级免费源" value={audit ? String(audit.summary.companySources) : "—"} detail="SEC、GLEIF、USAspending" />
        <Metric icon={KeyRound} label="付费源" value="0" detail="当前工作流不依赖付费接口" />
        <Metric icon={Server} label="缓存条目" value={audit ? String((audit.runtime.comtrade?.cacheEntries ?? 0) + (audit.runtime.openData?.entries ?? 0)) : "—"} detail="降低上游压力与等待时间" />
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><p className="font-bold">数据源目录</p><p className="mt-1 text-xs text-slate-500">{audit ? `最后检测：${new Date(audit.checkedAt).toLocaleString("zh-CN")}` : "正在检测"}</p></div><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">免费接入优先</Badge></div>
        <Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-5">来源</TableHead><TableHead>覆盖</TableHead><TableHead>价值口径</TableHead><TableHead>更新</TableHead><TableHead>接入要求</TableHead><TableHead className="pr-5 text-right">状态</TableHead></TableRow></TableHeader><TableBody>{(audit?.sources ?? []).map((source) => <TableRow key={source.id}><TableCell className="pl-5"><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">{source.name}<ExternalLink className="size-3"/></a><p className="mt-1 text-xs text-slate-400">{source.authority}</p></TableCell><TableCell className="max-w-[260px] text-sm text-slate-600">{source.coverage}<div className="mt-1">{source.companyLevel && <Badge variant="secondary">公司级</Badge>}</div></TableCell><TableCell className="max-w-[220px] text-sm text-slate-600">{source.valueLevel}</TableCell><TableCell>{source.cadence}</TableCell><TableCell><Badge variant="outline">{source.keyRequirement}</Badge></TableCell><TableCell className="pr-5 text-right"><Badge variant="outline" className={source.available ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{source.available ? "已连接" : "待配置"}</Badge><p className="mt-1 text-xs text-slate-400">{source.detail}</p></TableCell></TableRow>)}</TableBody></Table>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6"><div><p className="font-bold">美国商品进口宏观校验</p><p className="mt-1 text-xs text-slate-500">World Bank 年度总额 · 十亿美元</p></div><div className="mt-5 h-[280px]">{macro ? <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 280 }}><AreaChart data={[...macro.observations].reverse().map((item) => ({ year: item.year, value: item.valueUsd / 1e9 }))}><defs><linearGradient id="macroFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0ea5e9" stopOpacity={0.3}/><stop offset="1" stopColor="#0ea5e9" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8edf3" strokeDasharray="4 4"/><XAxis dataKey="year" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}B`}/><Tooltip formatter={(value) => [`$${Number(value).toFixed(0)}B`, "进口额"]}/><Area dataKey="value" type="monotone" stroke="#0284c7" strokeWidth={3} fill="url(#macroFill)"/></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-slate-400">宏观数据加载中</div>}</div><p className="mt-2 text-xs leading-5 text-slate-500">{macro?.scope}</p></section>
        <section className="rounded-xl border border-slate-200 bg-[#0d1724] p-5 text-white shadow-sm"><p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-300">真实性规则</p><h2 className="mt-3 text-xl font-bold">同名字段，不代表同一业务含义</h2><div className="mt-5 space-y-4 text-sm leading-6 text-slate-300"><p className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-400"/>SEC 营业成本不是采购额，可能包含人工、折旧与其他成本。</p><p className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-400"/>USAspending 金额是企业收到的联邦资金，不是企业向供应商支付的钱。</p><p className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-400"/>UN Comtrade 和 World Bank 是市场汇总，不能归属于单一公司。</p></div></section>
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><p className="font-bold">指标与证据字典</p><p className="mt-1 text-xs text-slate-500">页面展示值的来源与允许用途</p></div><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-5">字段组</TableHead><TableHead>业务含义</TableHead><TableHead>定义</TableHead><TableHead className="pr-5">来源</TableHead></TableRow></TableHeader><TableBody>{fields.map(([field, name, definition, source]) => <TableRow key={field}><TableCell className="pl-5 font-mono text-sm font-semibold text-blue-700">{field}</TableCell><TableCell className="font-medium">{name}</TableCell><TableCell className="text-slate-600">{definition}</TableCell><TableCell className="pr-5"><Badge variant="secondary">{source}</Badge></TableCell></TableRow>)}</TableBody></Table></section>

      <section className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700"/><div><p className="font-bold text-amber-950">仍然缺少的数据</p><p className="mt-2 text-sm leading-6 text-amber-900/80">{audit?.companySpend.rule ?? "企业真实采购额与供应国分布必须由订单、ERP、报关单、授权提单或 FOIA 文件补充。"}</p></div></section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Database; label: string; value: string; detail: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon className="size-4"/>{label}</div><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>; }
