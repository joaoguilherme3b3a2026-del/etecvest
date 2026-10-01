import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "./Modal";
import { QUESTOES_SIMULADO, type Questao } from "@/lib/conteudo";

import type { ResultadoQuestao } from "@/lib/progresso";
import { Button } from "./Button";
const DURACAO_SEGUNDOS = 15 * 60;

function formatarTempo(segundos: number) {
  const s = Math.max(0, segundos);
  const min = String(Math.floor(s / 60)).padStart(2, "0");
  const seg = String(s % 60).padStart(2, "0");
  return `${min}:${seg}`;
}

export function SimuladoModal({
  open,
  onClose,
  onFinalizar,
  questoes = QUESTOES_SIMULADO,
  titulo = "Simulado da semana — Etec",
}: {
  open: boolean;
  onClose: () => void;
  questoes?: Questao[];
  titulo?: string;
  onFinalizar?: (resultados: ResultadoQuestao[]) => Promise<void>;
}) {
  const QUESTOES = questoes;
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");
  const [etapa, setEtapa] = useState<"intro" | "quiz" | "resultado">("intro");
  const [indice, setIndice] = useState(0);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [respondidas, setRespondidas] = useState(0);
  const [erroValidacao, setErroValidacao] = useState("");
  const [restante, setRestante] = useState(DURACAO_SEGUNDOS);
  const fimRef = useRef<number | null>(null);
  const resultadosRef = useRef<ResultadoQuestao[]>([]);
  const registradoRef = useRef(false);

  const reiniciar = useCallback(() => {
    setEtapa("intro");
    setErroSalvar("");
    setIndice(0);
    setSelecionada(null);
    setAcertos(0);
    setRespondidas(0);
    setErroValidacao("");
    setRestante(DURACAO_SEGUNDOS);
    fimRef.current = null;
    resultadosRef.current = [];
    registradoRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) reiniciar();
  }, [open, reiniciar]);

  // Cronômetro baseado em timestamp: continua correto mesmo com a aba em segundo plano.
  useEffect(() => {
    if (etapa !== "quiz") return;
    if (fimRef.current === null) fimRef.current = Date.now() + DURACAO_SEGUNDOS * 1000;

    const tick = () => {
      const segundos = Math.ceil(((fimRef.current ?? 0) - Date.now()) / 1000);
      setRestante(segundos);
      if (segundos <= 0) setEtapa("resultado");
    };
    tick();
    const id = window.setInterval(tick, 250);
    const onVisibility = () => tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [etapa]);

  // Registra o desempenho no progresso do aluno assim que o simulado termina.
  useEffect(() => {
    if (etapa !== "resultado" || registradoRef.current) return;
    registradoRef.current = true;
    void salvar();
  }, [etapa, onFinalizar]);

  const questao = QUESTOES[indice];
  const ultima = indice === QUESTOES.length - 1;
  const percentual = useMemo(() => Math.round((acertos / QUESTOES.length) * 100), [acertos, QUESTOES.length]);

  async function salvar() {
    setSalvando(true); setErroSalvar("");
    try { await onFinalizar?.(resultadosRef.current); }
    catch { setErroSalvar("Não foi possível salvar. Tente novamente."); }
    finally { setSalvando(false); }
  }

  if (!questao) return null;

  function avancar() {
    if (!questao) return;
    if (selecionada === null) {
      setErroValidacao("Selecione uma alternativa para continuar.");
      return;
    }
    setErroValidacao("");
    const acertou = selecionada === questao.correta;
    resultadosRef.current.push({ questaoId: questao.id, materia: questao.materia, acertou, respondida: selecionada, correta: questao.correta });
    if (acertou) setAcertos((a) => a + 1);
    setRespondidas((r) => r + 1);
    setSelecionada(null);
    if (ultima) setEtapa("resultado");
    else setIndice((i) => i + 1);
  }

  return (
    <Modal open={open} onClose={onClose} titleId="titulo-simulado" title={titulo}>
      {etapa === "intro" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { rotulo: "Questões", valor: `${QUESTOES.length} questões` },
              { rotulo: "Tempo total", valor: "15 minutos" },
              { rotulo: "Formato", valor: "Múltipla escolha" },
            ].map((item) => (
              <div key={item.rotulo} className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {item.rotulo}
                </p>
                <p className="mt-1 font-bold">{item.valor}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            As questões seguem o estilo do Vestibulinho da Etec. O cronômetro começa ao clicar em
            "Iniciar agora" e continua correndo mesmo se você trocar de aba. Ao final você vê o
            número de acertos, de erros e o aproveitamento, e o seu progresso é atualizado no
            painel.
          </p>
          <Button type="button" className="btn-base btn-primary" onClick={() => setEtapa("quiz")}>
            Iniciar agora
          </Button>
        </div>
      )}

      {etapa === "quiz" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-3 text-sm font-semibold">
            <span>
              Questão {indice + 1} de {QUESTOES.length}
            </span>
            <span className="text-muted-foreground">•</span>
            <span>{questao.materia}</span>
            <span className="text-muted-foreground">•</span>
            <span>Respondidas: {respondidas}</span>
            <span className="ml-auto rounded-full bg-card px-3 py-1 tabular-nums" aria-live="polite">
              {formatarTempo(restante)}
            </span>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-lg font-bold">{questao.enunciado}</legend>
            {questao.alternativas.map((alt, i) => (
              <label
                key={`${indice}-${i}`}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm transition-colors ${
                  selecionada === i ? "border-primary bg-accent/60" : "border-border bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name={`questao-${indice}`}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                  checked={selecionada === i}
                  onChange={() => {
                    setSelecionada(i);
                    setErroValidacao("");
                  }}
                />
                <span>{alt}</span>
              </label>
            ))}
          </fieldset>

          {erroValidacao && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {erroValidacao}
            </p>
          )}

          <Button type="button" className="btn-base btn-primary" onClick={avancar}>
            {ultima ? "Finalizar simulado" : "Próxima questão"}
          </Button>
        </div>
      )}

      {etapa === "resultado" && (
        <div className="space-y-5">
          <p className="text-3xl font-bold">
            {acertos} <span className="text-muted-foreground">/ {QUESTOES.length}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { rotulo: "Acertos", valor: String(acertos) },
              { rotulo: "Erros", valor: String(Math.max(0, respondidas - acertos)) },
              { rotulo: "Aproveitamento", valor: `${percentual}%` },
            ].map((item) => (
              <div key={item.rotulo} className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {item.rotulo}
                </p>
                <p className="mt-1 text-xl font-bold">{item.valor}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {salvando ? "Salvando resultado…" : erroSalvar || "Resultado salvo no seu progresso."}
          </p>
          {erroSalvar && <Button onClick={() => void salvar()}>Tentar salvar novamente</Button>}
          {restante <= 0 && (
            <p className="text-sm text-muted-foreground">
              O tempo acabou e o simulado foi finalizado com o seu progresso até aqui.
            </p>
          )}
          <Button type="button" className="btn-base btn-primary" disabled={salvando || !!erroSalvar} onClick={reiniciar}>
            Refazer simulado
          </Button>
        </div>
      )}
    </Modal>
  );
}
