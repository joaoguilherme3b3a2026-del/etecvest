import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ResultadoQuestao } from "./progresso-calculos";
export * from "./progresso-calculos";
import {
  alternarTarefa as alternarTarefaFn,
  obterProgresso as obterProgressoFn,
  resetarProgresso as resetarProgressoFn,
  salvarSimulado as salvarSimuladoFn,
  simularResolucao as simularResolucaoFn,
} from "./progresso.functions";

/**
 * Lê o progresso do aluno do banco (server fn protegida).
 * Enquanto carrega, retorna undefined — use `estadoVazio()` como fallback de UI.
 */
export function useProgresso() {
  const buscar = useServerFn(obterProgressoFn);
  return useQuery({
    queryKey: ["etecvest", "progresso"],
    queryFn: () => buscar(),
  });
}

/** Ações que mutam o progresso e invalidam o cache local automaticamente. */
export function useProgressoAcoes() {
  const qc = useQueryClient();
  const salvar = useServerFn(salvarSimuladoFn);
  const alternar = useServerFn(alternarTarefaFn);
  const resetar = useServerFn(resetarProgressoFn);
  const simular = useServerFn(simularResolucaoFn);

  function invalidar() {
    return qc.invalidateQueries({ queryKey: ["etecvest", "progresso"] });
  }

  return {
    salvarSimulado: async (resultados: ResultadoQuestao[]) => {
      await salvar({ data: { resultados } });
      await invalidar();
    },
    alternarTarefa: async (id: string) => {
      await alternar({ data: { id } });
      await invalidar();
    },
    resetarProgresso: async () => {
      await resetar();
      await invalidar();
    },
    simularResolucao: async () => {
      await simular();
      await invalidar();
    },
  };
}
