# -*- coding: utf-8 -*-
"""
juntar_despesas.py — junta os parciais despesas_parcial_*.json num único
financeiro_despesas.json no formato que o app.js consome.
Uso: python scripts/juntar_despesas.py
"""
import json, glob
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DADOS = ROOT / "dados"

def main():
    parciais = sorted(DADOS.glob("despesas_parcial_*.json"))
    if not parciais:
        print("[!] nenhum despesas_parcial_*.json encontrado")
        return 1
    anos = {}          # ano -> {"total_pago":x,"qtd":n}
    por_plano = {}     # descricao -> soma
    por_mes = {}       # YYYY-MM -> soma
    for p in parciais:
        d = json.loads(p.read_text(encoding="utf-8"))
        for ano, v in (d.get("anos") or {}).items():
            a = anos.setdefault(ano, {"total_pago":0.0, "qtd":0})
            a["total_pago"] += v.get("total_pago",0) or 0
            a["qtd"] += v.get("qtd",0) or 0
        for desc, val in (d.get("por_plano") or {}).items():
            por_plano[desc] = por_plano.get(desc,0) + (val or 0)
        for m, val in (d.get("por_mes") or {}).items():
            por_mes[m] = por_mes.get(m,0) + (val or 0)
        print(f"  + {p.name}")

    # formato final
    despesas_por_ano = [
        {"ano": int(a), "total_pago": round(v["total_pago"],2), "qtd_pagamentos": v["qtd"]}
        for a,v in sorted(anos.items())
    ]
    despesas_por_plano = [
        {"descricao": d, "total_pago": round(v,2)}
        for d,v in sorted(por_plano.items(), key=lambda kv:-kv[1])
    ]
    # marca operacional (3.x = despesa operacional) vs nao-operacional (transferencias, 4.x/2.x)
    def is_op(desc): return str(desc).strip().startswith("3.")
    total_op = round(sum(v for d,v in por_plano.items() if is_op(d)),2)
    total_geral = round(sum(por_plano.values()),2)

    out = {
        "gerado_em": "2026-08-31",
        "fonte": "EasyJur list_despesas (status=P, por data_pagamento)",
        "total_operacional_3x": total_op,
        "total_geral": total_geral,
        "nao_operacional": round(total_geral-total_op,2),
        "despesas_por_ano": despesas_por_ano,
        "despesas_por_plano_de_contas": despesas_por_plano,
        "despesas_mensal": dict(sorted(por_mes.items())),
    }
    dest = DADOS / "financeiro_despesas.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] {dest.name} gerado")
    print(f"     operacional (3.x): R$ {total_op:,.0f} | geral: R$ {total_geral:,.0f}")
    for a in despesas_por_ano:
        print(f"     {a['ano']}: R$ {a['total_pago']:,.0f} ({a['qtd_pagamentos']} pagtos)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
