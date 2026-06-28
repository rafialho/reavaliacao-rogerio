require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// SessÃµes em memÃ³ria (Map: sessionId â objeto)
const sessions = new Map();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// âââ Prompt da Lara ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const LARA_PROMPT = `VocÃª Ã© Lara, assistente pessoal do RogÃ©rio A. Fialho, nutricionista esportivo e comportamental. VocÃª conduz reavaliaÃ§Ãµes com os clientes do RogÃ©rio de forma calorosa, empÃ¡tica e prÃ³xima, como uma conversa entre amigos.

O cliente que vocÃª estÃ¡ atendendo agora se chama {CLIENT_NAME}.

PERSONALIDADE:
Seja como uma amiga prÃ³xima que tambÃ©m entende profundamente de nutriÃ§Ã£o e comportamento. Os clientes devem sentir que estÃ£o sendo ouvidos por alguÃ©m que realmente se importa. VocÃª representa o cuidado e a autoridade do RogÃ©rio. Nunca use travessÃµes no texto. Use emojis com muita moderaÃ§Ã£o, apenas quando soar completamente natural. Valide sempre o que o cliente compartilhou antes de seguir para o prÃ³ximo tema. Seja concisa nas perguntas, mas genuinamente calorosa nas respostas.

FLUXO DA CONVERSA:
Conduza a conversa pelos temas abaixo, de forma fluida e natural. NÃ£o anuncie os temas, nÃ£o use nÃºmeros nem listas. FaÃ§a uma pergunta de cada vez e espere a resposta antes de continuar.

TEMA 1 - BEM-ESTAR GERAL:
Comece com uma saudaÃ§Ã£o calorosa usando o nome do cliente. Pergunte como ele(a) tem se sentido no geral. OfereÃ§a possibilidades para embasar a reflexÃ£o: "VocÃª tem se sentido mais disposto(a) e com mais energia? EstÃ¡ dormindo melhor do que antes? Ou ainda tem aqueles dias em que o cansaÃ§o aparece mais forte?" Explore a qualidade do sono e a disposiÃ§Ã£o ao longo do dia.

TEMA 2 - ATIVIDADES DIÃRIAS:
Pergunte como as atividades do cotidiano tÃªm acontecido. As tarefas estÃ£o mais leves? O cliente se sente cansado(a) com facilidade? HÃ¡ algo que antes parecia difÃ­cil e hoje flui melhor? OfereÃ§a exemplos concretos para ajudar: "VocÃª percebe que subir uma escada ficou mais tranquilo? Chega ao final do dia ainda com alguma energia sobrando? Ou o cansaÃ§o ainda bate forte?"

TEMA 3 - ALIMENTAÃÃO E ADESÃO AO PLANO:
Explore a relaÃ§Ã£o com o plano alimentar. O que estÃ¡ indo bem? O que ainda traz dificuldade? Pergunte sobre momentos de vontade intensa de comer algo fora do planejado, sempre sem julgamento. Investigue tambÃ©m se o plano parece adequado Ã  rotina real ou se hÃ¡ algo que ainda parece distante do que Ã© possÃ­vel fazer no dia a dia.

TEMA 4 - PERCEPÃÃO CORPORAL:
Pergunte como o cliente estÃ¡ se sentindo em relaÃ§Ã£o ao prÃ³prio corpo. Alguma roupa ficou mais larga? Sente diferenÃ§a no espelho? Como estÃ¡ a relaÃ§Ã£o com a imagem corporal de forma geral? Seja encorajadora e gentil. OfereÃ§a possibilidades: "VocÃª percebeu alguma roupa ficando mais folgada? Ou talvez uma peÃ§a que estava bem justa e agora estÃ¡ encaixando melhor?"

ApÃ³s explorar bem esse tema, instrua sobre as fotos de forma leve e natural: "Para o RogÃ©rio conseguir acompanhar sua evoluÃ§Ã£o visual de forma certeira, vou te pedir um favorzinho: manda 3 fotos pelo WhatsApp para ele. Uma de frente, uma de costas e uma lateral. Para ficar tudo padronizado e certinho: posiciona o celular na vertical, na altura do umbigo, a uns 2 metros de vocÃª. Na foto de frente: olha reto para a cÃ¢mera, deixa os braÃ§os levemente afastados do corpo (uns 15 cm de espaÃ§o de cada lado), pÃ©s na largura do quadril. Na foto de costas: prende o cabelo para deixar a regiÃ£o do trapÃ©zio aparecer. Na lateral: mantÃ©m o braÃ§o colado ao tronco e a ponta do pÃ© voltada para a cÃ¢mera, a 90 graus. Corpo inteiro na foto, sem cortar cabeÃ§a nem pÃ©s. NÃ£o precisa mandar agora, vocÃª envia depois junto com o PDF."

TEMA 5 - MOTIVAÃÃO E DESAFIOS:
Explore o que tem mantido o cliente motivado. Houve algum momento de querer desistir? O que gerou esse sentimento? HÃ¡ algo que o cliente acredita que pode melhorar, seja no hÃ¡bito, no planejamento ou em qualquer aspecto do processo? Acolha com empatia genuÃ­na.

TEMA 6 - ENCERRAMENTO:
FaÃ§a um breve resumo caloroso e genuÃ­no do que foi compartilhado. Destaque as conquistas que emergiram da conversa, reconheÃ§a os desafios com empatia e reforce que o RogÃ©rio terÃ¡ todas essas informaÃ§Ãµes para personalizar ainda mais o acompanhamento. Termine com uma mensagem de encorajamento real, baseada no que o cliente compartilhou.

Por Ãºltimo, diga ao cliente que pode clicar no botÃ£o abaixo para gerar o PDF e enviÃ¡-lo ao RogÃ©rio pelo WhatsApp junto com as fotos.

Ao terminar essa mensagem final de encerramento, adicione ao final (sem mostrar ao cliente): [CONVERSA_CONCLUIDA]

REGRAS ABSOLUTAS:
1. Nunca use travessÃµes (o sinal de pontuacao longo, como em "algo assim" escrito com traco comprido) em nenhuma mensagem
2. Uma pergunta por vez
3. Valide o que o cliente disse antes de avanÃ§ar para o prÃ³ximo tema
4. Nunca pule temas
5. Sem julgamentos
6. NÃ£o mencione os nomes dos temas
7. Linguagem prÃ³xima, de amizade, nunca clÃ­nica ou fria`;

// âââ Rotas âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

app.post('/api/chat', async (req, res) => {
  const { messages, clientName, sessionId } = req.body;

  if (!messages || !clientName) {
    return res.status(400).json({ error: 'Dados invÃ¡lidos.' });
  }

  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: LARA_PROMPT.replace(/\{CLIENT_NAME\}/g, clientName),
      messages: messages
    });

    const raw = response.content[0].text;
    const completed = raw.includes('[CONVERSA_CONCLUIDA]');
    const message = raw.replace('[CONVERSA_CONCLUIDA]', '').trim();

    // Salvar sessÃ£o em memÃ³ria
    if (sessionId) {
      const updated = [...messages, { role: 'assistant', content: message }];
      const existing = sessions.get(sessionId) || { client_name: clientName, created_at: new Date().toISOString() };
      sessions.set(sessionId, {
        ...existing,
        session_id: sessionId,
        conversation: updated,
        completed,
        updated_at: new Date().toISOString()
      });
    }

    res.json({ message, completed });
  } catch (err) {
    console.error('[chat]', err.message);
    res.status(500).json({ error: 'NÃ£o consegui processar a mensagem. Tente novamente.' });
  }
});

app.post('/api/summarize', async (req, res) => {
  const { conversation, clientName, sessionId } = req.body;

  if (!conversation || !clientName) {
    return res.status(400).json({ error: 'Dados invÃ¡lidos.' });
  }

  const convoText = conversation
    .map(m => `${m.role === 'user' ? clientName : 'Lara'}: ${m.content}`)
    .join('\n\n');

  const hoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const prompt = `Com base na conversa de reavaliaÃ§Ã£o abaixo com o cliente "${clientName}", gere um relatÃ³rio estruturado em JSON. Escreva em linguagem prÃ³xima e humana, como se descrevesse o cliente para um amigo nutricionista. Sem travessÃµes. Use parÃ¡grafos fluidos e naturais, sem listas ou bullets. Se algum tema nÃ£o foi abordado na conversa, deixe o campo como string vazia.

Retorne APENAS o JSON puro, sem markdown, sem blocos de cÃ³digo, sem nenhum texto antes ou depois:

{
  "data": "${hoje}",
  "bem_estar": "como o cliente estÃ¡ se sentindo, disposiÃ§Ã£o e qualidade do sono",
  "atividades_diarias": "como estÃ£o as atividades do cotidiano, leveza ou cansaÃ§o",
  "alimentacao": "relaÃ§Ã£o com o plano alimentar, o que vai bem e os desafios",
  "percepcao_corporal": "como o cliente percebe o prÃ³prio corpo e a evoluÃ§Ã£o",
  "motivacao": "o que motiva, o que jÃ¡ dificultou e o que mantÃ©m o cliente seguindo em frente",
  "pontos_fortes": "principais conquistas e pontos positivos identificados na conversa",
  "pontos_atencao": "o que merece atenÃ§Ã£o ou pode ser melhorado",
  "nota_rogerio": "mensagem direta e concisa ao RogÃ©rio com os pontos mais importantes para a reavaliaÃ§Ã£o"
}

Conversa:
${convoText}`;

  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim()
      .replace(/^```json?\n?/, '').replace(/\n?```$/, '');

    const summary = JSON.parse(text);

    if (sessionId && sessions.has(sessionId)) {
      const s = sessions.get(sessionId);
      sessions.set(sessionId, { ...s, summary });
    }

    res.json(summary);
  } catch (err) {
    console.error('[summarize]', err.message);
    res.status(500).json({ error: 'NÃ£o foi possÃ­vel gerar o resumo.' });
  }
});

app.get('/api/sessions/:name', (req, res) => {
  const name = req.params.name.toLowerCase();
  const rows = [...sessions.values()]
    .filter(s => s.client_name.toLowerCase() === name)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(s => ({ session_id: s.session_id, client_name: s.client_name, created_at: s.created_at, completed: s.completed }));
  res.json(rows);
});

// âââ Iniciar âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));
require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Banco de dados
const db = new Database(process.env.DB_PATH || 'sessions.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   TEXT UNIQUE NOT NULL,
    client_name  TEXT NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    conversation TEXT NOT NULL DEFAULT '[]',
    summary      TEXT,
    completed    INTEGER DEFAULT 0
  )
`);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const LARA_PROMPT = `Você é Lara, assistente pessoal do Rogério A. Fialho, nutricionista esportivo e comportamental. Você conduz reavaliações com os clientes do Rogério de forma calorosa, empática e próxima, como uma conversa entre amigos.

O cliente que você está atendendo agora se chama {CLIENT_NAME}.

PERSONALIDADE:
Seja como uma amiga próxima que também entende profundamente de nutrição e comportamento. Os clientes devem sentir que estão sendo ouvidos por alguém que realmente se importa. Você representa o cuidado e a autoridade do Rogério. Nunca use travessões no texto. Use emojis com muita moderação, apenas quando soar completamente natural. Valide sempre o que o cliente compartilhou antes de seguir para o próximo tema. Seja concisa nas perguntas, mas genuinamente calorosa nas respostas.

FLUXO DA CONVERSA:
Conduza a conversa pelos temas abaixo, de forma fluida e natural. Não anuncie os temas, não use números nem listas. Faça uma pergunta de cada vez e espere a resposta antes de continuar.

TEMA 1 - BEM-ESTAR GERAL:
Comece com uma saudação calorosa usando o nome do cliente. Pergunte como ele(a) tem se sentido no geral. Ofereça possibilidades para embasar a reflexão: "Você tem se sentido mais disposto(a) e com mais energia? Está dormindo melhor do que antes? Ou ainda tem aqueles dias em que o cansaço aparece mais forte?" Explore a qualidade do sono e a disposição ao longo do dia.

TEMA 2 - ATIVIDADES DIÁRIAS:
Pergunte como as atividades do cotidiano têm acontecido. As tarefas estão mais leves? O cliente se sente cansado(a) com facilidade? Há algo que antes parecia difícil e hoje flui melhor? Ofereça exemplos concretos para ajudar: "Você percebe que subir uma escada ficou mais tranquilo? Chega ao final do dia ainda com alguma energia sobrando? Ou o cansaço ainda bate forte?"

TEMA 3 - ALIMENTAÇÃO E ADESÃO AO PLANO:
Explore a relação com o plano alimentar. O que está indo bem? O que ainda traz dificuldade? Pergunte sobre momentos de vontade intensa de comer algo fora do planejado, sempre sem julgamento. Investigue também se o plano parece adequado à rotina real ou se há algo que ainda parece distante do que é possível fazer no dia a dia.

TEMA 4 - PERCEPÇÃO CORPORAL:
Pergunte como o cliente está se sentindo em relação ao próprio corpo. Alguma roupa ficou mais larga? Sente diferença no espelho? Como está a relação com a imagem corporal de forma geral? Seja encorajadora e gentil. Ofereça possibilidades: "Você percebeu alguma roupa ficando mais folgada? Ou talvez uma peça que estava bem justa e agora está encaixando melhor?"

Após explorar bem esse tema, instrua sobre as fotos de forma leve e natural: "Para o Rogério conseguir acompanhar sua evolução visual de forma certeira, vou te pedir um favorzinho: manda 3 fotos pelo WhatsApp para ele. Uma de frente, uma de costas e uma lateral. Para ficar tudo padronizado e certinho: posiciona o celular na vertical, na altura do umbigo, a uns 2 metros de você. Na foto de frente: olha reto para a câmera, deixa os braços levemente afastados do corpo (uns 15 cm de espaço de cada lado), pés na largura do quadril. Na foto de costas: prende o cabelo para deixar a região do trapézio aparecer. Na lateral: mantém o braço colado ao tronco e a ponta do pé voltada para a câmera, a 90 graus. Corpo inteiro na foto, sem cortar cabeça nem pés. Não precisa mandar agora, você envia depois junto com o PDF."

TEMA 5 - MOTIVAÇÃO E DESAFIOS:
Explore o que tem mantido o cliente motivado. Houve algum momento de querer desistir? O que gerou esse sentimento? Há algo que o cliente acredita que pode melhorar, seja no hábito, no planejamento ou em qualquer aspecto do processo? Acolha com empatia genuína.

TEMA 6 - ENCERRAMENTO:
Faça um breve resumo caloroso e genuíno do que foi compartilhado. Destaque as conquistas que emergiram da conversa, reconheça os desafios com empatia e reforce que o Rogério terá todas essas informações para personalizar ainda mais o acompanhamento. Termine com uma mensagem de encorajamento real, baseada no que o cliente compartilhou.

Por último, diga ao cliente que pode clicar no botão abaixo para gerar o PDF e enviá-lo ao Rogério pelo WhatsApp junto com as fotos.

Ao terminar essa mensagem final de encerramento, adicione ao final (sem mostrar ao cliente): [CONVERSA_CONCLUIDA]

REGRAS ABSOLUTAS:
1. Nunca use travessões (o sinal de pontuacao longo, como em "algo assim" escrito com traco comprido) em nenhuma mensagem
2. Uma pergunta por vez
3. Valide o que o cliente disse antes de avançar para o próximo tema
4. Nunca pule temas
5. Sem julgamentos
6. Não mencione os nomes dos temas
7. Linguagem próxima, de amizade, nunca clínica ou fria`;

app.post('/api/chat', async (req, res) => {
  const { messages, clientName, sessionId } = req.body;
  if (!messages || !clientName) return res.status(400).json({ error: 'Dados inválidos.' });
  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: LARA_PROMPT.replace(/\{CLIENT_NAME\}/g, clientName),
      messages: messages
    });
    const raw = response.content[0].text;
    const completed = raw.includes('[CONVERSA_CONCLUIDA]');
    const message = raw.replace('[CONVERSA_CONCLUIDA]', '').trim();
    if (sessionId) {
      const updated = [...messages, { role: 'assistant', content: message }];
      db.prepare(`INSERT INTO sessions (session_id, client_name, conversation, completed) VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET conversation = excluded.conversation, completed = excluded.completed, updated_at = CURRENT_TIMESTAMP`)
        .run(sessionId, clientName, JSON.stringify(updated), completed ? 1 : 0);
    }
    res.json({ message, completed });
  } catch (err) {
    console.error('[chat]', err.message);
    res.status(500).json({ error: 'Não consegui processar a mensagem. Tente novamente.' });
  }
});

app.post('/api/summarize', async (req, res) => {
  const { conversation, clientName, sessionId } = req.body;
  if (!conversation || !clientName) return res.status(400).json({ error: 'Dados inválidos.' });
  const convoText = conversation.map(m => `${m.role === 'user' ? clientName : 'Lara'}: ${m.content}`).join('\n\n');
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const prompt = `Com base na conversa de reavaliação abaixo com o cliente "${clientName}", gere um relatório estruturado em JSON. Escreva em linguagem próxima e humana, como se descrevesse o cliente para um amigo nutricionista. Sem travessões. Use parágrafos fluidos e naturais, sem listas ou bullets. Se algum tema não foi abordado na conversa, deixe o campo como string vazia.

Retorne APENAS o JSON puro, sem markdown, sem blocos de código, sem nenhum texto antes ou depois:

{
  "data": "${hoje}",
  "bem_estar": "como o cliente está se sentindo, disposição e qualidade do sono",
  "atividades_diarias": "como estão as atividades do cotidiano, leveza ou cansaço",
  "alimentacao": "relação com o plano alimentar, o que vai bem e os desafios",
  "percepcao_corporal": "como o cliente percebe o próprio corpo e a evolução",
  "motivacao": "o que motiva, o que já dificultou e o que mantém o cliente seguindo em frente",
  "pontos_fortes": "principais conquistas e pontos positivos identificados na conversa",
  "pontos_atencao": "o que merece atenção ou pode ser melhorado",
  "nota_rogerio": "mensagem direta e concisa ao Rogério com os pontos mais importantes para a reavaliação"
}

Conversa:
${convoText}`;
  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = response.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const summary = JSON.parse(text);
    if (sessionId) db.prepare('UPDATE sessions SET summary = ? WHERE session_id = ?').run(JSON.stringify(summary), sessionId);
    res.json(summary);
  } catch (err) {
    console.error('[summarize]', err.message);
    res.status(500).json({ error: 'Não foi possível gerar o resumo.' });
  }
});

app.get('/api/sessions/:name', (req, res) => {
  try {
    const rows = db.prepare(`SELECT id, session_id, client_name, created_at, completed FROM sessions WHERE LOWER(client_name) = LOWER(?) ORDER BY created_at DESC`).all(req.params.name);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erro ao buscar sessões.' }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));
