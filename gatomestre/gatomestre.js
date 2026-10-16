/* Gato Mestre — widget flutuante + gate de email corporativo + pre-chat por cliques + chat.
   Front estatico. As chamadas ao Opus/Jev vao para o backend (endpoint abaixo),
   que segura as chaves. Nenhuma chave fica no navegador. */
(function(){
  'use strict';

  var BACKEND = '/.netlify/functions/gatomestre';

  // Dominios de email gratuito bloqueados no gate
  var GRATUITOS = [
    'gmail.com','googlemail.com','hotmail.com','hotmail.com.br','outlook.com',
    'outlook.com.br','live.com','yahoo.com','yahoo.com.br','uol.com.br','bol.com.br',
    'terra.com.br','icloud.com','me.com','aol.com','protonmail.com','proton.me',
    'zoho.com','mail.com','gmx.com','ymail.com','msn.com'
  ];

  var GATO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    + '<circle cx="12" cy="13" r="7" fill="rgba(255,255,255,.14)"/>'
    + '<path d="M9 6l-2-3M15 6l2-3"/>'
    + '<path d="M9 10h.01M15 10h.01"/>'
    + '<path d="M9 14c1 .8 5 .8 6 0"/>'
    + '<path d="M12 20v2"/>'
    + '</svg>';

  // Telas do pre-chat por cliques
  var ETAPAS = [
    {
      id: 'setor', titulo: 'O que sua empresa faz?', sub: 'Isso me ajuda a entender seu contexto.',
      opcoes: [
        ['engenharia', 'Engenharia / Consultoria'],
        ['construcao', 'Construção / Obras'],
        ['industria', 'Indústria / Manufatura'],
        ['servicos', 'Prestação de serviços'],
        ['comercio', 'Comércio'],
        ['outro', 'Outro']
      ]
    },
    {
      id: 'porte', titulo: 'Qual o tamanho da sua empresa?', sub: 'Para dimensionar a solução.',
      opcoes: [
        ['autonomo', 'Sou autônomo / MEI'],
        ['pequena', 'Pequena (até 50 pessoas)'],
        ['media', 'Média (50 a 250)'],
        ['grande', 'Grande (mais de 250)']
      ]
    },
    {
      id: 'dor', titulo: 'Qual é a maior dor hoje?', sub: 'Pode escolher mais de uma.',
      multi: true,
      opcoes: [
        ['manual', 'Processo manual demais'],
        ['documento', 'Documento e burocracia'],
        ['integracao', 'Sistemas que não conversam'],
        ['gestao', 'Controle e gestão'],
        ['outro', 'Outro']
      ]
    }
  ];

  var estado = { email: null, perfil: {}, etapa: 0, dorSelecionadas: [] };

  function montar(){
    var app = document.createElement('div');
    app.id = 'gm-app';
    document.body.appendChild(app);
    app.innerHTML =
      '<div class="gm-fab" id="gmFab" role="button" tabindex="0" aria-label="Abrir conversa com o Gato Mestre">'
      +   '<div class="gm-fab-bolha">Oi, eu sou o <b>Gato Mestre</b>! Tô aqui pra te ajudar. <b>Clica aqui</b> 👇</div>'
      +   '<div class="gm-fab-gato">' + GATO_SVG + '<span class="gm-fab-pulso"></span></div>'
      + '</div>'
      + '<div class="gm-modal" id="gmModal">'
      +   '<div class="gm-caixa">'
      +     '<button class="gm-fechar" id="gmFechar" aria-label="Fechar">&times;</button>'
      +     '<div class="gm-topo">'
      +       '<div class="gm-topo-icone">' + GATO_SVG + '</div>'
      +       '<div><h2>Gato Mestre</h2><p>Consultor digital da FRV Engenharia</p></div>'
      +     '</div>'
      +     '<div class="gm-corpo">'
      +       '<div class="gm-gate" id="gmGate">'
      +         '<h3>Bem-vindo! Para começar, identifique-se</h3>'
      +         '<p>Use seu e-mail corporativo. Só aceitamos e-mail de empresa — assim sabemos que você é de uma organização séria.</p>'
      +         '<div class="gm-campo">'
      +           '<label for="gmEmail">E-mail corporativo</label>'
      +           '<input type="email" id="gmEmail" placeholder="voce@suaempresa.com.br" autocomplete="email">'
      +           '<div class="gm-erro" id="gmErro"></div>'
      +         '</div>'
      +         '<button class="gm-btn" id="gmEntrar">Continuar</button>'
      +         '<div class="gm-nota">Seu e-mail fica só com a FRV. Nada de spam.</div>'
      +       '</div>'
      +       '<div class="gm-cliques" id="gmCliques"></div>'
      +       '<div class="gm-chat" id="gmChat">'
      +         '<div class="gm-msgs" id="gmMsgs"></div>'
      +         '<div class="gm-digitando" id="gmDigitando">Gato Mestre está digitando…</div>'
      +         '<div class="gm-entrada">'
      +           '<input type="text" id="gmInput" placeholder="Escreva sua mensagem…" autocomplete="off">'
      +           '<button id="gmEnviar">Enviar</button>'
      +         '</div>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      + '</div>';

    var fab = document.getElementById('gmFab');
    var modal = document.getElementById('gmModal');
    var fechar = document.getElementById('gmFechar');
    var entrar = document.getElementById('gmEntrar');
    var email = document.getElementById('gmEmail');
    var erro = document.getElementById('gmErro');

    function abrir(){ modal.classList.add('aberto'); if (estado.email) mostrarCliques(); }
    function fecharModal(){ modal.classList.remove('aberto'); }

    fab.addEventListener('click', abrir);
    fab.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
    fechar.addEventListener('click', fecharModal);
    modal.addEventListener('click', function(e){ if (e.target === modal) fecharModal(); });

    entrar.addEventListener('click', function(){ validarEmail(); });
    email.addEventListener('keydown', function(e){ if (e.key === 'Enter') validarEmail(); });

    function validarEmail(){
      var v = email.value.trim();
      erro.style.display = 'none';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { mostrarErro('Digite um e-mail válido.'); return; }
      var dom = v.split('@')[1].toLowerCase();
      if (GRATUITOS.indexOf(dom) !== -1) { mostrarErro('Use seu e-mail corporativo (de empresa), não um e-mail gratuito.'); return; }
      estado.email = v;
      mostrarCliques();
    }
    function mostrarErro(msg){ erro.textContent = msg; erro.style.display = 'block'; }

    // ---- Pre-chat por cliques ----
    function mostrarCliques(){
      document.getElementById('gmGate').style.display = 'none';
      document.getElementById('gmChat').style.display = 'none';
      var c = document.getElementById('gmCliques');
      c.style.display = 'block';
      estado.etapa = 0;
      estado.dorSelecionadas = [];
      renderEtapa();
    }

    function renderEtapa(){
      var c = document.getElementById('gmCliques');
      var e = ETAPAS[estado.etapa];
      var html = '<div class="gm-progresso">Passo ' + (estado.etapa + 1) + ' de ' + ETAPAS.length + '</div>'
        + '<h3>' + e.titulo + '</h3>'
        + '<div class="gm-sub">' + e.sub + '</div>'
        + '<div class="gm-opcoes">';
      for (var i = 0; i < e.opcoes.length; i++){
        var o = e.opcoes[i];
        var sel = e.multi && estado.dorSelecionadas.indexOf(o[0]) !== -1;
        html += '<button class="gm-opcao" data-val="' + o[0] + '"' + (sel ? ' style="border-color:var(--gm-verde);background:#f0f7f4"' : '') + '>' + o[1] + '</button>';
      }
      html += '</div>';
      if (estado.etapa > 0) html += '<button class="gm-voltar" id="gmVoltar">← Voltar</button>';
      c.innerHTML = html;

      var botoes = c.querySelectorAll('.gm-opcao');
      for (var j = 0; j < botoes.length; j++){
        botoes[j].addEventListener('click', function(){
          var val = this.getAttribute('data-val');
          var etapa = ETAPAS[estado.etapa];
          if (etapa.multi){
            var idx = estado.dorSelecionadas.indexOf(val);
            if (idx === -1) estado.dorSelecionadas.push(val); else estado.dorSelecionadas.splice(idx, 1);
            renderEtapa();
          } else {
            estado.perfil[etapa.id] = val;
            avancar();
          }
        });
      }
      var voltar = document.getElementById('gmVoltar');
      if (voltar) voltar.addEventListener('click', function(){ estado.etapa--; renderEtapa(); });
    }

    function avancar(){
      estado.etapa++;
      if (estado.etapa >= ETAPAS.length){
        estado.perfil.dores = estado.dorSelecionadas.slice();
        mostrarChat();
      } else {
        renderEtapa();
      }
    }

    // ---- Chat ----
    function mostrarChat(){
      document.getElementById('gmCliques').style.display = 'none';
      var chat = document.getElementById('gmChat');
      chat.style.display = 'flex';
      var perfil = estado.perfil;
      var abertura = 'Oi, ' + estado.email.split('@')[0] + '! Vi que você é do setor de ' + rotulo(perfil.setor)
        + ', empresa ' + rotulo(perfil.porte) + '. Me conta: qual é a maior dor do seu dia a dia que você gostaria de resolver?';
      addMsg('bot', abertura);
      document.getElementById('gmInput').focus();
    }

    function rotulo(id){
      for (var i = 0; i < ETAPAS.length; i++){
        for (var j = 0; j < ETAPAS[i].opcoes.length; j++){
          if (ETAPAS[i].opcoes[j][0] === id) return ETAPAS[i].opcoes[j][1];
        }
      }
      return id;
    }

    function addMsg(quem, texto){
      var m = document.createElement('div');
      m.className = 'gm-msg ' + quem;
      m.textContent = texto;
      document.getElementById('gmMsgs').appendChild(m);
      document.getElementById('gmMsgs').scrollTop = document.getElementById('gmMsgs').scrollHeight;
    }

    var enviar = document.getElementById('gmEnviar');
    var input = document.getElementById('gmInput');
    var historico = [];

    function enviarMsg(){
      var t = input.value.trim();
      if (!t) return;
      addMsg('user', t);
      input.value = '';
      historico.push({ role: 'user', content: t });
      var dig = document.getElementById('gmDigitando');
      dig.style.display = 'block';
      fetch(BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: estado.email, mensagens: historico, perfil: estado.perfil })
      })
      .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
      .then(function(res){
        dig.style.display = 'none';
        if (!res.ok) { addMsg('bot', 'Ops, deu um erro. Tenta de novo em instantes.'); return; }
        var d = res.d;
        historico.push({ role: 'assistant', content: d.resposta });
        addMsg('bot', d.resposta);
        if (d.gerou_prompt) {
          addMsg('bot', 'Pronto! Esse é o prompt do software que resolve sua dor. A FRV vai avaliar e te procurar.');
        }
      })
      .catch(function(){
        dig.style.display = 'none';
        addMsg('bot', 'Não consegui falar com o servidor. Tenta de novo.');
      });
    }
    enviar.addEventListener('click', enviarMsg);
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') enviarMsg(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
