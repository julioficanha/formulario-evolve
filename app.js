import { descricaoInicial, mensagemFinal, perguntas } from './src/perguntas.js';
import { renderInicio, renderFim, renderPerguntaUnica } from './src/render.js';
import { proximaPergunta } from './src/estado.js';
import { validarResposta } from './src/validacao.js';
import { enviarRespostas } from './src/submit.js';

// Uma pergunta por tela. estado.tela guarda o id da pergunta ativa
// ('p1'...'p20') ou os marcadores 'inicio' e 'fim'. historico empilha
// perguntas visitadas para o botão Voltar reconstruir o caminho exato.
const estado = {
  tela: 'inicio',
  respostas: {},
  historico: [],
};

const appEl = document.getElementById('app');

function render() {
  appEl.innerHTML = '';
  appEl.appendChild(renderProgresso());

  if (estado.tela === 'inicio') {
    appEl.appendChild(renderInicio(descricaoInicial));
    appEl.appendChild(renderAcoesInicio());
  } else if (estado.tela === 'fim') {
    appEl.appendChild(renderFim(mensagemFinal));
  } else {
    const pergunta = perguntas.find(p => p.id === estado.tela);
    appEl.appendChild(renderPerguntaUnica(pergunta, estado.respostas[pergunta.id], onChangeResposta));
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

function renderAcoesInicio() {
  const acoes = document.createElement('div');
  acoes.className = 'acoes';
  const espacador = document.createElement('div');
  espacador.className = 'espacador';
  acoes.appendChild(espacador);

  const btn = document.createElement('button');
  btn.className = 'botao-principal';
  btn.textContent = 'Começar';
  btn.addEventListener('click', iniciar);
  acoes.appendChild(btn);

  const atalho = document.createElement('span');
  atalho.className = 'atalho-teclado';
  atalho.innerHTML = 'Pressione <kbd>Enter</kbd>';
  acoes.appendChild(atalho);

  return acoes;
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

  const espacador = document.createElement('div');
  espacador.className = 'espacador';
  acoes.appendChild(espacador);

  const label = ehUltimaPergunta(pergunta) ? 'Enviar' : 'Continuar';
  const btn = document.createElement('button');
  btn.className = 'botao-principal';
  btn.textContent = label;
  btn.addEventListener('click', avancar);
  acoes.appendChild(btn);

  const atalho = document.createElement('span');
  atalho.className = 'atalho-teclado';
  atalho.innerHTML = 'Pressione <kbd>Enter</kbd>';
  acoes.appendChild(atalho);

  return acoes;
}

function ehUltimaPergunta(pergunta) {
  // Se qualquer caminho natural a partir desta pergunta leva a 'fim', vira "Enviar".
  // Cheap heurística: simula com as respostas atuais.
  const prox = proximaPergunta(pergunta.id, estado.respostas);
  return prox === 'fim';
}

function focarPrimeiroCampo() {
  const campo = appEl.querySelector('textarea, input[type="text"]');
  if (campo) campo.focus();
}

function onChangeResposta(perguntaId, valor) {
  estado.respostas[perguntaId] = valor;
  const erroEl = appEl.querySelector(`[data-erro-para="${perguntaId}"]`);
  if (erroEl) erroEl.textContent = '';
  // Atualiza label do botão "Continuar/Enviar" conforme a resposta pode mudar
  // o próximo passo (branching sensível a resposta).
  atualizarLabelContinuar();
}

function atualizarLabelContinuar() {
  if (typeof estado.tela !== 'string' || estado.tela === 'inicio' || estado.tela === 'fim') return;
  const pergunta = perguntas.find(p => p.id === estado.tela);
  if (!pergunta) return;
  const btn = appEl.querySelector('.acoes .botao-principal');
  if (!btn) return;
  btn.textContent = ehUltimaPergunta(pergunta) ? 'Enviar' : 'Continuar';
}

function iniciar() {
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
  if (estado.tela === 'inicio') return iniciar();
  const pergunta = perguntas.find(p => p.id === estado.tela);
  if (!pergunta) return;

  const { ok, erro } = validarResposta(pergunta, estado.respostas[pergunta.id]);
  if (!ok) {
    const erroEl = appEl.querySelector(`[data-erro-para="${pergunta.id}"]`);
    if (erroEl) erroEl.textContent = erro;
    return;
  }

  const prox = proximaPergunta(pergunta.id, estado.respostas);
  estado.historico.push(estado.tela);

  if (prox === 'fim') return finalizar();
  estado.tela = prox;
  render();
}

function finalizar() {
  estado.tela = 'fim';
  render();
  enviarRespostas(estado.respostas); // fire-and-forget
}

// Enter avança (exceto quando o foco está em textarea — nela, Enter cria linha).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.tagName === 'TEXTAREA') return;
  if (e.target.tagName === 'BUTTON') return;
  e.preventDefault();
  avancar();
});

render();
