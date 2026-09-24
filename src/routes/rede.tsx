import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Layers3,
  Network,
  TrendingUp,
  Users,
  UserPlus,
  ChevronRight,
  CircleDollarSign,
  Settings2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl, type HouseRow, type NetworkPlanRow, type ProfileRow } from "@/lib/panel";

type CascadeRow = {
  level: number;
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  cpas: number;
  gross: number | string;
  commission: number | string;
};

export const Route = createFileRoute("/rede")({
  head: () => ({
    meta: [
      { title: "Minha rede de afiliados | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Gerencie sua rede de afiliados em até três níveis e acompanhe sua margem real por CPA.",
      },
    ],
  }),
  component: NetworkPage,
});

const levelConfig = {
  1: {
    label: "Nível 1",
    title: "Afiliados diretos",
    description: "Quem entrou diretamente pelo seu link.",
    icon: UserPlus,
  },
  2: {
    label: "Nível 2",
    title: "Rede dos seus afiliados",
    description: "Indicados pelos seus afiliados de nível 1.",
    icon: Users,
  },
  3: {
    label: "Nível 3",
    title: "Terceiro nível",
    description: "Indicados pela sua rede de nível 2.",
    icon: Layers3,
  },
} as const;

function NetworkPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ProfileRow | null;
    },
  });

  const { data: downlines = [] } = useQuery({
    queryKey: ["downlines", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("referred_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProfileRow[];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["network-plans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("network_plans")
        .select("*, betting_houses(name)")
        .eq("upline_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as NetworkPlanRow[];
    },
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["houses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("betting_houses").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as HouseRow[];
    },
  });

  const { data: myDeals = [] } = useQuery({
    queryKey: ["my-deals-caps", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_deals")
        .select("house_id, cpa_amount")
        .eq("affiliate_id", user!.id);
      if (error) throw error;
      return (data ?? []) as { house_id: string | null; cpa_amount: number | string }[];
    },
  });

  const caps = useMemo(() => {
    const result: Record<string, number> = {};
    for (const d of myDeals) {
      const key = d.house_id ?? "geral";
      result[key] = Math.max(result[key] ?? 0, Number(d.cpa_amount) || 0);
    }
    return result;
  }, [myDeals]);

  const { data: cascade = [] } = useQuery({
    queryKey: ["cascade", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const rpc = supabase as unknown as { rpc: (fn: string, args: unknown) => any };
      const { data, error } = await rpc.rpc("cascade_network", { _user_id: user!.id });
      if (error) throw error;
      return (data ?? []) as CascadeRow[];
    },
  });

  const byLevel = (level: number) => cascade.filter((row) => row.level === level);
  const totalCpas = cascade.reduce((sum, row) => sum + Number(row.cpas), 0);
  const totalCommission = cascade.reduce((sum, row) => sum + Number(row.commission), 0);
  const link =
    typeof window !== "undefined" && me
      ? `${window.location.origin}/auth?ref=${me.referral_code}`
      : "";

  const approve = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cadastro aprovado!");
    qc.invalidateQueries({ queryKey: ["downlines"] });
  };

  return (
    <AppShell
      title="Minha rede"
      subtitle="Controle sua estrutura, seus repasses e a margem gerada por cada nível."
    >
      <div className="space-y-6">
        <Card className="product-card rounded-2xl overflow-hidden border-primary/30 bg-card shadow-xl shadow-primary/5">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-[1fr_auto]">
              <div className="p-6 lg:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Network className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      Sua estrutura
                    </p>
                    <h2 className="mt-1 text-xl font-bold">Rede em até 3 níveis</h2>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Sua margem não é fixa. Ela é calculada pela diferença entre o CPA que você recebe
                  e o CPA que cada afiliado repassa. A mesma lógica acompanha os níveis 1, 2 e 3.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <StatPill icon={Users} label="Afiliados" value={String(cascade.length)} />
                  <StatPill icon={TrendingUp} label="CPAs da rede" value={String(totalCpas)} />
                  <StatPill
                    icon={CircleDollarSign}
                    label="Sua comissão de rede"
                    value={brl(totalCommission)}
                  />
                </div>
              </div>

              <div className="border-t border-border bg-primary/5 p-6 lg:w-[360px] lg:border-l lg:border-t-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Seu link de indicação
                </p>
                <p className="mt-2 text-sm font-semibold">Código {me?.referral_code ?? "—"}</p>
                <div className="mt-3 flex gap-2">
                  <Input readOnly value={link} className="min-w-0 font-mono text-xs" />
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label="Copiar link"
                    onClick={async () => {
                      await navigator.clipboard.writeText(link);
                      toast.success("Link copiado!");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((level) => {
            const rows = byLevel(level);
            const commission = rows.reduce((sum, row) => sum + Number(row.commission), 0);
            const cpas = rows.reduce((sum, row) => sum + Number(row.cpas), 0);
            const Icon = levelConfig[level as 1 | 2 | 3].icon;

            return (
              <Card
                key={level}
                className="relative overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                <CardHeader className="relative pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                        {levelConfig[level as 1 | 2 | 3].label}
                      </p>
                      <CardTitle className="mt-1 text-lg">
                        {levelConfig[level as 1 | 2 | 3].title}
                      </CardTitle>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-primary">
                      <Icon className="size-5" />
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {levelConfig[level as 1 | 2 | 3].description}
                  </p>
                </CardHeader>
                <CardContent className="relative">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniMetric label="Afiliados" value={String(rows.length)} />
                    <MiniMetric label="CPAs" value={String(cpas)} />
                  </div>
                  <div className="mt-3 rounded-xl border border-success/20 bg-success/5 p-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Sua margem gerada
                    </p>
                    <p className="mt-1 text-xl font-bold text-success">{brl(commission)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="product-card rounded-2xl border-primary/20">
          <CardHeader className="border-b border-border/70 pb-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Estrutura visual
                </p>
                <CardTitle className="mt-1 text-xl">Nível 1 → Nível 2 → Nível 3</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cada nível mostra os CPAs e a margem que chega para você.
                </p>
              </div>
              <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
                Margem dinâmica por CPA
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {[1, 2, 3].map((level, index) => {
                const rows = byLevel(level);
                return (
                  <div key={level} className="relative">
                    {index < 2 && (
                      <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 rounded-full border border-border bg-background p-1 text-primary lg:block" />
                    )}
                    <LevelPanel level={level} rows={rows} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="product-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Gestão direta
              </p>
              <CardTitle className="mt-1 text-lg">Seus afiliados de nível 1</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Aprove cadastros e defina quanto cada afiliado direto recebe.
              </p>
            </div>
            <div className="hidden rounded-xl bg-muted p-3 sm:block">
              <Settings2 className="size-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {downlines.length === 0 ? (
              <EmptyState text="Ninguém se cadastrou pelo seu link ainda." />
            ) : (
              <div className="space-y-3">
                {downlines.map((downline) => {
                  const ownPlans = plans.filter((plan) => plan.downline_id === downline.id);
                  return (
                    <div
                      key={downline.id}
                      className="rounded-2xl border border-border/70 bg-muted/15 p-4 transition-colors hover:border-primary/30"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                            {(downline.full_name || downline.email || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {downline.full_name || "Sem nome"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {downline.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {downline.approved ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                              <Check className="size-3" /> Aprovado
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="gap-1 bg-success text-success-foreground hover:bg-success/90"
                              onClick={() => approve(downline.id)}
                            >
                              <Check className="size-3" /> Aprovar
                            </Button>
                          )}
                          <PlanDialog
                            downline={downline}
                            houses={houses}
                            caps={caps}
                            uplineId={user!.id}
                            onSaved={() => {
                              qc.invalidateQueries({ queryKey: ["network-plans"] });
                              qc.invalidateQueries({ queryKey: ["cascade"] });
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {ownPlans.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                            Nenhum CPA definido
                          </div>
                        ) : (
                          ownPlans.map((plan) => {
                            const cap = caps[plan.house_id ?? "geral"] ?? 0;
                            const amount = Number(plan.cpa_amount);
                            const margin = Math.max(cap - amount, 0);
                            return (
                              <div
                                key={plan.id}
                                className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5"
                              >
                                <p className="truncate text-xs font-semibold">
                                  {plan.betting_houses?.name ?? "Geral"}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <span className="text-sm font-bold">{brl(amount)}</span>
                                  <span className="text-xs font-semibold text-success">
                                    margem {brl(margin)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="product-card rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <CircleDollarSign className="size-4" />
              </div>
              <div>
                <p className="font-semibold">Como sua margem funciona</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Exemplo: se você recebe R$ 100 e repassa R$ 90 ao nível 1, sua margem é R$ 10.
                  Se o nível 1 repassa R$ 80 ao nível 2, o nível 1 fica com R$ 10 e você continua
                  com seus R$ 10. No nível 3, a mesma regra se repete. O sistema calcula a margem
                  por nível, sem usar um valor fixo de R$ 20.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function LevelPanel({ level, rows }: { level: number; rows: CascadeRow[] }) {
  const totalCpas = rows.reduce((sum, row) => sum + Number(row.cpas), 0);
  const totalCommission = rows.reduce((sum, row) => sum + Number(row.commission), 0);

  return (
    <div className="h-full rounded-2xl border border-border/70 bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Nível {level}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {rows.length} {rows.length === 1 ? "afiliado" : "afiliados"}
          </p>
        </div>
        <div className="rounded-lg bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
          {brl(totalCommission)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniMetric label="CPAs" value={String(totalCpas)} />
        <MiniMetric label="Sua comissão" value={brl(totalCommission)} />
      </div>

      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <EmptyState
            compact
            text={
              level === 1
                ? "Ainda sem afiliados diretos."
                : "Ainda não há afiliados neste nível."
            }
          />
        ) : (
          rows.map((row) => {
            const cpas = Number(row.cpas);
            const commission = Number(row.commission);
            const marginPerCpa = cpas > 0 ? commission / cpas : 0;
            return (
              <div
                key={row.affiliate_id}
                className="rounded-xl border border-border/60 bg-background/60 p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(row.affiliate_name || row.affiliate_email || "?")
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {row.affiliate_name || "Sem nome"}
                    </p>
                    <p className="truncate text-[0.7rem] text-muted-foreground">
                      {row.affiliate_email}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                      CPAs
                    </p>
                    <p className="font-bold">{cpas}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                      Margem por CPA
                    </p>
                    <p className="font-bold text-success">{brl(marginPerCpa)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-2">
      <Icon className="size-4 text-primary" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground ${compact ? "px-3 py-4" : "px-4 py-8"}`}
    >
      {text}
    </div>
  );
}

function PlanDialog({
  downline,
  houses,
  caps,
  uplineId,
  onSaved,
}: {
  downline: ProfileRow;
  houses: HouseRow[];
  caps: Record<string, number>;
  uplineId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [houseId, setHouseId] = useState("");
  const [amount, setAmount] = useState("");

  const cap = caps[houseId || "geral"] ?? 0;
  const value = Number(amount) || 0;
  const margin = cap - value;

  const save = async () => {
    if (!houseId) {
      toast.error("Selecione a casa de aposta");
      return;
    }
    if (cap <= 0) {
      toast.error("Você não tem acordo de CPA nesta casa.");
      return;
    }
    if (value <= 0) {
      toast.error("Informe o valor do CPA");
      return;
    }
    if (value > cap) {
      toast.error(`O valor não pode passar do seu CPA de ${brl(cap)}`);
      return;
    }

    const { error } = await supabase.from("network_plans").upsert(
      {
        upline_id: uplineId,
        downline_id: downline.id,
        house_id: houseId,
        cpa_amount: value,
      },
      { onConflict: "upline_id,downline_id,house_id" },
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`CPA de ${brl(value)} definido. Sua margem é ${brl(margin)} por CPA.`);
    setOpen(false);
    setHouseId("");
    setAmount("");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-2">
          <Settings2 className="size-3.5" />
          Definir CPA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>CPA · {downline.full_name || downline.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Casa de aposta</Label>
            <Select value={houseId} onValueChange={setHouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a casa" />
              </SelectTrigger>
              <SelectContent>
                {houses.map((house) => (
                  <SelectItem key={house.id} value={house.id}>
                    {house.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="network-cpa">CPA repassado (R$)</Label>
            <Input
              id="network-cpa"
              type="number"
              min="0"
              max={cap || undefined}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Ex.: 90"
            />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Seu CPA</span>
              <strong>{brl(cap)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">CPA repassado</span>
              <strong>{brl(value)}</strong>
            </div>
            <div className="mt-2 border-t border-border/60 pt-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Sua margem por CPA</span>
                <strong className={margin >= 0 ? "text-success" : "text-destructive"}>
                  {brl(Math.max(margin, 0))}
                </strong>
              </div>
            </div>
          </div>

          {cap <= 0 && (
            <p className="text-xs text-destructive">
              Você ainda não possui um acordo de CPA nesta casa.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={save}>Salvar CPA</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
