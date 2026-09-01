# -*- coding: utf-8 -*-
"""
gerar_embed.py — Lê os JSONs de dados/ e gera src/data-embed.js
para que o index.html funcione offline (duplo-clique, sem servidor).

Uso: python scripts/gerar_embed.py  (rodar ANTES de build.py)

Mapa chave->arquivo (as mesmas chaves que app.js consome via window.DADOS_EMBED):
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DADOS = ROOT / "dados"
SRC = ROOT / "src"

MAPA = {
    "mrr": "financeiro_assessoria_mensal.json",
    "receitas": "financeiro_receitas.json",
    "despesas": "financeiro_despesas.json",
    "comercial": "comercial_funil.json",
    "producao": "producao_processos.json",
    # dados vindos dos formulários web (planilha Google → coletar_formularios.py)
    "form_metas":     "formularios_metas.json",
    "form_atividade": "formularios_atividade.json",
    "form_times":     "formularios_times.json",
    "form_reajustes": "formularios_reajustes.json",
    # detalhes para drill-down (rastreabilidade/auditoria via drawer)
    "detalhe_contratos":            "detalhe_contratos_mensais.json",
    "detalhe_vendedores":           "detalhe_vendedores.json",
    "detalhe_top_oportunidades":    "detalhe_top_oportunidades.json",
    "detalhe_planos_receita":       "detalhe_planos_receita.json",
    "detalhe_planos_despesa":       "detalhe_planos_despesa.json",
    "detalhe_processos_por_area":   "detalhe_processos_por_area.json",
}

def main():
    embed = {}
    faltando = []
    for chave, nome in MAPA.items():
        p = DADOS / nome
        if p.exists():
            embed[chave] = json.loads(p.read_text(encoding="utf-8"))
        else:
            faltando.append(nome)
    js = "window.DADOS_EMBED = " + json.dumps(embed, ensure_ascii=False) + ";\n"
    (SRC / "data-embed.js").write_text(js, encoding="utf-8")
    print(f"[ok] data-embed.js gerado com {len(embed)} conjunto(s): {', '.join(embed.keys()) or '(nenhum)'}")
    if faltando:
        print(f"     ainda em coleta / faltando: {', '.join(faltando)}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
