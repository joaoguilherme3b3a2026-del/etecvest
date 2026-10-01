import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { QUESTOES_SIMULADO, type Questao } from "@/lib/conteudo";
import type { ResultadoQuestao } from "@/lib/progresso";
import { Button } from "./Button";

const DURACAO_SEGUNDOS = 15 * 60;

function formatarTempo(segundos: number) {
  const tempo = Math.max(0, segundos);
  const minutos = String(Math.floor(tempo / 60)).padStart(2, "0");
  const segundosRestantes = String(tempo % 60).padStart(2, "0");

  return minutos + ":" + segundosRestantes;
}

type SimuladoModalProps = {
  open: boolean;
  onClose: () => void;
  questoes?: Questao[];
  titulo?: string;
  onFinalizar?: (resultados: ResultadoQuestao[]) => Promise<void>;
};

export function SimuladoModal({
  open,
  onClose,
  questoes = QUESTOES_SIMULADO,
  titulo = "Simulado da semana — Etec",
  onFinalizar,
}: SimuladoModalProps) {
  const [etapa, setEtapa] = useState<"intro" | "quiz" | "resultado">("intro");
  const [indice, setIndice] = useState(0);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [respondidas, setRespondidas] = useState(0);
  const [restante, setRestante] = useState(DURACAO_SEGUNDOS);
  const [erroValidacao, setErroValidacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  const resultadosRef = useRef<ResultadoQuestao[]>([]);
  const finalizadoRef = useRef(false);
  const fimRef = useRef<number | null>(null);

  function reiniciar() {
    setEtapa("intro");
    setIndice(0);
    setSelecionada(null);
    setAcertos(0);
    setRespondidas(0);
    setRestante(DURACAO_SEGUNDOS);
    setErroValidacao("");
    setSalvando(false);
    setErroSalvar("");

    resultadosRef.current = [];
    finalizadoRef.current = false;
    fimRef.current = null;
  }

  useEffect(() => {
    if (!open) {
      reiniciar();
    }
  }, [open]);

  useEffect(() => {
    if (etapa !== "quiz") {
      return;
    }

    if (fimRef.current === null) {
      fimRef.current = Date.now() + DURACAO_SEGUNDOS * 1000;
    }

    function atualizarTempo() {
      const fim = fimRef.current ?? Date.now();
      const segundos = Math.ceil((fim - Date.now()) / 1000);

      setRestante(segundos);

      if (segundos <= 0) {
        setEtapa("resultado");
      }
    }

    atualizarTempo();

    const intervalo = window.setInterval(atualizarTempo, 250);
    document.addEventListener("visibilitychange", atualizarTempo);

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", atualizarTempo);
    };
  }, [etapa]);

  useEffect(() => {
    if (etapa !== "resultado" || finalizadoRef.current) {
      return;
    }

    finalizadoRef.current = true;
    void salvarResultado();
  }, [etapa]);

  async function salvarResultado() {
    if (!onFinalizar) {
      return;
    }

    setSalvando(true);
    setErroSalvar("");

    try {
      await onFinalizar(resultadosRef.current);
    } catch {
      setErroSalvar("Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function avancar() {
    const questao = questoes[indice];

    if (!questao) {
      return;
    }

    if (selecionada === null) {
      setErroValidacao("Selecione uma alternativa para continuar.");
      return;
    }

    const acertou = selecionada === questao.correta;

    resultadosRef.current.push({
      questaoId: questao.id,
      materia: questao.materia,
      acertou,
      respondida: selecionada,
      correta: questao.correta,
    });

    if (acertou) {
      setAcertos((valor) => valor + 1);
    }

    setRespondidas((valor) => valor + 1);
    setSelecionada(null);
    setErroValidacao("");

    if (indice === questoes.length - 1) {
      setEtapa("resultado");
      return;
    }

    setIndice((valor) => valor + 1);
  }

  const questao = questoes[indice];

  if (!questao) {
    return null;
  }

  const percentual =
    questoes.length > 0 ? Math.round((acertos / questoes.length) * 100) : 0;

  return (
    <Modal open={open} onClose={onClose} titleId="titulo-simulado" title={titulo}>
      {etapa === "intro" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Questões
              </p>
              <p className="mt-1 font-bold">{questoes.length} questões</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Tempo total
              </p>
              <p className="mt-1 font-bold">15 minutos</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Formato
              </p>
              <p className="mt-1 font-bold">Múltipla escolha</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            As questões seguem o estilo do Vestibulinho da Etec. O cronômetro
            começa ao clicar em "Iniciar agora" e continua correndo mesmo se
            você trocar de aba. Ao final, o resultado é mostrado e o progresso
            pode ser atualizado no painel.
          </p>

          <Button onClick={() => setEtapa("quiz")}>Iniciar agora</Button>
        </div>
      )}

      {etapa === "quiz" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-3 text-sm font-semibold">
            <span>
              Questão {indice + 1} de {questoes.length}
            </span>
            <span className="text-muted-foreground">•</span>
            <span>{questao.materia}</span>
            <span className="text-muted-foreground">•</span>
            <span>Respondidas: {respondidas}</span>
            <span
              className="ml-auto rounded-full bg-card px-3 py-1 tabular-nums"
              aria-live="polite"
            >
              {formatarTempo(restante)}
            </span>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-lg font-bold">{questao.enunciado}</legend>

            {questao.alternativas.map((alternativa, i) => (
              <label
                key={questao.id + "-" + i}
                className={
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm transition-colors " +
                  (selecionada === i
                    ? "border-primary bg-accent/60"
                    : "border-border bg-surface")
                }
              >
                <input
                  type="radio"
                  name={"questao-" + questao.id}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                  checked={selecionada === i}
                  onChange={() => {
                    setSelecionada(i);
                    setErroValidacao("");
                  }}
                />
                <span>{alternativa}</span>
              </label>
            ))}
          </fieldset>

          {erroValidacao && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {erroValidacao}
            </p>
          )}

          <Button onClick={avancar}>
            {indice === questoes.length - 1
              ? "Finalizar simulado"
              : "Próxima questão"}
          </Button>
        </div>
      )}

      {etapa === "resultado" && (
        <div className="space-y-5">
          <p className="text-3xl font-bold">
            {acertos}{" "}
            <span className="text-muted-foreground">/ {questoes.length}</span>
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Acertos
              </p>
              <p className="mt-1 text-xl font-bold">{acertos}</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Erros
              </p>
              <p className="mt-1 text-xl font-bold">
                {Math.max(0, respondidas - acertos)}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Aproveitamento
              </p>
              <p className="mt-1 text-xl font-bold">{percentual}%</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {salvando
              ? "Salvando resultado…"
              : erroSalvar || "Resultado salvo no seu progresso."}
          </p>

          {erroSalvar && (
            <Button onClick={() => void salvarResultado()}>
              Tentar salvar novamente
            </Button>
          )}

          {restante <= 0 && (
            <p className="text-sm text-muted-foreground">
              O tempo acabou e o simulado foi finalizado com o seu progresso
              até aqui.
            </p>
          )}

          <Button disabled={salvando || !!erroSalvar} onClick={reiniciar}>
            Refazer simulado
          </Button>
        </div>
      )}
    </Modal>
  );
}
