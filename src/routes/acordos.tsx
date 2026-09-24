import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Check, Link2, Sparkles, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { brl, type DealRow, type HouseRow } from "@/lib/panel";
import { HouseBadge } from "@/components/HouseBadge";

export const Route = createFileRoute("/acordos")({
  head: () => ({
    meta: [
      { title: "Acordos de CPA | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Casas de aposta disponíveis para divulgação: solicite seu link, acompanhe o plano de CPA liberado e as métricas dos seus acordos.",
      },
      { property: "og:title", content: "Acordos de CPA | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Solicite o link das casas disponíveis e acompanhe seus acordos de CPA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DealsPage,
});

type LinkRequestRow = {
  id: string;
  house_id: string;
  status: string;
  promo_link: string;
  cpa_plan: string;
  cpa_amount: number | string;
  baseline: string;
  admin_note: string | null;
};

function minimumQualifications(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("superbet") && normalized.includes("mensal")) return 10;
  if (normalized.includes("aposta") && normalized.includes("ganha")) return 10;
  if (normalized.includes("superbet") && normalized.includes("diaria")) return 2;
  if (normalized.includes("betano") && normalized.includes("diaria")) return 2;
  return null;
}

function DealsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sb = supabase as unknown as { from: (t: string) => any };

  const { data: houses = [] } = useQuery({
    queryKey: ["houses"],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase.from("betting_houses").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as HouseRow[];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["my-link-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("link_requests")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as LinkRequestRow[];
    },
  });

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_deals")
        .select("*, betting_houses(name)")
        .eq("affiliate_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((d: any) => String(d.betting_houses?.name ?? "").toLowerCase().includes("superbet")) as unknown as DealRow[];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile-link", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("promo_link")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { promo_link: string } | null;
    },
  });

  const activeHouses = houses.filter((house) => house.name.toLowerCase().includes("superbet"));

  const requestOf = (houseId: string) => requests.find((r) => r.house_id === houseId);
  const dealOf = (houseId: string) => deals.find((d) => d.house_id === houseId);

  /** Link já liberado: da solicitação, ou do acordo existente + link do perfil. */
  const releasedLink = (houseId: string) => {
    const req = requestOf(houseId);
    if (req?.status === "liberado" && req.promo_link) return req.promo_link;
    const deal = dealOf(houseId);
    if (deal && profile?.promo_link) return profile.promo_link;
    return null;
  };

  const requestLink = async (house: HouseRow) => {
    if (house.is_active === false) {
      toast.error("Esta operação está pausada no momento.");
      return;
    }
    const existing = requests.find((r) => r.house_id === house.id);
    const { error } = existing
      ? await sb
          .from("link_requests")
          .update({ status: "pendente", admin_note: null })
          .eq("id", existing.id)
      : await sb
          .from("link_requests")
          .insert({ user_id: user!.id, house_id: house.id, status: "pendente" });
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "Você já solicitou o link desta casa."
          : error.message,
      );
      return;
    }
    toast.success(`Solicitação enviada para ${house.name}! Aguarde a liberação do link.`);
    qc.invalidateQueries({ queryKey: ["my-link-requests"] });
  };

  return (
    <AppShell
      title="Acordos CPA"
      subtitle="Casas disponíveis para divulgação — solicite o link e acompanhe o plano de CPA liberado para você."
    >
      <Card className="product-card rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/10 pb-5">
          <div className="section-kicker">Operações</div>
          <CardTitle className="section-title">Casas de aposta disponíveis</CardTitle>
          <p className="section-description">Solicite o acesso à operação ativa e acompanhe o status do seu link.</p>
        </CardHeader>
        <CardContent>
          {houses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma casa disponível no momento.
            </p>
          ) : (
            <div className="grid gap-4 p-1 sm:grid-cols-2 xl:grid-cols-3">
              {activeHouses.map((h) => {
                const req = requestOf(h.id);
                const deal = dealOf(h.id);
                const link = releasedLink(h.id);
                const minimum = minimumQualifications(h.name);
                return (
                  <div
                    key={h.id}
                    className="group flex min-h-[220px] flex-col gap-4 rounded-2xl border border-border/70 bg-muted/10 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5"
                  >
                    <HouseBadge name={h.name} logoUrl={h.logo_url} />

                    {h.is_active === false ? (
                      <>
                        <Badge variant="secondary" className="w-fit gap-1 border-amber-500/30 bg-amber-500/10 text-amber-300">
                          <Clock className="size-3" /> operação pausada
                        </Badge>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                          <p className="text-sm font-semibold text-foreground">Operação temporariamente pausada</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {h.pause_message || "A administração pausou esta operação no momento. Você será avisado quando ela for reativada."}
                          </p>
                        </div>
                      </>
                    ) : link ? (
                      <>
                        <Badge className="w-fit gap-1 bg-success text-success-foreground">
                          <Check className="size-3" /> link liberado
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Copie seu link de divulgação no Painel.
                        </p>
                      </>
                    ) : req && req.status !== "rejeitado" ? (
                      <>
                        <Badge variant="secondary" className="w-fit gap-1">
                          <Clock className="size-3" />
                          {req.status === "rejeitado" ? "solicitação recusada" : "em análise"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {req.admin_note ||
                            "Sua solicitação está com a administração. Você recebe uma notificação quando o link for liberado."}
                        </p>
                      </>
                    ) : (
                      <Button
                        className="mt-auto h-auto min-h-16 w-full whitespace-normal bg-primary px-4 py-3 text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary"
                        onClick={() => requestLink(h)}
                      >
                        <Link2 className="size-5" />
                        <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                          <span className="font-display text-sm font-bold uppercase">{h.name}</span>
                          <span className="mt-1 text-[0.7rem] font-bold uppercase opacity-90">
                            {minimum
                              ? `Saque mínimo ${minimum} QFTDs`
                              : "Solicitar link"}
                          </span>
                        </span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="product-card rounded-3xl mt-6 overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/10 pb-5">
          <div className="section-kicker">Acompanhamento</div>
          <CardTitle className="section-title">Meus acordos e CPAs ({deals.length})</CardTitle>
          <p className="section-description">Consulte seus planos, métricas e status em uma única visão.</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando acordos…</p>
          ) : deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum acordo Superbet lançado para você ainda. Solicite o link da Superbet acima para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Casa</TableHead>
                    <TableHead>Acordo</TableHead>
                    <TableHead>Plano CPA</TableHead>
                    <TableHead>Baseline</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                    <TableHead className="text-right">Validados</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        <HouseBadge name={d.betting_houses?.name ?? null} />
                      </TableCell>
                      <TableCell>{d.deal_name || "—"}</TableCell>
                      <TableCell>{d.cpa_plan || "—"}</TableCell>
                      <TableCell>{d.baseline || "—"}</TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
