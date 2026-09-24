import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BanknoteArrowUp,
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
  Network,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
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
import { HouseBadge } from "@/components/HouseBadge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl, type DealRow, type WithdrawalRow } from "@/lib/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Saldo separado por casa de aposta, cadastro da chave Pix e histórico de saques do afiliado.",
      },
      { property: "og:title", content: "Carteira | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Saldo por casa de aposta, chave Pix e saques do afiliado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});

const MIN_WITHDRAW = 10000;
const SUPERBET_MIN_LABEL = "10 QFTD";
const NETWORK_KEY = "rede";
const WITHDRAW_START = new Date("2026-10-10T00:00:00-03:00");

type WalletBucket = {
  key: string;
  houseId: string | null;
  name: string;
  earned: number;
  paid: number;
  pending: number;
  available: number;
  cpas: number;
};

const statusBadge = (status: string) => {
  if (status === "aprovado")
    return {
      variant: "secondary" as const,
      icon: CheckCircle2,
      className: "border-transparent bg-success text-success-foreground",
    };
  if (status === "rejeitado")
    return { variant: "destructive" as const, icon: XCircle, className: "" };
  return { variant: "secondary" as const, icon: Clock, className: "" };
};

function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>("");

  const { data: deals = [] } = useQuery({
    queryKey: ["wallet-deals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_deals")
        .select("*, betting_houses(name)")
        .eq("affiliate_id", user!.id);
      if (error) throw error;
      return (data ?? []).filter((d: any) => String(d.betting_houses?.name ?? "").toLowerCase().includes("superbet")) as unknown as DealRow[];
    },
  });

  const { data: cascade = [] } = useQuery({
    queryKey: ["cascade", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const rpc = supabase as unknown as { rpc: (fn: string, args: unknown) => any };
      const { data, error } = await rpc.rpc("cascade_network", { _user_id: user!.id });
      if (error) throw error;
      return (data ?? []) as { level: number; commission: number | string }[];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*, betting_houses(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((w: any) => {
        if (!w.house_id) return true;
        return String(w.betting_houses?.name ?? "").toLowerCase().includes("superbet");
      }) as unknown as (WithdrawalRow & {
        house_id: string | null;
        betting_houses?: { name: string } | null;
      })[];
    },
  });

  const networkEarned = cascade.reduce((sum, r) => sum + Number(r.commission), 0);

  const buckets = useMemo<WalletBucket[]>(() => {
    const map = new Map<string, WalletBucket>();
    const ensure = (key: string, houseId: string | null, name: string) => {
      if (!map.has(key))
        map.set(key, {
          key,
          houseId,
          name,
          earned: 0,
          paid: 0,
          pending: 0,
          available: 0,
          cpas: 0,
        });
      return map.get(key)!;
    };

    for (const d of deals) {
      const key = d.house_id ?? NETWORK_KEY;
      const bucket = ensure(key, d.house_id, d.betting_houses?.name ?? "Comissões da rede");
      bucket.earned += d.eligible_cpa * Number(d.cpa_amount);
      bucket.cpas += d.eligible_cpa;
    }

    if (networkEarned > 0) {
      ensure(NETWORK_KEY, null, "Comissões da rede").earned += networkEarned;
    }

    // Saques antigos podem não ter casa vinculada: eles viram um "pool" que
    // é descontado dos saldos para o valor pago nunca ficar de fora da conta.
    let poolPaid = 0;
    let poolPending = 0;

    for (const w of withdrawals) {
      if (!w.house_id) {
        if (w.status === "aprovado") poolPaid += Number(w.amount);
        if (w.status === "pendente") poolPending += Number(w.amount);
        continue;
      }
      const bucket = ensure(w.house_id, w.house_id, w.betting_houses?.name ?? "Comissões da rede");
      if (w.status === "aprovado") bucket.paid += Number(w.amount);
      if (w.status === "pendente") bucket.pending += Number(w.amount);
    }

    const list = [...map.values()];
    for (const b of list) b.available = Math.max(b.earned - b.paid - b.pending, 0);

    // Desconta o pool: primeiro do saldo de rede, depois das casas.
    const order = [
      ...list.filter((b) => b.key === NETWORK_KEY),
      ...list.filter((b) => b.key !== NETWORK_KEY),
    ];
    for (const b of order) {
      if (poolPaid <= 0 && poolPending <= 0) break;
      const takePaid = Math.min(poolPaid, b.available);
      b.paid += takePaid;
      b.available -= takePaid;
      poolPaid -= takePaid;
      const takePending = Math.min(poolPending, b.available);
      b.pending += takePending;
      b.available -= takePending;
      poolPending -= takePending;
    }

    return list.sort((a, b) => {
      if (a.key === NETWORK_KEY) return 1;
      if (b.key === NETWORK_KEY) return -1;
      return b.available - a.available;
    });
  }, [deals, withdrawals, networkEarned]);

  const activeKey = selected || buckets[0]?.key || "";
  const active = buckets.find((b) => b.key === activeKey);

  const activeWithdrawals = withdrawals.filter(
    (w) => (w.house_id ?? NETWORK_KEY) === activeKey,
  );

  const totalAvailable = buckets.reduce((s, b) => s + b.available, 0);
  const canWithdraw = new Date() >= WITHDRAW_START;

  return (
    <AppShell
      title="Carteira"
      subtitle="Cada casa de aposta tem seu próprio saldo — os valores nunca se misturam."
    >
      <Card className="product-card rounded-3xl money-panel border-primary/30 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Saldo total disponível (todas as casas)
          </CardTitle>
          <Wallet className="size-4 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="font-display text-4xl font-bold">{brl(totalAvailable)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Saque mínimo da Superbet: <strong className="text-foreground">{SUPERBET_MIN_LABEL}</strong>.
          </p>
        </CardContent>
      </Card>

      {buckets.length === 0 ? (
        <Card className="product-card rounded-3xl mt-6">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Você ainda não tem saldo. Assim que seus CPAs forem validados, cada casa de aposta
            aparece aqui com o saldo dela.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {buckets.map((b) => {
              const isActive = b.key === activeKey;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelected(b.key)}
                  className={cn(
                    "w-full min-w-0 rounded-2xl border p-5 text-left transition-all",
                    isActive
                      ? "money-panel border-primary/60 shadow-lg"
                      : "glow-panel border-border/60 hover:border-primary/40",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {b.key === NETWORK_KEY ? (
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <Network className="size-4 text-primary" /> Comissões da rede
                      </span>
                    ) : (
                      <HouseBadge name={b.name} />
                    )}
                    {isActive && (
                      <Badge className="border-transparent bg-primary text-primary-foreground">
                        selecionada
                      </Badge>
                    )}
                  </div>
                  <p className="mt-4 font-display text-3xl font-bold">{brl(b.available)}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    disponível
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[0.7rem] text-muted-foreground">
                    <span>
                      Em análise
                      <br />
                      <strong className="text-foreground">{brl(b.pending)}</strong>
                    </span>
                    <span>
                      Já pago
                      <br />
                      <strong className="text-success">{brl(b.paid)}</strong>
                    </span>
                    <span>
                      CPAs
                      <br />
                      <strong className="text-foreground">{b.cpas}</strong>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 money-panel px-5 py-4">
            <div className="flex-1">
              <p className="font-display text-lg font-bold">
                Sacar de {active?.name ?? "—"} · {brl(active?.available ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground">
                {canWithdraw ? <>Saque disponível a partir de 10/10/2026 · mínimo da Superbet: <strong className="text-foreground">{SUPERBET_MIN_LABEL}</strong>.</> : <>Saques da Superbet serão liberados em <strong className="text-foreground">10/10/2026</strong>. Seu saldo continua disponível para consulta.</>}
              </p>
            </div>
            <WithdrawDialog
              bucket={active?.name.toLowerCase().includes("superbet") ? active : undefined}
              userId={user?.id ?? ""}
              onSaved={() => qc.invalidateQueries({ queryKey: ["my-withdrawals"] })}
              canWithdraw={canWithdraw}
            />
          </div>
        </>
      )}

      <Card className="product-card rounded-2xl mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Saques de {active?.name ?? "—"} ({activeWithdrawals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {activeWithdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum saque solicitado nesta casa de aposta ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Chave Pix</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeWithdrawals.map((w) => {
                  const s = statusBadge(w.status);
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(w.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {w.pix_key_type.toUpperCase()} · {w.pix_key}
                      </TableCell>
                      <TableCell>{w.holder_name || "—"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {brl(Number(w.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.variant} className={`gap-1 ${s.className}`}>
                          <s.icon className="size-3" />
                          {w.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function WithdrawDialog({
  bucket,
  userId,
  onSaved,
  canWithdraw,
}: {
  bucket: WalletBucket | undefined;
  userId: string;
  onSaved: () => void;
  canWithdraw: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pixType, setPixType] = useState("cpf");
  const [pixKey, setPixKey] = useState("");
  const [holder, setHolder] = useState("");
  const available = bucket?.available ?? 0;

  const save = async () => {
    if (!bucket) {
      toast.error("Selecione a casa de aposta");
      return;
    }
    if (!canWithdraw) {
      toast.error("Os saques da Superbet serão liberados em 10/10/2026.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_WITHDRAW) {
      toast.error(`O valor mínimo de saque é ${brl(MIN_WITHDRAW)}`);
      return;
    }
    if (value > available) {
      toast.error("Valor acima do saldo disponível nesta casa de aposta");
      return;
    }
    if (!pixKey.trim()) {
      toast.error("Informe a chave Pix");
      return;
    }
    const { error } = await supabase.from("withdrawals").insert({
      user_id: userId,
      house_id: bucket.houseId,
      amount: value,
      pix_key: pixKey.trim().slice(0, 160),
      pix_key_type: pixType,
      holder_name: holder.trim().slice(0, 160),
      status: "pendente",
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saque solicitado! Aguarde a aprovação.");
    setAmount("");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={!bucket || !canWithdraw}>
          <BanknoteArrowUp className="size-4" />
          Solicitar saque
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Saque via Pix · {bucket?.name ?? "—"} · disponível {brl(available)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="w-amount">Valor do saque</Label>
            <div className="rounded-xl border border-primary/30 bg-secondary/40 p-3">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-primary">R$</span>
                <Input
                  id="w-amount"
                  type="number"
                  min={MIN_WITHDRAW}
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 border-0 bg-transparent px-0 font-display text-2xl font-bold shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => setAmount(available.toFixed(2))}
                >
                  Sacar tudo
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Disponível: {brl(available)}</span>
                <div className="flex gap-1">
                  {[1000, 5000, 10000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      disabled={v > available}
                      className="rounded-full border border-border/60 px-2 py-0.5 transition-colors hover:border-primary/60 hover:text-foreground disabled:opacity-40"
                    >
                      {brl(v)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de chave</Label>
            <Select value={pixType} onValueChange={setPixType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="aleatoria">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-key">Chave Pix</Label>
            <Input
              id="w-key"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              maxLength={160}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-holder">Nome do titular</Label>
            <Input
              id="w-holder"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              maxLength={160}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>Enviar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
