import { BellRing, Check, Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePwa } from "@/hooks/usePwa";

export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, installed, install } = usePwa();

  const handle = async () => {
    if (canInstall) {
      const ok = await install();
      if (ok) toast.success("App adicionado à tela inicial!");
      return;
    }
    toast.info(
      "No celular: toque no menu do navegador e escolha “Adicionar à tela de início” para instalar o app.",
    );
  };

  if (installed) {
    return (
      <Button variant="secondary" className={`gap-2 ${className ?? ""}`} disabled>
        <Smartphone className="size-4" />
        <span className="hidden sm:inline">App instalado</span>
      </Button>
    );
  }

  return (
    <Button variant="secondary" className={`gap-2 ${className ?? ""}`} onClick={handle}>
      <Download className="size-4" />
      <span className="hidden sm:inline">Baixar app</span>
    </Button>
  );
}

export function EnableNotificationsButton({ className }: { className?: string }) {
  const { permission, enableNotifications } = usePwa();

  const handle = async () => {
    if (typeof window !== "undefined" && window.top !== window.self) {
      toast.info("Abra o site em uma aba própria (ou pelo app instalado) para ativar as notificações.");
      return;
    }
    const result = await enableNotifications();
    if (result === "granted") {
      toast.success("Notificações ativadas! Você será avisado a cada CPA validado e saque pago.");
    } else if (result === "denied") {
      toast.error("Notificações bloqueadas no navegador. Libere nas configurações do site.");
    } else if (result === "unsupported") {
      toast.error("Seu navegador não suporta notificações.");
    }
  };

  if (permission === "granted") {
    return (
      <Button variant="secondary" className={`gap-2 ${className ?? ""}`} disabled>
        <Check className="size-4" />
        <span className="hidden sm:inline">Notificações ativas</span>
      </Button>
    );
  }

  return (
    <Button className={`gap-2 ${className ?? ""}`} onClick={handle}>
      <BellRing className="size-4" />
      <span className="hidden sm:inline">Ativar notificações</span>
    </Button>
  );
}
