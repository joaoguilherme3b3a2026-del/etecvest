import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Bot, ListChecks, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EtecVest — Estudos gratuitos para o Vestibulinho da Etec" },
      {
        name: "description",
        content:
          "Plataforma gratuita com plano de estudos diário, simulados antigos da Etec de 2009 a 2026 e IA de apoio para o Vestibulinho do Centro Paula Souza.",
      },
      { property: "og:title", content: "EtecVest — Estudos para o Vestibulinho da Etec" },
      {
        property: "og:description",
        content:
          "Plano de estudos do dia, simulados antigos e IA de apoio para quem vai fazer o Vestibulinho da Etec.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PASSOS = [
  {
    titulo: 'Clique em "Ir para o painel do aluno"',
    texto:
      "Você entra direto no painel, sem cadastro obrigatório nesta fase. O painel nunca abre sozinho: só pelo botão.",
    icone: ArrowRight,
  },
  {
    titulo: "Siga o plano de estudos do dia",
    texto:
      "Um vídeo curto, 12 exercícios, um mini simulado e a revisão dos seus erros recentes, sempre na mesma ordem.",
    icone: ListChecks,
  },
  {
    titulo: "Revise com simulados antigos",
    texto:
      "Filtre as provas do Vestibulinho por ano, de 2009 a 2026, e treine com o formato real do exame.",
    icone: BookOpen,
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-[oklch(0.968_0.008_92_/_0.9)] backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="min-w-0 rounded-2xl">
            <Logo subtitulo="Vestibulinho da Etec" />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <nav aria-label="Navegação principal" className="mr-2 hidden items-center gap-1 lg:flex">
              {[
                { href: "#como-funciona", texto: "Como funciona" },
                { href: "#simulados", texto: "Simulados" },
                { href: "#ia-de-apoio", texto: "IA de apoio" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="btn-base px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  {item.texto}
                </a>
              ))}
            </nav>
            <Link to="/login" className="btn-base btn-ghost text-sm">
              Entrar
            </Link>
            <Link to="/painel" className="btn-base btn-primary hidden text-sm sm:inline-flex">
              Ir para o painel do aluno
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="badge-pill">Gratuito para o aluno</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
            Estude para o Vestibulinho da Etec com plano diário, simulados antigos e IA de apoio
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            O EtecVest organiza a sua preparação para o exame de admissão dos cursos técnicos do
            Centro Paula Souza: o que estudar hoje, quais questões refazer e onde treinar com as
            provas dos anos anteriores.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/painel" className="btn-base btn-primary">
              Ir para o painel do aluno
            </Link>
            <a href="#como-funciona" className="btn-base btn-ghost">
              Ver como funciona
            </a>
          </div>
          <dl className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { valor: "2009–2026", texto: "anos listados pelo CPS" },
              { valor: "4", texto: "áreas de estudo guiado" },
              { valor: "100%", texto: "gratuito para o aluno" },
            ].map((item) => (
              <div key={item.texto} className="card-soft p-5">
                <dt className="sr-only">{item.texto}</dt>
                <dd>
                  <span className="block text-3xl font-bold text-primary">{item.valor}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.texto}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-bold">Como funciona</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Três passos simples para começar hoje mesmo.
          </p>
          <ol className="mt-8 grid gap-4 lg:grid-cols-3">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="card-soft p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 flex items-start gap-2 text-lg font-bold">
                  <passo.icone className="mt-0.5 h-5 w-5 shrink-0 text-magenta" aria-hidden="true" />
                  {passo.titulo}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="simulados" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6">
          <div className="card-soft grid gap-6 p-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div>
              <p className="badge-pill">Simulados</p>
              <h2 className="mt-3 text-3xl font-bold">Provas antigas da Etec, de 2009 a 2026</h2>
              <p className="mt-3 text-muted-foreground">
                Dentro do painel você filtra por ano e treina com a biblioteca de provas do
                Vestibulinho, além do simulado interativo da semana com cronômetro e correção
                imediata.
              </p>
              <a
                className="btn-base btn-ghost mt-5"
                href="https://www.cps.sp.gov.br/etec/vestibulinho/"
                target="_blank"
                rel="noreferrer noopener"
              >
                Fonte oficial do Centro Paula Souza
              </a>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                "Vestibulinho 2026 — 1º semestre",
                "Biblioteca 2025–2022",
                "Biblioteca 2020–2016",
                "Biblioteca 2015–2009",
              ].map((item) => (
                <li key={item} className="rounded-2xl bg-surface-2 p-4 font-semibold">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="ia-de-apoio" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="badge-pill">IA de apoio</p>
              <h2 className="mt-3 text-3xl font-bold">Tire dúvidas e gere exercícios na hora</h2>
              <p className="mt-3 text-muted-foreground">
                Escreva a sua dúvida com as suas palavras e receba a explicação passo a passo, com
                exemplo numérico. A IA também gera listas de exercícios parecidos para você praticar
                o mesmo conteúdo até acertar com segurança.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { icone: Bot, titulo: "Explicação passo a passo" },
                { icone: Sparkles, titulo: "Exercícios semelhantes" },
                { icone: ListChecks, titulo: "Correção dos erros recentes" },
                { icone: BookOpen, titulo: "Resumos por matéria" },
              ].map((item) => (
                <li key={item.titulo} className="card-soft p-5">
                  <item.icone className="h-5 w-5 text-magenta" aria-hidden="true" />
                  <p className="mt-3 font-semibold">{item.titulo}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="card-soft p-8 text-center">
            <h2 className="text-3xl font-bold">Pronto para começar seus estudos?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              O painel do aluno reúne o plano de hoje, as matérias em destaque, os simulados antigos
              e a IA de apoio em uma única tela.
            </p>
            <Link to="/painel" className="btn-base btn-primary mt-6">
              Ir para o painel do aluno
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:px-6">
          <Logo subtitulo="Desde 2026" />
          <p className="text-sm text-muted-foreground">
            EtecVest é uma plataforma de estudos gratuita e independente para candidatos ao
            Vestibulinho da Etec. As provas oficiais são publicadas pelo Centro Paula Souza.
          </p>
        </div>
      </footer>
    </div>
  );
}
