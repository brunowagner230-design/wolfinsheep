import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AWARD_TIERS, tierProgress } from "@/lib/awards";
import { brl, type DealRow } from "@/lib/panel";

export const Route = createFileRoute("/premiacoes")({
  head: () => ({
    meta: [
      { title: "Premiações | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Placas de premiação por faturamento em CPA: 10K, 30K, 50K, 100K, 250K, 500K e 1M com progresso em tempo real.",
      },
      { property: "og:title", content: "Premiações | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Conquiste as placas de faturamento em CPA de 10K até 1M.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AwardsPage,
});

type CascadeRow = { level: number; commission: number | string };

function AwardsPage() {
  const { user } = useAuth();
  const sb = supabase as unknown as { rpc: (fn: string, args: unknown) => any };

  const { data: deals = [] } = useQuery({
    queryKey: ["awards-deals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_deals")
        .select("*")
        .eq("affiliate_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as DealRow[];
    },
  });

  const { data: cascade = [] } = useQuery({
    queryKey: ["cascade", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb.rpc("cascade_network", { _user_id: user!.id });
      if (error) throw error;
      return (data ?? []) as CascadeRow[];
    },
  });

  const own = deals.reduce((s, d) => s + d.eligible_cpa * Number(d.cpa_amount), 0);
  const network = cascade.reduce((s, r) => s + Number(r.commission), 0);
  const revenue = own + network;

  const unlocked = AWARD_TIERS.filter((t) => revenue >= t.goal).length;
  const next = AWARD_TIERS.find((t) => revenue < t.goal);

  return (
    <AppShell
      title="Premiações"
      subtitle="Placas de faturamento em CPA — conquistadas automaticamente conforme seu volume cresce."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="product-card rounded-2xl money-panel border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Faturado com CPA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold">{brl(revenue)}</p>
          </CardContent>
        </Card>
        <Card className="product-card rounded-2xl glow-panel border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Placas conquistadas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <p className="font-display text-3xl font-bold">
              {unlocked}/{AWARD_TIERS.length}
            </p>
          </CardContent>
        </Card>
        <Card className="product-card rounded-2xl glow-panel border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Próxima placa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold">{next ? next.label : "1M"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {next ? `Faltam ${brl(next.goal - revenue)}` : "Todas as placas conquistadas!"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {AWARD_TIERS.map((tier) => {
          const pct = tierProgress(revenue, tier.goal);
          const done = pct >= 100;
          return (
            <article
              key={tier.label}
              className="rounded-2xl p-[3px] transition-transform duration-300 hover:-translate-y-1"
              style={{
                background: tier.metal,
                boxShadow: done
                  ? `0 22px 50px -24px ${tier.ring}, inset 0 0 0 1px rgba(255,255,255,0.25)`
                  : "0 18px 40px -30px rgba(0,0,0,0.8)",
              }}
            >
              <div className="rounded-[calc(1rem-1px)] bg-card/95 p-5 backdrop-blur">
                <div
                  className="rounded-xl border border-white/10 p-5 text-center"
                  style={{
                    background: `radial-gradient(120% 120% at 50% 0%, ${tier.ring}, transparent 70%), ${tier.plate}`,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                  }}
                >
                  <Wordmark
                    className={`mx-auto h-11 w-auto ${done ? "" : "opacity-60 grayscale"}`}
                  />
                  <p className="mt-3 font-display text-4xl font-bold tracking-tight">
                    {tier.label}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    faturados com CPA
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Meta {brl(tier.goal)}</p>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      {done ? "Placa conquistada" : "Em progresso"}
                    </span>
                    <span className="font-display font-bold">{pct.toFixed(pct < 10 ? 1 : 0)}%</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(pct, 1.5)}%`, background: tier.metal }}
                    />
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    {done ? (
                      <>
                        <Trophy className="size-3 text-primary" /> {brl(revenue)} faturados
                      </>
                    ) : (
                      <>
                        <Lock className="size-3" /> {brl(revenue)} de {brl(tier.goal)}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
