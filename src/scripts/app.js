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
  // Formata data ISO (2026-08-31 ou 2026-08-31T...) para DD/MM/AAAA
  const fmtData = v => {
    if(!v) return '—';
    const s = String(v).slice(0,10);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  };
  // Formata "YYYY-MM" para "MMM/AAAA" (ex.: "2026-08" → "Ago/2026")
  const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const fmtMesAno = v => {
    const s = String(v||'');
    const m = s.match(/^(\d{4})-(\d{2})$/);
    return m ? `${MESES_ABREV[parseInt(m[2],10)-1]}/${m[1]}` : s;
  };

  // fontes de dados: cada arquivo JSON de dados/
  const ARQUIVOS = {
    mrr: 'dados/financeiro_assessoria_mensal.json',
    receitas: 'dados/financeiro_receitas.json',
    despesas: 'dados/financeiro_despesas.json',
    comercial: 'dados/comercial_funil.json',
    producao: 'dados/producao_processos.json',
    form_metas: 'dados/formularios_metas.json',
    form_atividade: 'dados/formularios_atividade.json',
    form_times: 'dados/formularios_times.json',
    form_reajustes: 'dados/formularios_reajustes.json'
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
    if(rec && rec.faturamento_por_plano_de_contas){
      const planos = rec.faturamento_por_plano_de_contas;
      const isOp = p => (String(p.descricao||'').trim()).startsWith('1.');
      const opPlanos = planos.filter(isOp);
      // 3 categorias
      const MENSAL_IDS = ['1.1.02']; // Partido Mensal
      const EXITO_IDS = ['1.1.01','1.1.06','1.1.07']; // Êxito, Sucumbência, Acordo
      const catDe = p => {
        const d = (p.descricao||'').trim();
        if(MENSAL_IDS.some(id => d.startsWith(id))) return 'mensal';
        if(EXITO_IDS.some(id => d.startsWith(id))) return 'exito';
        return 'outros';
      };
      const somaPorCat = {mensal:0, exito:0, outros:0};
      const anosPorCat = {mensal:{}, exito:{}, outros:{}};
      opPlanos.forEach(p => {
        const c = catDe(p);
        somaPorCat[c] += p.total_pago||p.total||0;
        Object.entries(p.por_ano||{}).forEach(([ano,v]) => {
          anosPorCat[c][ano] = (anosPorCat[c][ano]||0) + (v||0);
        });
      });
      const totalOp = somaPorCat.mensal + somaPorCat.exito + somaPorCat.outros;
      const anosTodos = new Set();
      Object.values(anosPorCat).forEach(m => Object.keys(m).forEach(a => anosTodos.add(a)));
      const anos = Array.from(anosTodos).sort();
      const totalGeral = planos.reduce((s,p)=>s+(p.total_pago||p.total||0),0);
      // stacked bars por ano (Mensal + Êxito + Outros)
      const mxAno = Math.max(...anos.map(a => (anosPorCat.mensal[a]||0)+(anosPorCat.exito[a]||0)+(anosPorCat.outros[a]||0))) || 1;
      const stackedBars = anos.map(a => {
        const m = anosPorCat.mensal[a]||0, e = anosPorCat.exito[a]||0, o = anosPorCat.outros[a]||0;
        const tot = m+e+o;
        const pm = tot? (m/tot*100).toFixed(1):0, pe = tot? (e/tot*100).toFixed(1):0, po = tot? (o/tot*100).toFixed(1):0;
        const largTot = Math.round(tot/mxAno*100);
        return `<div class="hbar-row">
          <div class="hb-name">${a}</div>
          <div class="hbar-track" style="display:flex;width:${largTot}%;min-width:${largTot}%">
            <div style="height:100%;background:linear-gradient(90deg,var(--gold-soft),var(--gold));width:${pm}%" title="Mensal: ${fmtBRLk(m)} (${pm}%)"></div>
            <div style="height:100%;background:linear-gradient(90deg,#3F5276,#1E223F);width:${pe}%" title="Êxito: ${fmtBRLk(e)} (${pe}%)"></div>
            <div style="height:100%;background:linear-gradient(90deg,#8a92ab,#5b607a);width:${po}%" title="Outros: ${fmtBRLk(o)} (${po}%)"></div>
          </div>
          <div class="hb-val">${fmtBRLk(tot)}<small>M ${pm}% · Ê ${pe}% · O ${po}%</small></div>
        </div>`;
      }).join('');
      $('#fin-fat-ano').innerHTML =
        `<div class="fin-cards" style="margin-bottom:22px">
           ${card('Mensal recorrente', fmtBRLk(somaPorCat.mensal),
             `Partido mensal · assessoria fixa · <b>${((somaPorCat.mensal/totalOp)*100).toFixed(0)}%</b> do faturamento`, true)}
           ${card('Êxito', fmtBRLk(somaPorCat.exito),
             `Êxito judicial + sucumbência + acordo · <b>${((somaPorCat.exito/totalOp)*100).toFixed(0)}%</b>`)}
           ${card('Outros honorários', fmtBRLk(somaPorCat.outros),
             `Avulsos · consultas · diligências · iniciais · <b>${((somaPorCat.outros/totalOp)*100).toFixed(0)}%</b>`)}
           ${card('Total operacional', fmtBRLk(totalOp),
             `Soma dos 3 · 2026 parcial: ${fmtBRLk((anosPorCat.mensal['2026']||0)+(anosPorCat.exito['2026']||0)+(anosPorCat.outros['2026']||0))}`)}
         </div>
         <div class="panel-label">Faturamento por ano
           <span style="display:inline-flex;align-items:center;gap:6px;margin-left:14px;color:var(--ss-ink);text-transform:none;letter-spacing:.02em;font-size:11.5px"><span style="display:inline-block;width:10px;height:10px;background:var(--ss-gold);border-radius:2px"></span>Mensal</span>
           <span style="display:inline-flex;align-items:center;gap:6px;margin-left:10px;color:var(--ss-ink);text-transform:none;letter-spacing:.02em;font-size:11.5px"><span style="display:inline-block;width:10px;height:10px;background:var(--ss-navy);border-radius:2px"></span>Êxito</span>
           <span style="display:inline-flex;align-items:center;gap:6px;margin-left:10px;color:var(--ss-ink);text-transform:none;letter-spacing:.02em;font-size:11.5px"><span style="display:inline-block;width:10px;height:10px;background:#8a92ab;border-radius:2px"></span>Outros</span>
         </div>
         <div class="hbar-list">${stackedBars}</div>
         <div class="data-note">Operacional (planos 1.x) = ${fmtBRLk(totalOp)}. Excluídos R$ ${fmtNum(Math.round((totalGeral-totalOp)))} de não-operacionais (transferências, reembolsos — planos 2.x).</div>`;
      // ranking planos operacionais
      const top = opPlanos.slice().sort((a,b)=>(b.total_pago||b.total||0)-(a.total_pago||a.total||0)).slice(0,10);
      barras($('#fin-planos-rec'), top.map(p=>({
        nome:(p.descricao||p.nome||'').replace(/^1\.\d+\.\d+\s*-\s*/,''),
        valor:p.total_pago||p.total||0, label:fmtBRLk(p.total_pago||p.total||0)
      })), {gold:true});
    }

    const desp = await carregar('despesas');
    if(desp && desp.despesas_por_plano_de_contas){
      const top = desp.despesas_por_plano_de_contas
        .slice().sort((a,b)=>(b.total_pago||b.total||0)-(a.total_pago||a.total||0)).slice(0,12);
      barras($('#fin-planos-desp'), top.map(p=>({
        nome:(p.descricao||p.nome||'').replace(/^3\.\d+\.\d+\s*-\s*/,''),
        valor:p.total_pago||p.total||0, label:fmtBRLk(p.total_pago||p.total||0)
      })));
      // nota: identifica transferências e plano "erro operacional"
      const problematicos = (desp.despesas_por_plano_de_contas||[]).filter(p=>{
        const d = (p.descricao||'').toLowerCase();
        return d.includes('transfer') || d.includes('erro operacional') || d.includes('distribui') || d.includes('lucro');
      });
      const totProb = problematicos.reduce((s,p)=>s+(p.total_pago||0),0);
      const contProblem = $('#fin-planos-desp').parentElement;
      if(contProblem && totProb>0){
        contProblem.insertAdjacentHTML('beforeend',
          `<div class="data-note warn">⚠️ Auditar com o financeiro: R$ ${fmtBRLk(totProb).replace('R$ ','')} concentrado em transferências internas, distribuição de lucro e plano "3.12.29 - Erro operacional". Podem inflar o total de despesa se contados como operacional.</div>`);
      }
    }

    // ===== FLUXO DE CAIXA FUTURO (entradas + saídas + saldo por mês) =====
    const fluxoRec = await carregar('fluxo_futuro_receitas');
    const fluxoDesp = await carregar('fluxo_futuro_despesas');
    if(fluxoRec && Array.isArray(fluxoRec.receitas) && fluxoRec.receitas.length){
      // Próximos 6 meses
      const hoje = new Date();
      const meses = [];
      for(let i=0; i<6; i++){
        const d = new Date(hoje.getFullYear(), hoje.getMonth()+i, 1);
        meses.push(d.toISOString().slice(0,7));
      }
      // Acumula receitas e despesas por mês
      const rec = {};
      const desp = {};
      meses.forEach(m => { rec[m] = 0; desp[m] = 0; });
      fluxoRec.receitas.forEach(r => {
        const mes = String(r.data_vencimento||'').slice(0,7);
        if(mes in rec) rec[mes] += (r.valor||0);
      });
      const despesasArr = (fluxoDesp && Array.isArray(fluxoDesp.despesas)) ? fluxoDesp.despesas : [];
      despesasArr.forEach(d => {
        const mes = String(d.data_vencimento||'').slice(0,7);
        if(mes in desp) desp[mes] += (d.valor||0);
      });
      const totalRec = meses.reduce((s,m)=>s+rec[m],0);
      const totalDesp = meses.reduce((s,m)=>s+desp[m],0);
      const totalSaldo = totalRec - totalDesp;

      // ---- 4 cards de resumo ----
      if($('#fin-fluxo-cards')){
        const sinal = totalSaldo >= 0 ? '+' : '';
        const corSaldo = totalSaldo >= 0 ? 'var(--ss-pos)' : 'var(--ss-neg)';
        $('#fin-fluxo-cards').innerHTML =
          card('Saldo 6 meses', `<span style="color:${corSaldo}">${sinal}${fmtBRLk(totalSaldo).replace('R$ ','R$ ')}</span>`,
            'Recebimentos − pagamentos previstos', true) +
          card('Entradas previstas', fmtBRLk(totalRec),
            `<b>${fmtNum(fluxoRec.qtd||0)}</b> contas a receber lançadas`) +
          card('Saídas previstas', fmtBRLk(totalDesp),
            despesasArr.length ? `<b>${fmtNum(fluxoDesp.qtd||despesasArr.length)}</b> contas a pagar lançadas`
              : '<span style="color:var(--ss-warn)">aguardando coleta</span>') +
          card('Cobertura', totalRec > 0 ? `${((totalRec/(totalDesp||1))*100).toFixed(0)}%` : '—',
            totalDesp ? 'Entradas / Saídas' : 'Saídas não disponíveis');
      }

      // ---- Gráfico principal: saldo mensal (entradas verde vs saídas vermelho) ----
      const cont = $('#fin-fluxo-barras');
      if(cont){
        const maxAbs = Math.max(...meses.map(m => Math.max(rec[m], desp[m]))) || 1;
        const rows = meses.map(m => {
          const r = rec[m], d = desp[m], saldo = r - d;
          const barRec = Math.round(r/maxAbs*50);
          const barDesp = Math.round(d/maxAbs*50);
          const sinal = saldo >= 0 ? '+' : '';
          const corSaldo = saldo >= 0 ? 'var(--ss-pos)' : 'var(--ss-neg)';
          return `<div class="hbar-row ss-drill" data-drill="fluxo-mes" data-drill-ctx="${m}">
            <div class="hb-name">${fmtMesAno(m)}</div>
            <div style="position:relative;height:14px;background:transparent">
              <div style="position:absolute;left:0;top:0;width:50%;height:100%;display:flex;justify-content:flex-end;align-items:center">
                <div style="height:8px;width:${barDesp}%;background:#e59993;border-radius:2px 0 0 2px" title="Saídas: ${fmtBRLk(d)}"></div>
              </div>
              <div style="position:absolute;left:50%;top:50%;width:1px;height:100%;background:var(--ss-line-2);transform:translate(-50%,-50%)"></div>
              <div style="position:absolute;left:50%;top:0;width:50%;height:100%;display:flex;align-items:center">
                <div style="height:8px;width:${barRec}%;background:#7fce9a;border-radius:0 2px 2px 0" title="Entradas: ${fmtBRLk(r)}"></div>
              </div>
            </div>
            <div class="hb-val" style="color:${corSaldo}">${sinal}${fmtBRLk(saldo)}<small style="color:var(--ss-mute)">E ${fmtBRLk(r)} · S ${fmtBRLk(d)}</small></div>
          </div>`;
        }).join('');
        cont.innerHTML = `<div class="hbar-list">${rows}</div>
          <div class="data-note" style="margin-top:14px">
            <span style="display:inline-flex;align-items:center;gap:6px;color:var(--ss-ink);font-size:11.5px"><span style="width:10px;height:10px;background:#7fce9a;border-radius:2px;display:inline-block"></span>Entradas</span>
            <span style="display:inline-flex;align-items:center;gap:6px;margin-left:14px;color:var(--ss-ink);font-size:11.5px"><span style="width:10px;height:10px;background:#e59993;border-radius:2px;display:inline-block"></span>Saídas</span>
            <span style="margin-left:14px;color:var(--ss-mute);font-size:11.5px">· clique num mês para detalhar</span>
          </div>`;
      }

      // ---- Painel esquerdo: entradas por categoria ----
      const catRec = (desc)=>{
        const d = String(desc||'').trim();
        if(d.startsWith('1.1.02')) return 'mensal';
        if(d.startsWith('1.1.08') || d.startsWith('1.2.10')) return 'honorarios';
        if(d.startsWith('1.1.01') || d.startsWith('1.1.06') || d.startsWith('1.1.07')) return 'exito';
        return 'outros';
      };
      const accRec = {};
      meses.forEach(m => { accRec[m] = {mensal:0, honorarios:0, exito:0, outros:0}; });
      fluxoRec.receitas.forEach(r => {
        const mes = String(r.data_vencimento||'').slice(0,7);
        if(!accRec[mes]) return;
        accRec[mes][catRec(r.plano_desc)] += (r.valor||0);
      });
      if($('#fin-fluxo-receitas')){
        const maxRec = Math.max(...meses.map(m => rec[m])) || 1;
        const rowsR = meses.map(m => {
          const c = accRec[m];
          const tot = rec[m];
          if(tot === 0) return `<div class="hbar-row"><div class="hb-name">${fmtMesAno(m)}</div><div class="hbar-track"></div><div class="hb-val"><span style="color:var(--ss-mute)">—</span></div></div>`;
          const pm=(c.mensal/tot*100).toFixed(0), ph=(c.honorarios/tot*100).toFixed(0), pe=(c.exito/tot*100).toFixed(0);
          const larg = Math.round(tot/maxRec*100);
          return `<div class="hbar-row ss-drill" data-drill="fluxo-mes" data-drill-ctx="${m}">
            <div class="hb-name">${fmtMesAno(m)}</div>
            <div class="hbar-track" style="display:flex;width:${larg}%;min-width:${larg}%">
              <div style="height:100%;background:var(--ss-gold);width:${c.mensal/tot*100}%" title="Mensal: ${fmtBRLk(c.mensal)}"></div>
              <div style="height:100%;background:var(--ss-navy);width:${c.honorarios/tot*100}%" title="Honorários: ${fmtBRLk(c.honorarios)}"></div>
              <div style="height:100%;background:#8a92ab;width:${c.exito/tot*100}%" title="Êxito: ${fmtBRLk(c.exito)}"></div>
              <div style="height:100%;background:#c9cdd6;width:${c.outros/tot*100}%"></div>
            </div>
            <div class="hb-val">${fmtBRLk(tot)}<small>M ${pm}% · H ${ph}% · Ê ${pe}%</small></div>
          </div>`;
        }).join('');
        $('#fin-fluxo-receitas').innerHTML = `<div class="hbar-list">${rowsR}</div>
          <div class="data-note" style="margin-top:14px">
            <span style="display:inline-flex;align-items:center;gap:5px;color:var(--ss-ink);font-size:11px"><span style="width:9px;height:9px;background:var(--ss-gold);border-radius:2px;display:inline-block"></span>Mensal</span>
            <span style="display:inline-flex;align-items:center;gap:5px;margin-left:10px;color:var(--ss-ink);font-size:11px"><span style="width:9px;height:9px;background:var(--ss-navy);border-radius:2px;display:inline-block"></span>Honorários</span>
            <span style="display:inline-flex;align-items:center;gap:5px;margin-left:10px;color:var(--ss-ink);font-size:11px"><span style="width:9px;height:9px;background:#8a92ab;border-radius:2px;display:inline-block"></span>Êxito</span>
          </div>`;
      }

      // ---- Painel direito: pagamentos por mês (barras simples) ----
      if($('#fin-fluxo-despesas')){
        if(!despesasArr.length){
          $('#fin-fluxo-despesas').innerHTML = `<div class="stub"><span class="stub-ico">—</span><b>Contas a pagar</b>Aguardando coleta finalizar.<div class="stub-tag">em coleta</div></div>`;
        } else {
          const maxD = Math.max(...meses.map(m => desp[m])) || 1;
          const rowsD = meses.map(m => {
            const v = desp[m];
            if(v === 0) return `<div class="hbar-row"><div class="hb-name">${fmtMesAno(m)}</div><div class="hbar-track"></div><div class="hb-val"><span style="color:var(--ss-mute)">—</span></div></div>`;
            const larg = Math.round(v/maxD*100);
            return `<div class="hbar-row ss-drill" data-drill="fluxo-despesas-mes" data-drill-ctx="${m}">
              <div class="hb-name">${fmtMesAno(m)}</div>
              <div class="hbar-track"><div class="hbar-fill" style="width:${larg}%;background:#e59993"></div></div>
              <div class="hb-val">${fmtBRLk(v)}</div>
            </div>`;
          }).join('');
          $('#fin-fluxo-despesas').innerHTML = `<div class="hbar-list">${rowsD}</div>
            <div class="data-note" style="margin-top:14px"><b>${fmtNum(fluxoDesp.qtd||despesasArr.length)}</b> contas a pagar em aberto · clique num mês para detalhar</div>`;
        }
      }
    }

    // ===== COMPARATIVO RECEITA FIXA vs DESPESA FIXA =====
    const comp = await carregar('comparativo_fixa');
    if(comp && Array.isArray(comp.serie_anual) && comp.serie_anual.length){
      const serie = comp.serie_anual;
      const total_r = comp.total_receita_fixa || 0;
      const total_d = comp.total_despesa_fixa || 0;
      const total_saldo = total_r - total_d;
      const cob_medio = total_d > 0 ? (total_r/total_d*100) : 0;
      const anoUltimo = serie[serie.length-1];

      // 4 cards de resumo
      if($('#fin-comparativo-cards')){
        const sinal = total_saldo >= 0 ? '+' : '';
        const corSaldo = total_saldo >= 0 ? 'var(--ss-pos)' : 'var(--ss-neg)';
        const corCob = cob_medio >= 130 ? 'var(--ss-pos)' : (cob_medio >= 100 ? 'var(--ss-warn)' : 'var(--ss-neg)');
        $('#fin-comparativo-cards').innerHTML =
          card('Cobertura média (5 anos)', `<span style="color:${corCob}">${cob_medio.toFixed(0)}%</span>`,
            'Receita fixa ÷ Despesa fixa', true) +
          card('Receita fixa (5 anos)', fmtBRLk(total_r),
            'Partido Mensal · assessoria recorrente') +
          card('Despesa fixa (5 anos)', fmtBRLk(total_d),
            `Aluguel · salários · pró-labore · tributos · ${(comp.planos_fixos_considerados||[]).length} planos`) +
          card('Saldo acumulado', `<span style="color:${corSaldo}">${sinal}${fmtBRLk(total_saldo)}</span>`,
            `${anoUltimo.ano}: ${(anoUltimo.cobertura_pct||0).toFixed(0)}% de cobertura`);
      }

      // gráfico por ano
      const contSerie = $('#fin-comparativo-serie');
      if(contSerie){
        const maxAbs = Math.max(...serie.map(s => Math.max(s.receita_fixa, s.despesa_fixa))) || 1;
        const rows = serie.map(s => {
          const barR = Math.round(s.receita_fixa/maxAbs*50);
          const barD = Math.round(s.despesa_fixa/maxAbs*50);
          const cob = s.cobertura_pct||0;
          const corCob = cob >= 130 ? 'var(--ss-pos)' : (cob >= 100 ? 'var(--ss-warn)' : 'var(--ss-neg)');
          return `<div class="hbar-row">
            <div class="hb-name">${s.ano}</div>
            <div style="position:relative;height:14px;background:transparent">
              <div style="position:absolute;left:0;top:0;width:50%;height:100%;display:flex;justify-content:flex-end;align-items:center">
                <div style="height:8px;width:${barD}%;background:#e59993;border-radius:2px 0 0 2px" title="Despesa fixa: ${fmtBRLk(s.despesa_fixa)}"></div>
              </div>
              <div style="position:absolute;left:50%;top:50%;width:1px;height:100%;background:var(--ss-line-2);transform:translate(-50%,-50%)"></div>
              <div style="position:absolute;left:50%;top:0;width:50%;height:100%;display:flex;align-items:center">
                <div style="height:8px;width:${barR}%;background:#7fce9a;border-radius:0 2px 2px 0" title="Receita fixa: ${fmtBRLk(s.receita_fixa)}"></div>
              </div>
            </div>
            <div class="hb-val" style="color:${corCob}">${cob.toFixed(0)}%<small style="color:var(--ss-mute)">R $ ${fmtBRLk(s.receita_fixa).replace('R$ ','')} · D ${fmtBRLk(s.despesa_fixa).replace('R$ ','')}</small></div>
          </div>`;
        }).join('');
        contSerie.innerHTML = `<div class="hbar-list">${rows}</div>
          <div class="data-note" style="margin-top:14px">
            <span style="display:inline-flex;align-items:center;gap:6px;color:var(--ss-ink);font-size:11.5px"><span style="width:10px;height:10px;background:#7fce9a;border-radius:2px;display:inline-block"></span>Receita fixa (Partido Mensal)</span>
            <span style="display:inline-flex;align-items:center;gap:6px;margin-left:14px;color:var(--ss-ink);font-size:11.5px"><span style="width:10px;height:10px;background:#e59993;border-radius:2px;display:inline-block"></span>Despesa fixa (aluguel, salários, pró-labore, tributos, etc.)</span>
            <div style="margin-top:8px;color:var(--ss-mute);font-size:11px;font-style:italic">${comp.nota || ''}</div>
          </div>`;
      }
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
            linhas.push({nome:fmtMesAno(rot), valor:meses[m]||0, label:fmtNum(meses[m]||0)});
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

    // ===== TIMESHEET últimos 30 dias =====
    const ts = await carregar('timesheet_30d');
    if(ts && Array.isArray(ts.lancamentos)){
      // Helper: converte "HH:MM:SS" ou "HH:MM" em minutos
      const paraMinutos = (str)=>{
        if(!str) return 0;
        const partes = String(str).split(':').map(n=>parseInt(n,10)||0);
        return (partes[0]||0)*60 + (partes[1]||0);
      };
      const fmtHoras = (min)=>{
        const h = Math.floor(min/60);
        const m = min%60;
        return h.toLocaleString('pt-BR')+'h'+String(m).padStart(2,'0');
      };
      const porAdv = {};
      const porCli = {};
      let totalMin = 0;
      let qtdLan = 0;
      ts.lancamentos.forEach(l => {
        const min = paraMinutos(l.tempo_timesheet);
        totalMin += min;
        qtdLan++;
        const adv = String(l.nome_responsavel || '').trim() || '—';
        porAdv[adv] = (porAdv[adv]||0) + min;
        const cli = String(l.nome_cliente || '').trim() || '—';
        porCli[cli] = (porCli[cli]||0) + min;
      });

      if($('#prod-timesheet-cards')){
        const nAdv = Object.keys(porAdv).length;
        const nCli = Object.keys(porCli).length;
        $('#prod-timesheet-cards').innerHTML =
          card('Horas registradas', fmtHoras(totalMin), `Nos últimos 30 dias · <b>${fmtNum(qtdLan)}</b> lançamentos`, true) +
          card('Advogados ativos', fmtNum(nAdv), 'Com timesheet no período') +
          card('Clientes atendidos', fmtNum(nCli), 'Com horas registradas') +
          card('Média por lançamento', qtdLan? fmtHoras(Math.round(totalMin/qtdLan)) : '—', 'Duração média');
      }
      // top 12 advogados
      if($('#prod-timesheet-adv')){
        const top = Object.entries(porAdv).sort((a,b)=>b[1]-a[1]).slice(0,12);
        const mx = top.length ? top[0][1] : 1;
        barras($('#prod-timesheet-adv'), top.map(([nome, min])=>({
          nome, valor: min, label: fmtHoras(min),
        })), {gold:true, max:mx});
      }
      // top 12 clientes
      if($('#prod-timesheet-cli')){
        const top = Object.entries(porCli).sort((a,b)=>b[1]-a[1]).slice(0,12);
        const mx = top.length ? top[0][1] : 1;
        barras($('#prod-timesheet-cli'), top.map(([nome, min])=>({
          nome, valor: min, label: fmtHoras(min),
        })), {max:mx});
      }
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

  // ---------- FORMULÁRIOS (dados vindos da planilha via Apps Script) ----------
  async function renderFormularios(){
    // METAS (aba Comercial)
    const metas = await carregar('form_metas');
    if(metas && metas.metas && metas.metas.length && $('#com-metas-panel')){
      const rows = metas.metas.map(m => `<div class="hbar-row">
        <div class="hb-name" title="${m.vendedor}">${m.vendedor}</div>
        <div class="hbar-track"><div class="hbar-fill gold" style="width:100%"></div></div>
        <div class="hb-val">${fmtNum(m.meta_propostas_qtd||0)}<small>${m.referencia||m.periodo||''} · ${m.meta_propostas_valor?fmtBRLk(m.meta_propostas_valor):'—'}</small></div>
      </div>`).join('');
      $('#com-metas-panel').innerHTML = `<div class="panel-label">Metas cadastradas</div>
        <div class="hbar-list">${rows}</div>
        <div class="data-note">${metas.metas.length} metas registradas · <a href="formularios/metas/" style="color:var(--gold);text-decoration:none">cadastrar nova →</a></div>`;
    }

    // ATIVIDADE (aba Comercial)
    const atv = await carregar('form_atividade');
    if(atv && atv.por_vendedor && atv.por_vendedor.length && $('#com-atividade-panel')){
      const top = atv.por_vendedor.slice().sort((a,b)=>(b.ligacoes||0)-(a.ligacoes||0)).slice(0,12);
      const mx = Math.max(...top.map(v => (v.ligacoes||0)+(v.leads||0)+(v.reunioes||0)+(v.propostas||0))) || 1;
      const rows = top.map(v => {
        const tot = (v.ligacoes||0)+(v.leads||0)+(v.reunioes||0)+(v.propostas||0);
        return `<div class="hbar-row">
          <div class="hb-name" title="${v.vendedor}">${v.vendedor}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(tot/mx*100)}%"></div></div>
          <div class="hb-val">${fmtNum(tot)}<small>${v.ligacoes||0} lig · ${v.leads||0} leads · ${v.reunioes||0} reu · ${v.propostas||0} prop</small></div>
        </div>`;
      }).join('');
      $('#com-atividade-panel').innerHTML = `<div class="panel-label">Atividade acumulada por vendedor</div>
        <div class="hbar-list">${rows}</div>
        <div class="data-note">${atv.qtd_registros} registros · <a href="formularios/atividade/" style="color:var(--gold);text-decoration:none">registrar dia →</a></div>`;
    }

    // TIMES (aba Produção)
    const times = await carregar('form_times');
    if(times && times.por_time && Object.keys(times.por_time).length && $('#prod-times-panel')){
      const entradas = Object.entries(times.por_time);
      const total = times.advogados ? times.advogados.filter(a=>a.situacao!=='inativo').length : 0;
      const rows = entradas.map(([time, advs]) => `<div class="hbar-row">
        <div class="hb-name" title="${time}">${time}</div>
        <div class="hbar-track"><div class="hbar-fill gold" style="width:${Math.round(advs.length/Math.max(...entradas.map(e=>e[1].length))*100)}%"></div></div>
        <div class="hb-val">${advs.length}<small>${advs.slice(0,3).join(', ')}${advs.length>3?'…':''}</small></div>
      </div>`).join('');
      $('#prod-times-panel').innerHTML = `<div class="panel-label">Advogados por time (${total} ativos)</div>
        <div class="hbar-list">${rows}</div>
        <div class="data-note">${times.qtd_registros} vínculos cadastrados · <a href="formularios/times/" style="color:var(--gold);text-decoration:none">cadastrar vínculo →</a></div>`;
    }

    // REAJUSTES (aba Financeiro)
    const rea = await carregar('form_reajustes');
    if(rea && rea.reajustes && rea.reajustes.length && $('#fin-reajustes-panel')){
      const rows = rea.reajustes.slice(0,15).map(r => {
        const cor = r.variacao_pct>0?'#2f7a44':(r.variacao_pct<0?'#a63d38':'var(--muted)');
        const sinal = r.variacao_pct>0?'+':'';
        return `<div class="hbar-row">
          <div class="hb-name" title="${r.cliente}">${r.cliente}${r.numero_contrato?' <small style="color:var(--muted);font-weight:500">#'+r.numero_contrato+'</small>':''}</div>
          <div class="hbar-track"><div class="hbar-fill gold" style="width:100%"></div></div>
          <div class="hb-val" style="color:${cor}">${sinal}${(r.variacao_pct||0).toFixed(2)}%<small style="color:var(--muted)">${fmtBRLk(r.valor_anterior)} → ${fmtBRLk(r.valor_novo)} · ${fmtData(r.data)}</small></div>
        </div>`;
      }).join('');
      $('#fin-reajustes-panel').innerHTML = `<div class="panel-label">Últimos reajustes registrados</div>
        <div class="hbar-list">${rows}</div>
        <div class="data-note">${rea.qtd_registros} reajustes no histórico · <a href="formularios/reajustes/" style="color:var(--gold);text-decoration:none">registrar reajuste →</a></div>`;
    }
  }

  // ---------- Navegação de abas ----------
  function initTabs(){
    const TITULOS = {
      financeiro: 'Financeiro',
      producao: 'Produção',
      comercial: 'Comercial',
      projetos: 'Projetos'
    };
    const SUBS = {
      financeiro: 'Saúde financeira do escritório',
      producao: 'Volume e alertas da carteira',
      comercial: 'Pipeline e desempenho comercial',
      projetos: 'Iniciativas estratégicas'
    };
    function atualizarTitulo(tab){
      const t = $('#ss-page-title');
      if(t) t.innerHTML = (TITULOS[tab]||tab) + ' <span>/ ' + (SUBS[tab]||'') + '</span>';
    }
    $$('.tab-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const tab = btn.dataset.tab;
        $$('.tab-btn').forEach(b=>b.classList.toggle('on', b===btn));
        $$('.tab-panel').forEach(p=>p.classList.toggle('on', p.id==='tab-'+tab));
        atualizarTitulo(tab);
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
    initTabs(); initTema();
    // renderiza tudo (cada um tolera dado ausente)
    await Promise.allSettled([renderFinanceiro(), renderProducao(), renderComercial(), renderFormularios()]);
    // Marca elementos clicáveis para drill-down / auditoria
    marcarDrills();
    // data da última atualização — pega a mais recente dos JSONs carregados
    {
      const embed = window.DADOS_EMBED || {};
      const datas = Object.values(embed).map(o => (o && (o.gerado_em || o.data))).filter(Boolean);
      let maxDate = null;
      datas.forEach(d => {
        const t = new Date(d);
        if(!isNaN(t) && (!maxDate || t > maxDate)) maxDate = t;
      });
      const alvo = maxDate || new Date();
      const txt = alvo.toLocaleDateString('pt-BR');
      if($('#meta-data')) $('#meta-data').textContent = txt;
      if($('#sidebar-meta-data')) $('#sidebar-meta-data').textContent = txt;
    }
    setTimeout(fecharCortina, 500);
  }

  // ---------- Marca elementos clicáveis (drill-down) ----------
  function marcarDrills(){
    // Cards MRR: 1º=MRR (53 contratos), 4º=Maior contrato
    const mrrCards = $$('#fin-mrr-cards .fin-card');
    if(mrrCards[0]){
      mrrCards[0].classList.add('ss-drill');
      mrrCards[0].setAttribute('data-drill','contratos-mensais');
    }
    if(mrrCards[3]){ // MAIOR CONTRATO (4º card na ordem)
      mrrCards[3].classList.add('ss-drill');
      mrrCards[3].setAttribute('data-drill','maior-contrato');
    }
    // Faixas de valor: cada linha vira clicável
    const faixasCtx = {
      'Acima de R$ 10 mil': 'acima_10k',
      'R$ 5 mil – 10 mil':  '5k_10k',
      'R$ 3 mil – 5 mil':   '3k_5k',
      'Abaixo de R$ 3 mil': 'abaixo_3k',
    };
    $$('#fin-mrr-faixas .hbar-row').forEach(row=>{
      const nome = row.querySelector('.hb-name')?.textContent?.trim();
      const ctx = faixasCtx[nome];
      if(ctx){
        row.classList.add('ss-drill');
        row.setAttribute('data-drill','contratos-por-faixa');
        row.setAttribute('data-drill-ctx', ctx);
      }
    });
    // Cards do funil comercial: cada card = 1 etapa (Briefing/Proposta/etc)
    const funilCards = $$('#com-funil-cards .fin-card');
    const funilCtx = ['1','2','3','4','5']; // ordem: Briefing, Proposta, Negociação, Fechado, Recusado
    funilCards.forEach((c,i)=>{
      c.classList.add('ss-drill');
      c.setAttribute('data-drill','oportunidades-etapa');
      c.setAttribute('data-drill-ctx', funilCtx[i]||'');
    });
    // Cards de faturamento: cada um abre com seu recorte
    const fatCards = $$('#fin-fat-ano .fin-card');
    const fatCtx = ['mensal','exito','outros','total']; // ordem dos cards
    fatCards.forEach((c,i)=>{
      c.classList.add('ss-drill');
      c.setAttribute('data-drill','faturamento-categoria');
      c.setAttribute('data-drill-ctx', fatCtx[i]||'total');
    });
    // Panel de planos de receita e despesa → detalhes
    const panelRec = $('#fin-planos-rec');
    const parentRec = panelRec && panelRec.closest('.panel');
    if(parentRec){ parentRec.classList.add('ss-drill'); parentRec.setAttribute('data-drill','planos-receita'); }
    const panelDesp = $('#fin-planos-desp');
    const parentDesp = panelDesp && panelDesp.closest('.panel');
    if(parentDesp){ parentDesp.classList.add('ss-drill'); parentDesp.setAttribute('data-drill','planos-despesa'); }
    // Produção: painel de processos por área
    const panelArea = $('#prod-por-area');
    const parentArea = panelArea && panelArea.closest('.panel');
    if(parentArea){ parentArea.classList.add('ss-drill'); parentArea.setAttribute('data-drill','processos-por-area'); }
    // Comercial: top oportunidades
    const topOp = $('#com-top-oport');
    if(topOp){ topOp.classList.add('ss-drill'); topOp.setAttribute('data-drill','top-oportunidades'); }
    // Ranking vendedores: cada linha do ranking vira clicável (leva às oportunidades do vendedor)
    const panelVend = $('#com-por-vendedor');
    if(panelVend){
      $$('#com-por-vendedor .hbar-row').forEach(row=>{
        const nome = row.querySelector('.hb-name')?.getAttribute('title') || row.querySelector('.hb-name')?.textContent?.trim();
        if(nome){
          row.classList.add('ss-drill');
          row.setAttribute('data-drill','oportunidades-vendedor');
          row.setAttribute('data-drill-ctx', nome);
        }
      });
    }
    // Cards de alertas de produção: cada um leva ao drill correspondente
    const alertasCards = $$('#prod-alertas-cards .fin-card');
    // Ordem esperada: Parados >30d, Parados >90d, ≥R$1mi, ≥R$500k
    const alertasCfg = [
      {drill:'processos-parados', ctx:'30'},
      {drill:'processos-parados', ctx:'90'},
      {drill:'processos-grandes', ctx:'1000000'},
      {drill:'processos-grandes', ctx:'500000'},
    ];
    alertasCards.forEach((c,i)=>{
      const cfg = alertasCfg[i];
      if(cfg){
        c.classList.add('ss-drill');
        c.setAttribute('data-drill', cfg.drill);
        c.setAttribute('data-drill-ctx', cfg.ctx);
      }
    });
  }

  // ==========================================================
  // DRILL-DOWN / AUDITORIA (drawer lateral)
  // ==========================================================
  // Cada "drill" define: source (arquivo JSON) + colunas + como filtrar pela busca.
  // Registrado dinamicamente após render de cada seção via ssRegistrarDrill().
  const DRILLS = {}; // {chave: {carregar, renderizar, titulo, eyebrow}}

  function registrarDrill(chave, def){ DRILLS[chave] = def; }

  function abrirDrawer(chave, ctx){
    const def = DRILLS[chave];
    if(!def){ console.warn('[drill] chave desconhecida:', chave); return; }
    const overlay = ensureDrawer();
    const drawer = document.getElementById('ss-drawer');
    document.getElementById('ss-drawer-eyebrow').textContent = def.eyebrow || 'Detalhe';
    document.getElementById('ss-drawer-title').textContent = (typeof def.titulo === 'function' ? def.titulo(ctx) : def.titulo) || 'Detalhes';
    document.getElementById('ss-drawer-sub').innerHTML = '';
    document.getElementById('ss-drawer-body').innerHTML =
      '<div class="ss-drawer__empty">carregando…</div>';
    overlay.classList.add('on'); drawer.classList.add('on');
    document.body.style.overflow = 'hidden';
    Promise.resolve(def.carregar(ctx)).then(dados=>{
      def.renderizar(dados, ctx);
      atualizarContagemDrawer();
    }).catch(e=>{
      document.getElementById('ss-drawer-body').innerHTML =
        '<div class="ss-drawer__empty"><b>Erro ao carregar</b>'+(e.message||'')+'</div>';
    });
  }
  function fecharDrawer(){
    const overlay = document.getElementById('ss-drawer-overlay');
    const drawer = document.getElementById('ss-drawer');
    if(overlay) overlay.classList.remove('on');
    if(drawer) drawer.classList.remove('on');
    document.body.style.overflow = '';
  }
  function ensureDrawer(){
    let overlay = document.getElementById('ss-drawer-overlay');
    if(overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'ss-drawer-overlay';
    overlay.className = 'ss-drawer-overlay';
    overlay.addEventListener('click', fecharDrawer);
    const drawer = document.createElement('aside');
    drawer.id = 'ss-drawer';
    drawer.className = 'ss-drawer';
    drawer.innerHTML = `
      <div class="ss-drawer__head">
        <div class="ss-drawer__head-left">
          <div class="ss-drawer__eyebrow" id="ss-drawer-eyebrow">Detalhe</div>
          <div class="ss-drawer__title" id="ss-drawer-title">—</div>
          <div class="ss-drawer__sub" id="ss-drawer-sub"></div>
        </div>
        <button class="ss-drawer__close" id="ss-drawer-close" title="Fechar (ESC)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="ss-drawer__toolbar">
        <div class="ss-drawer__search"><input type="text" id="ss-drawer-search" placeholder="Buscar…"></div>
        <div class="ss-drawer__periodo" id="ss-drawer-periodo" style="display:none">
          <select id="ss-drawer-periodo-sel">
            <option value="">Todo o período</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="ytd">Ano corrente</option>
            <option value="custom">Personalizado…</option>
          </select>
          <div id="ss-drawer-periodo-custom" style="display:none">
            <input type="date" id="ss-drawer-periodo-de">
            <span>até</span>
            <input type="date" id="ss-drawer-periodo-ate">
          </div>
        </div>
        <div class="ss-drawer__count" id="ss-drawer-count">—</div>
        <button class="ss-drawer__export" id="ss-drawer-export">Exportar CSV</button>
      </div>
      <div class="ss-drawer__body" id="ss-drawer-body"></div>
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    document.getElementById('ss-drawer-close').addEventListener('click', fecharDrawer);
    document.addEventListener('keydown', e=>{ if(e.key==='Escape') fecharDrawer(); });
    document.getElementById('ss-drawer-search').addEventListener('input', aplicarFiltroDrawer);
    document.getElementById('ss-drawer-periodo-sel').addEventListener('change', e=>{
      const custom = document.getElementById('ss-drawer-periodo-custom');
      custom.style.display = e.target.value === 'custom' ? 'inline-flex' : 'none';
      aplicarFiltroDrawer();
    });
    document.getElementById('ss-drawer-periodo-de').addEventListener('change', aplicarFiltroDrawer);
    document.getElementById('ss-drawer-periodo-ate').addEventListener('change', aplicarFiltroDrawer);
    document.getElementById('ss-drawer-export').addEventListener('click', exportarCSVDrawer);
    return overlay;
  }
  // Aplica busca de texto + filtro de período nas linhas
  function aplicarFiltroDrawer(){
    const q = (document.getElementById('ss-drawer-search')?.value || '').trim().toLowerCase();
    const perSel = document.getElementById('ss-drawer-periodo-sel')?.value || '';
    let dtDe = null, dtAte = null;
    if(perSel === 'custom'){
      const de = document.getElementById('ss-drawer-periodo-de')?.value;
      const ate = document.getElementById('ss-drawer-periodo-ate')?.value;
      if(de) dtDe = de;
      if(ate) dtAte = ate;
    } else if(perSel === 'ytd'){
      dtDe = '2026-01-01';
    } else if(/^\d+$/.test(perSel)){
      const dias = parseInt(perSel,10);
      const d = new Date(); d.setDate(d.getDate() - dias);
      dtDe = d.toISOString().slice(0,10);
    }
    const rows = document.querySelectorAll('#ss-drawer-body tbody tr[data-searchable]');
    rows.forEach(r=>{
      const txt = r.getAttribute('data-searchable').toLowerCase();
      const dt = r.getAttribute('data-date') || '';
      let mostra = true;
      if(q && !txt.includes(q)) mostra = false;
      if(mostra && dtDe && dt && dt < dtDe) mostra = false;
      if(mostra && dtAte && dt && dt > dtAte) mostra = false;
      r.style.display = mostra ? '' : 'none';
    });
    atualizarContagemDrawer();
  }
  function atualizarContagemDrawer(){
    const rows = document.querySelectorAll('#ss-drawer-body tbody tr[data-searchable]');
    const visiveis = Array.from(rows).filter(r=>r.style.display !== 'none').length;
    const el = document.getElementById('ss-drawer-count');
    if(el) el.innerHTML = '<b>'+fmtNum(visiveis)+'</b> de '+fmtNum(rows.length);
  }
  // Mostra/esconde filtro de período conforme o drill declarar
  function configurarFiltroPeriodo(mostrar){
    const el = document.getElementById('ss-drawer-periodo');
    if(el) el.style.display = mostrar ? 'inline-flex' : 'none';
    const sel = document.getElementById('ss-drawer-periodo-sel');
    if(sel) sel.value = '';
    const custom = document.getElementById('ss-drawer-periodo-custom');
    if(custom) custom.style.display = 'none';
  }
  function slugify(s){
    return String(s||'')
      .normalize('NFD').replace(/[̀-ͯ]/g,'')  // remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'')
      .slice(0,60);
  }
  function exportarCSVDrawer(){
    const tbl = document.querySelector('#ss-drawer-body table');
    if(!tbl) return;
    // Usa ; como separador (Excel BR reconhece direto) e BOM UTF-8 pra acentos
    const SEP = ';';
    const linhas = [];
    const heads = Array.from(tbl.querySelectorAll('thead th'))
      .map(th=>'"'+th.textContent.trim().replace(/"/g,'""')+'"');
    linhas.push(heads.join(SEP));
    tbl.querySelectorAll('tbody tr').forEach(tr=>{
      if(tr.style.display==='none') return;
      const cels = Array.from(tr.querySelectorAll('td'))
        .map(td=>'"'+td.textContent.trim().replace(/\s+/g,' ').replace(/"/g,'""')+'"');
      linhas.push(cels.join(SEP));
    });
    // BOM garante que Excel/LibreOffice abram como UTF-8
    const csv = '﻿' + linhas.join('\r\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    // Nome descritivo: titulo do drawer + data
    const titulo = document.getElementById('ss-drawer-title')?.textContent || 'detalhe';
    const dataHoje = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = 'painel-' + slugify(titulo) + '-' + dataHoje + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Helper: render tabela dentro do drawer
  // opts.dateKey — nome da propriedade da linha que tem a data (para filtro periodo)
  function drawerTabela(colunas, linhas, opts){
    opts = opts||{};
    if(!linhas || !linhas.length){
      document.getElementById('ss-drawer-body').innerHTML =
        '<div class="ss-drawer__empty"><b>Sem itens para exibir</b>Nenhum registro encontrado.</div>';
      configurarFiltroPeriodo(false);
      return;
    }
    const html = `<table class="ss-table">
      <thead><tr>${colunas.map(c=>`<th class="${c.num?'num':''}">${c.h}</th>`).join('')}</tr></thead>
      <tbody>${linhas.map(l=>{
        const searchable = colunas.map(c=>c.render(l)).join(' ').replace(/<[^>]+>/g,'');
        const warn = l._warn ? ' class="warn"' : '';
        const dt = opts.dateKey ? (l[opts.dateKey]||'') : '';
        const dateAttr = dt ? ` data-date="${String(dt).slice(0,10)}"` : '';
        // linha clicável (cascata pra outro drill)
        const drillAttr = l._drill ? ` data-drill="${l._drill}" data-drill-ctx="${(l._drill_ctx||'').replace(/"/g,'&quot;')}" style="cursor:pointer"` : '';
        const drillCls = l._drill ? ' ss-row-drill' : '';
        return `<tr${warn ? warn : (drillCls ? ` class="${drillCls.trim()}"` : '')} data-searchable="${searchable.replace(/"/g,'&quot;')}"${dateAttr}${drillAttr}>${
          colunas.map(c=>`<td class="${c.num?'num':''} ${c.mute?'mute':''}">${c.render(l)}</td>`).join('')
        }</tr>`;
      }).join('')}</tbody>
    </table>`;
    document.getElementById('ss-drawer-body').innerHTML = html;
    configurarFiltroPeriodo(!!opts.dateKey);
  }

  // ---------- Registrar drills disponíveis ----------
  // Colunas padrão da tabela de contratos (reutilizado nos drills abaixo)
  const COLS_CONTRATO = [
    {h:'Nº', render:c=>c.numero||'—'},
    {h:'Cliente', render:c=>c.cliente_hint || '<span style="color:var(--ss-mute)">'+c.titulo.slice(0,40)+'</span>'},
    {h:'Início', render:c=>fmtData(c.data_inicio), mute:true},
    {h:'Vigência até', render:c=>{
      if(!c.data_final) return '<span style="color:var(--ss-mute)">indeterminada</span>';
      return c.vigencia_vencida
        ? `<span class="ss-tag warn">${fmtData(c.data_final)} · vencida</span>`
        : fmtData(c.data_final);
    }},
    {h:'Valor mensal', num:true, render:c=>{
      if(!c.valor) return '<span class="ss-tag warn">R$ 0</span>';
      return fmtBRL(c.valor);
    }},
  ];

  registrarDrill('contratos-mensais', {
    eyebrow: 'Financeiro · Assessoria mensal',
    titulo: 'Contratos de assessoria mensal',
    carregar: ()=> carregar('detalhe_contratos') ,
    renderizar: (d)=>{
      if(!d || !d.contratos){ drawerTabela([],[]); return; }
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(d.total)}</b> contratos · MRR total <b>${fmtBRLk(d.total_valor_mensal)}</b>` +
        (d.vigencia_vencida ? ` · <span style="color:var(--ss-warn)"><b>${d.vigencia_vencida}</b> com vigência vencida</span>` : '');
      const linhas = d.contratos.slice().sort((a,b)=>b.valor-a.valor).map(c=>({
        ...c, _warn: c.vigencia_vencida
      }));
      drawerTabela(COLS_CONTRATO, linhas, {dateKey:'data_inicio'});
    }
  });

  registrarDrill('maior-contrato', {
    eyebrow: 'Financeiro · Assessoria mensal',
    titulo: 'Maior contrato de assessoria',
    carregar: ()=> carregar('detalhe_contratos'),
    renderizar: (d)=>{
      if(!d || !d.contratos){ drawerTabela([],[]); return; }
      const ord = d.contratos.slice().sort((a,b)=>b.valor-a.valor);
      const top1 = ord[0];
      const sub = document.getElementById('ss-drawer-sub');
      const nomeTop = (top1?.cliente_hint && top1.cliente_hint !== '—') ? top1.cliente_hint : `Contrato nº ${top1?.numero}`;
      sub.innerHTML = top1
        ? `Maior: <b>${nomeTop}</b> · <b>${fmtBRL(top1.valor)}</b>/mês · ranking dos 10 maiores`
        : '';
      drawerTabela(COLS_CONTRATO, ord.slice(0,10).map(c=>({...c, _warn: c.vigencia_vencida})), {dateKey:'data_inicio'});
    }
  });

  registrarDrill('contratos-por-faixa', {
    eyebrow: 'Financeiro · Assessoria mensal',
    titulo: (ctx)=>{
      if(ctx==='acima_10k') return 'Contratos acima de R$ 10 mil';
      if(ctx==='5k_10k') return 'Contratos entre R$ 5 mil e R$ 10 mil';
      if(ctx==='3k_5k') return 'Contratos entre R$ 3 mil e R$ 5 mil';
      if(ctx==='abaixo_3k') return 'Contratos abaixo de R$ 3 mil';
      return 'Contratos por faixa';
    },
    carregar: ()=> carregar('detalhe_contratos'),
    renderizar: (d, ctx)=>{
      if(!d || !d.contratos){ drawerTabela([],[]); return; }
      const filtros = {
        acima_10k: c => c.valor >= 10000,
        '5k_10k':   c => c.valor >= 5000 && c.valor < 10000,
        '3k_5k':    c => c.valor >= 3000 && c.valor < 5000,
        abaixo_3k:  c => c.valor > 0 && c.valor < 3000,
      };
      const fn = filtros[ctx] || (()=>true);
      const linhas = d.contratos.filter(fn).sort((a,b)=>b.valor-a.valor)
        .map(c=>({...c, _warn: c.vigencia_vencida}));
      const total = linhas.reduce((s,c)=>s+c.valor,0);
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${linhas.length}</b> contratos nesta faixa · soma <b>${fmtBRLk(total)}</b>/mês`;
      drawerTabela(COLS_CONTRATO, linhas, {dateKey:'data_inicio'});
    }
  });

  registrarDrill('faturamento-categoria', {
    eyebrow: 'Financeiro · Faturamento',
    titulo: (ctx)=>{
      if(ctx==='mensal') return 'Faturamento · Mensal recorrente';
      if(ctx==='exito') return 'Faturamento · Êxito';
      if(ctx==='outros') return 'Faturamento · Outros honorários';
      if(ctx==='total') return 'Faturamento · Total operacional';
      return 'Faturamento';
    },
    carregar: ()=> carregar('detalhe_planos_receita'),
    renderizar: (d, ctx)=>{
      if(!d || !d.planos){ drawerTabela([],[]); return; }
      const MENSAL_IDS = ['1.1.02'];
      const EXITO_IDS = ['1.1.01','1.1.06','1.1.07'];
      const isMensal = p => MENSAL_IDS.some(id => (p.descricao||'').trim().startsWith(id));
      const isExito = p => EXITO_IDS.some(id => (p.descricao||'').trim().startsWith(id));
      const isOp = p => (p.descricao||'').trim().startsWith('1.');
      let planos = d.planos.filter(isOp);
      if(ctx==='mensal') planos = planos.filter(isMensal);
      else if(ctx==='exito') planos = planos.filter(isExito);
      else if(ctx==='outros') planos = planos.filter(p=>!isMensal(p) && !isExito(p));
      // se ctx==='total', mantém todos operacionais
      planos = planos.sort((a,b)=>(b.total_pago||0)-(a.total_pago||0));
      const total = planos.reduce((s,p)=>s+(p.total_pago||0),0);
      const totQtd = planos.reduce((s,p)=>s+(p.qtd||0),0);
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(planos.length)}</b> planos · <b>${fmtNum(totQtd)}</b> recebimentos · total <b>${fmtBRLk(total)}</b>`;
      // linhas com "por ano" expandido em colunas
      const cols = [
        {h:'Plano de contas', render:p=>p.descricao||'—'},
        {h:'Recebimentos', num:true, render:p=>fmtNum(p.qtd||0)},
        {h:'2022', num:true, render:p=>p.por_ano && p.por_ano['2022'] ? fmtBRLk(p.por_ano['2022']) : '—', mute:true},
        {h:'2023', num:true, render:p=>p.por_ano && p.por_ano['2023'] ? fmtBRLk(p.por_ano['2023']) : '—', mute:true},
        {h:'2024', num:true, render:p=>p.por_ano && p.por_ano['2024'] ? fmtBRLk(p.por_ano['2024']) : '—', mute:true},
        {h:'2025', num:true, render:p=>p.por_ano && p.por_ano['2025'] ? fmtBRLk(p.por_ano['2025']) : '—', mute:true},
        {h:'2026', num:true, render:p=>p.por_ano && p.por_ano['2026'] ? fmtBRLk(p.por_ano['2026']) : '—', mute:true},
        {h:'Total', num:true, render:p=>fmtBRL(p.total_pago||0)},
      ];
      drawerTabela(cols, planos);
    }
  });

  registrarDrill('vendedores', {
    eyebrow: 'Comercial · Vendedores',
    titulo: 'Desempenho por vendedor',
    carregar: ()=> carregar('detalhe_vendedores'),
    renderizar: (d)=>{
      if(!d || !d.vendedores){ drawerTabela([],[]); return; }
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(d.total)}</b> vendedores ativos`;
      drawerTabela([
        {h:'Vendedor', render:v=>v.vendedor||'—'},
        {h:'Enviadas', num:true, render:v=>fmtNum(v.enviadas||0)},
        {h:'Fechadas', num:true, render:v=>`<b>${fmtNum(v.fechadas||0)}</b>`},
        {h:'Recusadas', num:true, render:v=>fmtNum(v.recusadas||0)},
        {h:'Em aberto', num:true, render:v=>fmtNum(v.em_aberto||0)},
        {h:'R$ Fechado', num:true, render:v=>fmtBRLk(v.valor_fechado||0)},
        {h:'R$ Em aberto', num:true, render:v=>fmtBRLk(v.valor_em_aberto||0)},
      ], d.vendedores);
    }
  });

  registrarDrill('top-oportunidades', {
    eyebrow: 'Comercial · Maiores propostas',
    titulo: 'Top oportunidades em aberto',
    carregar: ()=> carregar('detalhe_top_oportunidades'),
    renderizar: (d)=>{
      if(!d || !d.oportunidades){ drawerTabela([],[]); return; }
      document.getElementById('ss-drawer-sub').innerHTML =
        `Top <b>${fmtNum(d.total)}</b> por valor · status 1-3`;
      drawerTabela([
        {h:'Cliente', render:o=>o.cliente||o.nome||'—'},
        {h:'Nome', render:o=>o.nome||'', mute:true},
        {h:'Vendedor', render:o=>o.vendedor||'—', mute:true},
        {h:'Etapa', render:o=>`<span class="ss-tag pri">${o.status_label||'—'}</span>`},
        {h:'Valor', num:true, render:o=>fmtBRL(o.valor_total||0)},
      ], d.oportunidades);
    }
  });

  registrarDrill('planos-receita', {
    eyebrow: 'Financeiro · DRE',
    titulo: 'Planos de contas · Receitas',
    carregar: ()=> carregar('detalhe_planos_receita'),
    renderizar: (d)=>{
      if(!d || !d.planos){ drawerTabela([],[]); return; }
      const totalOp = d.planos.filter(p=>(p.descricao||'').startsWith('1.')).reduce((s,p)=>s+(p.total_pago||0),0);
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(d.total)}</b> planos · operacional (1.x) <b>${fmtBRLk(totalOp)}</b> · <i style="color:var(--ss-mute)">clique num plano pra ver lançamentos</i>`;
      // Drill em cada linha: passar o descricao no atributo data-drill-ctx
      const linhas = d.planos.slice().sort((a,b)=>(b.total_pago||0)-(a.total_pago||0));
      drawerTabela([
        {h:'Plano', render:p=>`<span style="color:var(--ss-navy);font-weight:600">${p.descricao||'—'}</span> <span style="color:var(--ss-mute-2);font-size:10px">↗</span>`},
        {h:'Recebimentos', num:true, render:p=>fmtNum(p.qtd||0)},
        {h:'Total pago', num:true, render:p=>fmtBRL(p.total_pago||p.total||0)},
      ], linhas.map(p => ({...p, _drill:'lancamentos-receita', _drill_ctx:p.descricao})));
    }
  });

  registrarDrill('planos-despesa', {
    eyebrow: 'Financeiro · DRE',
    titulo: 'Planos de contas · Despesas',
    carregar: ()=> carregar('detalhe_planos_despesa'),
    renderizar: (d)=>{
      if(!d || !d.planos){ drawerTabela([],[]); return; }
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(d.total)}</b> planos · <i style="color:var(--ss-mute)">clique num plano pra ver lançamentos</i>`;
      const linhas = d.planos.slice().sort((a,b)=>(b.total_pago||0)-(a.total_pago||0));
      drawerTabela([
        {h:'Plano', render:p=>`<span style="color:var(--ss-navy);font-weight:600">${p.descricao||'—'}</span> <span style="color:var(--ss-mute-2);font-size:10px">↗</span>`},
        {h:'Total pago', num:true, render:p=>fmtBRL(p.total_pago||p.total||0)},
      ], linhas.map(p => ({...p, _drill:'lancamentos-despesa', _drill_ctx:p.descricao})));
    }
  });

  // Helper: busca um plano no índice pelo desc, retorna { pasta, hash, qtd, total_valor }
  async function acharPlano(tipoIndice, desc){
    const idx = await carregar(tipoIndice);
    if(!idx || !idx.planos) return null;
    const p = idx.planos.find(pp => pp.descricao === desc);
    return p ? {...p, pasta: idx.pasta} : null;
  }
  async function baixarLancamentosPlano(tipoIndice, desc){
    const meta = await acharPlano(tipoIndice, desc);
    if(!meta) return null;
    const url = meta.pasta + '/' + meta.hash + '.json';
    try{
      const r = await fetch(url, {cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    }catch(e){
      console.warn('[drill] falhou baixar lancamentos:', e);
      return null;
    }
  }

  // Drill: lançamentos individuais de um plano específico (Receita)
  registrarDrill('lancamentos-receita', {
    eyebrow: 'Financeiro · Lançamentos',
    titulo: (ctx)=> ctx ? `Recebimentos · ${ctx}` : 'Recebimentos',
    carregar: (ctx)=> baixarLancamentosPlano('lancamentos_receitas_indice', ctx),
    renderizar: (plano, ctx)=>{
      if(!plano){
        document.getElementById('ss-drawer-body').innerHTML =
          `<div class="ss-drawer__empty"><b>Plano não encontrado ou sem lançamentos</b>${ctx||''}</div>`;
        return;
      }
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(plano.qtd)}</b> recebimentos · total <b>${fmtBRL(plano.total_valor)}</b>`;
      drawerTabela([
        {h:'Data', render:l=>fmtData(l.data_pagamento), mute:true},
        {h:'Descrição', render:l=>l.descricao || '<span style="color:var(--ss-mute)">—</span>'},
        {h:'Cliente ID', render:l=>l.id_cliente || '—', mute:true},
        {h:'Valor', num:true, render:l=>fmtBRL(l.valor||0)},
      ], plano.lancamentos, {dateKey:'data_pagamento'});
    }
  });

  // Drill: lançamentos individuais de um plano específico (Despesa)
  registrarDrill('lancamentos-despesa', {
    eyebrow: 'Financeiro · Lançamentos',
    titulo: (ctx)=> ctx ? `Despesas · ${ctx}` : 'Despesas',
    carregar: (ctx)=> baixarLancamentosPlano('lancamentos_despesas_indice', ctx),
    renderizar: (plano, ctx)=>{
      if(!plano){
        document.getElementById('ss-drawer-body').innerHTML =
          `<div class="ss-drawer__empty"><b>Plano não encontrado ou sem lançamentos</b>${ctx||''}</div>`;
        return;
      }
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(plano.qtd)}</b> despesas · total <b>${fmtBRL(plano.total_valor)}</b>`;
      drawerTabela([
        {h:'Data', render:l=>fmtData(l.data_pagamento), mute:true},
        {h:'Descrição', render:l=>l.descricao || '<span style="color:var(--ss-mute)">—</span>'},
        {h:'Fornecedor ID', render:l=>l.id_fornecedor || l.id_cliente || '—', mute:true},
        {h:'Valor', num:true, render:l=>fmtBRL(l.valor||0)},
      ], plano.lancamentos, {dateKey:'data_pagamento'});
    }
  });

  registrarDrill('processos-por-area', {
    eyebrow: 'Produção · Carteira',
    titulo: 'Processos ativos por área',
    carregar: async ()=>{
      const agregado = await carregar('detalhe_processos_por_area');
      const indice = await carregar('processos_por_area_indice');
      return { agregado, indice };
    },
    renderizar: ({agregado, indice})=>{
      if(!agregado || !agregado.areas){ drawerTabela([],[]); return; }
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(agregado.total)}</b> processos ativos · <b>${agregado.areas.length}</b> áreas · <i style="color:var(--ss-mute)">clique para detalhar</i>`;
      // se tem indice detalhado, permite clique em cascata
      const areasComDetalhe = new Set((indice?.areas||[]).map(a => (a.area_nome||'').toLowerCase()));
      drawerTabela([
        {h:'Área do direito', render:a=>{
          const nome = a.area||a.nome||'—';
          const temDetalhe = areasComDetalhe.has(nome.toLowerCase());
          return temDetalhe
            ? `<span style="color:var(--ss-navy);font-weight:600">${nome}</span> <span style="color:var(--ss-mute-2);font-size:10px">↗</span>`
            : nome;
        }},
        {h:'Ativos', num:true, render:a=>fmtNum(a.ativos||a.total||0)},
      ], agregado.areas.map(a=>{
        const nome = a.area||a.nome||'';
        const temDetalhe = areasComDetalhe.has(nome.toLowerCase());
        return temDetalhe ? {...a, _drill:'processos-area-lista', _drill_ctx:nome} : a;
      }));
    }
  });

  // Helper: baixa processos de uma area especifica
  async function baixarProcessosArea(nomeArea){
    const idx = await carregar('processos_por_area_indice');
    if(!idx || !idx.areas) return null;
    const meta = idx.areas.find(a => (a.area_nome||'').toLowerCase() === (nomeArea||'').toLowerCase());
    if(!meta) return null;
    try{
      const r = await fetch(idx.pasta + '/' + meta.hash + '.json', {cache:'no-store'});
      if(!r.ok) return null;
      return await r.json();
    }catch(e){ return null; }
  }

  // Drill: lista de processos de uma área específica
  registrarDrill('processos-area-lista', {
    eyebrow: 'Produção · Carteira por área',
    titulo: (ctx)=> ctx ? `Processos ativos · ${ctx}` : 'Processos ativos',
    carregar: (ctx)=> baixarProcessosArea(ctx),
    renderizar: (d, ctx)=>{
      if(!d || !d.processos){
        document.getElementById('ss-drawer-body').innerHTML =
          `<div class="ss-drawer__empty"><b>Área sem coleta individual</b>${ctx||''}</div>`;
        return;
      }
      const totalValor = d.processos.reduce((s,p)=>s+(p.valor_causa||0),0);
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(d.qtd)}</b> processos ativos · valor de causa total <b>${fmtBRLk(totalValor)}</b>`;
      drawerTabela([
        {h:'Nº processo', render:p=>p.numero||'—'},
        {h:'Cliente', render:p=>p.cliente||'—'},
        {h:'Contrário', render:p=>p.contrario||'—', mute:true},
        {h:'Advogado', render:p=>p.advogado||'—', mute:true},
        {h:'Cadastro', render:p=>fmtData(p.data_cadastro), mute:true},
        {h:'Valor causa', num:true, render:p=>p.valor_causa ? fmtBRLk(p.valor_causa) : '—'},
      ], d.processos, {dateKey:'data_cadastro'});
    }
  });

  // Drill: processos parados (>30d ou >90d)
  registrarDrill('processos-parados', {
    eyebrow: 'Produção · Alertas',
    titulo: (ctx)=> ctx === '90' ? 'Processos parados há mais de 90 dias' : 'Processos parados há mais de 30 dias',
    carregar: ()=> carregar('processos_parados'),
    renderizar: (d, ctx)=>{
      if(!d || !d.processos){
        document.getElementById('ss-drawer-body').innerHTML =
          '<div class="ss-drawer__empty"><b>Sem coleta individual</b>Os processos parados individuais serão exibidos após a coleta terminar.</div>';
        return;
      }
      // filtra por ctx (30 ou 90)
      const dias = parseInt(ctx,10) || 30;
      const hoje = new Date();
      const filtrados = d.processos.filter(p=>{
        const dt = p.data_atualizacao || p.ultimo_andamento || p.data_cadastro;
        if(!dt) return false;
        const t = new Date(String(dt).slice(0,10));
        if(isNaN(t)) return false;
        const diff = (hoje - t) / (1000*60*60*24);
        return diff >= dias;
      });
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(filtrados.length)}</b> processos parados há mais de <b>${dias} dias</b>`;
      drawerTabela([
        {h:'Nº processo', render:p=>p.numero||'—'},
        {h:'Cliente', render:p=>p.cliente||'—'},
        {h:'Área', render:p=>p.area_nome||'—', mute:true},
        {h:'Advogado', render:p=>p.advogado||'—', mute:true},
        {h:'Última movimentação', render:p=>fmtData(p.data_atualizacao||p.ultimo_andamento||p.data_cadastro), mute:true},
        {h:'Valor causa', num:true, render:p=>p.valor_causa ? fmtBRLk(p.valor_causa) : '—'},
      ], filtrados, {dateKey:'data_atualizacao'});
    }
  });

  // Drill: processos grandes (valor de causa alto)
  registrarDrill('processos-grandes', {
    eyebrow: 'Produção · Alertas',
    titulo: (ctx)=> ctx === '500000' ? 'Processos com causa ≥ R$ 500 mil' : 'Processos com causa ≥ R$ 1 milhão',
    carregar: ()=> carregar('processos_grandes'),
    renderizar: (d, ctx)=>{
      if(!d || !d.processos){
        document.getElementById('ss-drawer-body').innerHTML =
          '<div class="ss-drawer__empty"><b>Sem coleta individual</b>Os processos grandes serão exibidos após a coleta terminar.</div>';
        return;
      }
      const corte = parseInt(ctx,10) || 1000000;
      const filtrados = d.processos.filter(p => (p.valor_causa||0) >= corte)
        .sort((a,b)=>(b.valor_causa||0)-(a.valor_causa||0));
      const totalValor = filtrados.reduce((s,p)=>s+(p.valor_causa||0),0);
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(filtrados.length)}</b> processos · valor de causa ≥ <b>${fmtBRLk(corte)}</b> · total <b>${fmtBRLk(totalValor)}</b>`;
      drawerTabela([
        {h:'Nº processo', render:p=>p.numero||'—'},
        {h:'Cliente', render:p=>p.cliente||'—'},
        {h:'Contrário', render:p=>p.contrario||'—', mute:true},
        {h:'Área', render:p=>p.area_nome||'—', mute:true},
        {h:'Cadastro', render:p=>fmtData(p.data_cadastro), mute:true},
        {h:'Valor causa', num:true, render:p=>fmtBRLk(p.valor_causa||0)},
      ], filtrados, {dateKey:'data_cadastro'});
    }
  });

  // Drill: oportunidades por etapa do funil
  registrarDrill('oportunidades-etapa', {
    eyebrow: 'Comercial · Funil',
    titulo: (ctx)=>{
      const lbl = {'1':'Briefing','2':'Proposta','3':'Negociação','4':'Fechado','5':'Recusado'};
      return `Oportunidades · ${lbl[ctx]||'Todas'}`;
    },
    carregar: ()=> carregar('detalhe_oportunidades_completo'),
    renderizar: (d, ctx)=>{
      if(!d || !d.oportunidades){
        document.getElementById('ss-drawer-body').innerHTML =
          '<div class="ss-drawer__empty"><b>Sem coleta individual</b>As oportunidades individuais serão exibidas após a coleta terminar.</div>';
        return;
      }
      const filtradas = ctx ? d.oportunidades.filter(o=>String(o.status)===String(ctx)) : d.oportunidades;
      const soma = filtradas.reduce((s,o)=>s+(o.valor_total||0),0);
      const zeradas = filtradas.filter(o=>!o.valor_total).length;
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(filtradas.length)}</b> oportunidades · valor total <b>${fmtBRLk(soma)}</b>` +
        (zeradas ? ` · <span style="color:var(--ss-warn)"><b>${zeradas}</b> sem valor cadastrado</span>` : '');
      drawerTabela([
        {h:'Nº', render:o=>o.numero||'—'},
        {h:'Cliente', render:o=>o.cliente_nome||'—'},
        {h:'Descrição', render:o=>o.nome||'—', mute:true},
        {h:'Vendedor', render:o=>o.responsavel_nome||'—', mute:true},
        {h:'Data', render:o=>fmtData(o.data), mute:true},
        {h:'Valor', num:true, render:o=>o.valor_total ? fmtBRL(o.valor_total) : '<span class="ss-tag warn">R$ 0</span>'},
      ], filtradas.slice().sort((a,b)=>(b.valor_total||0)-(a.valor_total||0)), {dateKey:'data'});
    }
  });

  // Drill: oportunidades de um vendedor específico
  registrarDrill('oportunidades-vendedor', {
    eyebrow: 'Comercial · Vendedor',
    titulo: (ctx)=> ctx ? `Oportunidades · ${ctx}` : 'Oportunidades',
    carregar: ()=> carregar('detalhe_oportunidades_completo'),
    renderizar: (d, ctx)=>{
      if(!d || !d.oportunidades){
        document.getElementById('ss-drawer-body').innerHTML =
          '<div class="ss-drawer__empty"><b>Sem coleta individual</b>As oportunidades individuais serão exibidas após a coleta terminar.</div>';
        return;
      }
      const alvo = (ctx||'').toLowerCase();
      const filtradas = d.oportunidades.filter(o => (o.responsavel_nome||'').toLowerCase() === alvo);
      const lbl = {'1':'Briefing','2':'Proposta','3':'Negociação','4':'Fechado','5':'Recusado'};
      const porStatus = {};
      filtradas.forEach(o => { porStatus[o.status] = (porStatus[o.status]||0)+1; });
      const resumo = Object.entries(porStatus).map(([s,q]) => `${lbl[s]||s}: <b>${q}</b>`).join(' · ');
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(filtradas.length)}</b> oportunidades · ${resumo}`;
      drawerTabela([
        {h:'Nº', render:o=>o.numero||'—'},
        {h:'Cliente', render:o=>o.cliente_nome||'—'},
        {h:'Descrição', render:o=>o.nome||'—', mute:true},
        {h:'Etapa', render:o=>`<span class="ss-tag">${lbl[o.status]||o.status||'—'}</span>`},
        {h:'Data', render:o=>fmtData(o.data), mute:true},
        {h:'Valor', num:true, render:o=>o.valor_total ? fmtBRL(o.valor_total) : '<span class="ss-tag warn">R$ 0</span>'},
      ], filtradas.slice().sort((a,b)=>(b.valor_total||0)-(a.valor_total||0)), {dateKey:'data'});
    }
  });


  // Drill: despesas em aberto de um mês específico (contas a pagar)
  registrarDrill('fluxo-despesas-mes', {
    eyebrow: 'Financeiro · Contas a pagar',
    titulo: (ctx)=> ctx ? `Pagamentos previstos · ${fmtMesAno(ctx)}` : 'Pagamentos previstos',
    carregar: ()=> carregar('fluxo_futuro_despesas'),
    renderizar: (d, ctx)=>{
      if(!d || !d.despesas){ drawerTabela([],[]); return; }
      const filtradas = d.despesas.filter(r => String(r.data_vencimento||'').slice(0,7) === ctx)
        .sort((a,b)=>String(a.data_vencimento).localeCompare(String(b.data_vencimento)));
      const soma = filtradas.reduce((s,r)=>s+(r.valor||0),0);
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(filtradas.length)}</b> pagamentos previstos · total <b>${fmtBRL(soma)}</b>`;
      drawerTabela([
        {h:'Vencimento', render:r=>fmtData(r.data_vencimento), mute:true},
        {h:'Plano', render:r=>r.plano_desc||'—', mute:true},
        {h:'Descrição', render:r=>r.descricao||'<span style="color:var(--ss-mute)">—</span>'},
        {h:'Fornecedor ID', render:r=>r.id_fornecedor||'—', mute:true},
        {h:'Forma', render:r=>r.forma_pagamento||'—', mute:true},
        {h:'Valor', num:true, render:r=>fmtBRL(r.valor||0)},
      ], filtradas, {dateKey:'data_vencimento'});
    }
  });

  // Drill: receitas em aberto de um mês específico (fluxo de caixa)
  registrarDrill('fluxo-mes', {
    eyebrow: 'Financeiro · Fluxo de caixa',
    titulo: (ctx)=> ctx ? `Recebimentos previstos · ${fmtMesAno(ctx)}` : 'Recebimentos previstos',
    carregar: ()=> carregar('fluxo_futuro_receitas'),
    renderizar: (d, ctx)=>{
      if(!d || !d.receitas){ drawerTabela([],[]); return; }
      const filtradas = d.receitas.filter(r => String(r.data_vencimento||'').slice(0,7) === ctx)
        .sort((a,b)=>String(a.data_vencimento).localeCompare(String(b.data_vencimento)));
      const soma = filtradas.reduce((s,r)=>s+(r.valor||0),0);
      document.getElementById('ss-drawer-sub').innerHTML =
        `<b>${fmtNum(filtradas.length)}</b> recebimentos previstos · total <b>${fmtBRL(soma)}</b>`;
      drawerTabela([
        {h:'Vencimento', render:r=>fmtData(r.data_vencimento), mute:true},
        {h:'Plano', render:r=>r.plano_desc||'—', mute:true},
        {h:'Descrição', render:r=>r.descricao||'<span style="color:var(--ss-mute)">—</span>'},
        {h:'Parcela', render:r=>r.parcela && r.parcelas ? `${r.parcela}/${r.parcelas}` : '—', mute:true},
        {h:'Cliente ID', render:r=>r.id_cliente||'—', mute:true},
        {h:'Valor', num:true, render:r=>fmtBRL(r.valor||0)},
      ], filtradas, {dateKey:'data_vencimento'});
    }
  });

  // Expor globalmente pra os handlers onclick usarem
  window.ssDrill = abrirDrawer;

  // Delegação de clique nos elementos com [data-drill]
  document.addEventListener('click', (e)=>{
    const el = e.target.closest('[data-drill]');
    if(!el) return;
    const chave = el.getAttribute('data-drill');
    const ctx = el.getAttribute('data-drill-ctx');
    abrirDrawer(chave, ctx);
  });

  // Adicionar arquivos de detalhe ao ARQUIVOS pra carregamento
  Object.assign(ARQUIVOS, {
    detalhe_contratos: 'dados/detalhe_contratos_mensais.json',
    detalhe_vendedores: 'dados/detalhe_vendedores.json',
    detalhe_top_oportunidades: 'dados/detalhe_top_oportunidades.json',
    detalhe_planos_receita: 'dados/detalhe_planos_receita.json',
    detalhe_planos_despesa: 'dados/detalhe_planos_despesa.json',
    detalhe_processos_por_area: 'dados/detalhe_processos_por_area.json',
    lancamentos_receitas_indice: 'dados/lancamentos_receitas_indice.json',
    lancamentos_despesas_indice: 'dados/lancamentos_despesas_indice.json',
    detalhe_oportunidades_completo: 'dados/detalhe_oportunidades_completo.json',
    processos_por_area_indice: 'dados/processos_por_area_indice.json',
    processos_parados: 'dados/processos_parados.json',
    processos_grandes: 'dados/processos_grandes.json',
    fluxo_futuro_receitas: 'dados/fluxo_futuro_receitas.json',
    fluxo_futuro_despesas: 'dados/fluxo_futuro_despesas.json',
    comparativo_fixa: 'dados/comparativo_fixa.json',
    timesheet_30d: 'dados/timesheet_ultimos_30d.json',
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
