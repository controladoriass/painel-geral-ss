# -*- coding: utf-8 -*-
"""
gerar_lista_clientes_publica.py — gera formularios/dados/clientes-assessoria-mensal.json
com a lista dos clientes de assessoria mensal (do EasyJur, sem dado sensível).

Serve para popular <select> em formulários (Reajustes, etc.) — evita erro de nome.

Rodar sempre que o refresh mensal do EasyJur trouxer novos contratos.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DADOS = ROOT / "dados"
OUT = ROOT / "formularios" / "dados"
OUT.mkdir(exist_ok=True)

def main():
    src = DADOS / "detalhe_contratos_mensais.json"
    if not src.exists():
        print(f"[erro] {src} não existe. Rode a coleta antes.")
        return 1
    d = json.loads(src.read_text(encoding="utf-8"))
    contratos = d.get("contratos", [])

    # De-duplica por (cliente_hint, id_cliente) — um cliente pode ter mais de um contrato
    seen = set()
    itens = []
    for c in contratos:
        cli = (c.get("cliente_hint") or "").strip()
        id_cli = c.get("id_cliente") or ""
        if not cli or cli == "—":
            # cai no título quando cliente_hint está vazio
            cli = (c.get("titulo") or "").strip() or f"(contrato {c.get('numero')})"
        key = (cli.upper(), str(id_cli))
        if key in seen:
            continue
        seen.add(key)
        itens.append({
            "cliente": cli,
            "id_cliente": id_cli,
            "numero_contrato": c.get("numero") or "",
            "valor_atual": c.get("valor") or 0,
            "vigencia_vencida": bool(c.get("vigencia_vencida")),
        })

    # Ordena por nome
    itens.sort(key=lambda x: x["cliente"].upper())

    out = {
        "gerado_em": d.get("gerado_em"),
        "descricao": "Lista pública de clientes com contrato de assessoria mensal — usada para popular selects em formulários.",
        "total": len(itens),
        "clientes": itens,
    }
    (OUT / "clientes-assessoria-mensal.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[ok] formularios/dados/clientes-assessoria-mensal.json ({len(itens)} clientes)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
