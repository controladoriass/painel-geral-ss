# Painel Geral do Escritório — Silva & Silva Advogados

Painel gerencial consolidado do escritório, uso interno da Controladoria.
Quatro visões: **Financeiro · Produção · Comercial · Projetos**.

Dados extraídos do EasyJur OS e atualizados periodicamente. Mesmo padrão visual dos
painéis [gerencial](https://controladoriass.github.io/painel-gerencial-ss/) e
[jurídico](https://controladoriass.github.io/dashboard-juridico/).

## Como funciona

- Fonte em `src/` (template + CSS + JS). O `index.html` da raiz é **gerado** — não editar à mão.
- Os dados agregados são coletados do EasyJur para `dados/*.json`, embutidos no `index.html`
  via `data-embed.js` (funciona offline por duplo-clique).

## Atualização mensal

```bash
python scripts/gerar_embed.py   # dados/*.json  -> src/data-embed.js
python scripts/build.py         # src/*         -> index.html
git add -A && git commit -m "att mensal" && git push
```

## Estrutura

```
src/            fontes (index.template.html, styles/, scripts/, data-embed.js)
scripts/        build.py, gerar_embed.py
dados/          JSONs agregados do EasyJur (working files, fora do Pages)
docs/           mapeamento-easyjur.md (indicadores × campos do EasyJur)
```

## Status por aba

| Aba | Situação |
|---|---|
| Financeiro | Assessoria mensal, faturamento/ano e planos de conta coletados. Fluxo de caixa e receita×despesa fixa dependem de definição do financeiro. |
| Produção | Carteira, novos, parados e grandes coletados. Petições e "por advogado individual" pendentes (ver docs). |
| Comercial | Funil e vendedores coletados. Metas, ligações e valor de proposta viram formulário. |
| Projetos | Aguardando definição de escopo com a direção. |

Ver `docs/mapeamento-easyjur.md` para o detalhamento fonte-a-fonte.
