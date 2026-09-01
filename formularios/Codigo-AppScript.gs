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
      "Vendedor",
      "Ligações Realizadas",
      "Leads Novos",
      "Reuniões",
      "Propostas Enviadas Hoje",
      "Observações"
    ]
  },
  times: {
    nome: "Times",
    cabecalho: [
      "Data/Hora",
      "Advogado",
      "Time / Equipe",
      "Líder do Time",
      "Situação",          // "ativo" ou "inativo"
      "Observações"
    ]
  },
  reajustes: {
    nome: "Reajustes",
    cabecalho: [
      "Data/Hora",
      "Cliente",
      "Nº Contrato",
      "Data do Reajuste",
      "Valor Anterior (R$)",
      "Valor Novo (R$)",
      "Variação (%)",
      "Índice",            // IPCA, IGPM, etc
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

function doGet() {
  return json_({ ok: true, status: "online", abas: Object.keys(ABAS) });
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
      d.vendedor || "",
      num_(d.ligacoes),
      num_(d.leads),
      num_(d.reunioes),
      num_(d.propostas),
      d.observacoes || ""
    ];
  }
  if (qual === "times") {
    return [
      d.dataHora || agora,
      d.advogado || "",
      d.time || "",
      d.lider || "",
      d.situacao || "ativo",
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
      d.numeroContrato || "",
      d.dataReajuste || "",
      vA,
      vN,
      Math.round(variacao * 100) / 100,
      d.indice || "",
      d.motivo || "",
      d.observacoes || ""
    ];
  }
  return [];
}

function num_(v) {
  if (v === "" || v == null) return 0;
  var n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

/**
 * Pega (ou cria) a aba, garantindo cabeçalho na primeira linha.
 */
function pegarAba_(cfg) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(cfg.nome);
  if (!aba) aba = ss.insertSheet(cfg.nome);
  if (aba.getLastRow() === 0) {
    aba.appendRow(cfg.cabecalho);
    aba.getRange(1, 1, 1, cfg.cabecalho.length)
       .setFontWeight("bold")
       .setBackground(COR_FUNDO_HEADER)
       .setFontColor(COR_TEXTO_HEADER);
    aba.setFrozenRows(1);
  }
  return aba;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
