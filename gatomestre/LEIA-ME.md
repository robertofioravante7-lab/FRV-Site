# Gato Mestre — consultor digital da FRV Engenharia

Bot de conversa que roda no site (frv.eng.br) e descobre a dor do cliente para
gerar o prompt do software que a resolve. Combina dois modelos:

- **Opus 5.5** (Anthropic, via API): conversa com o cliente e, ao final, escreve
  o prompt do software sob medida.
- **Jev** (TypeSafe, via API): decide a cada turno em que fase a conversa está
  (ouvir / entendendo / especificar) e quando é hora de parar de perguntar.

## Fluxo no site

1. **Gatinho flutuante** no rodapé, seguindo a navegação: "Oi, eu sou o Gato
   Mestre! Tô aqui pra te ajudar. Clica aqui 👇"
2. **Gate de e-mail corporativo**: o cliente entra com e-mail de empresa.
   E-mails gratuitos (gmail, hotmail, outlook, uol, etc.) são bloqueados.
3. **Pré-chat por cliques**: setor → porte → dor (multi-escolha).
4. **Chat**: o Opus conversa, o Jev decide a fase, e quando a dor está bem
   entendida o Opus escreve o prompt do software.

## Estrutura

```
Site/
  index.html                    # home; injeta o widget
  gatomestre/
    index.html                  # pagina propria do Gato Mestre (opcional)
    gatomestre.css               # estilo do widget
    gatomestre.js                # widget: gatinho + gate + cliques + chat
  netlify/functions/
    gatomestre.js                # backend serverless (segura as chaves)
  netlify.toml                   # build inclui gatomestre/ e netlify/functions
```

## Chaves (variáveis de ambiente no Netlify)

As chaves NUNCA vão para o navegador nem para o repositório. Configurar no
painel do site (Netlify → Site settings → Environment variables):

- `TYPESAFE_API_KEY` — chave do Jev (console.typesafe.ai)
- `ANTHROPIC_API_KEY` — chave do Opus (console.anthropic.com)

Sem elas, a função retorna "chaves nao configuradas no servidor".

## Endpoints

- Front → `POST /.netlify/functions/gatomestre`
  body: `{ email, mensagens: [{role, content}], perfil? }`
  resposta: `{ resposta, fase, confianca, dor, dados, gerou_prompt, email }`

## Teste local

```bash
# backend (simula POST, usa as chaves dos .env do GatoMestre)
TYPESAFE_API_KEY=... ANTHROPIC_API_KEY=... node -e "require('./netlify/functions/gatomestre.js')..."
```

## Protótipo de terminal (maquete original)

Em `Softwares/GatoMestre/` (fora do site) está o harness original de terminal:
`prototipo/rodar.py` (Opus + Jev, sem backend). As chaves ficam em
`Softwares/GatoMestre/typesafe.env` e `anthropic.env` (não versionar).

## Pendências

- [ ] Configurar as variáveis de ambiente no Netlify
- [ ] Publicar (git push do repo FRV-Site)
- [ ] Testar o fluxo completo no ar
