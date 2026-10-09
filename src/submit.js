export const APPS_SCRIPT_URL = 'TROQUE_PELA_URL_DO_APPS_SCRIPT_WEB_APP';

const PREFIXO_FILA = 'acefb-resposta-pendente-';

export function gerarUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function serializar(respostas, uuid = gerarUuid()) {
  return JSON.stringify({ uuid, ...respostas });
}

export function enfileirarRetry(ls, uuid, payload) {
  ls.setItem(PREFIXO_FILA + uuid, payload);
}

export function drenarFila(ls) {
  const itens = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith(PREFIXO_FILA)) {
      itens.push({ uuid: k.slice(PREFIXO_FILA.length), payload: ls.getItem(k) });
    }
  }
  return itens;
}

async function postar(payload) {
  const resp = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS no Apps Script
    body: payload,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp;
}

export async function enviarRespostas(respostas) {
  const uuid = gerarUuid();
  const payload = serializar(respostas, uuid);
  try {
    await postar(payload);
  } catch {
    enfileirarRetry(localStorage, uuid, payload);
    agendarRetry();
  }
  tentarDrenar();
}

let timer = null;
function agendarRetry() {
  if (timer) return;
  timer = setInterval(tentarDrenar, 15000);
}

async function tentarDrenar() {
  if (typeof localStorage === 'undefined') return;
  const itens = drenarFila(localStorage);
  for (const { uuid, payload } of itens) {
    try {
      await postar(payload);
      localStorage.removeItem(PREFIXO_FILA + uuid);
    } catch {
      return; // ainda sem rede; tenta de novo no próximo tick
    }
  }
  if (drenarFila(localStorage).length === 0 && timer) {
    clearInterval(timer); timer = null;
  }
}
