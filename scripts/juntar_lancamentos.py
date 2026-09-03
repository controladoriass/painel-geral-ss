# -*- coding: utf-8 -*-
"""
juntar_lancamentos.py

Junta os blocos anuais coletados (receitas_YYYY, despesas_YYYY) num único
arquivo por tipo, indexado por plano de conta, pra alimentar o drill-down
"lancamentos por plano" do painel.

Uso: python scripts/juntar_lancamentos.py
"""
import json
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
BLOCOS = ROOT / "dados" / "blocos"
DADOS = ROOT / "dados"

def juntar(tipo):
    """tipo = 'receitas' ou 'despesas'"""
    blocos = sorted(BLOCOS.glob(f"lancamentos_{tipo}_*.json"))
    if not blocos:
        return None
    todos = []
    total_valor = 0
    anos = []
    for b in blocos:
        d = json.loads(b.read_text(encoding="utf-8"))
        for l in d.get("lancamentos", []):
            todos.append(l)
        total_valor += d.get("total_valor", 0) or 0
        anos.append(d.get("ano"))
        print(f"  + {b.name}: {d.get('qtd',0)} lancamentos")

    # indice por plano_desc (mais util pro drill do painel)
    por_plano = defaultdict(list)
    for l in todos:
        chave = l.get("plano_desc") or "Sem plano"
        por_plano[chave].append(l)

    # ordena cada plano por data desc
    for k, lst in por_plano.items():
        lst.sort(key=lambda x: str(x.get("data_pagamento","")), reverse=True)

    # Cria pasta específica pro tipo e escreve 1 arquivo por plano
    pasta_planos = DADOS / f"lancamentos_{tipo}_planos"
    pasta_planos.mkdir(exist_ok=True)
    # limpa arquivos antigos
    for f in pasta_planos.glob("*.json"):
        f.unlink()
    import hashlib
    indice = []
    for desc, lst in sorted(por_plano.items(), key=lambda kv: -sum(l.get("valor",0) or 0 for l in kv[1])):
        # hash curto do desc para nome de arquivo seguro (case unicode)
        h = hashlib.md5(desc.encode("utf-8")).hexdigest()[:12]
        arq = pasta_planos / f"{h}.json"
        arq.write_text(json.dumps({
            "descricao": desc,
            "qtd": len(lst),
            "total_valor": round(sum(l.get("valor",0) or 0 for l in lst), 2),
            "lancamentos": lst,
        }, ensure_ascii=False), encoding="utf-8")
        indice.append({
            "descricao": desc,
            "hash": h,
            "qtd": len(lst),
            "total_valor": round(sum(l.get("valor",0) or 0 for l in lst), 2),
        })

    # Indice pequeno (embutivel) — usado pelo painel pra saber qual arquivo carregar
    resultado_indice = {
        "gerado_em": "2026-09-03",
        "fonte": f"EasyJur list_{tipo} (status=P) - lancamentos individuais por plano",
        "tipo": tipo,
        "qtd_total": len(todos),
        "total_valor": round(total_valor, 2),
        "anos_cobertos": sorted(set(anos)),
        "pasta": f"dados/lancamentos_{tipo}_planos",
        "planos": indice,
    }
    dest = DADOS / f"lancamentos_{tipo}_indice.json"
    dest.write_text(json.dumps(resultado_indice, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] {dest.name}: {len(por_plano)} planos indexados, {len(todos)} lancamentos totais, R$ {total_valor:,.2f}")
    print(f"     {len(list(pasta_planos.glob('*.json')))} arquivos individuais em {pasta_planos.name}/")
    # apaga o arquivo grande antigo se existir
    antigo = DADOS / f"lancamentos_{tipo}.json"
    if antigo.exists():
        antigo.unlink()
        print(f"     [-] {antigo.name} antigo removido")
    return dest

def main():
    if not BLOCOS.exists():
        print("[!] pasta dados/blocos nao existe")
        return 1
    for tipo in ["receitas", "despesas"]:
        print(f"\n== {tipo.upper()} ==")
        r = juntar(tipo)
        if not r:
            print(f"  (nenhum bloco encontrado para {tipo})")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
