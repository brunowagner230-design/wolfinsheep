import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Handshake,
  MousePointerClick,
  UserPlus,
  Wallet,
  Network,
  Copy,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl, type DealRow } from "@/lib/panel";
import { HouseBadge, houseLogo } from "@/components/HouseBadge";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do afiliado | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Veja CPAs elegíveis, cliques, registros e o faturamento estimado dos seus acordos de CPA.",
      },
      { property: "og:title", content: "Painel do afiliado | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Métricas de CPA, cliques e registros do afiliado.",
      },
    ],
  }),
  component: DashboardPage,
});

const CARD_STYLES = [
  "from-[oklch(0.55_0.24_300/0.28)] to-transparent border-[oklch(0.7_0.2_300/0.4)]",
  "from-[oklch(0.7_0.16_230/0.24)] to-transparent border-[oklch(0.7_0.16_230/0.4)]",
  "from-[oklch(0.75_0.15_60/0.24)] to-transparent border-[oklch(0.8_0.15_70/0.4)]",
  "from-[oklch(0.7_0.17_150/0.24)] to-transparent border-[oklch(0.75_0.17_150/0.4)]",
];

function DashboardPage() {
  const { user } = useAuth();

  const { data: deals = [] } = useQuery({
    queryKey: ["my-deals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_deals")
        .select("*, betting_houses(name)")
        .eq("affiliate_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DealRow[];
    },
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["my-payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("amount, status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { amount: number | string; status: string; created_at: string }[];
    },
  });

  const { data: network = 0 } = useQuery({
    queryKey: ["network-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: houseLinks = [] } = useQuery({
    queryKey: ["my-house-links", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("link_requests")
        .select("house_id, promo_link, betting_houses(name)")
        .eq("user_id", user!.id)
        .eq("status", "liberado")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((r) => !!r.promo_link) as unknown as {
        house_id: string;
        promo_link: string;
        betting_houses?: { name: string } | null;
      }[];
    },
  });

  const { data: networkEarnings = 0 } = useQuery({
    queryKey: ["network-earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("cascade_network", { _user_id: user!.id });
      if (error) throw error;
      return (data ?? []).reduce(
        (sum: number, row: { commission: number | string }) => sum + Number(row.commission ?? 0),
        0,
      );
    },
  });

  const [houseId, setHouseId] = useState("todas");
  const [range, setRange] = useState("30");

  const houses = useMemo(() => {
    const map = new Map<string, string>();
    deals.forEach((d) => {
      if (d.house_id) map.set(d.house_id, d.betting_houses?.name ?? "Casa");
    });
    return [...map].map(([id, name]) => ({ id, name }));
  }, [deals]);

  const filtered = useMemo(
    () => (houseId === "todas" ? deals : deals.filter((d) => d.house_id === houseId)),
    [deals, houseId],
  );

  const visibleLinks = useMemo(
    () =>
      houseId === "todas" ? houseLinks : houseLinks.filter((l) => l.house_id === houseId),
    [houseLinks, houseId],
  );

  const totals = filtered.reduce(
    (acc, d) => ({
      cpa: acc.cpa + d.eligible_cpa,
      clicks: acc.clicks + d.clicks,
      regs: acc.regs + d.registrations,
      revenue: acc.revenue + d.eligible_cpa * Number(d.cpa_amount),
    }),
    { cpa: 0, clicks: 0, regs: 0, revenue: 0 },
  );

  const selectedHouse = houses.find((h) => h.id === houseId);
  const activeHouseName =
    selectedHouse?.name ?? filtered.map((d) => d.betting_houses?.name).find(Boolean) ?? null;
  const activeLogo = houseLogo(activeHouseName);

  const chart = useMemo(() => {
    const days = Number(range);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    payouts
      .filter((p) => p.status === "aprovado")
      .forEach((p) => {
        const key = p.created_at.slice(0, 10);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount));
      });
    return [...buckets].map(([key, value]) => ({
      dia: key.slice(8, 10) + "/" + key.slice(5, 7),
      valor: value,
    }));
  }, [payouts, range]);

  const chartTotal = chart.reduce((s, p) => s + p.valor, 0);

  const cards = [
    { label: "CPAs elegíveis", value: totals.cpa.toString(), icon: Handshake },
    { label: "Cliques", value: totals.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
    { label: "Registros", value: totals.regs.toLocaleString("pt-BR"), icon: UserPlus },
    { label: "Ganhos CPA próprios", value: brl(totals.revenue), icon: Wallet },
    { label: "Ganhos com rede", value: brl(networkEarnings), icon: Network },
    {
      label: "Ganhos totais",
      value: brl(totals.revenue + networkEarnings),
      icon: TrendingUp,
    },
  ];

  return (
    <AppShell title="Painel" subtitle="Resumo dos seus acordos de CPA nas casas de aposta.">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Casa de aposta
        </span>
        <Select value={houseId} onValueChange={setHouseId}>
          <SelectTrigger className="w-64 border-primary/40 bg-secondary/50">
            <SelectValue placeholder="Todas as casas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as casas</SelectItem>
            {houses.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visibleLinks.length > 0 && (
        <div className="mb-6 space-y-3">
          {visibleLinks.map((l) => (
            <div
              key={l.house_id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/20 to-transparent px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Link de divulgação — {l.betting_houses?.name ?? "Casa"}
                </p>
                <p className="truncate font-mono text-sm">{l.promo_link}</p>
              </div>
              <Button
                className="gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(l.promo_link);
                  toast.success(`Link da ${l.betting_houses?.name ?? "casa"} copiado!`);
                }}
              >
                <Copy className="size-4" /> Copiar link
              </Button>
            </div>
          ))}
        </div>
      )}

      {activeHouseName && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 to-transparent px-5 py-4">
          {activeLogo && (
            <img
              src={activeLogo}
              alt={`Logo ${activeHouseName}`}
              className="size-12 object-contain"
            />
          )}
          <div>
            <p className="font-display text-lg font-bold">Parceiro {activeHouseName} ativo</p>
            <p className="text-xs text-muted-foreground">
              Você possui acordo de CPA configurado na {activeHouseName}.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => (
          <Card
            key={c.label}
            className={`glow-panel border bg-gradient-to-br ${CARD_STYLES[i % CARD_STYLES.length]}`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-primary/30 bg-gradient-to-b from-primary/10 to-transparent">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" /> Comissões recebidas
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Total no período: <span className="font-semibold text-foreground">{brl(chartTotal)}</span>
            </p>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44 border-primary/40 bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="cpaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.24 300)" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="oklch(0.65 0.24 300)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0.02 300 / 0.15)" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="oklch(0.75 0.02 300 / 0.6)" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="oklch(0.75 0.02 300 / 0.6)"
                tickFormatter={(v: number) => `R$${v}`}
              />
              <Tooltip
                formatter={(v: number) => brl(Number(v))}
                contentStyle={{
                  background: "oklch(0.18 0.03 300)",
                  border: "1px solid oklch(0.65 0.2 300 / 0.4)",
                  borderRadius: 12,
                  color: "white",
                }}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="oklch(0.75 0.22 300)"
                strokeWidth={2}
                fill="url(#cpaFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Seus acordos ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum acordo lançado ainda. A administração publica os acordos das casas aqui.
              </p>
            )}
            {filtered.slice(0, 5).map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-gradient-to-r from-secondary/60 to-secondary/20 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">
                    <HouseBadge name={d.betting_houses?.name ?? "Casa"} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.cpa_plan || d.deal_name || "Plano CPA"}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{d.eligible_cpa} CPA</span>
                  <span className="font-semibold">{brl(Number(d.cpa_amount))}</span>
                  <Badge variant={d.status === "ativo" ? "default" : "secondary"}>{d.status}</Badge>
                </div>
              </div>
            ))}
            <Button asChild variant="secondary" size="sm">
              <Link to="/acordos">Ver todos os acordos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-gradient-to-br from-primary/20 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="size-4 text-primary" /> Minha rede
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-bold">{network}</p>
            <p className="mt-1 text-sm text-muted-foreground">afiliados cadastrados pelo seu link</p>
            <Button asChild className="mt-4 w-full" variant="secondary">
              <Link to="/rede">Gerenciar rede</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
