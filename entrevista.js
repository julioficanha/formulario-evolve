// Variante entrevista — mesmo modelo visual uma-pergunta-por-tela,
// mas linear p1 → p20 (ignora branching), com botão Pular por pergunta,
// Voltar sempre disponível, contador por sessão e payload com
// `modo: "entrevista"` + uuid.

import { perguntas, mensagemFinal } from './src/perguntas.js';
import { proximaPerguntaLinear } from './src/estado.js';
import { validarResposta } from './src/validacao.js';
import { renderPerguntaUnica } from './src/render.js';
import { APPS_SCRIPT_URL, gerarUuid } from './src/submit.js';

const CHAVE_CONTADOR = 'acefb-entrevistas-contador';

const estado = {
  tela: 'inicio',          // 'inicio' | perguntaId | 'fim'
  respostas: {},
  puladas: new Set(),
  historico: [],
};

const appEl = document.getElementById('app');

function render() {
  appEl.innerHTML = '';
  appEl.appendChild(renderProgresso());

  if (estado.tela === 'inicio') {
    appEl.appendChild(renderInicio());
  } else if (estado.tela === 'fim') {
    // enviar() renderiza a tela final
  } else {
    const pergunta = perguntas.find(p => p.id === estado.tela);
    const perguntaEl = renderPerguntaUnica(pergunta, estado.respostas[pergunta.id], onChangeResposta);
    if (estado.puladas.has(pergunta.id)) perguntaEl.classList.add('pulada');
    appEl.appendChild(renderCabecalhoEntrevista());
    appEl.appendChild(perguntaEl);
    appEl.appendChild(renderAcoesPergunta(pergunta));
    focarPrimeiroCampo();
  }
}

function renderProgresso() {
  const bar = document.createElement('div');
  bar.className = 'progresso';
  const fill = document.createElement('div');
  fill.className = 'progresso-fill';
  fill.style.width = calcProgresso() + '%';
  bar.appendChild(fill);
  return bar;
}

function calcProgresso() {
  if (estado.tela === 'inicio') return 0;
  if (estado.tela === 'fim') return 100;
  const idx = perguntas.findIndex(p => p.id === estado.tela);
  return Math.round(((idx + 1) / perguntas.length) * 100);
}

function renderCabecalhoEntrevista() {
  const el = document.createElement('div');
  el.innerHTML = `<div class="modo-entrevista-tag">Modo entrevista</div>`;
  return el;
}

function renderInicio() {
  const n = lerContador();
  const el = document.createElement('section');
  el.className = 'tela tela-inicio pergunta-ativa';
  el.innerHTML = `
    <div class="modo-entrevista-tag">Modo entrevista</div>
    <h1>ACEFB na sua visão</h1>
    <p class="subtitulo">Entrevista presencial</p>
    <div class="descricao">
      <p>Preencha conforme a conversa. Todas as perguntas aparecem na ordem, sem desvios.</p>
      <p>Use <strong>Pular pergunta</strong> quando a pessoa recusar responder e <strong>Voltar</strong> para corrigir.</p>
    </div>
    <div><span class="contador-entrevista">Entrevistas enviadas: ${n}</span></div>
  `;
  const acoes = document.createElement('div');
  acoes.className = 'acoes';
  const espacador = document.createElement('div');
  espacador.className = 'espacador';
  acoes.appendChild(espacador);
  const btn = document.createElement('button');
  btn.className = 'botao-principal';
  btn.textContent = 'Nova entrevista';
  btn.addEventListener('click', comecar);
  acoes.appendChild(btn);
  el.appendChild(acoes);
  return el;
}

function renderAcoesPergunta(pergunta) {
  const acoes = document.createElement('div');
  acoes.className = 'acoes';

  if (estado.historico.length > 0) {
    const voltar = document.createElement('button');
    voltar.className = 'botao-secundario';
    voltar.textContent = '← Voltar';
    voltar.addEventListener('click', voltarPergunta);
    acoes.appendChild(voltar);
  }

  const pular = document.createElement('button');
  pular.className = 'botao-pular';
  pular.textContent = 'Pular pergunta';
  pular.addEventListener('click', () => pularPergunta(pergunta.id));
  acoes.appendChild(pular);

  const espacador = document.createElement('div');
  espacador.className = 'espacador';
  acoes.appendChild(espacador);

  const btn = document.createElement('button');
  btn.className = 'botao-principal';
  btn.textContent = ehUltimaPergunta(pergunta) ? 'Finalizar' : 'Continuar';
  btn.addEventListener('click', avancar);
  acoes.appendChild(btn);

  const atalho = document.createElement('span');
  atalho.className = 'atalho-teclado';
  atalho.innerHTML = 'Pressione <kbd>Enter</kbd>';
  acoes.appendChild(atalho);

  return acoes;
}

function ehUltimaPergunta(pergunta) {
  return proximaPerguntaLinear(pergunta.id) === 'fim';
}

function focarPrimeiroCampo() {
  const campo = appEl.querySelector('textarea, input[type="text"]');
  if (campo) campo.focus();
}

function onChangeResposta(perguntaId, valor) {
  if (estado.puladas.has(perguntaId)) {
    estado.puladas.delete(perguntaId);
    const el = appEl.querySelector(`.tela[data-id="${perguntaId}"]`);
    if (el) el.classList.remove('pulada');
  }
  estado.respostas[perguntaId] = valor;
  const erroEl = appEl.querySelector(`[data-erro-para="${perguntaId}"]`);
  if (erroEl) erroEl.textContent = '';
}

function pularPergunta(id) {
  estado.puladas.add(id);
  delete estado.respostas[id];
  estado.historico.push(estado.tela);
  const prox = proximaPerguntaLinear(id);
  if (prox === 'fim') return enviar();
  estado.tela = prox;
  render();
}

function comecar() {
  estado.respostas = {};
  estado.puladas = new Set();
  estado.historico = [];
  estado.historico.push('inicio');
  estado.tela = perguntas[0].id;
  render();
}

function voltarPergunta() {
  const anterior = estado.historico.pop();
  if (!anterior) return;
  estado.tela = anterior;
  render();
}

function avancar() {
  if (estado.tela === 'inicio') return comecar();
  const pergunta = perguntas.find(p => p.id === estado.tela);
  if (!pergunta) return;

  if (!estado.puladas.has(pergunta.id)) {
    const { ok, erro } = validarResposta(pergunta, estado.respostas[pergunta.id]);
    if (!ok) {
      const erroEl = appEl.querySelector(`[data-erro-para="${pergunta.id}"]`);
      if (erroEl) erroEl.textContent = erro + ' Ou use "Pular pergunta".';
      return;
    }
  }

  const prox = proximaPerguntaLinear(pergunta.id);
  estado.historico.push(estado.tela);
  if (prox === 'fim') return enviar();
  estado.tela = prox;
  render();
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
  renderTelaFinal(n, 'enviando');

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
  } catch {
    atualizarStatus('Falha no envio. Verifique a conexão e tente de novo.', 'erro');
    adicionarBotaoReenviar(corpo, n);
  }
}

function renderTelaFinal(n, estadoEnvio) {
  appEl.innerHTML = '';
  appEl.appendChild(renderProgresso());

  const el = document.createElement('section');
  el.className = 'tela tela-fim pergunta-ativa';
  const classeStatus = estadoEnvio === 'enviando' ? 'status-envio enviando' : 'status-envio';
  const textoStatus = estadoEnvio === 'enviando' ? 'Enviando' : '';
  el.innerHTML = `
    <div class="check-sucesso" aria-hidden="true"></div>
    <h2>Entrevista #${n} enviada</h2>
    <p>${mensagemFinal}</p>
    <div class="${classeStatus}" id="statusEnvio">${textoStatus}</div>
  `;
  const acoes = document.createElement('div');
  acoes.className = 'acoes';
  acoes.id = 'acoesFim';
  const espacador = document.createElement('div');
  espacador.className = 'espacador';
  acoes.appendChild(espacador);
  const nova = document.createElement('button');
  nova.className = 'botao-principal';
  nova.textContent = 'Nova entrevista';
  nova.addEventListener('click', comecar);
  acoes.appendChild(nova);
  el.appendChild(acoes);
  appEl.appendChild(el);
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
    } catch {
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

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.tagName === 'TEXTAREA') return;
  if (e.target.tagName === 'BUTTON') return;
  e.preventDefault();
  avancar();
});

render();
