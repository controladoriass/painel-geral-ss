# O que falta em cada aba — Painel Geral S&S

**Uso:** documento único para o Rangel levar ao Dr. Kim numa reunião só.
Organizado **por aba do painel** (não por decisor), com **decisão pedida** e **quem decide** ao lado.

**Legenda de "quem decide":**
- 🟡 **Dr. Kim** — decisão de negócio, precisa dele
- 🟢 **Time** — cadastro/preenchimento no EasyJur ou formulário (comercial, advogados, RH)
- 🔵 **Controladoria (Rangel)** — decisão operacional que a controladoria toma
- ⚫ **TI/EasyJur** — bug ou ajuste no sistema

**Status:** ⬜ pendente · 🟨 em andamento · ✅ resolvido

---

## 🟦 Aba FINANCEIRO

| # | O que falta | Impacto no painel | Quem decide | Status |
|---|---|---|:--:|:--:|
| F1 | **Auditar plano "3.12.29 - Erro operacional" (R$ 41,7 mi)** — é o maior plano de despesa 2022-2026 mas o nome sugere plano-lixo (lançamentos errados). Precisa reclassificar caso a caso pra plano correto. | Despesa total infla em R$ 41,7 mi. Comparativo receita×despesa fica distorcido. | 🟡 Dr. Kim / 🔵 Yasmin executa | ⬜ |
| F2 | **Decidir tratamento de transferências e distribuição de lucro** — "Transferência Saída" R$ 35,7 mi + "Adiantamento Distr. Lucro" R$ 14,1 mi + "Distribuição de Lucro" R$ 7,6 mi. Não são despesa operacional pura. Entram no comparativo? Ficam separadas? | Comparativo receita fixa × despesa fixa hoje soma esses R$ 57,4 mi como despesa. | 🟡 Dr. Kim | ⬜ |
| F3 | **Confirmar separação de faturamento em 3 cards** (Mensal Recorrente / Êxito / Outros Honorários) — já implementado, só confirmar que é assim que ele quer ver. | Card principal da aba. | 🟡 Dr. Kim (confirmar) | 🟨 |
| F4 | **Rateio da assessoria mensal por cliente** — hoje só 6 de 30 clientes casaram por nome. Definir critério: ratear por **volume de processos** do contrato ou por **horas de timesheet**? | Card "quanto rende cada cliente da assessoria" fica pela metade. | 🟡 Dr. Kim (A5) | ⬜ |
| F5 | **Reajustes de assessoria** — formulário já publicado, só preencher histórico (cliente, valor antigo, valor novo, data, motivo). | Card "histórico de reajustes com variação %" fica vazio. | 🟢 Controladoria preenche form | ⬜ |
| F6 | **Bug EasyJur — filtro `data_pagamento` das despesas** — a API não respeita o filtro. Já contornado no coletor Python, mas reportar ao EasyJur pra corrigir. | Zero (contornado). Só higiene. | ⚫ EasyJur | ⬜ |

---

## 🟩 Aba PRODUÇÃO

| # | O que falta | Impacto no painel | Quem decide | Status |
|---|---|---|:--:|:--:|
| P1 | **Advogado técnico por processo** — hoje `list_processos` só devolve 2 responsáveis genéricos (Maiko/Kim). O advogado real fica em campo personalizado não filtrável pela API. Duas saídas: (a) popular `id_advogado` na capa dos processos, ou (b) aceitar medir produção por advogado só via timesheet. | "Novos processos por advogado" impossível hoje. Ranking de produtividade sai só por timesheet. | 🟡 Dr. Kim escolhe (a) ou (b) | ⬜ |
| P2 | **Timesheet histórico completo** — bug do EasyJur na API: `list_timesheets` ignora filtro de data quando várias chamadas rodam próximas (paralelas ou sequenciais rápidas). Coleta completa dos ~600k registros de 5 anos = 6.000 páginas 1-por-vez → inviável. | Timesheet do painel hoje é só últimos 30 dias. Análise histórica precisa usar o Painel de Produtividade separado (.xlsm). | ⚫ EasyJur (corrigir bug) | ⬜ |
| P3 | **Mapa advogado → time/equipe** — formulário já publicado, só preencher lista (advogado, time, líder). | Card "times por equipe" fica vazio (aparece stub). | 🟢 RH/Direção preenche form | ⬜ |
| P4 | **Definir o que conta como "petição produzida"** — EasyJur não tem contador de petição pronto. Opções: tag/tipo específica no timesheet, etapa de workflow, ou campo personalizado. | Card "petições por advogado/mês" hoje não existe. | 🟡 Dr. Kim | ⬜ |
| P5 | **Baixa automática de processos** (ele mesmo pediu) — automação no EasyJur pra encerrar quando processo é baixado no tribunal. Item de TI/EasyJur, não do painel. | Processos "ativos" no painel hoje incluem alguns já baixados no tribunal. | ⚫ EasyJur (automação) | ⬜ |
| P6 | **Vigências dos contratos mensais** — vários com `data_final` vencida mas status VIGENTE. EasyJur não encerra sozinho. | MRR infla. Card de assessoria mensal traz contratos que já acabaram. | 🟢 Financeiro revisa cadastro | ⬜ |
| P7 | **Contrato ITAGRES (nº 1699)** — está com valor R$ 0 mas VIGENTE. | Distorce ranking de assessoria mensal. | 🟢 Comercial corrige cadastro | ⬜ |

---

## 🟨 Aba COMERCIAL

| # | O que falta | Impacto no painel | Quem decide | Status |
|---|---|---|:--:|:--:|
| C1 | **593 oportunidades com valor zerado** (19% do total) — precisa comercial preencher `valor_total` no cadastro. | Somem do ranking de maiores propostas. Distorce funil por valor. | 🟢 Comercial preenche EasyJur | ⬜ |
| C2 | **Marcar oportunidade como "mensal"** — hoje só 176 estão classificadas mensal. Devem ser mais (assessorias que entraram como "único"). | Aba tem seção dedicada a assessorias mensais em prospecção, mas subdimensionada. | 🟢 Comercial marca classificação no EasyJur | ⬜ |
| C3 | **Metas por vendedor** — formulário já publicado, só preencher (vendedor, período, meta de propostas/valor/assessorias). | Cards "Meta × Realizado" e "Metas por vendedor" ficam vazios (aparecem stubs). | 🟢 Gestor comercial preenche form | ⬜ |
| C4 | **Atividade diária de prospecção** — formulário já publicado (data, vendedor, ligações, leads, reuniões, propostas). | Card "atividade acumulada por vendedor" fica vazio (aparece stub). | 🟢 Vendedores preenchem form todo dia | ⬜ |

---

## 🟥 Aba PROJETOS — em standby

| # | O que falta | Impacto no painel | Quem decide | Status |
|---|---|---|:--:|:--:|
| PJ1 | **Definir o que é "projeto"** — projetos consultivos do EasyJur (módulo Consultivo) ou projetos internos de gestão (não existem no EasyJur, vira formulário)? Ou os dois? | Aba não montada — aguarda decisão. | 🟡 Dr. Kim (A2) | ⬜ |
| PJ2 | **Head de carteira** — Dr. Kim quer padronizar comunicação e cadastro de demandas por cliente, com um "head" responsável por cada carteira. Definir se aparece no painel como (a) lista de clientes por head, (b) alertas operacionais, (c) formulário único de cadastro de demanda, ou combinação. | Aba não montada — aguarda decisão. | 🟡 Dr. Kim | ⬜ |

---

## ⚙️ Definições da Controladoria (não pedem Dr. Kim)

| # | Definição | Detalhe | Status |
|---|---|---|:--:|
| G1 | **Lista de planos de conta "fixos"** — quais despesas contam como fixas no comparativo receita fixa × despesa fixa (aluguel, salários, software, etc.). | 🔵 Rangel define | ⬜ |
| G2 | **Régua de "processo em carteira"** — hoje: Ativo + Baixado + Suspenso (padrão S&S). Confirmar se vale aqui. | 🔵 Rangel define | 🟨 (aplicado, revalidar) |
| G3 | **Frequência de atualização** — manual mensal? Diário automático? Semanal? Coleta EasyJur ainda é manual (só formulários rodam sozinhos a cada dia). | 🔵 Rangel define | ⬜ |
| G4 | **Escopo do formulário de faturamento** — Cadastro de Faturamento já publicado, mas definir o que entra (que tipos de lançamento, quem lança). | 🔵 Rangel define | 🟨 |

---

## 📋 Resumo pra reunião de 15 min com o Dr. Kim

**O que preciso da decisão dele em 6 pontos:**
1. **F1** — auditar R$ 41,7 mi do plano "Erro operacional" (reclassificar)
2. **F2** — como tratar transferência (R$ 35,7 mi) e distribuição de lucro (R$ 21,7 mi) no comparativo
3. **F4** — rateio da assessoria por cliente: por volume ou por horas?
4. **P1** — advogado técnico: popular na capa dos processos ou medir só por timesheet?
5. **P4** — o que conta como "petição produzida"?
6. **PJ1 + PJ2** — o que é "projeto" e como quer ver "head de carteira" no painel

**O que já está no ar e ele pode olhar:**
- Financeiro, Produção, Comercial: estruturalmente completos
- Link: https://controladoriass.github.io/painel-geral-ss/

**O que depende do time preencher (não é decisão dele):**
- Vendedores: 593 valores zerados + marcar assessorias como "mensal" + atividade diária + metas
- RH: mapa advogado → time
- Financeiro: revisar vigências de contrato + corrigir ITAGRES
- Controladoria: histórico de reajustes
