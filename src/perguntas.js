export const descricaoInicial = `Esta pesquisa é realizada pela Evolve para a ACEFB, para entender como as pessoas percebem a associação. A participação é voluntária e anônima. Não pedimos nome, contato ou identificação da empresa, e não haverá abordagem comercial.

Queremos conhecer sua opinião, mesmo que você não conheça a ACEFB. Você pode interromper a participação a qualquer momento. O preenchimento leva aproximadamente 3 a 4 minutos.`;

export const mensagemFinal = `Agradecemos sua disponibilidade. Esta pesquisa é anônima e não gera contato comercial.`;

export const perguntas = [
  // SEÇÃO 1 — PARTICIPAÇÃO
  {
    id: 'p1',
    secao: 1,
    texto: 'Você tem 18 anos ou mais e aceita participar voluntariamente desta pesquisa?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Sim, tenho 18 anos ou mais e aceito participar.',
      'Não.',
    ],
  },

  // SEÇÃO 2 — CRITÉRIOS DE PARTICIPAÇÃO
  {
    id: 'p2',
    secao: 2,
    texto: 'Atualmente, você trabalha na ACEFB ou participa ativamente da diretoria, do CAD ou de algum núcleo da entidade?',
    tipo: 'radio',
    obrigatoria: true,
    descricao: 'ser associado ou trabalhar em uma empresa associada, por si só, não significa participar desses grupos.',
    opcoes: [
      'Sim.',
      'Não.',
      'Não sei informar.',
    ],
  },

  // SEÇÃO 3 — CONTROLE DE PARTICIPAÇÃO
  {
    id: 'p3',
    secao: 3,
    texto: 'Você já respondeu a esta pesquisa durante este evento?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Não.',
      'Sim.',
    ],
  },

  // SEÇÃO 4 — RECONHECIMENTO
  {
    id: 'p4',
    secao: 4,
    texto: 'Antes deste convite, você já tinha ouvido falar da ACEFB?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Sim, e sei um pouco sobre o que ela faz.',
      'Sim, mas conheço apenas o nome.',
      'Não.',
      'Não lembro.',
    ],
  },

  // SEÇÃO 5 — O QUE VOCÊ CONHECE E PERCEBE
  {
    id: 'p5',
    secao: 5,
    texto: 'Pelas suas palavras, o que é a ACEFB e o que ela faz?',
    tipo: 'textarea',
    obrigatoria: true,
    descricao: 'pode responder em uma frase. Se não souber, escreva "não sei".',
  },

  {
    id: 'p6',
    secao: 5,
    texto: 'Você lembra de algum serviço, evento ou projeto ligado à ACEFB? Qual?',
    tipo: 'text',
    obrigatoria: false,
    descricao: 'se não lembrar, pode deixar em branco.',
  },

  {
    id: 'p7',
    secao: 5,
    texto: 'Na sua percepção, quais públicos a ACEFB representa?',
    tipo: 'checkbox',
    obrigatoria: true,
    maxEscolhas: 2,
    descricao: 'Marque até duas opções. Se escolher "Nenhum desses públicos" ou "Não sei dizer", marque somente essa opção.',
    opcoes: [
      'Micro e pequenos empresários e autônomos.',
      'Médios e grandes empresários.',
      'Trabalhadores.',
      'A comunidade de Francisco Beltrão em geral.',
      'Nenhum desses públicos.',
      'Não sei dizer.',
    ],
    opcoesExclusivas: ['Nenhum desses públicos.', 'Não sei dizer.'],
  },

  {
    id: 'p8',
    secao: 5,
    texto: 'Como você percebe a contribuição da ACEFB para Francisco Beltrão?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Muito positiva.',
      'Mais positiva do que negativa.',
      'Nem positiva nem negativa.',
      'Mais negativa do que positiva.',
      'Muito negativa.',
      'Não conheço o suficiente para avaliar.',
    ],
  },

  {
    id: 'p9',
    secao: 5,
    texto: 'Quanto você confia na ACEFB?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Confio muito.',
      'Confio em parte.',
      'Confio pouco.',
      'Não confio.',
      'Não conheço o suficiente para avaliar.',
    ],
  },

  {
    id: 'p10',
    secao: 5,
    texto: 'Você considera adequado que a ACEFB se manifeste sobre assuntos que afetam a cidade?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Sim.',
      'Em parte.',
      'Não.',
      'Não conheço o suficiente para avaliar.',
    ],
  },

  {
    id: 'p11',
    secao: 5,
    texto: 'Você se sentiria à vontade para entrar em contato com a ACEFB?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Sim.',
      'Talvez.',
      'Não.',
      'Não sei dizer.',
    ],
  },

  {
    id: 'p12',
    secao: 5,
    texto: 'Nos últimos 12 meses, onde você encontrou informações sobre a ACEFB?',
    tipo: 'checkbox',
    obrigatoria: true,
    maxEscolhas: 3,
    descricao: 'marque até três opções. Se escolher "Apenas neste evento", "Não encontrei informações" ou "Não lembro", marque somente essa opção.',
    opcoes: [
      'Instagram, Facebook ou outras redes sociais.',
      'WhatsApp.',
      'Site da ACEFB.',
      'E-mail.',
      'Rádio, televisão, jornais ou portais de notícias.',
      'Conversas com amigos, familiares ou colegas.',
      'Contato direto com a equipe da ACEFB.',
      'Eventos, palestras ou encontros.',
      'Apenas neste evento.',
      'Não encontrei informações.',
      'Não lembro.',
      'Outro canal.',
    ],
    opcoesExclusivas: ['Apenas neste evento.', 'Não encontrei informações.', 'Não lembro.'],
  },

  // SEÇÃO 6 — SOBRE VOCÊ E SUA RELAÇÃO COM A ACEFB
  {
    id: 'p13',
    secao: 6,
    texto: 'Antes de vir a este evento, quanto você conhecia a ACEFB?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Conhecia o nome e parte da atuação.',
      'Conhecia apenas o nome.',
      'Nunca tinha ouvido falar.',
      'Não lembro.',
    ],
  },

  {
    id: 'p14',
    secao: 6,
    texto: 'Você mora em Francisco Beltrão?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Sim.',
      'Não.',
      'Prefiro não responder.',
    ],
  },

  {
    id: 'p15',
    secao: 6,
    texto: 'Você tem algum amigo ou familiar que participa da ACEFB?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Sim.',
      'Não.',
      'Não sei.',
      'Prefiro não responder.',
    ],
  },

  {
    id: 'p16',
    secao: 6,
    texto: 'Qual alternativa descreve melhor seu vínculo com a ACEFB?',
    tipo: 'radio',
    obrigatoria: true,
    descricao: 'se você tem negócio próprio, responda primeiro pelo vínculo desse negócio. Caso contrário, considere a empresa onde trabalha.',
    opcoes: [
      'Sou empresário/autônomo e meu negócio é associado.',
      'Sou empresário/autônomo e meu negócio já foi associado.',
      'Sou empresário/autônomo e meu negócio nunca foi associado.',
      'Trabalho em uma empresa que é associada a ACEFB.',
      'Trabalho em uma empresa mas não sei se A empresa é associada a ACEFB.',
      'Não tenho negócio próprio nem trabalho atualmente em uma empresa.',
      'Não sei informar o vínculo.',
    ],
  },

  {
    id: 'p17',
    secao: 6,
    texto: 'Nos últimos 12 meses, quantas vezes você participou de atividades ou utilizou serviços da ACEFB, sem contar este evento?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Nenhuma vez.',
      'Uma ou duas vezes.',
      'Três vezes ou mais.',
      'Não lembro.',
      'Não sei se as atividades ou os serviços eram da ACEFB.',
    ],
  },

  {
    id: 'p18',
    secao: 6,
    texto: 'Atualmente, você é empresário, sócio de empresa ou trabalha por conta própria?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Sim.',
      'Não.',
      'Prefiro não responder.',
    ],
  },

  // SEÇÃO 7 — PARA QUEM TEM UM NEGÓCIO OU TRABALHA POR CONTA PRÓPRIA
  {
    id: 'p19',
    secao: 7,
    texto: 'Se precisasse de ajuda com um problema do seu negócio, qual seria a chance de procurar a ACEFB?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Com certeza procuraria.',
      'Provavelmente procuraria.',
      'Provavelmente não procuraria.',
      'Com certeza não procuraria.',
      'Não conheço o suficiente para responder.',
    ],
  },

  {
    id: 'p20',
    secao: 7,
    texto: 'O que mais dificultaria você procurar a ACEFB?',
    tipo: 'radio',
    obrigatoria: true,
    descricao: 'escolha o principal motivo.',
    opcoes: [
      'Não saber em que ela pode ajudar.',
      'Não saber como entrar em contato.',
      'Achar que ela não atende negócios como o meu.',
      'Não me sentir à vontade para procurar.',
      'Preocupação com possíveis custos.',
      'Falta de tempo.',
      'Preferir procurar outras pessoas ou instituições.',
      'Ter tido uma experiência ruim com a entidade.',
      'Nada dificultaria.',
      'Outro motivo.',
      'Não sei dizer.',
    ],
  },
];

export const regrasDesvio = [
  { aposPergunta: 'p1', resposta: 'Sim, tenho 18 anos ou mais e aceito participar.', vai: 2 },
  { aposPergunta: 'p1', resposta: 'Não.', vai: 'fim' },
  { aposPergunta: 'p2', resposta: 'Não.', vai: 3 },
  { aposPergunta: 'p2', resposta: ['Sim.', 'Não sei informar.'], vai: 'fim' },
  { aposPergunta: 'p3', resposta: 'Não.', vai: 4 },
  { aposPergunta: 'p3', resposta: 'Sim.', vai: 'fim' },
  { aposPergunta: 'p4', resposta: ['Sim, e sei um pouco sobre o que ela faz.', 'Sim, mas conheço apenas o nome.'], vai: 5 },
  { aposPergunta: 'p4', resposta: ['Não.', 'Não lembro.'], vai: 6 },
  { aposSecao: 5, resposta: '*', vai: 6 },
  { aposPergunta: 'p18', resposta: 'Sim.', vai: 7 },
  { aposPergunta: 'p18', resposta: ['Não.', 'Prefiro não responder.'], vai: 'fim' },
  { aposSecao: 7, resposta: '*', vai: 'fim' },
];
