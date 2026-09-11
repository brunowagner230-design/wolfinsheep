import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { SupportMessageRow } from "@/lib/panel";
import { cn } from "@/lib/utils";

export function TicketChat({
  ticketId,
  sender,
  authorId,
}: {
  ticketId: string;
  sender: "afiliado" | "suporte";
  authorId: string;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["support-messages", ticketId],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as SupportMessageRow[];
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender,
      author_id: authorId,
      body: body.slice(0, 2000),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    qc.invalidateQueries({ queryKey: ["support-messages", ticketId] });
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="max-h-72 min-h-24 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-background/50 p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma mensagem ainda. Escreva abaixo para iniciar a conversa.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender === sender;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/60 bg-card text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px] uppercase tracking-wide",
                      mine ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {m.sender === "suporte" ? "Suporte" : "Afiliado"} ·{" "}
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva sua mensagem..."
          rows={2}
          maxLength={2000}
          className="min-w-0 flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button onClick={send} disabled={busy || !text.trim()} className="gap-2">
          <Send className="size-4" /> Enviar
        </Button>
      </div>
    </div>
  );
}
