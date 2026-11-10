// FRV XcoInit · supervisório do Trem A (simulação ilustrativa) — sinótico, seis telas e cenários.
// Externo de propósito: o CSP do site usa script-src 'self' (sem inline). Sem biblioteca: Canvas 2D e SVG à mão.
// Movimento: com "reduzir movimento" ligado no sistema, abre em 1 Hz (sem giro nem pulso, uma atualização
// por segundo, como num supervisório); o botão "fluida" liga a animação contínua. A mira segue o mouse nos dois modos.
'use strict';
(function () {
  const SV = window.XcoSV;
  const raiz = document.querySelector('[data-sv]');
  if (!SV || !SV.Simulador || !raiz) return;
  const C = SV.C;
  const sim = new SV.Simulador();
  SV.sim = sim;
  const MONO = '"IBM Plex Mono", Consolas, monospace';
  const NS = 'http://www.w3.org/2000/svg';
  const D2R = Math.PI / 180;
  const lim = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ---------------- formatação pt-BR ----------------
  const NF = {};
  function fmt(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    d = d || 0;
    const f = NF[d] || (NF[d] = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
    return f.format(v).replace('-', '−');
  }

  // ---------------- cores: lidas do CSS (as variantes podem trocar) ----------------
  const PADRAO = {
    painel: '#0d1720', grade: 'rgba(56,189,248,0.055)', grade2: 'rgba(56,189,248,0.12)', eixo: '#3b5266',
    texto: '#e2e8f0', dim: '#94a3b8', dim2: '#64748b', ciano: '#22d3ee', azul: '#3b82f6', ambar: '#fbbf24',
    ok: '#22c55e', alerta: '#fbbf24', trip: '#ef4444', notok: '#a855f7', branco: '#f8fafc', aco: '#475569'
  };
  const cor = Object.assign({}, PADRAO);
  function lerCores() {
    const cs = getComputedStyle(raiz);
    for (const k in PADRAO) { const v = cs.getPropertyValue('--sv-' + k).trim(); cor[k] = v || PADRAO[k]; }
  }
  function rgba(c, a) {
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      const n = parseInt(h, 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(','); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; }
    return c;
  }

  // ---------------- utilidades de desenho ----------------
  const esc = (w) => lim(w / 460, 0.74, 2.2);
  const F = (px, peso) => (peso || 400) + ' ' + px.toFixed(1) + 'px ' + MONO;
  function tx(g, s, x, y, o) {
    o = o || {};
    g.font = F(o.px || 10, o.peso);
    g.fillStyle = o.c || cor.texto;
    g.textAlign = o.a || 'left';
    g.textBaseline = o.b || 'alphabetic';
    g.fillText(s, x, y);
  }
  function linha(g, pts, c, lw, tracejado) {
    if (pts.length < 2) return;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokeStyle = c;
    g.lineWidth = lw || 1;
    g.setLineDash(tracejado || []);
    g.stroke();
    g.setLineDash([]);
  }
  function grade(g, x, y, w, h, p) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.lineWidth = 1;
    for (let forte = 0; forte < 2; forte++) {
      g.beginPath();
      let i = 0;
      for (let X = x; X <= x + w + 0.5; X += p, i++) if ((i % 5 === 0) === !!forte) { const r = Math.round(X) + 0.5; g.moveTo(r, y); g.lineTo(r, y + h); }
      i = 0;
      for (let Y = y; Y <= y + h + 0.5; Y += p, i++) if ((i % 5 === 0) === !!forte) { const r = Math.round(Y) + 0.5; g.moveTo(x, r); g.lineTo(x + w, r); }
      g.strokeStyle = forte ? cor.grade2 : cor.grade;
      g.stroke();
    }
    g.restore();
  }
  function base(g, w, h) {
    g.fillStyle = cor.painel;
    g.fillRect(0, 0, w, h);
    grade(g, 0, 0, w, h, 8);
  }
  function moldura(g, x, y, w, h) {
    g.strokeStyle = cor.eixo;
    g.lineWidth = 1;
    g.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
  }
  function caixaTexto(g, linhas, x, y, k, w, h, c) {
    g.font = F(9.5 * k);
    let lw = 0;
    for (const s of linhas) lw = Math.max(lw, g.measureText(s).width);
    const bw = lw + 12 * k, bh = linhas.length * 12.5 * k + 7 * k;
    let bx = x + 12, by = y - bh - 10;
    if (bx + bw > w - 2) bx = x - bw - 12;
    if (by < 2) by = y + 12;
    if (by + bh > h - 2) by = h - bh - 2;
    g.fillStyle = 'rgba(5,10,16,0.88)';
    g.fillRect(bx, by, bw, bh);
    g.strokeStyle = c || cor.ciano;
    g.lineWidth = 1;
    g.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    linhas.forEach((s, i) => tx(g, s, bx + 6 * k, by + (i + 1) * 12.5 * k, { px: 9.5 * k, c: i ? cor.texto : c || cor.ciano }));
  }
  // mira: cruz pontilhada que segue o mouse e mostra a leitura do ponto
  function mira(g, a, ar, leitura) {
    const m = a.mouse;
    if (!m || m.x < ar.x || m.x > ar.x + ar.w || m.y < ar.y || m.y > ar.y + ar.h) return;
    g.save();
    g.strokeStyle = rgba(cor.branco, 0.55);
    g.lineWidth = 1;
    g.setLineDash([3, 3]);
    g.beginPath();
    g.moveTo(ar.x, Math.round(m.y) + 0.5); g.lineTo(ar.x + ar.w, Math.round(m.y) + 0.5);
    g.moveTo(Math.round(m.x) + 0.5, ar.y); g.lineTo(Math.round(m.x) + 0.5, ar.y + ar.h);
    g.stroke();
    g.restore();
    const ls = leitura(m.x, m.y);
    if (ls && ls.length) caixaTexto(g, ls, m.x, m.y, esc(a.w), a.w, a.h, cor.ciano);
  }
  function seta(g, x1, y1, x2, y2, c, k) {
    const ang = Math.atan2(y2 - y1, x2 - x1), t = 6 * k;
    g.beginPath();
    g.moveTo(x2, y2);
    g.lineTo(x2 - t * Math.cos(ang - 0.45), y2 - t * Math.sin(ang - 0.45));
    g.lineTo(x2 - t * Math.cos(ang + 0.45), y2 - t * Math.sin(ang + 0.45));
    g.closePath();
    g.fillStyle = c;
    g.fill();
  }
  function quebraTexto(g, s, larg) {
    const pal = s.split(' ');
    const out = [];
    let l = '';
    for (const p of pal) {
      const t = l ? l + ' ' + p : p;
      if (g.measureText(t).width > larg && l) { out.push(l); l = p; } else l = t;
    }
    if (l) out.push(l);
    return out;
  }
  function estadoVT(c) {
    if (c.notok) return 'notok';
    if (c.acima || c.v >= C.VT_PE) return 'trip';
    if (c.v >= C.VT_AL) return 'alerta';
    return 'ok';
  }
  function corEstado(e) { return e === 'ok' ? cor.ok : e === 'alerta' ? cor.alerta : e === 'trip' ? cor.trip : e === 'notok' ? cor.notok : cor.dim2; }
  function estadoXT(v, gap) {
    if (gap < C.GAP_MIN || gap > C.GAP_MAX) return 'notok';
    return v >= C.XT_PE ? 'trip' : v >= C.XT_AL ? 'alerta' : 'ok';
  }
  function estadoMargem() {
    if (sim.surge) return 'trip';
    if (sim.margem === null) return sim.N > 20 ? 'off' : 'off';
    return sim.margem < C.CONTROLE ? 'trip' : sim.margem < C.APERTADA ? 'alerta' : 'ok';
  }
  function niceMax(v, lista) { for (const n of lista) if (v <= n) return n; return lista[lista.length - 1]; }

  // ================= Q1 · cascata espectral 3D de VT-301A =================
  const NB = 521, NG = 81; // pontos da faixa baixa (0 a 260 Hz) e da janela do engrenamento (4.900 a 5.060 Hz)
  function amostrarFatia(f) {
    if (f.am) return f.am;
    const rnd = SV.prng(f.id * 7919 + 13);
    const am = new Float32Array(NB + NG);
    let n = 0;
    for (let i = 0; i < NB + NG; i++) {
      n = n * 0.6 + 0.4 * (0.012 + 0.035 * rnd() * rnd());
      am[i] = n;
    }
    for (const c of f.comps) {
      const sg = c.larg || 0.9;
      for (let i = 0; i < NB; i++) {
        const fr = i * 0.5, d = fr - c.f;
        if (d > -5 * sg && d < 5 * sg) am[i] += c.a * Math.exp((-d * d) / (2 * sg * sg));
      }
      const sgG = c.larg || 2.6;
      for (let i = 0; i < NG; i++) {
        const fr = 4900 + i * 2, d = fr - c.f;
        if (d > -5 * sgG && d < 5 * sgG) am[NB + i] += c.a * Math.exp((-d * d) / (2 * sgG * sgG));
      }
    }
    f.am = am;
    return am;
  }
  let escalaQ1 = 4;
  function q1(g, w, h, a) {
    base(g, w, h);
    const k = esc(w);
    const fat = sim.cascata;
    const nS = 24;
    const pl = 40 * k, pr = 14 * k, pt = 30 * k, pb = 30 * k;
    const dx = ((w - pl - pr) * 0.15) / (nS - 1), dy = ((h - pt - pb) * 0.42) / (nS - 1);
    const larg = w - pl - pr - dx * (nS - 1);
    const alt = h - pt - pb - dy * (nS - 1);
    const x0 = pl, y0 = h - pb;
    const fq = 0.8, gap = 0.035;
    const xb = (i) => x0 + (i / (NB - 1)) * larg * fq;
    const xg = (i) => x0 + larg * (fq + gap) + (i / (NG - 1)) * larg * (1 - fq - gap);
    const xf = (fr) => (fr <= 260 ? x0 + (fr / 260) * larg * fq : x0 + larg * (fq + gap) + ((fr - 4900) / 160) * larg * (1 - fq - gap));
    // escala de amplitude
    let mx = 0;
    for (const f of fat) { const am = amostrarFatia(f); for (let i = 0; i < am.length; i++) if (am[i] > mx) mx = am[i]; }
    const alvo = niceMax(mx * 1.12, [3, 4, 5, 6, 8, 10, 12, 16, 20]);
    if (alvo > escalaQ1 || alvo < escalaQ1 * 0.6) escalaQ1 = alvo;
    const aMax = escalaQ1;
    const ya = (v) => (Math.min(v, aMax * 1.08) / aMax) * alt;

    // eixos de fundo (profundidade)
    g.strokeStyle = rgba(cor.eixo, 0.9);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x0, y0); g.lineTo(x0 + dx * (nS - 1), y0 - dy * (nS - 1));
    g.moveTo(x0 + larg, y0); g.lineTo(x0 + larg + dx * (nS - 1), y0 - dy * (nS - 1));
    g.moveTo(x0 + dx * (nS - 1), y0 - dy * (nS - 1)); g.lineTo(x0 + dx * (nS - 1), y0 - dy * (nS - 1) - alt);
    g.stroke();

    const n = fat.length;
    const cristas = { '1×': [], '2×': [], '0,48×': [] };
    for (let j = 0; j < n; j++) {
      const f = fat[j];
      const d = n - 1 - j;
      const ox = d * dx, oy = -d * dy;
      const am = f.am;
      const by = y0 + oy;
      const frente = d === 0;
      const al = 0.35 + 0.65 * (1 - d / nS);
      const grad = g.createLinearGradient(0, by, 0, by - alt);
      grad.addColorStop(0, rgba(cor.azul, 0.1 * al));
      grad.addColorStop(0.3, rgba(cor.ciano, 0.3 * al));
      grad.addColorStop(0.65, rgba(cor.ciano, 0.42 * al));
      grad.addColorStop(1, rgba(cor.ambar, 0.85 * al));
      for (let banda = 0; banda < 2; banda++) {
        const i0 = banda ? NB : 0, i1 = banda ? NB + NG : NB;
        const xx = banda ? (i) => xg(i - NB) + ox : (i) => xb(i) + ox;
        g.beginPath();
        g.moveTo(xx(i0), by);
        for (let i = i0; i < i1; i++) g.lineTo(xx(i), by - ya(am[i]));
        g.lineTo(xx(i1 - 1), by);
        g.closePath();
        g.fillStyle = rgba(cor.painel, 0.86);
        g.fill();
        g.fillStyle = grad;
        g.fill();
        g.beginPath();
        for (let i = i0; i < i1; i++) { const X = xx(i), Y = by - ya(am[i]); if (i === i0) g.moveTo(X, Y); else g.lineTo(X, Y); }
        g.strokeStyle = frente ? cor.ciano : rgba(cor.ciano, 0.22 + 0.5 * al);
        g.lineWidth = frente ? 1.4 : 0.8;
        g.stroke();
      }
      for (const c of f.comps) if (cristas[c.o]) cristas[c.o].push([xf(c.f) + ox, by - ya(c.a + 0.02)]);
    }
    // linhas de crista: 1× em âmbar, 2× em ciano, 0,48× em alerta
    linha(g, cristas['1×'], cor.ambar, 1.6);
    linha(g, cristas['2×'], rgba(cor.ciano, 0.95), 1.2);
    linha(g, cristas['0,48×'], cor.alerta, 1.4, [3, 2]);

    // quebra de eixo e rótulos de frequência na fatia da frente
    const xq = x0 + larg * (fq + gap / 2);
    g.strokeStyle = cor.texto;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(xq - 6 * k, y0 + 7 * k); g.lineTo(xq - 1.5 * k, y0 - 7 * k);
    g.moveTo(xq + 1.5 * k, y0 + 7 * k); g.lineTo(xq + 6 * k, y0 - 7 * k);
    g.stroke();
    g.strokeStyle = cor.eixo;
    g.beginPath(); g.moveTo(x0, y0 + 0.5); g.lineTo(x0 + larg, y0 + 0.5); g.stroke();
    for (const fr of [0, 60, 120, 180, 240]) {
      const X = xf(fr);
      g.beginPath(); g.moveTo(X, y0); g.lineTo(X, y0 + 3 * k); g.stroke();
      tx(g, fmt(fr), X, y0 + 13 * k, { px: 9 * k, c: cor.dim, a: 'center' });
    }
    tx(g, 'Hz', x0 + larg * fq - 2 * k, y0 + 24 * k, { px: 9 * k, c: cor.dim2, a: 'right' });
    tx(g, '4.980', xf(4980), y0 + 13 * k, { px: 9 * k, c: cor.dim, a: 'center' });
    tx(g, 'zoom GMF', x0 + larg, y0 + 24 * k, { px: 8.5 * k, c: cor.dim2, a: 'right' });
    // eixo de amplitude
    g.beginPath(); g.moveTo(x0 - 0.5, y0); g.lineTo(x0 - 0.5, y0 - alt); g.stroke();
    for (const v of [0, aMax / 2, aMax]) {
      const Y = y0 - ya(v);
      g.beginPath(); g.moveTo(x0 - 3 * k, Y); g.lineTo(x0, Y); g.stroke();
      tx(g, fmt(v, v % 1 ? 1 : 0), x0 - 5 * k, Y + 3 * k, { px: 9 * k, c: cor.dim, a: 'right' });
    }
    tx(g, 'mm/s pk', 4 * k, pt - 8 * k, { px: 9 * k, c: cor.dim2 });
    // rótulos das ordens na fatia da frente
    if (n) {
      const f = fat[n - 1];
      for (const c of f.comps) {
        if (!c.o || c.o === 'surge') continue;
        const X = xf(c.f), Y = y0 - ya(c.a) - 5 * k;
        const nome = c.o === 'GMF' ? 'GMF 83×' : c.o;
        tx(g, nome, X, Y, { px: 9.5 * k, c: c.o === '1×' ? cor.ambar : c.o === '0,48×' ? cor.alerta : cor.branco, a: 'center', peso: 600 });
      }
    }
    // profundidade: tempo (ou rotação na partida)
    const xr = x0 + larg + 6 * k;
    if (n) {
      const fz = fat[0], ff = fat[n - 1];
      const rampa = Math.abs(ff.N - fz.N) > 150;
      const rot = (f) => (rampa ? fmt(f.N) + ' rpm' : '−' + fmt(ff.T - f.T) + ' s');
      tx(g, rampa ? fmt(ff.N) + ' rpm' : 'agora', xr, y0 - 2 * k, { px: 9 * k, c: cor.dim });
      g.font = F(9 * k);
      const tz = rot(fz), xz = Math.min(x0 + larg + dx * (n - 1) + 6 * k, w - 4 * k - g.measureText(tz).width);
      tx(g, tz, xz, y0 - dy * (n - 1) - 6 * k, { px: 9 * k, c: cor.dim2 });
    }
    // cabeçalho
    tx(g, 'VT-301A · piezovelocidade · 1 fatia/s', 8 * k, 14 * k, { px: 10 * k, c: cor.dim });
    tx(g, '1× ' + fmt(sim.f1, 1) + ' Hz · ' + fmt(sim.N) + ' rpm', w - 8 * k, 14 * k, { px: 10 * k, c: cor.texto, a: 'right' });
    // mira: leitura na fatia da frente
    mira(g, a, { x: x0, y: pt - 6 * k, w: larg, h: y0 - pt + 6 * k }, (mx_) => {
      if (!n) return null;
      const am = fat[n - 1].am;
      let fr, v;
      const u = (mx_ - x0) / larg;
      if (u <= fq) { const i = Math.round((u / fq) * (NB - 1)); fr = i * 0.5; v = am[lim(i, 0, NB - 1)]; }
      else if (u >= fq + gap) { const i = Math.round(((u - fq - gap) / (1 - fq - gap)) * (NG - 1)); fr = 4900 + i * 2; v = am[NB + lim(i, 0, NG - 1)]; }
      else return ['quebra de eixo'];
      const ordem = sim.f1 > 1 ? fr / sim.f1 : 0;
      return ['f ' + fmt(fr, 1) + ' Hz · ' + fmt(ordem, 2) + '×', fmt(v, 2) + ' mm/s pk'];
    });
  }

  // ================= Q2 · órbita, forma de onda e centro do eixo =================
  const U = Math.SQRT1_2;
  function sinais(nPts, span, comRuido) {
    // posições ao longo do tempo (em ângulo do eixo), em µm: x e y das sondas e a posição no plano
    const x1 = sim.x1;
    const fx = x1.faseBruta * D2R;
    const ax = x1.bruta / 2, ay = (x1.bruta * 0.86) / 2;
    const fy = fx - (98 * D2R); // Y atrasa ~90° (precessão para a frente) e um pouco mais (mancal anisotrópico)
    const a2 = sim.a2 / 2, f2 = -40 * D2R;
    const aw = sim.aw / 2, fw = 30 * D2R;
    const aero = sim.cen === 4 ? Math.max(0, sim.xtX - sim.x1.bruta - sim.a2 - sim.aw) / 2 : 0;
    const out = [];
    const th1 = angVis, th0 = th1 - span;
    for (let i = 0; i < nPts; i++) {
      const th = th0 + ((th1 - th0) * i) / (nPts - 1);
      let X = ax * Math.cos(th + fx) + a2 * Math.cos(2 * th + f2) + aw * Math.cos(C.WHIRL * th + fw);
      let Y = ay * Math.cos(th + fy) + a2 * 0.86 * Math.cos(2 * th + f2 - Math.PI / 2) + aw * Math.cos(C.WHIRL * th + fw - Math.PI / 2);
      if (comRuido) {
        X += 0.5 * Math.cos(3 * th + 1) + aero * 0.55 * Math.cos(0.31 * th + 0.7) + aero * 0.45 * Math.cos(0.17 * th + 2) + (Math.sin(th * 13.7) + Math.sin(th * 7.3)) * 0.35;
        Y += 0.5 * Math.cos(3 * th - 0.6) + aero * 0.55 * Math.cos(0.31 * th + 0.7 - Math.PI / 2) + aero * 0.45 * Math.cos(0.17 * th + 0.4) + (Math.sin(th * 11.1) + Math.sin(th * 5.9)) * 0.35;
      }
      out.push({ th, X, Y, px: (X - Y) * U, py: (X + Y) * U });
    }
    return out;
  }
  function q2(g, w, h, a) {
    base(g, w, h);
    const k = esc(w);
    const S = Math.min(h - 66 * k, w * 0.44);
    const ox = 12 * k + S / 2, oy = 22 * k + S / 2;
    const temWhirl = sim.aw > 3;
    const span = 2 * Math.PI * (temWhirl ? 1 / C.WHIRL : 1);
    const filt = sinais(220, span, false);
    const bruta = sinais(260, span, true);
    let amx = 0;
    for (const p of bruta) amx = Math.max(amx, Math.abs(p.px), Math.abs(p.py));
    const esca = niceMax(amx * 1.15, [10, 15, 20, 30, 40, 50, 60, 80]);
    const R = S / 2 - 8 * k;
    const pu = R / esca;
    // moldura e eixos
    g.fillStyle = 'rgba(4,9,14,0.55)';
    g.beginPath(); g.arc(ox, oy, R, 0, 2 * Math.PI); g.fill();
    g.strokeStyle = cor.eixo; g.lineWidth = 1;
    g.beginPath(); g.arc(ox, oy, R, 0, 2 * Math.PI); g.stroke();
    g.setLineDash([2, 3]);
    g.beginPath(); g.arc(ox, oy, R / 2, 0, 2 * Math.PI); g.stroke();
    g.beginPath(); g.moveTo(ox - R, oy); g.lineTo(ox + R, oy); g.moveTo(ox, oy - R); g.lineTo(ox, oy + R); g.stroke();
    g.setLineDash([]);
    // direções das sondas (vistas do acionador): X a 45° à direita, Y a 45° à esquerda
    for (const [ang, nome] of [[45, 'X'], [135, 'Y']]) {
      const c = Math.cos(ang * D2R), s = Math.sin(ang * D2R);
      g.strokeStyle = cor.ciano; g.lineWidth = 2;
      g.beginPath(); g.moveTo(ox + c * (R - 2), oy - s * (R - 2)); g.lineTo(ox + c * (R + 6 * k), oy - s * (R + 6 * k)); g.stroke();
      tx(g, nome, ox + c * (R + 13 * k), oy - s * (R + 13 * k) + 3 * k, { px: 9.5 * k, c: cor.ciano, a: 'center', peso: 600 });
    }
    // órbita bruta (ao fundo) e filtrada
    linha(g, bruta.map((p) => [ox + p.px * pu, oy - p.py * pu]), rgba(cor.dim, 0.45), 1);
    linha(g, filt.map((p) => [ox + p.px * pu, oy - p.py * pu]), cor.ciano, 1.8);
    // marcas da referência de fase (uma por rotação): ponto vazado
    const th1 = angVis, th0 = th1 - span;
    const xf1 = sim.x1.faseBruta * D2R;
    for (let m = Math.ceil(th0 / (2 * Math.PI)); m * 2 * Math.PI <= th1; m++) {
      const th = m * 2 * Math.PI;
      const p = ponto(th);
      g.fillStyle = cor.painel; g.strokeStyle = cor.branco; g.lineWidth = 1.6;
      g.beginPath(); g.arc(ox + p.px * pu, oy - p.py * pu, 3.6 * k, 0, 2 * Math.PI); g.fill(); g.stroke();
    }
    function ponto(th) {
      const X = (sim.x1.bruta / 2) * Math.cos(th + xf1) + (sim.a2 / 2) * Math.cos(2 * th - 40 * D2R) + (sim.aw / 2) * Math.cos(C.WHIRL * th + 30 * D2R);
      const Y = ((sim.x1.bruta * 0.86) / 2) * Math.cos(th + xf1 - 98 * D2R) + ((sim.a2 * 0.86) / 2) * Math.cos(2 * th - 40 * D2R - Math.PI / 2) + (sim.aw / 2) * Math.cos(C.WHIRL * th + 30 * D2R - Math.PI / 2);
      return { px: (X - Y) * U, py: (X + Y) * U };
    }
    // ponto atual do eixo (anda no sentido da precessão)
    if (modo === 'fluida') {
      const p = filt[filt.length - 1];
      g.fillStyle = cor.ambar;
      g.shadowColor = cor.ambar; g.shadowBlur = 8;
      g.beginPath(); g.arc(ox + p.px * pu, oy - p.py * pu, 3.2 * k, 0, 2 * Math.PI); g.fill();
      g.shadowBlur = 0;
    }
    // seta de precessão: anti-horária = para a frente (rotação anti-horária vista do acionador)
    const ra = R + 2 * k;
    g.strokeStyle = cor.ok; g.lineWidth = 1.6;
    g.beginPath(); g.arc(ox, oy, ra, -2.05, -1.35, false); g.stroke();
    seta(g, ox + ra * Math.cos(-1.35 - 0.2), oy + ra * Math.sin(-1.35 - 0.2), ox + ra * Math.cos(-2.05), oy + ra * Math.sin(-2.05), cor.ok, k);
    tx(g, 'escala ±' + fmt(esca) + ' µm', ox - R, oy + R + 13 * k, { px: 9 * k, c: cor.dim2 });
    const precessao = 'para a frente';
    tx(g, 'órbita filtrada 1× + 2×' + (temWhirl ? ' + 0,48×' : '') + ' · bruta ao fundo', 8 * k, 14 * k, { px: 10 * k, c: cor.dim });

    // ---- formas de onda (X e Y), na mesma janela
    const rx = 10 * k + S + 14 * k, rw = w - rx - 8 * k;
    const wy = 24 * k, wh = (h - wy - 12 * k) * 0.42;
    moldura(g, rx, wy, rw, wh);
    const yX = wy + wh * 0.27, yY = wy + wh * 0.73, au = (wh * 0.22) / esca;
    linha(g, bruta.map((p, i) => [rx + (i / (bruta.length - 1)) * rw, yX - p.X * au]), cor.ciano, 1.2);
    linha(g, bruta.map((p, i) => [rx + (i / (bruta.length - 1)) * rw, yY - p.Y * au]), cor.azul, 1.2);
    tx(g, 'X', rx + 4 * k, wy + 11 * k, { px: 9 * k, c: cor.ciano, peso: 600 });
    tx(g, 'Y', rx + 4 * k, yY - wh * 0.16, { px: 9 * k, c: cor.azul, peso: 600 });
    for (let m = Math.ceil(th0 / (2 * Math.PI)); m * 2 * Math.PI <= th1; m++) {
      const X = rx + ((m * 2 * Math.PI - th0) / span) * rw;
      g.strokeStyle = rgba(cor.branco, 0.7); g.lineWidth = 1;
      g.beginPath(); g.moveTo(X, wy + 1); g.lineTo(X, wy + wh - 1); g.stroke();
      g.fillStyle = cor.branco; g.beginPath(); g.arc(X, wy + 4 * k, 2.2 * k, 0, 2 * Math.PI); g.fill();
    }
    tx(g, 'forma de onda · ' + (temWhirl ? '2,1 rotações' : '1 rotação'), rx + rw, wy - 4 * k, { px: 9 * k, c: cor.dim2, a: 'right' });

    // ---- centro do eixo dentro da folga
    const sy = wy + wh + 16 * k, sh = h - sy - 8 * k;
    const Rs = Math.min(sh, rw * 0.62) / 2 - 2 * k;
    const cx = rx + Rs + 4 * k, cy = sy + sh / 2;
    const ps = Rs / (C.FOLGA_D / 2);
    g.fillStyle = 'rgba(4,9,14,0.55)';
    g.beginPath(); g.arc(cx, cy, Rs, 0, 2 * Math.PI); g.fill();
    g.strokeStyle = cor.dim; g.lineWidth = 1.2;
    g.beginPath(); g.arc(cx, cy, Rs, 0, 2 * Math.PI); g.stroke();
    g.strokeStyle = cor.eixo; g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(cx - Rs, cy); g.lineTo(cx + Rs, cy); g.moveTo(cx, cy - Rs); g.lineTo(cx, cy + Rs); g.stroke();
    g.setLineDash([]);
    linha(g, sim.scl.map((p) => [cx + p.x * ps, cy - p.y * ps]), rgba(cor.ciano, 0.55), 1.2);
    const c0 = sim.centro;
    const ccx = cx + c0.x * ps, ccy = cy - c0.y * ps;
    linha(g, filt.map((p) => [ccx + p.px * ps, ccy - p.py * ps]), cor.ambar, 1.1);
    g.fillStyle = cor.branco;
    g.beginPath(); g.arc(ccx, ccy, 2.2 * k, 0, 2 * Math.PI); g.fill();
    const tl = cx + Rs + 8 * k;
    tx(g, 'centro do eixo', tl, sy + 10 * k, { px: 9 * k, c: cor.dim });
    tx(g, 'folga 180 µm', tl, sy + 22 * k, { px: 9 * k, c: cor.dim2 });
    tx(g, 'ε ' + fmt(sim.eps, 2), tl, sy + 36 * k, { px: 10 * k, c: cor.texto });
    tx(g, 'gap X ' + fmt(sim.gap.X, 2) + ' V', tl, sy + 49 * k, { px: 9 * k, c: cor.dim });
    tx(g, 'gap Y ' + fmt(sim.gap.Y, 2) + ' V', tl, sy + 61 * k, { px: 9 * k, c: cor.dim });

    // ---- leituras
    const ly = oy + R + 26 * k;
    if (ly < h - 4) {
      tx(g, '1× bruto ' + fmt(sim.x1.bruta, 1) + ' · comp. ' + fmt(sim.x1.amp, 1) + ' µm pp', 8 * k, Math.min(ly, h - 18 * k), { px: 9.5 * k, c: cor.texto });
      tx(g, 'precessão: ' + precessao, 8 * k, Math.min(ly + 13 * k, h - 6 * k), { px: 9.5 * k, c: cor.ok });
    }
    mira(g, a, { x: ox - R, y: oy - R, w: 2 * R, h: 2 * R }, (mx_, my_) => {
      const px = (mx_ - ox) / pu, py = -(my_ - oy) / pu;
      return ['posição ' + fmt(px, 1) + ' · ' + fmt(py, 1) + ' µm', 'X ' + fmt((px + py) * U, 1) + ' · Y ' + fmt((py - px) * U, 1) + ' µm'];
    });
  }

  // ================= Q3 · Bode e polar (X·RAMPA) =================
  const REF = SV.bodeReferencia();
  const FAIXA = SV.faixaCritica();
  function q3(g, w, h, a) {
    base(g, w, h);
    const k = esc(w);
    const bl = 40 * k, br = w * 0.6, bt = 22 * k, bb = h - 22 * k;
    const hf = (bb - bt) * 0.44, ga = 10 * k;
    const yF0 = bt, yF1 = bt + hf, yA0 = yF1 + ga, yA1 = bb;
    const NM = 4000, AM = 35;
    const xn = (N) => bl + (N / NM) * (br - bl);
    const yf = (f) => yF0 + (-f / 360) * (yF1 - yF0);
    const ya = (v) => yA1 - (v / AM) * (yA1 - yA0);
    // faixa de meia potência e crítica
    g.fillStyle = rgba(cor.ambar, 0.08);
    g.fillRect(xn(FAIXA.n1), yF0, xn(FAIXA.n2) - xn(FAIXA.n1), yA1 - yF0);
    tx(g, 'meia potência · AF ' + fmt(C.NC / (FAIXA.n2 - FAIXA.n1), 1), xn(FAIXA.n1) + 3 * k, yA1 - 4 * k, { px: 8 * k, c: rgba(cor.ambar, 0.8) });
    moldura(g, bl, yF0, br - bl, yF1 - yF0);
    moldura(g, bl, yA0, br - bl, yA1 - yA0);
    g.strokeStyle = cor.eixo; g.lineWidth = 1;
    for (const f of [-90, -180, -270]) { g.setLineDash([2, 3]); g.beginPath(); g.moveTo(bl, yf(f)); g.lineTo(br, yf(f)); g.stroke(); g.setLineDash([]); }
    for (const f of [0, -180, -360]) tx(g, fmt(f) + '°', bl - 4 * k, yf(f) + 3 * k, { px: 8.5 * k, c: cor.dim, a: 'right' });
    for (const v of [0, 10, 20, 30]) tx(g, fmt(v), bl - 4 * k, ya(v) + 3 * k, { px: 8.5 * k, c: cor.dim, a: 'right' });
    for (const N of [1000, 2000, 3000, 4000]) {
      g.setLineDash([2, 3]); g.beginPath(); g.moveTo(xn(N), yF0); g.lineTo(xn(N), yA1); g.stroke(); g.setLineDash([]);
      tx(g, fmt(N / 1000, 0) + 'k', xn(N), bb + 11 * k, { px: 8.5 * k, c: cor.dim, a: 'center' });
    }
    tx(g, 'rpm', br, bb + 20 * k, { px: 8.5 * k, c: cor.dim2, a: 'right' });
    tx(g, 'fase', bl + 4 * k, yF0 + 11 * k, { px: 9 * k, c: cor.dim2 });
    tx(g, '1× comp. µm pp', bl + 4 * k, yA0 + 11 * k, { px: 9 * k, c: cor.dim2 });
    // linhas da crítica e da rotação de operação
    g.strokeStyle = rgba(cor.ambar, 0.8); g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(xn(C.NC), yF0); g.lineTo(xn(C.NC), yA1); g.stroke();
    g.strokeStyle = rgba(cor.dim, 0.6);
    g.beginPath(); g.moveTo(xn(C.N0), yF0); g.lineTo(xn(C.N0), yA1); g.stroke();
    g.setLineDash([]);
    // curva de referência (fundo)
    linha(g, REF.map((p) => [xn(p.N), yf(p.fase)]), rgba(cor.dim, 0.35), 1);
    linha(g, REF.map((p) => [xn(p.N), ya(p.amp)]), rgba(cor.dim, 0.35), 1);
    // dados ao vivo: partida em ciano, parada em âmbar
    const b = sim.bode;
    const cv = b.length && b[0].tipo === 'parada' ? cor.ambar : cor.ciano;
    linha(g, b.map((p) => [xn(p.N), yf(p.faseM)]), cv, 1.6);
    linha(g, b.map((p) => [xn(p.N), ya(p.ampM)]), cv, 1.6);
    // ponto atual
    const N = sim.N;
    if (N > 300) {
      g.fillStyle = cor.branco;
      g.beginPath(); g.arc(xn(N), ya(sim.x1.amp), 2.8 * k, 0, 2 * Math.PI); g.fill();
      g.beginPath(); g.arc(xn(N), yf(sim.x1.fase), 2.8 * k, 0, 2 * Math.PI); g.fill();
    }
    // rótulo da crítica
    const crit = sim.critica;
    const rot = crit ? 'CRÍTICA ' + fmt(crit.N) + ' rpm · Δφ na rampa ' + fmt(crit.dphi) + '°' : 'crítica de referência ' + fmt(C.NC) + ' rpm';
    tx(g, rot, xn(C.NC) - 4 * k, yA0 - 3 * k, { px: 9 * k, c: crit ? cor.ambar : cor.dim, a: 'right', peso: crit ? 600 : 400 });
    if (crit) {
      // estrela no pico
      estrela(g, xn(crit.N), ya(SV.rotor1x(crit.N).amp) - 1, 6 * k, cor.ambar);
    }
    tx(g, b.length ? (b[0].tipo === 'parada' ? 'parada (desaceleração)' : 'partida') + ' · ' + b.length + ' vetores' : 'referência · partida de 400 a 3.600 rpm', bl, 13 * k, { px: 9.5 * k, c: cor.dim });

    // ---- polar
    const px0 = br + 12 * k, pw = w - px0 - 8 * k;
    const Rp = Math.min(pw, bb - bt) / 2 - 10 * k;
    const cx = px0 + pw / 2, cy = bt + (bb - bt) / 2;
    const pr = Rp / 30;
    g.fillStyle = 'rgba(4,9,14,0.5)';
    g.beginPath(); g.arc(cx, cy, Rp, 0, 2 * Math.PI); g.fill();
    g.strokeStyle = cor.eixo; g.lineWidth = 1;
    for (const r of [10, 20, 30]) { g.setLineDash(r === 30 ? [] : [2, 3]); g.beginPath(); g.arc(cx, cy, r * pr, 0, 2 * Math.PI); g.stroke(); }
    g.setLineDash([]);
    for (let ang = 0; ang < 360; ang += 30) {
      const s = Math.sin(ang * D2R), c = Math.cos(ang * D2R);
      g.strokeStyle = rgba(cor.eixo, 0.6);
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + s * Rp, cy - c * Rp); g.stroke();
      if (ang % 90 === 0) tx(g, (ang ? fmt(-ang) : '0') + '°', cx + s * (Rp + 9 * k), cy - c * (Rp + 9 * k) + 3 * k, { px: 8.5 * k, c: cor.dim, a: 'center' });
    }
    const pol = (amp, fase) => { const lag = -fase * D2R; return [cx + Math.sin(lag) * amp * pr, cy - Math.cos(lag) * amp * pr]; };
    linha(g, REF.map((p) => pol(p.amp, p.fase)), rgba(cor.dim, 0.35), 1);
    linha(g, b.map((p) => pol(p.ampM, p.faseM)), cv, 1.6);
    if (crit) { const p = pol(SV.rotor1x(crit.N).amp, SV.rotor1x(crit.N).fase); estrela(g, p[0], p[1], 6 * k, cor.ambar); }
    if (N > 300) {
      const p = pol(sim.x1.amp, sim.x1.fase);
      g.strokeStyle = cor.branco; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(p[0], p[1]); g.stroke();
      seta(g, cx, cy, p[0], p[1], cor.branco, k * 0.8);
    }
    tx(g, 'polar · fase', cx, bt + 3 * k, { px: 9 * k, c: cor.dim2, a: 'center' });
    tx(g, '1× ' + fmt(sim.x1.amp, 1) + ' µm pp ∠ ' + fmt(sim.x1.fase) + '°', cx, bb + 11 * k, { px: 9 * k, c: cor.texto, a: 'center' });
    mira(g, a, { x: bl, y: yF0, w: br - bl, h: yA1 - yF0 }, (mx_) => {
      const Nm = ((mx_ - bl) / (br - bl)) * NM;
      if (Nm < 400) return ['N ' + fmt(Nm) + ' rpm', 'abaixo do giro lento'];
      const r = SV.rotor1x(Nm);
      return ['N ' + fmt(Nm) + ' rpm', '1× ' + fmt(r.amp, 1) + ' µm pp', 'fase ' + fmt(r.fase) + '°'];
    });
  }
  function estrela(g, x, y, r, c) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r, an = -Math.PI / 2 + (i * Math.PI) / 5;
      const X = x + rr * Math.cos(an), Y = y + rr * Math.sin(an);
      if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
    }
    g.closePath();
    g.fillStyle = c;
    g.fill();
  }

  // ================= Q4 · votação API 670 2oo3 (X·670, só leitura) =================
  function q4(g, w, h, a) {
    base(g, w, h);
    const k = esc(w);
    tx(g, 'VT-301A/B/C mm/s pk · 2oo3 · retardo 2 s', 8 * k, 14 * k, { px: 9.5 * k, c: cor.dim });
    tx(g, 'auditoria · só leitura', w - 8 * k, 14 * k, { px: 9.5 * k, c: cor.dim2, a: 'right' });
    const t = sim.t;
    // ---- barras
    const bt = 34 * k, bb = h - 100 * k;
    const ybar = (v) => bb - (Math.min(v, C.VT_FUNDO) / C.VT_FUNDO) * (bb - bt);
    const bw = 20 * k, xs = [26 * k, 64 * k, 102 * k];
    sim.vt.forEach((c, i) => {
      const x = xs[i];
      const e = estadoVT(c);
      g.fillStyle = 'rgba(4,9,14,0.6)';
      g.fillRect(x, bt, bw, bb - bt);
      g.strokeStyle = cor.eixo; g.strokeRect(x + 0.5, bt + 0.5, bw - 1, bb - bt - 1);
      const v = c.v;
      const yv = ybar(v);
      if (e === 'notok') {
        g.save(); g.beginPath(); g.rect(x, yv, bw, bb - yv); g.clip();
        g.fillStyle = rgba(cor.notok, 0.25); g.fillRect(x, yv, bw, bb - yv);
        g.strokeStyle = rgba(cor.notok, 0.8); g.lineWidth = 1.5;
        for (let yy = yv - bw; yy < bb + bw; yy += 6 * k) { g.beginPath(); g.moveTo(x, yy + bw); g.lineTo(x + bw, yy); g.stroke(); }
        g.restore();
      } else {
        g.fillStyle = corEstado(e);
        g.fillRect(x + 2 * k, yv, bw - 4 * k, bb - yv);
      }
      // LED e textos
      led(g, x + bw / 2, bt - 8 * k, 4 * k, corEstado(e));
      tx(g, c.id, x + bw / 2, bb + 12 * k, { px: 10 * k, c: cor.texto, a: 'center', peso: 600 });
      tx(g, c.notok ? 'NOT-OK' : fmt(v, 2), x + bw / 2, bb + 24 * k, { px: 9 * k, c: corEstado(e), a: 'center' });
      // retardo de 2 s: anel que se completa
      if (c.acima && !c.notok) {
        const p = c.conf || sim.trip ? 1 : lim((t - c.tAcima) / C.RETARDO, 0, 1);
        g.strokeStyle = rgba(cor.trip, 0.3); g.lineWidth = 2.4 * k;
        g.beginPath(); g.arc(x + bw / 2, bb + 36 * k, 5.5 * k, 0, 2 * Math.PI); g.stroke();
        g.strokeStyle = cor.trip;
        g.beginPath(); g.arc(x + bw / 2, bb + 36 * k, 5.5 * k, -Math.PI / 2, -Math.PI / 2 + p * 2 * Math.PI); g.stroke();
      }
    });
    // linhas de ALERTA e PERIGO
    for (const [v, c, nome] of [[C.VT_AL, cor.alerta, 'ALERTA 7,9'], [C.VT_PE, cor.trip, 'PERIGO 12,4']]) {
      g.strokeStyle = c; g.lineWidth = 1.2; g.setLineDash(v === C.VT_AL ? [4, 3] : []);
      g.beginPath(); g.moveTo(xs[0] - 6 * k, ybar(v)); g.lineTo(xs[2] + bw + 6 * k, ybar(v)); g.stroke();
      g.setLineDash([]);
      tx(g, nome, xs[0] - 7 * k, ybar(v) - 3 * k, { px: 8 * k, c, a: 'left' });
    }

    // ---- lógica 2oo3: A·B, A·C, B·C → OU → TRIP
    const lx = 142 * k, gx = lx + 80 * k, ox_ = gx + 60 * k, sx = ox_ + 42 * k;
    const yIn = [bt + 18 * k, bt + (bb - bt) / 2, bb - 18 * k];
    const yG = [bt + 10 * k, bt + (bb - bt) / 2, bb - 10 * k];
    const P = sim.portas;
    const vt = sim.vt;
    const corV = (on) => (on ? cor.trip : rgba(cor.dim, 0.45));
    // entradas
    vt.forEach((c, i) => {
      const on = c.conf;
      const e = c.notok ? cor.notok : on ? cor.trip : c.acima ? cor.alerta : rgba(cor.dim, 0.7);
      g.strokeStyle = e; g.lineWidth = 1.2;
      g.strokeRect(lx + 0.5, yIn[i] - 9 * k, 56 * k, 18 * k);
      tx(g, c.notok ? c.id + ' vetado' : c.id + (on ? ' ✓' : c.acima ? ' retardo' : ''), lx + 28 * k, yIn[i] + 3.5 * k, { px: 8.6 * k, c: e, a: 'center', peso: 600 });
    });
    const liga = (i, j, on) => {
      g.strokeStyle = corV(on); g.lineWidth = on ? 1.8 : 1;
      g.beginPath(); g.moveTo(lx + 56 * k, yIn[i]); g.bezierCurveTo(lx + 68 * k, yIn[i], gx - 12 * k, yG[j], gx, yG[j]); g.stroke();
    };
    liga(0, 0, vt[0].conf); liga(1, 0, vt[1].conf);
    liga(0, 1, vt[0].conf); liga(2, 1, vt[2].conf);
    liga(1, 2, vt[1].conf); liga(2, 2, vt[2].conf);
    const portas = [['A·B', P.AB], ['A·C', P.AC], ['B·C', P.BC]];
    portas.forEach(([nome, on], j) => {
      porta(g, gx, yG[j], 28 * k, 20 * k, on, 'E', k);
      tx(g, nome, gx + 12 * k, yG[j] - 12 * k, { px: 8 * k, c: on ? cor.trip : cor.dim, a: 'center' });
      g.strokeStyle = corV(on); g.lineWidth = on ? 1.8 : 1;
      g.beginPath(); g.moveTo(gx + 28 * k, yG[j]); g.bezierCurveTo(gx + 44 * k, yG[j], ox_ - 16 * k, yG[1], ox_, yG[1] + (j - 1) * 5 * k); g.stroke();
    });
    const trip = sim.trip;
    porta(g, ox_, yG[1], 28 * k, 24 * k, trip, 'OU', k);
    g.strokeStyle = corV(trip); g.lineWidth = trip ? 2 : 1;
    g.beginPath(); g.moveTo(ox_ + 28 * k, yG[1]); g.lineTo(sx, yG[1]); g.stroke();
    g.fillStyle = trip ? cor.trip : 'rgba(4,9,14,0.7)';
    g.fillRect(sx, yG[1] - 11 * k, 40 * k, 22 * k);
    g.strokeStyle = trip ? cor.trip : cor.eixo; g.strokeRect(sx + 0.5, yG[1] - 11 * k + 0.5, 40 * k - 1, 22 * k - 1);
    tx(g, 'TRIP', sx + 20 * k, yG[1] + 4 * k, { px: 10 * k, c: trip ? '#fff' : cor.dim, a: 'center', peso: 700 });
    tx(g, 'pela proteção', sx + 20 * k, yG[1] + 22 * k, { px: 7.5 * k, c: cor.dim2, a: 'center' });

    // ---- gap das sondas de proximidade XT-301X/Y
    const gx0 = w - 64 * k, gw = 14 * k;
    const yg = (v) => bt + ((-v) / 20) * (bb - bt);
    tx(g, 'gap XT', gx0 + 20 * k, bt - 5 * k, { px: 8 * k, c: cor.dim2, a: 'center' });
    [['X', sim.gap.X], ['Y', sim.gap.Y]].forEach(([nome, v], i) => {
      const x = gx0 + i * 26 * k;
      g.fillStyle = rgba(cor.trip, 0.18); g.fillRect(x, bt, gw, bb - bt);
      g.fillStyle = rgba(cor.ok, 0.16); g.fillRect(x, yg(C.GAP_MAX), gw, yg(C.GAP_MIN) - yg(C.GAP_MAX));
      g.strokeStyle = cor.eixo; g.strokeRect(x + 0.5, bt + 0.5, gw - 1, bb - bt - 1);
      const fora = v < C.GAP_MIN || v > C.GAP_MAX;
      g.fillStyle = fora ? cor.notok : cor.ok;
      g.fillRect(x - 3 * k, yg(v) - 1.5 * k, gw + 6 * k, 3 * k);
      tx(g, nome, x + gw / 2, bb + 12 * k, { px: 10 * k, c: cor.texto, a: 'center', peso: 600 });
      tx(g, fmt(v, 1), x + gw / 2, bb + 24 * k, { px: 8.5 * k, c: fora ? cor.notok : cor.dim, a: 'center' });
    });
    tx(g, '−2', gx0 - 3 * k, yg(C.GAP_MAX) + 3 * k, { px: 7.5 * k, c: cor.dim2, a: 'right' });
    tx(g, '−18', gx0 - 3 * k, yg(C.GAP_MIN) + 3 * k, { px: 7.5 * k, c: cor.dim2, a: 'right' });
    tx(g, 'Vcc', gx0 + 22 * k, bb + 36 * k, { px: 7.5 * k, c: cor.dim2, a: 'center' });

    // ---- first-out e sequência de eventos
    const fy = h - 50 * k;
    g.strokeStyle = cor.eixo; g.beginPath(); g.moveTo(6 * k, fy - 12 * k); g.lineTo(w - 6 * k, fy - 12 * k); g.stroke();
    const fo = sim.fo;
    const tFO = sim.tFO;
    const dms = fo ? ((sim.trip ? sim.tTrip : t) - tFO) * 1000 : 0;
    tx(g, 'FIRST-OUT', 8 * k, fy + 2 * k, { px: 8.5 * k, c: cor.dim2 });
    tx(g, fo ? 'VT-301' + fo : '—', 8 * k, fy + 16 * k, { px: 11 * k, c: fo ? cor.trip : cor.dim, peso: 700 });
    tx(g, 't = ' + fmt(fo ? dms : 0, 1) + ' ms', 8 * k, fy + 30 * k, { px: 10 * k, c: fo ? cor.texto : cor.dim });
    const soe = sim.ev.filter((e) => e.tag && e.txt.indexOf('confirmado') < 0).slice(-4);
    const sx0 = 112 * k;
    tx(g, 'sequência de eventos (T0 = first-out)', sx0, fy + 2 * k, { px: 8.5 * k, c: cor.dim2 });
    soe.forEach((e, i) => {
      const rel = tFO !== null ? (e.t - tFO) * 1000 : null;
      const tt = rel === null ? 't ' + fmt(e.t, 1) + ' s' : (rel >= 0 ? '+' : '') + fmt(rel) + ' ms';
      const c = e.tipo === 'notok' ? cor.notok : e.tipo === 'trip' ? cor.trip : cor.dim;
      if (fy + 4 * k + (i + 1) * 9.6 * k > h - 2) return;
      tx(g, tt.padStart(10, ' ') + '  ' + e.txt, sx0, fy + 4 * k + (i + 1) * 9.6 * k, { px: 8.2 * k, c });
    });
  }
  function led(g, x, y, r, c) {
    g.fillStyle = c;
    g.shadowColor = c; g.shadowBlur = 6;
    g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill();
    g.shadowBlur = 0;
  }
  function porta(g, x, y, w, h, on, tipo, k) {
    g.beginPath();
    if (tipo === 'E') {
      g.moveTo(x, y - h / 2); g.lineTo(x + w / 2, y - h / 2);
      g.arc(x + w / 2, y, h / 2, -Math.PI / 2, Math.PI / 2);
      g.lineTo(x, y + h / 2); g.closePath();
    } else {
      g.moveTo(x, y - h / 2);
      g.quadraticCurveTo(x + w * 0.7, y - h / 2, x + w, y);
      g.quadraticCurveTo(x + w * 0.7, y + h / 2, x, y + h / 2);
      g.quadraticCurveTo(x + w * 0.3, y, x, y - h / 2);
    }
    g.fillStyle = on ? rgba(cor.trip, 0.85) : 'rgba(4,9,14,0.7)';
    g.fill();
    g.strokeStyle = on ? cor.trip : cor.dim;
    g.lineWidth = 1.2;
    g.stroke();
    tx(g, tipo === 'E' ? '&' : '≥1', x + w * 0.45, y + 3.5 * k, { px: 8.5 * k, c: on ? '#fff' : cor.dim, a: 'center', peso: 600 });
  }

  // ================= Q5 · mapa do compressor (X·THERMO) =================
  let ilhas = null;
  function q5(g, w, h, a) {
    base(g, w, h);
    const k = esc(w);
    const l = 42 * k, r = w - 10 * k, t = 22 * k, b = h - 26 * k;
    const QM = 7500, HM = 260;
    const xq = (q) => l + (q / QM) * (r - l);
    const yh = (v) => b - (v / HM) * (b - t);
    // ilhas de eficiência em degradê (cacheadas por tamanho)
    const chave = Math.round(r - l) + 'x' + Math.round(b - t);
    if (!ilhas || ilhas.chave !== chave) ilhas = fazerIlhas(Math.round(r - l), Math.round(b - t), QM, HM, chave);
    g.drawImage(ilhas.cv, l, t, r - l, b - t);
    moldura(g, l, t, r - l, b - t);
    // eixos
    for (const q of [1500, 3000, 4500, 6000, 7500]) { tx(g, fmt(q), xq(q), b + 11 * k, { px: 8.5 * k, c: cor.dim, a: 'center' }); }
    for (const v of [50, 100, 150, 200, 250]) tx(g, fmt(v), l - 4 * k, yh(v) + 3 * k, { px: 8.5 * k, c: cor.dim, a: 'right' });
    tx(g, 'Q m³/h', r, b + 21 * k, { px: 8.5 * k, c: cor.dim2, a: 'right' });
    tx(g, 'Hp kJ/kg', 4 * k, t - 6 * k, { px: 8.5 * k, c: cor.dim2 });
    // linhas de rotação
    for (const s of [0.8, 0.9, 1.0, 1.05]) {
      const pts = [];
      for (let qn = C.QS100; qn <= C.QCHOKE; qn += 60) pts.push([xq(qn * s), yh(SV.Hmapa(qn * s, s))]);
      linha(g, pts, s === 1 ? rgba(cor.texto, 0.85) : rgba(cor.texto, 0.45), s === 1 ? 1.4 : 1);
      const u = pts[pts.length - 1];
      tx(g, fmt(s * 100) + ' %', u[0] + 2 * k, u[1] + 3 * k, { px: 8 * k, c: cor.dim });
    }
    // linha de surge, de controle (10 %) e de 20 %
    const lin = (f) => { const p = []; for (let s = 0.74; s <= 1.09; s += 0.01) { const q = (C.QS100 * s) / (1 - f); p.push([xq(q), yh(SV.Hmapa(q, s))]); } return p; };
    linha(g, lin(0), cor.trip, 1.8, [6, 4]);
    linha(g, lin(0.1), cor.ambar, 1.3, [4, 4]);
    linha(g, lin(0.2), rgba(cor.ambar, 0.4), 1, [1, 3]);
    const ps = lin(0)[lin(0).length - 1];
    tx(g, 'SURGE', ps[0] - 4 * k, ps[1] - 4 * k, { px: 8.5 * k, c: cor.trip, a: 'right', peso: 700 });
    const pc = lin(0.1)[lin(0.1).length - 1];
    tx(g, 'controle 10 %', pc[0] + 4 * k, pc[1] - 4 * k, { px: 8 * k, c: cor.ambar });
    // ponto de operação, rastro e vetor da margem
    const s = sim.s;
    const p = sim.ponto;
    if (sim.N > 20) {
      if (sim.trilha.length > 1) linha(g, sim.trilha.map((q) => [xq(Math.max(q.Q, 0)), yh(q.H)]), rgba(cor.trip, 0.6), 1.2);
      if (sim.margem !== null && !sim.surge && sim.margem > 0.5) {
        const pts = [];
        for (let i = 0; i <= 20; i++) { const q = p.Q + ((sim.Qsurge - p.Q) * i) / 20; pts.push([xq(q), yh(SV.Hmapa(q, s))]); }
        linha(g, pts, cor.ambar, 1.6);
        const u = pts[pts.length - 1], v = pts[pts.length - 3];
        seta(g, v[0], v[1], u[0], u[1], cor.ambar, k);
        tx(g, 'margem ' + fmt(sim.margem, 1) + ' %', (pts[0][0] + u[0]) / 2, Math.min(pts[0][1], u[1]) - 7 * k, { px: 9.5 * k, c: cor.ambar, a: 'center', peso: 600 });
      }
      const X = xq(Math.max(p.Q, 0)), Y = yh(p.H);
      g.fillStyle = sim.surge ? cor.trip : cor.branco;
      g.shadowColor = g.fillStyle; g.shadowBlur = 10;
      g.beginPath(); g.arc(X, Y, 4 * k, 0, 2 * Math.PI); g.fill();
      g.shadowBlur = 0;
      if (p.Q < 0) tx(g, '← fluxo reverso', l + 8 * k, Y - 7 * k, { px: 8.5 * k, c: cor.trip });
      if (sim.foraMapa) tx(g, 'abaixo de 80 %: fora do mapa · sem número', X + 8 * k, Y - 6 * k, { px: 8.5 * k, c: cor.dim });
    }
    // leituras
    const lx = r - 6 * k;
    const ly = t + 12 * k;
    const marg = sim.surge ? 'em surge' : sim.margem === null ? (sim.foraMapa ? 'fora do mapa' : '—') : fmt(sim.margem, 1) + ' %';
    const linhas = [
      ['ηp', sim.eta === null ? '—' : fmt(sim.eta, 1) + ' %'],
      ['Hp', sim.N > 20 && !(sim.cen === 4 && sim.trip) ? fmt(sim.H, 0) + ' kJ/kg' : '—'],
      ['Q', fmt(sim.Q, 0) + ' m³/h'],
      ['margem', marg],
      ['N', fmt(sim.N) + ' rpm']
    ];
    linhas.forEach(([n, v], i) => {
      tx(g, n, lx - 112 * k, ly + i * 12.5 * k, { px: 9 * k, c: cor.dim });
      tx(g, v, lx, ly + i * 12.5 * k, { px: 9.5 * k, c: n === 'margem' ? corEstado(estadoMargem()) : cor.texto, a: 'right', peso: n === 'margem' ? 600 : 400 });
    });
    // mostrador da perda (kW e R$/h)
    const gcx = l + 50 * k, gcy = t + 50 * k, gr = 34 * k;
    const vmax = 150;
    g.lineWidth = 6 * k;
    for (const [v0, v1, c] of [[0, 30, cor.ok], [30, 90, cor.alerta], [90, 150, cor.trip]]) {
      g.strokeStyle = rgba(c, 0.55);
      g.beginPath(); g.arc(gcx, gcy, gr, Math.PI + (v0 / vmax) * Math.PI, Math.PI + (v1 / vmax) * Math.PI); g.stroke();
    }
    const pv = sim.perda === null ? 0 : lim(sim.perda, 0, vmax);
    const an = Math.PI + (pv / vmax) * Math.PI;
    g.strokeStyle = cor.branco; g.lineWidth = 1.8 * k;
    g.beginPath(); g.moveTo(gcx, gcy); g.lineTo(gcx + Math.cos(an) * (gr - 2 * k), gcy + Math.sin(an) * (gr - 2 * k)); g.stroke();
    g.fillStyle = cor.branco; g.beginPath(); g.arc(gcx, gcy, 2.5 * k, 0, 2 * Math.PI); g.fill();
    tx(g, 'perda (Δη × tarifa)', gcx, gcy - gr - 7 * k, { px: 8 * k, c: cor.dim2, a: 'center' });
    tx(g, sim.perda === null ? '— kW' : fmt(sim.perda, 0) + ' kW', gcx, gcy + 13 * k, { px: 10.5 * k, c: cor.texto, a: 'center', peso: 600 });
    tx(g, sim.perdaR === null ? 'R$ —/h' : 'R$ ' + fmt(sim.perdaR, 2) + '/h', gcx, gcy + 26 * k, { px: 10 * k, c: sim.perda > 30 ? cor.alerta : cor.dim, a: 'center' });
    mira(g, a, { x: l, y: t, w: r - l, h: b - t }, (mx_, my_) => {
      const q = ((mx_ - l) / (r - l)) * QM, hh = ((b - my_) / (b - t)) * HM;
      const e = SV.etaEm(q, hh);
      return ['Q ' + fmt(q) + ' m³/h · Hp ' + fmt(hh) + ' kJ/kg', e === null ? 'fora do mapa' : 'ηp ' + fmt(e, 1) + ' %'];
    });
  }
  function fazerIlhas(W, H, QM, HM, chave) {
    const cv = document.createElement('canvas');
    const n = 3; // resolução do degradê: 1 célula a cada 3 px
    const cw = Math.max(1, Math.ceil(W / n)), ch = Math.max(1, Math.ceil(H / n));
    cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d');
    const img = g.createImageData(cw, ch);
    const c1 = [37, 99, 235], c2 = [34, 211, 238], c3 = [251, 191, 36];
    for (let j = 0; j < ch; j++) {
      const hh = HM * (1 - (j + 0.5) / ch);
      for (let i = 0; i < cw; i++) {
        const q = (QM * (i + 0.5)) / cw;
        const e = SV.etaEm(q, hh);
        const o = (j * cw + i) * 4;
        if (e === null) { img.data[o + 3] = 0; continue; }
        const u = lim((e - 66) / (C.ETA_MAX - 66), 0, 1);
        const c = u < 0.6 ? mistura(c1, c2, u / 0.6) : mistura(c2, c3, (u - 0.6) / 0.4);
        // faixas discretas leves (curvas de nível)
        const banda = Math.abs(((e * 2) % 2) - 1) < 0.08 ? 1.6 : 1;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2];
        img.data[o + 3] = Math.round(lim((0.16 + 0.32 * u) * banda, 0, 0.75) * 255);
      }
    }
    g.putImageData(img, 0, 0);
    return { cv, chave };
  }
  function mistura(a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }

  // ================= Q6 · vibração × processo no mesmo segundo (X·U) =================
  const HIP = {
    surge: 'hipótese: vibração radial/subsíncrona a favor da aproximação da linha de surge — validar com posição do reciclo/IGV (nunca veredito)',
    aero: 'hipótese: degradação aerodinâmica/desgaste interno — validar com clearances e condição do difusor'
  };
  function q6(g, w, h, a) {
    base(g, w, h);
    const k = esc(w);
    // carimbos: calculados primeiro, para reservar a altura
    g.font = F(9 * k);
    const larg = w - 28 * k;
    const lista = sim.hip.lista;
    const carimbos = lista.length ? lista.map((n) => quebraTexto(g, HIP[n], larg)) : [];
    const altCar = lista.length ? carimbos.reduce((s, c) => s + c.length * 11 * k + 9 * k, 0) : 22 * k;
    const l = 36 * k, r = w - 40 * k, t = 22 * k, b = h - altCar - 34 * k;
    const T1 = sim.T, T0 = T1 - 60;
    const xt_ = (T) => l + ((T - T0) / 60) * (r - l);
    const XM = niceMax(Math.max(80, ...sim.amostras.map((s) => s.xt)) * 1.1, [80, 100, 120]);
    const QM = 6000;
    const yx = (v) => b - (v / XM) * (b - t);
    const yq = (v) => b - (lim(v, 0, QM) / QM) * (b - t);
    moldura(g, l, t, r - l, b - t);
    g.strokeStyle = cor.eixo;
    for (const s of [-45, -30, -15]) { const X = xt_(T1 + s); g.setLineDash([2, 3]); g.beginPath(); g.moveTo(X, t); g.lineTo(X, b); g.stroke(); g.setLineDash([]); tx(g, s + ' s', X, b + 11 * k, { px: 8.5 * k, c: cor.dim, a: 'center' }); }
    tx(g, 'agora', r, b + 11 * k, { px: 8.5 * k, c: cor.dim, a: 'right' });
    // ALERTA de XT
    g.strokeStyle = rgba(cor.alerta, 0.6); g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(l, yx(C.XT_AL)); g.lineTo(r, yx(C.XT_AL)); g.stroke(); g.setLineDash([]);
    for (const v of [0, XM / 2, XM]) tx(g, fmt(v), l - 4 * k, yx(v) + 3 * k, { px: 8.5 * k, c: cor.ciano, a: 'right' });
    for (const v of [0, 3000, 6000]) tx(g, fmt(v / 1000) + 'k', r + 4 * k, yq(v) + 3 * k, { px: 8.5 * k, c: cor.ambar });
    tx(g, 'XT-301X µm pp', l, t - 6 * k, { px: 9 * k, c: cor.ciano });
    tx(g, 'FT-201 m³/h', r, t - 6 * k, { px: 9 * k, c: cor.ambar, a: 'right' });
    // início do cenário e eventos
    const xIni = xt_(sim.T0);
    if (xIni > l) { g.strokeStyle = rgba(cor.branco, 0.5); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(xIni, t); g.lineTo(xIni, b); g.stroke(); g.setLineDash([]); tx(g, 'cenário 0' + sim.cen, xIni + 3 * k, t + 10 * k, { px: 8 * k, c: cor.dim }); }
    for (const e of sim.ev) {
      if (e.tag !== 'TRIP' && !e.fo) continue;
      const X = xt_(sim.T0 + e.t);
      if (X < l) continue;
      g.strokeStyle = cor.trip; g.beginPath(); g.moveTo(X, t); g.lineTo(X, b); g.stroke();
      tx(g, e.tag === 'TRIP' ? 'TRIP' : 'FO', X + 2 * k, b - 4 * k, { px: 8 * k, c: cor.trip, peso: 600 });
    }
    // séries
    const am = sim.amostras.filter((s) => s.T >= T0);
    g.save(); g.beginPath(); g.rect(l, t, r - l, b - t); g.clip();
    linha(g, am.map((s) => [xt_(s.T), yq(s.q)]), cor.ambar, 1.3);
    linha(g, am.map((s) => [xt_(s.T), yx(s.xt)]), cor.ciano, 1.6);
    g.restore();
    // r de Pearson e carimbos
    const hp = sim.hip;
    const rtxt = (v) => (v === null ? '—' : fmt(v, 2));
    const yr = b + 24 * k;
    tx(g, 'r(XT, margem) ' + rtxt(hp.rSM) + ' · r(XT, ηp) ' + rtxt(hp.rEta) + ' · janela 30 s · regra r ≤ −0,8', 8 * k, yr, { px: 9 * k, c: cor.dim });
    let yc = yr + 8 * k;
    if (!lista.length) {
      const motivo = hp.n < 40 ? 'janela em formação (' + Math.round(hp.n / 4) + ' de 10 s)' : hp.rSM === null && hp.rEta === null ? 'margem e ηp fora do mapa em parte da janela' : 'r acima de −0,8';
      g.strokeStyle = rgba(cor.ok, 0.7); g.lineWidth = 1;
      g.strokeRect(8 * k + 0.5, yc + 0.5, w - 16 * k - 1, 18 * k);
      tx(g, 'SEM HIPÓTESE CRUZADA · ' + motivo, 14 * k, yc + 12.5 * k, { px: 9 * k, c: cor.ok, peso: 600 });
    } else {
      carimbos.forEach((ls, i) => {
        const ch = ls.length * 11 * k + 6 * k;
        const fraca = i > 0;
        g.fillStyle = rgba(cor.alerta, fraca ? 0.04 : 0.08); g.fillRect(8 * k, yc, w - 16 * k, ch);
        g.strokeStyle = fraca ? rgba(cor.alerta, 0.55) : cor.alerta; g.lineWidth = 1.2; g.setLineDash(fraca ? [4, 3] : []); g.strokeRect(8 * k + 0.5, yc + 0.5, w - 16 * k - 1, ch - 1); g.setLineDash([]);
        ls.forEach((s, j) => tx(g, s, 14 * k, yc + 11 * k + j * 11 * k, { px: 9 * k, c: j === 0 ? (fraca ? rgba(cor.alerta, 0.8) : cor.alerta) : fraca ? cor.dim : cor.texto, peso: j === 0 ? 600 : 400 }));
        yc += ch + 3 * k;
      });
      if (hp.congelado) tx(g, 'janela congelada no trip', r - 4 * k, t + 11 * k, { px: 8.5 * k, c: cor.dim, a: 'right' });
    }
    mira(g, a, { x: l, y: t, w: r - l, h: b - t }, (mx_) => {
      const T = T0 + ((mx_ - l) / (r - l)) * 60;
      let best = null;
      for (const s of am) if (!best || Math.abs(s.T - T) < Math.abs(best.T - T)) best = s;
      if (!best) return null;
      return [fmt(best.T - T1, 1) + ' s', 'XT-301X ' + fmt(best.xt, 1) + ' µm pp', 'FT-201 ' + fmt(best.q) + ' m³/h'];
    });
  }

  const TELAS = { q1, q2, q3, q4, q5, q6 };

  // ================= sinótico do trem (SVG) =================
  const sin = { textos: {}, leds: {}, ok: false };
  function el(tag, at, pai) {
    const e = document.createElementNS(NS, tag);
    for (const kk in at) e.setAttribute(kk, at[kk]);
    if (pai) pai.appendChild(e);
    return e;
  }
  function engrenagem(cx, cy, r, z, ht) {
    let d = '';
    for (let i = 0; i < z; i++) {
      const a0 = (i / z) * 2 * Math.PI, p = (2 * Math.PI) / z;
      const pts = [[a0, r - ht], [a0 + p * 0.18, r + ht], [a0 + p * 0.48, r + ht], [a0 + p * 0.66, r - ht]];
      pts.forEach(([an, rr], j) => { d += (i === 0 && j === 0 ? 'M' : 'L') + (cx + rr * Math.cos(an)).toFixed(2) + ',' + (cy + rr * Math.sin(an)).toFixed(2); });
    }
    return d + 'Z';
  }
  function montarSinotico(alvo) {
    const YT = 202, YC = 262; // eixo da turbina e do compressor
    const s = el('svg', { viewBox: '0 0 1200 440', class: 'sv-svg', 'aria-hidden': 'true', focusable: 'false' }, alvo);
    const G = (cl) => el('g', cl ? { class: cl } : {}, s);

    // base (skid)
    el('rect', { x: 30, y: 352, width: 1030, height: 10, rx: 2, class: 'sv-skid' }, s);

    // ---- tubulação de processo (sucção, descarga e reciclo)
    const tub = G('sv-tubos');
    const SUC = 'M240,96 H540 V176', DESC = 'M930,176 V96 H1190', REC = 'M1150,96 V26 H255 V96';
    for (const d of [SUC, DESC, REC]) el('path', { d, class: 'sv-tubo' }, tub);
    const fluxo = G('sv-fluxos');
    sin.fluxoSuc = el('path', { d: SUC, class: 'sv-fluxo' }, fluxo);
    sin.fluxoDesc = el('path', { d: DESC, class: 'sv-fluxo' }, fluxo);
    sin.fluxoRec = el('path', { d: REC, class: 'sv-fluxo sv-fluxo-rec' }, fluxo);
    el('text', { x: 240, y: 122, class: 'sv-rot' }, s).textContent = 'SUCÇÃO';
    el('text', { x: 1190, y: 122, class: 'sv-rot', 'text-anchor': 'end' }, s).textContent = 'DESCARGA';
    el('text', { x: 700, y: 14, class: 'sv-rot', 'text-anchor': 'end' }, s).textContent = 'RECICLO ANTI-SURGE';
    // válvula anti-surge FV-201 no reciclo
    const fv = G('sv-fv');
    el('path', { d: 'M762,16 L762,36 L798,16 L798,36 Z', class: 'sv-valvula' }, fv);
    el('path', { d: 'M780,26 V10', class: 'sv-haste' }, fv);
    el('rect', { x: 768, y: 2, width: 24, height: 8, rx: 2, class: 'sv-atuador' }, fv);
    sin.ledFV = el('circle', { cx: 810, cy: 44, r: 4.5, class: 'sv-led', 'data-e': 'ok' }, fv);
    el('text', { x: 818, y: 48, class: 'sv-tag' }, fv).textContent = 'FV-201';
    sin.textos.fv = el('text', { x: 762, y: 62, class: 'sv-val sv-val-p' }, fv);

    // ---- turbina (corte)
    const tur = G('sv-turbina');
    el('path', { d: 'M40,152 L235,122 L235,282 L40,252 Z', class: 'sv-carcaca' }, tur);
    el('rect', { x: 52, y: YT - 15, width: 172, height: 30, rx: 4, class: 'sv-tambor' }, tur);
    for (let i = 0; i < 7; i++) {
      const x = 64 + i * 24, hb = 14 + i * 5.2;
      el('rect', { x: x - 2.5, y: YT - 15 - hb, width: 5, height: hb, class: 'sv-palheta' }, tur);
      el('rect', { x: x - 2.5, y: YT + 15, width: 5, height: hb, class: 'sv-palheta' }, tur);
      const xs = x + 12, topo = 152 - ((xs - 40) / 195) * 30, fundo = 252 + ((xs - 40) / 195) * 30;
      el('path', { d: 'M' + xs + ',' + (topo + 1) + ' V' + (YT - 17) + ' M' + xs + ',' + (fundo - 1) + ' V' + (YT + 17), class: 'sv-bocal' }, tur);
    }
    el('rect', { x: 28, y: YT - 6, width: 228, height: 12, class: 'sv-eixo' }, tur);
    el('path', { d: 'M74,148 V62 H30', class: 'sv-tubo sv-tubo-vapor' }, tur);
    el('path', { d: 'M205,126 V70', class: 'sv-tubo sv-tubo-vapor' }, tur);
    el('text', { x: 30, y: 52, class: 'sv-rot' }, s).textContent = 'VAPOR';
    el('text', { x: 205, y: 62, class: 'sv-rot', 'text-anchor': 'middle' }, s).textContent = 'ESCAPE';
    el('text', { x: 138, y: 312, class: 'sv-nome', 'text-anchor': 'middle' }, s).textContent = 'TURBINA';
    sin.textos.nt = el('text', { x: 138, y: 327, class: 'sv-val', 'text-anchor': 'middle' }, s);

    // ---- acoplamento 1
    const ac1 = G('sv-acopl');
    el('rect', { x: 252, y: YT - 13, width: 8, height: 26, rx: 2, class: 'sv-cubo' }, ac1);
    el('rect', { x: 260, y: YT - 5, width: 14, height: 10, class: 'sv-eixo' }, ac1);
    el('rect', { x: 274, y: YT - 13, width: 8, height: 26, rx: 2, class: 'sv-cubo' }, ac1);

    // ---- redutora: pinhão 41 / coroa 83, cada um na sua rotação
    const red = G('sv-redutora');
    el('rect', { x: 284, y: 150, width: 108, height: 168, rx: 8, class: 'sv-carcaca' }, red);
    const rp = (60 * 41) / 124, rg = (60 * 83) / 124;
    sin.pinhao = el('path', { d: engrenagem(338, YT, rp, 41, 1.6), class: 'sv-engr sv-engr-p' }, red);
    sin.coroa = el('path', { d: engrenagem(338, YC, rg, 83, 1.6), class: 'sv-engr' }, red);
    el('circle', { cx: 338, cy: YT, r: 5, class: 'sv-cubo' }, red);
    el('circle', { cx: 338, cy: YC, r: 8, class: 'sv-cubo' }, red);
    sin.marcaP = el('line', { x1: 338, y1: YT, x2: 338 + rp - 4, y2: YT, class: 'sv-marca' }, red);
    sin.marcaG = el('line', { x1: 338, y1: YC, x2: 338 + rg - 5, y2: YC, class: 'sv-marca' }, red);
    el('text', { x: 338, y: 334, class: 'sv-nome', 'text-anchor': 'middle' }, s).textContent = 'REDUTORA 41/83';
    sin.textos.gmf = el('text', { x: 338, y: 347, class: 'sv-val', 'text-anchor': 'middle' }, s);

    // ---- acoplamento 2 e eixo do compressor
    const ac2 = G('sv-acopl');
    el('rect', { x: 394, y: YC - 13, width: 8, height: 26, rx: 2, class: 'sv-cubo' }, ac2);
    el('rect', { x: 402, y: YC - 5, width: 14, height: 10, class: 'sv-eixo' }, ac2);
    el('rect', { x: 416, y: YC - 13, width: 8, height: 26, rx: 2, class: 'sv-cubo' }, ac2);
    el('rect', { x: 424, y: YC - 6, width: 630, height: 12, class: 'sv-eixo' }, s);

    // ---- compressor centrífugo de 6 estágios (corte)
    const cp = G('sv-compressor');
    el('rect', { x: 500, y: 174, width: 470, height: 176, rx: 18, class: 'sv-carcaca' }, cp);
    el('rect', { x: 522, y: 104, width: 36, height: 72, class: 'sv-bocal-c' }, cp);
    el('rect', { x: 912, y: 104, width: 36, height: 72, class: 'sv-bocal-c' }, cp);
    el('rect', { x: 514, y: 184, width: 452, height: 156, rx: 12, class: 'sv-interno' }, cp);
    for (let i = 0; i < 6; i++) {
      const x = 595 + i * 55, b2 = 9 - i * 0.9;
      for (const sg of [-1, 1]) {
        const y = (v) => YC + sg * v;
        el('path', { d: 'M' + (x - 17) + ',' + y(12) + ' L' + (x + 9) + ',' + y(12) + ' L' + (x + 6) + ',' + y(64) + ' L' + (x + 6 - b2) + ',' + y(64) + ' L' + (x - 17) + ',' + y(30) + ' Z', class: 'sv-rotor' }, cp);
        el('path', { d: 'M' + (x + 21) + ',' + y(78) + ' L' + (x + 31) + ',' + y(78) + ' L' + (x + 31) + ',' + y(16) + ' L' + (x + 21) + ',' + y(16) + ' Z', class: 'sv-diafragma' }, cp);
        for (let d = 0; d < 3; d++) el('rect', { x: x + 22 + d * 3, y: sg < 0 ? YC - 16 : YC + 12, width: 1.4, height: 4, class: 'sv-lab' }, cp);
      }
    }
    el('rect', { x: 906, y: YC - 22, width: 20, height: 44, rx: 2, class: 'sv-rotor' }, cp);
    el('text', { x: 916, y: YC + 4, class: 'sv-mini', 'text-anchor': 'middle' }, cp).textContent = 'BP';
    // caminho do gás pelos estágios (desenhado na metade de cima)
    let d = 'M540,104 V186 L576,' + (YC - 26);
    for (let i = 0; i < 6; i++) {
      const x = 595 + i * 55;
      d += ' L' + (x - 6) + ',' + (YC - 30) + ' L' + (x + 2) + ',' + (YC - 66) + ' L' + (x + 16) + ',' + (YC - 74) + ' L' + (x + 26) + ',' + (YC - 82);
      if (i < 5) d += ' L' + (x + 37) + ',' + (YC - 74) + ' L' + (x + 37) + ',' + (YC - 24) + ' L' + (x + 46) + ',' + (YC - 26);
    }
    d += ' L910,' + (YC - 80) + ' L930,186 V104';
    sin.fluxoInt = el('path', { d, class: 'sv-fluxo sv-fluxo-int' }, cp);
    // mancais: radial do lado acoplado (LA), radial do lado oposto (LOA) e escora
    const mancal = (x0, nome) => {
      el('rect', { x: x0, y: YC - 34, width: 40, height: 68, rx: 4, class: 'sv-mancal' }, cp);
      el('rect', { x: x0 + 8, y: YC + 34, width: 24, height: 18, class: 'sv-pedestal' }, cp);
      el('rect', { x: x0 + 5, y: YC - 15, width: 30, height: 7, class: 'sv-sapata' }, cp);
      el('rect', { x: x0 + 5, y: YC + 8, width: 30, height: 7, class: 'sv-sapata' }, cp);
      el('text', { x: x0 + 20, y: YC + 30, class: 'sv-mini', 'text-anchor': 'middle' }, cp).textContent = nome;
    };
    mancal(444, 'LA');
    mancal(978, 'LOA');
    el('rect', { x: 1026, y: YC - 28, width: 7, height: 56, class: 'sv-colar' }, cp);
    for (const [x, y] of [[1018, YC - 26], [1018, YC + 8], [1035, YC - 26], [1035, YC + 8]]) el('rect', { x, y, width: 6, height: 18, class: 'sv-sapata' }, cp);
    el('text', { x: 1030, y: YC + 44, class: 'sv-mini', 'text-anchor': 'middle' }, cp).textContent = 'escora';
    el('circle', { cx: 584, cy: 175, r: 0.6, class: 'sv-ancora', 'data-sv-sensor': 'COMPRESSOR' }, s);
    el('text', { x: 735, y: 150, class: 'sv-nome', 'text-anchor': 'middle' }, s).textContent = 'COMPRESSOR CENTRÍFUGO · 6 ESTÁGIOS';
    sin.textos.nc = el('text', { x: 735, y: 165, class: 'sv-val', 'text-anchor': 'middle' }, s);

    // ---- sensores no mancal LA: XT-301X/Y (proximidade), ST-301 (referência de fase), VT-301A/B/C (velocidade)
    const sen = G('sv-sensores');
    el('rect', { x: 455, y: YC - 52, width: 5, height: 40, class: 'sv-sonda', 'data-sv-sensor': 'XT-301X' }, sen);
    el('rect', { x: 467, y: YC - 52, width: 5, height: 40, class: 'sv-sonda', 'data-sv-sensor': 'XT-301Y' }, sen);
    el('rect', { x: 489, y: YC - 44, width: 5, height: 36, class: 'sv-sonda', 'data-sv-sensor': 'ST-301' }, sen);
    el('rect', { x: 488, y: YC - 7, width: 7, height: 3, class: 'sv-entalhe' }, sen);
    for (let i = 0; i < 3; i++) el('rect', { x: 434, y: YC - 24 + i * 20, width: 10, height: 12, rx: 1.5, class: 'sv-acel', 'data-sv-sensor': 'VT-301' + 'ABC'[i] }, sen);

    // ---- instrumentos de processo (bolha ISA + valor)
    const inst = (x, letras, num, chave) => {
      const gI = el('g', { class: 'sv-inst', 'data-sv-sensor': letras + '-' + num }, s);
      el('path', { d: 'M' + x + ',77 V91', class: 'sv-fio' }, gI);
      el('circle', { cx: x, cy: 64, r: 13, class: 'sv-bolha' }, gI);
      el('line', { x1: x - 13, y1: 64, x2: x + 13, y2: 64, class: 'sv-bolha-l' }, gI);
      el('text', { x, y: 61, class: 'sv-isa', 'text-anchor': 'middle' }, gI).textContent = letras;
      el('text', { x, y: 74, class: 'sv-isa', 'text-anchor': 'middle' }, gI).textContent = num;
      sin.leds[chave] = el('circle', { cx: x + 20, cy: 64, r: 4.5, class: 'sv-led', 'data-e': 'ok' }, gI);
      sin.textos[chave] = el('text', { x, y: 45, class: 'sv-val sv-val-p', 'text-anchor': 'middle' }, gI);
      if (letras === 'FT') el('path', { d: 'M' + x + ',88 V104', class: 'sv-placa' }, gI);
    };
    inst(292, 'FT', '201', 'FT201');
    inst(392, 'PT', '201', 'PT201');
    inst(492, 'TT', '201', 'TT201');
    inst(985, 'PT', '202', 'PT202');
    inst(1085, 'TT', '202', 'TT202');

    // ---- balões dos sensores de máquina (linha de baixo), com fio até o ponto medido
    const bal = [
      ['ST-301', 491, YC - 46, 'referência de fase'],
      ['XT-301X', 457, YC - 54, 'proximidade'],
      ['XT-301Y', 469, YC - 54, 'proximidade'],
      ['VT-301A', 434, YC - 18, 'velocidade'],
      ['VT-301B', 434, YC + 2, 'velocidade'],
      ['VT-301C', 434, YC + 22, 'velocidade']
    ];
    const yb = 374;
    bal.forEach(([tag, xs, ys, sub], i) => {
      const bx = 300 + i * 112;
      const gB = el('g', { class: 'sv-balao', 'data-sv-balao': tag }, s);
      const vt = tag.indexOf('VT') === 0;
      const xv = vt ? 430 - (i - 3) * 2.5 : xs;
      const yBus = 362 + i * 1.6;
      el('path', { d: 'M' + xs + ',' + ys + (vt ? ' H' + xv : '') + ' V' + yBus + ' H' + (bx + 52) + ' V' + yb, class: 'sv-fio sv-fio-b' }, gB);
      el('rect', { x: bx, y: yb, width: 107, height: 56, rx: 3, class: 'sv-caixa' }, gB);
      sin.leds[tag] = el('circle', { cx: bx + 11, cy: yb + 13, r: 4.5, class: 'sv-led', 'data-e': 'ok' }, gB);
      el('text', { x: bx + 20, y: yb + 17, class: 'sv-tag' }, gB).textContent = tag;
      sin.textos[tag] = el('text', { x: bx + 8, y: yb + 34, class: 'sv-val sv-val-g' }, gB);
      sin.textos[tag + 's'] = el('text', { x: bx + 8, y: yb + 48, class: 'sv-sub' }, gB);
      sin.textos[tag + 's'].textContent = sub;
    });

    // ---- corte A–A: as sondas a 45° vistas do acionador, rotação anti-horária
    const cx = 1132, cy = 268, R = 40;
    const ca = G('sv-corte');
    el('circle', { cx, cy, r: R + 10, class: 'sv-mancal' }, ca);
    el('circle', { cx, cy, r: R, class: 'sv-folga' }, ca);
    sin.corteEixo = el('g', {}, ca);
    el('circle', { cx, cy, r: R - 8, class: 'sv-eixo-c' }, sin.corteEixo);
    el('rect', { x: cx - 3, y: cy - R + 7, width: 6, height: 5, class: 'sv-entalhe' }, sin.corteEixo);
    for (const [ang, nome] of [[45, 'X'], [135, 'Y']]) {
      const c = Math.cos(ang * D2R), sn = -Math.sin(ang * D2R);
      el('line', { x1: cx + c * (R + 2), y1: cy + sn * (R + 2), x2: cx + c * (R + 24), y2: cy + sn * (R + 24), class: 'sv-sonda-l' }, ca);
      el('text', { x: cx + c * (R + 32), y: cy + sn * (R + 32) + 4, class: 'sv-tag', 'text-anchor': 'middle' }, ca).textContent = nome;
    }
    el('path', { d: 'M' + (cx - 20) + ',' + (cy + 27) + ' A 34 34 0 0 0 ' + (cx + 20) + ',' + (cy + 27), class: 'sv-giro' }, ca);
    el('path', { d: 'M' + (cx + 20) + ',' + (cy + 27) + ' l -7,-1 l 4,6 z', class: 'sv-giro-p' }, ca);
    el('text', { x: 1196, y: 336, class: 'sv-mini', 'text-anchor': 'end' }, ca).textContent = 'CORTE A–A · visto do acionador';
    el('text', { x: 1196, y: 348, class: 'sv-mini', 'text-anchor': 'end' }, ca).textContent = 'X e Y a 90° · giro anti-horário';
    sin.ok = true;
  }

  let ultimoTexto = 0, angGir = 0, offFluxo = 0;
  function setTxt(chave, v) { const e = sin.textos[chave]; if (e && e.textContent !== v) e.textContent = v; }
  function setLed(chave, est) { const e = sin.leds[chave] || chave; if (e && e.getAttribute && e.getAttribute('data-e') !== est) e.setAttribute('data-e', est); }
  function atualizarSinotico(dtVis) {
    if (!sin.ok) return;
    // movimento (só no modo fluido)
    if (modo === 'fluida' && dtVis) {
      angGir += dtVis * 0.35 * 360 * Math.max(sim.s, 0);
      const vel = sim.surge ? (sim.ponto.Q >= 0 ? 1 : -1.6) : sim.Q / C.Q0;
      offFluxo -= dtVis * 34 * vel;
    }
    sin.coroa.setAttribute('transform', 'rotate(' + (-angGir).toFixed(2) + ' 338 262)');
    sin.marcaG.setAttribute('transform', 'rotate(' + (-angGir).toFixed(2) + ' 338 262)');
    const angP = (angGir * C.ZG) / C.ZP;
    sin.pinhao.setAttribute('transform', 'rotate(' + angP.toFixed(2) + ' 338 202)');
    sin.marcaP.setAttribute('transform', 'rotate(' + angP.toFixed(2) + ' 338 202)');
    const ofs = offFluxo.toFixed(1);
    sin.fluxoSuc.style.strokeDashoffset = ofs;
    sin.fluxoDesc.style.strokeDashoffset = ofs;
    sin.fluxoInt.style.strokeDashoffset = ofs;
    // corte A–A: entalhe gira (anti-horário) e o centro do eixo se desloca (escala exagerada ×0,12 px/µm)
    const cxo = sim.centro.x * 0.12, cyo = -sim.centro.y * 0.12;
    sin.corteEixo.setAttribute('transform', 'translate(' + cxo.toFixed(2) + ' ' + cyo.toFixed(2) + ') rotate(' + (-(angGir * 2.2) % 360).toFixed(1) + ' 1132 268)');
    raiz.classList.toggle('sv-parado', sim.N < 5);
    raiz.classList.toggle('sv-em-surge', !!sim.surge);
    // valores: no máximo 4 vezes por segundo no modo fluido (1 vez no modo 1 Hz)
    const agora = performance.now();
    if (modo === 'fluida' && agora - ultimoTexto < 250) return;
    ultimoTexto = agora;
    atualizarAnun();
    setTxt('nt', fmt(sim.Nt) + ' rpm');
    setTxt('gmf', 'GMF ' + fmt((C.ZG * sim.N) / 60) + ' Hz');
    setTxt('nc', fmt(sim.N) + ' rpm · ' + fmt(sim.s * 100) + ' %');
    setTxt('ST-301', fmt(sim.N) + ' rpm');
    setLed('ST-301', sim.N < 5 ? 'off' : 'ok');
    const eX = estadoXT(sim.xtX, sim.gap.X), eY = estadoXT(sim.xtY, sim.gap.Y);
    setTxt('XT-301X', fmt(sim.xtX, 1) + ' µm pp');
    setTxt('XT-301Y', fmt(sim.xtY, 1) + ' µm pp');
    setTxt('XT-301Xs', 'gap ' + fmt(sim.gap.X, 2) + ' Vcc');
    setTxt('XT-301Ys', 'gap ' + fmt(sim.gap.Y, 2) + ' Vcc');
    setLed('XT-301X', eX);
    setLed('XT-301Y', eY);
    sim.vt.forEach((c) => {
      const e = estadoVT(c);
      setTxt(c.tag, c.notok ? 'NOT-OK' : fmt(c.v, 2) + ' mm/s pk');
      setTxt(c.tag + 's', c.notok ? 'fio aberto · vetado' : c.conf ? 'confirmado (2 s)' : c.acima ? 'acima de PERIGO' : 'voto 2oo3 · OK');
      setLed(c.tag, e);
    });
    setTxt('FT201', fmt(sim.FT) + ' m³/h');
    setLed('FT201', sim.N < 5 ? 'off' : estadoMargem() === 'off' ? 'ok' : estadoMargem());
    setTxt('PT201', fmt(sim.Ps) + ' kPa');
    setLed('PT201', 'ok');
    setTxt('TT201', fmt(sim.Ts, 1) + ' °C');
    setLed('TT201', sim.Ts >= C.TT201_AL ? 'alerta' : 'ok');
    setTxt('PT202', fmt(sim.Pd) + ' kPa');
    setLed('PT202', 'ok');
    setTxt('TT202', fmt(sim.Td, 1) + ' °C');
    setLed('TT202', sim.Td >= C.TT202_AL ? 'alerta' : 'ok');
    const trav = sim.fv.travada && sim.fv.cmd > 0;
    setTxt('fv', 'pos. ' + fmt(sim.fv.pos) + ' % · cmd ' + fmt(sim.fv.cmd) + ' %' + (trav ? ' · TRAVADA' : ''));
    setLed(sin.ledFV, trav ? 'trip' : 'ok');
  }

  // ================= anunciadores: sequência de alarme com first-out e reconhecimento =================
  // Cada janela guarda o nível mais alto do cenário (só o próximo cenário apaga). Alarme novo ou agravado pisca
  // até o "reconhecer"; a janela do first-out pisca mais rápido. Sem animação (1 Hz), o alarme não reconhecido
  // fica marcado por uma borda dupla.
  const anun = raiz.querySelector('[data-sv-anun]');
  const jans = anun ? Array.from(anun.querySelectorAll('[data-sv-jan]')) : [];
  const NIVEL = { off: 0, info: 1, alerta: 2, notok: 3, trip: 4 };
  const estJan = (c) => (c.notok ? 'notok' : c.acima ? 'trip' : c.al ? 'alerta' : 'off');
  const JAN = {
    vtA: (s) => estJan(s.vt[0]),
    vtB: (s) => estJan(s.vt[1]),
    vtC: (s) => estJan(s.vt[2]),
    xt: (s) => { const m = Math.max(s.xtX, s.xtY); return m >= C.XT_PE ? 'trip' : m >= C.XT_AL ? 'alerta' : 'off'; },
    sub: (s) => (s.aw > 3 ? 'alerta' : 'off'),
    trip: (s) => (s.trip ? 'trip' : 'off'),
    m20: (s) => (s.margem !== null && s.margem < C.APERTADA ? 'alerta' : 'off'),
    m10: (s) => (s.margem !== null && s.margem < C.CONTROLE ? 'trip' : 'off'),
    surge: (s) => (s.surge ? 'trip' : 'off'),
    fv: (s) => (s.fv.travada && s.fv.cmd > 0 ? 'trip' : 'off'),
    tt202: (s) => (s.Td >= C.TT202_AL ? 'alerta' : 'off'),
    hip: (s) => (s.hip.lista.length ? 'info' : 'off')
  };
  let memAnun = {};
  function travarAnun(s) {
    for (const k in JAN) {
      const agora = JAN[k](s);
      const m = memAnun[k] || (memAnun[k] = { e: 'off', rec: false });
      if (NIVEL[agora] > NIVEL[m.e]) { m.e = agora; m.rec = false; }
    }
  }
  sim.aoPasso = travarAnun;
  function atualizarAnun() {
    travarAnun(sim);
    for (const j of jans) {
      const k = j.getAttribute('data-sv-jan');
      const m = memAnun[k];
      if (!m) continue;
      if (j.getAttribute('data-e') !== m.e) j.setAttribute('data-e', m.e);
      j.classList.toggle('pisca', m.e !== 'off' && !m.rec);
      j.classList.toggle('fo', !!sim.fo && k === 'vt' + sim.fo);
    }
  }
  const bRec = raiz.querySelector('[data-sv-reconhecer]');
  if (bRec) bRec.addEventListener('click', () => { for (const k in memAnun) memAnun[k].rec = true; atualizarAnun(); });

  // ================= balões: cada tela ligada por uma linha ao ponto da máquina que ela mede =================
  // Telas de processo ficam acima do trem e chegam ao instrumento por cima; telas de máquina ficam abaixo e
  // chegam ao balão do sensor por baixo. Abaixo de 1.200 px as linhas saem e ficam só os números.
  const ov = document.createElementNS(NS, 'svg');
  ov.setAttribute('class', 'sv-baloes');
  ov.setAttribute('aria-hidden', 'true');
  ov.setAttribute('focusable', 'false');
  raiz.appendChild(ov);
  let ultimoTraco = 0;
  function alvoDe(tag) {
    if (tag.indexOf('b:') === 0) return { el: raiz.querySelector('[data-sv-balao="' + tag.slice(2) + '"] rect'), balao: true };
    const e = raiz.querySelector('[data-sv-sensor="' + tag + '"]');
    const b = e && e.querySelector ? e.querySelector('.sv-bolha') : null;
    return { el: e, x: b, balao: false };
  }
  function svgEl(tag, at) { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); ov.appendChild(e); return e; }
  function tracarBaloes() {
    ultimoTraco = performance.now();
    while (ov.firstChild) ov.removeChild(ov.firstChild);
    const telasB = Array.from(raiz.querySelectorAll('[data-sv-alvo]'));
    const sinEl = raiz.querySelector('.sv-sin');
    if (!telasB.length || !sinEl || getComputedStyle(ov).display === 'none') return;
    const r0 = raiz.getBoundingClientRect(), sr = sinEl.getBoundingClientRect();
    const W = Math.round(r0.width), H = Math.round(r0.height);
    ov.setAttribute('width', W); ov.setAttribute('height', H); ov.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const usados = {}, baloesPostos = [];
    telasB.forEach((t) => {
      const num = ((t.querySelector('.sv-num') || {}).textContent || '').trim();
      const i = (+num || 1) - 1;
      const rt = t.getBoundingClientRect();
      const acima = rt.bottom <= sr.top + 2;
      const lista = t.getAttribute('data-sv-alvo').split(',').map((x) => x.trim());
      const x0 = rt.left + rt.width / 2 - r0.left, y0 = (acima ? rt.bottom : rt.top) - r0.top;
      lista.forEach((tag, j) => {
        const a = alvoDe(tag);
        if (!a.el) return;
        const rs = a.el.getBoundingClientRect();
        const rx = a.x ? a.x.getBoundingClientRect() : rs;
        const n = (usados[tag] = (usados[tag] || 0) + 1) - 1;
        const x1 = rx.left + rx.width / 2 - r0.left + n * (a.balao ? 19 : -19);
        const y1 = (a.balao ? rs.bottom + 1 : rs.top - 2) - r0.top;
        const ym = acima ? sr.top - r0.top - 12 - (i % 3) * 8 : sr.bottom - r0.top + 12 + (i % 3) * 8;
        const xs = x0 + (j - (lista.length - 1) / 2) * 16;
        svgEl('path', { d: 'M' + xs.toFixed(1) + ',' + y0.toFixed(1) + ' V' + ym.toFixed(1) + ' H' + x1.toFixed(1) + ' V' + y1.toFixed(1) });
        svgEl('circle', { cx: x1.toFixed(1), cy: y1.toFixed(1), r: 2.6, class: 'sv-pt' });
        // balão no canto da linha; se encostar noutro, desliza pela própria linha horizontal, na direção da tela
        let xb = x1;
        const dir = xs >= x1 ? 1 : -1;
        for (let n2 = 0; n2 < 12 && baloesPostos.some((b) => Math.hypot(b[0] - xb, b[1] - ym) < 28); n2++) xb += dir * 14;
        if ((xb - xs) * dir > 0) xb = x1;
        baloesPostos.push([xb, ym]);
        svgEl('circle', { cx: xb.toFixed(1), cy: ym.toFixed(1), r: 8 });
        svgEl('text', { x: xb.toFixed(1), y: (ym + 3.5).toFixed(1), 'text-anchor': 'middle' }).textContent = num;
      });
    });
  }

  // ================= controles, relógio e visibilidade =================
  const reduz = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let modo = reduz ? '1hz' : 'fluida';
  let pausado = false, visivel = true, ultimo = 0, acum = 0, raf = null, relogio = null, angVis = 0;
  const alvos = [];
  const ro = 'ResizeObserver' in window ? new ResizeObserver((ents) => {
    for (const e of ents) { const a = e.target.__sv; if (a) { a.w = e.contentRect.width; a.h = e.contentRect.height; } }
    if (modo !== 'fluida' || pausado) desenhar(true);
    else tracarBaloes();
  }) : null;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => {
    for (const e of ents) {
      if (e.target === raiz) { visivel = e.isIntersecting; if (visivel) { ultimo = 0; agendar(); } }
      else if (e.target.__sv) e.target.__sv.vis = e.isIntersecting;
    }
  }, { rootMargin: '80px' }) : null;
  function registrar(cv) {
    if (cv.__sv) return;
    const a = { cv, ctx: cv.getContext('2d'), w: cv.clientWidth, h: cv.clientHeight, mouse: null, vis: true };
    cv.__sv = a;
    alvos.push(a);
    if (ro) ro.observe(cv);
    if (io) io.observe(cv);
    const mover = (ev) => { const r = cv.getBoundingClientRect(); a.mouse = { x: ev.clientX - r.left, y: ev.clientY - r.top }; if (modo !== 'fluida' || pausado) desenharUm(a); };
    cv.addEventListener('pointermove', mover);
    cv.addEventListener('pointerdown', mover);
    cv.addEventListener('pointerleave', () => { a.mouse = null; if (modo !== 'fluida' || pausado) desenharUm(a); });
  }
  function desenharUm(a) {
    if (!a.w || !a.h) { a.w = a.cv.clientWidth; a.h = a.cv.clientHeight; }
    if (!a.w || !a.h) return;
    const fn = TELAS[a.cv.getAttribute('data-sv-desenha')];
    if (!fn) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(a.w * dpr)), H = Math.max(1, Math.round(a.h * dpr));
    if (a.cv.width !== W || a.cv.height !== H) { a.cv.width = W; a.cv.height = H; }
    const g = a.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.save();
    try { fn(g, a.w, a.h, a); } finally { g.restore(); }
  }
  function desenhar(tudo, dtVis) {
    for (const a of alvos) if (tudo || a.vis) desenharUm(a);
    atualizarSinotico(dtVis || 0);
    if (tudo) { atualizarAnun(); tracarBaloes(); } else if (performance.now() - ultimoTraco > 2000) tracarBaloes();
    if (SV.aoDesenhar) SV.aoDesenhar(sim, !!tudo);
  }
  function quadro(agora) {
    raf = null;
    if (modo !== 'fluida') return;
    const dt = ultimo ? Math.min((agora - ultimo) / 1000, 0.25) : 0;
    ultimo = agora;
    const anda = !pausado && visivel && !document.hidden;
    if (anda) { sim.avancar(dt); angVis += dt * 2 * Math.PI * 0.55 * Math.max(sim.s, 0); }
    acum += dt;
    if (acum >= 1 / 30) { desenhar(false, anda ? acum : 0); acum = 0; }
    agendar();
  }
  function agendar() { if (modo === 'fluida' && !raf && visivel && !document.hidden) raf = requestAnimationFrame(quadro); }
  function tique() { if (!pausado && visivel && !document.hidden) sim.avancar(1); if (visivel && !document.hidden) desenhar(false); }
  const bModo = Array.from(raiz.querySelectorAll('[data-sv-modo]'));
  function aplicarModo(m) {
    modo = m;
    raiz.classList.toggle('sv-1hz', m === '1hz');
    raiz.classList.toggle('sv-fluida', m === 'fluida');
    bModo.forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-sv-modo') === m)));
    if (relogio) { clearInterval(relogio); relogio = null; }
    ultimo = 0;
    if (m === '1hz') relogio = setInterval(tique, 1000);
    else agendar();
    desenhar(true);
  }
  bModo.forEach((b) => b.addEventListener('click', () => aplicarModo(b.getAttribute('data-sv-modo'))));
  const bPausa = raiz.querySelector('[data-sv-pausa]');
  function alternarPausa(forcar) {
    pausado = forcar === undefined ? !pausado : forcar;
    if (bPausa) { bPausa.setAttribute('aria-pressed', String(pausado)); bPausa.textContent = pausado ? 'continuar' : 'pausar'; }
    raiz.classList.toggle('sv-pausado', pausado);
    ultimo = 0;
  }
  if (bPausa) bPausa.addEventListener('click', () => alternarPausa());
  const LEGENDAS = {
    1: '3.600 rpm, carga normal. Órbita 1× limpa, ηp 77,4 %, margem de surge 22 %, todos os canais OK.',
    2: 'Partida de 400 a 3.600 rpm, em rampa acelerada. Bode e polar se desenham ao vivo; o pico fica em 3.082 rpm, a fase gira 134° de 400 a 3.600 rpm e o centro do eixo sobe no mancal.',
    3: 'Injetado: mancal radial descarregado. O eixo sobe no mancal, o filme de óleo perde estabilidade e nasce o whirl a 0,48×, com precessão para a frente. O processo não muda: nenhuma hipótese cruzada.',
    4: 'Injetado: queda de vazão com a válvula anti-surge travada, e VT-301C com fio aberto. O ponto cruza a linha de surge e a vibração dispara; C fica fora do voto por Not-OK, A e B fecham o 2oo3. First-out: VT-301A.'
  };
  SV.LEGENDAS = LEGENDAS;
  const leg = raiz.querySelector('[data-sv-legenda]');
  const bCen = Array.from(raiz.querySelectorAll('[data-sv-cenario]'));
  function cenario(n) {
    sim.iniciar(n);
    memAnun = {};
    bCen.forEach((b) => b.setAttribute('aria-pressed', String(+b.getAttribute('data-sv-cenario') === n)));
    if (leg) leg.textContent = LEGENDAS[n];
    if (pausado) alternarPausa(false);
    desenhar(true);
    if (SV.aoCenario) SV.aoCenario(n);
  }
  bCen.forEach((b) => b.addEventListener('click', () => cenario(+b.getAttribute('data-sv-cenario'))));
  document.addEventListener('visibilitychange', () => { ultimo = 0; agendar(); });

  // ================= partida =================
  lerCores();
  const alvoSin = raiz.querySelector('[data-sv-sinotico]');
  if (alvoSin) montarSinotico(alvoSin);
  raiz.querySelectorAll('canvas[data-sv-desenha]').forEach(registrar);
  if (io) io.observe(raiz);
  if (ro) ro.observe(raiz);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => tracarBaloes());
  window.addEventListener('load', () => tracarBaloes());
  // aquecimento: alguns segundos de regime, para as telas já abrirem com histórico
  for (let i = 0; i < 12; i++) sim.avancar(1);
  angVis = 1.3;
  SV.registrarCanvas = (cv) => { registrar(cv); desenharUm(cv.__sv); };
  SV.desenhar = () => desenhar(true);
  SV.cenario = cenario;
  SV.modo = () => modo;
  SV.lerCores = () => { lerCores(); ilhas = null; desenhar(true); };
  aplicarModo(modo);
})();
