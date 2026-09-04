# Plano de continuidade — Painel Geral S&S

**Objetivo:** trabalhar em sessões que não estouram limite de API, não perdem trabalho quando a sessão morre, e retomam do ponto certo na próxima. Cada bloco abaixo é uma "sessão fechada" — entra, faz, salva, sai.

Este arquivo é o **checkpoint mestre**. Sempre atualizar no fim de cada sessão marcando ✅ / ⏸️ / ⬜ no bloco correspondente.

---

## Regras cravadas (evitar 3 erros que já cometemos)

1. **NUNCA coletar bruto EasyJur pesado (>2k regs) sem trava.**
   Coletor com `raise SystemExit` explícito por página. Nunca delegar pra subagente que cria subprocesso. `list_timesheets` proibido enquanto o bug de concorrência não for corrigido.
2. **SEMPRE fazer commit + push a CADA bloco fechado.**
   Mesmo que a próxima etapa dependa disso. Se a sessão morrer, o próximo Claude continua do último commit.
3. **SEMPRE agregar tool-results grandes em disco, não no chat.**
   `list_processos`/`list_receitas`/`list_despesas` retornam 60k+ chars/página → salvar cada página em `dados/blocos/<coleta>_pXX.json`, agregar via Python só no fim. Nunca ler bruto no contexto.
4. **NUNCA re-coletar dado já em disco.**
   Se `dados/xxx.json` existe e o Rangel não pediu refresh, usar o que tem.
5. **Formato de checkpoint padrão:** atualizar este arquivo + memory `projeto-painel-geral-escritorio.md` + commit "checkpoint: <o que fechou>" antes de encerrar sessão.

---

## SESSÃO A — Documento único de pendências (2ª a 3ª feira, ~30min)

**Objetivo:** produzir 1 documento para o Rangel levar ao Dr. Kim numa reunião só, formato "assunto → o que falta → quem decide". Zero coleta EasyJur. Zero código.

**Entregável:** `docs/o-que-falta-para-cada-aba.md`

**Passos:**
1. Reler `docs/pendencias-e-decisoes.md` (já existe, tem 5 pendências mapeadas)
2. Reler `docs/mapeamento-easyjur.md` (status de cada indicador)
3. Escrever tabela única "Aba → Item → Falta o quê → Quem decide" (~30 linhas)
4. Commit + push
5. Marcar ✅ neste plano

**Risco de estourar:** ~0 (só leitura + escrita local)

**Estado:** ✅ 03/09/2026 — entregue em `docs/o-que-falta-para-cada-aba.md` (visão por aba, com decisor ao lado, 6 pontos-chave pro Dr. Kim no resumo). Bloco G (auditoria financeira) absorvido como itens F1 e F2 do mesmo doc.

---

## SESSÃO B — Aba Projetos: montar a pergunta pro Dr. Kim (10min)

**Objetivo:** produzir 1 mensagem curta e clara pro Rangel copiar no WhatsApp do Dr. Kim, com as 2 perguntas que destravam a aba Projetos.

**Entregável:** `docs/pergunta-dr-kim-projetos.md` (só a mensagem, formato pronto pra WhatsApp)

**Passos:**
1. Escrever mensagem (3 parágrafos: "projetos = ?", "head de carteira = ?", "quando preferir")
2. Commit + push
3. Marcar ✅

**Risco de estourar:** ~0

**Estado:** ✅ 03/09/2026 — entregue em `docs/pergunta-dr-kim-projetos.md` (2 mensagens prontas pra WhatsApp, formato letra a/b/c).

---

## SESSÃO C — Ligar formulários que já estão publicados (varia)

**Objetivo:** conforme o Rangel/Dr. Kim/gestão preencherem os formulários (metas, atividade, times, reajustes), rodar `coletar_formularios.py` + rebuild + push. Aba Comercial/Produção/Financeiro passa a mostrar dado real no lugar dos stubs "aguardando formulário".

**Trigger:** Rangel avisar "já preencheram X"

**Passos:**
1. `python scripts/coletar_formularios.py` (baixa da API JSON do Apps Script — leve, ~10s)
2. `python scripts/gerar_embed.py && python scripts/build.py`
3. Verificar no browser localhost:8777
4. Commit "formulários: dados de <X>" + push
5. Marcar ✅

**Risco de estourar:** ~0 (só ler API leve + rebuild)

**Estado:** ⬜ (aguarda preenchimento externo)

> **Automação já ativa:** o workflow `.github/workflows/atualizar-formularios.yml` roda TODO DIA às 8h BR e faz isso sozinho. A sessão manual só é necessária se Rangel quiser antecipar.

---

## SESSÃO D — Ajustes de formulário antes de compartilhar (30min-1h)

**Objetivo:** Rangel quer revisar/ajustar os 4 formulários web ANTES de mandar link pro time. Pode ser layout, campos, textos.

**Trigger:** Rangel dizer "quero mexer no formulário X"

**Passos:**
1. Rangel diz o que quer mudar
2. Editar `formularios/<x>/index.html` (só o campo pedido) + eventualmente `Codigo-AppScript.gs` se mudar backend
3. Se mexeu no Apps Script: Rangel precisa colar o novo código no Editor de Apps Script + publicar nova versão
4. Commit + push
5. Marcar ✅

**Risco de estourar:** ~0

**Estado:** ⬜

---

## SESSÃO E — Aba Projetos com resposta do Dr. Kim (1-2h, uma sessão)

**Objetivo:** com a resposta em mãos, montar a aba Projetos completa. Uma sessão só, fechar de ponta a ponta.

**Trigger:** Rangel trazer resposta do Dr. Kim (das 2 perguntas)

**Cenários possíveis:**
- **Se "projetos consultivos" (EasyJur):** coletar `list_projetos` (volume desconhecido — MEDIR PRIMEIRO com 1 chamada `limit:10` → estimar total → se <500, coleta direta; se >500, coletor com trava)
- **Se "projetos internos":** criar formulário `formularios/projetos/` (padrão dos outros 4) + card na aba
- **Se "os dois":** duas sub-seções na mesma aba
- **Head de carteira:** provavelmente vira formulário `formularios/head-carteira/` mapeando cliente → head

**Passos:**
1. Ler resposta do Dr. Kim
2. Fazer 1 chamada `list_projetos` `limit:10` só pra ver estrutura e estimar volume
3. Escolher estratégia (formulário / coleta / mix)
4. Montar template + agregador + renderer no app.js (padrão das outras abas)
5. Rebuild + verificar no browser
6. Commit + push
7. Marcar ✅

**Risco de estourar:** MÉDIO se `list_projetos` for grande. Mitigação: coleta em blocos de 50 registros salvando cada bloco em disco.

**Estado:** ⬜ (aguarda resposta do Dr. Kim)

---

## SESSÃO F — Refresh mensal de dados EasyJur (2-3h, planejada)

**Objetivo:** re-coletar receitas + despesas + oportunidades + processos com dados novos do mês fechado. Uma vez por mês.

**Trigger:** virada de mês (ex: 01/10 pra fechar setembro)

**O que já temos coletado hoje:**
- assessoria mensal (52 contratos)
- receitas (~23k regs, R$ 111,5mi)
- despesas (~41k regs, split em blocos 2022-23 / 2024-25 / 2026)
- comercial (3.068 oportunidades)
- produção (16.761 processos ativos)

**Passos (só o que mudou):**
1. Rodar coletor de despesas do mês corrente APENAS (`dados/blocos/despesas_2026-XX.json`)
2. Idem receitas
3. Idem oportunidades (delta desde última coleta)
4. Reagregar via `juntar_despesas.py` + `juntar_lancamentos.py` + `juntar_comercial_extras.py`
5. Rebuild + verificar no browser
6. Commit "refresh <mês>/<ano>" + push
7. Marcar ✅ + atualizar data desta seção

**Risco de estourar:** MÉDIO — despesas do mês tem ~2k regs → coletor 1 página por vez sem paralelo. NUNCA rodar `list_timesheets` (bug).

**Estratégia anti-estouro:**
- Coletar em BACKGROUND (`run_in_background: true`) → sessão fica livre pra fazer outra coisa enquanto coleta
- Cada coletor salva página em `dados/blocos/` a cada 100 regs → se sessão morrer, próxima retoma do último bloco (contador em `dados/blocos/_progresso.json`)
- Checkpoint automático: coletor commita a cada 500 regs coletados

**Estado:** ⬜ (próximo trigger: 01/10/2026)

---

## SESSÃO G — Auditoria financeira (levar ao Dr. Kim, 15min)

**Objetivo:** o coletor já pegou 3 achados que precisam decisão de negócio. Preparar 1 documento curto pro Rangel levar ao Dr. Kim.

**Achados:**
- Plano `3.12.29 Erro operacional` = R$ 41,7M (plano-lixo, reclassificar)
- `Transferência Saída` R$ 35,8M — não é despesa operacional
- `Distribuição de Lucro` R$ 21,7M — não é despesa operacional

**Entregável:** `docs/auditoria-financeiro-para-dr-kim.md`

**Passos:**
1. Escrever 1 documento (3 tópicos, 1 recomendação por tópico)
2. Commit + push
3. Marcar ✅

**Risco de estourar:** ~0

**Estado:** ✅ 03/09/2026 — absorvido nos itens F1 e F2 de `docs/o-que-falta-para-cada-aba.md` (evita doc duplicado; tudo que o Dr. Kim precisa decidir fica num lugar só).

---

## Como retomar depois de morte de sessão

1. **Sempre** ler primeiro:
   - Este arquivo (ver o que está ⏸️ ou em andamento)
   - `memory/projeto-painel-geral-escritorio.md` (memória de contexto)
   - `git log --oneline -10` (últimos commits do repo)
2. Perguntar ao Rangel qual bloco atacar
3. Trabalhar 1 bloco por vez, fechar 100%, commitar, marcar ✅, encerrar
4. NUNCA começar 2 blocos ao mesmo tempo

---

## Anti-estouro de API

**Regras:**
- Coleta EasyJur pesada SEMPRE em `run_in_background: true`
- Cada coletor salva incrementalmente em `dados/blocos/*.json` (nunca só na memória)
- Se um coletor rodar >20min, matar (`TaskStop`), diagnosticar, relançar do último bloco
- Se sessão passar de ~60% do total_tokens, PARAR de coletar, salvar tudo, commit "checkpoint parcial", encerrar sessão. O Rangel abre outra pro próximo bloco.
- Contexto grande (>1MB de tool-result): NUNCA ler no chat, sempre agregar em disco via Python

**Sinais de que a sessão está pesada:**
- `<total_tokens>` caindo rápido (>5% por resposta)
- Rangel avisar "tá lento" ou "tá caro"
- Resposta demorando > 15s
- Bash background acumulando

**Reação:** salvar estado → commit "checkpoint" → dizer ao Rangel "vamos fechar esta sessão, próxima retoma daqui" → parar.
