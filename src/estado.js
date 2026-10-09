import { perguntas, regrasDesvio } from './perguntas.js';

export function perguntasDaSecao(secao) {
  return perguntas.filter(p => p.secao === secao);
}

function respostaBate(regra, resposta) {
  if (regra.resposta === '*') return true;
  if (Array.isArray(regra.resposta)) return regra.resposta.includes(resposta);
  return regra.resposta === resposta;
}

export function proximaSecao(secaoAtual, respostas) {
  const perguntasSecao = perguntasDaSecao(secaoAtual);
  // Regras baseadas na última pergunta respondida da seção
  for (let i = perguntasSecao.length - 1; i >= 0; i--) {
    const p = perguntasSecao[i];
    const resp = respostas[p.id];
    if (resp === undefined) continue;
    const regra = regrasDesvio.find(r => r.aposPergunta === p.id && respostaBate(r, resp));
    if (regra) return regra.vai;
  }
  // Senão, regra de fim-de-seção
  const regraFim = regrasDesvio.find(r => r.aposSecao === secaoAtual);
  if (regraFim) return regraFim.vai;
  return secaoAtual + 1;
}

function primeiraPerguntaDaSecao(secao) {
  const p = perguntas.find(p => p.secao === secao);
  return p ? p.id : 'fim';
}

/**
 * Dado o id da pergunta recém-respondida, decide qual é a próxima pergunta
 * (ou 'fim'). Aplica as mesmas regras de desvio da seção, mas num modelo
 * uma-pergunta-por-tela.
 */
export function proximaPergunta(perguntaId, respostas) {
  const atual = perguntas.find(p => p.id === perguntaId);
  if (!atual) return 'fim';

  // 1. Regra de desvio direto após esta pergunta
  const resp = respostas[perguntaId];
  if (resp !== undefined) {
    const regra = regrasDesvio.find(
      r => r.aposPergunta === perguntaId && respostaBate(r, resp)
    );
    if (regra) {
      return regra.vai === 'fim' ? 'fim' : primeiraPerguntaDaSecao(regra.vai);
    }
  }

  // 2. Próxima pergunta na mesma seção
  const idx = perguntas.findIndex(p => p.id === perguntaId);
  const prox = perguntas[idx + 1];
  if (!prox) return 'fim';

  // 3. Se virou de seção, checar regra de fim-de-seção
  if (prox.secao !== atual.secao) {
    const regraFim = regrasDesvio.find(r => r.aposSecao === atual.secao);
    if (regraFim) {
      return regraFim.vai === 'fim' ? 'fim' : primeiraPerguntaDaSecao(regraFim.vai);
    }
  }

  return prox.id;
}

/**
 * Versão linear: ignora todo o branching e devolve a próxima pergunta na
 * ordem natural. Usado pela variante entrevista.
 */
export function proximaPerguntaLinear(perguntaId) {
  const idx = perguntas.findIndex(p => p.id === perguntaId);
  const prox = perguntas[idx + 1];
  return prox ? prox.id : 'fim';
}
