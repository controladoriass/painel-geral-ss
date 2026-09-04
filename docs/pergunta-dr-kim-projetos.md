# Pergunta pro Dr. Kim — aba Projetos + Head de Carteira

**Formato:** pronto pra copiar e colar no WhatsApp. Tom direto, sem enrolação, do jeito que ele responde bem.

---

## Mensagem 1 — sobre "Projetos"

> Dr. Kim, sobre a aba **Projetos** do painel:
>
> Quando o Sr. fala "projetos em andamento", é:
>
> (a) **Projetos consultivos** — trabalhos com escopo/prazo/entregável (parecer, contrato, due diligence, etc.) que ficariam no módulo Consultivo do EasyJur
>
> (b) **Projetos internos** do escritório — iniciativas de gestão (implantar sistema, migrar processos, campanha de marketing, etc.)
>
> (c) **Os dois** — cada um numa sub-seção
>
> Precisa isso pra montar a aba certa. Só me responder a letra 👍

---

## Mensagem 2 — sobre "Head de Carteira / cadastro de demandas"

> Sobre o outro ponto que o Sr. mencionou — **head de carteira** e padronizar comunicação/cadastro de demandas dos clientes:
>
> O que o Sr. quer que apareça no painel?
>
> (a) **Lista de clientes por head** — quantos clientes cada head cuida, quantas demandas do mês, tempo médio de resposta
>
> (b) **Alertas operacionais** — processos "ativos" no EasyJur que já baixaram no tribunal (candidatos à baixa automática), demandas paradas há X dias sem resposta
>
> (c) **Formulário único de cadastro de demanda** — canal único onde qualquer pessoa registra "cliente X pediu Y por Z canal", e o painel conta por head/por canal/por tempo até resolver
>
> (d) **Tudo isso combinado**
>
> Se ainda não estiver decidido, tranquilo — só me sinaliza que a gente conversa quando for melhor.

---

## Contexto pro Rangel (não colar no WhatsApp — só pra você lembrar)

**Por que essas 2 perguntas destravam:**

- **Msg 1 (projetos)** define se a aba Projetos puxa dado do EasyJur (`list_projetos`) ou vira formulário próprio ou os dois. Sem essa resposta, qualquer estrutura montada vira retrabalho.

- **Msg 2 (head de carteira)** é um problema de **processo de trabalho** que ele quer resolver, não indicador puro. Painel só mostra sintomas — mas quais sintomas ele quer ver muda tudo.

**Depois que ele responder:**
- Se (a) consultivos: coletar `list_projetos` com trava (medir volume primeiro com `limit:10`)
- Se (b) internos: criar formulário `formularios/projetos/` no padrão dos outros 4
- Se (c) os dois: duas sub-seções na mesma aba
- Head de carteira provavelmente vira formulário próprio + card na aba
