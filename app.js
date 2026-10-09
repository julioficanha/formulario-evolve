import { descricaoInicial, mensagemFinal, perguntas } from './src/perguntas.js';
import { renderInicio, renderSecao, renderFim } from './src/render.js';
import { proximaSecao, perguntasDaSecao } from './src/estado.js';
import { validarResposta } from './src/validacao.js';
import { enviarRespostas } from './src/submit.js';

const estado = {
  tela: 'inicio',       // 'inicio' | number (secao) | 'fim'
  secaoAtual: 0,
  respostas: {},
};

const appEl = document.getElementById('app');

function render() {
  appEl.innerHTML = '';
  appEl.appendChild(renderProgresso());

  if (estado.tela === 'inicio') {
    appEl.appendChild(renderInicio(descricaoInicial));
    appEl.appendChild(botao('Começar', iniciar));
  } else if (estado.tela === 'fim') {
    appEl.appendChild(renderFim(mensagemFinal));
  } else {
    appEl.appendChild(renderSecao(estado.tela, estado.respostas, onChangeResposta));
    appEl.appendChild(botao('Próxima', avancar));
  }
}

function renderProgresso() {
  const bar = document.createElement('div');
  bar.className = 'progresso';
  const atual = typeof estado.tela === 'number' ? estado.tela : (estado.tela === 'fim' ? 7 : 0);
  const pct = Math.round(((atual - 1) / 7) * 100);
  bar.innerHTML = `<div class="progresso-fill" style="width:${Math.max(0, pct)}%"></div>`;
  return bar;
}

function botao(label, onClick) {
  const b = document.createElement('button');
  b.className = 'botao-principal';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function onChangeResposta(perguntaId, valor) {
  estado.respostas[perguntaId] = valor;
  // Limpa mensagem de erro, se houver
  const erroEl = appEl.querySelector(`[data-erro-para="${perguntaId}"]`);
  if (erroEl) erroEl.textContent = '';
}

function iniciar() {
  estado.tela = 1;
  render();
}

function avancar() {
  const secao = estado.tela;
  const perguntasSecao = perguntasDaSecao(secao);
  let primeiroErro = null;
  for (const p of perguntasSecao) {
    const { ok, erro } = validarResposta(p, estado.respostas[p.id]);
    if (!ok) {
      const erroEl = appEl.querySelector(`[data-erro-para="${p.id}"]`);
      if (erroEl) erroEl.textContent = erro;
      if (!primeiroErro) primeiroErro = p.id;
    }
  }
  if (primeiroErro) {
    const el = appEl.querySelector(`[data-id="${primeiroErro}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const prox = proximaSecao(secao, estado.respostas);
  if (prox === 'fim') {
    finalizar();
  } else {
    estado.tela = prox;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function finalizar() {
  estado.tela = 'fim';
  render();
  enviarRespostas(estado.respostas);  // fire-and-forget: tela final já apareceu
}

render();
