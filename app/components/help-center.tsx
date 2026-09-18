"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight, BarChart3, BookOpenCheck, Building2, CircleHelp, Database,
  FileCheck2, Gauge, Globe2, Lightbulb, PackageSearch, Search, ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

type HelpStep = { title: string; copy: string; icon: LucideIcon };
type PageHelp = {
  eyebrow: string;
  title: string;
  purpose: string;
  steps: HelpStep[];
  notes: string[];
  nextHref?: string;
  nextLabel?: string;
};

const HELP_BY_ROUTE: Array<{ match: (pathname: string) => boolean; content: PageHelp }> = [
  {
    match: (pathname) => pathname === "/",
    content: {
      eyebrow: "市场总览",
      title: "先判断市场有多大、从哪里进口",
      purpose: "这里回答美国某个来源国、年度和重点品类的进口规模，用于确定值得继续研究的市场方向。",
      steps: [
        { icon: Globe2, title: "选择来源地", copy: "选择中国、越南、日本等贸易伙伴，或查看全球总量。" },
        { icon: Gauge, title: "查看规模与变化", copy: "比较进口额、同比、品类结构和近期数据更新时间。" },
        { icon: PackageSearch, title: "进入具体品类", copy: "从重点品类进入检索或钻取，继续看 HS 明细和趋势。" },
      ],
      notes: ["市场进口额是美国整体市场数据，不属于某一家企业。", "先用市场总览筛选方向，再到企业情报核验目标客户。"],
      nextHref: "/companies", nextLabel: "下一步：核验企业",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/companies"),
    content: {
      eyebrow: "企业情报",
      title: "确认企业主体与公开经营信息",
      purpose: "一次查询 SEC、GLEIF 和 USAspending，帮助确认公司身份、股票代码、法律实体、公开财务和美国联邦业务。",
      steps: [
        { icon: Search, title: "输入公司名或股票代码", copy: "例如 Apple、Walmart 或 CAT；建议使用英文正式名称。" },
        { icon: Building2, title: "确认是不是同一家公司", copy: "结合 CIK、LEI、注册地址和股票代码排除同名主体。" },
        { icon: FileCheck2, title: "查看财务与原始申报", copy: "查看年度趋势，并点击 SEC 原文复核报告期和口径。" },
      ],
      notes: ["营业成本、库存和应付账款都不等于采购额。", "USAspending 显示企业收到的联邦资金，不是企业采购支出。"],
      nextHref: "/search", nextLabel: "下一步：检索品类",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/search"),
    content: {
      eyebrow: "数据检索",
      title: "按来源国、年度和 HS 品类查进口额",
      purpose: "适合已经知道产品或 HS 编码时，快速得到美国进口金额并导出结果。",
      steps: [
        { icon: PackageSearch, title: "输入编码或关键词", copy: "可输入 84、85，也可输入机械、家具等中文品类关键词。" },
        { icon: Globe2, title: "设置来源国和年度", copy: "来源国指美国进口商品的贸易伙伴，不是企业总部所在地。" },
        { icon: Database, title: "查询、导出、继续钻取", copy: "核对数据状态和金额；可导出 CSV，或点击“钻取”进入深度分析。" },
      ],
      notes: ["输入多个 HS 编码时用英文逗号分隔。", "“无记录”不一定等于零，也可能是未发布或统计口径不匹配。"],
      nextHref: "/drilldown", nextLabel: "下一步：品类钻取",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/drilldown"),
    content: {
      eyebrow: "品类钻取",
      title: "把单一品类拆成趋势、份额和来源地对比",
      purpose: "用于判断某个 HS 品类是否持续增长、季节性如何，以及当前来源国相对其他主要来源地的位置。",
      steps: [
        { icon: PackageSearch, title: "输入有效 HS 编码", copy: "支持 2、4、6 或 10 位编码，选择来源国后点击“应用”。" },
        { icon: BarChart3, title: "阅读年度与月度趋势", copy: "年度图看方向，最近三个月用于观察短期节奏，不要混为同一周期。" },
        { icon: Gauge, title: "解释机会评分", copy: "评分由增长、份额和波动率规则计算，只用于排序，不代表成交概率。" },
      ],
      notes: ["来源地比较采用同一 HS、同一年度口径。", "趋势判断仍需结合价格、关税、客户需求和利润空间。"],
      nextHref: "/insights", nextLabel: "下一步：查看洞察",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/insights"),
    content: {
      eyebrow: "洞察中心",
      title: "从重点品类中排出优先研究顺序",
      purpose: "系统把进口额、同比、份额和集中度转换为透明的机会信号，帮助团队决定先研究哪些品类。",
      steps: [
        { icon: Globe2, title: "选择来源地", copy: "切换贸易伙伴后，系统读取最近两个完整年度并重新计算。" },
        { icon: Lightbulb, title: "先看三张摘要卡", copy: "分别识别增长最快、规模最大和降幅最大的重点品类。" },
        { icon: BarChart3, title: "使用矩阵与排行榜", copy: "气泡位置反映份额和增速，榜单分数可回溯到具体指标。" },
      ],
      notes: ["洞察由固定规则生成，不是黑箱预测。", "机会分用于筛选，不替代客户访谈、报价和毛利验证。"],
      nextHref: "/sources", nextLabel: "下一步：检查证据",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/sources"),
    content: {
      eyebrow: "数据治理",
      title: "确认数据是否在线、能证明什么",
      purpose: "这里是整个项目的证据台账：查看数据源状态、覆盖范围、更新频率，以及每个指标允许怎样使用。",
      steps: [
        { icon: Database, title: "查看连接状态", copy: "“已连接”表示本次检测成功；“待配置”表示接口已写好但仍缺免费 Key。" },
        { icon: BookOpenCheck, title: "核对数据口径", copy: "重点区分市场进口额、企业财务、联邦奖项和企业真实采购额。" },
        { icon: FileCheck2, title: "保存证据快照", copy: "需要汇报或审计时，可导出当次来源状态和指标定义。" },
      ],
      notes: ["任何企业采购额都必须有订单、ERP、报关单或其他授权资料支持。", "上游来源暂时失败时，可重新检测；系统不会用假数据补位。"],
      nextHref: "/", nextLabel: "返回市场总览",
    },
  },
];

const FALLBACK_HELP = HELP_BY_ROUTE[0].content;

export function HelpCenter({ pathname }: { pathname: string }) {
  const page = HELP_BY_ROUTE.find((item) => item.match(pathname))?.content ?? FALLBACK_HELP;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 shrink-0 gap-2 border-blue-200 bg-blue-50 px-3 text-blue-800 hover:bg-blue-100" aria-label={`打开${page.eyebrow}使用帮助`}>
          <CircleHelp className="size-4.5" />
          <span className="hidden sm:inline">帮助</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(94vw,560px)] gap-0 overflow-y-auto border-slate-200 bg-[#f7f9fc] p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b border-slate-200 bg-white px-5 py-5 pr-12 sm:px-6">
          <div className="flex items-center gap-2"><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">当前页面 · {page.eyebrow}</Badge></div>
          <SheetTitle className="mt-2 text-xl leading-7 text-slate-950">{page.title}</SheetTitle>
          <SheetDescription className="text-sm leading-6 text-slate-600">{page.purpose}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-5 sm:p-6">
          <section className="overflow-hidden rounded-xl bg-[#0d1724] p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-300">这个项目是做什么的</p>
            <p className="mt-3 text-base font-semibold leading-7">用官方公开数据寻找美国进口机会，并核验目标企业；所有结果都保留来源与业务口径。</p>
            <div className="mt-5 flex items-center justify-between gap-2 text-center">
              <FlowNode icon={Globe2} label="看市场" />
              <ArrowRight className="size-4 shrink-0 text-slate-500" />
              <FlowNode icon={Building2} label="找企业" />
              <ArrowRight className="size-4 shrink-0 text-slate-500" />
              <FlowNode icon={FileCheck2} label="核证据" />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-700"><BookOpenCheck className="size-4" /></span><div><p className="font-bold text-slate-900">本页怎么用</p><p className="text-xs text-slate-500">按顺序完成下面三步</p></div></div>
            <div className="mt-3 space-y-3">
              {page.steps.map((step, index) => <HelpStepCard key={step.title} step={step} index={index} />)}
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" /><div><p className="font-bold text-amber-950">使用时注意</p><ul className="mt-2 space-y-2 text-sm leading-6 text-amber-950/80">{page.notes.map((note) => <li key={note} className="flex gap-2"><span aria-hidden="true">•</span><span>{note}</span></li>)}</ul></div></div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-bold text-slate-900">推荐工作流</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
              <MiniStage number="1" label="市场筛选" />
              <MiniStage number="2" label="企业核验" />
              <MiniStage number="3" label="证据复核" />
            </div>
            {page.nextHref && <SheetClose asChild><Button asChild className="mt-4 w-full bg-blue-600 hover:bg-blue-700"><a href={page.nextHref}>{page.nextLabel}<ArrowRight /></a></Button></SheetClose>}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FlowNode({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return <div className="min-w-0 flex-1"><span className="mx-auto grid size-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-cyan-300"><Icon className="size-5" /></span><p className="mt-2 text-xs font-medium text-slate-300">{label}</p></div>;
}

function HelpStepCard({ step, index }: { step: HelpStep; index: number }) {
  const Icon = step.icon;
  return <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="relative grid size-10 place-items-center rounded-lg bg-slate-100 text-blue-700"><Icon className="size-5" /><span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span></span><div><p className="font-semibold text-slate-900">{step.title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{step.copy}</p></div></div>;
}

function MiniStage({ number, label }: { number: string; label: string }) {
  return <div className="rounded-lg bg-slate-50 px-2 py-3"><span className="mx-auto grid size-6 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{number}</span><p className="mt-2 font-medium">{label}</p></div>;
}
