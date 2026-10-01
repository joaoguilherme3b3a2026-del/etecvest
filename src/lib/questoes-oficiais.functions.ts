/**
 * Acesso às questões oficiais dos Vestibulinhos da Etec (2009 até hoje).
 *
 * As questões ficam na tabela `questoes_vestibulinho`, preenchida pelos scripts
 * em `scripts/ingestao/` a partir dos PDFs publicados pelo Centro Paula Souza.
 * Só entram nos simulados as questões marcadas como `autonoma`, ou seja, as que
 * fazem sentido sem o texto/imagem impresso na prova.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MATERIAS, type Materia, type Questao } from "./conteudo";

/** Prefixo usado nos ids de questões oficiais (diferencia das autorais). */
export const PREFIXO_OFICIAL = "of-";

export const ehOficial = (id: string) => id.startsWith(PREFIXO_OFICIAL);

export function materiaValida(valor: string): Materia {
  return (MATERIAS as readonly string[]).includes(valor) ? (valor as Materia) : "Português";
}

type Linha = {
  id: string;
  ano: number;
  semestre: number;
  numero: number;
  materia: string;
  enunciado: string;
  alternativas: unknown;
  correta: number;
};

export function paraQuestao(linha: Linha): Questao {
  return {
    id: PREFIXO_OFICIAL + linha.id,
    vestibulinho: `${linha.ano}-${linha.semestre}`,
    enunciado: linha.enunciado,
    alternativas: Array.isArray(linha.alternativas) ? (linha.alternativas as string[]) : [],
    correta: linha.correta,
    materia: materiaValida(linha.materia),
  };
}

function embaralhar<T>(lista: T[]): T[] {
  const resultado = [...lista];

  for (let i = resultado.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }

  return resultado;
}

const FiltroSchema = z.object({
  materia: z.string().optional(),
  ano: z.number().int().optional(),
  semestre: z.number().int().optional(),
  quantidade: z.number().int().min(5).max(30).default(10),
});

/** Anos/semestres disponíveis e quantas questões cada edição tem. */
export const listarEdicoesOficiais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("questoes_vestibulinho")
      .select("ano, semestre")
      .eq("autonoma", true)
      .limit(2000);
    if (error) throw new Error(error.message);

    const contagem = new Map<string, { ano: number; semestre: number; total: number }>();
    for (const linha of data ?? []) {
      const chave = `${linha.ano}-${linha.semestre}`;
      const atual = contagem.get(chave);
      if (atual) atual.total += 1;
      else contagem.set(chave, { ano: linha.ano, semestre: linha.semestre, total: 1 });
    }
    return [...contagem.values()].sort((a, b) => b.ano - a.ano || b.semestre - a.semestre);
  });

/** Monta um simulado com questões reais, respeitando os filtros escolhidos. */
export const gerarSimuladoOficial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => FiltroSchema.parse(input))
  .handler(async ({ data, context }): Promise<Questao[]> => {
    let query = context.supabase
      .from("questoes_vestibulinho")
      .select("id, ano, semestre, numero, materia, enunciado, alternativas, correta")
      .eq("autonoma", true)
      .in("materia", MATERIAS as unknown as string[]);

    if (data.materia) query = query.eq("materia", data.materia);
    if (data.ano) query = query.eq("ano", data.ano);
    if (data.semestre) query = query.eq("semestre", data.semestre);

    const { data: linhas, error } = await query.limit(600);
    if (error) throw new Error(error.message);

    const embaralhadas = embaralhar(linhas ?? []);
    return embaralhadas
      .slice(0, data.quantidade)
      .map((linha) => paraQuestao(linha as Linha));
  });
