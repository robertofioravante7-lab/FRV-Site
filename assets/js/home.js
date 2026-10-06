/* FRV Engenharia: pagina inicial "supervisorio com sinotico vivo" (publicada em 06/10/2026).
   Le o conteudo de assets/js/conteudo.js (window.FRV) e monta a pagina; a linha do sinotico acende
   conforme a rolagem. Arquivo separado do HTML por exigencia do CSP (netlify.toml). */
(function(){
  'use strict';
  var F = window.FRV, IMG = F.img;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.title = F.title;

  /* ---------- auxiliares ---------- */
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function rich(a){ return a.map(function(x){ return x.b ? '<strong>' + esc(x.t) + '</strong>' : esc(x.t); }).join(''); }
  var seed = 17;
  function rnd(){ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function led(c){ return '<i class="led' + (c ? ' ' + c : '') + '" aria-hidden="true"></i>'; }
  /* indicador analogico: faixa normal + ponteiro que oscila dentro dela (decorativo) */
  function ai(){ return '<i class="ai" aria-hidden="true" style="--p:' + Math.round(36 + rnd() * 28) + '%;--dur:' + (3 + rnd() * 4).toFixed(1) + 's;--dl:-' + (rnd() * 5).toFixed(1) + 's"><i></i></i>'; }
  /* mini tendencia com cursor varrendo (decorativo) */
  function spark(){
    var pts = [], y = 15;
    for (var x = 0; x <= 120; x += 6){ y = Math.max(5, Math.min(25, y + (rnd() - .5) * 8)); pts.push(x + ',' + y.toFixed(1)); }
    return '<span class="spk" aria-hidden="true"><svg viewBox="0 0 120 30" preserveAspectRatio="none"><path class="b" d="M0 10 H120 M0 20 H120"/><polyline points="' + pts.join(' ') + '"/></svg><i style="animation-delay:-' + (rnd() * 6).toFixed(1) + 's"></i></span>';
  }
  /* cabecalho de tela; node = ponto do sinotico; saida = rotulo SAIDA 0X (reaproveitado de FRV.areas.pil) */
  function scrHd(t, n, node, saida){
    return '<div class="scr-hd" data-node="' + node + '">' + (n ? '<span class="scr-n">' + esc(n) + '</span>' : '') +
      (saida ? '<span class="tag sm">' + esc(saida) + '</span>' : '') + led() +
      '<span class="eyb">' + esc(t) + '</span><i class="rule" aria-hidden="true"></i>' + spark() + '</div>';
  }

  /* ---------- cabecalho ---------- */
  var html = '<header class="hd" id="hd"><div class="hc hd-c">' +
    '<a href="#topo" class="logo"><img src="' + IMG + F.logo.icon + '" alt="' + esc(F.logo.alt) + '"><small>' + esc(F.logo.small) + '</small></a>' +
    '<nav class="hd-nav">' + F.nav.map(function(n){ return '<a href="#' + n[1] + '" data-k="' + n[1] + '">' + esc(n[0]) + '</a>'; }).join('') + '</nav>' +
    '<div class="clk" aria-hidden="true">' + led('amb blink') + '<span class="clk-d" id="ckD"></span><span class="clk-t" id="ckT"></span></div>' +
    '<a class="btn sm hd-cta" href="#' + F.navCta[1] + '">' + esc(F.navCta[0]) + '</a>' +
    '</div></header>';

  /* ---------- topo: o gerador, com a tendencia ao vivo ---------- */
  var H = F.hero, S = F.inst, r = S.reads;
  html += '<section class="hero" id="topo" data-k="topo"><div class="hero-bg" style="background-image:url(\'' + IMG + H.bg + '\')"></div>' +
    '<div class="c hero-g"><div class="hero-l">' +
      '<div class="eyb" data-node="gen">' + led('amb') + esc(H.eyebrow) + '</div>' +
      '<h1>' + esc(H.h1a) + ' <span>' + esc(H.h1b) + '</span></h1>' +
      '<p class="sub">' + esc(H.sub) + '</p><p class="desc">' + esc(H.desc) + '</p>' +
      '<div class="ctas"><a class="btn" href="#' + H.cta[0][1] + '">' + esc(H.cta[0][0]) + '</a><a class="btn ghost" href="#' + H.cta[1][1] + '">' + esc(H.cta[1][0]) + '</a></div>' +
    '</div>' +
    '<div class="fp inst" id="inst">' +
      '<div class="fp-hd">' + led() + '<span class="fp-t">' + esc(S.title) + '</span><span class="demo">' + esc(S.tag) + '</span><button class="run" id="run" type="button" aria-pressed="false">' + esc(S.run) + '</button></div>' +
      '<div class="trend grid-bg"><canvas id="wave" role="img" aria-label="' + esc(S.aria) + '"></canvas></div>' +
      '<div class="reads">' +
        '<div class="rd"><div class="k">' + esc(r[0][0]) + '</div><div class="v" id="rF">' + esc(r[0][1]) + '<u>' + esc(r[0][2]) + '</u></div><div class="rd-i" aria-hidden="true"><span class="rd-sc"><i class="bd"></i><i class="pt" id="fP"></i></span></div></div>' +
        '<div class="rd"><div class="k">' + esc(r[1][0]) + '</div><div class="v">' + esc(r[1][1]) + '</div><div class="rd-i rd-seq" aria-hidden="true"><i></i><i></i><i></i></div></div>' +
        '<div class="rd"><div class="k">' + esc(r[2][0]) + '</div><div class="v">' + esc(r[2][1]) + '<u>' + esc(r[2][2]) + '</u></div><div class="rd-i" aria-hidden="true"><svg class="rd-ph" viewBox="-11 -11 22 22"><circle r="10"/><path d="M0 0 L10 0" stroke="#f7941e"/><path d="M0 0 L-5 8.66" stroke="#dfe3e7"/><path d="M0 0 L-5 -8.66" stroke="#858e98"/></svg></div></div>' +
      '</div>' +
    '</div></div>' +
    '<div class="c"><div class="fp setores live">' +
      '<div class="set-l">' + led('on') + '<span>' + esc(F.setores.label) + '</span></div>' +
      F.setores.items.map(function(s){ return '<div class="set"><b class="tag sm">' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span>' + ai() + '</div>'; }).join('') +
    '</div></div></section>';

  /* ---------- Quem somos: disjuntor 52-G ---------- */
  var A = F.sobre;
  html += '<section class="scr" id="sobre" data-k="sobre"><div class="c">' + scrHd(A.eyebrow, '', 'brk') +
    '<h2 class="h2">' + esc(A.h2a) + ' <span>' + esc(A.h2b) + '</span></h2>' +
    '<div class="fp about"><div class="about-t"><p>' + rich(A.p1) + '</p><p>' + esc(A.p2) + '</p></div>' +
    '<div class="kv">' + A.kv.map(function(k){ return '<div class="kv-r"><h3>' + led() + esc(k[0]) + '</h3><p>' + esc(k[1]) + '</p>' + ai() + '</div>'; }).join('') + '</div>' +
    '</div></div></section>';

  /* ---------- Nosso objetivo: transformador + visao geral (unifilar do site) ---------- */
  var R = F.areas;
  html += '<section class="scr" id="areas" data-k="areas"><div class="c">' + scrHd(R.eyebrow, '', 'tr') +
    '<h2 class="h2">' + esc(R.h2a) + ' <span>' + esc(R.h2b) + '</span></h2>' +
    '<div class="fp ov" id="ov"><div class="uf" id="uf"><svg id="ufs" viewBox="0 0 1000 250" role="img" aria-label="' + esc(R.aria) + '">' +
      '<g class="base">' + R.svg + '</g><g class="amp" aria-hidden="true">' + R.svg + '</g>' +
      '<path class="flow" d="M500 172 L124 172"/><path class="flow" d="M500 172 L876 172"/></svg></div>' +
    '<div class="outs">' + R.pil.map(function(p){
      return '<a class="out" href="#' + p[3] + '">' + led() + '<span class="out-b"><b class="tag sm">' + esc(p[0]) + '</b><h3>' + esc(p[1]) + '</h3><p>' + esc(p[2]) + '</p></span></a>';
    }).join('') + '</div></div></div></section>';

  /* ---------- Pilares: cada servico e um faceplate (uma carga no ramal da sua saida) ---------- */
  var nSvc = 0;
  function pts(items, h4){
    return '<div class="pts">' + (h4 ? '<h4>' + led() + esc(h4) + '</h4>' : '') + '<ul>' + items.map(function(t, k){
      return '<li style="--i:' + k + '"><i class="pl" aria-hidden="true"></i><span>' + esc(t) + '</span>' + ai() + '</li>';
    }).join('') + '</ul></div>';
  }
  function cam(f){
    return '<figure class="cam"><div class="cam-v"><img loading="lazy" src="' + IMG + f[0] + '" alt="' + esc(f[1]) + '"' + (f[4] ? ' style="object-position:' + f[4] + '"' : '') + '>' +
      '<i class="cam-k" aria-hidden="true"></i><i class="rec" aria-hidden="true"></i><span class="cam-ck" aria-hidden="true"></span></div>' +
      '<figcaption><b>' + esc(f[2]) + '</b> — ' + esc(f[3]) + '</figcaption></figure>';
  }
  function svc(id){
    var d = F.det[id], parts = d.code.split(' · '), idx = nSvc++;
    var kind = d.two ? 'k-e' : d.cols2 ? 'k-a' : d.figs.length === 1 ? 'k-d' : 'k-b';
    var rev = (kind === 'k-b' || kind === 'k-d') && idx % 2 === 1 ? ' rev' : '';
    var body = d.two ? d.two.map(function(g){ return pts(g[1], g[0]); }).join('') : pts(d.items);
    return '<article class="fp svc" id="s-' + id + '">' +
      '<header class="svc-hd"><div class="tagrow"><span class="tag" data-node="load">' + led() + '<span>' + esc(parts[0]) + '</span>' +
        (parts.length > 1 ? '<span class="tag-x">· ' + esc(parts.slice(1).join(' · ')) + '</span>' : '') + '</span></div>' +
        '<div class="svc-tt"><h3>' + esc(d.h3) + '</h3>' + (d.sub ? '<p class="svc-sub">' + esc(d.sub) + '</p>' : '') + '</div>' + spark() + '</header>' +
      (d.note ? '<p class="note">' + esc(d.note) + '</p>' : '') +
      '<div class="svc-bd ' + kind + rev + '">' + body + d.figs.map(cam).join('') + '</div></article>';
  }
  F.pilares.forEach(function(P, i){
    html += '<section class="scr" id="' + P.id + '" data-k="areas"><div class="c">' + scrHd(F.pilarWord, P.n, 'feed', R.pil[i][0]) +
      '<h2 class="h2">' + esc(P.a) + ' <span>' + esc(P.b) + '</span></h2>' + P.servicos.map(svc).join('') + '</div></section>';
  });

  /* ---------- Inovacao = SAIDA 04, cinco modulos ---------- */
  var N = F.inov;
  html += '<section class="scr" id="inovacao" data-k="inovacao"><div class="c">' + scrHd(N.eyebrow, '', 'feed', R.pil[3][0]) +
    '<h2 class="h2">' + esc(N.h2a) + ' <span>' + esc(N.h2b) + '</span></h2><p class="lead">' + esc(N.lead) + '</p>' +
    '<div class="mods">' + N.mods.map(function(m){
      var inner = '<div class="mod-hd"><span class="tag sm" data-node="load">' + led() + '<span>' + esc(m.b) + '</span></span><span class="mod-top">' + esc(m.top) + (m.em ? '<em>' + esc(m.em) + '</em>' : '') + '</span></div>' +
        '<div class="mod-g"><div class="mod-tr grid-bg"><svg viewBox="0 0 ' + m.vw + ' 92" aria-hidden="true">' + m.svg + '</svg><i class="cur" aria-hidden="true" style="animation-delay:-' + (rnd() * 8).toFixed(1) + 's"></i></div>' +
        '<div class="mod-b"><h3>' + esc(m.h3) + '</h3><p>' + esc(m.p) + '</p>' + (m.link ? '<span class="mod-lk">' + esc(m.link[0]) + '</span>' : '') + '</div></div>';
      return m.link ? '<a class="fp mod mod-w" href="' + esc(m.link[1]) + '">' + inner + '</a>' : '<div class="fp mod">' + inner + '</div>';
    }).join('') + '</div></div></section>';

  /* ---------- Contato: o circuito fecha aqui ---------- */
  var C = F.contato;
  html += '<section class="scr" id="contato" data-k="contato"><div class="c">' + scrHd(C.eyebrow, '', 'end-hd') +
    '<h2 class="h2">' + esc(C.h2a) + ' <span>' + esc(C.h2b) + '</span></h2>' +
    '<div class="fp ct" id="ct">' +
      '<div class="ct-f"><h3 data-node="end">' + led() + esc(C.emailH) + '</h3><a class="val" href="' + esc(C.emailHref) + '">' + esc(C.email) + '</a><a class="btn" href="' + esc(C.emailBtnHref) + '">' + esc(C.emailBtn) + '</a></div>' +
      '<div class="ct-f"><h3>' + led() + esc(C.telH) + '</h3><a class="val" href="' + esc(C.telHref) + '">' + esc(C.tel) + '</a><a class="btn ghost" href="' + esc(C.waHref) + '" target="_blank" rel="noopener">' + esc(C.waBtn) + '</a></div>' +
      '<div class="ct-f"><h3>' + led() + esc(C.respH) + '</h3><span class="val">' + esc(C.resp) + '</span></div>' +
    '</div></div></section>';

  /* ---------- Rodape e aviso de cookies ---------- */
  var Ft = F.rodape, K = F.cookies;
  html += '<footer class="ft"><div class="c ft-c"><img loading="lazy" src="' + IMG + F.logo.full + '" alt="' + esc(F.logo.altFull) + '">' +
    '<div class="ft-t"><p>' + rich(Ft.p1) + '</p><p>' + esc(Ft.p2) + '</p></div><span class="mono">' + esc(Ft.mono) + '</span></div></footer>' +
    '<div class="ck" id="ck" hidden><div class="c ck-c">' + led('amb blink') + '<p>' + esc(K.text) + '</p>' +
    '<div class="ck-a"><button type="button" class="btn ghost" id="ckN">' + esc(K.decline) + '</button><button type="button" class="btn" id="ckY">' + esc(K.accept) + '</button></div></div></div>';

  document.getElementById('app').outerHTML = '<svg id="wire" aria-hidden="true" focusable="false"></svg>' + html;
  function $(id){ return document.getElementById(id); }
  function $$(s, r){ return [].slice.call((r || document).querySelectorAll(s)); }

  /* ---------- relogio do supervisorio (data e hora reais) ---------- */
  var ckD = $('ckD'), ckT = $('ckT'), camCk = $$('.cam-ck');
  function p2(n){ return (n < 10 ? '0' : '') + n; }
  function tick(){
    var d = new Date(), ds = p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear(),
        ts = p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
    ckD.textContent = ds; ckT.textContent = ts;
    for (var i = 0; i < camCk.length; i++) camCk[i].textContent = ds + ' ' + ts;
    setTimeout(tick, 1010 - d.getMilliseconds());
  }
  tick();

  /* ---------- aviso de cookies: o Google Analytics so carrega depois de "Aceitar" (mesma regra do site anterior) ---------- */
  var GA_ID = 'G-Z799Z17097';
  function loadAnalytics(){
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }
  var ck = $('ck');
  function getC(){ try { return localStorage.getItem(K.key); } catch(e){ return null; } }
  function setC(v){ try { localStorage.setItem(K.key, v); } catch(e){} }
  function closeCk(v){ setC(v); ck.hidden = true; document.body.classList.remove('ckon'); }
  var cv0 = getC();
  if (cv0 === 'accepted') loadAnalytics();
  else if (cv0 !== 'declined'){ ck.hidden = false; document.body.classList.add('ckon'); }
  $('ckY').addEventListener('click', function(){ closeCk('accepted'); loadAnalytics(); });
  $('ckN').addEventListener('click', function(){ closeCk('declined'); });

  /* ---------- tendencia ao vivo: diagrama fasorial (logica do assets/js/site.js) ---------- */
  var cv = $('wave'), inst = $('inst'), ctx = cv.getContext('2d'), btn = $('run'), rF = $('rF'), fP = $('fP');
  var TAU = Math.PI * 2, COLS = ['#f7941e', '#dfe3e7', '#858e98'];
  /* Sempre abre ligado, mesmo com "menos movimento" no sistema (06/10/2026, pedido do Roberto); a tecla STOP para. */
  var W = 0, Hh = 0, t = 0.9, run = true, vis = false, raf = null, last = 0, lastTick = 0;
  function size(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; Hh = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function paint(){
    ctx.clearRect(0, 0, W, Hh);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(201,206,212,0.07)';
    for (var i = 0; i <= 10; i++){ var gx = Math.round(i * W / 10) + .5; ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, Hh); ctx.stroke(); }
    for (var j = 0; j <= 8; j++){ var gy = Math.round(j * Hh / 8) + .5; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    var R0 = Hh * 0.36, cx = Hh * 0.5, cy = Hh / 2, x0 = Hh + 8, th = t * TAU * 0.45, wide = W - x0 >= 40;
    var xc = x0 + (W - x0) * 0.64;
    ctx.strokeStyle = 'rgba(201,206,212,0.30)';
    ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R0 - 6, cy); ctx.lineTo(cx + R0 + 6, cy); ctx.moveTo(cx, cy - R0 - 6); ctx.lineTo(cx, cy + R0 + 6); ctx.stroke();
    if (wide){
      ctx.strokeStyle = 'rgba(201,206,212,0.18)'; ctx.beginPath(); ctx.moveTo(x0, cy + .5); ctx.lineTo(W, cy + .5); ctx.stroke();
      ctx.strokeStyle = 'rgba(201,206,212,0.45)'; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(Math.round(xc) + .5, 0); ctx.lineTo(Math.round(xc) + .5, Hh); ctx.stroke(); ctx.setLineDash([]);
    }
    for (var p = 0; p < 3; p++){
      var ang = th - p * TAU / 3, tx = cx + R0 * Math.cos(ang), ty = cy - R0 * Math.sin(ang), col = COLS[p];
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = p === 0 ? 6 : 0;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(tx, ty, 3, 0, TAU); ctx.fillStyle = col; ctx.fill();
      if (!wide) continue;
      ctx.globalAlpha = 0.3; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x0, ty); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.beginPath();
      for (var x = x0; x <= W; x++){ var y = cy - R0 * Math.sin(ang - TAU * 1.5 * (x - x0) / (W - x0)); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = col; ctx.lineWidth = 1.9; ctx.shadowColor = col; ctx.shadowBlur = p === 0 ? 6 : 0; ctx.stroke(); ctx.shadowBlur = 0;
      var yc = cy - R0 * Math.sin(ang - TAU * 1.5 * (xc - x0) / (W - x0));
      ctx.fillStyle = col; ctx.fillRect(Math.round(xc) - 3, Math.round(yc) - 3, 6, 6);
    }
  }
  function frame(now){
    if (!(run && vis)){ raf = null; return; }
    if (last) t += Math.min((now - last) / 1000, 0.05);
    last = now;
    if (now - lastTick > 900){
      lastTick = now;
      var f = 60 + (Math.random() - .5) * .04;
      rF.innerHTML = f.toFixed(2).replace('.', ',') + '<u>' + esc(r[0][2]) + '</u>';
      fP.style.left = (50 + (f - 60) * 1000) + '%';
    }
    paint(); raf = requestAnimationFrame(frame);
  }
  function kick(){ if (run && vis && !raf){ last = 0; raf = requestAnimationFrame(frame); } }
  function ui(){
    btn.textContent = run ? S.stop : S.run;
    btn.setAttribute('aria-pressed', String(run));
    btn.setAttribute('aria-label', run ? S.stopAria : S.runAria);
    inst.classList.toggle('on', run);
  }
  btn.addEventListener('click', function(){ run = !run; ui(); kick(); });
  size(); paint(); ui();
  window.addEventListener('resize', function(){ size(); paint(); });
  if ('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ vis = es[0].isIntersecting; kick(); }, { threshold: .05 }).observe(cv);
  } else { vis = true; kick(); }

  /* ---------- unifilar do site: no celular o desenho e recortado nas 4 saidas (como na C) ---------- */
  var uf = $('uf'), ufs = $('ufs'), ov = $('ov');
  var mq = window.matchMedia('(max-width: 600px)');
  function vb(){ ufs.setAttribute('viewBox', mq.matches ? '100 0 800 250' : '0 0 1000 250'); }
  vb();
  if (mq.addEventListener) mq.addEventListener('change', vb); else if (mq.addListener) mq.addListener(vb);

  /* ---------- menu: aba da tela que esta sendo lida (so leitura da posicao) ---------- */
  if ('IntersectionObserver' in window){
    var navA = $$('.hd-nav a'), secs = $$('section[data-k]');
    var ioS = new IntersectionObserver(function(es){
      es.forEach(function(e){ e.target.classList.toggle('on', e.isIntersecting); });
      var cur = secs.filter(function(s){ return s.classList.contains('on'); })[0];
      if (cur){ var k = cur.getAttribute('data-k'); navA.forEach(function(a){ a.classList.toggle('on', a.getAttribute('data-k') === k); }); }
    }, { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(function(s){ ioS.observe(s); });
  }

  /* ================= o sinotico =================
     layout(): mede a pagina e desenha linha, ramais e simbolos na camada #wire.
     update(): so LE a posicao de rolagem; energiza tudo o que esta acima da "frente de energia",
     e cada faceplate obedece: apagado antes, aceso (LED, tag ambar, camera ligada) depois. */
  (function(){
    var svg = $('wire'), root = document.documentElement, ct = $('ct');
    var nodes = [], cutR = null, cutF = null, sparkEl = null, yTop = 0, yEnd = 0, sxG = 0, ufY = 0, pending = false, ufOn = null;

    function num(v){ return parseFloat(getComputedStyle(root).getPropertyValue(v)) || 0; }
    function cy(el){ var b = el.getBoundingClientRect(); return b.top + window.scrollY + b.height / 2; }
    function f1(n){ return Math.round(n * 10) / 10; }
    function q(s, r){ return (r || document).querySelector(s); }

    function layout(){
      pending = false;
      var sy = window.scrollY, w = window.innerWidth;
      var wl = q('#sobre > .c').getBoundingClientRect().left;
      var sx = wl + num('--s'), rx = wl + num('--r'), dx = wl + num('--dot');
      var mob = w <= 600, tab = w <= 1000;
      var RG = mob ? 8 : tab ? 15 : 21, BK = mob ? 12 : tab ? 20 : 26, TR = mob ? 5.5 : tab ? 10 : 13,
          FB = mob ? 9 : tab ? 13 : 16, LR = mob ? 4.5 : tab ? 5 : 6, JN = mob ? 3 : 4.5;

      var yG = cy(q('[data-node=gen]')), yB = cy(q('[data-node=brk]')), yT = cy(q('[data-node=tr]'));
      var us = ufs.getBoundingClientRect(), vbx = ufs.viewBox.baseVal;
      var yBus = us.top + sy + us.height * (172 - vbx.y) / vbx.height, xBus = us.left + us.width * (124 - vbx.x) / vbx.width;
      ufY = yBus;  /* o unifilar do site acende quando a linha chega ao barramento dele */
      var feeds = $$('[data-node=feed]').map(function(el){
        var sec = el.closest('section'), groups = [];
        $$('[data-node=load]', sec).forEach(function(l){
          var y = cy(l), fpEl = l.closest('.fp'), g = groups.filter(function(G){ return Math.abs(G.y - y) < 4; })[0];
          if (g) g.els.push(fpEl); else groups.push({ y: y, els: [fpEl] });
        });
        return { y: cy(el), sec: sec, loads: groups };
      });
      var eEl = q('[data-node=end]'), cr = ct.getBoundingClientRect();
      var yE = cy(eEl), xE = cr.left;
      yTop = yG; yEnd = yE; sxG = sx;

      var paths = [], sym = [], list = [], k = 0;
      function P(d, cls, n){ paths.push({ d: d, c: cls, n: n }); }
      function node(y, symHtml, els){ var id = k++; list.push({ y: y, id: id, els: els || [] }); sym.push(symHtml.replace('%ID%', 'n' + id)); return id; }

      /* linha principal: do gerador ao contato; trecho grosso = barramento */
      P('M' + f1(sx) + ' ' + f1(yG + RG) + ' V' + f1(yE) + ' H' + f1(xE), 'sp');
      var yLastFeed = feeds.length ? feeds[feeds.length - 1].y : yBus;
      P('M' + f1(sx) + ' ' + f1(yBus) + ' V' + f1(yLastFeed), 'bus');

      /* G: gerador (o topo) */
      node(yG, '<g class="sym gen" id="%ID%"><circle class="ring" cx="' + f1(sx) + '" cy="' + f1(yG) + '" r="' + (RG + (mob ? 3.5 : 7)) + '"/>' +
        '<circle class="body" cx="' + f1(sx) + '" cy="' + f1(yG) + '" r="' + RG + '"/>' +
        '<text class="gl" x="' + f1(sx) + '" y="' + f1(yG + (mob ? 3.5 : tab ? 5 : 2.5)) + '" text-anchor="middle">G</text>' +
        (tab ? '' : '<path class="sine" d="M' + f1(sx - 8) + ' ' + f1(yG + 10) + ' c2.7 -5 5.3 -5 8 0 s5.3 5 8 0"/>') + '</g>', [q('#topo')]);

      function breaker(x, y, s, label){
        var a = y - s * .32, b = y + s * .32;
        return '<g class="sym brk" id="%ID%"><rect class="body" x="' + f1(x - s / 2) + '" y="' + f1(y - s / 2) + '" width="' + s + '" height="' + s + '"/>' +
          '<line class="stub" x1="' + f1(x) + '" y1="' + f1(y - s / 2) + '" x2="' + f1(x) + '" y2="' + f1(a) + '"/>' +
          '<line class="stub" x1="' + f1(x) + '" y1="' + f1(b) + '" x2="' + f1(x) + '" y2="' + f1(y + s / 2) + '"/>' +
          '<circle class="pin" cx="' + f1(x) + '" cy="' + f1(a) + '" r="' + (mob ? 1.3 : 1.9) + '"/>' +
          '<line class="blade" x1="' + f1(x) + '" y1="' + f1(b) + '" x2="' + f1(x) + '" y2="' + f1(a) + '"/>' +
          (label ? '<text class="lb" x="' + f1(x + s / 2 + 8) + '" y="' + f1(y + 4) + '">' + label + '</text>' : '') + '</g>';
      }
      /* 52-G: disjuntor (Quem somos) */
      node(yB, breaker(sx, yB, BK, esc(R.svg.match(/>(52-G)</)[1])), [q('#sobre'), q('#sobre .about')]);

      /* transformador (Nosso objetivo) */
      node(yT, '<g class="sym tr" id="%ID%"><ellipse class="mask" cx="' + f1(sx) + '" cy="' + f1(yT) + '" rx="' + (TR + 2) + '" ry="' + f1(TR * 1.72 + 2) + '"/>' +
        '<circle class="coil" cx="' + f1(sx) + '" cy="' + f1(yT - TR * .72) + '" r="' + TR + '"/><circle class="coil" cx="' + f1(sx) + '" cy="' + f1(yT + TR * .72) + '" r="' + TR + '"/></g>', [q('#areas')]);

      /* barramento: a derivacao horizontal entra no barramento do unifilar do site */
      var nBus = node(yBus, '<g class="sym" id="%ID%"><circle class="jn" cx="' + f1(sx) + '" cy="' + f1(yBus) + '" r="' + JN + '"/></g>');
      P('M' + f1(sx) + ' ' + f1(yBus) + ' H' + f1(xBus), 'bt dr', nBus);

      /* saidas: juncao no barramento, disjuntor no ramal, e uma carga por faceplate */
      feeds.forEach(function(f){
        if (!f.loads.length) return;
        var yl = f.loads[f.loads.length - 1].y;
        P('M' + f1(sx) + ' ' + f1(f.y) + ' H' + f1(rx) + ' V' + f1(yl), 'ram');
        var yb = f.y + (mob ? 20 : 34);
        node(f.y, '<g class="sym" id="%ID%"><circle class="jn" cx="' + f1(sx) + '" cy="' + f1(f.y) + '" r="' + JN + '"/></g>', [f.sec]);
        node(yb, breaker(rx, yb, FB, ''));
        f.loads.forEach(function(l){
          var id = node(l.y, '<g class="sym ld" id="%ID%"><circle class="halo" cx="' + f1(dx) + '" cy="' + f1(l.y) + '" r="' + (LR + 7) + '"/>' +
            '<circle class="dot" cx="' + f1(dx) + '" cy="' + f1(l.y) + '" r="' + LR + '"/></g>', l.els);
          P('M' + f1(rx) + ' ' + f1(l.y) + ' H' + f1(dx - LR), 'tap dr', id);
        });
      });

      /* fim: o circuito fecha no faceplate de contato */
      node(yE, '<g class="sym" id="%ID%"><circle class="term" cx="' + f1(xE) + '" cy="' + f1(yE) + '" r="' + (mob ? 3.5 : 5) + '"/></g>', [q('#contato'), ct]);

      function layer(cls, withLen){
        return '<g class="' + cls + '">' + paths.map(function(p){
          var dr = p.c.indexOf('dr') > -1;
          return '<path class="w ' + p.c + '"' + (p.n != null ? ' data-n="' + p.n + '"' : '') + (withLen && dr ? ' pathLength="1"' : '') + ' d="' + p.d + '"/>';
        }).join('') + '</g>';
      }
      var Hs = Math.ceil(yE + 60);
      svg.setAttribute('height', Hs); svg.style.height = Hs + 'px';
      svg.innerHTML = '<defs><clipPath id="cutE" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="100000" height="0"/></clipPath>' +
        '<clipPath id="cutF" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="100000" height="0"/></clipPath></defs>' +
        layer('off', false) +
        '<g clip-path="url(#cutE)">' + layer('glo', true) + layer('cor', true) + '</g>' +
        '<g clip-path="url(#cutF)">' + layer('flo', false) + '</g>' +
        sym.join('') +
        '<g id="spark"><circle class="s1" r="' + (mob ? 8 : 14) + '"/><circle class="s2" r="' + (mob ? 4 : 6.5) + '"/><circle class="s3" r="' + (mob ? 2 : 3.2) + '"/></g>';
      cutR = svg.querySelector('#cutE rect'); cutF = svg.querySelector('#cutF rect'); sparkEl = svg.querySelector('#spark');
      nodes = list.map(function(n){
        return { y: n.y, on: null, g: svg.querySelector('#n' + n.id), w: $$('[data-n="' + n.id + '"]', svg), els: n.els.filter(Boolean) };
      });
      update();
    }

    function update(){
      if (!cutR) return;
      var vh = window.innerHeight, sy = window.scrollY, max = Math.max(1, root.scrollHeight - vh);
      var tail = Math.min(1, Math.max(0, (sy - (max - vh * 1.2)) / (vh * 1.2)));
      /* frente de energia: 55% da tela; perto do fim desce ate a base para o circuito fechar.
         Vale tambem com "menos movimento" pedido pelo sistema (06/10/2026, pedido do Roberto: o Windows dele
         esta com animacoes desligadas e a pagina nascia toda energizada, "nao ta vivo"). Nesse modo so somem
         as animacoes continuas e as transicoes; a energia continua seguindo a rolagem. */
      var front = sy + vh * (.55 + .45 * tail);
      cutR.setAttribute('height', Math.max(0, Math.min(front, 1e7)));
      var f0 = Math.max(0, sy - 120);
      cutF.setAttribute('y', f0); cutF.setAttribute('height', Math.max(0, Math.min(front, 1e7) - f0));
      sparkEl.setAttribute('transform', 'translate(' + f1(sxG) + ' ' + f1(Math.min(front, yEnd)) + ')');
      sparkEl.style.opacity = (front > yTop && front < yEnd) ? 1 : 0;
      for (var i = 0; i < nodes.length; i++){
        var n = nodes[i], on = front >= n.y;
        if (on === n.on) continue;
        n.on = on;
        if (n.g) n.g.classList.toggle('on', on);
        for (var j = 0; j < n.w.length; j++) n.w[j].classList.toggle('on', on);
        for (var e = 0; e < n.els.length; e++) n.els[e].classList.toggle('live', on);
      }
      var u = front >= ufY;
      if (u !== ufOn){ ufOn = u; uf.classList.toggle('go', u); ov.classList.toggle('live', u); }
    }

    var ticking = false;
    window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(function(){ ticking = false; update(); }); } }, { passive: true });
    function schedule(){ if (!pending){ pending = true; requestAnimationFrame(layout); } }
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
    layout();
  })();
})();
