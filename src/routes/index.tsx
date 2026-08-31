import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Network, ShieldCheck } from "lucide-react";
import { Wordmark, WolfMark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import markImg from "@/assets/wolf-mark.png";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wolf in Sheep Affiliates | Painel de acordos CPA" },
      {
        name: "description",
        content:
          "Painel de afiliados para gestão de acordos CPA das casas de aposta: planos, CPAs elegíveis, cliques, registros e rede de sub-afiliados.",
      },
      { property: "og:title", content: "Wolf in Sheep Affiliates | Painel de acordos CPA" },
      {
        property: "og:description",
        content:
          "Gestão de acordos CPA, casas de aposta e rede de afiliados em um único painel.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: BarChart3,
    title: "Acordos e planos de CPA",
    text: "Cada afiliado vê o acordo da casa, o plano de CPA, baseline, CPAs elegíveis, cliques e registros.",
  },
  {
    icon: Network,
    title: "Rede de sub-afiliados",
    text: "Compartilhe seu link, receba cadastros na sua rede e defina o plano de CPA de cada indicado.",
  },
  {
    icon: ShieldCheck,
    title: "Área administradora",
    text: "Cadastros, casas de aposta e lançamento de acordos de CPA sobre cada afiliado.",
  },
];

function Home() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <WolfMark className="h-10" />
          <Wordmark className="h-6 sm:h-8" />
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
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          CPA · Casas de aposta
        </p>

        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] lg:text-6xl">
          O painel onde os acordos de CPA das casas viram números claros.
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground">
          Cadastre-se, acompanhe seus acordos por casa de aposta e construa sua rede de afiliados com
          planos de CPA definidos por você.
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

        <div className="mt-12 grid gap-4 md:grid-cols-3">
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
  );
}
