import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BANCO_QUESTOES, MATERIAS } from "./conteudo";
import { ehOficial, paraQuestao, PREFIXO_OFICIAL } from "./questoes-oficiais.functions";
import {
  aplicarSimulado,
  aplicarTarefa,
  estadoVazio,
  normalizarEstado,
  type EstadoProgresso,
  type ResultadoQuestao,
} from "./progresso-calculos";
import type { Questao } from "./conteudo";

/**
 * Procura uma questão pelo id.
 * Questões autorais ficam no banco local do app; questões oficiais e da IA
 * são buscadas nas tabelas correspondentes quando necessário.
 */
async function acharQuestoes(
  supabase: { from: (t: string) => any },
  ids: string[],
): Promise<Map<string, Questao>> {
  const mapa = new Map<string, Questao>();

  for (const id of ids) {
    const questao = BANCO_QUESTOES.find((item) => item.id === id);

    if (questao) {
      mapa.set(id, questao);
    }
  }

  const oficiais = ids.filter((id) => ehOficial(id) && !mapa.has(id));

  if (oficiais.length) {
    const { data, error } = await supabase
      .from("questoes_vestibulinho")
      .select("id, ano, semestre, numero, materia, enunciado, alternativas, correta")
      .in(
        "id",
        oficiais.map((id) => id.slice(PREFIXO_OFICIAL.length)),
      );

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

    for (const linha of data ?? []) {
      mapa.set(linha.id, {
        id: linha.id,
        vestibulinho: "ia",
        materia: linha.materia,
        enunciado: linha.enunciado,
        alternativas: linha.alternativas,
        correta: linha.correta,
      });
    }
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

const TarefaSchema = z.object({
  id: z.string().min(1),
});

const ErradaSchema = z.object({
  questaoId: z.string().min(1),
  materia: z.string().min(1),
  vestibulinho: z.string().optional().nullable(),
  respondida: z.number().int().optional().nullable(),
  correta: z.number().int().optional().nullable(),
});

/** Lê o progresso atual do aluno. */
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

/** Salva o resultado de um simulado no progresso do aluno. */
export const salvarSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ResultadoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const entrada = data.resultados;

    const questoes = await acharQuestoes(
      context.supabase as never,
      entrada.map((resultado) => resultado.questaoId),
    );

    const resultados: ResultadoQuestao[] = entrada.map((resultado) => {
      const questao = questoes.get(resultado.questaoId);

      if (
        !questao ||
        (resultado.respondida !== null &&
          (resultado.respondida < 0 ||
            resultado.respondida >= questao.alternativas.length))
      ) {
        throw new Error("Questão inválida");
      }

      return {
        ...resultado,
        materia: questao.materia,
        correta: questao.correta,
        acertou: resultado.respondida === questao.correta,
      };
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
      .upsert({
        user_id: context.userId,
        estado: novo as unknown as never,
      });

    if (writeError) throw writeError;

    const erradas = resultados
      .filter((resultado) => !resultado.acertou)
      .map((resultado) => ({
        user_id: context.userId,
        questao_id: resultado.questaoId,
        materia: resultado.materia,
        respondida: resultado.respondida,
        correta: resultado.correta,
        vestibulinho:
          questoes.get(resultado.questaoId)?.vestibulinho ?? "autoral",
      }));

    if (erradas.length) {
      const { error } = await context.supabase
        .from("questoes_erradas")
        .upsert(erradas, { onConflict: "user_id,questao_id" });

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
      .upsert({
        user_id: context.userId,
        estado: novo as unknown as never,
      });

    if (writeError) throw writeError;

    return novo;
  });

/** Zera o progresso e remove as questões erradas do aluno. */
export const resetarProgresso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const vazio = estadoVazio();

    const { error: writeError } = await context.supabase
      .from("progresso_aluno")
      .upsert({
        user_id: context.userId,
        estado: vazio as unknown as never,
      });

    if (writeError) throw writeError;

    const { error } = await context.supabase
      .from("questoes_erradas")
      .delete()
      .eq("user_id", context.userId);

    if (error) throw error;

    return vazio;
  });

/** Preenche o progresso com alguns resultados de teste. */
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
    const resultados = BANCO_QUESTOES.slice(0, 5).map((questao) => ({
      questaoId: questao.id,
      materia: questao.materia,
      respondida: questao.correta,
      correta: questao.correta,
      acertou: true,
    }));

    const novo = aplicarSimulado(atual, resultados);

    const { error: writeError } = await context.supabase
      .from("progresso_aluno")
      .upsert({
        user_id: context.userId,
        estado: novo as unknown as never,
      });

    if (writeError) throw writeError;

    return novo;
  });

/** Registra questões erradas para a área de revisão. */
export const registrarErradas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ questoes: z.array(ErradaSchema) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.questoes.length === 0) {
      return { registradas: 0 };
    }

    const linhas = data.questoes.map((questao) => ({
      user_id: context.userId,
      questao_id: questao.questaoId,
      materia: questao.materia,
      vestibulinho: questao.vestibulinho ?? null,
      respondida: questao.respondida ?? null,
      correta: questao.correta ?? null,
    }));

    const { error } = await context.supabase
      .from("questoes_erradas")
      .upsert(linhas, {
        onConflict: "user_id,questao_id",
        ignoreDuplicates: false,
      });

    if (error) throw error;

    return { registradas: linhas.length };
  });

/** Lista as questões erradas do aluno para revisão. */
export const listarErradas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("questoes_erradas")
      .select(
        "id, questao_id, materia, vestibulinho, respondida, correta, criado_em",
      )
      .eq("user_id", context.userId)
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const linhas = data ?? [];
    const questoes = await acharQuestoes(
      context.supabase as never,
      linhas.map((linha) => linha.questao_id),
    );

    return linhas.map((linha) => ({
      ...linha,
      questao: questoes.get(linha.questao_id) ?? null,
    }));
  });

/** Marca uma questão errada como resolvida. */
export const resolverErrada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      questaoId: z.string().min(1),
      respondida: z.number().int(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const questao = (
      await acharQuestoes(context.supabase as never, [data.questaoId])
    ).get(data.questaoId);

    if (!questao) {
      throw new Error("Questão não encontrada");
    }

    const acertou = questao.correta === data.respondida;

    const query = acertou
      ? context.supabase.from("questoes_erradas").delete()
      : context.supabase
          .from("questoes_erradas")
          .update({ respondida: data.respondida });

    const { error } = await query
      .eq("user_id", context.userId)
      .eq("questao_id", data.questaoId);

    if (error) throw error;

    return { ok: acertou };
  });

export type { EstadoProgresso };
