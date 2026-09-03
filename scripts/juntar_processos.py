# -*- coding: utf-8 -*-
"""
juntar_processos.py

Junta os blocos de processos ativos coletados por area num indice + arquivos
individuais por area (padrao dos lancamentos).

Uso: python scripts/juntar_processos.py
"""
import json, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOCOS = ROOT / "dados" / "blocos"
DADOS = ROOT / "dados"

def slug(s):
    return "".join(c.lower() if c.isalnum() else "-" for c in str(s)).strip("-")

def juntar_areas():
    blocos = sorted(BLOCOS.glob("processos_ativos_area_*.json"))
    if not blocos:
        print("[!] nenhum bloco de processos_ativos_area encontrado")
        return None
    pasta = DADOS / "processos_por_area"
    pasta.mkdir(exist_ok=True)
    for f in pasta.glob("*.json"):
        f.unlink()

    indice_areas = []
    todos_processos = []
    for b in blocos:
        d = json.loads(b.read_text(encoding="utf-8"))
        area_id = d.get("area_id")
        area_nome = d.get("area_nome") or f"Area {area_id}"
        procs = d.get("processos", []) or []
        # arquivo por area
        h = hashlib.md5(f"area-{area_id}".encode("utf-8")).hexdigest()[:12]
        arq = pasta / f"{h}.json"
        arq.write_text(json.dumps({
            "area_id": area_id,
            "area_nome": area_nome,
            "qtd": len(procs),
            "processos": procs,
        }, ensure_ascii=False), encoding="utf-8")
        indice_areas.append({
            "area_id": area_id,
            "area_nome": area_nome,
            "hash": h,
            "qtd": len(procs),
        })
        todos_processos.extend(procs)
        print(f"  + {b.name}: {len(procs)} processos")

    # indice pequeno
    idx = {
        "gerado_em": "2026-09-03",
        "fonte": "EasyJur list_processos (status=1) por area",
        "pasta": "dados/processos_por_area",
        "qtd_total": len(todos_processos),
        "areas": indice_areas,
    }
    (DADOS / "processos_por_area_indice.json").write_text(
        json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[ok] processos_por_area_indice.json: {len(indice_areas)} areas, {len(todos_processos)} processos totais")
    return todos_processos

def juntar_flag(nome_glob, chave_saida, descricao):
    """Junta blocos simples tipo processos_parados.json, processos_grandes.json"""
    blocos = sorted(BLOCOS.glob(nome_glob))
    if not blocos:
        print(f"[!] nenhum bloco {nome_glob}")
        return None
    todos = []
    for b in blocos:
        d = json.loads(b.read_text(encoding="utf-8"))
        procs = d.get("processos", []) or []
        todos.extend(procs)
        print(f"  + {b.name}: {len(procs)} processos")
    # dedup por id
    seen = set()
    unicos = []
    for p in todos:
        pid = p.get("id")
        if pid and pid not in seen:
            seen.add(pid); unicos.append(p)
    out = {
        "gerado_em": "2026-09-03",
        "descricao": descricao,
        "qtd": len(unicos),
        "processos": unicos,
    }
    dest = DADOS / f"{chave_saida}.json"
    dest.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"[ok] {dest.name}: {len(unicos)} processos unicos")
    return dest

def main():
    if not BLOCOS.exists():
        print("[!] pasta dados/blocos nao existe")
        return 1
    print("== PROCESSOS POR AREA ==")
    juntar_areas()
    print("\n== PROCESSOS PARADOS ==")
    juntar_flag("processos_parados_30d.json", "processos_parados", "Processos ativos sem movimentacao ha mais de 30 dias")
    print("\n== PROCESSOS GRANDES ==")
    juntar_flag("processos_grandes_500k.json", "processos_grandes", "Processos ativos com valor de causa >= R$ 500 mil")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
