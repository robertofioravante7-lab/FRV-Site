"""Consulta o Jev (TypeSafe) a partir de um arquivo JSON.

Uso:  python jev_consulta.py <arquivo.json>
O JSON deve ter: {"state": "<contexto em texto>", "questions": {<nome>: {"type": "noul|choice|score", "instructions": "...", "criteria": "...", "options": [...]}}}
Imprime as respostas do Jev em JSON.

A chave vem do arquivo apontado pela variavel de ambiente TYPESAFE_ENV
(o typesafe.env de casa; configure uma vez: setx TYPESAFE_ENV "<caminho>").
O caminho da maquina nao mora neste repositorio (o repositorio e publico).
"""
import json, os, sys, urllib.request, urllib.error

ENV = os.environ.get("TYPESAFE_ENV", "")
if not ENV:
    print("ERRO: variavel TYPESAFE_ENV nao definida (aponte pro typesafe.env de casa)"); sys.exit(1)
key = None
for linha in open(ENV, encoding="utf-8"):
    linha = linha.strip()
    if linha.startswith("TYPESAFE_API_KEY="):
        key = linha.split("=", 1)[1].strip().strip('"').strip("'")
if not key:
    print("ERRO: TYPESAFE_API_KEY nao encontrada em", ENV); sys.exit(1)

with open(sys.argv[1], encoding="utf-8") as f:
    dados = json.load(f)

body = json.dumps({"model": "jev-latest", "state": dados["state"], "questions": dados["questions"]}).encode()
req = urllib.request.Request(
    "https://api.typesafe.ai/v1/systemone",
    data=body, method="POST",
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        out = json.loads(resp.read().decode())
except urllib.error.HTTPError as e:
    print("Jev HTTP", e.code, e.read().decode()[:500]); sys.exit(1)
print(json.dumps(out.get("answers", {}), ensure_ascii=False, indent=2))
