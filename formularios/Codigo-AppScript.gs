/**
 * Silva & Silva — Painel Geral do Escritório
 * Backend único que atende os 4 formulários web:
 *   - metas       → aba "Metas"
 *   - atividade   → aba "Atividade"
 *   - times       → aba "Times"
 *   - reajustes   → aba "Reajustes"
 *
 * Como usar: cole este código em Extensões → Apps Script da planilha
 * "Painel Geral - Dados" e publique como App da Web (INSTRUCOES.md).
 * A URL (/exec) é a MESMA para todos os formulários — cada um envia
 * um campo `_form` identificando a aba.
 *
 * NOTA IMPORTANTE (setembro/2026): a planilha JÁ TEM dados coletados nas
 * abas Atividade/Times/Reajustes. Ao subir esta nova versão, as colunas
 * novas serão APENDADAS automaticamente à direita (as antigas ficam intactas).
 * Nenhuma linha existente é perdida.
 */

// Cabeçalho de cada aba (ordem das colunas na planilha).
var ABAS = {
  metas: {
    nome: "Metas",
    cabecalho: [
      "Data/Hora",
      "Vendedor",
      "Período",           // "semana" ou "mês"
      "Referência",        // ex: "2026-09" ou "2026-W36"
      "Meta Propostas (nº)",
      "Meta Propostas (R$)",
      "Meta Assessorias Mensais",
      "Meta Ligações",
      "Meta Leads",
      "Observações"
    ]
  },
  atividade: {
    nome: "Atividade",
    // NOVO FORMATO (set/2026): 1 linha por atividade individual.
    // Se pessoa lança 3 ligações + 2 reuniões, viram 5 linhas todas com o
    // mesmo Registro ID (agrupa como "1 lançamento do dia").
    cabecalho: [
      "Data/Hora",
      "Data da Atividade",
      "Responsável",
      "Registro ID",         // agrupador (mesmo p/ N linhas do mesmo envio)
      "Tipo",                // Ligação | Lead | Reunião | Proposta
      "Índice",              // 1, 2, 3... dentro do tipo (ex: Ligação 2 de 3)
      "Identificação",       // nome/empresa (obrigatório)
      "Observação",          // por atividade (opcional)
      "Observações do dia"   // observação geral do dia (repete em todas as linhas do mesmo Registro ID)
    ]
  },
  times: {
    nome: "Times",
    cabecalho: [
      "Data/Hora",
      "Advogado",
      "Time / Área Principal",   // renomeada de "Time / Equipe" (aceita ambos os nomes na leitura)
      "Áreas Secundárias",       // NOVO — lista separada por vírgula
      "Líder do Time",
      "Situação",                // "ativo" ou "inativo"
      "E-mail",                  // NOVO
      "Observações"
    ]
  },
  reajustes: {
    nome: "Reajustes",
    cabecalho: [
      "Data/Hora",
      "Cliente",
      "ID Cliente",              // NOVO — id_cliente do EasyJur (facilita cruzamento)
      "Nº Contrato",
      "Data do Reajuste",
      "Valor Anterior (R$)",
      "Valor Novo (R$)",
      "Variação (%)",
      "Índice",                  // IPCA, IGPM, etc
      "Nova Data Final",         // NOVO — nova vigência se veio junto com renovação
      "Aprovado Por",            // NOVO
      "Motivo",
      "Observações"
    ]
  }
};

// Cor dourada usada no cabeçalho (padrão dos painéis).
var COR_FUNDO_HEADER = "#1E223F";
var COR_TEXTO_HEADER = "#CFA36E";

function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);
    var qual = String(dados._form || "").toLowerCase();
    if (!ABAS[qual]) {
      return json_({ ok: false, erro: "Formulário desconhecido: " + qual });
    }
    var cfg = ABAS[qual];
    var aba = pegarAba_(cfg);

    // Atividade tem tratamento especial: gera N linhas (uma por atividade individual)
    if (qual === "atividade") {
      var linhas = montarLinhasAtividade_(dados);
      if (!linhas.length) {
        // sem itens individuais → grava só 1 linha com quantidades zero
        // (mantém compatibilidade caso alguém envie form vazio)
        linhas = [linhaAtividadeVazia_(dados)];
      }
      var startRow = aba.getLastRow() + 1;
      aba.getRange(startRow, 1, linhas.length, linhas[0].length).setValues(linhas);
      return json_({ ok: true, aba: cfg.nome, linhas: linhas.length });
    }

    var linha = montarLinha_(qual, dados);
    aba.appendRow(linha);
    return json_({ ok: true, aba: cfg.nome });
  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  }
}

/**
 * Atividade: transforma o payload em N linhas (uma por atividade individual).
 * Ex.: 3 ligações + 2 reuniões → 5 linhas, todas com o mesmo Registro ID.
 */
function montarLinhasAtividade_(d) {
  var agora = new Date().toLocaleString("pt-BR");
  var dataHora = d.dataHora || agora;
  var dataAt = d.dataAtividade || "";
  var resp = d.responsavel || d.vendedor || "";
  var obsDia = d.observacoes || "";
  var regId = registroId_(dataHora, resp);

  var itens = d.itens || {};
  var mapa = {
    ligacoes: "Ligação",
    leads:    "Lead",
    reunioes: "Reunião",
    propostas:"Proposta"
  };
  var linhas = [];
  Object.keys(mapa).forEach(function (chave) {
    var arr = itens[chave] || [];
    arr.forEach(function (it, i) {
      linhas.push([
        dataHora,
        dataAt,
        resp,
        regId,
        mapa[chave],
        i + 1,
        (it && it.ident) || "",
        (it && it.obs) || "",
        obsDia
      ]);
    });
  });
  return linhas;
}

function linhaAtividadeVazia_(d) {
  var agora = new Date().toLocaleString("pt-BR");
  return [
    d.dataHora || agora,
    d.dataAtividade || "",
    d.responsavel || d.vendedor || "",
    registroId_(d.dataHora || agora, d.responsavel || d.vendedor || ""),
    "",  // Tipo
    "",  // Índice
    "",  // Identificação
    "",  // Observação
    d.observacoes || ""
  ];
}

/**
 * Gera um id curto p/ agrupar as N linhas do mesmo envio (data/hora + responsável).
 * Ex.: "20260904_1547_YASMIN"
 */
function registroId_(dataHora, resp) {
  var d = new Date();
  try {
    // dataHora vem como "04/09/2026 15:47:00" (pt-BR) — tenta parse simples
    if (typeof dataHora === "string" && dataHora.indexOf("/") > -1) {
      var m = dataHora.match(/(\d{2})\/(\d{2})\/(\d{4})[^\d]+(\d{2}):(\d{2})/);
      if (m) d = new Date(m[3], m[2]-1, m[1], m[4], m[5]);
    }
  } catch(e){}
  var pad = function(n){ return n < 10 ? "0"+n : ""+n; };
  var stamp = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate())
            + "_" + pad(d.getHours()) + pad(d.getMinutes());
  var slug = String(resp||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10) || "ANON";
  return stamp + "_" + slug;
}

/**
 * doGet:
 *   sem parâmetro     → status simples
 *   ?dados=1          → devolve TODAS as abas em JSON pra o coletor Python
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.dados == "1") {
    return json_(coletarTodasAbas_());
  }
  return json_({ ok: true, status: "online", abas: Object.keys(ABAS) });
}

/**
 * Lê todas as abas da planilha e devolve como objeto {aba: [linhas]}
 * cada linha é um objeto {nomeColuna: valor}.
 */
function coletarTodasAbas_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = { ok: true, gerado_em: new Date().toISOString(), abas: {} };
  Object.keys(ABAS).forEach(function (qual) {
    var cfg = ABAS[qual];
    var aba = ss.getSheetByName(cfg.nome);
    if (!aba || aba.getLastRow() < 2) {
      out.abas[qual] = [];
      return;
    }
    var range = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn());
    var vals = range.getValues();
    var head = vals.shift().map(function (h) { return String(h).trim(); });
    var linhas = vals.map(function (row) {
      var obj = {};
      head.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
    out.abas[qual] = linhas;
  });
  return out;
}

/**
 * Monta o array na ORDEM do cabeçalho da aba, para cada formulário.
 * Se um campo não vier no POST, entra vazio (não quebra).
 */
function montarLinha_(qual, d) {
  var agora = new Date().toLocaleString("pt-BR");
  if (qual === "metas") {
    return [
      d.dataHora || agora,
      d.vendedor || "",
      d.periodo || "",
      d.referencia || "",
      num_(d.metaPropostasQtd),
      num_(d.metaPropostasValor),
      num_(d.metaAssessorias),
      num_(d.metaLigacoes),
      num_(d.metaLeads),
      d.observacoes || ""
    ];
  }
  // atividade tem tratamento próprio (montarLinhasAtividade_) — não passa por aqui
  if (qual === "times") {
    // areasSec vem como array (checkboxes múltiplos) → junta em string
    var areasSec = d.areasSec;
    if (Array.isArray(areasSec)) areasSec = areasSec.join(", ");
    else if (areasSec == null) areasSec = "";
    return [
      d.dataHora || agora,
      d.advogado || "",
      d.time || "",
      areasSec || "",
      d.lider || "",
      d.situacao || "ativo",
      d.email || "",
      d.observacoes || ""
    ];
  }
  if (qual === "reajustes") {
    var vA = num_(d.valorAnterior);
    var vN = num_(d.valorNovo);
    var variacao = vA > 0 ? ((vN - vA) / vA * 100) : 0;
    return [
      d.dataHora || agora,
      d.cliente || "",
      d.id_cliente || "",
      d.numeroContrato || "",
      d.dataReajuste || "",
      vA,
      vN,
      Math.round(variacao * 100) / 100,
      d.indice || "",
      d.novaDataFinal || "",
      d.aprovadoPor || "",
      d.motivo || "",
      d.observacoes || ""
    ];
  }
  return [];
}

function num_(v) {
  if (v === "" || v == null) return 0;
  var n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

/**
 * Pega (ou cria) a aba, garantindo cabeçalho na primeira linha.
 * Se a aba EXISTE mas tem cabeçalho antigo (menos colunas), estende
 * com as colunas novas à direita — dados antigos ficam intactos.
 */
function pegarAba_(cfg) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(cfg.nome);
  if (!aba) aba = ss.insertSheet(cfg.nome);
  if (aba.getLastRow() === 0) {
    // aba nova — insere cabeçalho completo
    aba.appendRow(cfg.cabecalho);
    aplicarEstiloCabecalho_(aba, cfg.cabecalho.length);
    aba.setFrozenRows(1);
    return aba;
  }
  // aba existente — verificar se cabeçalho tem todas as colunas novas
  var atual = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var faltando = [];
  cfg.cabecalho.forEach(function (nome) {
    if (atual.indexOf(nome) === -1) faltando.push(nome);
  });
  if (faltando.length) {
    var startCol = aba.getLastColumn() + 1;
    aba.getRange(1, startCol, 1, faltando.length).setValues([faltando]);
    aplicarEstiloCabecalho_(aba, aba.getLastColumn());
  }
  return aba;
}

function aplicarEstiloCabecalho_(aba, nCols) {
  aba.getRange(1, 1, 1, nCols)
    .setFontWeight("bold")
    .setBackground(COR_FUNDO_HEADER)
    .setFontColor(COR_TEXTO_HEADER);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
