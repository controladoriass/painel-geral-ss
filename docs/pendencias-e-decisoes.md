# Pendências e decisões — Painel Geral do Escritório

> Lista organizada do que falta para o painel ficar 100%. Dividido em:
> **(A)** decisões que dependem do Dr. Kim · **(B)** o que vira formulário para o time preencher ·
> **(C)** ajustes de cadastro/EasyJur · **(D)** o que a Controladoria (você) define.
>
> Marcar ✅ conforme resolver.

---

## (A) Decisões do Dr. Kim — perguntar

| # | Pergunta | Por que importa | Status |
|---|---|---|:--:|
| A1 | **"Tempo real" é aceitável ser periódico?** O painel é estático (GitHub Pages) e atualiza na frequência da coleta (ex.: diária ou semanal automática), não instantâneo ao vivo. | Ele pediu "acompanhamento em tempo real" de processos grandes/parados. Painel estático não faz isso instantâneo. Se exigir instantâneo de verdade, muda a arquitetura (precisa backend/servidor pago). | ⬜ |
| A2 | **O que é a aba "Projetos"?** São projetos consultivos do EasyJur (módulo Consultivo) ou projetos internos de gestão do escritório (que não existem no EasyJur)? | Define se a aba puxa dado ou vira controle manual/formulário. | ⬜ |
| A3 | **Separar êxitos dos clientes mensais?** (ele mesmo perguntou) — recomendo SIM, dá para separar pelo plano de contas ("1.1.01 - Êxito"). Confirmar que quer visões separadas. | Estrutura da aba Financeiro. | ⬜ |
| A4 | **Critério de "processo grande"** — usar valor da causa (ex.: ≥ R$ 1 milhão, já temos 1.040) ou uma lista curada de processos estratégicos escolhida a dedo? | Define o alerta de acompanhamento. | ⬜ |
| A5 | **Rateio da assessoria × áreas/advogados** — ratear por volume de processos do contrato ou por horas de timesheet? | Define o cálculo do rateio. | ⬜ |

---

## (B) Vira FORMULÁRIO (o time preenche, você mantém)

Dados que **não existem no EasyJur** e precisam de coleta própria. Sugestão: formulário web
no padrão do de Êxitos (pasta `Exitos/`), gravando em planilha Google.

| # | Formulário | Quem preenche | Campos | Alimenta |
|---|---|---|---|---|
| B1 | **Metas comerciais** | Gestor comercial | vendedor, período (semana/mês), meta de propostas, meta de valor, meta de assessorias mensais | Aba Comercial (meta vs realizado) |
| B2 | **Atividade de prospecção** | Cada vendedor | data, vendedor, nº ligações, nº leads novos | Aba Comercial (ligações/leads) |
| B3 | **Mapa advogado → time/equipe** | RH/Direção (1x, atualiza quando muda) | advogado, time/equipe, líder | Produção "por time" |
| B4 | **Reajustes de assessoria** | Controladoria | cliente, contrato, valor antigo, valor novo, data, motivo | Projetos/Financeiro (histórico de reajuste) |

> ⚠️ Observação: **valor da proposta** (B relacionado) já tem campo no EasyJur (`valor_total`),
> mas **593 oportunidades (19%) estão zeradas**. Melhor que criar formulário: **orientar o comercial
> a preencher o valor no cadastro do EasyJur**. Só criar formulário se a disciplina de cadastro não colar.

---

## (C) Ajustes de cadastro / EasyJur

| # | Ajuste | Motivo | Status |
|---|---|---|:--:|
| C1 | **Popular `id_advogado` real na capa dos processos** OU aceitar medir produção por advogado via **timesheet** | A API `list_processos` não permite filtrar "novos por advogado" — o advogado técnico está num campo personalizado não filtrável. Só aparecem 2 responsáveis genéricos (Maiko, Kim). | ⬜ |
| C2 | **Revisar vigências dos contratos mensais** | Vários contratos têm `data_final` vencida mas seguem status VIGENTE (EasyJur não encerra sozinho). Infla o MRR. | ⬜ |
| C3 | **Corrigir o contrato ITAGRES** (nº 1699) | Está com valor R$ 0 mas VIGENTE. | ⬜ |
| C4 | **Comercial preencher `valor_total`** das oportunidades | 593 zeradas → some do ranking de maiores propostas. | ⬜ |
| C5 | **Definir o que conta como "petição produzida"** | EasyJur não tem contador de petição. Opções: tag/tipo de tarefa no timesheet, ou etapa de workflow. | ⬜ |
| C6 | **Baixa automática de processos** (ele pediu) | Automação no EasyJur quando processo é baixado — item de TI/EasyJur, não do painel. | ⬜ |

---

## (D) Controladoria define (você)

| # | Definição | Detalhe | Status |
|---|---|---|:--:|
| D1 | **Lista de planos de conta "fixos"** | Para o comparativo receita fixa × despesa fixa: marcar quais planos de despesa são fixos (aluguel, salários, software, etc.). Sai da coleta de despesas por plano de contas. | ⬜ |
| D2 | **Régua de "carteira"** | Já temos: Ativo + Baixado + Suspenso (padrão dos outros painéis). Confirmar se vale aqui. | ⬜ |
| D3 | **Frequência de atualização** | Manual mensal? Ou agendar coleta automática (diária/semanal)? | ⬜ |
| D4 | **Formulário de faturamento** | Ele pediu "implantar formulário de faturamento". Definir escopo (o que lança, quem lança). | ⬜ |

---

## Resumo para a conversa com o Dr. Kim

**O que já está pronto e no ar:** Financeiro (assessoria mensal + faturamento/ano + planos de conta),
Produção (carteira, novos, parados, grandes), Comercial (funil + vendedores).

**Preciso da sua decisão em 5 coisas:** A1 (tempo real), A2 (o que é "projetos"), A3 (separar êxito),
A4 (o que é processo grande), A5 (como ratear assessoria).

**Vou montar formulários para:** metas comerciais, ligações, times dos advogados, reajustes.

**Pedidos ao time/EasyJur:** comercial preencher valor das propostas; revisar vigências dos contratos.
