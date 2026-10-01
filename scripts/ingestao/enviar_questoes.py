"""Envia as questões extraídas para a tabela questoes_vestibulinho.

Uso: python3 scripts/ingestao/enviar_questoes.py /tmp/ing/questoes.json
Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.
"""
import json
import os
import sys

import requests

URL = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/questoes_vestibulinho"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates,return=minimal",
}

questoes = json.load(open(sys.argv[1], encoding="utf-8"))
enviadas = 0
for i in range(0, len(questoes), 200):
    lote = [
        {
            "ano": q["ano"],
            "semestre": q["semestre"],
            "numero": q["numero"],
            "materia": q["materia"],
            "enunciado": q["enunciado"][:2000],
            "alternativas": q["alternativas"],
            "correta": q["correta"],
            "autonoma": q["autonoma"],
        }
        for q in questoes[i:i + 200]
    ]
    r = requests.post(URL, headers=HEADERS, data=json.dumps(lote).encode("utf-8"), timeout=120)
    if r.status_code >= 300:
        print("erro", r.status_code, r.text[:300])
        break
    enviadas += len(lote)
print("enviadas:", enviadas)
