import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { TicketChat } from "@/components/SupportChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileRow, SupportTicketRow } from "@/lib/panel";

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte ao afiliado | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Fale com a equipe Wolf in Sheep Affiliates em tempo real: relate problemas com CPA, links de divulgação, saques ou sua rede.",
      },
      { property: "og:title", content: "Suporte ao afiliado | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Chat de atendimento direto com a equipe Wolf in Sheep Affiliates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportPage,
});

const statusStyle: Record<string, string> = {
  aberto: "border-primary/40 bg-primary/15 text-primary",
  respondido: "border-success/40 bg-success/15 text-success",
  fechado: "border-border bg-muted text-muted-foreground",
};

function SupportPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    if (!me) return;
    setName((v) => v || me.full_name);
    setEmail((v) => v || me.email);
    setPhone((v) => v || me.phone);
  }, [me]);

  const { data: tickets = [] } = useQuery({
    queryKey: ["support-tickets", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SupportTicketRow[];
    },
  });

  const open = async () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Preencha nome, e-mail, assunto e a descrição do problema.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user!.id,
        name: name.trim().slice(0, 120),
        email: email.trim().slice(0, 255),
        phone: phone.trim().slice(0, 30),
        subject: subject.trim().slice(0, 160),
      })
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setBusy(false);
      toast.error(error?.message ?? "Não foi possível abrir o atendimento.");
      return;
    }

    const { error: msgError } = await supabase.from("support_messages").insert({
      ticket_id: data.id,
      sender: "afiliado",
      author_id: user!.id,
      body: message.trim().slice(0, 2000),
    });
    setBusy(false);
    if (msgError) {
      toast.error(msgError.message);
      return;
    }
    toast.success("Atendimento aberto! Nossa equipe responde aqui mesmo no chat.");
    setSubject("");
    setMessage("");
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
  };

  return (
    <AppShell
      title="Suporte"
      subtitle="Fale direto com a equipe Wolf in Sheep: chat ao vivo dentro do painel."
    >
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="form-section h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LifeBuoy className="size-4 text-primary" /> Abrir atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sup-name">Seu nome</Label>
              <Input
                id="sup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sup-email">E-mail</Label>
                <Input
                  id="sup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-phone">Celular</Label>
                <Input
                  id="sup-phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-subject">Assunto</Label>
              <Input
                id="sup-subject"
                placeholder="Ex.: CPA não subiu na Betano"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-message">O que está acontecendo?</Label>
              <Textarea
                id="sup-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                placeholder="Descreva o problema com o máximo de detalhes."
              />
            </div>
            <Button className="w-full" onClick={open} disabled={busy}>
              Iniciar conversa com o suporte
            </Button>
            <p className="text-xs text-muted-foreground">
              O atendimento acontece aqui no painel e você recebe uma notificação assim que a
              equipe responder.
            </p>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          {tickets.length === 0 ? (
            <Card className="product-card rounded-2xl">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Você ainda não abriu nenhum atendimento.
              </CardContent>
            </Card>
          ) : (
            tickets.map((t) => (
              <Card key={t.id} className="product-card min-w-0 rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{t.subject}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Aberto em {new Date(t.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${
                      statusStyle[t.status] ?? statusStyle["aberto"]
                    }`}
                  >
                    {t.status}
                  </span>
                </CardHeader>
                <CardContent>
                  <TicketChat ticketId={t.id} sender="afiliado" authorId={user!.id} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
