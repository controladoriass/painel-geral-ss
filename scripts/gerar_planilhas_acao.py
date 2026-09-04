# -*- coding: utf-8 -*-
"""
gerar_planilhas_acao.py — gera CSVs de AÇÃO IMEDIATA para o time.
Não depende de nada externo, só dos JSONs que já temos.

Saídas em relatorios/:
  1. processos-parados-por-advogado.csv   — top parados por advogado
  2. processos-parados-detalhado.csv      — lista completa ordenada
  3. contratos-vigencia-vencida.csv       — contratos VIGENTE com data_final < hoje

Rodar: python scripts/gerar_planilhas_acao.py
"""
import csv
import json
from datetime import date, datetime
from pathlib import Path
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parent.parent
DADOS = ROOT / "dados"
OUT = ROOT / "relatorios"
OUT.mkdir(exist_ok=True)

def dparse(s):
    if not s: return None
    try: return date.fromisoformat(str(s)[:10])
    except: return None

def dias_desde(s):
    d = dparse(s)
    if not d: return None
    return (date.today() - d).days

def escrever_csv(nome, cabecalho, linhas):
    """Escreve CSV com BOM UTF-8 e separador ; (Excel BR)."""
    p = OUT / nome
    with open(p, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";", quoting=csv.QUOTE_MINIMAL)
        w.writerow(cabecalho)
        w.writerows(linhas)
    print(f"[ok] {p.relative_to(ROOT)}  ({len(linhas)} linhas)")

# ========================================================
# 1 e 2 — PROCESSOS PARADOS
# ========================================================
d = json.loads((DADOS / "processos_parados.json").read_text(encoding="utf-8"))
processos = d.get("processos", [])
print(f"processos parados (>30d sem movimentacao): {len(processos)}")

# Determinar "dias parado": pega data_atualizacao > ultimo_andamento > data_distribuicao > data_cadastro
def data_referencia(p):
    for campo in ("data_atualizacao", "ultimo_andamento", "data_distribuicao", "data_cadastro"):
        d0 = dparse(p.get(campo))
        if d0: return d0, campo
    return None, None

# Nota: o "advogado" da capa só devolve 2 valores (Maiko/Kim) — API bug P1.
# Agregar por CLIENTE (que é acionável para o head de carteira / gestor do cliente).
por_cli = defaultdict(list)
for p in processos:
    cli = p.get("cliente") or "(sem cliente)"
    dref, _ = data_referencia(p)
    dias = (date.today() - dref).days if dref else None
    por_cli[cli].append({
        "id": p.get("id"),
        "numero": p.get("numero"),
        "area": p.get("area_nome") or "",
        "valor_causa": p.get("valor_causa") or 0,
        "dias_parado": dias if dias is not None else 0,
        "ultima_ref": dref.isoformat() if dref else "",
    })

# Ordena clientes por qtd DESC
clis = sorted(por_cli.items(), key=lambda x: -len(x[1]))

# CSV RESUMO POR CLIENTE
linhas_resumo = []
for cli, procs in clis:
    dias_l = [pp["dias_parado"] for pp in procs if pp["dias_parado"]]
    linhas_resumo.append([
        cli,
        len(procs),
        max(dias_l) if dias_l else 0,
        round(sum(dias_l)/len(dias_l), 1) if dias_l else 0,
        sum(pp["valor_causa"] or 0 for pp in procs),
        sum(1 for pp in procs if (pp["valor_causa"] or 0) >= 1_000_000),
    ])

escrever_csv(
    "processos-parados-por-cliente.csv",
    ["Cliente", "Qtd processos parados", "Mais antigo (dias)", "Media de dias parados",
     "Valor total causa (R$)", "Qtd grandes (>= R$ 1 mi)"],
    linhas_resumo,
)

# CSV DETALHADO — ordena por dias_parado DESC
todos = []
for cli, procs in por_cli.items():
    for p in procs:
        todos.append((cli, p))
todos.sort(key=lambda x: -x[1]["dias_parado"])

linhas_det = []
for cli, p in todos:
    linhas_det.append([
        cli,
        p["numero"],
        p["area"],
        p["dias_parado"],
        p["ultima_ref"],
        p["valor_causa"] or 0,
        p["id"],
    ])

escrever_csv(
    "processos-parados-detalhado.csv",
    ["Cliente", "Numero processo", "Area", "Dias parado",
     "Ultima referencia", "Valor causa (R$)", "ID EasyJur"],
    linhas_det,
)

# Top 100 mais antigos (planilha enxuta pra reunião)
# Filtro: dias entre 30 e 3650 (10 anos) — descarta typos de cadastro (ano 0012/0201/0202)
# e processos legitimamente antigos que estão em coisa fora do curso normal.
def valido(dias):
    return isinstance(dias, int) and 30 <= dias <= 3650

linhas_top100 = [l for l in linhas_det if valido(l[3])][:100]
escrever_csv(
    "processos-parados-top100-mais-antigos.csv",
    ["Cliente", "Numero processo", "Area", "Dias parado",
     "Ultima referencia", "Valor causa (R$)", "ID EasyJur"],
    linhas_top100,
)

# Bonus: planilha SÓ dos casos com data absurda (typos de cadastro pra corrigir no EasyJur)
linhas_typos = [l for l in linhas_det if isinstance(l[3], int) and l[3] > 3650]
escrever_csv(
    "processos-com-data-absurda-corrigir.csv",
    ["Cliente", "Numero processo", "Area", "Dias parado (falso)",
     "Data cadastrada (ano errado)", "Valor causa (R$)", "ID EasyJur"],
    linhas_typos,
)

# ========================================================
# 3 — CONTRATOS COM VIGENCIA VENCIDA
# ========================================================
c = json.loads((DADOS / "detalhe_contratos_mensais.json").read_text(encoding="utf-8"))
contratos = c.get("contratos", [])
vencidos = [ct for ct in contratos if ct.get("vigencia_vencida")]
print(f"\ncontratos mensais total: {len(contratos)}, com vigencia vencida: {len(vencidos)}")

linhas_v = []
for ct in vencidos:
    df = dparse(ct.get("data_final"))
    dias_vencido = (date.today() - df).days if df else None
    linhas_v.append([
        ct.get("numero") or "",
        ct.get("cliente_hint") or "",
        ct.get("titulo") or "",
        ct.get("valor") or 0,
        ct.get("data_inicio") or "",
        ct.get("data_final") or "",
        dias_vencido if dias_vencido else "",
        ct.get("id") or "",
        ct.get("id_cliente") or "",
    ])
# ordena por dias vencido DESC (mais antigo primeiro)
linhas_v.sort(key=lambda r: -(r[6] if isinstance(r[6], int) else 0))

escrever_csv(
    "contratos-vigencia-vencida.csv",
    ["Numero contrato", "Cliente", "Titulo", "Valor mensal (R$)",
     "Data inicio", "Data final", "Dias vencido", "ID contrato", "ID cliente"],
    linhas_v,
)

print("\n=== RESUMO ===")
print(f"1. Clientes com processos parados: {len(clis)}")
print(f"   Top 5 clientes: {', '.join(f'{c[0][:30]} ({len(c[1])})' for c in clis[:5])}")
print(f"2. Processos parados detalhados: {len(todos)} linhas")
print(f"   Top 100 mais antigos salvo em planilha separada")
print(f"3. Contratos com vigencia vencida: {len(vencidos)}")
if vencidos:
    valor_vencido = sum((ct.get('valor') or 0) for ct in vencidos)
    print(f"   MRR travado em contratos vencidos: R$ {valor_vencido:,.0f}".replace(',', '.'))
