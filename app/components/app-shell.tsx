"use client";

import { usePathname } from "next/navigation";
import { CSSProperties, FormEvent, ReactNode, useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  Gauge,
  Lightbulb,
  Search,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import { HelpCenter } from "@/app/components/help-center";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/", label: "市场总览", eyebrow: "OVERVIEW", description: "美国进口规模与重点品类", icon: Gauge },
  { href: "/companies", label: "企业情报", eyebrow: "COMPANY INTELLIGENCE", description: "企业身份、财务与联邦业务核验", icon: Building2 },
  { href: "/search", label: "数据检索", eyebrow: "TRADE SEARCH", description: "按 HS、来源地和期间查询", icon: Search },
  { href: "/drilldown", label: "品类钻取", eyebrow: "CATEGORY DRILLDOWN", description: "趋势、节奏与来源地对比", icon: BarChart3 },
  { href: "/insights", label: "洞察中心", eyebrow: "OPPORTUNITY INSIGHTS", description: "增长、份额与机会优先级", icon: Lightbulb },
  { href: "/sources", label: "数据治理", eyebrow: "DATA GOVERNANCE", description: "数据源、时效与口径审计", icon: Database },
];

function isRouteActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavigationSidebar({ pathname }: { pathname: string }) {
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  function closeMobileNavigation() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white/95 text-slate-700 shadow-[4px_0_24px_rgba(15,23,42,0.035)] backdrop-blur-xl">
      <SidebarHeader className="gap-0 border-b border-slate-200 p-0">
        <a
          href="/"
          onClick={closeMobileNavigation}
          className="flex min-h-16 items-center gap-2.5 overflow-hidden px-3.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          aria-label="返回市场总览"
        >
          <span
            aria-hidden="true"
            className="size-10 shrink-0 rounded-xl border border-slate-200 bg-white bg-cover bg-center shadow-sm"
            style={{ backgroundImage: "url('/logo-sean.jpg')" }}
          />
          <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[15px] font-extrabold tracking-tight text-[#1a365d]">US Market Lens<span className="text-amber-500">.</span></span>
            <span className="mt-0.5 block truncate text-[10px] tracking-wide text-slate-500">美国进口决策工作台</span>
          </span>
        </a>
        <button
          type="button"
          onClick={toggleSidebar}
          title={isMobile ? "关闭导航" : collapsed ? "展开侧栏" : "收起侧栏"}
          className="flex min-h-11 w-full items-center gap-2 border-t border-slate-200 px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          {collapsed && !isMobile ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          <span className="group-data-[collapsible=icon]:hidden">{isMobile ? "关闭导航" : "收起侧栏"}</span>
        </button>
      </SidebarHeader>

      <SidebarContent className="bg-white/95">
        <SidebarGroup className="py-3">
          <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400">分析模块</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {primaryNav.map((item) => {
                const active = isRouteActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className="relative h-10 rounded-lg px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! data-[active=true]:bg-blue-50 data-[active=true]:text-[#1a365d]"
                    >
                      <a href={item.href} onClick={closeMobileNavigation} aria-current={active ? "page" : undefined}>
                        {active && <span aria-hidden="true" className="absolute -left-2 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#1a365d] group-data-[collapsible=icon]:hidden" />}
                        <item.icon className="size-[18px] shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="bg-slate-200" />
        <div className="mx-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-5 text-slate-600 group-data-[collapsible=icon]:hidden">
          市场金额采用官方口径；企业真实采购额需由订单、ERP 或报关资料验证。
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 bg-slate-50/70 p-3">
        <div className="rounded-lg border border-emerald-200 bg-white p-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" />局域网服务正常</div>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">端口 7022 · 无需登录</p>
        </div>
        <span className="mx-auto hidden size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 group-data-[collapsible=icon]:flex" title="局域网服务正常">
          <ShieldCheck className="size-[18px]" />
        </span>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function MobileBottomNavigation({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden" aria-label="移动端主导航">
      <div className="mx-auto grid max-w-2xl grid-cols-6 px-1">
        {primaryNav.map((item) => {
          const active = isRouteActive(pathname, item.href);
          return (
            <a key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold", active ? "text-[#1a365d]" : "text-slate-500")}>
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#1a365d]" />}
              <span className={cn("flex h-8 w-10 items-center justify-center rounded-xl", active && "bg-blue-50")}><item.icon className="size-[17px]" /></span>
              <span className="w-full truncate text-center">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [globalQuery, setGlobalQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentPage = primaryNav.find((item) => isRouteActive(pathname, item.href)) ?? primaryNav[0];

  useEffect(() => {
    try {
      setSidebarOpen(localStorage.getItem("us-market-lens-sidebar") !== "collapsed");
    } catch {}
  }, []);

  function updateSidebar(open: boolean) {
    setSidebarOpen(open);
    try {
      localStorage.setItem("us-market-lens-sidebar", open ? "expanded" : "collapsed");
    } catch {}
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const query = globalQuery.trim();
    const destination = query
      ? /^\d{2,10}$/.test(query)
        ? `/search?q=${encodeURIComponent(query)}`
        : `/companies?q=${encodeURIComponent(query)}`
      : "/companies";
    window.location.assign(destination);
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={updateSidebar} style={{ "--sidebar-width": "14rem", "--sidebar-width-icon": "4.25rem" } as CSSProperties}>
      <NavigationSidebar pathname={pathname} />

      <SidebarInset className="min-w-0 bg-[#f3f6fa] pb-20 md:pb-0">
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center gap-3 border-b border-slate-200/90 bg-white/95 px-4 shadow-[0_6px_24px_rgba(15,23,42,0.035)] backdrop-blur-xl sm:px-6">
          <SidebarTrigger className="size-10 shrink-0 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden" aria-label="打开导航菜单" />
          <div className="hidden w-56 min-w-0 shrink-0 xl:block">
            <p className="truncate text-[10px] font-bold uppercase tracking-[1.25px] text-slate-400">{currentPage.eyebrow}</p>
            <p className="truncate text-base font-extrabold tracking-tight text-slate-900">{currentPage.label}</p>
            <p className="truncate text-[11px] text-slate-500">{currentPage.description}</p>
          </div>
          <form onSubmit={submitSearch} className="relative w-full min-w-0 max-w-xl xl:ml-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="搜索企业、股票代码或 HS 编码" className="h-10 border-slate-300 bg-slate-50 pl-9 shadow-none focus-visible:bg-white" />
          </form>
          <HelpCenter pathname={pathname} />
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800"><Wifi className="mr-1 size-3.5" />LAN</Badge>
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800"><ShieldCheck className="mr-1 size-3.5" />官方数据</Badge>
          </div>
        </header>
        {children}
      </SidebarInset>
      <MobileBottomNavigation pathname={pathname} />
    </SidebarProvider>
  );
}
