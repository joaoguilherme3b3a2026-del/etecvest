"""
Extrai questões das provas oficiais do Vestibulinho da Etec (Centro Paula Souza).

Uso:
    python3 scripts/ingestao/extrair_provas.py /tmp/ing/links.json /tmp/ing/questoes.json

Entrada: JSON com [{ano, semestre, tipo, file}] apontando para os PDFs baixados.
Saída:   JSON com [{ano, semestre, numero, enunciado, alternativas[5], correta, materia}]

Como funciona:
 1. Lê o texto de cada página da prova com PyMuPDF.
 2. Divide o texto em blocos que começam com "N." / "N)" (número da questão).
 3. Dentro de cada bloco separa o enunciado das alternativas (A) a (E).
 4. Lê o gabarito oficial (dois formatos: "01: D" e tabela "1 / B / C1").
 5. Classifica a matéria por palavras-chave (Matemática, Português, Ciências,
    História & Geografia, Inglês).
"""
import json
import re
import sys
import unicodedata

import pymupdf

MATERIAS = ["Matemática", "Português", "Ciências", "História & Geografia", "Inglês"]

PALAVRAS = {
    "Matemática": [
        "porcentagem", "equação", "fração", "triângulo", "quadrado", "retângulo", "área",
        "perímetro", "volume", "litros", "média aritmética", "probabilidade", "ângulo",
        "diagonal", "juros", "desconto", "múltiplo", "divisor", "raiz quadrada", "gráfico de barras",
        "r$", "km/h", "cm", "m²", "m2", "razão", "proporção", "regra de três", "expressão algébrica",
        "número", "soma", "produto", "quantia", "medida", "calcul",
    ],
    "Ciências": [
        "célula", "energia", "ecossistema", "átomo", "molécula", "corpo humano", "sistema digestório",
        "fotossíntese", "solo", "poluição", "reciclagem", "cadeia alimentar", "vacina", "bactéria",
        "vírus", "força", "temperatura", "calor", "eletricidade", "planeta", "ser vivo", "organismo",
        "saúde", "dna", "respiração", "mistura", "substância",
    ],
    "História & Geografia": [
        "república", "império", "colônia", "escravidão", "revolução", "guerra", "ditadura",
        "constituição", "presidente", "século", "população", "migração", "urbanização", "clima",
        "relevo", "mapa", "estado de são paulo", "brasil", "continente", "capitalismo", "indústria",
        "globalização", "território", "cidadania", "democracia", "eleitoral",
    ],
    "Inglês": [
        "according to the text", "in the text", "the word", "means", "the author",
    ],
    "Português": [
        "texto", "parágrafo", "verbo", "substantivo", "adjetivo", "sujeito", "predicado",
        "acentuação", "ortografia", "crase", "pronome", "linguagem", "sentido", "figura de linguagem",
        "narrador", "poema", "crônica", "concordância", "conotativ", "denotativ",
    ],
}

RE_QUESTAO = re.compile(r"(?m)^\s*(?:Quest[ãa]o\s*)?(\d{1,2})\s*[\.\)]?\s+")
RE_QUESTAO_ROTULO = re.compile(r"(?mi)^\s*Quest[ãa]o\s*(\d{1,2})\b")
RE_ALT = re.compile(r"\(\s*([A-E])\s*\)\s*")
RE_CABECALHO = re.compile(
    r"(?i)(escola t[ée]cnica estadual|vestibulinho|centro paula souza|rascunho|"
    r"processo seletivo|p[áa]gina \d+|www\.|https?://|dispon[íi]vel em:|acesso em:|^\d{1,2}$|"
    r"^etec$|^\d{1,2}\s*[•·]|[•·]\s*etec$)"
)

# Questões que dependem de um texto, imagem, gráfico ou tabela da prova não são
# autônomas: continuam salvas, mas ficam fora dos simulados gerados pelo app.
RE_DEPENDENTE = re.compile(
    r"(?i)(no texto|do texto|o texto|dos textos|acima|abaixo|a seguir|imagem|figura|charge|cartum|"
    r"tirinha|gr[áa]fico|tabela|mapa|quadro|poema|trecho|verso|par[áa]grafo|infogr[áa]fico|"
    r"desenho|esquema|ilustra|rascunho|www\.|dispon[íi]vel em|acesso em|"
    r"segundo o autor|de acordo com|com base n|observe|analise|leia)"
)



def limpar(texto: str) -> str:
    linhas = []
    for linha in texto.split("\n"):
        s = " ".join(linha.split())
        if not s or RE_CABECALHO.search(s):
            continue
        linhas.append(s)
    return " ".join(linhas).strip()


def sem_acento(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def classificar(texto: str) -> str:
    base = texto.lower()
    pontos = {m: 0 for m in MATERIAS}
    for materia, chaves in PALAVRAS.items():
        for chave in chaves:
            if chave in base:
                pontos[materia] += 1
    # inglês só quando o enunciado é majoritariamente em inglês
    if pontos["Inglês"] == 0 and re.search(r"\b(the|of|and|is|are|what|which)\b", base):
        ingles = len(re.findall(r"\b(the|of|and|is|are|to|in|for|with|what|which|that)\b", base))
        if ingles >= 6:
            pontos["Inglês"] += 3
    melhor = max(pontos, key=lambda m: pontos[m])
    return melhor if pontos[melhor] > 0 else "Português"


def ler_gabarito(caminho: str) -> dict[int, str]:
    doc = pymupdf.open(caminho)
    texto = "\n".join(p.get_text() for p in doc)
    respostas: dict[int, str] = {}

    # Formato "01: D"
    for numero, letra in re.findall(r"(?m)^\s*(\d{1,3})\s*[:\-]\s*([A-E])\s*$", texto):
        n = int(numero)
        if 1 <= n <= 50 and n not in respostas:
            respostas[n] = letra
    if len(respostas) >= 40:
        return respostas

    # Formato tabela: número em uma linha, letra na seguinte
    linhas = [" ".join(l.split()) for l in texto.split("\n")]
    for i, linha in enumerate(linhas):
        if re.fullmatch(r"\d{1,3}", linha):
            n = int(linha)
            if 1 <= n <= 50:
                for j in range(i + 1, min(i + 3, len(linhas))):
                    if re.fullmatch(r"[A-E]", linhas[j]):
                        respostas.setdefault(n, linhas[j])
                        break
    if len(respostas) >= 40:
        return respostas

    # Formato em linha única: "1 B C1"
    for numero, letra in re.findall(r"(?m)^\s*(\d{1,3})\s+([A-E])\b", texto):
        n = int(numero)
        if 1 <= n <= 50:
            respostas.setdefault(n, letra)
    return respostas


def texto_pagina(pagina) -> str:
    """Lê a página respeitando as duas colunas usadas nas provas antigas."""
    blocos = [b for b in pagina.get_text("blocks") if b[4].strip()]
    if not blocos:
        return ""
    meio = pagina.rect.width / 2
    estreitos = sum(1 for b in blocos if (b[2] - b[0]) < pagina.rect.width * 0.55)
    if estreitos < len(blocos) * 0.6:
        return pagina.get_text(sort=True)
    esquerda = sorted([b for b in blocos if (b[0] + b[2]) / 2 < meio], key=lambda b: b[1])
    direita = sorted([b for b in blocos if (b[0] + b[2]) / 2 >= meio], key=lambda b: b[1])
    return "\n".join(b[4] for b in esquerda + direita)


def extrair_questoes(caminho: str) -> list[dict]:
    doc = pymupdf.open(caminho)
    texto = "\n".join(texto_pagina(p) for p in doc)
    # provas modernas usam "Questão 08"; as mais antigas usam "8." no início da linha
    marcas = list(RE_QUESTAO_ROTULO.finditer(texto))
    if len(marcas) < 20:
        marcas = list(re.finditer(r"(?m)^\s*(\d{1,2})\s*[\.\)]\s+", texto))
    blocos: dict[int, str] = {}
    for i, m in enumerate(marcas):
        numero = int(m.group(1))
        if not 1 <= numero <= 50:
            continue
        fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(texto)
        bloco = texto[m.end():fim]
        # mantém o bloco mais completo quando o número aparece repetido
        if len(bloco) > len(blocos.get(numero, "")):
            blocos[numero] = bloco

    questoes = []
    for numero, bloco in sorted(blocos.items()):
        partes = RE_ALT.split(bloco)
        if len(partes) < 11:  # enunciado + 5 pares (letra, texto)
            continue
        enunciado = limpar(partes[0])
        # as alternativas podem vir fora de ordem (provas antigas em duas colunas)
        achadas: dict[str, str] = {}
        for k in range(1, len(partes) - 1, 2):
            letra = partes[k]
            achadas.setdefault(letra, limpar(partes[k + 1]))
        if set("ABCDE") - set(achadas):
            continue
        alternativas = [achadas[l] for l in "ABCDE"]
        # uma alternativa pode "engolir" o texto de apoio da próxima questão
        alternativas = [limpar_ultima(a, alternativas[:i] + alternativas[i + 1:])
                        for i, a in enumerate(alternativas)]
        if not enunciado or any(not a for a in alternativas):
            continue
        if len(enunciado) < 25 or len(enunciado) > 1200:
            continue
        questoes.append({
            "numero": numero,
            "enunciado": enunciado,
            "alternativas": alternativas,
            "autonoma": not RE_DEPENDENTE.search(enunciado),
        })
    return questoes


# Palavras que abrem o texto-base de uma questão ("Considere a tabela:").
RE_ABERTURA = re.compile(
    r"^(Considere|Observe|Analise|Leia|Sobre|Segundo|De acordo|A partir|Acerca|Com base|A respeito|Na figura|No texto|Seguindo|Diante|Perante)"
)


def limpar_ultima(ultima: str, demais: list[str]) -> str:
    """Remove o texto de apoio da próxima questão que vazou para uma alternativa."""
    media = sum(len(a) for a in demais) / max(1, len(demais))
    if len(ultima) > max(160, media * 2.5):
        m = re.search(r"[\.!?;](?=\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ“\"])", ultima)
        if m:
            return ultima[: m.end()].strip()
        return ""
    return cortar_vazamento(ultima)


def cortar_vazamento(alt: str) -> str:
    """Corta caudas que claramente abrem o texto-base da próxima questão
    (terminam com ':' ou começam com palavra de introdução)."""
    for m in re.finditer(r"[\.!?;](?=\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ“\"])", alt):
        cauda = alt[m.end():].strip()
        if not cauda:
            continue
        if cauda.endswith(":") or RE_ABERTURA.match(cauda):
            corte = alt[: m.end()].strip()
            if len(corte) > 1:
                return corte
    return alt


def main(entrada: str, saida: str) -> None:
    links = json.load(open(entrada, encoding="utf-8"))
    edicoes: dict[tuple[int, int], dict] = {}
    for item in links:
        chave = (item["ano"], item["semestre"])
        e = edicoes.setdefault(chave, {})
        tipo = item["tipo"].lower()
        if tipo.startswith("prova"):
            e["prova"] = item["file"]
        elif "retific" in tipo:
            e["gabarito"] = item["file"]
        else:
            e.setdefault("gabarito", item["file"])

    resultado = []
    for (ano, semestre), e in sorted(edicoes.items()):
        if "prova" not in e or "gabarito" not in e:
            print(f"{ano}/{semestre}: faltando arquivo", file=sys.stderr)
            continue
        questoes = extrair_questoes(e["prova"])
        gabarito = ler_gabarito(e["gabarito"])
        validas = 0
        for q in questoes:
            correta = gabarito.get(q["numero"])
            if not correta:
                continue
            resultado.append({
                "ano": ano,
                "semestre": semestre,
                "numero": q["numero"],
                "enunciado": q["enunciado"],
                "alternativas": q["alternativas"],
                "correta": "ABCDE".index(correta),
                "materia": classificar(q["enunciado"] + " " + " ".join(q["alternativas"])),
                "autonoma": q["autonoma"],
            })
            validas += 1
        print(f"{ano}/{semestre}: {validas} questões (gabarito {len(gabarito)})")

    json.dump(resultado, open(saida, "w", encoding="utf-8"), ensure_ascii=False)
    print("total:", len(resultado))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
