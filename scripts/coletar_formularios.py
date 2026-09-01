# -*- coding: utf-8 -*-
"""
coletar_formularios.py — puxa os dados das 4 abas da planilha Google
via API do Apps Script (?dados=1) e gera JSONs em dados/ para o painel.

Diferente da versão CSV (mais frágil), aqui usamos a mesma URL /exec do
backend, que retorna JSON com todas as abas de uma vez.

Uso:
    python scripts/coletar_formularios.py

Depois:
    python scripts/gerar_embed.py && python scripts/build.py
"""
import json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ROOT = Path(__file__).resolve().parent.parent
DADOS = ROOT / "dados"
DADOS.mkdir(exist_ok=True)

# URL /exec do Apps Script (mesma dos formulários).
APPS_URL = "https://script.google.com/macros/s/AKfycbzzyDRg7mQRoJRjp7sXY-r4UHpOvBuWXbQf2Bew87uOS6naMlNKwsarK9-mdXkUN1gQGw/exec"

def baixar_json():
    """Baixa o JSON de todas as abas via GET ?dados=1."""
    url = APPS_URL + "?dados=1"
    req = Request(url, headers={"User-Agent": "coletor-painel/1.0"})
    try:
        with urlopen(req, timeout=60) as r:
            texto = r.read().decode("utf-8-sig")
        return json.loads(texto)
    except HTTPError as e:
        print(f"  [!] HTTP {e.code}: {e.reason}")
    except URLError as e:
        print(f"  [!] URL erro: {e}")
    except json.JSONDecodeError as e:
        print(f"  [!] resposta não é JSON válido: {e}")
    return None

def to_float(v):
    if v is None or v == "": return 0.0
    try: return float(str(v).replace("R$","").replace(".","").replace(",",".").strip())
    except: return 0.0

def to_int(v):
    if v is None or v == "": return 0
    try: return int(float(str(v).replace(",",".").strip()))
    except: return 0

# ---------- Metas ----------
def processar_metas(linhas):
    if not linhas: return None
    # pega a linha mais recente por (vendedor, periodo, referência)
    metas = {}
    for l in linhas:
        k = (l.get("Vendedor",""), l.get("Período",""), l.get("Referência",""))
        metas[k] = l  # última linha vence
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
        v = str(l.get("Vendedor","")).strip()
        d = str(l.get("Data da Atividade","")).strip()[:10]
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
    mapa = {}  # última linha por advogado vence
    for l in linhas:
        adv = str(l.get("Advogado","")).strip()
        if not adv: continue
        mapa[adv] = {
            "advogado": adv, "time": str(l.get("Time / Equipe","")).strip(),
            "lider": str(l.get("Líder do Time","")).strip(),
            "situacao": str(l.get("Situação","ativo") or "ativo").strip().lower(),
        }
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
        cli = str(l.get("Cliente","")).strip()
        if not cli: continue
        reajustes.append({
            "cliente": cli,
            "numero_contrato": str(l.get("Nº Contrato","")).strip(),
            "data": str(l.get("Data do Reajuste","")).strip()[:10],
            "valor_anterior": to_float(l.get("Valor Anterior (R$)")),
            "valor_novo": to_float(l.get("Valor Novo (R$)")),
            "variacao_pct": to_float(l.get("Variação (%)")),
            "indice": str(l.get("Índice","")).strip(),
            "motivo": str(l.get("Motivo","")).strip(),
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
    print(f"[..] baixando dados do Apps Script...")
    resp = baixar_json()
    if not resp:
        print("[erro] falha ao baixar. Confira APPS_URL e se o doGet aceita ?dados=1.")
        return 1
    if not resp.get("ok"):
        print(f"[erro] resposta com ok=false: {resp}")
        return 1
    abas = resp.get("abas") or {}
    print(f"[ok] recebido: {', '.join(k+'='+str(len(v)) for k,v in abas.items())}")

    total_ok = 0
    for chave in ["metas","atividade","times","reajustes"]:
        linhas = abas.get(chave) or []
        if not linhas:
            print(f"  [{chave}] sem dados (aba vazia ou inexistente)")
            continue
        resultado = PROCESSADORES[chave](linhas)
        if not resultado:
            continue
        resultado["gerado_em"] = resp.get("gerado_em","")
        out = DADOS / f"formularios_{chave}.json"
        out.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  [{chave}] {len(linhas)} linhas -> {out.name}")
        total_ok += 1

    print(f"\n[ok] {total_ok}/4 arquivos gerados.")
    if total_ok:
        print("     rode: python scripts/gerar_embed.py && python scripts/build.py")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
