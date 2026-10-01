import { MATERIAS, PROGRESSO_BASE, TAREFAS, type Materia } from "./conteudo";
export const META_SEMANAL = 12;

export type ResultadoQuestao = { questaoId: string; materia: Materia; acertou: boolean; respondida: number | null; correta: number };

export type EstadoProgresso = {
  /** Acertos e respostas acumulados nos simulados. */
  acertos: number;
  respondidas: number;
  /** Questões erradas acumuladas. */
  erradas: number;
  /** Simulados finalizados. */
  simulados: number;
  /** Ganho de progresso por matéria (pontos percentuais somados à base). */
  ganhoPorMateria: Record<string, number>;
  /** IDs de tarefas concluídas (ver TAREFAS em conteudo.ts). */
  tarefasConcluidas: string[];
  /** ISO do último acesso registrado. */
  ultimoAcesso: string | null;
};

export function estadoVazio(): EstadoProgresso {
  return {
    acertos: 0,
    respondidas: 0,
    erradas: 0,
    simulados: 0,
    ganhoPorMateria: {},
    tarefasConcluidas: [],
    ultimoAcesso: null,
  };
}

/** Mescla um estado vindo do banco com os defaults, garantindo todos os campos. */
export function normalizarEstado(raw: unknown): EstadoProgresso {
  const base = estadoVazio();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<EstadoProgresso>;
  return {
    ...base,
    ...r,
    ganhoPorMateria: { ...(r.ganhoPorMateria ?? {}) },
    tarefasConcluidas: Array.isArray(r.tarefasConcluidas) ? [...r.tarefasConcluidas] : [],
    ultimoAcesso: r.ultimoAcesso ?? null,
  };
}

/** Calcula o novo estado após um simulado finalizado. */
export function aplicarSimulado(
  atual: EstadoProgresso,
  resultados: ResultadoQuestao[],
): EstadoProgresso {
  const ganho = { ...atual.ganhoPorMateria };
  let acertos = 0;
  for (const r of resultados) {
    if (r.acertou) {
      acertos += 1;
      ganho[r.materia] = (ganho[r.materia] ?? 0) + 3;
    }
  }
  return {
    ...atual,
    acertos: atual.acertos + acertos,
    respondidas: atual.respondidas + resultados.length,
    erradas: atual.erradas + (resultados.length - acertos),
    simulados: atual.simulados + 1,
    ganhoPorMateria: ganho,
    ultimoAcesso: new Date().toISOString(),
  };
}

/** Marca ou desmarca uma tarefa como concluída e ajusta o ganho da matéria. */
export function aplicarTarefa(atual: EstadoProgresso, id: string): EstadoProgresso {
  const tarefa = TAREFAS.find((t) => t.id === id);
  if (!tarefa) return atual;
  const concluida = atual.tarefasConcluidas.includes(id);
  const ganho = { ...atual.ganhoPorMateria };
  ganho[tarefa.materia] = Math.max(0, (ganho[tarefa.materia] ?? 0) + (concluida ? -5 : 5));
  return {
    ...atual,
    ganhoPorMateria: ganho,
    tarefasConcluidas: concluida
      ? atual.tarefasConcluidas.filter((t) => t !== id)
      : [...atual.tarefasConcluidas, id],
    ultimoAcesso: new Date().toISOString(),
  };
}

export function progressoMateria(estado: EstadoProgresso, materia: Materia) {
  return Math.min(100, PROGRESSO_BASE[materia] + (estado.ganhoPorMateria[materia] ?? 0));
}

export function aproveitamento(estado: EstadoProgresso) {
  if (estado.respondidas === 0) return null;
  return Math.round((estado.acertos / estado.respondidas) * 100);
}

export function testesConcluidos(estado: EstadoProgresso) {
  return estado.simulados + estado.tarefasConcluidas.length;
}

export function cronogramaConcluido(estado: EstadoProgresso) {
  return Math.min(100, Math.round((testesConcluidos(estado) / META_SEMANAL) * 100));
}

export function mediaGeral(estado: EstadoProgresso) {
  const soma = MATERIAS.reduce((acc, m) => acc + progressoMateria(estado, m), 0);
  return Math.round(soma / MATERIAS.length);
}

export function formatarUltimoAcesso(iso: string | null) {
  if (!iso) return "Ainda não registrado";
  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia) return `Hoje • ${hora}`;
  return `${data.toLocaleDateString("pt-BR")} • ${hora}`;
}

