import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HouseBadge } from "@/components/HouseBadge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  brl,
  type DealRow,
  type HouseRow,
  type ProfileRow,
  type WithdrawalRow,
} from "@/lib/panel";
import { Trash2, Check, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Área administradora: afiliados cadastrados, casas de aposta e lançamento de acordos e planos de CPA.",
      },
      { property: "og:title", content: "Administração | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Gestão de afiliados, casas de aposta e acordos de CPA.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProfileRow[];
    },
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["houses"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("betting_houses").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as HouseRow[];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["admin-deals"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_deals")
        .select("*, betting_houses(name), profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DealRow[];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["admin-withdrawals"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WithdrawalRow[];
    },
  });

  const setWithdrawStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("withdrawals")
      .update({ status, processed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "aprovado" ? "Saque aprovado e pago!" : "Saque rejeitado");
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
  };

  const deleteHouse = async (h: HouseRow) => {
    const { error } = await supabase.from("betting_houses").delete().eq("id", h.id);
    if (error) {
      toast.error("Não foi possível excluir. Remova antes os acordos dessa casa.");
      return;
    }
    toast.success("Casa excluída");
    qc.invalidateQueries({ queryKey: ["houses"] });
  };

  const q = search.trim().toLowerCase();
  const filteredProfiles = q
    ? profiles.filter(
        (p) =>
          p.email.toLowerCase().includes(q) ||
          p.full_name.toLowerCase().includes(q) ||
          p.referral_code.toLowerCase().includes(q),
      )
    : profiles;
  const filteredDeals = q
    ? deals.filter(
        (d) =>
          (d.profiles?.email ?? "").toLowerCase().includes(q) ||
          (d.profiles?.full_name ?? "").toLowerCase().includes(q) ||
          (d.betting_houses?.name ?? "").toLowerCase().includes(q),
      )
    : deals;

  if (!loading && !isAdmin) {
    return (
      <AppShell title="Administração">
        <p className="text-sm text-muted-foreground">
          Você não tem permissão de administrador neste painel.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Administração"
      subtitle="Afiliados cadastrados, casas de aposta e acordos de CPA."
    >
      <div className="mb-6 max-w-md">
        <Label htmlFor="admin-search" className="text-xs text-muted-foreground">
          Pesquisar e-mail, nome, código ou casa
        </Label>
        <Input
          id="admin-search"
          className="mt-2"
          placeholder="ex.: afiliado@email.com"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="metricas">
        <TabsList>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="afiliados">Afiliados</TabsTrigger>
          <TabsTrigger value="acordos">Acordos CPA</TabsTrigger>
          <TabsTrigger value="casas">Casas</TabsTrigger>
          <TabsTrigger value="saques">Saques</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Cliques, registros e CPAs validados ({filteredDeals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {filteredDeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum acordo encontrado.</p>
              ) : (
                filteredDeals.map((d) => (
                  <MetricsRow
                    key={d.id}
                    deal={d}
                    onSaved={() => {
                      qc.invalidateQueries({ queryKey: ["admin-deals"] });
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="afiliados" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                E-mails cadastrados ({filteredProfiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Celular</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Indicado por</TableHead>
                    <TableHead className="text-right">Acordo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell>{p.email}</TableCell>
                      <TableCell>{p.phone || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.referral_code}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {profiles.find((x) => x.id === p.referred_by)?.full_name ?? "Direto"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DealDialog
                          affiliate={p}
                          houses={houses}
                          onSaved={() => qc.invalidateQueries({ queryKey: ["admin-deals"] })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acordos" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Acordos lançados ({filteredDeals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Casa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                    <TableHead className="text-right">Elegíveis</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.profiles?.full_name || d.profiles?.email || "—"}
                      </TableCell>
                      <TableCell>{d.betting_houses?.name ?? "—"}</TableCell>
                      <TableCell>{d.cpa_plan || d.deal_name || "—"}</TableCell>
                      <TableCell className="text-right">{brl(Number(d.cpa_amount))}</TableCell>
                      <TableCell className="text-right">{d.eligible_cpa}</TableCell>
                      <TableCell className="text-right">{d.clicks}</TableCell>
                      <TableCell className="text-right">{d.registrations}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "ativo" ? "default" : "secondary"}>
                          {d.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="casas" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Casas de aposta ({houses.length})</CardTitle>
              <HouseDialog onSaved={() => qc.invalidateQueries({ queryKey: ["houses"] })} />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {houses.map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.country}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir ${h.name}`}
                      onClick={() => deleteHouse(h)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="saques" className="pt-6">
          <Card className="money-panel border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">
                Saques solicitados ({withdrawals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum saque solicitado ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Chave Pix</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">
                          {w.profiles?.full_name || w.profiles?.email || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {w.pix_key_type.toUpperCase()} · {w.pix_key}
                        </TableCell>
                        <TableCell>{w.holder_name || "—"}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {brl(Number(w.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              w.status === "aprovado"
                                ? "default"
                                : w.status === "rejeitado"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {w.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {w.status === "pendente" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() => setWithdrawStatus(w.id, "aprovado")}
                              >
                                <Check className="size-3" /> Pago
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="gap-1"
                                onClick={() => setWithdrawStatus(w.id, "rejeitado")}
                              >
                                <X className="size-3" /> Rejeitar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {w.processed_at
                                ? new Date(w.processed_at).toLocaleDateString("pt-BR")
                                : "—"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function DealDialog({
  affiliate,
  houses,
  onSaved,
}: {
  affiliate: ProfileRow;
  houses: HouseRow[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    house_id: "",
    deal_name: "",
    cpa_plan: "",
    cpa_amount: "",
    baseline: "",
    revshare: "",
    eligible_cpa: "",
    clicks: "",
    registrations: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    if (!form.house_id) {
      toast.error("Selecione a casa de aposta");
      return;
    }
    const { error } = await supabase.from("affiliate_deals").insert({
      affiliate_id: affiliate.id,
      house_id: form.house_id,
      deal_name: form.deal_name.trim().slice(0, 160),
      cpa_plan: form.cpa_plan.trim().slice(0, 160),
      cpa_amount: Number(form.cpa_amount) || 0,
      baseline: form.baseline.trim().slice(0, 240),
      revshare: Number(form.revshare) || 0,
      eligible_cpa: Number(form.eligible_cpa) || 0,
      clicks: Number(form.clicks) || 0,
      registrations: Number(form.registrations) || 0,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Acordo lançado!");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Lançar acordo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Acordo CPA · {affiliate.full_name || affiliate.email}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Casa de aposta</Label>
            <Select
              value={form.house_id}
              onValueChange={(v) => setForm((f) => ({ ...f, house_id: v }))}
            >
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
            <Label htmlFor="d-name">Acordo</Label>
            <Input id="d-name" value={form.deal_name} onChange={set("deal_name")} maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-plan">Plano CPA</Label>
            <Input id="d-plan" value={form.cpa_plan} onChange={set("cpa_plan")} maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-amount">Valor CPA (R$)</Label>
            <Input
              id="d-amount"
              type="number"
              min="0"
              step="0.01"
              value={form.cpa_amount}
              onChange={set("cpa_amount")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-rev">RevShare (%)</Label>
            <Input
              id="d-rev"
              type="number"
              min="0"
              step="0.01"
              value={form.revshare}
              onChange={set("revshare")}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="d-base">Baseline</Label>
            <Input id="d-base" value={form.baseline} onChange={set("baseline")} maxLength={240} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-elig">CPAs elegíveis</Label>
            <Input
              id="d-elig"
              type="number"
              min="0"
              value={form.eligible_cpa}
              onChange={set("eligible_cpa")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-clicks">Cliques</Label>
            <Input
              id="d-clicks"
              type="number"
              min="0"
              value={form.clicks}
              onChange={set("clicks")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-regs">Registros</Label>
            <Input
              id="d-regs"
              type="number"
              min="0"
              value={form.registrations}
              onChange={set("registrations")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>Salvar acordo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HouseDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("BR");

  const save = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome da casa");
      return;
    }
    const { error } = await supabase
      .from("betting_houses")
      .insert({ name: name.trim().slice(0, 120), country: country.trim().slice(0, 8) || "BR" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Casa cadastrada!");
    setName("");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Nova casa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova casa de aposta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="h-name">Nome</Label>
            <Input
              id="h-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="h-country">País</Label>
            <Input
              id="h-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
