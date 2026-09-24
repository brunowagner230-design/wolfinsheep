import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
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
      { title: "Acessar painel | Wolf in Sheep Affiliates" },
      { name: "description", content: "Acesse seu painel de afiliado Wolf in Sheep." },
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
    if (error) { toast.error("Não foi possível entrar: " + error.message); return; }
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      full_name: form.get("full_name"), email: form.get("email"),
      phone: form.get("phone"), password: form.get("password"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0]!.message); return; }

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.full_name, phone: parsed.data.phone, ref_code: ref ?? "" },
      },
    });
    setBusy(false);
    if (error) { toast.error("Não foi possível cadastrar: " + error.message); return; }
    toast.success("Cadastro criado! Você já pode acessar o painel.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-border/60 lg:flex lg:flex-col lg:justify-between">
        <img src={bannerImg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/85 to-primary/15" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <Wordmark className="h-9" />
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Affiliate workspace
            </span>
            <h1 className="mt-5 max-w-lg text-5xl font-semibold leading-[1.02] tracking-tight xl:text-6xl">
              Operação organizada. <span className="text-gradient-brand">Resultado claro.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Acompanhe seus acordos, CPAs, pagamentos e rede em um único painel, com informações organizadas para você saber exatamente o que está acontecendo.
            </p>
            <div className="mt-8 grid max-w-md gap-3">
              {["Acordos CPA e links de divulgação", "Carteira e histórico de pagamentos", "Rede de afiliados e comissões"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-foreground/85">
                  <CheckCircle2 className="size-4 shrink-0 text-success" /> {item}
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/40 p-4 backdrop-blur-md">
            <HouseMarquee />
          </div>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[430px]">
          <div className="mb-8 lg:hidden"><Wordmark className="h-8" /></div>
          <div className="mb-7">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LockKeyhole className="size-5" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Acesse sua conta</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Entre no painel ou crie seu cadastro para começar.</p>
          </div>

          {ref && <div className="mb-5 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-3.5 py-3 text-xs">
            <ShieldCheck className="size-4 text-primary" /> Convite aplicado: <strong>{ref}</strong>
          </div>}

          <div className="rounded-2xl border border-border/70 bg-card p-2 shadow-[0_24px_70px_-38px_oklch(0_0_0/0.65)]">
            <Tabs defaultValue={ref ? "signup" : "login"}>
              <TabsList className="grid h-11 w-full grid-cols-2 bg-secondary/70">
                <TabsTrigger value="login" className="rounded-lg">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="px-3 pb-3 pt-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="login-email">E-mail</Label><Input id="login-email" name="email" type="email" autoComplete="email" placeholder="voce@email.com" required maxLength={255} /></div>
                  <div className="space-y-2"><Label htmlFor="login-password">Senha</Label><Input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required maxLength={72} /></div>
                  <Button type="submit" className="mt-2 h-11 w-full gap-2" disabled={busy}>
                    {busy ? "Entrando..." : <>Entrar no painel <ArrowRight className="size-4" /></>}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="px-3 pb-3 pt-5">
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div className="space-y-2"><Label htmlFor="su-name">Nome completo</Label><Input id="su-name" name="full_name" autoComplete="name" placeholder="Seu nome" required maxLength={120} /></div>
                  <div className="space-y-2"><Label htmlFor="su-email">E-mail</Label><Input id="su-email" name="email" type="email" autoComplete="email" placeholder="voce@email.com" required maxLength={255} /></div>
                  <div className="space-y-2"><Label htmlFor="su-phone">Celular</Label><Input id="su-phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" required maxLength={30} /></div>
                  <div className="space-y-2"><Label htmlFor="su-password">Senha</Label><Input id="su-password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo de 6 caracteres" required minLength={6} maxLength={72} /></div>
                  <Button type="submit" className="h-11 w-full gap-2" disabled={busy}>
                    {busy ? "Criando..." : <>Criar minha conta <ArrowRight className="size-4" /></>}
                  </Button>
                  <p className="pt-1 text-center text-[11px] leading-5 text-muted-foreground">Seu cadastro passa por aprovação antes do acesso completo ao painel.</p>
                </form>
              </TabsContent>
            </Tabs>
          </div>
          <p className="mt-5 text-center text-[11px] text-muted-foreground">Wolf in Sheep Affiliates · Área segura de afiliados</p>
        </div>
      </main>
    </div>
  );
}
