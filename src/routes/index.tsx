import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gift, TrendingUp, Wallet, Zap } from "lucide-react";
import { HouseMarquee } from "@/components/HouseMarquee";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import markImg from "@/assets/wolf-mark.png";
import lockupImg from "@/assets/wolf-lockup.png";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wolf in Sheep Affiliates | Indicações CPA iGaming" },
      {
        name: "description",
        content:
          "Ganhe com indicações CPA no iGaming. Acesso aos melhores acordos, pagamentos rápidos via Pix e mais de R$ 15 milhões já pagos aos afiliados.",
      },
      { property: "og:title", content: "Wolf in Sheep Affiliates | Indicações CPA iGaming" },
      {
        property: "og:description",
        content:
          "Os melhores acordos CPA de iGaming. Pagamentos rápidos, transparentes e mais de R$ 15 milhões já liberados para afiliados.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: TrendingUp,
    title: "Indicações CPA iGaming",
    text: "Indique jogadores e afiliados para as principais casas de aposta do mercado e monetize cada conversão com acordos CPA claros.",
  },
  {
    icon: Gift,
    title: "Os melhores acordos do mercado",
    text: "Negociamos condições exclusivas para você ter as maiores comissões, os melhores baselines e vantagens reais sobre a concorrência.",
  },
  {
    icon: Wallet,
    title: "+ de R$ 15 milhões em pagamentos",
    text: "Já pagamos mais de 15 milhões em comissões para nossa rede de afiliados. Transparência total em cada lançamento e saque.",
  },
  {
    icon: Zap,
    title: "Pagamentos rápidos via Pix",
    text: "Saque seu saldo disponível quando quiser. Processamos os pagamentos via Pix com aprovação administrativa ágil e segura.",
  },
];

function Home() {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <header className="flex items-center justify-between px-6 py-5 lg:px-12">
          <div className="flex items-center gap-3">
            <Wordmark className="h-8 sm:h-10" />
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        </header>

        <section className="relative mx-auto max-w-5xl overflow-hidden px-6 pb-16 pt-14 lg:pt-24">
          <img
            src={markImg}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-10 top-0 h-64 w-auto opacity-20 blur-[1px] lg:h-96"
          />
          <img
            src={lockupImg}
            alt="Wolf in Sheep Affiliates"
            className="mb-8 h-24 w-auto drop-shadow-[0_0_28px_oklch(0.58_0.24_300/0.45)] lg:h-32"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            CPA · Casas de aposta
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] lg:text-6xl">
            Ganhe dinheiro indicando no iGaming com os melhores acordos CPA.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground">
            Junte-se à rede que já pagou mais de R$ 15 milhões em comissões. Indique jogadores,
            construa sua rede de afiliados e receba via Pix de forma rápida e transparente.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/auth">
                Criar minha conta <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-14">
            <HouseMarquee />
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="glow-panel rounded-2xl border border-border/60 p-6">
                <f.icon className="size-5 text-primary" />
                <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border px-6 py-8 lg:px-12">
          <Wordmark className="h-5 opacity-70" />
        </footer>
      </div>
    </div>
  );
}
