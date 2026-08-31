import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BanknoteArrowUp, Coins, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl, type DealRow, type WithdrawalRow } from "@/lib/panel";

export const Route = createFileRoute("/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Saldo disponível de comissões de CPA, cadastro da chave Pix e histórico de saques do afiliado.",
      },
      { property: "og:title", content: "Carteira | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Saldo de comissões, chave Pix e saques do afiliado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});

const statusBadge = (status: string) => {
  if (status === "aprovado") return { variant: "default" as const, icon: CheckCircle2 };
  if (status === "rejeitado") return { variant: "destructive" as const, icon: XCircle };
  return { variant: "secondary" as const, icon: Clock };
};

function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: deals = [] } = useQuery({
    queryKey: ["wallet-deals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_deals")
        .select("*, betting_houses(name)")
        .eq("affiliate_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as DealRow[];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WithdrawalRow[];
    },
  });

  const earned = deals.reduce((sum, d) => sum + d.eligible_cpa * Number(d.cpa_amount), 0);
  const paid = withdrawals
    .filter((w) => w.status === "aprovado")
    .reduce((s, w) => s + Number(w.amount), 0);
  const pending = withdrawals
    .filter((w) => w.status === "pendente")
    .reduce((s, w) => s + Number(w.amount), 0);
  const available = Math.max(earned - paid - pending, 0);

  const cards = [
    { label: "Saldo disponível", value: brl(available), icon: Coins, glow: true },
    { label: "Em análise", value: brl(pending), icon: Clock, glow: false },
    { label: "Já pago via Pix", value: brl(paid), icon: CheckCircle2, glow: false },
    { label: "Comissões geradas", value: brl(earned), icon: BanknoteArrowUp, glow: false },
  ];

  return (
    <AppShell
      title="Carteira"
      subtitle="Comissões de CPA liberadas, chave Pix e histórico de saques."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card
            key={c.label}
            className={c.glow ? "money-panel border-primary/40" : "glow-panel border-border/60"}
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

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 money-panel px-5 py-4">
        <div className="flex-1">
          <p className="font-display text-lg font-bold">Sacar comissões via Pix</p>
          <p className="text-sm text-muted-foreground">
            Saque mínimo de R$ 50,00 · pagamento após aprovação da administração.
          </p>
        </div>
        <WithdrawDialog
          available={available}
          userId={user?.id ?? ""}
          onSaved={() => qc.invalidateQueries({ queryKey: ["my-withdrawals"] })}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Meus saques ({withdrawals.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum saque solicitado ainda. Quando seus CPAs forem lançados, o valor aparece no
              saldo disponível.
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
                {withdrawals.map((w) => {
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
                        <Badge variant={s.variant} className="gap-1">
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
  available,
  userId,
  onSaved,
}: {
  available: number;
  userId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pixType, setPixType] = useState("cpf");
  const [pixKey, setPixKey] = useState("");
  const [holder, setHolder] = useState("");

  const save = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 50) {
      toast.error("O valor mínimo de saque é R$ 50,00");
      return;
    }
    if (value > available) {
      toast.error("Valor acima do saldo disponível");
      return;
    }
    if (!pixKey.trim()) {
      toast.error("Informe a chave Pix");
      return;
    }
    const { error } = await supabase.from("withdrawals").insert({
      user_id: userId,
      amount: value,
      pix_key: pixKey.trim().slice(0, 160),
      pix_key_type: pixType,
      holder_name: holder.trim().slice(0, 160),
      status: "pendente",
    });
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
        <Button className="gap-2">
          <BanknoteArrowUp className="size-4" />
          Solicitar saque
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saque via Pix · disponível {brl(available)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="w-amount">Valor (R$)</Label>
            <Input
              id="w-amount"
              type="number"
              min="50"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
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
