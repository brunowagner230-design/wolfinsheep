import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Handshake, Network, WalletCards, Trophy, ShieldCheck, LogOut, Menu,
  Sun, Moon, ChevronRight, CircleUserRound, Settings2, Sparkles,
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
import { flushPush } from "@/lib/push.functions";

const navItems = [
  { to: "/dashboard", label: "Visão geral", description: "Resumo da operação", icon: LayoutDashboard },
  { to: "/acordos", label: "Acordos CPA", description: "Casas e campanhas", icon: Handshake },
  { to: "/rede", label: "Minha rede", description: "Afiliados e níveis", icon: Network },
  { to: "/premiacoes", label: "Premiações", description: "Bônus e rankings", icon: Trophy },
  { to: "/carteira", label: "Carteira", description: "Saldo e saques", icon: WalletCards },
] as const;

const PANEL_THEME_KEY = "wolf-panel-theme";

export function AppShell({ title, subtitle, children }: {
  title: string; subtitle?: string; children: ReactNode;
}) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [panelTheme, setPanelTheme] = useState<"dark" | "light">("dark");
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    const saved = window.localStorage.getItem(PANEL_THEME_KEY);
    if (saved === "light" || saved === "dark") setPanelTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", panelTheme === "dark");
  }, [panelTheme]);

  const setPanelThemePreference = (next: "light" | "dark") => {
    setPanelTheme(next);
    window.localStorage.setItem(PANEL_THEME_KEY, next);
  };

  const { data: profile } = useQuery({
    queryKey: ["shell-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("full_name, email, approved").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const flush = useServerFn(flushPush);
  useEffect(() => {
    if (!user) return;
    const run = () => flush({}).catch(() => undefined);
    run();
    const id = window.setInterval(run, 30000);
    return () => window.clearInterval(id);
  }, [user, flush]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        <span className="text-sm text-muted-foreground">Carregando seu painel…</span>
      </div>
    </div>;
  }

  if (profile && !profile.approved && !isAdmin) {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <Wordmark className="h-10" />
      <div className="max-w-md rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Cadastro em análise</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sua conta foi criada e está aguardando a aprovação da administração. Você receberá acesso ao painel assim que o cadastro for liberado.
        </p>
        <Button variant="secondary" className="mt-6 w-full gap-2" onClick={() => signOut()}>
          <LogOut className="size-4" /> Sair
        </Button>
      </div>
    </div>;
  }

  return <div className={cn("min-h-screen bg-background", isAdminRoute && (panelTheme === "light" ? "admin-theme-light" : "admin-theme-dark"))}>
    <div className="flex min-h-screen">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar/95 px-3 py-4 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex h-12 items-center justify-between px-3">
          <Link to="/dashboard" className="flex items-center"><Wordmark className="h-8" /></Link>
          <div className="hidden size-8 items-center justify-center rounded-lg border border-sidebar-border/70 bg-sidebar-accent/50 text-sidebar-foreground/60 lg:flex">
            <Sparkles className="size-3.5" />
          </div>
        </div>
        <div className="mx-2 mt-5 rounded-2xl border border-sidebar-border/70 bg-gradient-to-br from-sidebar-accent/80 to-sidebar-accent/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <Settings2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/40">Workspace</p>
              <p className="truncate text-xs font-semibold text-sidebar-foreground">Wolf in Sheep</p>
            </div>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-sidebar-foreground/10">
            <div className="h-full w-3/4 rounded-full bg-primary/70" />
          </div>
          <p className="mt-2 text-[9px] text-sidebar-foreground/40">Painel operacional</p>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1.5">
          <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/35">Navegação</p>
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
              className="group relative flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sidebar-foreground/55 transition-all hover:border-sidebar-border/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
              activeProps={{ className: "group relative flex items-center gap-3 rounded-2xl border border-primary/20 bg-sidebar-accent px-3 py-2.5 text-sidebar-foreground shadow-sm" }}>
              <span className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity group-data-[status=active]:opacity-100" />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-foreground/[0.045] text-sidebar-foreground/55 transition-all group-hover:bg-primary/10 group-hover:text-primary group-data-[status=active]:bg-primary/15 group-data-[status=active]:text-primary">
                <item.icon className="size-[17px]" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-4">{item.label}</span>
                <span className="mt-0.5 block truncate text-[10px] text-sidebar-foreground/35">{item.description}</span>
              </span>
              <ChevronRight className="size-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-40 group-data-[status=active]:opacity-50" />
            </Link>
          ))}
          {isAdmin && (
            <>
              <p className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/35">Gestão</p>
              <Link to="/admin" onClick={() => setOpen(false)}
                className="group relative flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sidebar-foreground/55 transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-sidebar-foreground"
                activeProps={{ className: "group relative flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-foreground shadow-sm" }}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                  <ShieldCheck className="size-[17px]" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">Administração</span>
                  <span className="mt-0.5 block text-[10px] text-sidebar-foreground/35">Gestão do painel</span>
                </span>
                <ChevronRight className="size-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-50" />
              </Link>
            </>
          )}
        </nav>
        <div className="border-t border-sidebar-border/70 px-2 pt-3">
          <div className="mb-2 flex items-center gap-2 rounded-xl px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><CircleUserRound className="size-4" /></div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{profile?.full_name || user.email}</p>
              <p className="truncate text-[10px] text-sidebar-foreground/45">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>

      {open && <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-background/75 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-9">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3">
            <Button variant="secondary" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu className="size-4" /></Button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{isAdminRoute ? "Administração" : "Affiliate workspace"}</p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
              {subtitle && <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              {pathname === "/dashboard" && (
                <div className="hidden items-center gap-1 rounded-xl border border-border/70 bg-card p-1 sm:flex" aria-label="Escolher aparência do painel">
                  <Button
                    variant={panelTheme === "light" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg px-3"
                    onClick={() => setPanelThemePreference("light")}
                    aria-pressed={panelTheme === "light"}
                  >
                    <Sun className="size-3.5" /> Claro
                  </Button>
                  <Button
                    variant={panelTheme === "dark" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg px-3"
                    onClick={() => setPanelThemePreference("dark")}
                    aria-pressed={panelTheme === "dark"}
                  >
                    <Moon className="size-3.5" /> Escuro
                  </Button>
                </div>
              )}
              <InstallAppButton /><EnableNotificationsButton /><NotificationBell />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  </div>;
}
