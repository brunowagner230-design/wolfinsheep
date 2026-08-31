import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Handshake, Network, ShieldCheck, LogOut, Menu } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Wordmark, WolfMark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/acordos", label: "Acordos CPA", icon: Handshake },
  { to: "/rede", label: "Minha rede", icon: Network },
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

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Carregando painel…</span>
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
        <Link to="/dashboard" className="flex items-center gap-3">
          <WolfMark />
          <Wordmark className="text-[11px]" />
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
          <p className="truncate px-1 text-xs text-muted-foreground">{user.email}</p>
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

      <main className="flex-1 px-5 py-6 lg:px-10 lg:py-8">
        <header className="mb-8 flex items-start gap-4">
          <Button
            variant="secondary"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
