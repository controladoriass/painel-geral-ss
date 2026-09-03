# -*- coding: utf-8 -*-
"""
juntar_comercial_extras.py — gera dados/comercial_extras.json com:
  - assessorias mensais em prospecção (por vendedor + por etapa)
  - recorte por período (mês atual e semana atual, por vendedor)

Lê: dados/detalhe_oportunidades_completo.json
Executa a cada rebuild manual: python scripts/juntar_comercial_extras.py
"""
import json
from pathlib import Path
from collections import Counter, defaultdict
from datetime import date, timedelta

ROOT = Path(__file__).resolve().parent.parent
DADOS = ROOT / "dados"

def dparse(s):
    if not s:
        return None
    try:
        return date.fromisoformat(str(s)[:10])
    except Exception:
        return None

FECHADO = {"contrato assinado", "contrato-assinado", "contratoassinado", "fechado",
           "ganha", "ganho", "vencida (venda)"}
PERDIDO = {"nao contratado", "não contratado", "naocontratado", "perdido", "perdida",
           "recusado", "recusada", "cancelado", "cancelada", "vencida"}

def status_bucket(o):
    lbl = (o.get("status_label") or "").strip().lower()
    if not lbl:
        return "outros"
    if lbl in FECHADO: return "fechado"
    if lbl in PERDIDO: return "perdido"
    return "prospeccao"

def main():
    src = DADOS / "detalhe_oportunidades_completo.json"
    if not src.exists():
        print(f"[skip] {src} não existe — nada a gerar")
        return 0
    d = json.loads(src.read_text(encoding="utf-8"))
    op = d.get("oportunidades_completas") or d.get("oportunidades") or []

    mensais = [o for o in op if str(o.get("classificacao", "")).lower() == "mensal"]

    # === 1) Assessorias mensais ===
    total_mensais = len(mensais)
    por_status = Counter()
    for o in mensais:
        por_status[o.get("status_label") or o.get("status") or "(sem)"] += 1

    prosp = [o for o in mensais if status_bucket(o) == "prospeccao"]
    fech = [o for o in mensais if status_bucket(o) == "fechado"]
    perd = [o for o in mensais if status_bucket(o) == "perdido"]

    por_vend_prosp = Counter()
    prosp_detalhe = []
    for o in prosp:
        v = o.get("responsavel_nome") or "(sem)"
        por_vend_prosp[v] += 1
        prosp_detalhe.append({
            "id": o.get("id"),
            "numero": o.get("numero"),
            "nome": o.get("nome"),
            "cliente_nome": o.get("cliente_nome"),
            "responsavel_nome": v,
            "status_label": o.get("status_label"),
            "valor_total": o.get("valor_total") or 0,
            "data": o.get("data"),
        })
    prosp_detalhe.sort(key=lambda x: (x["responsavel_nome"] or "", x["nome"] or ""))

    assessorias = {
        "total_mensais": total_mensais,
        "em_prospeccao": len(prosp),
        "fechadas": len(fech),
        "recusadas": len(perd),
        "por_status": [{"label": k, "n": v} for k, v in por_status.most_common()],
        "por_vendedor_prospeccao": [
            {"vendedor": v, "n": n} for v, n in por_vend_prosp.most_common()
        ],
        "prospeccao_detalhe": prosp_detalhe,
    }

    # === 2) Recorte por período ===
    hoje = date.today()
    mes_ini = hoje.replace(day=1)
    sem_ini = hoje - timedelta(days=hoje.weekday())  # segunda

    # Criadas (data) e encerradas (data_encerramento)
    def bucket_oportunidade(o):
        d0 = dparse(o.get("data"))
        de = dparse(o.get("data_encerramento"))
        return d0, de

    def por_periodo(op_list, ini):
        criadas = [o for o in op_list if (dparse(o.get("data")) or date(1900,1,1)) >= ini]
        fechadas = [o for o in op_list if (dparse(o.get("data_encerramento")) or date(1900,1,1)) >= ini
                    and status_bucket(o) == "fechado"]
        recusadas = [o for o in op_list if (dparse(o.get("data_encerramento")) or date(1900,1,1)) >= ini
                     and status_bucket(o) == "perdido"]
        v_criadas = sum((o.get("valor_total") or 0) for o in criadas)
        v_fechadas = sum((o.get("valor_total") or 0) for o in fechadas)
        vend = defaultdict(lambda: {"criadas": 0, "fechadas": 0, "recusadas": 0, "valor_fechado": 0})
        for o in criadas:
            vend[o.get("responsavel_nome") or "(sem)"]["criadas"] += 1
        for o in fechadas:
            v = o.get("responsavel_nome") or "(sem)"
            vend[v]["fechadas"] += 1
            vend[v]["valor_fechado"] += (o.get("valor_total") or 0)
        for o in recusadas:
            vend[o.get("responsavel_nome") or "(sem)"]["recusadas"] += 1
        vend_list = [{"vendedor": k, **v} for k, v in vend.items()]
        vend_list.sort(key=lambda x: (-x["fechadas"], -x["criadas"], x["vendedor"]))
        return {
            "criadas": len(criadas),
            "fechadas": len(fechadas),
            "recusadas": len(recusadas),
            "valor_criadas": v_criadas,
            "valor_fechadas": v_fechadas,
            "por_vendedor": vend_list,
        }

    periodo = {
        "hoje": hoje.isoformat(),
        "mes": {
            "inicio": mes_ini.isoformat(),
            "rotulo": mes_ini.strftime("%Y-%m"),
            "todas": por_periodo(op, mes_ini),
            "mensais": por_periodo(mensais, mes_ini),
        },
        "semana": {
            "inicio": sem_ini.isoformat(),
            "rotulo": f"{sem_ini.isoformat()} → {hoje.isoformat()}",
            "todas": por_periodo(op, sem_ini),
            "mensais": por_periodo(mensais, sem_ini),
        },
    }

    out = {"assessorias_mensais": assessorias, "periodo": periodo}
    (DADOS / "comercial_extras.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[ok] comercial_extras.json gerado")
    print(f"     mensais: {total_mensais} (prospec: {len(prosp)}, fech: {len(fech)}, perd: {len(perd)})")
    print(f"     mes atual: {periodo['mes']['todas']['criadas']} criadas / {periodo['mes']['todas']['fechadas']} fechadas")
    print(f"     semana:    {periodo['semana']['todas']['criadas']} criadas / {periodo['semana']['todas']['fechadas']} fechadas")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
