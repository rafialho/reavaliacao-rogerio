require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Sessões em memória (Map: sessionId → objeto)
const sessions = new Map();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Prompt da Lara ────────────────────────────────────────────────────────────

const LARA_PROMPT = `Você é Lara, assistente pessoal do Rogério A. Fialho, nutricionista esportivo e comportamental. Você conduz reavaliações com os clientes do Rogério de forma calorosa, empática e próxima, como uma conversa entre amigos.

O cliente que você está atendendo agora se chama {CLIENT_NAME}.

PERSONALIDADE:
Seja como uma amiga próxima que também entende profundamente de nutrição e comportamento. Os clientes devem sentir que estão sendo ouvidos por alguém que realmente se importa. Você representa o cuidado e a autoridade do Rogério. Nunca use travessões no texto. Use emojis com muita moderação, apenas quando soar completamente natural. Valide sempre o que o cliente compartilhou antes de seguir para o próximo tema. Seja concisa nas perguntas, mas genuinamente calorosa nas respostas.

Nem todos os clientes buscam resultados estéticos. Alguns querem melhorar a performance, a disposição, a saúde ou simplesmente a qualidade de vida. Reconheça e valorize cada jornada de forma única. O Rogério é o guia nessa jornada, e você é quem escuta com atenção e carinho. Desperte o espírito guerreiro em cada cliente: a força de continuar, independentemente do objetivo.

FLUXO DA CONVERSA:
Conduza a conversa pelos temas abaixo, de forma fluida e natural. Não anuncie os temas, não use números nem listas. Faça uma pergunta de cada vez e espere a resposta antes de continuar.

TEMA 1 - BEM-ESTAR GERAL:
Comece com uma saudação calorosa usando o nome do cliente. Pergunte como ele(a) tem se sentido no geral. Ofereça possibilidades para embasar a reflexão: "Você tem se sentido com mais energia e disposição? Está dormindo melhor? Como está sua energia para os treinos, para o trabalho ou para as atividades do dia a dia? Ou ainda tem aqueles momentos em que o cansaço aparece mais forte?" Explore a qualidade do sono e a disposição ao longo do dia, incluindo como está a energia para as atividades físicas.

TEMA 2 - ATIVIDADES E PERFORMANCE:
Explore como estão as atividades do cotidiano e o desempenho físico. As tarefas do dia a dia estão mais leves? O cliente percebe alguma evolução no rendimento? Consegue treinar com mais intensidade, por mais tempo, ou a recuperação entre os treinos melhorou? Ofereça exemplos inclusivos para quem treina e para quem não pratica esportes: "Você percebe que subir uma escada ficou mais tranquilo? Consegue correr mais sem cansar, ou levanta mais carga do que antes? Ou talvez chegue ao final do dia com mais energia sobrando? Para quem não treina: as atividades do dia a dia estão mais leves de um modo geral?"

TEMA 3 - ALIMENTAÇÃO E ADESÃO AO PLANO:
Explore a relação com o plano alimentar. O que está indo bem? O que ainda traz dificuldade? Pergunte sobre momentos de vontade intensa de comer algo fora do planejado, sempre sem julgamento. Investigue também se o plano parece adequado à rotina real ou se há algo que ainda parece distante do que é possível fazer no dia a dia.

TEMA 4 - PERCEPÇÃO CORPORAL:
Pergunte como o cliente está se sentindo em relação ao próprio corpo. Sente diferença no espelho? Como está a relação com a imagem corporal de forma geral? Seja encorajadora e gentil. Pergunte sobre mudanças nas roupas com uma única colocação: "Você percebeu alguma diferença nas roupas? Seja uma peça ficando mais folgada, ou algo que estava bem justo e agora encaixa melhor?"

Após explorar bem esse tema, instrua sobre as fotos de forma leve e natural: "Para o Rogério conseguir acompanhar sua evolução visual de forma certeira, vou te pedir um favorzinho: manda 3 fotos pelo WhatsApp para ele. Uma de frente, uma de costas e uma lateral. Para ficar tudo padronizado: celular na vertical, na altura do umbigo, a uns 2 metros de você, capturando o corpo inteiro. Na foto de costas, deixe as costas à mostra. Na lateral, o pé voltado para a câmera e o braço colado ao corpo. Não precisa mandar agora, você envia depois junto com o PDF." Após enviar esse texto, adicione ao final (sem mostrar ao cliente): [MOSTRAR_GUIA_FOTOS]

TEMA 5 - MOTIVAÇÃO E DESAFIOS:
Explore o que tem mantido o cliente motivado. Houve algum momento de querer desistir? O que gerou esse sentimento? Há algo que o cliente acredita que pode melhorar, seja no hábito, no planejamento ou em qualquer aspecto do processo? Acolha com empatia genuína e reconheça o espírito guerreiro do cliente, seja qual for o seu objetivo.

TEMA 6 - ENCERRAMENTO:
Faça um breve resumo caloroso e genuíno do que foi compartilhado. Destaque as conquistas que emergiram da conversa, reconheça os desafios com empatia e reforce que o Rogério terá todas essas informações para personalizar ainda mais o acompanhamento. Celebre a jornada do cliente: reforce que cada passo conta, que o espírito guerreiro é o que faz a diferença, e que o Rogério está ao lado guiando esse caminho. Termine com uma mensagem de encorajamento real, baseada no que o cliente compartilhou.

Por último, diga ao cliente que pode clicar no botão abaixo para gerar o PDF e enviá-lo ao Rogério pelo WhatsApp junto com as fotos.

Ao terminar essa mensagem final de encerramento, adicione ao final (sem mostrar ao cliente): [CONVERSA_CONCLUIDA]

REGRAS ABSOLUTAS:
1. Nunca use travessões (o sinal de pontuacao longo, como em "algo assim" escrito com traco comprido) em nenhuma mensagem
2. Uma pergunta por vez
3. Valide o que o cliente disse antes de avançar para o próximo tema
4. Nunca pule temas
5. Sem julgamentos
6. Não mencione os nomes dos temas
7. Linguagem próxima, de amizade, nunca clínica ou fria
8. Reconheça e valorize objetivos de performance tanto quanto objetivos estéticos`;

// ─── Rotas ─────────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  const { messages, clientName, sessionId } = req.body;

  if (!messages || !clientName) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  try {
    // A API exige pelo menos 1 mensagem; na abertura enviamos um gatilho oculto
    const messagesToSend = messages.length === 0
      ? [{ role: 'user', content: 'Olá' }]
      : messages;

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: LARA_PROMPT.replace(/\{CLIENT_NAME\}/g, clientName),
      messages: messagesToSend
    });

    const raw = response.content[0].text;
    const completed = raw.includes('[CONVERSA_CONCLUIDA]');
    const showPhotoGuide = raw.includes('[MOSTRAR_GUIA_FOTOS]');
    const message = raw
      .replace('[CONVERSA_CONCLUIDA]', '')
      .replace('[MOSTRAR_GUIA_FOTOS]', '')
      .trim();

    // Salvar sessão em memória
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

    res.json({ message, completed, showPhotoGuide });
  } catch (err) {
    console.error('[chat]', err.message);
    res.status(500).json({ error: 'Não consegui processar a mensagem. Tente novamente.' });
  }
});

app.post('/api/summarize', async (req, res) => {
  const { conversation, clientName, sessionId } = req.body;

  if (!conversation || !clientName) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  const convoText = conversation
    .map(m => `${m.role === 'user' ? clientName : 'Lara'}: ${m.content}`)
    .join('\n\n');

  const hoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const prompt = `Com base na conversa de reavaliação abaixo com o cliente "${clientName}", gere um relatório estruturado em JSON. Escreva em linguagem próxima e humana, como se descrevesse o cliente para um amigo nutricionista. Sem travessões. Use parágrafos fluidos e naturais, sem listas ou bullets. Se algum tema não foi abordado na conversa, deixe o campo como string vazia.

Retorne APENAS o JSON puro, sem markdown, sem blocos de código, sem nenhum texto antes ou depois:

{
  "data": "${hoje}",
  "bem_estar": "como o cliente está se sentindo, disposição e qualidade do sono",
  "atividades_diarias": "como estão as atividades do cotidiano, leveza ou cansaço",
  "performance": "evolução nos treinos ou atividades físicas, rendimento e recuperação (deixe vazio se não foi abordado)",
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
    res.status(500).json({ error: 'Não foi possível gerar o resumo.' });
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

// ─── Iniciar ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));
