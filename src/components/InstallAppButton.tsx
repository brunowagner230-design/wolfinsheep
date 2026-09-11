import { BellRing, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePwa } from "@/hooks/usePwa";

export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, installed, install, permission, enableNotifications } = usePwa();

  const handle = async () => {
    if (permission !== "granted") {
      const result = await enableNotifications();
      if (result === "granted") {
        toast.success("Notificações ativadas! Você será avisado a cada CPA validado e saque pago.");
      } else if (result === "denied") {
        toast.error("Notificações bloqueadas no navegador. Libere nas configurações do site.");
      }
    }

    if (canInstall) {
      const ok = await install();
      if (ok) toast.success("App adicionado à tela inicial!");
      return;
    }

    if (!installed) {
      toast.info(
        "No celular: toque no menu do navegador e escolha “Adicionar à tela de início” para instalar o app.",
      );
    }
  };

  return (
    <Button variant="secondary" className={`gap-2 ${className ?? ""}`} onClick={handle}>
      {installed && permission === "granted" ? (
        <>
          <BellRing className="size-4" /> App ativo
        </>
      ) : (
        <>
          <Smartphone className="size-4" /> Baixar app
        </>
      )}
    </Button>
  );
}
