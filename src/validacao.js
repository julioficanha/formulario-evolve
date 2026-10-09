export function aplicarRegrasExclusividade(pergunta, selecaoAtual, acabouDeMarcar) {
  const exclusivas = pergunta.opcoesExclusivas || [];
  const marcouExclusiva = exclusivas.includes(acabouDeMarcar);

  let nova = [...selecaoAtual];
  if (!nova.includes(acabouDeMarcar)) nova.push(acabouDeMarcar);

  if (marcouExclusiva) {
    nova = [acabouDeMarcar];
  } else {
    nova = nova.filter(o => !exclusivas.includes(o));
    if (nova.length > pergunta.maxEscolhas) {
      // remove a mais antiga que não é a recém-marcada
      const idx = nova.findIndex(o => o !== acabouDeMarcar);
      nova.splice(idx, 1);
    }
  }
  return nova;
}

export function validarResposta(pergunta, resposta) {
  if (!pergunta.obrigatoria) return { ok: true };

  if (pergunta.tipo === 'checkbox') {
    if (!Array.isArray(resposta) || resposta.length === 0) {
      return { ok: false, erro: 'Marque pelo menos uma opção.' };
    }
    return { ok: true };
  }

  if (resposta === undefined || resposta === null || String(resposta).trim() === '') {
    return { ok: false, erro: 'Esta pergunta é obrigatória.' };
  }
  return { ok: true };
}
