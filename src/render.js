import { perguntasDaSecao } from './estado.js';
import { aplicarRegrasExclusividade } from './validacao.js';

export function renderInicio(descricao) {
  const el = document.createElement('section');
  el.className = 'tela tela-inicio';
  el.innerHTML = `
    <h1>ACEFB na sua visão</h1>
    <p class="subtitulo">Percepções sobre a ACEFB</p>
    <div class="descricao">${descricao.split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>
  `;
  return el;
}

export function renderFim(mensagem) {
  const el = document.createElement('section');
  el.className = 'tela tela-fim';
  el.innerHTML = `<h2>Obrigado</h2><p>${mensagem}</p>`;
  return el;
}

export function renderSecao(secao, respostas, onChange) {
  const el = document.createElement('section');
  el.className = 'tela tela-secao';
  el.dataset.secao = secao;

  const perguntas = perguntasDaSecao(secao);
  for (const p of perguntas) {
    el.appendChild(renderPergunta(p, respostas[p.id], onChange));
  }
  return el;
}

function renderPergunta(pergunta, valorAtual, onChange) {
  const div = document.createElement('div');
  div.className = 'pergunta';
  div.dataset.id = pergunta.id;

  const label = document.createElement('label');
  label.className = 'pergunta-texto';
  label.textContent = pergunta.texto;
  div.appendChild(label);

  if (pergunta.descricao) {
    const desc = document.createElement('p');
    desc.className = 'pergunta-descricao';
    desc.textContent = pergunta.descricao;
    div.appendChild(desc);
  }

  switch (pergunta.tipo) {
    case 'radio': div.appendChild(renderRadio(pergunta, valorAtual, onChange)); break;
    case 'checkbox': div.appendChild(renderCheckbox(pergunta, valorAtual || [], onChange)); break;
    case 'textarea': div.appendChild(renderTextarea(pergunta, valorAtual || '', onChange)); break;
    case 'text': div.appendChild(renderText(pergunta, valorAtual || '', onChange)); break;
  }

  const erro = document.createElement('p');
  erro.className = 'erro';
  erro.dataset.erroPara = pergunta.id;
  div.appendChild(erro);

  return div;
}

function renderRadio(pergunta, valor, onChange) {
  const fieldset = document.createElement('fieldset');
  for (const opcao of pergunta.opcoes) {
    const id = `${pergunta.id}-${slug(opcao)}`;
    const wrapper = document.createElement('label');
    wrapper.className = 'opcao';
    wrapper.htmlFor = id;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = pergunta.id;
    input.id = id;
    input.value = opcao;
    if (valor === opcao) input.checked = true;
    input.addEventListener('change', () => onChange(pergunta.id, opcao));
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(' ' + opcao));
    fieldset.appendChild(wrapper);
  }
  return fieldset;
}

function renderCheckbox(pergunta, valorAtual, onChange) {
  const fieldset = document.createElement('fieldset');
  for (const opcao of pergunta.opcoes) {
    const id = `${pergunta.id}-${slug(opcao)}`;
    const wrapper = document.createElement('label');
    wrapper.className = 'opcao';
    wrapper.htmlFor = id;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.value = opcao;
    if (valorAtual.includes(opcao)) input.checked = true;
    input.addEventListener('change', (e) => {
      let novaSelecao;
      if (e.target.checked) {
        novaSelecao = aplicarRegrasExclusividade(pergunta, valorAtual, opcao);
      } else {
        novaSelecao = valorAtual.filter(o => o !== opcao);
      }
      onChange(pergunta.id, novaSelecao);
    });
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(' ' + opcao));
    fieldset.appendChild(wrapper);
  }
  return fieldset;
}

function renderTextarea(pergunta, valor, onChange) {
  const t = document.createElement('textarea');
  t.rows = 4;
  t.value = valor;
  t.addEventListener('input', () => onChange(pergunta.id, t.value));
  return t;
}

function renderText(pergunta, valor, onChange) {
  const i = document.createElement('input');
  i.type = 'text';
  i.value = valor;
  i.addEventListener('input', () => onChange(pergunta.id, i.value));
  return i;
}

function slug(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}
