/* ============================================================
   app.js — Painel Geral do Escritório Silva & Silva
   Carrega os JSONs de dados/, preenche as 4 abas, navegação e tema.
   Funciona servido (fetch dados/*.json) e offline (window.DADOS_EMBED).
   ============================================================ */
(function(){
  'use strict';

  // ---------- utilidades ----------
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const fmtBRL = v => 'R$ ' + (v||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});
  const fmtBRLk = v => {
    v = v||0;
    if(v>=1e6) return 'R$ ' + (v/1e6).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + ' mi';
    if(v>=1e3) return 'R$ ' + Math.round(v/1e3).toLocaleString('pt-BR') + ' mil';
    return fmtBRL(v);
  };
  const fmtNum = v => (v||0).toLocaleString('pt-BR');

  // fontes de dados: cada arquivo JSON de dados/
  const ARQUIVOS = {
    mrr: 'dados/financeiro_assessoria_mensal.json',
    receitas: 'dados/financeiro_receitas.json',
    despesas: 'dados/financeiro_despesas.json',
    comercial: 'dados/comercial_funil.json',
    producao: 'dados/producao_processos.json'
  };

  async function carregar(chave){
    // tenta embed primeiro (offline), depois fetch
    if(window.DADOS_EMBED && window.DADOS_EMBED[chave]) return window.DADOS_EMBED[chave];
    try{
      const r = await fetch(ARQUIVOS[chave], {cache:'no-store'});
      if(!r.ok) return null;
      return await r.json();
    }catch(e){ return null; }
  }

  // renderiza lista de barras horizontais num container
  function barras(container, itens, {gold=false, max=null}={}){
    if(!container) return;
    if(!itens || !itens.length){ container.innerHTML = '<div class="stub">Sem dados.</div>'; return; }
    const mx = max || Math.max(...itens.map(i=>i.valor||0)) || 1;
    container.innerHTML = itens.map(i=>{
      const pct = Math.round(((i.valor||0)/mx)*100);
      return `<div class="hbar-row">
        <div class="hb-name" title="${i.nome}">${i.nome}</div>
        <div class="hbar-track"><div class="hbar-fill ${gold?'gold':''}" style="width:0" data-w="${pct}"></div></div>
        <div class="hb-val">${i.label||fmtNum(i.valor)}${i.sub?`<small>${i.sub}</small>`:''}</div>
      </div>`;
    }).join('');
    // anima
    requestAnimationFrame(()=>setTimeout(()=>{
      $$('.hbar-fill',container).forEach(f=>{ f.style.width = f.dataset.w+'%'; });
    },60));
  }

  function card(eyebrow, num, desc, hl=false){
    return `<div class="fin-card ${hl?'hl':''}">
      <div class="fc-eyebrow">${eyebrow}</div>
      <div class="fc-num">${num}</div>
      <div class="fc-desc">${desc}</div>
    </div>`;
  }

  // ---------- ABA FINANCEIRO ----------
  async function renderFinanceiro(){
    const mrr = await carregar('mrr');
    if(mrr){
      $('#fin-mrr-cards').innerHTML =
        card('Receita mensal recorrente', fmtBRLk(mrr.receita_mensal_recorrente_total),
             `<b>${mrr.total_contratos_vigentes}</b> contratos de assessoria vigentes`, true) +
        card('Projeção anual', fmtBRLk(mrr.receita_anual_projetada),
             'Recorrente × 12 meses') +
        card('Ticket médio', fmtBRLk(mrr.ticket_medio_mensal),
             `Mediana ${fmtBRLk(mrr.mediana_mensal)}`) +
        card('Maior contrato', fmtBRLk(mrr.maior_contrato),
             `Menor ${fmtBRLk(mrr.menor_contrato)}`);
      const f = mrr.distribuicao_faixas||{};
      barras($('#fin-mrr-faixas'), [
        {nome:'Acima de R$ 10 mil', valor:f.acima_10k||0, label:(f.acima_10k||0)+' contratos'},
        {nome:'R$ 5 mil – 10 mil', valor:f['5k_10k']||0, label:(f['5k_10k']||0)+' contratos'},
        {nome:'R$ 3 mil – 5 mil', valor:f['3k_5k']||0, label:(f['3k_5k']||0)+' contratos'},
        {nome:'Abaixo de R$ 3 mil', valor:f.abaixo_3k||0, label:(f.abaixo_3k||0)+' contratos'}
      ], {gold:true});
      if($('#fin-mrr-note')) $('#fin-mrr-note').textContent = mrr.nota||'';
    }

    const rec = await carregar('receitas');
    if(rec && rec.faturamento_por_ano){
      const anos = rec.faturamento_por_ano.filter(a=>a.total_pago>0);
      const mx = Math.max(...anos.map(a=>a.total_pago));
      $('#fin-fat-ano').innerHTML = `<div class="panel-label">Faturamento recebido por ano</div>
        <div class="hbar-list" id="fin-fat-bars"></div>`;
      barras($('#fin-fat-bars'), anos.map(a=>({
        nome:String(a.ano), valor:a.total_pago, label:fmtBRLk(a.total_pago),
        sub:fmtNum(a.qtd_recebimentos)+' receb.'
      })), {gold:true, max:mx});
      // planos de conta receita
      if(rec.faturamento_por_plano_de_contas){
        const top = rec.faturamento_por_plano_de_contas
          .slice().sort((a,b)=>(b.total_pago||b.total||0)-(a.total_pago||a.total||0)).slice(0,10);
        barras($('#fin-planos-rec'), top.map(p=>({
          nome:p.descricao||p.nome, valor:p.total_pago||p.total||0, label:fmtBRLk(p.total_pago||p.total||0)
        })), {gold:true});
      }
    }

    const desp = await carregar('despesas');
    if(desp && desp.despesas_por_plano_de_contas){
      const top = desp.despesas_por_plano_de_contas
        .slice().sort((a,b)=>(b.total_pago||b.total||0)-(a.total_pago||a.total||0)).slice(0,10);
      barras($('#fin-planos-desp'), top.map(p=>({
        nome:p.descricao||p.nome, valor:p.total_pago||p.total||0, label:fmtBRLk(p.total_pago||p.total||0)
      })));
    }
  }

  // ---------- ABA PRODUÇÃO ----------
  async function renderProducao(){
    const p = await carregar('producao');
    if(!p) return;
    const c = p.carteira||{};
    if($('#prod-carteira-cards')) $('#prod-carteira-cards').innerHTML =
      card('Ativos', fmtNum(c.ativos||0), 'Processos em tramitação', true) +
      card('Suspensos', fmtNum(c.suspensos||0), 'Aguardando') +
      card('Baixados', fmtNum(c.baixados||0), 'Encerrados no período') +
      card('Total carteira', fmtNum((c.ativos||0)+(c.suspensos||0)+(c.baixados||0)), 'Soma dos status ativos');

    if(p.por_area && $('#prod-por-area')){
      const top = p.por_area.slice().map(a=>({nome:a.area||a.nome, valor:a.ativos||a.total||0}))
        .sort((a,b)=>b.valor-a.valor);
      barras($('#prod-por-area'), top.map(a=>({nome:a.nome, valor:a.valor, label:fmtNum(a.valor)})), {gold:true});
    }
    if(p.novos_por_advogado_2026 && $('#prod-novos-adv')){
      const arr = p.novos_por_advogado_2026.map(a=>({nome:a.nome||a.advogado, valor:a.total||a.qtd||0}))
        .filter(a=>a.valor>0).sort((a,b)=>b.valor-a.valor).slice(0,12);
      if(arr.length) barras($('#prod-novos-adv'), arr.map(a=>({nome:a.nome, valor:a.valor, label:fmtNum(a.valor)})));
      else $('#prod-novos-adv').innerHTML = `<div class="stub"><span class="stub-ico">⚙️</span>
        O advogado técnico real fica em campo personalizado não filtrável pela API de processos.
        <div class="stub-tag falta">requer ajuste no EasyJur</div></div>`;
    }
    if(p.novos_por_mes && $('#prod-novos-mes')){
      // estrutura: {"2025":{"YYYY-MM":n}, "2026":{...}} ou {"2025":{"01":n}}
      const linhas = [];
      Object.keys(p.novos_por_mes).sort().forEach(ano=>{
        const meses = p.novos_por_mes[ano];
        if(typeof meses==='object'){
          Object.keys(meses).sort().forEach(m=>{
            // ignora chaves que não são mês (ex: "total", "qtd")
            if(!/^\d{1,2}$|^\d{4}-\d{2}$/.test(m)) return;
            const rot = m.includes('-')? m : (ano+'-'+String(m).padStart(2,'0'));
            linhas.push({nome:rot, valor:meses[m]||0, label:fmtNum(meses[m]||0)});
          });
        }
      });
      const recentes = linhas.slice(-12);
      barras($('#prod-novos-mes'), recentes, {gold:true});
    }
    if($('#prod-alertas-cards')){
      const par = p.parados||{}, gr = p.grandes||{};
      $('#prod-alertas-cards').innerHTML =
        card('Parados > 30 dias', fmtNum(par.mais_30d||0), 'Sem movimentação', true) +
        card('Parados > 90 dias', fmtNum(par.mais_90d||0), 'Atenção prioritária') +
        card('Causa ≥ R$ 1 mi', fmtNum(gr.acima_1mi||0), 'Processos grandes') +
        card('Causa ≥ R$ 500 mil', fmtNum(gr.acima_500k||0), 'Alto valor');
    }
  }

  // ---------- ABA COMERCIAL ----------
  async function renderComercial(){
    const c = await carregar('comercial');
    if(!c) return;
    const fg = c.funil_geral||{};
    const lbl = {1:'Briefing',2:'Proposta',3:'Negociação',4:'Fechado',5:'Recusado'};
    if($('#com-funil-cards')){
      $('#com-funil-cards').innerHTML = [1,2,3,4,5].map(s=>{
        const d = fg[s]||fg[String(s)]||{qtd:0};
        const val = d.valor_total||d.valor||0;
        return card(lbl[s], fmtNum(d.qtd||0),
          (val? fmtBRLk(val):'—'), s===4);
      }).join('');
    }
    if(c.por_vendedor && $('#com-por-vendedor')){
      const top = c.por_vendedor.slice().sort((a,b)=>(b.enviadas||0)-(a.enviadas||0)).slice(0,12);
      const mx = Math.max(...top.map(v=>v.enviadas||0))||1;
      barras($('#com-por-vendedor'), top.map(v=>({
        nome:v.vendedor||v.nome||'—', valor:v.enviadas||0, label:fmtNum(v.enviadas||0)+' env.',
        sub:(v.fechadas||0)+' fechadas'
      })), {gold:true, max:mx});
    }
    if(c.top_oportunidades_abertas && $('#com-top-oport')){
      const t = c.top_oportunidades_abertas;
      if(t.length){
        $('#com-top-oport').innerHTML = '<div class="panel-label">Top oportunidades em aberto</div>' +
          '<div class="hbar-list">' + t.slice(0,12).map(o=>`<div class="hbar-row">
            <div class="hb-name" title="${o.cliente||o.nome}">${o.cliente||o.nome}</div>
            <div class="hbar-track"><div class="hbar-fill gold" style="width:100%"></div></div>
            <div class="hb-val">${fmtBRLk(o.valor_total||0)}<small>${o.vendedor||''}</small></div>
          </div>`).join('') + '</div>';
      } else {
        $('#com-top-oport').innerHTML = `<div class="stub"><span class="stub-ico">📋</span>
          Nenhuma oportunidade com valor cadastrado. <b>${c.alerta_valor_zerado||0}</b> oportunidades estão com valor zerado
          — o comercial precisa preencher o valor no cadastro.<div class="stub-tag falta">cadastro pendente</div></div>`;
      }
    }
  }

  // ---------- Navegação de abas ----------
  function initTabs(){
    $$('.tab-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const tab = btn.dataset.tab;
        $$('.tab-btn').forEach(b=>b.classList.toggle('on', b===btn));
        $$('.tab-panel').forEach(p=>p.classList.toggle('on', p.id==='tab-'+tab));
        window.scrollTo({top:0,behavior:'smooth'});
      });
    });
  }

  // ---------- Tema ----------
  function initTema(){
    const saved = (()=>{ try{return localStorage.getItem('painel-tema');}catch(e){return null;} })();
    if(saved==='dark') document.body.classList.add('theme-dark');
    const btn = $('#theme-toggle');
    if(btn) btn.addEventListener('click',()=>{
      document.body.classList.toggle('theme-dark');
      try{ localStorage.setItem('painel-tema', document.body.classList.contains('theme-dark')?'dark':'light'); }catch(e){}
    });
  }

  // ---------- Cortina ----------
  function fecharCortina(){
    const c = $('#curtain');
    document.body.classList.remove('loading');
    if(c){ c.classList.add('open'); setTimeout(()=>c.classList.add('done'), 900); }
  }

  // ---------- Boot ----------
  async function boot(){
    const hoje = new Date().toLocaleDateString('pt-BR');
    if($('#meta-data')) $('#meta-data').textContent = hoje;
    initTabs(); initTema();
    // renderiza tudo (cada um tolera dado ausente)
    await Promise.allSettled([renderFinanceiro(), renderProducao(), renderComercial()]);
    setTimeout(fecharCortina, 500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
