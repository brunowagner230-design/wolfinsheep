import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, MousePointerClick, UserPlus, Wallet, Network } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl, type DealRow } from "@/lib/panel";

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

function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: deals = [] } = useQuery({
    queryKey: ["my-deals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_deals")
        .select("*, betting_houses(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DealRow[];
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

  const { data: adminExists = true } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_exists");
      if (error) throw error;
      return Boolean(data);
    },
  });

  const totals = deals.reduce(
    (acc, d) => ({
      cpa: acc.cpa + d.eligible_cpa,
      clicks: acc.clicks + d.clicks,
      regs: acc.regs + d.registrations,
      revenue: acc.revenue + d.eligible_cpa * Number(d.cpa_amount),
    }),
    { cpa: 0, clicks: 0, regs: 0, revenue: 0 },
  );

  const cards = [
    { label: "CPAs elegíveis", value: totals.cpa.toString(), icon: Handshake },
    { label: "Cliques", value: totals.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
    { label: "Registros", value: totals.regs.toLocaleString("pt-BR"), icon: UserPlus },
    { label: "Estimativa CPA", value: brl(totals.revenue), icon: Wallet },
  ];

  return (
    <AppShell title="Painel" subtitle="Resumo dos seus acordos de CPA nas casas de aposta.">


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="glow-panel border-border/60">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Seus acordos ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deals.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum acordo lançado ainda. A administração publica os acordos das casas aqui.
              </p>
            )}
            {deals.slice(0, 5).map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/40 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{d.betting_houses?.name ?? "Casa"}</p>
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

        <Card>
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
