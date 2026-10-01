import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aplicarSimulado,
  aplicarTarefa,
  estadoVazio,
  normalizarEstado,
  type EstadoProgresso,
  type ResultadoQuestao,
} from "./progresso-calculos";

import { BANCO_QUESTOES, MATERIAS } from "./conteudo";
import { ehOficial, paraQuestao, PREFIXO_OFICIAL } from "./questoes-oficiais.functions";
import type { Questao } from "./conteudo";

/**
 * Resolve uma questão pelo id: questões autorais vêm de BANCO_QUESTOES e as
 * oficiais (id com prefixo "of-") da tabela `questoes_vestibulinho`.
 */
async function acharQuestoes(
  supabase: { from: (t: string) => any },
  ids: string[],
): Promise<Map<string, Questao>> {
  const mapa = new Map<string, Questao>();
  for (const id of ids) {
    const q = BANCO_QUESTOES.find((q) => q.id === id);
    if (q) mapa.set(id, q);
  }
  const oficiais = ids.filter((id) => ehOficial(id) && !mapa.has(id));
  if (oficiais.length) {
    const { data, error } = await supabase
      .from("questoes_vestibulinho")
      .select("id, ano, semestre, numero, materia, enunciado, alternativas, correta")
      .in("id", oficiais.map((id) => id.slice(PREFIXO_OFICIAL.length)));
    if (error) throw error;
    for (const linha of data ?? []) {
      const questao = paraQuestao(linha);
      mapa.set(questao.id, questao);
    }
  }
  const daIa = ids.filter((id) => id.startsWith("ia-") && !mapa.has(id));
  if (daIa.length) {
    const { data, error } = await supabase
      .from("questoes_ia")
      .select("id, materia, enunciado, alternativas, correta")
      .in("id", daIa);
    if (error) throw error;
    for (const l of data ?? []) mapa.set(l.id, { id: l.id, vestibulinho: "ia", materia: l.materia, enunciado: l.enunciado, alternativas: l.alternativas, correta: l.correta });
  }
  return mapa;
}

const ResultadoSchema = z.object({
  resultados: z.array(
    z.object({
      questaoId: z.string(),
      respondida: z.number().int().nullable(),
    }),
  ),
});

const TarefaSchema = z.object({ id: z.string().min(1) });

const ErradaSchema = z.object({
  questaoId: z.string().min(1),
  materia: z.string().min(1),
  vestibulinho: z.string().optional().nullable(),
  respondida: z.number().int().optional().nullable(),
  correta: z.number().int().optional().nullable(),
});

/** Lê o estado de progresso do aluno (cria um vazio em memória se ainda não existir). */
export const obterProgresso = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("progresso_aluno")
      .select("estado")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw error;
    return normalizarEstado(data?.estado);
  });

/** Soma o resultado de um simulado finalizado ao progresso do aluno. */
export const salvarSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ResultadoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const entrada = data.resultados;
    const questoes = await acharQuestoes(context.supabase as never, entrada.map(r => r.questaoId));
    const resultados: ResultadoQuestao[] = entrada.map(r => {
      const q = questoes.get(r.questaoId);
      if (!q || (r.respondida !== null && (r.respondida < 0 || r.respondida >= q.alternativas.length))) throw new Error("Questão inválida");
      return { ...r, materia: q.materia, correta: q.correta, acertou: r.respondida === q.correta };
    });
    const { data: row, error: readError } = await context.supabase
      .from("progresso_aluno")
      .select("estado")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (readError) throw readError;
    const atual = normalizarEstado(row?.estado);
    const novo = aplicarSimulado(atual, resultados);

    const { error: writeError } = await context.supabase
      .from("progresso_aluno")
      .upsert({ user_id: context.userId, estado: novo as unknown as never });
    if (writeError) throw writeError;

    const erradas = resultados.filter(r => !r.acertou).map(r => ({user_id: context.userId, questao_id: r.questaoId, materia: r.materia, respondida: r.respondida, correta: r.correta, vestibulinho: questoes.get(r.questaoId)?.vestibulinho ?? "autoral"}));
    if (erradas.length) {
      const {error} = await context.supabase.from("questoes_erradas").upsert(erradas, {onConflict: "user_id,questao_id"});
      if (error) throw error;
    }
    return novo;
  });

/** Marca ou desmarca uma tarefa como concluída. */
export const alternarTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => TarefaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("progresso_aluno")
      .select("estado")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (readError) throw readError;
    const atual = normalizarEstado(row?.estado);
    const novo = aplicarTarefa(atual, data.id);

    const { error: writeError } = await context.supabase
      .from("progresso_aluno")
      .upsert({ user_id: context.userId, estado: novo as unknown as never });
    if (writeError) throw writeError;

    return novo;
  });

/** Zera o progresso do aluno e remove as questões erradas registradas. */
export const resetarProgresso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const vazio = estadoVazio();
    const { error: writeError } = await context.supabase
      .from("progresso_aluno")
      .upsert({ user_id: context.userId, estado: vazio as unknown as never });
    if (writeError) throw writeError;
    await context.supabase
      .from("questoes_erradas")
      .delete()
      .eq("user_id", context.userId);
    return vazio;
  });

/** Preenche o progresso com um resultado de exemplo, útil para testar a interface. */
export const simularResolucao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("progresso_aluno")
      .select("estado")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (readError) throw readError;
    const atual = normalizarEstado(row?.estado);
    const novo = aplicarSimulado(atual, BANCO_QUESTOES.slice(0, 5).map(q => ({questaoId: q.id, materia: q.materia, respondida: q.correta, correta: q.correta, acertou: true})));

    const { error: writeError } = await context.supabase
      .from("progresso_aluno")
      .upsert({ user_id: context.userId, estado: novo as unknown as never });
    if (writeError) throw writeError;

    return novo;
  });

/** Registra questões erradas para a área de revisão (uma por questão/usuário). */
export const registrarErradas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ questoes: z.array(ErradaSchema) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.questoes.length === 0) return { registradas: 0 };

    const linhas = data.questoes.map((q) => ({
      user_id: context.userId,
      questao_id: q.questaoId,
      materia: q.materia,
      vestibulinho: q.vestibulinho ?? null,
      respondida: q.respondida ?? null,
      correta: q.correta ?? null,
    }));

    const { error } = await context.supabase
      .from("questoes_erradas")
      .upsert(linhas, { onConflict: "user_id,questao_id", ignoreDuplicates: false });

    if (error) throw error;
    return { registradas: linhas.length };
  });

/** Lista as questões erradas do aluno para revisão. */
export const listarErradas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("questoes_erradas")
      .select("id, questao_id, materia, vestibulinho, respondida, correta, criado_em")
      .eq("user_id", context.userId)
      .order("criado_em", { ascending: false });

    if (error) throw error;
    const linhas = data ?? [];
    // Anexa enunciado e alternativas para que a revisão funcione também com as
    // questões oficiais, que não estão no banco de questões autorais do app.
    const questoes = await acharQuestoes(context.supabase as never, linhas.map(l => l.questao_id));
    return linhas.map(l => ({ ...l, questao: questoes.get(l.questao_id) ?? null }));
  });

/** Marca uma questão errada como resolvida (remove da lista de revisão). */
export const resolverErrada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ questaoId: z.string().min(1), respondida: z.number().int() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const q = (await acharQuestoes(context.supabase as never, [data.questaoId])).get(data.questaoId);
    if (!q) throw new Error("Questão não encontrada");
    const acertou = q.correta === data.respondida;
    const query = acertou ? context.supabase.from("questoes_erradas").delete() : context.supabase.from("questoes_erradas").update({respondida: data.respondida});
    const {error} = await query.eq("user_id", context.userId).eq("questao_id", data.questaoId);
    if (error) throw error;
    return { ok: acertou };
  });

export type { EstadoProgresso };
