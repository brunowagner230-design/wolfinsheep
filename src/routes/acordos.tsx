import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { brl, type DealRow } from "@/lib/panel";

export const Route = createFileRoute("/acordos")({
  head: () => ({
    meta: [
      { title: "Acordos de CPA | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Todos os acordos de CPA lançados pela administração nas suas casas de aposta, com baseline, valores e métricas.",
      },
      { property: "og:title", content: "Acordos de CPA | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Acordos, planos de CPA e métricas por casa de aposta.",
      },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  const { user } = useAuth();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_deals")
        .select("*, betting_houses(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DealRow[];
    },
  });

  return (
    <AppShell
      title="Acordos CPA"
      subtitle="Acordos e planos de CPA lançados para a sua conta pela administração."
    >
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando acordos…</p>
          ) : deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum acordo lançado ainda.</p>
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
                    <TableHead className="text-right">Rev</TableHead>
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
                        {d.betting_houses?.name ?? "—"}
                      </TableCell>
                      <TableCell>{d.deal_name || "—"}</TableCell>
                      <TableCell>{d.cpa_plan || "—"}</TableCell>
                      <TableCell>{d.baseline || "—"}</TableCell>
                      <TableCell className="text-right">{brl(Number(d.cpa_amount))}</TableCell>
                      <TableCell className="text-right">{Number(d.revshare)}%</TableCell>
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
