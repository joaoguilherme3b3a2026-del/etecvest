const COMANDOS_LATEX =
  /(^|[\s:,(])([\\/]?(?:text|mathrm|mathbf|mathit|operatorname|frac|dfrac|tfrac|sqrt|boxed|overline|underline)\{[^{}\n]*\}(?:\{[^{}\n]*\})?)/g;

/** Corrige fórmulas antigas ou incompletas e mantém valores monetários como texto. */
export function formatarRespostaIa(conteudo: string) {
  const blocos: string[] = [];
  const moedas: string[] = [];
  const moedasCorrigidas = conteudo
    .replace(/\$\\text\{R\\\$\s*\}(\d+)\{,\}(\d{2})\$/g, "R\\$ $1,$2")
    .replace(/[\\/]text\{R[\\/]?\s*\}/g, "R\\$ ")
    .replace(/(R\\\$\s*\d+)\{,\}(\d{2})/g, "$1,$2")
    .replace(/(R\\\$\s*\d+,\d{2})\$/g, "$1")
    .replace(/R\$(?=\s*\d)/g, "R\\$")
    .replace(/(\d+(?:[,.]\d+)?%)\$(?=\s|[.,;:!?)]|$)/g, "$1")
    .replace(/R\\\$\s*\d+,\d{2}/g, (moeda) => {
      moedas.push(moeda);
      return `@@MOEDA_${moedas.length - 1}@@`;
    });
  const protegido = moedasCorrigidas.replace(/\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+\$/g, (formula) => {
    blocos.push(formula);
    return `@@FORMULA_${blocos.length - 1}@@`;
  });

  return protegido
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formula: string) => `$$${formula}$$`)
    .replace(/\\\((.*?)\\\)/g, (_, formula: string) => `$${formula}$`)
    .replace(COMANDOS_LATEX, (_, prefixo: string, formula: string) => {
      const comando = formula.startsWith("/") ? `\\${formula.slice(1)}` : formula;
      return `${prefixo}$${comando}$`;
    })
    .replace(/@@FORMULA_(\d+)@@/g, (_, indice: string) => blocos[Number(indice)] ?? "")
    .replace(/@@MOEDA_(\d+)@@/g, (_, indice: string) => moedas[Number(indice)] ?? "");
}