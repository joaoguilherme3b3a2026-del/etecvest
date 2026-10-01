/**
 * Treinos personalizados montados com as questões reais dos Vestibulinhos:
 * - simulado da semana (muda a cada semana, pesa as matérias mais fracas);
 * - "Hoje no EtecVest" (muda todo dia, foca nas matérias que o aluno mais precisa);
 * - exercícios das tarefas de revisão (questões da matéria/tema da tarefa).
 * O sorteio usa uma semente (aluno + dia/semana), então o treino é estável no período.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MATERIAS, TAREFAS, type Materia, type Questao } from "./conteudo";
import { normalizarEstado, progressoMateria } from "./progresso-calculos";
import { paraQuestao } from "./questoes-oficiais.functions";

type Sb = { from: (t: string) => any };

function semente(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(lista: T[], rnd: () => number) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function chaveDia(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function chaveSemana(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-S${Math.ceil(((t.getTime() - inicio.getTime()) / 86400000 + 1) / 7)}`;
}

/** Nota de necessidade por matéria: progresso baixo e muitos erros = mais necessidade. */
async function necessidades(sb: Sb, userId: string) {
  const [{ data: row }, { data: erradas }] = await Promise.all([
    sb.from("progresso_aluno").select("estado").eq("user_id", userId).maybeSingle(),
    sb.from("questoes_erradas").select("materia").eq("user_id", userId),
  ]);
  const estado = normalizarEstado(row?.estado);
  const erros = new Map<string, number>();
  for (const e of (erradas ?? []) as { materia: string }[]) erros.set(e.materia, (erros.get(e.materia) ?? 0) + 1);
  return MATERIAS.map((m) => ({
    materia: m,
    progresso: progressoMateria(estado, m),
    erros: erros.get(m) ?? 0,
    peso: 100 - progressoMateria(estado, m) + (erros.get(m) ?? 0) * 8 + 10,
  })).sort((a, b) => b.peso - a.peso);
}

async function questoesDaMateria(sb: Sb, materia: Materia, filtroTexto?: string[]) {
  let q = sb
    .from("questoes_vestibulinho")
    .select("id, ano, semestre, numero, materia, enunciado, alternativas, correta")
    .eq("autonoma", true)
    .eq("materia", materia);
  if (filtroTexto?.length) q = q.or(filtroTexto.map((p) => `enunciado.ilike.%${p}%`).join(","));
  const { data, error } = await q.limit(400);
  if (error) throw new Error(error.message);
  return ((data ?? []) as never[]).map((l) => paraQuestao(l));
}

/** Simulado da semana: 12 questões distribuídas conforme a necessidade do aluno. */
export const gerarSimuladoSemana = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const nec = await necessidades(sb, context.userId);
    const semana = chaveSemana();
    const rnd = semente(`${context.userId}:${semana}`);
    const total = 12;
    const somaPesos = nec.reduce((s, n) => s + n.peso, 0);
    let restante = total;
    const cotas = nec.map((n, i) => {
      const c = i === nec.length - 1 ? restante : Math.max(1, Math.round((n.peso / somaPesos) * total));
      restante -= c;
      return { ...n, cota: Math.max(0, c) };
    });
    const questoes: Questao[] = [];
    for (const c of cotas) {
      const lista = embaralhar(await questoesDaMateria(sb, c.materia), rnd);
      questoes.push(...lista.slice(0, c.cota));
    }
    return {
      semana,
      foco: cotas.filter((c) => c.cota > 0).map((c) => ({ materia: c.materia, questoes: c.cota })),
      questoes: embaralhar(questoes, rnd),
    };
  });

/** Três treinos do dia, focados nas matérias em que o aluno mais precisa melhorar. */
export const treinosDoDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const nec = await necessidades(sb, context.userId);
    const dia = chaveDia();
    const rnd = semente(`${context.userId}:${dia}`);
    // As duas matérias mais fracas sempre entram; a terceira varia a cada dia.
    const outras = embaralhar(nec.slice(2), rnd);
    const escolhidas = [nec[0]!, nec[1]!, outras[0]!];
    const treinos = [];
    for (const n of escolhidas) {
      const questoes = embaralhar(await questoesDaMateria(sb, n.materia), rnd).slice(0, 5);
      treinos.push({
        materia: n.materia,
        motivo: n.erros > 0 ? `${n.erros} questão(ões) para revisar` : `Progresso atual: ${n.progresso}%`,
        minutos: questoes.length * 2,
        questoes,
      });
    }
    return { dia, treinos };
  });

/** Exercícios de uma tarefa de revisão: questões reais da matéria e, se possível, do tema. */
export const exerciciosDaTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const tarefa = TAREFAS.find((t) => t.id === data.id);
    if (!tarefa) throw new Error("Tarefa não encontrada");
    const sb = context.supabase as unknown as Sb;
    const palavras = tarefa.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z]+/)
      .filter((p) => p.length > 4)
      .map((p) => p.slice(0, Math.max(5, p.length - 2)));
    const rnd = semente(`${context.userId}:${tarefa.id}:${chaveDia()}`);
    const doTema = palavras.length ? await questoesDaMateria(sb, tarefa.materia, palavras) : [];
    let lista = embaralhar(doTema, rnd);
    if (lista.length < tarefa.questoes) {
      const ids = new Set(lista.map((q) => q.id));
      const extras = embaralhar(await questoesDaMateria(sb, tarefa.materia), rnd).filter((q) => !ids.has(q.id));
      lista = [...lista, ...extras];
    }
    return lista.slice(0, Math.min(tarefa.questoes, 10));
  });

/**
 * Exercícios novos criados pela IA, usando questões reais do banco como base de estilo e conteúdo.
 * Mistura com questões reais (que contam no progresso). Se a IA falhar, devolve só as reais.
 */
export const exerciciosComIa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ materia: z.enum(MATERIAS as unknown as [Materia, ...Materia[]]), tema: z.string().max(200).optional(), quantidade: z.number().int().min(2).max(10).default(5) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const rnd = semente(`${context.userId}:${data.materia}:${data.tema ?? ""}:${Date.now()}`);
    const reais = embaralhar(await questoesDaMateria(sb, data.materia), rnd);
    const base = reais.slice(0, 3);
    const nIa = Math.ceil(data.quantidade / 2);
    let geradas: Questao[] = [];
    try {
      const key = process.env["LOVABLE_API_KEY"];
      if (!key) throw new Error("sem chave");
      const exemplos = base.map((q, i) => `Exemplo ${i + 1} (${q.vestibulinho}):\n${q.enunciado}\n${q.alternativas.map((a, j) => `(${"ABCDE"[j]}) ${a}`).join("\n")}\nCorreta: ${"ABCDE"[q.correta]}`).join("\n\n");
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Você cria exercícios inéditos no estilo do Vestibulinho da Etec (SP), para alunos do 9º ano. Responda só JSON: {\"questoes\":[{\"enunciado\":string,\"alternativas\":[5 strings],\"correta\":0-4}]}. Texto simples, sem LaTeX nem markdown. Uma única alternativa correta, conferida com cuidado." },
            { role: "user", content: `Crie ${nIa} questões de ${data.materia}${data.tema ? ` sobre: ${data.tema}` : ""}, com o mesmo nível e estilo destas questões reais:\n\n${exemplos}` },
          ],
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      const bruto = JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as { questoes?: unknown[] };
      const Q = z.object({ enunciado: z.string().min(10), alternativas: z.array(z.string().min(1)).length(5), correta: z.number().int().min(0).max(4) });
      geradas = (bruto.questoes ?? []).flatMap((x, i) => {
        const p = Q.safeParse(x);
        return p.success ? [{ id: `ia-${crypto.randomUUID()}`, vestibulinho: "ia", materia: data.materia, ...p.data }] : [];
      }).slice(0, nIa);
      if (geradas.length) {
        const { error } = await (context.supabase as unknown as Sb).from("questoes_ia").insert(geradas.map((q) => ({ id: q.id, user_id: context.userId, materia: q.materia, enunciado: q.enunciado, alternativas: q.alternativas, correta: q.correta })));
        if (error) { console.error("questoes_ia", error); geradas = []; }
      }
    } catch (e) {
      console.error("exerciciosComIa", e);
    }
    const reaisUsadas = reais.slice(0, data.quantidade - geradas.length);
    return { geradasPorIa: geradas.length, questoes: embaralhar([...geradas, ...reaisUsadas], rnd) };
  });
