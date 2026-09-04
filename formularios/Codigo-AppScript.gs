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
    cabecalho: [
      "Data/Hora",
      "Data da Atividade",
      "Responsável",                  // renomeado de "Vendedor" — coletor aceita ambos
      "Ligações Realizadas",
      "Ligações · Com quem",          // NOVO — nomes separados por vírgula
      "Leads Novos",
      "Leads · Nomes",                // NOVO
      "Reuniões",
      "Reuniões · Com quem",          // NOVO
      "Propostas Enviadas Hoje",
      "Propostas · Para quem",        // NOVO
      "Observações"
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
    var linha = montarLinha_(qual, dados);
    aba.appendRow(linha);
    return json_({ ok: true, aba: cfg.nome });
  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  }
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
  if (qual === "atividade") {
    return [
      d.dataHora || agora,
      d.dataAtividade || "",
      d.vendedor || d.responsavel || "",     // aceita ambos os nomes
      num_(d.ligacoes),
      d.ligacoesNomes || "",
      num_(d.leads),
      d.leadsNomes || "",
      num_(d.reunioes),
      d.reunioesNomes || "",
      num_(d.propostas),
      d.propostasNomes || "",
      d.observacoes || ""
    ];
  }
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
