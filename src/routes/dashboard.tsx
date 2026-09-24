import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Handshake, MousePointerClick, UserPlus, Wallet, Network, Copy, TrendingUp, TriangleAlert, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl, type DealRow } from "@/lib/panel";
import { HouseBadge, houseLogo } from "@/components/HouseBadge";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Painel do afiliado | Wolf in Sheep Affiliates" },
    { name: "description", content: "Acompanhe acordos, CPAs, ganhos e sua rede de afiliados." },
  ]}),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();

  const { data: deals = [] } = useQuery({
    queryKey: ["my-deals", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_deals").select("*, betting_houses(name)")
        .eq("affiliate_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error; return (data ?? []) as unknown as DealRow[];
    },
  });
  const { data: payouts = [] } = useQuery({
    queryKey: ["my-payouts", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("withdrawals").select("amount, status, created_at")
        .eq("user_id", user!.id).order("created_at", { ascending: true });
      if (error) throw error; return (data ?? []) as { amount:number|string; status:string; created_at:string }[];
    },
  });
  const { data: network = 0 } = useQuery({
    queryKey: ["network-count", user?.id], enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase.from("profiles").select("id", { count:"exact", head:true }).eq("referred_by", user!.id);
      if (error) throw error; return count ?? 0;
    },
  });
  const { data: houseLinks = [] } = useQuery({
    queryKey: ["my-house-links", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("link_requests").select("house_id, promo_link, betting_houses(name)")
        .eq("user_id", user!.id).eq("status", "liberado").order("created_at", { ascending:false });
      if (error) throw error;
      return (data ?? []).filter((r) => !!r.promo_link) as unknown as {house_id:string; promo_link:string; betting_houses?:{name:string}|null}[];
    },
  });
  const { data: operationHouses = [] } = useQuery({
    queryKey: ["operation-houses"],
    enabled: !!user,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("betting_houses")
        .select("*")
        .ilike("name", "%superbet%")
        .order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; logo_url: string | null; is_active?: boolean; pause_message?: string | null }[];
    },
  });

  const { data: networkEarnings = 0 } = useQuery({
    queryKey: ["network-earnings", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("cascade_network", { _user_id:user!.id });
      if (error) throw error;
      return (data ?? []).reduce((sum:number,row:{commission:number|string}) => sum + Number(row.commission ?? 0), 0);
    },
  });

  const [houseId, setHouseId] = useState("");
  const [range, setRange] = useState("30");

  const houses = useMemo(
    () => operationHouses.map((h) => ({ id: h.id, name: h.name, logo_url: h.logo_url, is_active: h.is_active !== false, pause_message: h.pause_message })),
    [operationHouses],
  );

  useEffect(() => {
    if (houses.length && !houses.some(h => h.id === houseId)) setHouseId(houses[0]!.id);
  }, [houses, houseId]);

  const filtered = useMemo(() => deals.filter(d => d.house_id === houseId), [deals, houseId]);
  const visibleLinks = useMemo(() => houseLinks.filter(l => l.house_id === houseId), [houseLinks, houseId]);

  const totals = filtered.reduce((acc,d) => ({
    cpa: acc.cpa + d.eligible_cpa,
    clicks: acc.clicks + d.clicks,
    regs: acc.regs + d.registrations,
    revenue: acc.revenue + d.eligible_cpa * Number(d.cpa_amount),
  }), {cpa:0, clicks:0, regs:0, revenue:0});

  const selectedHouse = houses.find(h => h.id === houseId);
  const activeHouseName = selectedHouse?.name ?? null;
  const activeLogo = selectedHouse ? (selectedHouse.logo_url || houseLogo(activeHouseName)) : null;
  const selectedHousePaused = selectedHouse?.is_active === false;

  const chart = useMemo(() => {
    const days = Number(range);
    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - (days - 1));
    const buckets = new Map<string,number>();
    for (let i=0;i<days;i++) { const d=new Date(start); d.setDate(start.getDate()+i); buckets.set(d.toISOString().slice(0,10),0); }
    payouts.filter(p => p.status === "aprovado").forEach(p => {
      const key=p.created_at.slice(0,10); if (buckets.has(key)) buckets.set(key,(buckets.get(key)??0)+Number(p.amount));
    });
    return [...buckets].map(([key,value]) => ({dia:key.slice(8,10)+"/"+key.slice(5,7),valor:value}));
  }, [payouts, range]);
  const chartTotal = chart.reduce((s,p)=>s+p.valor,0);
  const total = totals.revenue + Number(networkEarnings);

  const copyLink = async (link:string, houseName:string) => {
    try { await navigator.clipboard.writeText(link); }
    catch { const ta=document.createElement("textarea"); ta.value=link; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    toast.success(`Link da ${houseName} copiado!`);
  };

  const cards = [
    {label:"CPAs elegíveis",value:String(totals.cpa),icon:Handshake, hint:"Conversões validadas"},
    {label:"Cliques",value:totals.clicks.toLocaleString("pt-BR"),icon:MousePointerClick,hint:"Tráfego registrado"},
    {label:"Registros",value:totals.regs.toLocaleString("pt-BR"),icon:UserPlus,hint:"Cadastros gerados"},
    {label:"Ganhos CPA",value:brl(totals.revenue),icon:Wallet,hint:"Comissão própria"},
    {label:"Ganhos com a rede",value:brl(Number(networkEarnings)),icon:Network,hint:"Comissões da sua rede"},
  ];

  return (
    <AppShell title="Visão geral" subtitle="Acompanhe sua operação, seus ganhos e o desempenho da sua rede.">
      <div className="panel-page">
        <section className="page-hero">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Resumo da operação</p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Seu painel em um só lugar</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Veja seus números principais, copie seus links e acompanhe as comissões sem precisar procurar em várias telas.</p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/acordos">Ver acordos <ArrowUpRight className="size-4" /></Link>
            </Button>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map(c => (
            <Card key={c.label} className="metric-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><c.icon className="size-4" /></div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Atual</span>
                </div>
                <p className="mt-5 text-xs font-medium text-muted-foreground">{c.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-tight">{c.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{c.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
          <Card className="product-card rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
              <div><CardTitle className="text-base">Comissões recebidas</CardTitle><p className="mt-1 text-xs text-muted-foreground">Total aprovado no período: <strong className="text-foreground">{brl(chartTotal)}</strong></p></div>
              <Select value={range} onValueChange={setRange}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem></SelectContent></Select>
            </CardHeader>
            <CardContent className="h-64 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs><linearGradient id="cpaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.65 0.24 300)" stopOpacity={0.55}/><stop offset="100%" stopColor="oklch(0.65 0.24 300)" stopOpacity={0.02}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0.02 300 / 0.12)" />
                  <XAxis dataKey="dia" tick={{fontSize:10}} stroke="oklch(0.75 0.02 300 / 0.55)" />
                  <YAxis tick={{fontSize:10}} stroke="oklch(0.75 0.02 300 / 0.55)" tickFormatter={(v:number)=>`R$${v}`} />
                  <Tooltip formatter={(v:number)=>brl(Number(v))} contentStyle={{background:"oklch(0.18 0.03 300)",border:"1px solid oklch(0.65 0.2 300 / 0.35)",borderRadius:12,color:"white"}} />
                  <Area type="monotone" dataKey="valor" stroke="oklch(0.75 0.22 300)" strokeWidth={2.5} fill="url(#cpaFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="product-card rounded-2xl">
            <CardHeader><CardTitle className="text-base">Resumo financeiro</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div><p className="text-xs text-muted-foreground">Ganhos CPA próprios</p><p className="mt-1 font-display text-2xl font-semibold">{brl(totals.revenue)}</p></div>
              <div className="border-t border-border/60 pt-4"><p className="text-xs text-muted-foreground">Ganhos com sua rede</p><p className="mt-1 font-display text-2xl font-semibold text-success">{brl(Number(networkEarnings))}</p></div>
              <div className="rounded-xl bg-primary/8 p-4"><p className="text-xs text-muted-foreground">Total da operação</p><p className="mt-1 font-display text-3xl font-semibold">{brl(total)}</p></div>
              <Button asChild variant="secondary" className="w-full"><Link to="/carteira">Abrir carteira</Link></Button>
            </CardContent>
          </Card>
        </div>

        {activeHouseName && (
          <section className="product-card rounded-2xl p-5">
            <div className="flex flex-wrap items-center gap-4">
              {activeLogo && <img src={activeLogo} alt={`Logo ${activeHouseName}`} className="size-11 object-contain" />}
              <div className="min-w-0 flex-1"><p className={`text-xs font-semibold uppercase tracking-[0.14em] ${selectedHousePaused ? "text-amber-400" : "text-success"}`}>{selectedHousePaused ? "Operação pausada" : "Operação ativa"}</p><p className="mt-1 text-lg font-semibold">{activeHouseName}</p><p className="text-xs text-muted-foreground">{selectedHousePaused ? (selectedHouse?.pause_message || "Esta operação está temporariamente pausada pela administração.") : "Acordo de CPA disponível para sua operação."}</p></div>
              {houses.length > 1 && <Select value={houseId} onValueChange={setHouseId}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent>{houses.map(h=><SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select>}
            </div>
          </section>
        )}

        {visibleLinks.length > 0 && <section className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-base font-semibold">Links de divulgação</h3><Badge variant="secondary">{visibleLinks.length} ativo{visibleLinks.length===1?"":"s"}</Badge></div>
          {visibleLinks.map(l => <div key={l.house_id} className="action-row">
            <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{l.betting_houses?.name ?? "Casa"}</p><p className="mt-1 break-all font-mono text-xs">{l.promo_link}</p></div>
            <Button size="sm" className="gap-2" onClick={()=>copyLink(l.promo_link,l.betting_houses?.name ?? "casa")}><Copy className="size-3.5"/>Copiar</Button>
          </div>)}
        </section>}

        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <Card className="product-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Acordos ativos</CardTitle><Button asChild variant="ghost" size="sm"><Link to="/acordos">Ver todos</Link></Button></CardHeader>
            <CardContent className="space-y-2">
              {filtered.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum acordo lançado para esta casa ainda.</div>}
              {filtered.slice(0,5).map(d => <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/25 px-4 py-3">
                <div className="min-w-0"><HouseBadge name={d.betting_houses?.name ?? "Casa"} /><p className="mt-1 text-[11px] text-muted-foreground">{d.cpa_plan || d.deal_name || "Plano CPA"}</p></div>
                <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{d.eligible_cpa} CPA</span><strong className="text-sm">{brl(Number(d.cpa_amount))}</strong><Badge variant={d.status==="ativo"?"default":"secondary"}>{d.status}</Badge></div>
              </div>)}
            </CardContent>
          </Card>
          <Card className="product-card rounded-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Network className="size-4 text-primary"/>Minha rede</CardTitle></CardHeader>
            <CardContent><p className="font-display text-4xl font-semibold">{network}</p><p className="mt-1 text-sm text-muted-foreground">afiliados diretos cadastrados</p><Button asChild className="mt-5 w-full" variant="secondary"><Link to="/rede">Abrir minha rede</Link></Button></CardContent>
          </Card>
        </div>

        {selectedHousePaused && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-4">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400"/>
            <div><p className="text-sm font-semibold text-foreground">Operação pausada</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedHouse?.pause_message || "A administração pausou temporariamente esta operação. O status será atualizado automaticamente quando ela for reativada."}</p></div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
