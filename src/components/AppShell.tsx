import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { flushPush } from "@/lib/push.functions";
import {
  LayoutDashboard,
  Handshake,
  Network,
  Wallet,
  Trophy,
  ShieldCheck,
  LogOut,
  Menu,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, type ReactNode } from "react";
import { EnableNotificationsButton, InstallAppButton } from "@/components/InstallAppButton";
import { NotificationBell } from "@/components/NotificationBell";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/acordos", label: "Acordos CPA", icon: Handshake },
  { to: "/rede", label: "Minha rede", icon: Network },
  { to: "/premiacoes", label: "Premiações", icon: Trophy },
  { to: "/carteira", label: "Carteira", icon: Wallet },
  { to: "/suporte", label: "Suporte", icon: LifeBuoy },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["shell-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, approved")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const flush = useServerFn(flushPush);
  useEffect(() => {
    if (!user) return;
    const run = () => {
      flush({}).catch(() => undefined);
    };
    run();
    const id = window.setInterval(run, 30_000);
    return () => window.clearInterval(id);
  }, [user, flush]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Carregando painel…</span>
      </div>
    );
  }

  if (profile && !profile.approved && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Wordmark className="h-10" />
        <h1 className="font-display text-2xl font-bold">Cadastro em análise</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Sua conta foi criada e está aguardando a aprovação da administração. Você receberá acesso
          ao painel assim que o cadastro for liberado.
        </p>
        <Button variant="secondary" className="gap-2" onClick={() => signOut()}>
          <LogOut className="size-4" /> Sair
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link to="/dashboard" className="flex items-center">
          <Wordmark className="h-9" />
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-foreground font-semibold ring-1 ring-primary/30",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-foreground font-semibold ring-1 ring-primary/30",
              }}
            >
              <ShieldCheck className="size-4" />
              Administração
            </Link>
          )}
        </nav>

        <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
          <p className="truncate px-1 text-sm font-semibold">
            {profile?.full_name || user.email}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-background/70 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="min-w-0 flex-1 px-5 py-6 lg:px-10 lg:py-8">
        <header className="mb-8 flex flex-wrap items-start gap-4">
          <Button
            variant="secondary"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold lg:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InstallAppButton />
            <EnableNotificationsButton />
            <NotificationBell />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
