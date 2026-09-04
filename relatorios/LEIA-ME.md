# Relatórios de ação — Painel Geral S&S

**Gerados em:** 03/09/2026 a partir de `dados/*.json` (última coleta EasyJur).
**Regerar:** `python scripts/gerar_planilhas_acao.py` (rebuild sem coleta).
**Formato:** CSV com BOM UTF-8 e separador `;` — abre direto no Excel BR.

---

## 🚨 3 achados que precisam de ação imediata

### 1. **R$ 153.424 de MRR travado em 28 contratos vencidos**
- Arquivo: [`contratos-vigencia-vencida.csv`](contratos-vigencia-vencida.csv)
- **O que é:** 28 contratos de assessoria mensal com `data_final < hoje` mas ainda marcados como VIGENTE no EasyJur (o sistema não encerra sozinho).
- **Impacto:** infla o MRR do painel, distorce ranking de clientes ativos.
- **Ação:** Financeiro revisar cada linha e decidir: renovar, encerrar, ou aditivo.
- **Casos mais graves (por dias vencido):** 2017/08 (Luiz Carlos Feitosa) vencido há 3.155 dias; VETOR há 1.429 dias; JOLITHI há 1.342 dias.

### 2. **825 processos com data absurda no cadastro** (typos)
- Arquivo: [`processos-com-data-absurda-corrigir.csv`](processos-com-data-absurda-corrigir.csv)
- **O que é:** processos com `data_distribuicao` ou `data_cadastro` em anos como `0012`, `0201`, `0202`, `1995` — typos de digitação que fazem o processo aparecer como "parado há 700 mil dias".
- **Impacto:** poluem qualquer análise de tempo/idade de processo. Escondem casos legítimos entre eles.
- **Ação:** Cadastro/TI limpar os 825 casos (buscar o número do processo, corrigir a data).

### 3. **7.286 processos parados >30 dias, concentrados em poucos clientes**
- Arquivos:
  - [`processos-parados-por-cliente.csv`](processos-parados-por-cliente.csv) — resumo por cliente (2.057 clientes)
  - [`processos-parados-top100-mais-antigos.csv`](processos-parados-top100-mais-antigos.csv) — 100 casos mais críticos (filtrado; sem os typos acima)
  - [`processos-parados-detalhado.csv`](processos-parados-detalhado.csv) — lista completa (7.286 linhas) para consulta
- **Top 5 clientes com mais processos parados:**
  1. MS INCORPORADORA — 282
  2. SILVA & SILVA ADVOGADOS ASSOCIADOS — 215 (o próprio escritório é o "cliente" — provavelmente carteira interna/gestão)
  3. CONSTRUTORA J.A. RUSSI — 159
  4. BINOTTO — 130
  5. VETOR/AMP — 112
- **Ação:** enviar cada bloco ao head de carteira / advogado responsável pelo cliente para triagem.

---

## ⚠️ Nota sobre limitação da API

Não conseguimos **agrupar por advogado** de forma útil porque o `list_processos` da API EasyJur só devolve 2 responsáveis genéricos (Maiko/Kim) — o advogado técnico real fica em campo personalizado não filtrável (item **P1** de `docs/o-que-falta-para-cada-aba.md`).
Por isso os relatórios estão agrupados por **cliente**, que é acionável — cada cliente tem um head/responsável no escritório.

---

## Como usar essas planilhas

1. **Abrir no Excel** — separador já configurado, acentuação preservada.
2. **Filtrar** por área/valor/dias parado conforme a triagem.
3. **Delegar** — cada bloco pode virar um e-mail: "Fulano, esses 15 processos do teu cliente X estão parados há mais de X dias".
4. **Baixar do repo** — as planilhas estão versionadas em `relatorios/` no GitHub, então qualquer atualização do painel gera nova versão.
