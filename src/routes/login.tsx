import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar no EtecVest — Acesso do aluno" },
      {
        name: "description",
        content:
          "Acesse o painel do aluno EtecVest com seu e-mail e senha ou com a conta Google para seguir o plano de estudos do Vestibulinho da Etec.",
      },
      { property: "og:title", content: "Entrar no EtecVest" },
      {
        property: "og:description",
        content: "Acesse o painel do aluno EtecVest e continue seus estudos para o Vestibulinho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Erros = {
  nome?: string;
  email?: string;
  senha?: string;
  confirmacao?: string;
};

const campoClasse =
  "mt-1.5 min-h-11 w-full rounded-2xl border border-input bg-surface px-4 text-sm placeholder:text-muted-foreground";

function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos. Tente novamente.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Faça login ou use outro e-mail.";
  if (m.includes("pwned") || m.includes("known to be weak") || m.includes("compromised"))
    return "Essa senha é muito comum e já vazou na internet. Escolha uma senha mais difícil.";
  if (m.includes("password should be")) return "A senha não atende aos requisitos de segurança.";
  if (m.includes("rate limit")) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  return "Não foi possível agora. Verifique seus dados e tente novamente.";
}

function LoginPage() {
  const navigate = useNavigate();
  const [aba, setAba] = useState<"entrar" | "cadastro">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const [googleCarregando, setGoogleCarregando] = useState(false);

  const cadastro = aba === "cadastro";

  // Se já houver sessão (ex.: retorno do Google), vá direto ao painel.
  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo && data.session) navigate({ to: "/painel" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
        navigate({ to: "/painel" });
      }
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  function trocarAba(proxima: "entrar" | "cadastro") {
    setAba(proxima);
    setErros({});
    setErroGeral("");
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const novos: Erros = {};

    if (cadastro) {
      if (!nome.trim()) novos.nome = "Informe o seu nome completo.";
      else if (nome.trim().length < 3) novos.nome = "O nome precisa ter pelo menos 3 caracteres.";
      else if (nome.trim().length > 80) novos.nome = "O nome pode ter no máximo 80 caracteres.";
    }

    if (!email.trim()) novos.email = "Informe o seu e-mail.";
    else if (!EMAIL_REGEX.test(email.trim()))
      novos.email = "Digite um e-mail válido, por exemplo: aluno@email.com";

    if (!senha) novos.senha = "Informe a sua senha.";
    else if (senha.length < 4) novos.senha = "A senha precisa ter pelo menos 4 caracteres.";

    if (cadastro) {
      if (!confirmacao) novos.confirmacao = "Confirme a sua senha.";
      else if (confirmacao !== senha) novos.confirmacao = "As duas senhas precisam ser iguais.";
    }

    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    setErroGeral("");
    const emailFinal = email.trim().toLowerCase();

    try {
      if (cadastro) {
        const { data, error } = await supabase.auth.signUp({
          email: emailFinal,
          password: senha,
          options: { data: { nome: nome.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/painel" });
          return;
        }
        setErroGeral("Confira seu e-mail para confirmar a conta antes de entrar.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailFinal,
          password: senha,
        });
        if (error) throw error;
        if (data.user) {
          navigate({ to: "/painel" });
          return;
        }
        setErroGeral("Não foi possível entrar. Tente novamente.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErroGeral(traduzirErro(msg));
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComGoogle() {
    setErroGeral("");
    setGoogleCarregando(true);
    const resultado = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/login`,
    });
    if (resultado.error) {
      setGoogleCarregando(false);
      setErroGeral("Não foi possível entrar com o Google agora. Tente novamente.");
      return;
    }
    if (resultado.redirected) return; // o navegador vai redirecionar para o Google
    setGoogleCarregando(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-block rounded-2xl">
          <Logo subtitulo="Vestibulinho da Etec" />
        </Link>

        <div className="card-soft mt-6 p-6 sm:p-8">
          <div
            role="tablist"
            aria-label="Escolha entre entrar ou criar conta"
            className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1"
          >
            {(
              [
                { id: "entrar", texto: "Entrar" },
                { id: "cadastro", texto: "Criar conta" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={aba === item.id}
                onClick={() => trocarAba(item.id)}
                className={`min-h-11 rounded-full text-sm font-semibold transition-all duration-200 ${
                  aba === item.id
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.texto}
              </button>
            ))}
          </div>

          <h1 className="mt-6 text-2xl font-bold">
            {cadastro ? "Criar conta no EtecVest" : "Entrar no EtecVest"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {cadastro
              ? "Preencha seus dados para começar a estudar para o Vestibulinho da Etec."
              : "Use o seu e-mail e uma senha de pelo menos 4 caracteres para acessar o painel do aluno."}
          </p>

          <button
            type="button"
            className="btn-base btn-ghost mt-5 w-full"
            onClick={entrarComGoogle}
            disabled={googleCarregando || enviando}
          >
            {googleCarregando ? "Conectando..." : "Continuar com Google"}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou use seu e-mail
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={enviar} noValidate>
            {cadastro && (
              <div>
                <label htmlFor="nome" className="block text-sm font-semibold">
                  Nome completo
                </label>
                <input
                  id="nome"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  aria-invalid={Boolean(erros.nome)}
                  aria-describedby={erros.nome ? "erro-nome" : undefined}
                  placeholder="Ex.: Ana Souza Lima"
                  className={campoClasse}
                />
                {erros.nome && (
                  <p id="erro-nome" role="alert" className="mt-1.5 text-sm text-destructive">
                    {erros.nome}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(erros.email)}
                aria-describedby={erros.email ? "erro-email" : undefined}
                placeholder="aluno@email.com"
                className={campoClasse}
              />
              {erros.email && (
                <p id="erro-email" role="alert" className="mt-1.5 text-sm text-destructive">
                  {erros.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-semibold">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                autoComplete={cadastro ? "new-password" : "current-password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                aria-invalid={Boolean(erros.senha)}
                aria-describedby={erros.senha ? "erro-senha" : undefined}
                placeholder="Mínimo de 4 caracteres"
                className={campoClasse}
              />
              {erros.senha && (
                <p id="erro-senha" role="alert" className="mt-1.5 text-sm text-destructive">
                  {erros.senha}
                </p>
              )}
            </div>

            {cadastro && (
              <div>
                <label htmlFor="confirmacao" className="block text-sm font-semibold">
                  Confirmar senha
                </label>
                <input
                  id="confirmacao"
                  type="password"
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  aria-invalid={Boolean(erros.confirmacao)}
                  aria-describedby={erros.confirmacao ? "erro-confirmacao" : undefined}
                  placeholder="Repita a senha"
                  className={campoClasse}
                />
                {erros.confirmacao && (
                  <p id="erro-confirmacao" role="alert" className="mt-1.5 text-sm text-destructive">
                    {erros.confirmacao}
                  </p>
                )}
              </div>
            )}

            {erroGeral && (
              <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                {erroGeral}
              </p>
            )}

            <button type="submit" className="btn-base btn-primary w-full" disabled={enviando}>
              {enviando
                ? cadastro
                  ? "Criando conta..."
                  : "Entrando..."
                : cadastro
                  ? "Criar conta e entrar"
                  : "Entrar"}
            </button>
            <button
              type="button"
              className="btn-base btn-ghost w-full"
              onClick={() => trocarAba(cadastro ? "entrar" : "cadastro")}
            >
              {cadastro ? "Já tenho conta" : "Cadastrar-se"}
            </button>
          </form>
        </div>

        <Link to="/" className="btn-base btn-ghost mt-5 w-full">
          Voltar para a tela inicial
        </Link>
      </div>
    </main>
  );
}
