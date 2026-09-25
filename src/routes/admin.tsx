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
import { TicketChat } from "@/components/SupportChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SUPERBET_MENSAL_ID } from "@/lib/operation";
import {
  brl,
  type DealRow,
  type HouseRow,
  type ProfileRow,
  type SupportTicketRow,
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
  Building2,
  Users,
  PauseCircle,
  PlayCircle,
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

const EXCEL_PURPLE = "FF4C1D95";
const EXCEL_PURPLE_DARK = "FF2E1065";
const EXCEL_PURPLE_LIGHT = "FFF3E8FF";
const EXCEL_GREEN = "FFDCFCE7";
const EXCEL_YELLOW = "FFFFF2CC";

function safeSheetName(name: string, used: Set<string>) {
  const base = name.replace(/[\\/*?:[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Casa";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate.toLocaleLowerCase("pt-BR"))) {
    const ending = ` (${suffix})`;
    candidate = `${base.slice(0, 31 - ending.length)}${ending}`;
    suffix += 1;
  }
  used.add(candidate.toLocaleLowerCase("pt-BR"));
  return candidate;
}

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [houseFilter, setHouseFilter] = useState(SUPERBET_MENSAL_ID);
  const [statusFilter, setStatusFilter] = useState("pendente");
  const [affiliateHouseFilter, setAffiliateHouseFilter] = useState(SUPERBET_MENSAL_ID);

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
      const { data, error } = await supabase.from("betting_houses").select("*").eq("id", SUPERBET_MENSAL_ID).order("name");
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
        .eq("house_id", SUPERBET_MENSAL_ID)
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
        .eq("house_id", SUPERBET_MENSAL_ID)
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
        .eq("house_id", SUPERBET_MENSAL_ID)
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

  const toggleHouseOperation = async (h: HouseRow) => {
    const nextActive = h.is_active === false;
    const adminDb = supabase as unknown as { from: (table: string) => any };
    const { error } = await adminDb
      .from("betting_houses")
      .update({
        is_active: nextActive,
        pause_message: nextActive
          ? null
          : (h.pause_message || "Esta operação está temporariamente pausada pela administração."),
      })
      .eq("id", h.id);

    if (error) {
      const missingColumn =
        error.message.includes("is_active") ||
        error.message.includes("pause_message") ||
        error.message.includes("schema cache");

      if (missingColumn) {
        toast.error(
          "O banco ainda não recebeu o status de operação. A migration precisa ser aplicada no Supabase para a pausa sincronizar com todos os afiliados.",
        );
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(nextActive ? `Operação da ${h.name} reativada.` : `Operação da ${h.name} pausada.`);
    qc.invalidateQueries({ queryKey: ["houses"] });
  };

  const toggleSuperbetWithdrawals = async (h: HouseRow) => {
    const enabled = h.withdrawals_enabled !== true;
    const adminDb = supabase as unknown as { from: (table: string) => any };
    const { error } = await adminDb
      .from("betting_houses")
      .update({ withdrawals_enabled: enabled })
      .eq("id", h.id);

    if (error) {
      if (error.message.includes("withdrawals_enabled") || error.message.includes("schema cache")) {
        toast.error("A opção de saque ainda não foi criada no banco. A migration precisa ser aplicada no Supabase.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(enabled ? "Saques da Superbet liberados para todos os afiliados." : "Saques da Superbet bloqueados.");
    qc.invalidateQueries({ queryKey: ["houses"] });
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
  const matchHouse = (id?: string | null) => id === SUPERBET_MENSAL_ID;

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
    const okHouse = houseAffiliateIds.has(p.id) || linkRequests.some((r) => r.user_id === p.id);
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
    book.creator = "Wolf in Sheep Affiliates";
    book.created = new Date();
    book.calcProperties.fullCalcOnLoad = true;

    type ExportRow = {
      affiliateId: string;
      houseId: string | null;
      casa: string;
      nome: string;
      email: string;
      celular: string;
      link: string;
      valor: number | string;
      validados: number;
      cliques: number;
      registros: number;
    };

    const visibleProfileIds = new Set(filteredProfiles.map((profile) => profile.id));
    const visibleDeals = deals.filter(
      (deal) => visibleProfileIds.has(deal.affiliate_id) && matchHouse(deal.house_id),
    );
    const visibleLinks = linkRequests.filter(
      (request) =>
        request.status === "liberado" &&
        visibleProfileIds.has(request.user_id) &&
        matchHouse(request.house_id),
    );
    const rowsByKey = new Map<string, ExportRow>();

    const getProfile = (id: string) => profiles.find((profile) => profile.id === id);
    const getHouseName = (houseId: string | null, fallback?: string | null) =>
      houses.find((house) => house.id === houseId)?.name ?? fallback ?? "Casa não identificada";
    const getLink = (affiliateId: string, houseId: string | null) =>
      visibleLinks.filter(
        (request) => request.user_id === affiliateId && request.house_id === houseId,
      ).map((request) => request.promo_link).filter(Boolean).join("\n");

    visibleDeals.forEach((deal) => {
      const profile = getProfile(deal.affiliate_id);
      if (!profile) return;
      const key = `${deal.affiliate_id}:${deal.house_id ?? "sem-casa"}`;
      const current = rowsByKey.get(key);
      if (current) {
        current.validados += Number(deal.eligible_cpa) || 0;
        current.cliques += Number(deal.clicks) || 0;
        current.registros += Number(deal.registrations) || 0;
        current.valor = Math.max(Number(current.valor) || 0, Number(deal.cpa_amount) || 0);
        return;
      }
      rowsByKey.set(key, {
        affiliateId: profile.id,
        houseId: deal.house_id,
        casa: getHouseName(deal.house_id, deal.betting_houses?.name),
        nome: profile.full_name || "Sem nome",
        email: profile.email || "",
        celular: profile.phone || "",
        link: getLink(profile.id, deal.house_id),
        valor: Number(deal.cpa_amount) || 0,
        validados: Number(deal.eligible_cpa) || 0,
        cliques: Number(deal.clicks) || 0,
        registros: Number(deal.registrations) || 0,
      });
    });

    visibleLinks.forEach((request) => {
      const key = `${request.user_id}:${request.house_id}`;
      const current = rowsByKey.get(key);
      if (current) {
        current.link = [current.link, request.promo_link].filter(Boolean).join("\n");
        return;
      }
      const profile = getProfile(request.user_id);
      if (!profile) return;
      rowsByKey.set(key, {
        affiliateId: profile.id,
        houseId: request.house_id,
        casa: getHouseName(request.house_id, request.betting_houses?.name),
        nome: profile.full_name || "Sem nome",
        email: profile.email || "",
        celular: profile.phone || "",
        link: request.promo_link,
        valor: Number(request.cpa_amount) || 0,
        validados: 0,
        cliques: 0,
        registros: 0,
      });
    });

    if (houseFilter === "todas") {
      filteredProfiles.forEach((profile) => {
        const hasHouse = [...rowsByKey.values()].some((row) => row.affiliateId === profile.id);
        if (!hasHouse) {
          rowsByKey.set(`${profile.id}:sem-casa`, {
            affiliateId: profile.id,
            houseId: null,
            casa: "Sem casa vinculada",
            nome: profile.full_name || "Sem nome",
            email: profile.email || "",
            celular: profile.phone || "",
            link: "",
            valor: "",
            validados: 0,
            cliques: 0,
            registros: 0,
          });
        }
      });
    }

    const exportRows = [...rowsByKey.values()].sort(
      (a, b) =>
        a.casa.localeCompare(b.casa, "pt-BR") ||
        a.nome.localeCompare(b.nome, "pt-BR") ||
        a.email.localeCompare(b.email, "pt-BR"),
    );
    if (exportRows.length === 0) {
      toast.error("Nenhum acordo ou link encontrado para os filtros selecionados.");
      return;
    }

    const groups = new Map<string, ExportRow[]>();
    exportRows.forEach((row) => groups.set(row.casa, [...(groups.get(row.casa) ?? []), row]));
    const usedNames = new Set<string>(["resumo geral"]);
    const sheetNames = new Map<string, string>();
    groups.forEach((_rows, houseName) => sheetNames.set(houseName, safeSheetName(houseName, usedNames)));

    const summary = book.addWorksheet("Resumo geral", {
      views: [{ state: "frozen", ySplit: 4 }],
      properties: { tabColor: { argb: EXCEL_PURPLE } },
    });
    summary.mergeCells("A1:G1");
    summary.getCell("A1").value = "WOLF IN SHEEP AFFILIATES · RESUMO POR CASA";
    summary.getCell("A1").font = { name: "Arial", bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    summary.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PURPLE_DARK } };
    summary.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    summary.getRow(1).height = 32;
    summary.mergeCells("A2:G2");
    summary.getCell("A2").value = `Exportado em ${new Date().toLocaleString("pt-BR")} · ${exportRows.length} vínculo(s)`;
    summary.getCell("A2").font = { name: "Arial", italic: true, size: 10, color: { argb: "FF5B5266" } };
    summary.addRow([]);
    summary.addRow(["Casa de aposta", "Afiliados", "CPAs validados", "Cliques", "Registros", "Valor CPA total", "Aba"]);
    summary.columns = [
      { width: 30 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 20 }, { width: 25 },
    ];
    const summaryHeader = summary.getRow(4);
    summaryHeader.height = 24;
    summaryHeader.eachCell((cell) => {
      cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PURPLE } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    groups.forEach((houseRows, houseName) => {
      const sheetName = sheetNames.get(houseName);
      if (!sheetName) return;
      const sheet = book.addWorksheet(sheetName, {
        views: [{ state: "frozen", ySplit: 5 }],
        properties: { tabColor: { argb: EXCEL_PURPLE } },
      });
      sheet.mergeCells("A1:K1");
      sheet.getCell("A1").value = houseName.toLocaleUpperCase("pt-BR");
      sheet.getCell("A1").font = { name: "Arial", bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PURPLE_DARK } };
      sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
      sheet.getRow(1).height = 32;
      sheet.mergeCells("A2:K2");
      sheet.getCell("A2").value = `${houseRows.length} afiliado(s) · preencha somente a coluna amarela “CPA a adicionar”`;
      sheet.getCell("A2").font = { name: "Arial", italic: true, size: 10, color: { argb: "FF5B5266" } };
      sheet.addRow([]);
      sheet.addRow([]);
      sheet.columns = [
        { key: "casa", width: 24 },
        { key: "nome", width: 28 },
        { key: "email", width: 34 },
        { key: "celular", width: 18 },
        { key: "link", width: 52 },
        { key: "valor", width: 15 },
        { key: "validados", width: 17 },
        { key: "cliques", width: 13 },
        { key: "registros", width: 14 },
        { key: "estimado", width: 20 },
        { key: "adicionar", width: 18 },
      ];
      const headings = [
        "Casa de aposta", "Afiliado", "E-mail", "Celular", "Link correto da casa", "Valor CPA", "CPAs validados", "Cliques", "Registros", "Total CPA", "CPA a adicionar",
      ];
      sheet.getRow(5).values = headings;
      const header = sheet.getRow(5);
      header.height = 30;
      header.eachCell((cell) => {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PURPLE } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = { bottom: { style: "medium", color: { argb: EXCEL_PURPLE_DARK } } };
      });

      houseRows.forEach((item, index) => {
        const excelRow = 6 + index;
        const row = sheet.addRow({
          casa: item.casa,
          nome: item.nome,
          email: item.email,
          celular: item.celular,
          link: item.link,
          valor: item.valor,
          validados: item.validados,
          cliques: item.cliques,
          registros: item.registros,
          estimado: { formula: `IFERROR(F${excelRow}*G${excelRow},0)` },
          adicionar: "",
        });
        row.height = 24;
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { name: "Arial", size: 10, color: { argb: "FF17131C" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: index % 2 === 0 ? "FFFFFFFF" : EXCEL_PURPLE_LIGHT },
          };
          cell.alignment = { vertical: "middle" };
          cell.border = { bottom: { style: "hair", color: { argb: "FFD8D0E2" } } };
        });
        row.getCell("nome").font = { name: "Arial", bold: true, size: 10, color: { argb: EXCEL_PURPLE_DARK } };
        row.getCell("link").font = { name: "Arial", size: 9, color: { argb: "FF2563EB" }, underline: item.link ? true : false };
        row.getCell("valor").numFmt = '"R$" #,##0.00;[Red]("R$" #,##0.00);-';
        row.getCell("estimado").numFmt = '"R$" #,##0.00;[Red]("R$" #,##0.00);-';
        const input = row.getCell("adicionar");
        input.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_YELLOW } };
        input.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF713F12" } };
        input.alignment = { vertical: "middle", horizontal: "center" };
        input.dataValidation = {
          type: "whole",
          operator: "greaterThanOrEqual",
          allowBlank: true,
          formulae: [0],
          showErrorMessage: true,
          errorTitle: "Valor inválido",
          error: "Informe uma quantidade inteira igual ou maior que zero.",
        };
      });

      const totalRowNumber = 6 + houseRows.length;
      const total = sheet.getRow(totalRowNumber);
      total.getCell(1).value = "TOTAL DA CASA";
      total.getCell(1).font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      total.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PURPLE_DARK } };
      [7, 8, 9, 10, 11].forEach((column) => {
        const cell = total.getCell(column);
        cell.value = { formula: `SUM(${sheet.getColumn(column).letter}6:${sheet.getColumn(column).letter}${totalRowNumber - 1})` };
        cell.font = { name: "Arial", bold: true, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: column === 11 ? EXCEL_YELLOW : EXCEL_GREEN } };
      });
      total.getCell(10).numFmt = '"R$" #,##0.00;[Red]("R$" #,##0.00);-';
      sheet.autoFilter = { from: "A5", to: `K${Math.max(6, totalRowNumber - 1)}` };
      sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

      const summaryRow = summary.addRow([
        houseName,
        houseRows.length,
        houseRows.reduce((sum, item) => sum + item.validados, 0),
        houseRows.reduce((sum, item) => sum + item.cliques, 0),
        houseRows.reduce((sum, item) => sum + item.registros, 0),
        houseRows.reduce((sum, item) => sum + (Number(item.valor) || 0) * item.validados, 0),
        { text: `Abrir ${sheetName}`, hyperlink: `#'${sheetName.replace(/'/g, "''")}'!A1` },
      ]);
      summaryRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: summaryRow.number % 2 === 0 ? "FFFFFFFF" : EXCEL_PURPLE_LIGHT } };
        cell.border = { bottom: { style: "hair", color: { argb: "FFD8D0E2" } } };
      });
      summaryRow.getCell(1).font = { name: "Arial", bold: true, size: 10, color: { argb: EXCEL_PURPLE_DARK } };
      summaryRow.getCell(6).numFmt = '"R$" #,##0.00;[Red]("R$" #,##0.00);-';
      summaryRow.getCell(7).font = { name: "Arial", underline: true, color: { argb: "FF2563EB" } };
    });

    const summaryTotal = summary.addRow([
      "TOTAL GERAL",
      exportRows.length,
      exportRows.reduce((sum, item) => sum + item.validados, 0),
      exportRows.reduce((sum, item) => sum + item.cliques, 0),
      exportRows.reduce((sum, item) => sum + item.registros, 0),
      exportRows.reduce((sum, item) => sum + (Number(item.valor) || 0) * item.validados, 0),
      "",
    ]);
    summaryTotal.eachCell((cell) => {
      cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PURPLE_DARK } };
    });
    summaryTotal.getCell(6).numFmt = '"R$" #,##0.00;[Red]("R$" #,##0.00);-';
    summary.autoFilter = { from: "A4", to: `G${Math.max(5, summaryTotal.number - 1)}` };
    summary.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

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
    toast.success(`Planilha gerada com ${groups.size} aba(s) de casas.`);
  };

  if (loading) {
    return (
      <AppShell title="Administração">
        <p className="text-sm text-muted-foreground">Carregando administração...</p>
      </AppShell>
    );
  }

  if (!isAdmin || !user) {
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
      <div className="mb-6 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
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
            <Button className="h-11 gap-2 shadow-lg shadow-primary/20" onClick={exportSpreadsheet}>
              <FileSpreadsheet className="size-4" />
              Exportar por casa
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 border-t border-primary/20 pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-4 text-primary" />
            <span><strong className="text-foreground">{filteredProfiles.length}</strong> afiliados no arquivo</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="size-4 text-primary" />
            <span><strong className="text-foreground">{houseFilter === "todas" ? houses.length : 1}</strong> casa(s), cada uma em sua aba</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="size-4 text-primary" />
            <span>Resumo geral + afiliados em ordem alfabética</span>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="product-card rounded-2xl p-4"><p className="text-xs text-muted-foreground">Afiliados</p><p className="mt-1 font-display text-2xl font-semibold">{profiles.length}</p><p className="text-[11px] text-muted-foreground">{filteredProfiles.length} no filtro atual</p></div>
        <div className="product-card rounded-2xl p-4"><p className="text-xs text-muted-foreground">Solicitações pendentes</p><p className="mt-1 font-display text-2xl font-semibold text-amber-400">{pendingRequests.length}</p><p className="text-[11px] text-muted-foreground">links aguardando análise</p></div>
        <div className="product-card rounded-2xl p-4"><p className="text-xs text-muted-foreground">Acordos ativos</p><p className="mt-1 font-display text-2xl font-semibold">{deals.filter(d => d.status === "ativo").length}</p><p className="text-[11px] text-muted-foreground">acordos publicados</p></div>
        <div className="product-card rounded-2xl p-4"><p className="text-xs text-muted-foreground">Saques pendentes</p><p className="mt-1 font-display text-2xl font-semibold">{withdrawals.filter(w => w.status === "pendente").length}</p><p className="text-[11px] text-muted-foreground">{brl(totalPending)} aguardando processamento</p></div>
      </div>

      <Tabs defaultValue="solicitacoes">
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-xl border border-border/70 bg-card p-1.5 shadow-sm">
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
          <TabsTrigger value="links">Links por afiliado</TabsTrigger>
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

        <TabsContent value="links" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Links por afiliado ({filteredProfiles.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Clique no nome do afiliado para ver as casas em que ele trabalha e editar cada link.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {filteredProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum afiliado encontrado.</p>
              ) : (
                filteredProfiles.map((p) => (
                  <AffiliateLinksCard
                    key={p.id}
                    profile={p}
                    requests={linkRequests.filter((r) => r.user_id === p.id && r.house_id === SUPERBET_MENSAL_ID)}
                    onSaved={() => {
                      qc.invalidateQueries({ queryKey: ["admin-link-requests"] });
                      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
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
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    E-mails cadastrados ({
                      filteredProfiles.filter(
                        (p) =>
                          deals.some(
                            (d) =>
                              d.affiliate_id === p.id &&
                              d.house_id === affiliateHouseFilter,
                          ),
                      ).length
                    })
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selecione a casa para mostrar somente os afiliados vinculados a ela.
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <Label className="mb-2 block text-xs font-semibold">Casa de aposta</Label>
                  <Select
                    value={affiliateHouseFilter}
                    onValueChange={setAffiliateHouseFilter}
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
              </div>
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
                  {filteredProfiles
                    .filter(
                      (p) =>
                        deals.some(
                          (d) =>
                            d.affiliate_id === p.id &&
                            d.house_id === affiliateHouseFilter,
                        ),
                    )
                    .map((p) => (
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
                        <div className="min-w-[260px] space-y-2">
                          {linkRequests.filter((r) => r.user_id === p.id && r.house_id === SUPERBET_MENSAL_ID).length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhum link cadastrado para a Superbet Mensal.</p>
                          ) : linkRequests.filter((r) => r.user_id === p.id && r.house_id === SUPERBET_MENSAL_ID).map((r) => (
                            <div key={r.id} className="border-b border-border/60 pb-2 last:border-0">
                              <p className="break-all font-mono text-xs">{r.promo_link || "Link ainda não informado"}</p>
                              <p className="text-xs text-muted-foreground">{r.status} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                            </div>
                          ))}
                        </div>
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
              <div><CardTitle className="text-base">Operações por casa ({houses.length})</CardTitle></div>
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
                        <div className="flex items-center gap-2"><p className="truncate font-semibold">{h.name}</p><Badge variant={h.is_active === false ? "secondary" : "default"}>{h.is_active === false ? "Pausada" : "Ativa"}</Badge></div>
                        <p className="text-xs text-muted-foreground">{h.is_active === false ? (h.pause_message || "Operação temporariamente pausada.") : "Operação disponível para gestão."}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant={h.is_active === false ? "secondary" : "outline"}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => toggleHouseOperation(h)}
                      >
                        {h.is_active === false ? <PlayCircle className="size-4 text-success" /> : <PauseCircle className="size-4 text-amber-500" />}
                        {h.is_active === false ? "Reativar" : "Pausar"}
                      </Button>
                      {h.name.toLowerCase().includes("superbet") && (
                        <Button
                          variant={h.withdrawals_enabled ? "default" : "outline"}
                          size="sm"
                          className="gap-1.5"
                          onClick={() => toggleSuperbetWithdrawals(h)}
                        >
                          {h.withdrawals_enabled ? "Saque liberado" : "Liberar saque"}
                        </Button>
                      )}
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
        <TabsContent value="suporte" className="pt-6">
          <SupportInbox adminId={user.id} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function SupportInbox({ adminId }: { adminId: string }) {
  const [filter, setFilter] = useState("abertos");
  const qc = useQueryClient();

  const { data: tickets = [] } = useQuery({
    queryKey: ["support-tickets", "admin"],
    refetchInterval: 12000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, profiles(full_name, email)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SupportTicketRow[];
    },
  });

  const visible = tickets.filter((t) =>
    filter === "todos" ? true : filter === "fechados" ? t.status === "fechado" : t.status !== "fechado",
  );

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "fechado" ? "Atendimento encerrado." : "Atendimento reaberto.");
    qc.invalidateQueries({ queryKey: ["support-tickets", "admin"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">Atendimentos de suporte ({visible.length})</CardTitle>
        <div className="w-48">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-10 border-primary/40 bg-background/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="abertos">Em aberto</SelectItem>
              <SelectItem value="fechados">Encerrados</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum atendimento nesta lista.</p>
        ) : (
          visible.map((t) => (
            <div
              key={t.id}
              className="min-w-0 rounded-xl border border-border/60 bg-secondary/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{t.subject || "Sem assunto"}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.name || t.profiles?.full_name} · {t.email || t.profiles?.email}
                    {t.phone ? ` · ${t.phone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {new Date(t.updated_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                    {t.status}
                  </span>
                  <Button
                    size="sm"
                    variant={t.status === "fechado" ? "secondary" : "outline"}
                    onClick={() => setStatus(t.id, t.status === "fechado" ? "aberto" : "fechado")}
                  >
                    {t.status === "fechado" ? "Reabrir" : "Encerrar"}
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <TicketChat ticketId={t.id} sender="suporte" authorId={adminId} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
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

function PromoLinkCell({
  profile,
  request,
  houseSelected,
  onSaved,
}: {
  profile: ProfileRow;
  request?: AdminLinkRequest;
  houseSelected: boolean;
  onSaved: () => void;
}) {
  const [link, setLink] = useState(
    houseSelected ? request?.promo_link ?? "" : profile.promo_link ?? "",
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = link.trim().slice(0, 500);
    setSaving(true);

    if (houseSelected) {
      if (!request) {
        setSaving(false);
        toast.error("Este afiliado não possui um link cadastrado para esta casa.");
        return;
      }
      const { error } = await supabase
        .from("link_requests")
        .update({ promo_link: value })
        .eq("id", request.id);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Link da casa salvo!");
      onSaved();
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ promo_link: value })
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
        placeholder={houseSelected ? "Link desta casa" : "https://..."}
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
    is_manager: false,
  });
  const [saving, setSaving] = useState(false);
  const sb = supabase as unknown as { from: (t: string) => any };

  const { data: requestedProfile } = useQuery({
    queryKey: ["link-request-profile", request.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, referred_by, is_manager")
        .eq("id", request.user_id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; referred_by: string | null; is_manager?: boolean } | null;
    },
  });

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

  const isDirectSignup = !requestedProfile?.referred_by;
  const isExistingManager = requestedProfile?.is_manager === true;
  const managerSelected = form.is_manager || isExistingManager;
  const directDefaultAmount = managerSelected ? 210 : 200;
  const autoAmount = isDirectSignup
    ? Number(form.cpa_amount) > 0
      ? Number(form.cpa_amount)
      : directDefaultAmount
    : plan && plan > 0
      ? plan
      : null;


  const release = async () => {
    if (!form.promo_link.trim()) {
      toast.error("Informe o link de divulgação.");
      return;
    }
    setSaving(true);
    const amount = autoAmount;
    if (amount === null || amount <= 0) {
      toast.error("Este afiliado veio por uma rede. O gerente precisa definir o CPA dele antes da liberação.");
      setSaving(false);
      return;
    }
    const link = form.promo_link.trim().slice(0, 500);
    const houseName = request.betting_houses?.name ?? "Acordo CPA";

    const { error } = await sb
      .from("link_requests")
      .update({
        promo_link: link,
        cpa_amount: amount,
        status: "liberado",
      })
      .eq("id", request.id);

    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    await sb
      .from("profiles")
      .update({ promo_link: link, is_manager: managerSelected })
      .eq("id", request.user_id);

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
            cpa_amount: amount,
            deal_name: houseName,
          })
          .eq("id", existing[0].id)
      : await supabase.from("affiliate_deals").insert({
          affiliate_id: request.user_id,
          house_id: request.house_id,
          deal_name: houseName,
          cpa_amount: amount,
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
        <div className="space-y-2 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs">Plano do afiliado</Label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={managerSelected}
                disabled={isExistingManager}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((f) => ({
                    ...f,
                    is_manager: checked,
                    cpa_amount: String(checked ? 210 : 200),
                  }));
                }}
                className="size-4 accent-primary"
              />
              Tornar gerente
            </label>
          </div>
          {isDirectSignup ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                id="link-request-cpa"
                type="number"
                min="0"
                step="0.01"
                value={form.cpa_amount || String(directDefaultAmount)}
                onChange={(e) => setForm((f) => ({ ...f, cpa_amount: e.target.value }))}
              />
              <div className="flex items-center rounded-md border border-border/60 bg-background/60 px-3 text-xs text-muted-foreground">
                {managerSelected ? "Gerente · sugestão R$ 210" : "Afiliado · sugestão R$ 200"}
              </div>
            </div>
          ) : plan && plan > 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <strong>{brl(plan)}</strong>
              <Badge variant="secondary" className="text-[10px]">definido pelo gerente</Badge>
            </div>
          ) : (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
              Este cadastro veio por uma rede. O gerente precisa definir o CPA em <strong>Minha rede</strong> antes da liberação.
            </div>
          )}
          {isDirectSignup && (
            <p className="text-[11px] text-muted-foreground">
              O valor é editável pelo head da operação. R$ 200 é o padrão de afiliado e R$ 210 é a sugestão para gerente.
            </p>
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

function AffiliateLinksCard({
  profile,
  requests,
  onSaved,
}: {
  profile: ProfileRow;
  requests: AdminLinkRequest[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (r: AdminLinkRequest) => {
    const link = (drafts[r.id] ?? r.promo_link).trim();
    setSaving(r.id);
    const sb = supabase as unknown as { from: (t: string) => any };
    const { error } = await sb
      .from("link_requests")
      .update({ promo_link: link, status: link ? "liberado" : r.status })
      .eq("id", r.id);
    setSaving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Link da ${r.betting_houses?.name ?? "casa"} atualizado!`);
    onSaved();
  };

  const liberados = requests.filter((r) => r.status === "liberado").length;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile.full_name || profile.email}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {requests.length} casa{requests.length === 1 ? "" : "s"} · {liberados} liberado
            {liberados === 1 ? "" : "s"}
          </Badge>
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="grid gap-3 border-t border-border/60 px-4 py-4">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este afiliado ainda não possui casas com link solicitado.
            </p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="grid gap-2 rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <HouseBadge name={r.betting_houses?.name ?? "Casa"} />
                  <Badge variant={r.status === "liberado" ? "default" : "secondary"}>
                    {r.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="min-w-0 flex-1 font-mono text-xs"
                    placeholder="https://..."
                    value={drafts[r.id] ?? r.promo_link}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                  <Button size="sm" disabled={saving === r.id} onClick={() => save(r)}>
                    {saving === r.id ? "Salvando..." : "Salvar link"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
