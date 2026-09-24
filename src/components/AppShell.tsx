import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Handshake, Network, Wallet, Trophy, ShieldCheck, LogOut, Menu,
  LifeBuoy, Sun, Moon, ChevronRight, CircleUserRound,
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
  { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { to: "/acordos", label: "Acordos CPA", icon: Handshake },
  { to: "/rede", label: "Minha rede", icon: Network },
  { to: "/premiacoes", label: "Premiações", icon: Trophy },
  { to: "/carteira", label: "Carteira", icon: Wallet },
  { to: "/suporte", label: "Suporte", icon: LifeBuoy },
] as const;

const ADMIN_THEME_KEY = "wolf-admin-theme";

export function AppShell({ title, subtitle, children }: {
  title: string; subtitle?: string; children: ReactNode;
}) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [adminTheme, setAdminTheme] = useState<"dark" | "light">("dark");
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAdminRoute) return;
    const saved = window.localStorage.getItem(ADMIN_THEME_KEY);
    if (saved === "light" || saved === "dark") setAdminTheme(saved);
  }, [isAdminRoute]);

  const toggleAdminTheme = () => {
    const next = adminTheme === "dark" ? "light" : "dark";
    setAdminTheme(next);
    window.localStorage.setItem(ADMIN_THEME_KEY, next);
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

  return <div className={cn("min-h-screen bg-background", isAdminRoute && (adminTheme === "light" ? "admin-theme-light" : "admin-theme-dark"))}>
    <div className="flex min-h-screen">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar/95 px-3 py-4 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex h-12 items-center px-3">
          <Link to="/dashboard" className="flex items-center"><Wordmark className="h-8" /></Link>
        </div>
        <div className="mx-2 mt-5 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
            Workspace
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-sidebar-foreground">
            Wolf in Sheep
          </p>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/35">Menu</p>
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "group flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-2.5 text-sm font-semibold text-sidebar-foreground shadow-sm ring-1 ring-primary/20" }}>
              <item.icon className="size-[17px]" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-50" />
            </Link>
          ))}
          {isAdmin && (
            <>
              <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/35">Gestão</p>
              <Link to="/admin" onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
                activeProps={{ className: "group flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-foreground ring-1 ring-primary/25" }}>
                <ShieldCheck className="size-[17px]" /><span className="flex-1">Administração</span><ChevronRight className="size-3 opacity-0 group-hover:opacity-50" />
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
              {isAdminRoute && <Button variant="secondary" size="sm" className="hidden gap-2 sm:flex" onClick={toggleAdminTheme}>
                {adminTheme === "dark" ? <><Sun className="size-4" /> Claro</> : <><Moon className="size-4" /> Escuro</>}
              </Button>}
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
