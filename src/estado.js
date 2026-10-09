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
