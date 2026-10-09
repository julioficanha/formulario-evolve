// Apps Script Web App para o formulário ACEFB na sua visão.
// Deploy: Implementar > Nova implementação > Tipo: App da Web
//   Executar como: Eu
//   Quem pode acessar: Qualquer pessoa
// Depois copie a URL /exec e cole em src/submit.js (APPS_SCRIPT_URL).

const SPREADSHEET_ID = 'TROQUE_PELO_ID_DA_PLANILHA';
const ABA = 'Respostas';
const CABECALHO = [
  'timestamp_iso', 'uuid',
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10',
  'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20'
];
const SEPARADOR = ' | ';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = garantirAba_();
    const linha = montarLinha_(body);
    sheet.appendRow(linha);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function garantirAba_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(ABA);
  if (!sheet) {
    sheet = ss.insertSheet(ABA);
    sheet.appendRow(CABECALHO);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(CABECALHO);
  }
  return sheet;
}

function montarLinha_(body) {
  const tz = 'America/Sao_Paulo';
  const timestamp = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const linha = [timestamp, body.uuid || ''];
  for (let i = 1; i <= 20; i++) {
    const key = 'p' + i;
    const v = body[key];
    if (v === undefined || v === null) linha.push('');
    else if (Array.isArray(v)) linha.push(v.join(SEPARADOR));
    else linha.push(String(v));
  }
  return linha;
}
