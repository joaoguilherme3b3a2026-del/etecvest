/**
 * Fonte única de conteúdo do EtecVest.
 *
 * Para adicionar novas provas/questões no futuro:
 *  1. Acrescente o vestibulinho em VESTIBULINHOS.
 *  2. Acrescente as tarefas em TAREFAS, informando `materia` e `vestibulinho`.
 *  3. Acrescente as questões do simulado em QUESTOES_SIMULADO (com a `materia`).
 * Nenhum outro arquivo precisa ser alterado.
 */

export const MATERIAS = [
  "Matemática",
  "Português",
  "Ciências",
  "História & Geografia",
] as const;

export type Materia = (typeof MATERIAS)[number];

export type Vestibulinho = {
  id: string;
  rotulo: string;
};

export const VESTIBULINHOS: Vestibulinho[] = [
  { id: "2026-1", rotulo: "Vestibulinho 2026 — 1º semestre" },
  { id: "2025-2", rotulo: "Vestibulinho 2025 — 2º semestre" },
  { id: "2025-1", rotulo: "Vestibulinho 2025 — 1º semestre" },
  { id: "2024-1", rotulo: "Vestibulinho 2024 — 1º semestre" },
];

export type Tarefa = {
  id: string;
  titulo: string;
  materia: Materia;
  vestibulinho: string; // id de VESTIBULINHOS
  minutos: number;
  questoes: number;
};

export const TAREFAS: Tarefa[] = [
  {
    id: "mat-2026-porcentagem",
    titulo: "Porcentagem e descontos",
    materia: "Matemática",
    vestibulinho: "2026-1",
    minutos: 12,
    questoes: 10,
  },
  {
    id: "mat-2026-regra3",
    titulo: "Regra de três simples",
    materia: "Matemática",
    vestibulinho: "2026-1",
    minutos: 8,
    questoes: 8,
  },
  {
    id: "mat-2025-fracoes",
    titulo: "Frações e operações básicas",
    materia: "Matemática",
    vestibulinho: "2025-2",
    minutos: 15,
    questoes: 12,
  },
  {
    id: "por-2026-interpretacao",
    titulo: "Interpretação de texto",
    materia: "Português",
    vestibulinho: "2026-1",
    minutos: 20,
    questoes: 10,
  },
  {
    id: "por-2025-classes",
    titulo: "Classes gramaticais",
    materia: "Português",
    vestibulinho: "2025-1",
    minutos: 10,
    questoes: 12,
  },
  {
    id: "cie-2026-ambiente",
    titulo: "Meio ambiente e recursos naturais",
    materia: "Ciências",
    vestibulinho: "2026-1",
    minutos: 12,
    questoes: 10,
  },
  {
    id: "cie-2024-corpo",
    titulo: "Corpo humano e saúde",
    materia: "Ciências",
    vestibulinho: "2024-1",
    minutos: 14,
    questoes: 12,
  },
  {
    id: "hg-2025-republica",
    titulo: "Brasil república e atualidades",
    materia: "História & Geografia",
    vestibulinho: "2025-2",
    minutos: 16,
    questoes: 12,
  },
  {
    id: "hg-2024-cartografia",
    titulo: "Cartografia e população",
    materia: "História & Geografia",
    vestibulinho: "2024-1",
    minutos: 12,
    questoes: 10,
  },
];

export type Questao = {
  id: string;
  vestibulinho: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  materia: Materia;
};

const QUESTOES_BASE: Questao[] = [
  {
    id: "base-1", vestibulinho: "autoral",
    enunciado:
      "Uma mochila custa R$ 120,00 e está com 15% de desconto. Qual é o valor final da compra?",
    alternativas: ["R$ 98,00", "R$ 102,00", "R$ 105,00", "R$ 108,00"],
    correta: 1,
    materia: "Matemática",
  },
  {
    id: "base-2", vestibulinho: "autoral",
    enunciado:
      'Na frase "A estudante resolveu a questão rapidamente", qual é a classe gramatical da palavra "rapidamente"?',
    alternativas: ["Adjetivo", "Advérbio", "Substantivo", "Preposição"],
    correta: 1,
    materia: "Português",
  },
  {
    id: "base-3", vestibulinho: "autoral",
    enunciado: "Se 3 cadernos custam R$ 21,00, quanto custam 7 cadernos do mesmo tipo?",
    alternativas: ["R$ 42,00", "R$ 45,00", "R$ 49,00", "R$ 56,00"],
    correta: 2,
    materia: "Matemática",
  },
  {
    id: "base-4", vestibulinho: "autoral",
    enunciado: "Qual das alternativas apresenta um recurso natural renovável?",
    alternativas: ["Carvão mineral", "Petróleo", "Energia solar", "Gás natural"],
    correta: 2,
    materia: "Ciências",
  },
  {
    id: "base-5", vestibulinho: "autoral",
    enunciado: "Calcule o valor da expressão: 12 × 4 − 18.",
    alternativas: ["26", "30", "34", "38"],
    correta: 1,
    materia: "Matemática",
  },
];

/** Progresso inicial exibido antes de qualquer atividade registrada. */
export const PROGRESSO_BASE: Record<Materia, number> = {
  "Matemática": 68,
  "Português": 54,
  "Ciências": 41,
  "História & Geografia": 35,
};

export const DETALHES_MATERIA: Record<Materia, { prioridade: string; descricao: string; aulas: string }> = {
  "Matemática": {
    prioridade: "Prioridade alta",
    descricao: "Porcentagem, regra de três, frações e operações básicas.",
    aulas: "18 aulas",
  },
  "Português": {
    prioridade: "Prioridade alta",
    descricao: "Interpretação de texto, classes gramaticais e ortografia.",
    aulas: "16 aulas",
  },
  "Ciências": {
    prioridade: "Prioridade média",
    descricao: "Meio ambiente, corpo humano, energia e recursos naturais.",
    aulas: "12 aulas",
  },
  "História & Geografia": {
    prioridade: "Prioridade média",
    descricao: "Brasil república, cartografia, população e atualidades.",
    aulas: "14 aulas",
  },
};

export const BANCO_QUESTOES: Questao[] = [...QUESTOES_BASE, ...([{"id": "autoral-1", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Em “Os alunos estudam”, qual é o sujeito?", "alternativas": ["Os alunos", "estudam", "alunos estudam", "Não há sujeito"], "correta": 0}, {"id": "autoral-2", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Qual palavra é oxítona?", "alternativas": ["Árvore", "Lâmpada", "Médico", "Café"], "correta": 3}, {"id": "autoral-3", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Qual alternativa contém um verbo no passado?", "alternativas": ["Estudará", "Estudar", "Estudou", "Estuda"], "correta": 2}, {"id": "autoral-4", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Qual palavra é sinônimo de “rápido”?", "alternativas": ["Frágil", "Veloz", "Lento", "Distante"], "correta": 1}, {"id": "autoral-5", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Em “Estudou, mas não passou”, “mas” indica:", "alternativas": ["Oposição", "Adição", "Causa", "Conclusão"], "correta": 0}, {"id": "autoral-6", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Qual frase apresenta concordância correta?", "alternativas": ["As menina chegou.", "Os aluno estudou.", "Nós estuda.", "As meninas chegaram."], "correta": 3}, {"id": "autoral-7", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Qual sinal encerra uma pergunta direta?", "alternativas": ["Dois-pontos", "Ponto e vírgula", "Interrogação", "Vírgula"], "correta": 2}, {"id": "autoral-8", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Em “A casa azul”, “azul” é:", "alternativas": ["Pronome", "Adjetivo", "Verbo", "Artigo"], "correta": 1}, {"id": "autoral-9", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Qual é o plural de “cidadão”?", "alternativas": ["Cidadãos", "Cidadões", "Cidadães", "Cidadãoes"], "correta": 0}, {"id": "autoral-10", "vestibulinho": "autoral", "materia": "Português", "enunciado": "Um texto que defende uma opinião é predominantemente:", "alternativas": ["Injuntivo", "Descritivo", "Narrativo", "Argumentativo"], "correta": 3}, {"id": "autoral-11", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "Qual órgão bombeia o sangue?", "alternativas": ["Rim", "Estômago", "Coração", "Pulmão"], "correta": 2}, {"id": "autoral-12", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "Na fotossíntese, as plantas liberam:", "alternativas": ["Hélio", "Oxigênio", "Metano", "Nitrogênio"], "correta": 1}, {"id": "autoral-13", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "A passagem da água líquida para vapor chama-se:", "alternativas": ["Vaporização", "Fusão", "Solidificação", "Condensação"], "correta": 0}, {"id": "autoral-14", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "Qual estrutura contém o material genético em células eucarióticas?", "alternativas": ["Parede celular", "Vacúolo", "Membrana", "Núcleo"], "correta": 3}, {"id": "autoral-15", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "Qual medida previne a dengue?", "alternativas": ["Evitar frutas", "Ferver óleo", "Eliminar água parada", "Tomar antibióticos"], "correta": 2}, {"id": "autoral-16", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "Em uma cadeia alimentar, plantas são:", "alternativas": ["Predadores", "Produtores", "Consumidores primários", "Decompositores"], "correta": 1}, {"id": "autoral-17", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "A unidade de força no SI é:", "alternativas": ["Newton", "Watt", "Joule", "Volt"], "correta": 0}, {"id": "autoral-18", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "Uma mistura de água e areia pode ser separada por:", "alternativas": ["Fusão", "Sublimação", "Eletrólise", "Filtração"], "correta": 3}, {"id": "autoral-19", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "Qual fonte de energia é não renovável?", "alternativas": ["Vento", "Marés", "Petróleo", "Sol"], "correta": 2}, {"id": "autoral-20", "vestibulinho": "autoral", "materia": "Ciências", "enunciado": "A maior parte da absorção de nutrientes ocorre no:", "alternativas": ["Intestino grosso", "Intestino delgado", "Esôfago", "Estômago"], "correta": 1}, {"id": "autoral-21", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "A Proclamação da República brasileira ocorreu em:", "alternativas": ["1889", "1822", "1500", "1930"], "correta": 0}, {"id": "autoral-22", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "Qual linha divide a Terra em hemisférios Norte e Sul?", "alternativas": ["Greenwich", "Trópico de Câncer", "Círculo Polar Ártico", "Equador"], "correta": 3}, {"id": "autoral-23", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "Em escala 1:100.000, 1 cm no mapa representa:", "alternativas": ["10 m", "100 m", "1 km", "100 km"], "correta": 2}, {"id": "autoral-24", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "A independência do Brasil foi proclamada em:", "alternativas": ["1500", "1822", "1889", "1789"], "correta": 1}, {"id": "autoral-25", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "O movimento da Terra responsável pelos dias e noites é:", "alternativas": ["Rotação", "Translação", "Precessão", "Revolução lunar"], "correta": 0}, {"id": "autoral-26", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "O êxodo rural é a migração:", "alternativas": ["Da cidade para o campo", "Entre países", "Entre continentes", "Do campo para a cidade"], "correta": 3}, {"id": "autoral-27", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "Qual bioma predomina na região Norte do Brasil?", "alternativas": ["Caatinga", "Pantanal", "Amazônia", "Pampa"], "correta": 2}, {"id": "autoral-28", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "A Lei Áurea, de 1888, determinou:", "alternativas": ["A República", "A abolição da escravidão", "A independência", "O voto feminino"], "correta": 1}, {"id": "autoral-29", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "O meridiano de Greenwich é referência para:", "alternativas": ["Longitudes", "Latitudes", "Altitudes", "Temperaturas"], "correta": 0}, {"id": "autoral-30", "vestibulinho": "autoral", "materia": "História & Geografia", "enunciado": "A industrialização brasileira intensificou a:", "alternativas": ["Ruralização", "Desertificação global", "Redução das cidades", "Urbanização"], "correta": 3}, {"id": "mat-0", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "Em uma turma de 40 alunos, 25% faltaram. Quantos alunos faltaram?", "alternativas": ["8", "10", "12", "15"], "correta": 1}, {"id": "mat-1", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "Uma blusa de R$ 80,00 tem 15% de desconto. Qual o valor do desconto?", "alternativas": ["R$ 8,00", "R$ 15,00", "R$ 12,00", "R$ 20,00"], "correta": 2}, {"id": "mat-2", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "Se 3 cadernos custam R$ 27,00, quanto custam 5 cadernos do mesmo tipo?", "alternativas": ["R$ 40,00", "R$ 45,00", "R$ 50,00", "R$ 54,00"], "correta": 1}, {"id": "mat-3", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "Qual é o valor de 2/5 de 150?", "alternativas": ["60", "50", "75", "30"], "correta": 0}, {"id": "mat-4", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "Um retângulo tem 8 cm de base e 5 cm de altura. Qual é a sua área?", "alternativas": ["13 cm²", "26 cm²", "40 cm²", "45 cm²"], "correta": 2}, {"id": "mat-5", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "Qual é o resultado de 12 × 4 − 18 ÷ 3?", "alternativas": ["36", "42", "30", "46"], "correta": 1}, {"id": "mat-6", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "Um carro percorre 240 km em 3 horas. Qual é a velocidade média?", "alternativas": ["60 km/h", "70 km/h", "80 km/h", "90 km/h"], "correta": 2}, {"id": "mat-7", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "O perímetro de um quadrado de lado 7 cm é:", "alternativas": ["14 cm", "21 cm", "28 cm", "49 cm"], "correta": 2}, {"id": "mat-8", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "Qual é a média aritmética das notas 6, 7, 8 e 9?", "alternativas": ["7", "7,5", "8", "6,5"], "correta": 1}, {"id": "mat-9", "vestibulinho": "autoral", "materia": "Matemática", "enunciado": "Numa promoção, o preço caiu de R$ 50,00 para R$ 40,00. A redução foi de:", "alternativas": ["10%", "15%", "20%", "25%"], "correta": 2}] as Questao[])];
export const QUESTOES_SIMULADO = MATERIAS.flatMap(m => BANCO_QUESTOES.filter(q => q.materia === m).slice(0, 3));
export const MINI_SIMULADOS = MATERIAS.map(materia => ({ materia, titulo: `Mini simulado de ${materia}`, questoes: BANCO_QUESTOES.filter(q => q.materia === materia) }));
