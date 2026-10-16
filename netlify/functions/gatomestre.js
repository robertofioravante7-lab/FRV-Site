/* Gato Mestre — backend serverless (Netlify Functions).
   Segura as chaves (TYPESAFE_API_KEY, ANTHROPIC_API_KEY) em variaveis de ambiente
   do servidor. Nenhuma chave vai para o navegador.

   POST /.netlify/functions/gatomestre
   body: { email, mensagens: [{role, content}], perfil? }
   -> roda o Jev (decide a fase) e o Opus (responde/escreve o prompt).
*/
const { URL } = require('url');

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const ANTH_URL = 'https://api.anthropic.com/v1/messages';
const ANTH_VERSION = '2023-06-01';
const MODELO_OPUS = 'claude-opus-5-5';

const PERGUNTAS_JEV = {
  dor_bem_entendida: {
    type: 'noul',
    instructions: 'A dor do cliente foi descrita de forma CONCRETA e ESPECIFICA (contexto, o que faz hoje, onde trava, consequencia)?',
    criteria: { true: 'dor concreta com contexto e consequencia', false: 'vaga, generica ou faltando contexto' },
  },
  dados_para_especificar: {
    type: 'noul',
    instructions: 'Ja existe informacao suficiente para especificar um software que resolve (usuario, entrada, saida, regras, objetivo)?',
    criteria: { true: 'da para descrever o software que resolve', false: 'faltam detalhes essenciais' },
  },
  fase: {
    type: 'choice',
    instructions: 'Em que fase esta a conversa neste momento?',
    criteria: {
      ouvir: 'ainda preciso perguntar e entender mais a dor',
      entendendo: 'dor ja concreta mas faltam detalhes para especificar',
      especificar: 'entendi a dor e posso escrever o prompt do software',
    },
  },
};

const SYSTEM_BASE = `Você é o GatoMestre, o consultor digital de uma empresa de engenharia (FRV Engenharia).
Sua premissa: a FRV é capaz de construir QUALQUER software sob medida para resolver o problema do cliente.

Sua abordagem com o cliente:
1. OUÇA. Faça o cliente abrir o coração sobre as dores, problemas e dificuldades do dia a dia dele.
   Pergunte uma coisa de cada vez, com perguntas curtas e abertas. Não encha de perguntas de uma vez.
2. Entenda a dor de forma concreta: contexto, o que ele faz hoje, onde trava, quanto custa/piora.
3. Quando entender bem, diga com sinceridade se isso é resolvível com software sob medida.
4. Só então ESCREVA o prompt do software que resolve.

Estilo: direto, humano, sem enrolação, em português do Brasil. Pergunta uma coisa por vez.
NUNCA escreva o prompt do software antes das fases de ouvir/entender estarem completas.`;

const OPERACAO_ESPECIFICAR = `Com base em toda a conversa, escreva o PROMPT DO SOFTWARE que resolve a dor do cliente.

Formato exato (markdown), em portugues:
# PROMPT DE SOFTWARE — <nome curto do software>
## Problema do cliente
<a dor em 2-3 linhas, na voz dele>
## O que o software deve fazer
<objetivo, em bullet>
## Usuario
<quem vai usar e como>
## Entradas
<o que o usuario fornece>
## Saidas
<o que o software entrega>
## Regras de negocio / funcionamento
<o que o software considera nos bastidores>
## Tecnologia sugerida
<sugestao, ex.: web + banco + integracao>
## Definicao de pronto (aceitacao)
<como saber que resolveu>

Entregue SOMENTE o prompt do software, sem comentario extra. Nao faca perguntas agora.`;

function montarSystem(especificar) {
  return especificar ? SYSTEM_BASE + '\n\n' + OPERACAO_ESPECIFICAR : SYSTEM_BASE;
}

async function chamarJev(key, state) {
  const res = await fetch(JEV_URL, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'jev-latest', state: state.slice(-6000), questions: PERGUNTAS_JEV }),
  });
  if (!res.ok) throw new Error('Jev HTTP ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return res.json();
}

async function chamarOpus(key, mensagens, system, maxTokens) {
  const res = await fetch(ANTH_URL, {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': ANTH_VERSION, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODELO_OPUS,
      max_tokens: maxTokens || 3000,
      messages: mensagens,
      system: system,
      output_config: { effort: 'medium' },
    }),
  });
  if (!res.ok) throw new Error('Anthropic HTTP ' + res.status + ': ' + (await res.text()).slice(0, 500));
  const dados = await res.json();
  let texto = '';
  for (const b of dados.content || []) if (b.type === 'text') texto += b.text;
  return texto;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ erro: 'use POST' }) };
  }
  const tyKey = process.env.TYPESAFE_API_KEY;
  const anKey = process.env.ANTHROPIC_API_KEY;
  if (!tyKey || !anKey) {
    return { statusCode: 500, body: JSON.stringify({ erro: 'chaves nao configuradas no servidor' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
  const email = (body.email || '').toString();
  const mensagens = Array.isArray(body.mensagens) ? body.mensagens : [];
  const perfil = body.perfil || null;

  try {
    // 1) Jev decide a fase a partir do historico
    const contexto = mensagens.map(m => m.role + ': ' + String(m.content).slice(0, 2000)).join('\n');
    const j = await chamarJev(tyKey, contexto);
    const answers = j.answers || {};
    const dor = answers.dor_bem_entendida && answers.dor_bem_entendida.noul;
    const dados = answers.dados_para_especificar && answers.dados_para_especificar.noul;
    const fase = answers.fase && answers.fase.choice;
    const querEspecificar = fase === 'especificar' && (dor || 0) >= 0.65 && (dados || 0) >= 0.65;
    // Teto de seguranca: apos 10 turnos de usuario, forca a especificacao
    const turnosUsuario = mensagens.filter(m => m.role === 'user').length;
    const forcar = turnosUsuario >= 10;
    const especificar = querEspecificar || forcar;

    // 2) Opus responde (ou escreve o prompt do software)
    const system = montarSystem(especificar);
    const texto = await chamarOpus(anKey, mensagens, system, especificar ? 4000 : 2000);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resposta: texto,
        fase: fase,
        confianca: answers.fase && answers.fase.confidence,
        dor: dor,
        dados: dados,
        gerou_prompt: especificar,
        email: email,
      }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ erro: String(e.message || e) }) };
  }
};
