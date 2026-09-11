import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Clock, Check, Link2 } from "lucide-react";
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

function DealsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sb = supabase as unknown as { from: (t: string) => any };

  const { data: houses = [] } = useQuery({
    queryKey: ["houses"],
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
      return (data ?? []) as unknown as DealRow[];
    },
  });

  const requestOf = (houseId: string) => requests.find((r) => r.house_id === houseId);

  const requestLink = async (house: HouseRow) => {
    const { error } = await sb
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
      <Card className="glow-panel">
        <CardHeader>
          <CardTitle className="text-base">Casas de aposta disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {houses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma casa disponível no momento.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {houses.map((h) => {
                const req = requestOf(h.id);
                const released = req?.status === "liberado" && !!req.promo_link;
                return (
                  <div
                    key={h.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-4"
                  >
                    <HouseBadge name={h.name} />
                    {released ? (
                      <>
                        <div className="text-xs text-muted-foreground">
                          <p>
                            Plano: <strong className="text-foreground">{req.cpa_plan || "CPA"}</strong>{" "}
                            · {brl(Number(req.cpa_amount))}
                          </p>
                          {req.baseline && <p className="mt-1">Baseline: {req.baseline}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate rounded bg-secondary/60 px-2 py-1.5 font-mono text-[11px]">
                            {req.promo_link}
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              await navigator.clipboard.writeText(req.promo_link);
                              toast.success("Link copiado!");
                            }}
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                        <Badge className="w-fit gap-1 bg-success text-success-foreground">
                          <Check className="size-3" /> link liberado
                        </Badge>
                      </>
                    ) : req ? (
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
                      <Button className="mt-auto gap-2" onClick={() => requestLink(h)}>
                        <Link2 className="size-4" /> Solicitar link
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Meus acordos de CPA ({deals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando acordos…</p>
          ) : deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum acordo lançado para você ainda. Solicite o link de uma casa acima para começar.
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
