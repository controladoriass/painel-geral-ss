# Mapeamento EasyJur → Painel Geral Escritório Silva & Silva

> Documento-base do projeto. Cruza cada indicador pedido pelo Dr. Kim (msg 31/08/2026)
> com a fonte de dados real no EasyJur (API MCP), classificando em:
> **✅ TEM** (dado existe e é coletável) · **⚠️ PARCIAL** (existe mas precisa cruzamento/limpeza)
> · **❌ FALTA** (não existe no EasyJur → precisa formulário/processo novo).
>
> Base de dados: mesmo padrão dos painéis atuais (JSON gerado por nós → GitHub Pages).
> API EasyJur: **ativa** (enterprise, 573k req/mês restantes). Empresa id_empresa=110648.

---

## Retrato dos dados no EasyJur (volumes reais em 31/08/2026)

| Entidade | Total | Campos-chave para o painel |
|---|---:|---|
| **Oportunidades** (comercial) | 3.085 | numero, nome, `responsavel` (=vendedor), `status` (funil 1-5), `valor_total`, `data`, `data_atendimento`, `probabilidade`, cliente_info |
| **Receitas** (financeiro) | 23.402 | `tipo_receita` (plano de contas, ex "1.1.01 - Êxito"), `status` (A/P/C/V), datas (venc/comp/pgto), valores, id_contrato, aprovado, faturado |
| **Despesas** (financeiro) | 41.354 | `plano_contas` (ex "3.12.30 - Software"), datas, valores, id_fornecedor, id_centro_custo |
| **Timesheet** (produção) | 28.812 | `nome_responsavel`, `tempo_timesheet` (HH:MM:SS), `data_timesheet`, descricao, nome_cliente, `tipo_agenda` |
| **Processos** (produção) | 24.620 | advogado_info, area_info, `status_label`, `data_cadastro` (novos), `data_atualizacao`/`ultimo_andamento` (parados), valor_causa, contrato_info, grupo_info |
| **Contratos mensais** (VIGENTES) | 67 | numero, titulo, `valor`, id_cliente, id_advogado, data_inicio/final |
| **Áreas do direito** | 43 | id, nome |
| **Usuários** | 59 | id, nome, email, `tipo` (advogado/estagiario/colaborador/administrador/financeiro), OAB |

---

## ABA 1 — PROJETOS / CONTROLADORIA GERAL

| Indicador pedido | Fonte EasyJur | Status | Observação |
|---|---|:--:|---|
| Pipeline de projetos em andamento | `list_projetos` + `list_projeto_andamentos` (módulo Projetos Consultivos) | ⚠️ | EasyJur tem módulo "Projetos Consultivos". Precisa confirmar se os "projetos" que o Dr. quer = projetos consultivos, ou projetos internos de gestão (que não existem no EasyJur → formulário). **Perguntar ao Dr.** |
| Reajustes de assessoria mensal | `list_contratos` (classificacao=mensal) + histórico de `valor` | ⚠️ | Contratos mensais existem (67 vigentes). Mas o EasyJur não guarda histórico de reajuste (só o valor atual). Reajuste = precisamos registrar (formulário ou planilha de controle). |

**Veredito aba Projetos:** depende de esclarecer o que é "projeto". Provável mix de módulo Consultivo + controle manual de reajustes.

---

## ABA 2 — FINANCEIRO

| Indicador pedido | Fonte EasyJur | Status | Observação |
|---|---|:--:|---|
| Histórico de faturamento / ano | `list_receitas` (status=P, agrupar por ano de data_pagamento/competência) | ✅ | 23.402 receitas. Dá série anual completa. |
| Planos de contas | `tipo_receita` (receitas) + `plano_contas` (despesas) — catálogo dinâmico do escritório | ✅ | Já vem estruturado (ex "1.1.01 - Êxito", "2.1.08 - Reembolso", "3.12.30 - Software"). DRE por plano de contas é viável. |
| Fluxo de caixa futuro / próximos 6 meses | Receitas (status=A, data_vencimento futura) − Despesas (status=A, vencimento futuro) | ✅ | Contas a receber e a pagar em aberto por vencimento. Projeção de 6 meses direto. |
| Comparativo receita fixa × despesa fixa | Receitas de contratos mensais × despesas recorrentes (plano de contas fixos) | ⚠️ | Receita fixa = receitas de contrato `mensal`. Despesa fixa = precisa marcar quais planos de conta são "fixos" (aluguel, salários, software). Definir a lista de planos fixos com o financeiro. |
| Assessoria mensal × despesa fixa | Soma dos 67 contratos mensais vigentes × despesa fixa mensal | ✅ | Contratos mensais têm `valor`. Cruza com despesa fixa. |
| Separar êxitos dos clientes mensais? | `tipo_receita` id "1.1.01 - Êxito" vs receitas de contrato mensal | ✅ | **Sim, faz sentido e é possível.** O plano de contas já separa "Êxito" das demais. Recomendo abas/toggles separados. |
| Rateio da assessoria × áreas e advogados | Contrato mensal → processos vinculados → área/advogado | ⚠️ | Cruzamento indireto: contrato→processos (via contrato_info nos processos)→area_info/advogado_info. Dá para ratear por volume de processos ou por horas de timesheet do contrato. Definir critério de rateio. |
| Implantar formulário de faturamento | — | ❌ | Não é dado — é um processo. Criar formulário web (padrão Exitos/) para lançar faturamento. |
| Reajustes de assessorias mensais e horas extras | Contratos + timesheet de horas excedentes | ⚠️ | Horas extras: já calculamos hoje (relatórios de horas). Reajustes: controle manual. |

**Veredito aba Financeiro:** núcleo forte (faturamento, planos de conta, fluxo de caixa, receita×despesa) todo coletável. Pontos manuais: definição de "despesa fixa", critério de rateio, controle de reajustes.

---

## ABA 3 — PRODUÇÃO

| Indicador pedido | Fonte EasyJur | Status | Observação |
|---|---|:--:|---|
| Petições produzidas no mês; por advogado; por time | `list_timesheet` filtrando `tipo_agenda`/descrição de petição, OU `list_andamentos` tipo "Carga Interna" | ⚠️ | EasyJur **não tem** um contador nativo de "petição". Aproximações: (a) timesheet com tipo de tarefa "petição"; (b) andamentos internos; (c) workflow/etapas. **Precisa definir o que conta como "petição produzida".** Talvez formulário/tag. "Por time" não existe → precisa mapa advogado→time (formulário). |
| Processos novos; por advogado; por área | `list_processos` (data_cadastro no mês) + advogado_info + area_info | ✅ | Direto. `data_cadastro` = novo no escritório. |
| Total processos em carteira | `list_processos` (status=1 Ativo, +Baixado/Suspenso conforme régua) | ✅ | Já dominamos os filtros oficiais (Ativo+Baix+Susp). |
| Total timesheet registrado; por advogado | `list_timesheet` (soma tempo_timesheet por nome_responsavel) | ✅ | 28.812 registros. Exatamente o que o painel de produtividade já faz. |
| Total timesheet por cliente no mês + alerta acima da média | `list_timesheet` (soma por nome_cliente) + baseline móvel | ✅ | Alerta = comparar mês vs média dos N meses anteriores por cliente. |
| Processos grandes + acompanhamento tempo real; por área; alerta parado >30 dias | `list_processos` (valor_causa alto) + `data_atualizacao`/`ultimo_andamento` + area_info | ⚠️ | "Grande" = definir corte (valor_causa? lista curada?). "Parado >30d" = `data_atualizacao` ou último andamento. **"Tempo real" não é possível em painel estático** — será atualizado na frequência da coleta (ex diária/semanal), não instantâneo. Alinhar expectativa com o Dr. |
| Padronizar comunicação/cadastro de demandas + Head de carteira | — | ❌ | Processo organizacional, não dado. Fora do escopo do painel (é gestão). |
| Baixa automática de processos quando baixado no EasyJur | `update_processo` / automação | ❌ | É automação no EasyJur, não indicador de painel. Item separado. |

**Veredito aba Produção:** métricas quantitativas (processos novos, carteira, timesheet por adv/cliente, alertas) todas coletáveis. Pontos a definir: o que é "petição", mapa advogado→time, corte de "processo grande", e a expectativa de "tempo real".

---

## ABA 4 — COMERCIAL

| Indicador pedido | Fonte EasyJur | Status | Observação |
|---|---|:--:|---|
| Propostas enviadas na semana/mês, por vendedor | `list_oportunidades` (status=2 Proposta, por `responsavel`, por `data`) | ✅ | 3.085 oportunidades. `responsavel` = vendedor. Funil: 1=Briefing, 2=Proposta, 3=Negociação, 4=Fechado, 5=Recusado. |
| Valor dessas propostas | `valor_total` das oportunidades | ⚠️ | Campo existe, MAS nas amostras muitas vêm com `valor_total=0` (valor está no texto da descrição). **Precisa o comercial preencher o valor no campo certo** → formulário/orientação de cadastro. |
| Maiores propostas/oportunidades em aberto | `list_oportunidades` (status 1-3, ordenar por valor_total desc) | ⚠️ | Depende do valor_total estar preenchido (ver acima). |
| Propostas fechadas na semana/mês, por vendedor | `list_oportunidades` (status=4 Fechado, por responsavel, por data_encerramento) | ✅ | Direto. |
| Ligações feitas na semana/mês; leads; por vendedor | `list_agenda`/timesheet tipo_evento=LIGACAO, OU oportunidades novas (leads) | ⚠️ | Leads = oportunidades novas (status=1 Briefing) por período/responsável ✅. Ligações = só se registradas na agenda como LIGACAO — hoje provavelmente não são. **Precisa formulário/CRM de atividade comercial** para ligações. |
| Meta semanal/mensal; meta de assessorias mensais | — | ❌ | EasyJur não guarda metas. Precisa cadastro de metas (formulário/planilha) por vendedor/período. |
| Assessorias mensais em prospecção | `list_oportunidades` (classificacao/tipo = assessoria mensal, status 1-3) | ⚠️ | Oportunidade tem `classificacao`, mas nas amostras vinha "unico". Precisa o comercial marcar oportunidades de assessoria mensal com classificacao=mensal. |

**Veredito aba Comercial:** o funil (enviadas, fechadas, por vendedor, leads) é coletável ✅. Os furos são: **valor da proposta** (campo vazio), **ligações** (não registradas), **metas** (não existem). Todos resolvidos com formulário/disciplina de cadastro.

---

## RESUMO EXECUTIVO — o que falta no EasyJur (vira formulário)

Itens **❌ FALTA** ou **⚠️ que dependem de preenchimento** — candidatos ao formulário que o Dr. mencionou:

1. **Metas comerciais** (semanal/mensal, por vendedor, meta de assessorias) — não existe no EasyJur.
2. **Ligações / atividade comercial diária** — não registrada hoje.
3. **Valor da proposta** — campo existe mas vem zerado; orientar comercial a preencher `valor_total`.
4. **Classificação da oportunidade** (assessoria mensal vs avulso) — marcar no cadastro.
5. **Mapa advogado → time/equipe** — não existe estrutura de "time" no EasyJur.
6. **Definição de "petição produzida"** — sem contador nativo; definir critério (tag/tarefa).
7. **Histórico de reajustes de assessoria** — EasyJur só guarda valor atual.
8. **Lista de planos de conta "fixos"** (para receita fixa × despesa fixa) — definir com financeiro.
9. **Corte de "processo grande"** — definir critério (valor_causa mínimo ou lista curada).
10. **Formulário de faturamento** — processo a implantar (padrão Exitos/).

## O que já dá para montar HOJE (sem depender de ninguém)

- Financeiro: histórico de faturamento/ano, planos de conta (DRE), fluxo de caixa 6 meses, receita×despesa, êxito vs mensal, assessoria mensal (67 contratos).
- Produção: processos novos por adv/área, total carteira, timesheet por adv, timesheet por cliente + alertas, processos parados >30d, processos por valor_causa.
- Comercial: funil por vendedor (enviadas/fechadas/leads), evolução do pipeline.

## ACHADOS DA 1ª COLETA REAL (31/08/2026)

Dados já coletados e salvos em `dados/` (validados no painel):

- **Assessoria mensal:** 52 contratos vigentes = **R$ 280.169,80/mês** (anual projetado R$ 3,36 mi). Ticket médio R$ 5.493. ⚠️ Vários contratos com `data_final` vencida mas status ainda VIGENTE — revisar vigências.
- **Comercial:** 3.085 oportunidades. Funil: 994 Fechado (R$ 20,5 mi), 1.165 Proposta (R$ 19,8 mi), 639 Recusado, 236 Briefing, 49 Negociação. **593 (19%) com valor zerado.** 25 vendedores (top: Yasmin 486 fechadas, Vanessa Maragno 241, Bruna Vidal 150).
- **Produção:** carteira 16.761 ativos (24.622 total). Por área: Cível 7.087, Tributário 2.930, Trabalhista 1.440. **Parados >30d: 7.652 / >90d: 5.902.** Grandes: ≥1mi = 1.040, ≥500k = 1.574.

**⚠️ LIMITAÇÃO DA API descoberta na coleta (impacta a aba Produção):**
- **"Processos novos POR ADVOGADO" NÃO é filtrável** por `list_processos`: o campo `id_advogado` da capa só traz 2 responsáveis genéricos (Maiko=2001, Kim=471). O advogado técnico real fica num **campo personalizado não filtrável**. → Para quebrar produção por advogado individual precisamos de: (a) outra abordagem (timesheet por responsável, que funciona), ou (b) ajuste no EasyJur para popular id_advogado corretamente. **Novo item de formulário/processo.**
- Paginação do EasyJur é instável com datas repetidas (precisa dedup por id em múltiplas ordenações) — já tratado nos coletores.

## Pontos a confirmar com o Dr. Kim

- **"Tempo real"**: painel estático (GitHub Pages) atualiza na frequência da coleta (diária/semanal via agendamento), não instantâneo. Ok?
- **"Projetos"**: são projetos consultivos do EasyJur ou projetos internos de gestão?
- **Metas/ligações/valor de proposta**: confirmar que faremos formulário para o comercial preencher.
