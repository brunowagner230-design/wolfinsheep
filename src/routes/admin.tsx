import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { flushPush } from "@/lib/push.functions";
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
import {
  Trash2,
  Check,
  X,
  FileSpreadsheet,
  Plus,
  ChevronDown,
  Search,
  Pencil,
  MessageCircle,
  Send,
} from "lucide-react";

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

type AdminLinkRequest = {
  id: string;
  user_id: string;
  house_id: string;
  status: string;
  promo_link: string;
  cpa_plan: string;
  cpa_amount: number | string;
  baseline: string;
  admin_note: string | null;
  created_at: string;
  betting_houses?: { name: string } | null;
  profiles?: { full_name: string; email: string } | null;
};

/** Cores suaves por casa de aposta na planilha (ARGB) */
const HOUSE_TINTS = [
  "FFEDE9FE",
  "FFDCFCE7",
  "FFFFE4E6",
  "FFDBEAFE",
  "FFFEF3C7",
  "FFF3E8FF",
  "FFCCFBF1",
  "FFFFEDD5",
];

function houseTint(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  return HOUSE_TINTS[hash % HOUSE_TINTS.length] ?? "FFF5F3FF";
}

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [houseFilter, setHouseFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("pendente");

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

  const { data: linkRequests = [] } = useQuery({
    queryKey: ["admin-link-requests"],
    enabled: isAdmin,
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data, error } = await sb
        .from("link_requests")
        .select("*, betting_houses(name), profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminLinkRequest[];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["admin-withdrawals"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*, profiles(full_name, email), betting_houses(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (WithdrawalRow & {
        betting_houses?: { name: string } | null;
      })[];
    },
  });

  const paidWithdrawals = withdrawals.filter((w) => w.status === "aprovado");
  const totalPaid = paidWithdrawals.reduce((s, w) => s + Number(w.amount), 0);
  const totalPending = withdrawals
    .filter((w) => w.status === "pendente")
    .reduce((s, w) => s + Number(w.amount), 0);
  const totalRejected = withdrawals
    .filter((w) => w.status === "rejeitado")
    .reduce((s, w) => s + Number(w.amount), 0);

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

  const approveProfile = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cadastro aprovado!");
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
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
  const matchHouse = (id?: string | null) => houseFilter === "todas" || id === houseFilter;

  const houseAffiliateIds = new Set(
    deals.filter((d) => matchHouse(d.house_id)).map((d) => d.affiliate_id),
  );

  const filteredProfiles = profiles.filter((p) => {
    const okText =
      !q ||
      p.email.toLowerCase().includes(q) ||
      p.full_name.toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q) ||
      p.referral_code.toLowerCase().includes(q);
    const okHouse = houseFilter === "todas" || houseAffiliateIds.has(p.id);
    return okText && okHouse;
  });

  const filteredDeals = deals.filter((d) => {
    const okText =
      !q ||
      (d.profiles?.email ?? "").toLowerCase().includes(q) ||
      (d.profiles?.full_name ?? "").toLowerCase().includes(q) ||
      (d.betting_houses?.name ?? "").toLowerCase().includes(q);
    return okText && matchHouse(d.house_id);
  });

  const pendingRequests = linkRequests.filter((r) => r.status === "pendente");
  const filteredRequests: AdminLinkRequest[] = linkRequests.filter((r) => {
    const okText =
      !q ||
      (r.profiles?.email ?? "").toLowerCase().includes(q) ||
      (r.profiles?.full_name ?? "").toLowerCase().includes(q) ||
      (r.betting_houses?.name ?? "").toLowerCase().includes(q);
    const okStatus = statusFilter === "todos" || r.status === statusFilter;
    return okText && okStatus && matchHouse(r.house_id);
  });

  const exportSpreadsheet = async () => {
    if (filteredProfiles.length === 0) {
      toast.error("Nenhum afiliado para exportar.");
      return;
    }
    const ExcelJS = (await import("exceljs")).default;
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("Afiliados CPA", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.columns = [
      { header: "Casa de aposta", key: "casa", width: 22 },
      { header: "Nome", key: "nome", width: 28 },
      { header: "E-mail", key: "email", width: 32 },
      { header: "Celular", key: "celular", width: 18 },
      { header: "Link de divulgação", key: "link", width: 48 },
      { header: "Plano CPA", key: "plano", width: 18 },
      { header: "Valor CPA", key: "valor", width: 14 },
      { header: "CPA (preencher)", key: "cpa", width: 18 },
    ];

    const header = sheet.getRow(1);
    header.height = 24;
    header.eachCell((cell) => {
      cell.font = { name: "Arial", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4C1D95" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF2E1065" } },
        bottom: { style: "thin", color: { argb: "FF2E1065" } },
        left: { style: "thin", color: { argb: "FF2E1065" } },
        right: { style: "thin", color: { argb: "FF2E1065" } },
      };
    });

    type ExportRow = {
      casa: string;
      nome: string;
      email: string;
      celular: string;
      link: string;
      plano: string;
      valor: number | string;
    };
    const rows: ExportRow[] = [];
    filteredProfiles.forEach((p) => {
      const myDeals = deals.filter((d) => d.affiliate_id === p.id);
      const base = {
        nome: p.full_name || "",
        email: p.email || "",
        celular: p.phone || "",
        link: p.promo_link || "",
      };
      if (myDeals.length === 0) {
        rows.push({ ...base, casa: "Sem casa vinculada", plano: "", valor: "" });
      } else {
        myDeals.forEach((d) =>
          rows.push({
            ...base,
            casa: d.betting_houses?.name ?? "Casa",
            plano: d.cpa_plan || d.deal_name || "",
            valor: Number(d.cpa_amount) || 0,
          }),
        );
      }
    });

    rows.sort((a, b) => a.casa.localeCompare(b.casa) || a.nome.localeCompare(b.nome));
    rows.forEach((r) => {
      const row = sheet.addRow({ ...r, cpa: "" });
      const tint = houseTint(r.casa);
      row.eachCell((cell) => {
        cell.font = { name: "Arial", size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tint } };
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFBFBFBF" } },
          right: { style: "hair", color: { argb: "FFBFBFBF" } },
        };
      });
      row.getCell("casa").font = { name: "Arial", size: 11, bold: true };
      row.getCell("valor").numFmt = '"R$"#,##0.00;("R$"#,##0.00);-';
      const cpaCell = row.getCell("cpa");
      cpaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
      cpaCell.alignment = { horizontal: "center" };
    });

    sheet.autoFilter = { from: "A1", to: { row: 1, column: 8 } };

    const buffer = await book.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `afiliados-cpa-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Planilha colorida gerada!");
  };

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
      <div className="mb-6 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 to-transparent p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[280px] flex-1">
            <Label htmlFor="admin-search" className="text-xs text-muted-foreground">
              Pesquisar afiliado (e-mail, nome, celular, código ou casa)
            </Label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
              <Input
                id="admin-search"
                className="h-11 pl-9 pr-9 border-primary/40 bg-background/70"
                placeholder="ex.: afiliado@email.com"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Limpar pesquisa"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
          <div className="w-56">
            <Label className="text-xs text-muted-foreground">Casa de aposta</Label>
            <Select value={houseFilter} onValueChange={setHouseFilter}>
              <SelectTrigger className="mt-2 h-11 border-primary/40 bg-background/70">
                <SelectValue />
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
          <div className="w-48">
            <Label className="text-xs text-muted-foreground">Status das solicitações</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-2 h-11 border-primary/40 bg-background/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="liberado">Liberados</SelectItem>
                <SelectItem value="recusado">Recusados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            <AddCpaDialog
              deals={deals}
              onSaved={() => qc.invalidateQueries({ queryKey: ["admin-deals"] })}
            />
            <Button className="h-11 gap-2" onClick={exportSpreadsheet}>
              <FileSpreadsheet className="size-4" />
              Exportar planilha (Excel)
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {filteredProfiles.length} afiliados · {filteredDeals.length} acordos ·{" "}
          {filteredRequests.length} solicitações
        </p>
      </div>

      <Tabs defaultValue="solicitacoes">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="solicitacoes">
            Solicitações de links
            {pendingRequests.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="afiliados">Afiliados</TabsTrigger>
          <TabsTrigger value="acordos">Acordos CPA</TabsTrigger>
          <TabsTrigger value="casas">Casas</TabsTrigger>
          <TabsTrigger value="saques">Saques</TabsTrigger>
          <TabsTrigger value="suporte" className="gap-2">
            <MessageCircle className="size-4" /> Suporte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Solicitações de link de divulgação ({filteredRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {filteredRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada.</p>
              ) : (
                filteredRequests.map((r) => (
                  <LinkRequestCard
                    key={r.id}
                    request={r}
                    onSaved={() => {
                      qc.invalidateQueries({ queryKey: ["admin-link-requests"] });
                      qc.invalidateQueries({ queryKey: ["admin-deals"] });
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="metricas" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Afiliados · clique no e-mail para configurar o CPA ({filteredProfiles.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione o afiliado, escolha a casa de aposta e use{" "}
                <strong className="text-foreground">+1 CPA</strong> para lançar na hora. O afiliado
                recebe a notificação automaticamente.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {filteredProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum afiliado encontrado.</p>
              ) : (
                filteredProfiles.map((p) => (
                  <AffiliateMetricsCard
                    key={p.id}
                    profile={p}
                    deals={deals.filter((d) => d.affiliate_id === p.id)}
                    houses={houses}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["admin-deals"] })}
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
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Link de divulgação</TableHead>
                    <TableHead className="text-right">Acordo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell>{p.email}</TableCell>
                      <TableCell>{p.phone || "—"}</TableCell>
                      <TableCell>
                        {p.approved ? (
                          <Badge className="gap-1 border-transparent bg-success text-success-foreground">
                            <Check className="size-3" /> aprovado
                          </Badge>
                        ) : p.referred_by ? (
                          <Badge variant="secondary" className="gap-1">
                            aguardando o gerente da rede
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1 bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => approveProfile(p.id)}
                          >
                            <Check className="size-3" /> Aprovar
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <PromoLinkCell
                          profile={p}
                          onSaved={() => qc.invalidateQueries({ queryKey: ["admin-profiles"] })}
                        />
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
                  {filteredDeals.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.profiles?.full_name || d.profiles?.email || "—"}
                      </TableCell>
                      <TableCell>
                        <HouseBadge name={d.betting_houses?.name ?? null} />
                      </TableCell>
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
                    <div className="flex min-w-0 items-center gap-3">
                      {h.logo_url ? (
                        <img
                          src={h.logo_url}
                          alt={`Logo ${h.name}`}
                          className="size-10 shrink-0 rounded-md border border-border/60 object-contain"
                        />
                      ) : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border/60 bg-background/60 font-display text-sm font-bold text-primary">
                          {h.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.country}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <HouseDialog
                        house={h}
                        onSaved={() => qc.invalidateQueries({ queryKey: ["houses"] })}
                      />
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
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="saques" className="pt-6">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="money-panel border-success/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total já pago
                </CardTitle>
                <Check className="size-4 text-success" />
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold text-success">{brl(totalPaid)}</p>
              </CardContent>
            </Card>
            <Card className="glow-panel border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Aguardando pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold">{brl(totalPending)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {withdrawals.filter((w) => w.status === "pendente").length} pendente(s)
                </p>
              </CardContent>
            </Card>
            <Card className="glow-panel border-destructive/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total rejeitado
                </CardTitle>
                <X className="size-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold text-destructive">
                  {brl(totalRejected)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {withdrawals.filter((w) => w.status === "rejeitado").length} rejeitado(s)
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="money-panel border-primary/30 mb-6">
            <CardHeader>
              <CardTitle className="text-base">
                Relatório de pagamentos realizados ({paidWithdrawals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {paidWithdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum pagamento realizado ainda. Quando você marcar um saque como pago, ele
                  aparece aqui somando no total.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Casa de aposta</TableHead>
                      <TableHead>Chave Pix</TableHead>
                      <TableHead>Data do pagamento</TableHead>
                      <TableHead className="text-right">Valor pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidWithdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">
                          {w.profiles?.full_name || w.profiles?.email || "—"}
                        </TableCell>
                        <TableCell>
                          {w.betting_houses?.name ?? (
                            <span className="text-xs text-muted-foreground">Rede</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {w.pix_key_type.toUpperCase()} · {w.pix_key}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {w.processed_at
                            ? new Date(w.processed_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          {brl(Number(w.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold">
                        TOTAL PAGO
                      </TableCell>
                      <TableCell className="text-right font-display text-lg font-bold text-success">
                        {brl(totalPaid)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

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
                      <TableHead>Casa de aposta</TableHead>
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
                        <TableCell>
                          {w.betting_houses?.name ? (
                            <HouseBadge name={w.betting_houses.name} />
                          ) : (
                            <span className="text-xs text-muted-foreground">Comissões da rede</span>
                          )}
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
                            variant={w.status === "rejeitado" ? "destructive" : "secondary"}
                            className={
                              w.status === "aprovado"
                                ? "border-transparent bg-success text-success-foreground"
                                : undefined
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
                                className="gap-1 bg-success text-success-foreground hover:bg-success/90"
                                onClick={() => setWithdrawStatus(w.id, "aprovado")}
                              >
                                <Check className="size-3" /> Pago
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
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

function HouseDialog({ house, onSaved }: { house?: HouseRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(house?.name ?? "");
  const [country, setCountry] = useState(house?.country ?? "BR");
  const [logoUrl, setLogoUrl] = useState(house?.logo_url ?? "");

  const save = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome da casa");
      return;
    }
    const payload = {
      name: name.trim().slice(0, 120),
      country: country.trim().slice(0, 8) || "BR",
      logo_url: logoUrl.trim() ? logoUrl.trim().slice(0, 500) : null,
    };
    const { error } = house
      ? await supabase.from("betting_houses").update(payload).eq("id", house.id)
      : await supabase.from("betting_houses").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(house ? "Casa atualizada!" : "Casa cadastrada!");
    if (!house) {
      setName("");
      setLogoUrl("");
    }
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {house ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${house.name}`}>
            <Pencil className="size-4 text-primary" />
          </Button>
        ) : (
          <Button size="sm">Nova casa</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{house ? `Editar ${house.name}` : "Nova casa de aposta"}</DialogTitle>
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
          <div className="space-y-2">
            <Label htmlFor="h-logo">Logo da casa (URL da imagem)</Label>
            <Input
              id="h-logo"
              placeholder="https://.../logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              maxLength={500}
            />
            {logoUrl.trim() && (
              <img
                src={logoUrl.trim()}
                alt="Prévia da logo"
                className="size-12 rounded-md border border-border/60 object-contain"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricsRow({ deal, onSaved }: { deal: DealRow; onSaved: () => void }) {
  const [form, setForm] = useState({
    clicks: String(deal.clicks),
    registrations: String(deal.registrations),
    eligible_cpa: String(deal.eligible_cpa),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("affiliate_deals")
      .update({
        clicks: Math.max(0, Number(form.clicks) || 0),
        registrations: Math.max(0, Number(form.registrations) || 0),
        eligible_cpa: Math.max(0, Number(form.eligible_cpa) || 0),
      })
      .eq("id", deal.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Métricas atualizadas!");
    onSaved();
  };

  const addCpa = async (qty: number) => {
    setSaving(true);
    const next = Math.max(0, Number(form.eligible_cpa) || 0) + qty;
    const { error } = await supabase
      .from("affiliate_deals")
      .update({ eligible_cpa: next })
      .eq("id", deal.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm((f) => ({ ...f, eligible_cpa: String(next) }));
    window.setTimeout(() => {
      flushPush({}).catch(() => undefined);
    }, 1200);
    toast.success(
      `+${qty} CPA em ${deal.betting_houses?.name ?? "acordo"} · ${brl(qty * Number(deal.cpa_amount))} na carteira`,
    );
    onSaved();
  };

  const commission = Math.max(0, Number(form.eligible_cpa) || 0) * Number(deal.cpa_amount);

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HouseBadge name={deal.betting_houses?.name ?? null} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            CPA: <strong className="text-foreground">{brl(Number(deal.cpa_amount))}</strong>
          </span>
          <span>
            Total: <strong className="text-success">{brl(commission)}</strong>
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="lg"
          className="gap-2 bg-success font-bold text-success-foreground shadow-lg hover:bg-success/90"
          disabled={saving}
          onClick={() => addCpa(1)}
        >
          <Plus className="size-4" /> Adicionar CPA
        </Button>
        {[2, 5, 10].map((q) => (
          <Button
            key={q}
            size="sm"
            variant="secondary"
            className="gap-1"
            disabled={saving}
            onClick={() => addCpa(q)}
          >
            <Plus className="size-3" /> {q} CPA
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">
          lança na hora, sem salvar · notifica o afiliado e libera a comissão de rede do gerente
        </span>
      </div>


      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Cliques</Label>
          <Input
            type="number"
            min="0"
            value={form.clicks}
            onChange={(e) => setForm((f) => ({ ...f, clicks: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Registros</Label>
          <Input
            type="number"
            min="0"
            value={form.registrations}
            onChange={(e) => setForm((f) => ({ ...f, registrations: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CPAs validados</Label>
          <Input
            type="number"
            min="0"
            value={form.eligible_cpa}
            onChange={(e) => setForm((f) => ({ ...f, eligible_cpa: e.target.value }))}
          />
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            variant="secondary"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PromoLinkCell({ profile, onSaved }: { profile: ProfileRow; onSaved: () => void }) {
  const [link, setLink] = useState(profile.promo_link ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ promo_link: link.trim().slice(0, 500) })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Link de divulgação salvo!");
    onSaved();
  };

  return (
    <div className="flex min-w-[240px] items-center gap-2">
      <Input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://..."
        className="h-9 text-xs"
        maxLength={500}
      />
      <Button size="sm" variant="secondary" onClick={save} disabled={saving}>
        Salvar
      </Button>
    </div>
  );
}

function LinkRequestCard({
  request,
  onSaved,
}: {
  request: AdminLinkRequest;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    promo_link: request.promo_link ?? "",
    cpa_amount: request.cpa_amount ? String(request.cpa_amount) : "",
  });
  const [saving, setSaving] = useState(false);
  const sb = supabase as unknown as { from: (t: string) => any };

  const { data: plan } = useQuery({
    queryKey: ["link-request-plan", request.user_id, request.house_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("network_plans")
        .select("cpa_amount, house_id")
        .eq("downline_id", request.user_id)
        .order("created_at", { ascending: false });
      const rows = data ?? [];
      const match =
        rows.find((r: any) => r.house_id === request.house_id) ??
        rows.find((r: any) => !r.house_id) ??
        null;
      return match ? Number(match.cpa_amount) : null;
    },
  });

  const autoAmount = plan && plan > 0 ? plan : null;


  const release = async () => {
    if (!form.promo_link.trim()) {
      toast.error("Informe o link de divulgação.");
      return;
    }
    setSaving(true);
    const amount = autoAmount;
    const link = form.promo_link.trim().slice(0, 500);
    const houseName = request.betting_houses?.name ?? "Acordo CPA";

    const { error } = await sb
      .from("link_requests")
      .update({
        promo_link: link,
        ...(amount !== null ? { cpa_amount: amount } : {}),
        status: "liberado",
      })
      .eq("id", request.id);

    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    await supabase.from("profiles").update({ promo_link: link }).eq("id", request.user_id);

    const { data: existing } = await supabase
      .from("affiliate_deals")
      .select("id")
      .eq("affiliate_id", request.user_id)
      .eq("house_id", request.house_id)
      .limit(1);

    const dealResult = existing?.[0]?.id
      ? await supabase
          .from("affiliate_deals")
          .update({
            ...(amount !== null ? { cpa_amount: amount } : {}),
            deal_name: houseName,
          })
          .eq("id", existing[0].id)
      : await supabase.from("affiliate_deals").insert({
          affiliate_id: request.user_id,
          house_id: request.house_id,
          deal_name: houseName,
          cpa_amount: amount ?? 0,
        });


    setSaving(false);
    if (dealResult.error) {
      toast.error(dealResult.error.message);
      return;
    }
    toast.success("Link liberado e acordo atualizado! O afiliado foi notificado.");
    onSaved();
  };

  const reject = async () => {
    setSaving(true);
    const { error } = await sb
      .from("link_requests")
      .update({ status: "rejeitado", admin_note: "Solicitação não aprovada." })
      .eq("id", request.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Solicitação recusada.");
    onSaved();
  };

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {request.profiles?.full_name || request.profiles?.email || "Afiliado"}
          </p>
          <p className="text-xs text-muted-foreground">{request.profiles?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <HouseBadge name={request.betting_houses?.name ?? null} />
          <Badge
            className={
              request.status === "liberado"
                ? "bg-success text-success-foreground"
                : request.status === "rejeitado"
                  ? "bg-destructive text-destructive-foreground"
                  : ""
            }
            variant={request.status === "pendente" ? "secondary" : "default"}
          >
            {request.status}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Link de divulgação</Label>
          <Input
            placeholder="https://..."
            value={form.promo_link}
            onChange={(e) => setForm((f) => ({ ...f, promo_link: e.target.value }))}
            maxLength={500}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Valor do CPA (R$)</Label>
          {autoAmount !== null ? (
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm">
              <strong className="text-foreground">{brl(autoAmount)}</strong>
              <Badge variant="secondary" className="text-[10px]">
                definido pelo gerente da rede
              </Badge>
            </div>
          ) : (
            <div className="rounded-md border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              Aguardando o gerente da rede definir o CPA deste afiliado em Minha rede. Você pode
              liberar o link agora — o valor entra automaticamente quando ele for definido.
            </div>
          )}
        </div>

      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          className="gap-2 bg-success text-success-foreground hover:bg-success/90"
          onClick={release}
          disabled={saving}
        >
          <Check className="size-4" />
          {request.status === "liberado" ? "Atualizar e notificar" : "Liberar link e lançar acordo"}
        </Button>
        {request.status !== "rejeitado" && (
          <Button variant="destructive" className="gap-2" onClick={reject} disabled={saving}>
            <X className="size-4" /> Recusar
          </Button>
        )}
      </div>
    </div>
  );
}

function AddCpaDialog({ deals, onSaved }: { deals: DealRow[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [dealId, setDealId] = useState("");
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);

  const deal = deals.find((d) => d.id === dealId);
  const amount = (Number(qty) || 0) * Number(deal?.cpa_amount ?? 0);

  const save = async () => {
    if (!deal) {
      toast.error("Selecione o acordo do afiliado.");
      return;
    }
    const add = Math.max(1, Math.floor(Number(qty) || 0));
    setSaving(true);
    const { error } = await supabase
      .from("affiliate_deals")
      .update({ eligible_cpa: deal.eligible_cpa + add })
      .eq("id", deal.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${add} CPA adicionado(s)! O afiliado recebeu a notificação.`);
    setOpen(false);
    setQty("1");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" /> Adicionar CPA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar CPA validado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Afiliado · acordo</Label>
            <Select value={dealId} onValueChange={setDealId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o afiliado e a casa" />
              </SelectTrigger>
              <SelectContent>
                {deals.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {(d.profiles?.email || d.profiles?.full_name || "Afiliado") +
                      " · " +
                      (d.betting_houses?.name ?? "Geral") +
                      " · " +
                      brl(Number(d.cpa_amount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpa-qty">Quantidade de CPA</Label>
            <Input
              id="cpa-qty"
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          {deal && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <p>
                Total atual: <strong>{deal.eligible_cpa}</strong> CPA validados
              </p>
              <p className="text-success">Comissão adicionada: {brl(amount)}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? "Adicionando..." : "Adicionar e notificar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AffiliateMetricsCard({
  profile,
  deals,
  houses,
  onSaved,
}: {
  profile: ProfileRow;
  deals: DealRow[];
  houses: HouseRow[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const totalCpa = deals.reduce((s, d) => s + d.eligible_cpa, 0);
  const totalValue = deals.reduce((s, d) => s + d.eligible_cpa * Number(d.cpa_amount), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-secondary/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile.full_name || profile.email}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-display text-lg font-bold">{totalCpa} CPA</p>
            <p className="text-xs text-success">{brl(totalValue)}</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            {deals.length} casa(s)
            <ChevronDown
              className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Badge>
        </div>
      </button>

      {open && (
        <div className="grid gap-3 border-t border-border/60 bg-card/60 p-4">
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este afiliado ainda não tem acordo em nenhuma casa. Libere a solicitação de link ou
              lance um acordo na aba Afiliados.
            </p>
          ) : (
            deals.map((d) => (
              <MetricsRow key={d.id} deal={d} onSaved={onSaved} />
            ))
          )}
          {houses.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Casas disponíveis: {houses.map((h) => h.name).join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
