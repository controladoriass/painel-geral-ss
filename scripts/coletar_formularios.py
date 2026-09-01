# -*- coding: utf-8 -*-
"""
coletar_formularios.py — puxa os dados das 4 abas da planilha Google
(preenchida pelos formulários web) e gera JSONs em dados/ para o painel.

Modelo: cada aba da planilha é publicada como CSV público (Arquivo →
Compartilhar → Publicar na Web → escolher a aba → CSV). Cada aba tem uma URL
única terminada em `output=csv`. Coloque as URLs no dicionário ABAS_CSV.

Uso:
    python scripts/coletar_formularios.py

Depois:
    python scripts/gerar_embed.py && python scripts/build.py
"""
import csv, io, json
from pathlib import Path
from urllib.request import urlopen
from urllib.error import URLError

ROOT = Path(__file__).resolve().parent.parent
DADOS = ROOT / "dados"
DADOS.mkdir(exist_ok=True)

# COLE aqui a URL "publicar na web → CSV" de CADA ABA da planilha
# "Painel Geral - Dados". Deixe "" para pular a aba (o coletor ignora).
ABAS_CSV = {
    "metas":     "",  # aba Metas
    "atividade": "",  # aba Atividade
    "times":     "",  # aba Times
    "reajustes": "",  # aba Reajustes
}

def baixar(url):
    if not url:
        return None
    try:
        with urlopen(url, timeout=30) as r:
            return r.read().decode("utf-8-sig")
    except URLError as e:
        print(f"  [!] falhou baixar: {e}")
        return None

def ler_csv(texto):
    if not texto: return []
    return list(csv.DictReader(io.StringIO(texto)))

def to_float(v):
    if not v: return 0.0
    try: return float(str(v).replace("R$","").replace(".","").replace(",",".").strip())
    except: return 0.0

def to_int(v):
    if not v: return 0
    try: return int(float(str(v).replace(",",".").strip()))
    except: return 0

# ---------- Metas ----------
def processar_metas(linhas):
    """Formato p/ o painel: por_vendedor_periodo (usa a meta mais recente por vendedor)."""
    if not linhas: return None
    # pega a linha mais recente por (vendedor, periodo, referência)
    metas = {}
    for l in linhas:
        k = (l.get("Vendedor",""), l.get("Período",""), l.get("Referência",""))
        metas[k] = l  # sobrescreve — última linha da planilha vence
    lst = []
    for (vend, per, ref), l in metas.items():
        if not vend: continue
        lst.append({
            "vendedor": vend, "periodo": per, "referencia": ref,
            "meta_propostas_qtd": to_int(l.get("Meta Propostas (nº)")),
            "meta_propostas_valor": to_float(l.get("Meta Propostas (R$)")),
            "meta_assessorias": to_int(l.get("Meta Assessorias Mensais")),
            "meta_ligacoes": to_int(l.get("Meta Ligações")),
            "meta_leads": to_int(l.get("Meta Leads")),
        })
    return {"metas": lst, "qtd_registros": len(linhas)}

# ---------- Atividade ----------
def processar_atividade(linhas):
    if not linhas: return None
    from collections import defaultdict
    por_vendedor = defaultdict(lambda: {"ligacoes":0,"leads":0,"reunioes":0,"propostas":0,"dias":0})
    por_dia = defaultdict(lambda: {"ligacoes":0,"leads":0,"reunioes":0,"propostas":0})
    for l in linhas:
        v = l.get("Vendedor",""); d = l.get("Data da Atividade","")
        if not v: continue
        pv = por_vendedor[v]
        pv["ligacoes"] += to_int(l.get("Ligações Realizadas"))
        pv["leads"] += to_int(l.get("Leads Novos"))
        pv["reunioes"] += to_int(l.get("Reuniões"))
        pv["propostas"] += to_int(l.get("Propostas Enviadas Hoje"))
        pv["dias"] += 1
        if d:
            pd = por_dia[d]
            pd["ligacoes"] += to_int(l.get("Ligações Realizadas"))
            pd["leads"] += to_int(l.get("Leads Novos"))
            pd["reunioes"] += to_int(l.get("Reuniões"))
            pd["propostas"] += to_int(l.get("Propostas Enviadas Hoje"))
    return {
        "por_vendedor": [dict(vendedor=k, **v) for k,v in por_vendedor.items()],
        "por_dia": dict(sorted(por_dia.items())),
        "qtd_registros": len(linhas),
    }

# ---------- Times ----------
def processar_times(linhas):
    if not linhas: return None
    from collections import defaultdict
    # pega o vínculo mais recente por advogado (última linha vence)
    mapa = {}
    for l in linhas:
        adv = l.get("Advogado","").strip()
        if not adv: continue
        mapa[adv] = {
            "advogado": adv, "time": l.get("Time / Equipe","").strip(),
            "lider": l.get("Líder do Time","").strip(),
            "situacao": (l.get("Situação","ativo") or "ativo").strip().lower(),
        }
    # agrupa por time
    por_time = defaultdict(list)
    for adv, info in mapa.items():
        if info["situacao"] != "inativo":
            por_time[info["time"]].append(adv)
    return {
        "advogados": list(mapa.values()),
        "por_time": {t: sorted(a) for t,a in sorted(por_time.items())},
        "qtd_registros": len(linhas),
    }

# ---------- Reajustes ----------
def processar_reajustes(linhas):
    if not linhas: return None
    reajustes = []
    for l in linhas:
        cli = l.get("Cliente","").strip()
        if not cli: continue
        reajustes.append({
            "cliente": cli, "numero_contrato": l.get("Nº Contrato","").strip(),
            "data": l.get("Data do Reajuste","").strip(),
            "valor_anterior": to_float(l.get("Valor Anterior (R$)")),
            "valor_novo": to_float(l.get("Valor Novo (R$)")),
            "variacao_pct": to_float(l.get("Variação (%)")),
            "indice": l.get("Índice","").strip(),
            "motivo": l.get("Motivo","").strip(),
        })
    reajustes.sort(key=lambda r: r["data"], reverse=True)
    return {"reajustes": reajustes[:50], "qtd_registros": len(linhas)}

PROCESSADORES = {
    "metas": processar_metas,
    "atividade": processar_atividade,
    "times": processar_times,
    "reajustes": processar_reajustes,
}

def main():
    ok = 0
    for chave, url in ABAS_CSV.items():
        if not url:
            print(f"  [pular] {chave} — URL não configurada em ABAS_CSV")
            continue
        print(f"  [{chave}] baixando…")
        texto = baixar(url)
        if texto is None:
            continue
        linhas = ler_csv(texto)
        print(f"           {len(linhas)} linhas na planilha")
        resultado = PROCESSADORES[chave](linhas)
        if resultado:
            out = DADOS / f"formularios_{chave}.json"
            resultado["gerado_em"] = "hoje"
            out.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"           → {out.name} salvo")
            ok += 1
    print(f"\n[ok] {ok}/{len(ABAS_CSV)} abas processadas.")
    if ok:
        print("     Rode em seguida: python scripts/gerar_embed.py && python scripts/build.py")

if __name__ == "__main__":
    raise SystemExit(main())
