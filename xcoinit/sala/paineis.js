// FRV XcoInit · sala de controle das seções da página do produto (10/11/2026).
// Motor comum das telas do topo, das funções, da régua X·1 e do Trem B, no mesmo visual do supervisório:
// painel escuro, grade milimetrada, mira, número âmbar e balão. Os arquivos de cada seção (mesa.js,
// barramento.js, regua.js, trem-b.js) registram aqui os seus desenhos; este arquivo cuida do relógio, do
// tamanho, da visibilidade, do mouse, dos balões e do dispositivo ilustrativo que a página inteira lê.
// Externo de propósito: o CSP do site usa script-src 'self' (sem inline). Sem biblioteca: Canvas 2D e SVG à mão.
// Movimento: com "reduzir movimento" ligado no sistema, tudo anda em 1 Hz (uma atualização por segundo, sem
// giro, fluxo nem pulso), como o supervisório.
// Todos os valores são ilustrativos e gerados aqui, no navegador: nenhum dispositivo é conectado.
'use strict';
(function () {
  const S = (window.XcoSala = window.XcoSala || {});
  const MONO = '"IBM Plex Mono", Consolas, monospace';
  const NS = 'http://www.w3.org/2000/svg';
  const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
  S.NS = NS;
  S.MONO = MONO;
  S.lim = lim;

  // ---------------- formatação pt-BR ----------------
  const NF = {};
  function fmt(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    d = d || 0;
    const f = NF[d] || (NF[d] = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
    return f.format(v).replace('-', '−');
  }
  const hex = (v, n) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(n || 4, '0');
  S.fmt = fmt;
  S.hex = hex;

  // ---------------- cores: as mesmas variáveis do supervisório (--sv-*), definidas em sala.css ----------------
  const PADRAO = {
    painel: '#0d1720', grade: 'rgba(56,189,248,0.055)', grade2: 'rgba(56,189,248,0.12)', eixo: '#3b5266',
    texto: '#e2e8f0', dim: '#94a3b8', dim2: '#64748b', ciano: '#22d3ee', azul: '#3b82f6', ambar: '#fbbf24',
    ok: '#22c55e', alerta: '#fbbf24', trip: '#ef4444', notok: '#a855f7', branco: '#f8fafc', aco: '#475569'
  };
  const cor = Object.assign({}, PADRAO);
  cor.laranja = '#f7941e';
  S.cor = cor;
  function lerCores() {
    const cs = getComputedStyle(document.documentElement);
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
  S.rgba = rgba;
  // estado da régua X·1 → cor (ok/BOM verde, alerta/ATENÇÃO âmbar, trip/AÇÃO vermelho, notok roxo)
  S.estadoCor = (e) => (e === 'ok' ? cor.ok : e === 'alerta' ? cor.alerta : e === 'trip' || e === 'alarme' ? cor.trip : e === 'notok' ? cor.notok : cor.dim2);

  // ---------------- utilidades de desenho (as mesmas do supervisório) ----------------
  // escala do texto pela largura da tela: 460 px = 1 (como o supervisório), com piso para as telas estreitas
  const esc = (w) => lim(w / 460, 0.84, 2.2);
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
    if (bx < 2) bx = 2;
    if (by < 2) by = y + 12;
    if (by + bh > h - 2) by = h - bh - 2;
    g.fillStyle = 'rgba(5,10,16,0.88)';
    g.fillRect(bx, by, bw, bh);
    g.strokeStyle = c || cor.ciano;
    g.lineWidth = 1;
    g.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    linhas.forEach((s, i) => tx(g, s, bx + 6 * k, by + (i + 1) * 12.5 * k, { px: 9.5 * k, c: i ? cor.texto : c || cor.ciano }));
  }
  // mira: cruz pontilhada que segue o mouse dentro da área ar = {x, y, w, h} e mostra a leitura do ponto
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
  function led(g, x, y, r, c) {
    g.fillStyle = c;
    g.shadowColor = c; g.shadowBlur = 6;
    g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill();
    g.shadowBlur = 0;
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
  // elemento SVG: el('rect', {x: 1, ...}, pai)
  function el(tag, at, pai) {
    const e = document.createElementNS(NS, tag);
    for (const k in at) e.setAttribute(k, at[k]);
    if (pai) pai.appendChild(e);
    return e;
  }
  Object.assign(S, { esc, F, tx, linha, grade, base, moldura, caixaTexto, mira, seta, led, quebraTexto, el });

  // gerador pseudoaleatório com semente: as fotos de prova saem iguais a cada carga
  function prng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  S.prng = prng;

  // ================= dispositivo ilustrativo: um só servidor Modbus/TCP para a página inteira =================
  // O catálogo é o mesmo do arquivo de exemplo da demonstração (10 pontos, FT-01 e PDT-01 com o nome da régua),
  // com a família do endereço na convenção do leitor: 0xxxx bobina (FC1), 1xxxx entrada discreta (FC2),
  // 3xxxx registrador de entrada (FC4), 4xxxx registrador de retenção (FC3); addr0 = doc − (família·10000 + 1).
  // Analógico: valor cru u16 de 0 a 65535 ↔ mín…máx do catálogo (valor_escala = mín + cru·(máx − mín)/65535).
  const CAT = [
    { p: 'VT-01', fn: 3, addr: 0, doc: 40001, min: 0, max: 20, u: 'mm/s', d: 'vibração eixo X · mancal A' },
    { p: 'VT-02', fn: 3, addr: 1, doc: 40002, min: 0, max: 20, u: 'mm/s', d: 'vibração eixo Y · mancal A' },
    { p: 'VT-03', fn: 3, addr: 2, doc: 40003, min: 0, max: 20, u: 'mm/s', d: 'vibração axial · mancal B' },
    { p: 'FT-01', fn: 3, addr: 6, doc: 40007, min: 0, max: 400, u: 'm³/h', d: 'vazão de processo' },
    { p: 'TT-01', fn: 4, addr: 0, doc: 30001, min: 0, max: 120, u: '°C', d: 'temperatura mancal A' },
    { p: 'TT-02', fn: 4, addr: 1, doc: 30002, min: 0, max: 120, u: '°C', d: 'temperatura óleo lubrificante' },
    { p: 'PDT-01', fn: 4, addr: 4, doc: 30005, min: 0, max: 200, u: 'kPa', d: 'pressão diferencial' },
    { p: 'CS-01', fn: 1, addr: 0, doc: 1, u: 'bit', d: 'estado · em operação' },
    { p: 'AL-01', fn: 2, addr: 1, doc: 10002, u: 'bit', d: 'alarme de vibração alto' },
    { p: 'AL-02', fn: 2, addr: 2, doc: 10003, u: 'bit', d: 'alarme de temperatura alta' }
  ];
  S.CATALOGO = CAT;
  // os quatro lotes de cada ciclo de 1 s (blocos contíguos do mapa descoberto; o catálogo escolhe os pontos)
  const LOTES = [
    { fc: 3, addr: 0, qtd: 7, txt: 'FC3 lote @0x000 ×7 ok' },
    { fc: 4, addr: 0, qtd: 5, txt: 'FC4 lote @0x000 ×5 ok' },
    { fc: 1, addr: 0, qtd: 1, txt: 'FC1 bits @0x000 ×1 ok' },
    { fc: 2, addr: 0, qtd: 3, txt: 'FC2 bits @0x000 ×3 ok' }
  ];
  S.LOTES = LOTES;
  // limites da régua (os mesmos do texto da página e da demonstração) e histerese de retorno = faixa/64
  const REGUA = { 'mm/s': { al: 5.6, alarme: 7.1, faixa: 20 }, '°C': { al: 80, alarme: 90, faixa: 120 } };
  S.REGUA = REGUA;
  S.CONFIRMA = 3; // ciclos seguidos para escalar (e para voltar)

  const rnd = prng(20261110);
  S.rnd = rnd;
  // passeio aleatório com volta suave ao meio da faixa (o mesmo do topo antigo da página)
  const caminhar = (v, a, b, passo) => lim(v + (rnd() - 0.5) * passo + ((a + b) / 2) * 0.02 - v * 0.02, a, b);
  const HMAX = 180; // 3 minutos de histórico, um valor por ciclo
  const pt = (v, a, b, passo) => ({ v, a, b, passo, hist: [], acima: 0, abaixo: 0, est: 'ok' });
  const dev = {
    ciclo: 0,
    seg0: 9 * 3600 + 41 * 60, // relógio da coleta ilustrativa: começa às 09:41:00 e anda 1 s por ciclo
    tid: 0x01a0, // identificador de transação do MBAP, um por pedido
    leituras: 0,
    falhas: 0,
    cobertura: [10, 10],
    lote: '',
    p: {
      'VT-01': pt(4.82, 3.4, 6.4, 0.35),
      'VT-02': pt(4.91, 3.6, 6.6, 0.32),
      'VT-03': pt(2.9, 2.4, 3.5, 0.1),
      'FT-01': pt(184, 170, 198, 3),
      'TT-01': pt(63.4, 56, 64, 0.4), // passeia perto do normal do laudo, longe dos limites (revisão de 10/11/2026)
      'TT-02': pt(52, 49, 55, 0.3),
      'PDT-01': pt(64, 58, 70, 0.8)
    },
    bits: { 'CS-01': 1, 'AL-01': 0, 'AL-02': 0 },
    hr: [0, 0, 0, 0x0000, 0x0000, 0x0000, 0], // FC3 @0x0000 ×7 (0x0003 a 0x0005 existem no dispositivo, fora do catálogo)
    // FC4 @0x0000 ×5. Fora do catálogo, 0x0002–0x0003 trazem a mesma vazão em float de 32 bits com a word baixa
    // primeiro (ordem CDAB): é o par que a tela de registradores usa para mostrar a troca de word.
    ir: [0, 0, 0x0000, 0x0000, 0],
    co: [1], // FC1 @0x0000 ×1
    di: [0, 0, 0], // FC2 @0x0000 ×3
    csv: [] // últimas linhas do CSV ponto a ponto: ts,ponto,doc,fn,addr0,valor_cru,valor_escala,unidade
  };
  S.dev = dev;
  const crU16 = (c, v) => Math.round(lim((v - c.min) / (c.max - c.min), 0, 1) * 65535);
  const escU16 = (c, cru) => c.min + (cru * (c.max - c.min)) / 65535;
  S.crU16 = crU16;
  S.escU16 = escU16;
  dev.relogio = (dc) => {
    const s = (dev.seg0 + dev.ciclo + (dc || 0)) % 86400;
    const z = (n) => String(n).padStart(2, '0');
    return z(Math.floor(s / 3600)) + ':' + z(Math.floor((s % 3600) / 60)) + ':' + z(s % 60);
  };
  dev.data = (() => { const d = new Date(); const z = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })();
  // estado X·1 do ponto: escala só com 3 ciclos seguidos acima do limite; volta só com 3 ciclos abaixo de limite − faixa/64
  function confirmar(q, r) {
    const h = r.faixa / 64;
    const nivel = q.v >= r.alarme ? 'alarme' : q.v >= r.al ? 'alerta' : 'ok';
    // na faixa da histerese (limite − faixa/64 ≤ v < limite) os dois contadores zeram: subir e voltar pedem ciclos seguidos
    if (nivel !== 'ok') { q.acima++; q.abaixo = 0; } else if (q.v < r.al - h) { q.abaixo++; q.acima = 0; } else { q.acima = 0; q.abaixo = 0; }
    if (nivel !== 'ok' && q.acima >= S.CONFIRMA && q.est !== nivel) q.est = nivel;
    if (q.est !== 'ok' && q.abaixo >= S.CONFIRMA) q.est = 'ok';
  }
  const f32 = new DataView(new ArrayBuffer(4));
  const ouvintes = [];
  S.aoCiclo = (fn) => ouvintes.push(fn);
  function cicloDev() {
    dev.ciclo++;
    for (const k in dev.p) {
      const q = dev.p[k];
      q.v = caminhar(q.v, q.a, q.b, q.passo);
      q.hist.push(q.v);
      if (q.hist.length > HMAX) q.hist.shift();
    }
    confirmar(dev.p['VT-01'], REGUA['mm/s']);
    confirmar(dev.p['VT-02'], REGUA['mm/s']);
    confirmar(dev.p['TT-01'], REGUA['°C']);
    // bits do próprio dispositivo (sem confirmação): o alarme dele acende no instante em que o valor passa
    dev.bits['AL-01'] = dev.p['VT-01'].v >= REGUA['mm/s'].al ? 1 : 0;
    dev.bits['AL-02'] = dev.p['TT-01'].v >= REGUA['°C'].alarme ? 1 : 0;
    dev.co[0] = dev.bits['CS-01'];
    dev.di[1] = dev.bits['AL-01'];
    dev.di[2] = dev.bits['AL-02'];
    const ts = dev.data + ' ' + dev.relogio();
    for (const c of CAT) {
      let cru, es;
      if (c.u === 'bit') { cru = dev.bits[c.p]; es = cru; }
      else { cru = crU16(c, dev.p[c.p].v); es = escU16(c, cru); (c.fn === 3 ? dev.hr : dev.ir)[c.addr] = cru; }
      dev.csv.push([ts, c.p, c.doc, c.fn, c.addr, cru, c.u === 'bit' ? String(es) : es.toFixed(c.max > 100 ? 1 : 2), c.u].join(','));
    }
    while (dev.csv.length > 40) dev.csv.shift();
    f32.setFloat32(0, dev.p['FT-01'].v);
    dev.ir[2] = f32.getUint16(2); // word baixa primeiro (CDAB)
    dev.ir[3] = f32.getUint16(0);
    dev.tid = (dev.tid + LOTES.length) & 0xffff;
    dev.leituras += CAT.length;
    const i = dev.ciclo % 5;
    dev.lote = i ? LOTES[i - 1].txt : 'cobertura re-verificada: 10/10 (100 %)';
    for (const f of ouvintes) { try { f(dev); } catch (e) { /* um desenho com erro não para os outros */ } }
  }
  S.cicloDev = cicloDev;
  // aquecimento: 3 minutos de ciclos, para as telas já abrirem com histórico
  for (let i = 0; i < HMAX; i++) cicloDev();

  // ================= registro dos desenhos =================
  const DESENHOS = {}; // nome → função (g, w, h, a) que desenha um canvas [data-sala-desenha="nome"]
  const SINOTICOS = {}; // nome → função (alvo, S) que monta um sinótico [data-sala-sinotico="nome"] e devolve {atualizar(dt)}
  S.tela = (nome, fn) => { DESENHOS[nome] = fn; };
  S.sinotico = (nome, fn) => { SINOTICOS[nome] = fn; };

  // ================= relógio, tamanho, visibilidade, mouse e balões =================
  const reduz = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let modo = reduz ? '1hz' : 'fluida';
  S.modo = () => modo;
  S.t = 0; // tempo da animação, em segundos (contínuo no modo fluido; +1 por segundo no modo 1 Hz)
  const telas = [];
  const sins = [];
  let raf = null, ultimo = 0, acumQ = 0, acumC = 0, relogio = null, ultimoTraco = 0;

  function desenharUma(a) {
    if (!a.w || !a.h) { a.w = a.cv.clientWidth; a.h = a.cv.clientHeight; }
    if (!a.w || !a.h) return;
    const fn = DESENHOS[a.nome];
    if (!fn) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(a.w * dpr)), H = Math.max(1, Math.round(a.h * dpr));
    if (a.cv.width !== W || a.cv.height !== H) { a.cv.width = W; a.cv.height = H; }
    const g = a.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.save();
    try { fn(g, a.w, a.h, a); } catch (e) { if (!a.erro) { a.erro = true; console.error('sala: ' + a.nome, e); } } finally { g.restore(); }
  }
  const ro = 'ResizeObserver' in window ? new ResizeObserver((ents) => {
    for (const e of ents) { const a = e.target.__sala; if (a) { a.w = e.contentRect.width; a.h = e.contentRect.height; if (modo !== 'fluida') desenharUma(a); } }
    tracarTodos();
  }) : null;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => {
    for (const e of ents) { const a = e.target.__sala; if (a) { a.vis = e.isIntersecting; if (a.vis && modo !== 'fluida' && a.cv) desenharUma(a); } }
    agendar();
  }, { rootMargin: '120px' }) : null;

  function registrarCanvas(cv) {
    if (cv.__sala) return;
    const a = { cv, ctx: cv.getContext('2d'), nome: cv.getAttribute('data-sala-desenha'), w: cv.clientWidth, h: cv.clientHeight, mouse: null, vis: !io, dt: 0, mem: {} };
    cv.__sala = a;
    telas.push(a);
    if (ro) ro.observe(cv);
    if (io) io.observe(cv);
    const mover = (ev) => { const r = cv.getBoundingClientRect(); a.mouse = { x: ev.clientX - r.left, y: ev.clientY - r.top }; if (modo !== 'fluida') desenharUma(a); };
    cv.addEventListener('pointermove', mover);
    cv.addEventListener('pointerdown', mover);
    cv.addEventListener('pointerleave', () => { a.mouse = null; if (modo !== 'fluida') desenharUma(a); });
  }
  function registrarSinotico(alvo) {
    if (alvo.__sala) return;
    const nome = alvo.getAttribute('data-sala-sinotico');
    const fn = SINOTICOS[nome];
    if (!fn) return;
    const s = { el: alvo, nome, vis: !io, api: null };
    alvo.__sala = s;
    try { s.api = fn(alvo, S) || {}; } catch (e) { console.error('sala: ' + nome, e); s.api = {}; }
    sins.push(s);
    if (io) io.observe(alvo);
  }
  function atualizarSins(dtVis) {
    for (const s of sins) if (s.vis && s.api && s.api.atualizar) { try { s.api.atualizar(dtVis, S); } catch (e) { if (!s.erro) { s.erro = true; console.error('sala: ' + s.nome, e); } } }
  }
  function desenhar(tudo, dt, dtVis) {
    for (const a of telas) if (tudo || a.vis) { a.dt = dt; desenharUma(a); }
    atualizarSins(dtVis);
    if (tudo || performance.now() - ultimoTraco > 2000) tracarTodos();
  }
  function quadro(agora) {
    raf = null;
    if (modo !== 'fluida') return;
    const dt = ultimo ? Math.min((agora - ultimo) / 1000, 0.25) : 0;
    ultimo = agora;
    S.t += dt;
    acumC += dt;
    while (acumC >= 1) { acumC -= 1; cicloDev(); }
    acumQ += dt;
    if (acumQ >= 1 / 30) { const d = acumQ; acumQ = 0; desenhar(false, d, d); }
    agendar();
  }
  function algoVisivel() { return telas.some((a) => a.vis) || sins.some((s) => s.vis); }
  function agendar() { if (modo === 'fluida' && !raf && !document.hidden && algoVisivel()) raf = requestAnimationFrame(quadro); }
  function tique() {
    if (document.hidden) return;
    S.t += 1;
    cicloDev();
    desenhar(false, 1, 0);
  }
  function aplicarModo(m) {
    modo = m;
    document.querySelectorAll('[data-sala-raiz]').forEach((r) => { r.classList.toggle('sala-1hz', m === '1hz'); r.classList.toggle('sala-fluida', m === 'fluida'); });
    if (relogio) { clearInterval(relogio); relogio = null; }
    ultimo = 0;
    if (m === '1hz') relogio = setInterval(tique, 1000);
    else agendar();
    desenhar(true, 0, 0);
  }
  S.aplicarModo = aplicarModo;
  S.desenhar = () => desenhar(true, 0, 0);
  document.addEventListener('visibilitychange', () => { ultimo = 0; agendar(); });

  // ---- balões: cada tela [data-sala-alvo="ancora1,ancora2"] ligada por linha tracejada ao ponto
  // [data-sala-ancora="ancora1"] do sinótico [data-sala-sin] da mesma raiz [data-sala-baloes].
  // Telas acima do sinótico chegam por cima; telas abaixo, por baixo. Abaixo de 1.400 px as linhas saem
  // e ficam só os números (sala.css).
  const raizesB = [];
  function svgEl(ov, tag, at) { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); ov.appendChild(e); return e; }
  function tracar(raiz) {
    const ov = raiz.__ov;
    while (ov.firstChild) ov.removeChild(ov.firstChild);
    const sinEl = raiz.querySelector('[data-sala-sin]');
    const telasB = Array.from(raiz.querySelectorAll('[data-sala-alvo]'));
    if (!sinEl || !telasB.length || getComputedStyle(ov).display === 'none') return;
    const r0 = raiz.getBoundingClientRect(), sr = sinEl.getBoundingClientRect();
    const W = Math.round(r0.width), H = Math.round(r0.height);
    ov.setAttribute('width', W); ov.setAttribute('height', H); ov.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const nAcima = { n: 0 }, nAbaixo = { n: 0 }, baloesPostos = [];
    telasB.forEach((t) => {
      const num = ((t.querySelector('.sv-num') || {}).textContent || '').trim();
      const rt = t.getBoundingClientRect();
      const acima = rt.bottom <= sr.top + 2;
      const cont = acima ? nAcima : nAbaixo;
      const i = cont.n++;
      const lista = t.getAttribute('data-sala-alvo').split(',').map((x) => x.trim()).filter(Boolean);
      const x0 = rt.left + rt.width / 2 - r0.left, y0 = (acima ? rt.bottom : rt.top) - r0.top;
      lista.forEach((tag, j) => {
        const e = raiz.querySelector('[data-sala-ancora="' + tag + '"]');
        if (!e) return;
        const rs = e.getBoundingClientRect();
        const x1 = rs.left + rs.width / 2 - r0.left, y1 = rs.top + rs.height / 2 - r0.top;
        const ym = acima ? sr.top - r0.top - 12 - (i % 4) * 7 : sr.bottom - r0.top + 12 + (i % 4) * 7;
        const xs = x0 + (j - (lista.length - 1) / 2) * 16;
        svgEl(ov, 'path', { d: 'M' + xs.toFixed(1) + ',' + y0.toFixed(1) + ' V' + ym.toFixed(1) + ' H' + x1.toFixed(1) + ' V' + y1.toFixed(1) });
        svgEl(ov, 'circle', { cx: x1.toFixed(1), cy: y1.toFixed(1), r: 2.6, class: 'sv-pt' });
        // balão no canto da linha; se encostar noutro, desliza pela própria linha horizontal, na direção da tela
        let xb = x1;
        const dir = xs >= x1 ? 1 : -1;
        for (let n2 = 0; n2 < 12 && baloesPostos.some((b) => Math.hypot(b[0] - xb, b[1] - ym) < 28); n2++) xb += dir * 14;
        if ((xb - xs) * dir > 0) xb = x1;
        baloesPostos.push([xb, ym]);
        svgEl(ov, 'circle', { cx: xb.toFixed(1), cy: ym.toFixed(1), r: 8 });
        svgEl(ov, 'text', { x: xb.toFixed(1), y: (ym + 3.5).toFixed(1), 'text-anchor': 'middle' }).textContent = num;
      });
    });
  }
  function tracarTodos() {
    ultimoTraco = performance.now();
    for (const r of raizesB) { try { tracar(r); } catch (e) { /* sem balão, a página continua */ } }
  }
  S.retracar = tracarTodos;

  // ================= partida (depois de todos os arquivos da sala carregarem) =================
  let iniciou = false;
  function iniciar() {
    if (iniciou) return;
    iniciou = true;
    lerCores();
    document.querySelectorAll('[data-sala-sinotico]').forEach(registrarSinotico);
    document.querySelectorAll('canvas[data-sala-desenha]').forEach(registrarCanvas);
    document.querySelectorAll('[data-sala-baloes]').forEach((r) => {
      const ov = document.createElementNS(NS, 'svg');
      ov.setAttribute('class', 'sv-baloes');
      ov.setAttribute('aria-hidden', 'true');
      ov.setAttribute('focusable', 'false');
      r.appendChild(ov);
      r.__ov = ov;
      raizesB.push(r);
      if (ro) ro.observe(r);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { tracarTodos(); S.desenhar(); });
    window.addEventListener('load', () => tracarTodos());
    aplicarModo(modo);
    if (S.aoIniciar) S.aoIniciar.forEach((f) => { try { f(S); } catch (e) { console.error(e); } });
  }
  S.aoIniciar = S.aoIniciar || [];
  if (document.readyState === 'complete') iniciar();
  else { document.addEventListener('DOMContentLoaded', iniciar); window.addEventListener('load', iniciar); }
})();
