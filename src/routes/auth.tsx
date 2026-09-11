import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { HouseMarquee } from "@/components/HouseMarquee";
import { Wordmark } from "@/components/Wordmark";
import bannerImg from "@/assets/wolf-banner.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou cadastrar | Wolf in Sheep Affiliates" },
      {
        name: "description",
        content:
          "Acesse o painel Wolf in Sheep Affiliates para acompanhar seus acordos de CPA, casas de aposta e sua rede de afiliados.",
      },
      { property: "og:title", content: "Entrar ou cadastrar | Wolf in Sheep Affiliates" },
      {
        property: "og:description",
        content: "Login e cadastro do painel de afiliados Wolf in Sheep.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search["ref"] === "string" ? { ref: search["ref"] } : {},
  component: AuthPage,
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(8, "Informe um celular válido").max(30),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres").max(72),
});

function AuthPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível entrar: " + error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      full_name: form.get("full_name"),
      email: form.get("email"),
      phone: form.get("phone"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          ref_code: ref ?? "",
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível cadastrar: " + error.message);
      return;
    }
    toast.success("Cadastro criado! Você já pode acessar o painel.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border p-12 lg:flex glow-panel">
        <img
          src={bannerImg}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15 blur-[2px]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="relative">
          <Wordmark className="h-9" />
        </div>
        <div className="relative">
          <h2 className="max-w-sm text-4xl leading-tight">
            O painel de CPA para quem <span className="text-gradient-brand">caça acordos</span> de
            verdade.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Acompanhe acordos das casas de aposta, CPAs elegíveis, cliques, registros e o plano de
            cada afiliado da sua rede.
          </p>
        </div>
        <div className="relative">
          <HouseMarquee />
        </div>
      </div>

      <div className="flex min-w-0 flex-col items-center justify-center gap-8 p-6">
        <div className="w-full min-w-0 max-w-sm">
          <div className="mb-8 lg:hidden">
            <Wordmark className="h-7" />
          </div>
          {ref && (
            <p className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
              Você foi convidado com o código <strong>{ref}</strong>
            </p>
          )}
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Cadastrar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input id="login-email" name="email" type="email" required maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    maxLength={72}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  Entrar no painel
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Nome</Label>
                  <Input id="su-name" name="full_name" required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">E-mail</Label>
                  <Input id="su-email" name="email" type="email" required maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-phone">Celular</Label>
                  <Input
                    id="su-phone"
                    name="phone"
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                    required
                    maxLength={30}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Senha</Label>
                  <Input
                    id="su-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    maxLength={72}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 6 caracteres — sem exigência de maiúsculas ou símbolos.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  Criar minha conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        <div className="w-full min-w-0 max-w-sm lg:hidden">
          <HouseMarquee />
        </div>
      </div>
    </div>
  );
}
