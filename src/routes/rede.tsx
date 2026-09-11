import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
          "Compartilhe seu link de indicação, acompanhe os afiliados cadastrados por você e defina o plano de CPA de cada um.",
      },
      { property: "og:title", content: "Minha rede de afiliados | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Link de indicação, sub-afiliados e planos de CPA da sua rede.",
      },
    ],
  }),
  component: NetworkPage,
});

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

  // Teto de comissão: o maior CPA que o próprio usuário recebe em cada casa
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

  const caps: Record<string, number> = {};
  for (const d of myDeals) {
    const key = d.house_id ?? "geral";
    caps[key] = Math.max(caps[key] ?? 0, Number(d.cpa_amount) || 0);
  }

  const approve = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cadastro aprovado!");
    qc.invalidateQueries({ queryKey: ["downlines"] });
  };

  const link =
    typeof window !== "undefined" && me
      ? `${window.location.origin}/auth?ref=${me.referral_code}`
      : "";

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

  const levelTotal = (level: number) =>
    cascade.filter((c) => c.level === level).reduce((s, c) => s + Number(c.commission), 0);
  const networkTotal = cascade.reduce((s, c) => s + Number(c.commission), 0);


  return (
    <AppShell
      title="Minha rede"
      subtitle="Indique afiliados com seu link e defina o plano de CPA de cada um."
    >
      <Card className="glow-panel">
        <CardHeader>
          <CardTitle className="text-base">Seu link de indicação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input readOnly value={link} className="max-w-xl font-mono text-xs" />
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              toast.success("Link copiado!");
            }}
          >
            <Copy className="mr-2 size-4" /> Copiar
          </Button>
          <span className="text-xs text-muted-foreground">
            Código: <strong>{me?.referral_code ?? "—"}</strong>
          </span>
        </CardContent>
      </Card>

      <Card className="mt-6 money-panel border-primary/40">
        <CardHeader>
          <CardTitle className="text-base">
            Cascata de comissões · total {brl(networkTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((level) => {
              const rows = cascade.filter((c) => c.level === level);
              return (
                <div
                  key={level}
                  className="rounded-xl border border-border/70 bg-card/70 p-4 backdrop-blur"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-display text-lg font-bold">Nível {level}</p>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                      {brl(perCpaOf(level))} / CPA
                    </span>
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold">{brl(levelTotal(level))}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        CPAs do nível {level}
                      </p>
                      <p className="font-display text-xl font-bold text-primary">
                        {rows.reduce((s, r) => s + Number(r.cpas), 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        Afiliados
                      </p>
                      <p className="font-display text-xl font-bold">{rows.length}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {level === 1
                          ? "Indique afiliados com seu link para começar."
                          : `Quando seus afiliados indicarem, o nível ${level} aparece aqui.`}
                      </p>
                    ) : (
                      rows.map((r) => (
                        <div
                          key={r.affiliate_id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="truncate">
                            {r.affiliate_name || r.affiliate_email}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                              {Number(r.cpas)} CPA
                            </span>
                            <span className="font-semibold text-success">
                              {brl(Number(r.commission))}
                            </span>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Seu ganho é o valor fixo da diferença: se o seu CPA é R$ 100 e você repassa R$ 80 ao
            seu afiliado direto, você ganha R$ 20 por CPA validado — e continua ganhando esses R$ 20
            em cada CPA dos níveis 2 e 3 daquela linha, mesmo que eles repassem valores menores
            entre si. As comissões entram automaticamente no saldo da sua carteira.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Afiliados indicados ({downlines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {downlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ninguém se cadastrou pelo seu link ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Planos definidos</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downlines.map((d) => {
                    const own = plans.filter((p) => p.downline_id === d.id);
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <p className="font-medium">{d.full_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{d.referral_code}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          <p>{d.email}</p>
                          <p className="text-xs text-muted-foreground">{d.phone}</p>
                        </TableCell>
                        <TableCell>
                          {d.approved ? (
                            <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-1 text-xs font-semibold text-success">
                              <Check className="size-3" /> aprovado
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="gap-1 bg-success text-success-foreground hover:bg-success/90"
                              onClick={() => approve(d.id)}
                            >
                              <Check className="size-3" /> Aprovar
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {own.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            own.map((p) => {
                              const cap = caps[p.house_id ?? "geral"] ?? 0;
                              const margin = cap - Number(p.cpa_amount);
                              return (
                                <p key={p.id}>
                                  {p.betting_houses?.name ?? "Geral"} ·{" "}
                                  {brl(Number(p.cpa_amount))}
                                  {cap > 0 && (
                                    <span className="text-xs text-success">
                                      {" "}
                                      (seu lucro: {brl(margin)})
                                    </span>
                                  )}
                                </p>
                              );
                            })
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <PlanDialog
                            downline={d}
                            houses={houses}
                            caps={caps}
                            uplineId={user!.id}
                            onSaved={() => qc.invalidateQueries({ queryKey: ["network-plans"] })}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
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
  const [houseId, setHouseId] = useState<string>("");
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
      toast.error("Você não tem acordo de CPA nesta casa, então não pode repassar comissão.");
      return;
    }
    if (value <= 0) {
      toast.error("Informe o valor do CPA do afiliado");
      return;
    }
    if (value > cap) {
      toast.error(`O valor não pode passar do seu teto de ${brl(cap)}`);
      return;
    }
    const { error } = await supabase.from("network_plans").upsert(
      {
        upline_id: uplineId,
        downline_id: downline.id,
        house_id: houseId || null,
        cpa_amount: value,
      },
      { onConflict: "upline_id,downline_id,house_id" },
    );

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Plano de CPA definido!");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Definir CPA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plano de CPA · {downline.full_name || downline.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Casa de aposta</Label>
            <Select value={houseId} onValueChange={setHouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a casa" />
              </SelectTrigger>
              <SelectContent>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-amount">Valor do CPA do afiliado (R$)</Label>
            <Input
              id="plan-amount"
              type="number"
              min="0"
              max={cap || undefined}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {cap > 0 ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <p>
                  Seu teto nesta casa: <strong>{brl(cap)}</strong>
                </p>
                <p className={margin < 0 ? "text-destructive" : "text-success"}>
                  {margin < 0
                    ? "Valor acima do seu teto — reduza a comissão."
                    : `Seu lucro por CPA validado: ${brl(margin)}`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Você ainda não tem acordo de CPA nesta casa, então não há teto para repassar.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>Salvar plano</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
