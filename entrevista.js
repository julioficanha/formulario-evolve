// Variante entrevista — fluxo linear p1 → p20 (ignora branching), com
// botões Voltar e Pular, tela final própria com contador de sessão e
// payload com `modo: "entrevista"` para o Apps Script rotear para a aba
// `Entrevistas`.
//
// Dependências (criadas pela outra IA, arquitetura ES modules):
//   src/perguntas.js   — perguntas, mensagemFinal
//   src/estado.js      — perguntasDaSecao
//   src/validacao.js   — validarResposta
//   src/render.js      — renderSecao
//   src/submit.js      — APPS_SCRIPT_URL, gerarUuid
//
// Esta variante NÃO usa proximaSecao, nem a tela de encerramento padrão,
// nem o retry via localStorage (entrevista é presencial).

import { perguntas, mensagemFinal } from './src/perguntas.js';
import { perguntasDaSecao } from './src/estado.js';
import { validarResposta } from './src/validacao.js';
import { renderSecao } from './src/render.js';
import { APPS_SCRIPT_URL, gerarUuid } from './src/submit.js';

const CHAVE_CONTADOR = 'acefb-entrevistas-contador';

const estado = {
  tela: 'inicio',   // 'inicio' | number (1..7) | 'fim'
  respostas: {},    // { pX: valor }
  puladas: new Set() // ids de perguntas puladas nesta entrevista
};

const appEl = document.getElementById('app');

function render() {
  appEl.innerHTML = '';
  renderCabecalhoProgresso();

  if (estado.tela === 'inicio') {
    appEl.appendChild(renderInicio());
  } else if (estado.tela === 'fim') {
    // Tela final é construída pelo enviar()
  } else {
    appEl.appendChild(renderCabecalhoSecao());
    appEl.appendChild(renderSecao(estado.tela, estado.respostas, onChangeResposta));
    marcarPuladasNoDom();
    adicionarBotoesPular();
    appEl.appendChild(renderAcoesSecao());
  }
}

function renderCabecalhoProgresso() {
  const bar = document.createElement('div');
  bar.className = 'progresso';
  const atual = typeof estado.tela === 'number' ? estado.tela : (estado.tela === 'fim' ? 7 : 0);
  const pct = estado.tela === 'fim' ? 100 : Math.round(((atual - 1) / 7) * 100);
  bar.innerHTML = `<div class="progresso-fill" style="width:${Math.max(0, pct)}%"></div>`;
  appEl.appendChild(bar);

  if (typeof estado.tela === 'number') {
    const label = document.createElement('p');
    label.className = 'progresso-label';
    label.textContent = `Seção ${estado.tela} de 7`;
    appEl.appendChild(label);
  }
}

function renderCabecalhoSecao() {
  const el = document.createElement('div');
  el.innerHTML = `<div class="modo-entrevista-tag">Modo entrevista</div>`;
  return el;
}

function renderInicio() {
  const n = lerContador();
  const el = document.createElement('section');
  el.className = 'tela tela-inicio';
  el.innerHTML = `
    <div class="modo-entrevista-tag">Modo entrevista</div>
    <h1>ACEFB na sua visão</h1>
    <p class="subtitulo">Entrevista presencial</p>
    <div class="descricao">
      <p>Preencha conforme a conversa. Todas as perguntas aparecem na ordem, sem desvios.</p>
      <p>Use <strong>Pular pergunta</strong> quando a pessoa recusar responder e <strong>Voltar</strong> para corrigir.</p>
    </div>
    <div style="text-align:center">
      <div class="contador-entrevista">Entrevistas enviadas: ${n}</div>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'botao-principal';
  btn.textContent = 'Nova entrevista';
  btn.addEventListener('click', comecar);
  el.appendChild(btn);
  return el;
}

function renderAcoesSecao() {
  const el = document.createElement('div');
  el.className = 'acoes-entrevista';
  if (estado.tela > 1) {
    const voltar = document.createElement('button');
    voltar.className = 'botao-secundario';
    voltar.textContent = 'Voltar';
    voltar.addEventListener('click', voltarSecao);
    el.appendChild(voltar);
  }
  const avancar = document.createElement('button');
  avancar.className = 'botao-principal';
  avancar.textContent = estado.tela === 7 ? 'Finalizar' : 'Próxima';
  avancar.addEventListener('click', avancarSecao);
  el.appendChild(avancar);
  return el;
}

function adicionarBotoesPular() {
  const perguntasVisiveis = perguntasDaSecao(estado.tela);
  for (const p of perguntasVisiveis) {
    const wrap = appEl.querySelector(`.pergunta[data-id="${p.id}"]`);
    if (!wrap) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'botao-pular';
    btn.textContent = 'Pular pergunta';
    btn.addEventListener('click', () => pularPergunta(p.id));
    wrap.appendChild(btn);
  }
}

function marcarPuladasNoDom() {
  for (const id of estado.puladas) {
    const wrap = appEl.querySelector(`.pergunta[data-id="${id}"]`);
    if (wrap) wrap.classList.add('pulada');
  }
}

function onChangeResposta(perguntaId, valor) {
  // Qualquer interação desfaz o estado "pulada".
  if (estado.puladas.has(perguntaId)) {
    estado.puladas.delete(perguntaId);
    const wrap = appEl.querySelector(`.pergunta[data-id="${perguntaId}"]`);
    if (wrap) wrap.classList.remove('pulada');
  }
  estado.respostas[perguntaId] = valor;
  const erroEl = appEl.querySelector(`[data-erro-para="${perguntaId}"]`);
  if (erroEl) erroEl.textContent = '';
}

function pularPergunta(id) {
  estado.puladas.add(id);
  delete estado.respostas[id];
  // Limpa o DOM da pergunta (desmarca selections / limpa texto).
  const wrap = appEl.querySelector(`.pergunta[data-id="${id}"]`);
  if (wrap) {
    wrap.classList.add('pulada');
    wrap.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach((i) => {
      i.checked = false;
    });
    wrap.querySelectorAll('textarea, input[type="text"]').forEach((i) => {
      i.value = '';
    });
    const erroEl = wrap.querySelector('[data-erro-para]');
    if (erroEl) erroEl.textContent = '';
  }
}

function comecar() {
  estado.respostas = {};
  estado.puladas = new Set();
  estado.tela = 1;
  render();
  rolarTopo();
}

function voltarSecao() {
  if (typeof estado.tela !== 'number' || estado.tela <= 1) return;
  estado.tela -= 1;
  render();
  rolarTopo();
}

function avancarSecao() {
  const secao = estado.tela;
  const perguntasSecao = perguntasDaSecao(secao);
  let primeiroErro = null;

  for (const p of perguntasSecao) {
    if (estado.puladas.has(p.id)) continue;
    const { ok, erro } = validarResposta(p, estado.respostas[p.id]);
    if (!ok) {
      const erroEl = appEl.querySelector(`[data-erro-para="${p.id}"]`);
      if (erroEl) erroEl.textContent = erro + ' Ou use "Pular pergunta".';
      if (!primeiroErro) primeiroErro = p.id;
    }
  }

  if (primeiroErro) {
    const el = appEl.querySelector(`.pergunta[data-id="${primeiroErro}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (secao === 7) {
    enviar();
  } else {
    estado.tela = secao + 1;
    render();
    rolarTopo();
  }
}

function montarPayload() {
  const payload = { modo: 'entrevista', uuid: gerarUuid() };
  for (const p of perguntas) {
    if (estado.puladas.has(p.id)) continue;
    const v = estado.respostas[p.id];
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    payload[p.id] = v;
  }
  return payload;
}

async function enviar() {
  estado.tela = 'fim';
  const n = lerContador() + 1;
  renderTelaFinal(n, 'enviando', null);

  const payload = montarPayload();
  const corpo = JSON.stringify(payload);

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: corpo
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const json = await resp.json().catch(() => ({ ok: true }));
    if (json.ok === false) throw new Error(json.erro || 'resposta inválida');
    salvarContador(n);
    atualizarStatus('Entrevista enviada com sucesso.', 'ok');
  } catch (err) {
    atualizarStatus('Falha no envio. Verifique a conexão e tente de novo.', 'erro');
    adicionarBotaoReenviar(corpo, n);
  }
}

function renderTelaFinal(n, estadoEnvio, _ignored) {
  appEl.innerHTML = '';
  renderCabecalhoProgresso();

  const el = document.createElement('section');
  el.className = 'tela tela-fim';
  const classeStatus = estadoEnvio === 'enviando' ? 'status-envio enviando' : 'status-envio';
  const textoStatus = estadoEnvio === 'enviando' ? 'Enviando' : '';
  el.innerHTML = `
    <div class="check-sucesso" aria-hidden="true"></div>
    <h2>Entrevista #${n} enviada</h2>
    <p>${mensagemFinal}</p>
    <div class="${classeStatus}" id="statusEnvio">${textoStatus}</div>
  `;
  const acoes = document.createElement('div');
  acoes.className = 'acoes-entrevista';
  acoes.id = 'acoesFim';
  const nova = document.createElement('button');
  nova.className = 'botao-principal';
  nova.textContent = 'Nova entrevista';
  nova.addEventListener('click', comecar);
  acoes.appendChild(nova);
  el.appendChild(acoes);
  appEl.appendChild(el);
  rolarTopo();
}

function adicionarBotaoReenviar(corpo, n) {
  const acoes = document.getElementById('acoesFim');
  if (!acoes) return;
  const btn = document.createElement('button');
  btn.className = 'botao-secundario';
  btn.textContent = 'Tentar reenviar';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    atualizarStatus('Reenviando', 'enviando');
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: corpo
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json().catch(() => ({ ok: true }));
      if (json.ok === false) throw new Error(json.erro || 'resposta inválida');
      salvarContador(n);
      atualizarStatus('Entrevista enviada com sucesso.', 'ok');
      btn.remove();
    } catch (err) {
      atualizarStatus('Ainda não foi. Verifique a conexão.', 'erro');
      btn.disabled = false;
    }
  });
  acoes.insertBefore(btn, acoes.firstChild);
}

function atualizarStatus(msg, classe) {
  const el = document.getElementById('statusEnvio');
  if (!el) return;
  el.textContent = msg;
  el.className = 'status-envio ' + (classe || '');
}

function lerContador() {
  try {
    const v = parseInt(sessionStorage.getItem(CHAVE_CONTADOR) || '0', 10);
    return isNaN(v) ? 0 : v;
  } catch { return 0; }
}
function salvarContador(n) {
  try { sessionStorage.setItem(CHAVE_CONTADOR, String(n)); } catch {}
}

function rolarTopo() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

render();
