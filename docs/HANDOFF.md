# HANDOFF — Painel Geral do Escritório (retomar após reset)

**Data:** 31/08/2026 · **Parou porque:** limite mensal de gastos da conta batido (429).
**Reseta:** 18:40 (horário de Brasília). Retomar depois disso.

## ONDE PARAMOS

Painel montado, 4 abas no padrão visual dos painéis atuais. **Falta 1 coisa para publicar:** coletar despesas.

### Dados coletados (em `dados/`, embutidos no index.html)
- ✅ `financeiro_assessoria_mensal.json` — 52 contratos, **R$ 280.169/mês** recorrente
- ✅ `financeiro_receitas.json` — faturamento OPERACIONAL (planos 1.x) **R$ 111,5 mi** 2022-2026. ⚠️ já separado das transferências internas (planos 2.x, R$ 47mi, que inflavam)
- ✅ `comercial_funil.json` — 3.085 oportunidades, funil, 25 vendedores, 593 com valor zerado
- ✅ `producao_processos.json` — 16.761 ativos, 7.652 parados >30d, alertas
- ❌ `financeiro_despesas.json` — **FALTA COLETAR** (41k registros; coletor descontrolou e estourou o limite)

## PRÓXIMOS PASSOS (na ordem)

1. **Coletar despesas** (após reset). NÃO usar subagente que delega — coletar direto e enxuto:
   - Para cada ano 2022-2026: `list_despesas` status="P", data_pagamento_inicio/fim do ano, page_size=100, paginar todas as páginas, somar `valores.valor` por ano e por `plano_contas.descricao`. Salvar em `dados/financeiro_despesas.json` (formato: despesas_por_ano[], despesas_por_plano_de_contas[], despesas_mensal{}).
   - ⚠️ Aplicar MESMA regra do faturamento: excluir planos de transferência interna se houver ("Transferência Saída" etc). Só despesa operacional.
   - MELHOR: fazer eu mesmo (não delegar), OU 1 subagente por ano com instrução rígida "não crie subagentes, não crie daemons/watchers, apenas pagine e some".
2. `python scripts/gerar_embed.py && python scripts/build.py`
3. Validar no browser (servidor: `cd "PAINEL 2" && python -m http.server 8777`, abrir http://127.0.0.1:8777)
4. Commit final.
5. **Publicar:** criar repo `controladoriass/painel-geral-ss` (PÚBLICO) e push. Comandos:
   - `gh repo create controladoriass/painel-geral-ss --public --source=. --remote=origin --push` (gh logado como Rangeljfs+controladoriass)
   - Ativar Pages (workflow já está em `.github/workflows/pages.yml`, publica sozinho no push da main)
6. **Mandar o link** ao Rangel: `https://controladoriass.github.io/painel-geral-ss/`
7. Depois: ajudar nas pendências (ver `docs/pendencias-e-decisoes.md`).

## ESTADO DO GIT
- Repo local inicializado, branch main. Commit inicial feito (33915c8).
- Falta: commitar a versão com receitas + faturamento operacional (feito nesta sessão após o commit inicial).
- `dados/` e `.claude/` são gitignored (não vão pro público; dados vão embutidos via data-embed.js).

## REGRAS APRENDIDAS (não repetir erro)
- Coleta pesada (20k+ registros): NÃO delegar para subagente que possa criar sub-processos. Estoura contexto e créditos. Fazer direto ou 1 agente/ano com trava.
- Faturamento real = planos "1.x" (operacional). Planos "2.x" = transferências/reembolsos, EXCLUIR.
- Ver `docs/mapeamento-easyjur.md` (fonte-a-fonte) e `docs/pendencias-e-decisoes.md` (o que levar ao Dr. Kim).
