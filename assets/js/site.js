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

/* Cabecalho, osciloscopio do topo e unifilar dos pilares. */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var hd = document.getElementById('hd');
  window.addEventListener('scroll', function(){ hd.classList.toggle('scrolled', window.scrollY > 40); }, {passive:true});

  /* osciloscopio */
  var cv = document.getElementById('wave'), ctx = cv.getContext('2d');
  var W = 0, H = 0, t = 0, running = false, raf = null;
  function size(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle = 'rgba(126,169,214,0.10)'; ctx.lineWidth = 1;
    for(var x=0; x<=W; x+=W/12){ ctx.beginPath(); ctx.moveTo(Math.round(x)+.5,0); ctx.lineTo(Math.round(x)+.5,H); ctx.stroke(); }
    for(var y=0; y<=H; y+=H/4){ ctx.beginPath(); ctx.moveTo(0,Math.round(y)+.5); ctx.lineTo(W,Math.round(y)+.5); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(126,169,214,0.24)';
    ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
    var amp = H*0.31;
    ctx.beginPath();
    for(var i=0;i<=W;i++){
      var a = (i/W)*Math.PI*4 + t;
      var v = Math.sin(a) + 0.085*Math.sin(3*a+0.6) + 0.045*Math.sin(5*a+1.2);
      var yy = H/2 - v*amp;
      if(i===0) ctx.moveTo(i,yy); else ctx.lineTo(i,yy);
    }
    ctx.strokeStyle = '#f7941e'; ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(247,148,30,0.55)'; ctx.shadowBlur = 10;
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  var rV = document.getElementById('rV'), rF = document.getElementById('rF'), rT = document.getElementById('rT'), last = 0;
  function reads(now){
    if(now - last < 900) return; last = now;
    rV.innerHTML = (219.4 + (Math.random()-.5)*1.6).toFixed(1).replace('.',',') + '<u>V</u>';
    rF.innerHTML = (59.98 + (Math.random()-.5)*.05).toFixed(2).replace('.',',') + '<u>Hz</u>';
    rT.innerHTML = (3.2 + (Math.random()-.5)*.5).toFixed(1).replace('.',',') + '<u>%</u>';
  }
  function loop(now){ if(!running) return; t += 0.028; draw(); reads(now||0); raf = requestAnimationFrame(loop); }
  size(); draw();
  window.addEventListener('resize', function(){ size(); draw(); });
  if(!reduce){
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ es.forEach(function(e){
        if(e.isIntersecting && !running){ running = true; raf = requestAnimationFrame(loop); }
        else if(!e.isIntersecting && running){ running = false; cancelAnimationFrame(raf); }
      }); },{threshold:.05}).observe(cv);
    } else { running = true; raf = requestAnimationFrame(loop); }
  }

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
