/* ============================================================
   form.js — envio dos formulários + modais (spinner/check/erro)
   Cada HTML define window.APPS_SCRIPT_URL, window.FORM_ID e chama
   formSetup({form, campos, extra}) passando o form e os IDs dos campos.
   ============================================================ */
(function(){
'use strict';

// Injeta o HTML dos 3 estados do modal (loading, sucesso, erro).
function injetarModal(){
  if(document.getElementById('modal-overlay')) return;
  const el = document.createElement('div');
  el.id = 'modal-overlay'; el.className = 'modal-overlay';
  el.innerHTML = `
    <div class="modal-box">
      <div id="modal-loading" class="modal-loading">
        <div class="spinner"></div>
        <div class="modal-txt">Enviando…</div>
      </div>
      <div id="modal-done" class="modal-done" style="display:none">
        <svg class="check-circle" width="66" height="66" viewBox="0 0 66 66">
          <circle class="ck-c" cx="33" cy="33" r="28" fill="none"/>
          <path class="ck-p" fill="none" d="M20 34 l10 10 l17 -20"/>
        </svg>
        <div class="modal-txt" id="modal-done-txt">Registro salvo com sucesso!</div>
        <button class="modal-close" onclick="__modalClose()">Fechar</button>
      </div>
      <div id="modal-err" class="modal-err" style="display:none">
        <div class="err-circle">!</div>
        <div class="modal-txt" id="modal-err-txt">Erro ao enviar.</div>
        <button class="modal-close alt" onclick="__modalClose()">Fechar</button>
      </div>
    </div>`;
  document.body.appendChild(el);
}
function estado(qual){
  ['loading','done','err'].forEach(s=>{
    const e = document.getElementById('modal-'+s);
    if(e) e.style.display = (s===qual? 'flex' : 'none');
  });
}
function abrirModal(estadoInicial){
  injetarModal();
  const ov = document.getElementById('modal-overlay');
  estado(estadoInicial||'loading');
  ov.classList.add('show');
}
window.__modalClose = function(){
  const ov = document.getElementById('modal-overlay');
  if(ov) ov.classList.remove('show');
};

/**
 * Configura o formulário para enviar via POST ao Apps Script.
 * @param {Object} opts
 * @param {HTMLFormElement} opts.form  o <form>
 * @param {string} opts.formId         valor de _form ('metas','atividade','times','reajustes')
 * @param {Function} [opts.beforeSend] recebe o objeto de dados; pode modificar/validar (retornar false cancela)
 * @param {string} [opts.msgOk]        texto de sucesso
 */
window.formSetup = function(opts){
  const {form, formId, beforeSend, msgOk} = opts;
  const APPS_URL = (window.APPS_SCRIPT_URL || '').trim();

  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    // coleta os campos (todos que têm name)
    const fd = new FormData(form);
    const dados = { _form: formId };
    fd.forEach((v,k)=> dados[k] = v);
    dados.dataHora = new Date().toLocaleString('pt-BR');
    if(beforeSend){
      const r = beforeSend(dados);
      if(r === false) return;
    }

    abrirModal('loading');

    if(!APPS_URL){
      // MODO TESTE
      setTimeout(()=>{
        document.getElementById('modal-done-txt').innerHTML =
          '<b>MODO TESTE</b><br><small style="font-weight:500;color:var(--txt-dim)">URL do Apps Script vazia. Dados NÃO foram gravados.<br>Preencha <code>APPS_SCRIPT_URL</code> para gravar de verdade.</small>';
        estado('done');
        form.reset();
      }, 700);
      console.log('[TESTE] enviaria:', dados);
      return;
    }

    try{
      await fetch(APPS_URL, {
        method:'POST', mode:'no-cors',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify(dados)
      });
      // no-cors: assumimos sucesso (Apps Script devolve JSON mas fica opaco)
      document.getElementById('modal-done-txt').textContent = msgOk || 'Registro salvo com sucesso!';
      estado('done');
      form.reset();
      if(typeof opts.afterOk === 'function') opts.afterOk();
    }catch(e){
      document.getElementById('modal-err-txt').textContent = 'Erro ao enviar: ' + e.message;
      estado('err');
    }
  });
};

// Helper: máscara simples de moeda brasileira em input
window.mascaraMoeda = function(input){
  input.addEventListener('input', ()=>{
    let v = input.value.replace(/\D/g,'');
    if(!v){ input.value = ''; return; }
    v = (parseInt(v,10)/100).toFixed(2);
    input.value = v.replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  });
};

// Helper: preencher input date com hoje
window.dataHoje = function(input){
  input.value = new Date().toISOString().slice(0,10);
};

})();
