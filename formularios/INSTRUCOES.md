# Formulários do Painel Geral — como colocar no ar

4 formulários web + 1 planilha Google + 1 Apps Script. Os formulários enviam via POST
para o Apps Script, que grava em abas da planilha. O painel puxa a planilha (como
CSV público) e mostra os dados nas abas certas.

```
Formulários (GitHub Pages, links fixos)
        │
        │  POST JSON
        ▼
Apps Script Web App (URL única /exec)
        │
        │  grava na aba correspondente
        ▼
Planilha Google "Painel Geral - Dados"
   ├─ aba "Metas"
   ├─ aba "Atividade"
   ├─ aba "Times"
   └─ aba "Reajustes"
        │
        │  publica cada aba como CSV público
        ▼
python scripts/coletar_formularios.py → dados/formularios_*.json
        │
        ▼
Painel Geral (controladoriass.github.io/painel-geral-ss)
```

---

## Parte 1 — Criar a planilha (uma só, 4 abas)

1. Vá em https://sheets.google.com → **Em branco**.
2. Renomeie a planilha para **"Painel Geral - Dados"**.
3. As abas (Metas, Atividade, Times, Reajustes) são criadas automaticamente pelo
   Apps Script no primeiro envio. Não precisa criar à mão.
4. Guarde a URL da planilha (você vai voltar aqui).

## Parte 2 — Publicar o Apps Script (backend)

1. Na planilha: **Extensões → Apps Script**.
2. Apague o código existente. **Cole o conteúdo de `Codigo-AppScript.gs`** (mesma pasta deste arquivo).
3. Disquete (**Salvar projeto**). Dê um nome tipo "Painel Geral - Backend".
4. Botão azul **Implantar → Nova implantação**.
5. Engrenagem (⚙️ "Selecionar tipo") → **App da Web**.
6. Configure:
   - **Descrição:** Painel Geral - Formulários
   - **Executar como:** *Eu (seu e-mail)*
   - **Quem pode acessar:** **Qualquer pessoa** ← obrigatório.
7. **Implantar** → autorize acesso (pode aparecer "app não verificado" → **Avançado → Acessar (nome) → Permitir**).
8. Copie a **URL do app da Web** (termina em `/exec`). É a URL única para os 4 formulários.

> **Teste:** cole essa URL no navegador. Deve mostrar
> `{"ok":true,"status":"online","abas":["metas","atividade","times","reajustes"]}`.

## Parte 3 — Ligar os 4 formulários à URL

Em cada um dos 4 arquivos `metas/index.html`, `atividade/index.html`,
`times/index.html`, `reajustes/index.html`, procure a linha:

```js
const APPS_SCRIPT_URL = "";
```

e cole a URL do Apps Script entre as aspas. Salve os 4.

> Enquanto `APPS_SCRIPT_URL` estiver vazio, o formulário roda em **MODO TESTE**
> (mostra sucesso mas NÃO grava). Útil para testar o visual.

## Parte 4 — Publicar os formulários no GitHub

Os formulários já estão na pasta `PAINEL 2/formularios/`, dentro do repo do painel
(`controladoriass/painel-geral-ss`). No próximo `git push`, o Pages publica sozinho:

**Links que ficarão fixos após o push:**

| Formulário | Link |
|---|---|
| **Índice / hub** | `https://controladoriass.github.io/painel-geral-ss/formularios/` |
| Atividade diária | `.../formularios/atividade/` |
| Metas comerciais | `.../formularios/metas/` |
| Times & equipes | `.../formularios/times/` |
| Reajustes | `.../formularios/reajustes/` |

Compartilhe o link do **índice** com o time — cada um clica no card do formulário que precisa.

## Parte 5 — Configurar o coletor Python

Para o painel puxar os dados da planilha, cada aba precisa ser **publicada como CSV público**:

1. Na planilha: **Arquivo → Compartilhar → Publicar na Web**.
2. Escolha **"Documento inteiro"** → clique **Publicar**. (Só o CSV; a planilha
   original NÃO fica pública para edição.)
3. Depois, para pegar a URL CSV de CADA aba:
   - Volte em **Arquivo → Compartilhar → Publicar na Web**.
   - Em "Conteúdo publicado", troque para **cada aba** (Metas, Atividade, Times, Reajustes).
   - Formato: **valores separados por vírgula (.csv)**.
   - Copie o link gerado — vai terminar em `output=csv&gid=NÚMERO`.
4. Abra `scripts/coletar_formularios.py` e cole cada URL no dicionário `ABAS_CSV`:
   ```python
   ABAS_CSV = {
       "metas":     "https://docs.google.com/…/pub?…output=csv&gid=…",
       "atividade": "https://docs.google.com/…/pub?…output=csv&gid=…",
       "times":     "https://docs.google.com/…/pub?…output=csv&gid=…",
       "reajustes": "https://docs.google.com/…/pub?…output=csv&gid=…",
   }
   ```
5. Rode:
   ```bash
   python scripts/coletar_formularios.py    # gera dados/formularios_*.json
   python scripts/gerar_embed.py            # embute no data-embed.js
   python scripts/build.py                  # regenera index.html
   git add -A && git commit -m "att formularios" && git push
   ```

## Manutenção mensal

Quando quiser atualizar o painel com os dados novos dos formulários:

```bash
cd "C:/Users/SNOT017/Documents/projetos claude/PAINEL 2"
python scripts/coletar_formularios.py
python scripts/gerar_embed.py
python scripts/build.py
git add -A && git commit -m "att mensal formularios" && git push
```

O Pages publica em ~1 min.

## Dúvidas comuns

- **Formulário não grava** → confira "Quem pode acessar" = **Qualquer pessoa** no
  Apps Script, e se a `APPS_SCRIPT_URL` no HTML termina em `/exec`.
- **Alterei o Apps Script** → **Implantar → Gerenciar implantações → editar (lápis)
  → Nova versão → Implantar.** A URL continua a mesma.
- **Preciso de novo campo** → adicione no `CABECALHO` da aba correspondente (dentro
  do `ABAS` no Apps Script), depois no `montarLinha_`, depois no HTML do formulário.
- **CSV não atualiza no coletor** → o Google demora ~5min para propagar mudanças no
  CSV público após um novo envio. Se testar recém, aguarde.
