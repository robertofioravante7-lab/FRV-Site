/* FRV Engenharia: comportamento do site. Carregado com defer (DOM pronto). */

/* Consentimento de cookies: o Google Analytics so carrega depois de "Aceitar". */
(function(){
  var GA_ID = 'G-Z799Z17097', KEY = 'frv_cookie_consent';
  function getC(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
  function setC(v){ try { localStorage.setItem(KEY, v); } catch(e){} }
  function loadAnalytics(){
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }
  var ck = document.getElementById('cookie-banner'), c = getC();
  if (c === 'accepted') loadAnalytics();
  else if (c !== 'declined') ck.hidden = false;
  document.getElementById('cookie-accept').addEventListener('click', function(){ setC('accepted'); ck.hidden = true; loadAnalytics(); });
  document.getElementById('cookie-decline').addEventListener('click', function(){ setC('declined'); ck.hidden = true; });
})();

/* Cabecalho, instrumento do topo (diagrama fasorial) e unifilar dos pilares. */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var hd = document.getElementById('hd');
  window.addEventListener('scroll', function(){ hd.classList.toggle('scrolled', window.scrollY > 40); }, {passive:true});

  /* instrumento do topo: diagrama fasorial com tecla RUN/STOP.
     Se o sistema pede menos movimento, comeca parado (STOP) e a tecla RUN liga. */
  var inst = document.getElementById('inst'), cv = document.getElementById('wave'), ctx = cv.getContext('2d');
  var btn = document.getElementById('run'), rF = document.getElementById('rF');
  var TAU = Math.PI * 2, COLS = ['#f7941e', '#9fd0f5', '#e9edf3'];
  var W = 0, H = 0, t = 0.9, run = !reduce, vis = false, raf = null, last = 0, lastTick = 0;

  function size(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function paint(){
    ctx.clearRect(0,0,W,H);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(126,169,214,0.10)';
    for(var i=0; i<=10; i++){ var gx = Math.round(i*W/10)+.5; ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
    for(var j=0; j<=8; j++){ var gy = Math.round(j*H/8)+.5; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }
    var R = H*0.36, cx = H*0.5, cy = H/2, x0 = H + 8, th = t*TAU*0.45;
    ctx.strokeStyle = 'rgba(126,169,214,0.35)';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-R-6, cy); ctx.lineTo(cx+R+6, cy); ctx.moveTo(cx, cy-R-6); ctx.lineTo(cx, cy+R+6); ctx.stroke();
    for(var p=0; p<3; p++){
      var ang = th - p*TAU/3, tx = cx + R*Math.cos(ang), ty = cy - R*Math.sin(ang), col = COLS[p];
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(tx, ty, 3, 0, TAU); ctx.fillStyle = col; ctx.fill();
      if(W - x0 < 40) continue;
      ctx.globalAlpha = 0.35; ctx.setLineDash([3,4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x0, ty); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.beginPath();
      for(var x=x0; x<=W; x++){ var y = cy - R*Math.sin(ang - TAU*1.5*(x-x0)/(W-x0)); if(x===x0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
      ctx.strokeStyle = col; ctx.lineWidth = 1.9; ctx.shadowColor = col; ctx.shadowBlur = 9; ctx.stroke(); ctx.shadowBlur = 0;
    }
  }
  function frame(now){
    if(!(run && vis)){ raf = null; return; }
    if(last) t += Math.min((now - last)/1000, 0.05);
    last = now;
    if(now - lastTick > 900){ lastTick = now; rF.innerHTML = (60 + (Math.random()-.5)*.04).toFixed(2).replace('.',',') + '<u>Hz</u>'; }
    paint(); raf = requestAnimationFrame(frame);
  }
  function kick(){ if(run && vis && !raf){ last = 0; raf = requestAnimationFrame(frame); } }
  function ui(){
    btn.textContent = run ? 'STOP' : 'RUN';
    btn.setAttribute('aria-pressed', String(run));
    btn.setAttribute('aria-label', run ? 'Parar a animação do instrumento' : 'Ligar a animação do instrumento');
    inst.classList.toggle('on', run);
  }
  btn.addEventListener('click', function(){ run = !run; ui(); kick(); });
  size(); paint(); ui();
  window.addEventListener('resize', function(){ size(); paint(); });
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ vis = es[0].isIntersecting; kick(); },{threshold:.05}).observe(cv);
  } else { vis = true; kick(); }

  /* unifilar dos pilares: desenha ao entrar na tela; sem suporte, fica desenhado */
  var uf = document.getElementById('uf');
  if(uf && !reduce && 'IntersectionObserver' in window){
    uf.classList.add('armed');
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){
      if(e.isIntersecting){ requestAnimationFrame(function(){ uf.classList.add('go'); }); io.disconnect(); }
    }); },{threshold:.25});
    io.observe(uf);
  }
})();
