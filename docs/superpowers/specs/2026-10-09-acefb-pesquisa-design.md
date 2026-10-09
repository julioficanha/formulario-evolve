# ACEFB na sua visão — Spec de design

**Data:** 2026-10-09
**Cliente final:** ACEFB (Associação)
**Contratante:** Evolve
**Executor:** Júlio (Movstar)
**Prazo:** 24-48h

## 1. Objetivo

Entregar um formulário web público (link único, sem login) que aplica o questionário "ACEFB na sua visão" com a lógica de ramificação descrita em `Orientação Júlio.pdf` e os textos literais de `Questionario-2.pdf`, salvando as respostas numa Google Sheet.

A tentativa anterior em Google Forms não deu certo. Esta implementação resolve isso em código próprio, mantendo o mesmo "banco" (Sheets) para análise.

## 2. Arquitetura

Três artefatos, zero infraestrutura paga:

1. **Página estática** hospedada em GitHub Pages (branch `main`, repo público do usuário `jcficanha.tsl`).
2. **Google Apps Script Web App** publicado como "qualquer pessoa com o link", rodando sob a conta `jcficanha.tsl@gmail.com`.
3. **Google Sheet** na mesma conta, com uma aba `Respostas` cuja linha 1 é o cabeçalho e cada submissão vira uma nova linha.

Fluxo de dados:

```
Navegador (celular do respondente)
  └── fetch POST /exec (JSON com todas as respostas)
        └── Apps Script doPost(e)
              └── SpreadsheetApp.openById(...).appendRow(...)
```

Sem servidor próprio. Sem banco próprio. Sem auth.

## 3. Conteúdo do formulário

Fonte da verdade: `Questionario-2.pdf`. Os textos de perguntas, descrições, opções e a mensagem de encerramento vão **literalmente** do PDF para o código, sem reescrita.

Estrutura:

- **Descrição inicial** (texto da seção "DESCRIÇÃO" do PDF): mostrada antes da pergunta 1.
- **7 seções**, numeradas 1–7, exatamente como no PDF.
- **20 perguntas**, numeradas 1–20, nos tipos indicados (ver §4).
- **Mensagem de encerramento** única: "Agradecemos sua disponibilidade. Esta pesquisa é anônima e não gera contato comercial."

Os rótulos "Tipo", "Obrigatória", "Desvio" do PDF são **instruções para o montador** e não aparecem em tela, conforme §1 da Orientação.

## 4. Tipos de resposta por pergunta

| # | Tipo | Obrigatória | Validação extra |
|---|---|---|---|
| 1, 2, 3, 4, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20 | Múltipla escolha (uma opção) | Sim | — |
| 5 | Parágrafo (textarea) | Sim | — |
| 6 | Resposta curta (input text) | **Não** (única opcional) | — |
| 7 | Caixas de seleção | Sim | Máx 2; exclusividade (ver §6) |
| 12 | Caixas de seleção | Sim | Máx 3; exclusividade (ver §6) |

"Outro canal" (p12) e "Outro motivo" (p20) são **alternativas comuns**, sem abrir campo de texto adicional.

## 5. Regras de desvio (branching)

Transcritas literalmente da Orientação. A lógica no JS deve usar estas regras, sem reinterpretar.

| Após pergunta | Resposta | Vai para |
|---|---|---|
| 1 | "Sim, tenho 18 anos ou mais e aceito participar." | Seção 2 |
| 1 | "Não." | Enviar formulário (fim) |
| 2 | "Não." | Seção 3 |
| 2 | "Sim." OU "Não sei informar." | Enviar formulário (fim) |
| 3 | "Não." | Seção 4 |
| 3 | "Sim." | Enviar formulário (fim) |
| 4 | "Sim, e sei um pouco sobre o que ela faz." OU "Sim, mas conheço apenas o nome." | Seção 5 |
| 4 | "Não." OU "Não lembro." | Seção 6 |
| Fim seção 5 (após p12) | — | Seção 6 |
| 18 | "Sim." | Seção 7 |
| 18 | "Não." OU "Prefiro não responder." | Enviar formulário (fim) |
| Fim seção 7 (após p20) | — | Enviar formulário (fim) |

"Enviar formulário" = POST para o Apps Script e mostra a mensagem de encerramento. Em todos os caminhos de saída precoce (p1, p2, p3, p18) o POST só carrega as respostas que foram preenchidas até ali; perguntas não visitadas ficam **em branco** na Sheet.

## 6. Validações compostas (perguntas 7 e 12)

Este é o ganho real sobre o Google Forms, que não conseguia impedir combinações contraditórias automaticamente.

**Pergunta 7** — opções exclusivas:
- "Nenhum desses públicos."
- "Não sei dizer."

**Pergunta 12** — opções exclusivas:
- "Apenas neste evento."
- "Não encontrei informações."
- "Não lembro."

Regra: ao marcar uma opção exclusiva, as demais são desmarcadas e desabilitadas; ao marcar uma opção não-exclusiva, as exclusivas ficam desabilitadas até a lista voltar a vazia.

A validação de quantidade máxima (2 na p7, 3 na p12) é aplicada **antes** de permitir avançar.

## 7. Modelo de dados na Sheet

Aba única `Respostas`.

Cabeçalhos (linha 1):

```
timestamp_iso | p1 | p2 | p3 | p4 | p5 | p6 | p7 | p8 | p9 | p10 | p11 | p12 | p13 | p14 | p15 | p16 | p17 | p18 | p19 | p20
```

Regras de preenchimento:

- `timestamp_iso`: ISO 8601 em America/Sao_Paulo, gerado no Apps Script no momento do `appendRow`.
- `p1..p20`: texto exato da opção escolhida (não códigos). Para múltiplas escolhas (p7, p12), as opções marcadas vão concatenadas com `" | "` (barra entre espaços).
- Perguntas não visitadas (por desvio): célula vazia.
- Pergunta 6, se o respondente deixou em branco: célula vazia.

Payload do navegador para o Apps Script (plano, sem wrapper):

```json
{
  "p1": "Sim, tenho 18 anos ou mais e aceito participar.",
  "p2": "Não.",
  "p7": ["Micro e pequenos empresários e autônomos.", "Trabalhadores."]
}
```

Chaves ausentes = não visitadas. Valores array vão para a Sheet concatenados com `" | "`. O timestamp é gerado no Apps Script; o navegador não envia.

## 8. UX

- **Uma seção por tela** em mobile (não uma pergunta por tela — respeita a estrutura de seções da pesquisa e reduz passos).
- Barra de progresso superior calculada como `(seção atual − 1) / 7`. Não é exata (o caminho real pode ser mais curto que 7), mas é intuitiva.
- Botão principal "Próxima"; "Voltar" **não** será oferecido na v1 (simplifica estado e evita que o respondente reconstrua respostas após desvio).
- Visual neutro profissional: paleta azul escuro + branco, tipografia sistema. Se logos ACEFB/Evolve estiverem disponíveis na web, aparecem no topo.
- Tela final única com a mensagem de encerramento literal.

## 9. Robustez

- **Rede ruim**: se o `fetch` falhar, as respostas são serializadas em `localStorage` sob a chave `acefb-resposta-pendente-<uuid>`. Um `setInterval` tenta reenviar a cada 15s. A tela final é mostrada ao respondente de qualquer forma. Risco residual: se o celular for fechado antes do reenvio, a resposta se perde. Aceitável para evento controlado.
- **Spam**: nenhum CAPTCHA na v1. Se abuso ocorrer, Apps Script pode ser bloqueado em minutos trocando o deploy.
- **Anonimato**: nenhum log de IP; nenhum cookie; nenhum analytics; nenhum terceiro.

## 10. Configuração do Apps Script

- Função única `doPost(e)` que lê `e.postData.contents`, valida formato mínimo, chama `appendRow`.
- Retorna `ContentService.createTextOutput(JSON.stringify({ok:true}))` com MIME JSON.
- Deployado como Web App, "Executar como: eu" + "Acesso: Qualquer pessoa".
- ID da planilha é constante no topo do script.

## 11. Repositório e deploy

- Repo público: `github.com/<username-a-definir>/acefb-pesquisa` (confirmar handle do GitHub do Júlio).
- Estrutura mínima:
  ```
  index.html
  styles.css
  app.js
  perguntas.js       (array literal de perguntas/opções/regras)
  apps-script/
    Code.gs          (fonte de referência, não executada pelo Pages)
  README.md          (como editar perguntas, baixar respostas, transferir Sheet)
  ```
- GitHub Pages ligado ao branch `main`, pasta raiz. URL final: `https://<username>.github.io/acefb-pesquisa/`.

## 12. Transferência à Evolve pós-evento

- Planilha: botão "Compartilhar" → transferir propriedade para e-mail da Evolve.
- Repo: GitHub permite transferir ou dar permissão de admin.
- Apps Script: fica atrelado à conta do Júlio; se a Evolve quiser assumir, redeploy sob a conta deles trocando o ID da planilha.
- README documenta esses três passos.

## 13. Fora de escopo (deliberado)

- Dashboard de análise (Evolve usa a Sheet).
- Internacionalização.
- Retomada de preenchimento ("salvar e voltar depois").
- Backend próprio ou banco relacional.
- CAPTCHA / autenticação.
- Analytics de drop-off por pergunta.

## 14. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Apps Script sob conta pessoal cai se o Júlio reset a senha ou revogar o deploy | README orienta como republicar; dados ficam no Sheets de qualquer forma |
| CORS no Apps Script | Padrão `ContentService` testado; se falhar, fallback com `mode:'no-cors'` + resposta otimista |
| Celular do respondente sem sinal | localStorage + retry |
| Opções de resposta mudarem após deploy | `perguntas.js` isolado; alteração = commit + push |
| Spam no endpoint | Deploy público é descartável; novo deploy em 1 min |
