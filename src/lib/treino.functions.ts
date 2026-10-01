import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MATERIAS, TAREFAS, type Materia, type Questao } from "./conteudo";
import { normalizarEstado, progressoMateria } from "./progresso-calculos";
import { paraQuestao } from "./questoes-oficiais.functions";

type Sb = { from: (tabela: string) => any };

function semente(texto: string) {
  let h = 2166136261;

  for (let i = 0; i < texto.length; i += 1) {
    h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  }

  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);

    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(lista: T[], rnd: () => number) {
  const resultado = [...lista];

  for (let i = resultado.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j]!, resultado[i]!];
  }

  return resultado;
}

function chaveDia(data = new Date()) {
  return data.toISOString().slice(0, 10);
}

function chaveSemana(data = new Date()) {
  const atual = new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()),
  );
  const dia = atual.getUTCDay() || 7;

  atual.setUTCDate(atual.getUTCDate() + 4 - dia);

  const inicio = new Date(Date.UTC(atual.getUTCFullYear(), 0, 1));
  const numeroSemana = Math.ceil(
    ((atual.getTime() - inicio.getTime()) / 86400000 + 1) / 7,
  );

  return `${atual.getUTCFullYear()}-S${numeroSemana}`;
}

async function necessidades(sb: Sb, userId: string) {
  const [{ data: progresso }, { data: erradas }] = await Promise.all([
    sb
      .from("progresso_aluno")
      .select("estado")
      .eq("user_id", userId)
      .maybeSingle(),
    sb.from("questoes_erradas").select("materia").eq("user_id", userId),
  ]);

  const estado = normalizarEstado(progresso?.estado);
  const quantidadeErros = new Map<string, number>();

  for (const erro of (erradas ?? []) as { materia: string }[]) {
    const quantidade = quantidadeErros.get(erro.materia) ?? 0;
    quantidadeErros.set(erro.materia, quantidade + 1);
  }

  return MATERIAS.map((materia) => {
    const progressoAtual = progressoMateria(estado, materia);
    const erros = quantidadeErros.get(materia) ?? 0;

    return {
      materia,
      progresso: progressoAtual,
      erros,
      peso: 100 - progressoAtual + erros * 8 + 10,
    };
  }).sort((a, b) => b.peso - a.peso);
}

async function questoesDaMateria(
  sb: Sb,
  materia: Materia,
  filtroTexto?: string[],
) {
  let consulta = sb
    .from("questoes_vestibulinho")
    .select(
      "id, ano, semestre, numero, materia, enunciado, alternativas, correta",
    )
    .eq("autonoma", true)
    .eq("materia", materia);

  if (filtroTexto?.length) {
    const filtro = filtroTexto
      .map((palavra) => `enunciado.ilike.%${palavra}%`)
      .join(",");

    consulta = consulta.or(filtro);
  }

  const { data, error } = await consulta.limit(400);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as never[]).map((linha) => paraQuestao(linha));
}

/** Gera o simulado semanal com 12 questões distribuídas conforme a necessidade. */
export const gerarSimuladoSemana = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const necessidadesMateria = await necessidades(sb, context.userId);
    const semana = chaveSemana();
    const rnd = semente(`${context.userId}:${semana}`);
    const totalQuestoes = 12;

    const somaPesos = necessidadesMateria.reduce(
      (soma, item) => soma + item.peso,
      0,
    );
    let restantes = totalQuestoes;

    const cotas = necessidadesMateria.map((item, indice) => {
      const quantidade =
        indice === necessidadesMateria.length - 1
          ? restantes
          : Math.max(
              1,
              Math.round((item.peso / somaPesos) * totalQuestoes),
            );

      restantes -= quantidade;

      return {
        ...item,
        cota: Math.max(0, quantidade),
      };
    });

    const questoes: Questao[] = [];

    for (const item of cotas) {
      const lista = embaralhar(
        await questoesDaMateria(sb, item.materia),
        rnd,
      );

      questoes.push(...lista.slice(0, item.cota));
    }

    return {
      semana,
      foco: cotas
        .filter((item) => item.cota > 0)
        .map((item) => ({
          materia: item.materia,
          questoes: item.cota,
        })),
      questoes: embaralhar(questoes, rnd),
    };
  });

/** Gera os três treinos do dia com foco nas matérias que mais precisam de revisão. */
export const treinosDoDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const necessidadesMateria = await necessidades(sb, context.userId);
    const dia = chaveDia();
    const rnd = semente(`${context.userId}:${dia}`);

    // As duas matérias mais fracas sempre entram; a terceira varia a cada dia.
    const outras = embaralhar(necessidadesMateria.slice(2), rnd);
    const escolhidas = [
      necessidadesMateria[0]!,
      necessidadesMateria[1]!,
      outras[0]!,
    ];

    const treinos = [];

    for (const item of escolhidas) {
      const questoes = embaralhar(
        await questoesDaMateria(sb, item.materia),
        rnd,
      ).slice(0, 5);

      treinos.push({
        materia: item.materia,
        motivo:
          item.erros > 0
            ? `${item.erros} questão(ões) para revisar`
            : `Progresso atual: ${item.progresso}%`,
        minutos: questoes.length * 2,
        questoes,
      });
    }

    return { dia, treinos };
  });

/** Busca questões reais para uma tarefa, priorizando o tema da tarefa. */
export const exerciciosDaTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tarefa = TAREFAS.find((item) => item.id === data.id);

    if (!tarefa) {
      throw new Error("Tarefa não encontrada");
    }

    const sb = context.supabase as unknown as Sb;
    const palavras = tarefa.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z]+/)
      .filter((palavra) => palavra.length > 4)
      .map((palavra) =>
        palavra.slice(0, Math.max(5, palavra.length - 2)),
      );

    const rnd = semente(
      `${context.userId}:${tarefa.id}:${chaveDia()}`,
    );

    const questoesDoTema = palavras.length
      ? await questoesDaMateria(sb, tarefa.materia, palavras)
      : [];

    let lista = embaralhar(questoesDoTema, rnd);

    if (lista.length < tarefa.questoes) {
      const ids = new Set(lista.map((questao) => questao.id));
      const extras = embaralhar(
        await questoesDaMateria(sb, tarefa.materia),
        rnd,
      ).filter((questao) => !ids.has(questao.id));

      lista = [...lista, ...extras];
    }

    return lista.slice(0, Math.min(tarefa.questoes, 10));
  });

/**
 * Gera exercícios novos com IA usando questões reais como referência.
 * Também mistura questões reais para manter o progresso do aluno.
 */
export const exerciciosComIa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        materia: z.enum(
          MATERIAS as unknown as [Materia, ...Materia[]],
        ),
        tema: z.string().max(200).optional(),
        quantidade: z.number().int().min(2).max(10).default(5),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const rnd = semente(
      `${context.userId}:${data.materia}:${data.tema ?? ""}:${Date.now()}`,
    );

    const reais = embaralhar(
      await questoesDaMateria(sb, data.materia),
      rnd,
    );
    const base = reais.slice(0, 3);
    const quantidadeIa = Math.ceil(data.quantidade / 2);

    let geradas: Questao[] = [];

    try {
      const key = process.env["LOVABLE_API_KEY"];

      if (!key) {
        throw new Error("sem chave");
      }

      const exemplos = base
        .map(
          (questao, indice) =>
            `Exemplo ${indice + 1} (${questao.vestibulinho}):\n${questao.enunciado}\n${questao.alternativas
              .map((alternativa, i) => `(${"ABCDE"[i]}) ${alternativa}`)
              .join("\n")}\nCorreta: ${"ABCDE"[questao.correta]}`,
        )
        .join("\n\n");

      const resposta = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  'Você cria exercícios inéditos no estilo do Vestibulinho da Etec (SP), para alunos do 9º ano. Responda só JSON: {"questoes":[{"enunciado":string,"alternativas":[5 strings],"correta":0-4}]}. Texto simples, sem LaTeX nem markdown. Uma única alternativa correta, conferida com cuidado.',
              },
              {
                role: "user",
                content: `Crie ${quantidadeIa} questões de ${data.materia}${
                  data.tema ? ` sobre: ${data.tema}` : ""
                }, com o mesmo nível e estilo destas questões reais:\n\n${exemplos}`,
              },
            ],
          }),
        },
      );

      if (!resposta.ok) {
        throw new Error(String(resposta.status));
      }

      const json = (await resposta.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const bruto = JSON.parse(
        json.choices?.[0]?.message?.content ?? "{}",
      ) as { questoes?: unknown[] };

      const formatoQuestao = z.object({
        enunciado: z.string().min(10),
        alternativas: z.array(z.string().min(1)).length(5),
        correta: z.number().int().min(0).max(4),
      });

      geradas = (bruto.questoes ?? [])
        .flatMap((item, indice) => {
          const resultado = formatoQuestao.safeParse(item);

          if (!resultado.success) {
            return [];
          }

          return [
            {
              id: `ia-${crypto.randomUUID()}`,
              vestibulinho: "ia",
              materia: data.materia,
              ...resultado.data,
            },
          ];
        })
        .slice(0, quantidadeIa);

      if (geradas.length) {
        const { error } = await sb
          .from("questoes_ia")
          .insert(
            geradas.map((questao) => ({
              id: questao.id,
              user_id: context.userId,
              materia: questao.materia,
              enunciado: questao.enunciado,
              alternativas: questao.alternativas,
              correta: questao.correta,
            })),
          );

        if (error) {
          console.error("questoes_ia", error);
          geradas = [];
        }
      }
    } catch (erro) {
      console.error("exerciciosComIa", erro);
    }

    const quantidadeReais = data.quantidade - geradas.length;
    const reaisUsadas = reais.slice(0, quantidadeReais);

    return {
      geradasPorIa: geradas.length,
      questoes: embaralhar([...geradas, ...reaisUsadas], rnd),
    };
  });
