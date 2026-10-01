import { MATERIAS, PROGRESSO_BASE, TAREFAS, type Materia } from "./conteudo";

export const META_SEMANAL = 12;

export type ResultadoQuestao = {
  questaoId: string;
  materia: Materia;
  acertou: boolean;
  respondida: number | null;
  correta: number;
};

export type EstadoProgresso = {
  acertos: number;
  respondidas: number;
  erradas: number;
  simulados: number;
  ganhoPorMateria: Record<string, number>;
  tarefasConcluidas: string[];
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

export function normalizarEstado(raw: unknown): EstadoProgresso {
  const base = estadoVazio();

  if (!raw || typeof raw !== "object") {
    return base;
  }

  const dados = raw as Partial<EstadoProgresso>;

  return {
    ...base,
    ...dados,
    ganhoPorMateria: { ...(dados.ganhoPorMateria ?? {}) },
    tarefasConcluidas: Array.isArray(dados.tarefasConcluidas)
      ? [...dados.tarefasConcluidas]
      : [],
    ultimoAcesso: dados.ultimoAcesso ?? null,
  };
}

export function aplicarSimulado(
  atual: EstadoProgresso,
  resultados: ResultadoQuestao[],
): EstadoProgresso {
  const ganhoPorMateria = { ...atual.ganhoPorMateria };
  let acertos = 0;

  for (const resultado of resultados) {
    if (!resultado.acertou) {
      continue;
    }

    acertos++;
    ganhoPorMateria[resultado.materia] =
      (ganhoPorMateria[resultado.materia] ?? 0) + 3;
  }

  return {
    ...atual,
    acertos: atual.acertos + acertos,
    respondidas: atual.respondidas + resultados.length,
    erradas: atual.erradas + resultados.length - acertos,
    simulados: atual.simulados + 1,
    ganhoPorMateria,
    ultimoAcesso: new Date().toISOString(),
  };
}

export function aplicarTarefa(
  atual: EstadoProgresso,
  id: string,
): EstadoProgresso {
  const tarefa = TAREFAS.find((item) => item.id === id);

  if (!tarefa) {
    return atual;
  }

  const jaConcluida = atual.tarefasConcluidas.includes(id);
  const ganhoPorMateria = { ...atual.ganhoPorMateria };
  const ganhoAtual = ganhoPorMateria[tarefa.materia] ?? 0;

  ganhoPorMateria[tarefa.materia] = Math.max(
    0,
    ganhoAtual + (jaConcluida ? -5 : 5),
  );

  const tarefasConcluidas = jaConcluida
    ? atual.tarefasConcluidas.filter((item) => item !== id)
    : [...atual.tarefasConcluidas, id];

  return {
    ...atual,
    ganhoPorMateria,
    tarefasConcluidas,
    ultimoAcesso: new Date().toISOString(),
  };
}

export function progressoMateria(
  estado: EstadoProgresso,
  materia: Materia,
) {
  const base = PROGRESSO_BASE[materia];
  const ganho = estado.ganhoPorMateria[materia] ?? 0;

  return Math.min(100, base + ganho);
}

export function aproveitamento(estado: EstadoProgresso) {
  if (estado.respondidas === 0) {
    return null;
  }

  return Math.round((estado.acertos / estado.respondidas) * 100);
}

export function testesConcluidos(estado: EstadoProgresso) {
  return estado.simulados + estado.tarefasConcluidas.length;
}

export function cronogramaConcluido(estado: EstadoProgresso) {
  const concluido = testesConcluidos(estado);

  return Math.min(100, Math.round((concluido / META_SEMANAL) * 100));
}

export function mediaGeral(estado: EstadoProgresso) {
  const soma = MATERIAS.reduce(
    (total, materia) => total + progressoMateria(estado, materia),
    0,
  );

  return Math.round(soma / MATERIAS.length);
}

export function formatarUltimoAcesso(iso: string | null) {
  if (!iso) {
    return "Ainda não registrado";
  }

  const data = new Date(iso);
  const hoje = new Date();
  const hora = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (data.toDateString() === hoje.toDateString()) {
    return "Hoje • " + hora;
  }

  return data.toLocaleDateString("pt-BR") + " • " + hora;
}
