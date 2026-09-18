"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, BadgeDollarSign, Building2, ExternalLink, FileText, Landmark, LoaderCircle, Search, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usdCompact, usdFull } from "@/lib/trade";

type SearchResults = {
  query: string;
  generatedAt: string;
  sec: { ok: boolean; error: string | null; matches: Array<{ cik: string; name: string; ticker: string; exchange: string }> };
  gleif: { ok: boolean; error: string | null; publishedAt: string | null; matches: Array<{ lei: string; name: string; jurisdiction: string; entityStatus: string; registrationStatus: string; lastUpdated: string; address: string }> };
  federal: { ok: boolean; error: string | null; matches: Array<{ id: string; name: string; uei: string; duns: string; amount: number }> };
  boundary: string;
};

type CompanyProfile = {
  source: string;
  identity: { cik: string; name: string; tickers: string[]; exchanges: string[]; sic: string; sicDescription: string; stateOfIncorporation: string; fiscalYearEnd: string; website: string; investorWebsite: string };
  financials: Array<{ fiscalYear: number; revenue: number; costOfRevenue: number; grossProfit: number; inventory: number; assets: number; accountsPayable: number; filedAt: string | null }>;
  filings: Array<{ form: string; filedAt: string; reportDate: string; accessionNumber: string; primaryDocument: string; description: string }>;
  boundary: string;
};

export default function CompaniesPage() {
  const params = useSearchParams();
  const initialQuery = params.get("q")?.trim() ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadProfile(cik: string) {
    setProfileLoading(true);
    try {
      const response = await fetch(`/api/open-data/company-profile?cik=${encodeURIComponent(cik)}`, { cache: "no-store" });
      const payload = await response.json() as CompanyProfile & { error?: string; detail?: string };
      if (!response.ok) throw new Error(payload.detail || payload.error || "企业财报加载失败");
      setProfile(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "企业财报加载失败");
    } finally { setProfileLoading(false); }
  }

  async function runSearch(value = query) {
    const name = value.trim();
    if (name.length < 2) { setError("请输入至少 2 个字符的企业名称或股票代码"); return; }
    setLoading(true); setError(""); setResults(null); setProfile(null);
    try {
      const response = await fetch(`/api/open-data/company-search?q=${encodeURIComponent(name)}`, { cache: "no-store" });
      const payload = await response.json() as SearchResults & { error?: string };
      if (!response.ok) throw new Error(payload.error || "企业查询失败");
      setResults(payload);
      if (payload.sec.matches[0]) void loadProfile(payload.sec.matches[0].cik);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "企业查询失败");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (initialQuery) void runSearch(initialQuery); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Run the URL-seeded search only on initial mount.

  const latest = profile?.financials[0] ?? null;
  const sourceCount = results ? [results.sec.ok, results.gleif.ok, results.federal.ok].filter(Boolean).length : 3;
  const matchCount = results ? results.sec.matches.length + results.gleif.matches.length + results.federal.matches.length : 0;
  const secUrl = profile ? `https://www.sec.gov/edgar/browse/?CIK=${profile.identity.cik}` : "";
  const financialRows = useMemo(() => profile?.financials ?? [], [profile]);
  const filingUrl = (filing: CompanyProfile["filings"][number]) => {
    if (!profile || !filing.accessionNumber || !filing.primaryDocument) return secUrl;
    return `https://www.sec.gov/Archives/edgar/data/${Number(profile.identity.cik)}/${filing.accessionNumber.replaceAll("-", "")}/${filing.primaryDocument}`;
  };

  function submit(event: FormEvent) { event.preventDefault(); void runSearch(); }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-sm font-semibold text-blue-700">COMPANY INTELLIGENCE</p><h1 className="mt-1 text-2xl font-bold tracking-tight">美国企业公开情报</h1><p className="mt-2 text-sm leading-6 text-slate-500">一次检索 SEC 上市公司、GLEIF 法律实体和 USAspending 联邦奖项记录。</p></div>
        <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-800"><ShieldCheck className="mr-1 size-3.5" />3 个免费官方/开放数据源</Badge>
      </div>

      <form onSubmit={submit} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入公司名或股票代码，例如 Apple、Walmart、Caterpillar" className="h-11 pl-9"/></div><Button type="submit" disabled={loading} className="h-11 bg-blue-600 px-7 hover:bg-blue-700">{loading ? <LoaderCircle className="animate-spin"/> : <Search/>}{loading ? "并行查询中" : "查询企业"}</Button></div>
        <p className="mt-3 text-xs leading-5 text-slate-500">免费数据能核验法律实体、公开财务与政府业务，不会把营业成本或联邦奖项误写成采购额。</p>
        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </form>

      {!results && !loading && <section className="mt-5 grid min-h-64 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><Building2 className="mx-auto size-10 text-slate-300"/><p className="mt-4 font-semibold text-slate-700">输入企业名称开始核验</p><p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">公开公司可获得财报与申报文件；拥有 LEI 的企业可核验法律名称和注册地址；承接美国联邦资金的机构可看到公开奖项金额。</p></div></section>}
      {loading && <section className="mt-5 grid min-h-64 place-items-center rounded-xl border border-slate-200 bg-white"><div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-blue-600"/><p className="mt-3 text-sm font-medium">正在并行核对三个来源</p><p className="mt-1 text-xs text-slate-400">任一来源失败不会阻断其他结果</p></div></section>}

      {results && <>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="可用数据源" value={`${sourceCount}/3`} detail="本次查询成功返回" />
          <Metric label="候选记录" value={String(matchCount)} detail="需根据地址、代码确认主体" />
          <Metric label="数据获取时间" value={new Date(results.generatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} detail={new Date(results.generatedAt).toLocaleDateString("zh-CN")} />
        </div>

        <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700"/><div><p className="font-bold">数据边界</p><p className="mt-1 text-amber-900/80">{results.boundary} 要得到“该公司从哪些国家采购多少”，仍需提单授权数据、FOIA 文件或客户自有订单。</p></div></div></section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="font-bold">SEC 上市公司候选</p><p className="mt-1 text-xs text-slate-500">点击候选加载实时 EDGAR 财报数据</p></div><SourceState ok={results.sec.ok}/></div>
            {results.sec.matches.length ? <Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-5">公司</TableHead><TableHead>代码</TableHead><TableHead>交易所</TableHead><TableHead className="pr-5 text-right">操作</TableHead></TableRow></TableHeader><TableBody>{results.sec.matches.map((item) => <TableRow key={item.cik}><TableCell className="pl-5"><p className="font-medium">{item.name}</p><p className="mt-0.5 text-xs text-slate-400">CIK {item.cik}</p></TableCell><TableCell className="font-mono font-semibold text-blue-700">{item.ticker}</TableCell><TableCell>{item.exchange}</TableCell><TableCell className="pr-5 text-right"><Button size="sm" variant="ghost" disabled={profileLoading} onClick={() => void loadProfile(item.cik)}>查看财报</Button></TableCell></TableRow>)}</TableBody></Table> : <Empty copy="没有匹配的 SEC 上市公司；私营企业通常不会出现在这里。"/>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-[#0d1724] p-5 text-white shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-300">SEC 财务快照</p><h2 className="mt-2 text-xl font-bold">{profile?.identity.name ?? (profileLoading ? "正在加载" : "选择上市公司")}</h2></div>{profileLoading ? <LoaderCircle className="size-5 animate-spin text-cyan-300"/> : <FileText className="size-5 text-cyan-300"/>}</div>
            {profile && latest ? <><div className="mt-5 grid grid-cols-2 gap-3"><DarkMetric label={`${latest.fiscalYear} 营业收入`} value={usdCompact(latest.revenue)}/><DarkMetric label="营业成本" value={latest.costOfRevenue ? usdCompact(latest.costOfRevenue) : "未披露"}/><DarkMetric label="期末库存" value={latest.inventory ? usdCompact(latest.inventory) : "未披露"}/><DarkMetric label="应付账款" value={latest.accountsPayable ? usdCompact(latest.accountsPayable) : "未披露"}/></div><div className="mt-4 flex flex-wrap gap-2">{profile.identity.tickers.map((ticker) => <Badge key={ticker} className="bg-blue-600">{ticker}</Badge>)}{profile.identity.sicDescription && <Badge variant="outline" className="border-white/15 text-slate-300">{profile.identity.sicDescription}</Badge>}</div><p className="mt-4 text-xs leading-5 text-slate-400">{profile.boundary}</p><a href={secUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 hover:underline">打开 SEC 原始档案<ExternalLink className="size-3.5"/></a></> : <p className="mt-6 text-sm leading-6 text-slate-400">上市公司匹配后，这里显示最近五年收入、成本、库存、应付账款和申报记录。</p>}
          </section>
        </div>

        {profile && financialRows.length > 0 && <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><p className="font-bold">公开财务趋势</p><p className="mt-1 text-xs text-slate-500">来自 SEC XBRL；采用最新申报中的年度事实，缺失字段显示为“—”，不做估算</p></div><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-5">财年</TableHead><TableHead className="text-right">营业收入</TableHead><TableHead className="text-right">营业成本</TableHead><TableHead className="text-right">库存</TableHead><TableHead className="text-right">应付账款</TableHead><TableHead className="pr-5 text-right">最新复核申报日</TableHead></TableRow></TableHeader><TableBody>{financialRows.map((row) => <TableRow key={row.fiscalYear}><TableCell className="pl-5 font-semibold">{row.fiscalYear}</TableCell><Money value={row.revenue}/><Money value={row.costOfRevenue}/><Money value={row.inventory}/><Money value={row.accountsPayable}/><TableCell className="pr-5 text-right text-slate-500">{row.filedAt || "—"}</TableCell></TableRow>)}</TableBody></Table></section>}

        {profile && profile.filings.length > 0 && <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><p className="font-bold">最新 SEC 申报</p><p className="mt-1 text-xs text-slate-500">点击直接打开 SEC 原始文件，便于复核口径与日期</p></div><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-5">表格</TableHead><TableHead>申报日</TableHead><TableHead>报告期</TableHead><TableHead>说明</TableHead><TableHead className="pr-5 text-right">原文</TableHead></TableRow></TableHeader><TableBody>{profile.filings.map((filing) => <TableRow key={filing.accessionNumber}><TableCell className="pl-5"><Badge variant="outline">{filing.form}</Badge></TableCell><TableCell>{filing.filedAt || "—"}</TableCell><TableCell>{filing.reportDate || "—"}</TableCell><TableCell className="max-w-[420px] truncate text-slate-500">{filing.description || filing.primaryDocument || "—"}</TableCell><TableCell className="pr-5 text-right"><a href={filingUrl(filing)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">查看<ExternalLink className="size-3.5"/></a></TableCell></TableRow>)}</TableBody></Table></section>}

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={Landmark} title="GLEIF 法律实体" copy="法律名称、LEI、注册状态与地址" ok={results.gleif.ok}/>{results.gleif.matches.length ? <div className="divide-y divide-slate-100">{results.gleif.matches.map((item) => <div key={item.lei} className="p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{item.name}</p><p className="mt-1 font-mono text-xs text-blue-700">LEI {item.lei}</p></div><Badge variant="outline" className={item.registrationStatus === "ISSUED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>{item.registrationStatus || item.entityStatus || "未知"}</Badge></div><p className="mt-3 text-sm leading-6 text-slate-500">{item.address || "未披露地址"}</p></div>)}</div> : <Empty copy="未找到匹配的美国 LEI 记录。"/>}</section>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={BadgeDollarSign} title="USAspending 联邦奖项" copy="该主体获得的美国联邦合同、拨款等公开金额" ok={results.federal.ok}/>{results.federal.matches.length ? <Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-5">受款主体</TableHead><TableHead>UEI</TableHead><TableHead className="pr-5 text-right">源记录金额</TableHead></TableRow></TableHeader><TableBody>{results.federal.matches.map((item) => <TableRow key={`${item.id}-${item.uei}`}><TableCell className="pl-5 font-medium">{item.name}</TableCell><TableCell className="font-mono text-xs">{item.uei || "—"}</TableCell><TableCell className="pr-5 text-right"><p className="font-semibold">{usdCompact(item.amount)}</p><p className="mt-0.5 text-xs text-slate-400">{item.amount ? usdFull(item.amount) : "暂无金额"}</p></TableCell></TableRow>)}</TableBody></Table> : <Empty copy="未找到匹配的联邦奖项受款主体。"/>}</section>
        </div>
      </>}
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>; }
function DarkMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
function SourceState({ ok }: { ok: boolean }) { return <Badge variant="outline" className={ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}>{ok ? "数据可用" : "暂时不可用"}</Badge>; }
function Empty({ copy }: { copy: string }) { return <div className="px-5 py-10 text-center text-sm text-slate-500">{copy}</div>; }
function Money({ value }: { value: number }) { return <TableCell className="text-right font-medium">{value ? usdCompact(value) : "—"}</TableCell>; }
function SectionHeader({ icon: Icon, title, copy, ok }: { icon: typeof Landmark; title: string; copy: string; ok: boolean }) { return <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Icon className="size-4.5"/></span><div><p className="font-bold">{title}</p><p className="mt-1 text-xs text-slate-500">{copy}</p></div></div><SourceState ok={ok}/></div>; }
