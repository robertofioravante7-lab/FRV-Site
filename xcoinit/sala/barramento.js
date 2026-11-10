// FRV XcoInit · sala de controle · seção "Do barramento ao CSV" (#funcoes), 10/11/2026.
// Desenha o sinótico do barramento Modbus/TCP (o dispositivo com os quatro bancos de memória, o cabo com os quadros
// MBAP/PDU indo e voltando e o caminho interno do XcoInit até o X·1) e as oito telas XCL·01 a 08: bits,
// registradores, autodescoberta, cobertura, coleta, fingerprint, mesa e régua X·1. Lê o dispositivo ilustrativo único
// de paineis.js (S.dev); os números de protocolo (funções, lotes, exceções, varredura) são os do leitor.
'use strict';
(function () {
  const S = window.XcoSala;
  if (!S || !S.tela || !S.sinotico || !S.dev) return;
  const cor = S.cor, dev = S.dev, fmt = S.fmt, tx = S.tx, F = S.F, rgba = S.rgba, el = S.el, lim = S.lim;
  const fluida = () => S.modo() === 'fluida';
  const h2 = (v) => (v & 255).toString(16).toUpperCase().padStart(2, '0');
  const h4 = (v) => (v & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const i16 = (v) => (v >= 32768 ? v - 65536 : v);
  const dv = new DataView(new ArrayBuffer(4));
  const f32 = (alta, baixa) => { dv.setUint16(0, alta); dv.setUint16(2, baixa); return dv.getFloat32(0); };
  const expo = (v) => (isFinite(v) ? v.toExponential(2).replace('.', ',').replace('e+', 'e').replace(/-/g, '−') : 'NaN');
  const nomeFC = (fc) => 'FC' + String(fc).padStart(2, '0');
  const suave = (p) => p * p * (3 - 2 * p);
  const CAT = S.CATALOGO;
  const CATMAP = {};
  CAT.forEach((c) => { CATMAP[c.fn + ':' + c.addr] = c; });
  const catDe = (fc, a) => CATMAP[fc + ':' + a] || null;
  // tamanho médio da linha do CSV (com a quebra de linha), para estimar o arquivo do dia
  const MEDIA = dev.csv.length ? dev.csv.reduce((s, l) => s + l.length + 1, 0) / dev.csv.length : 52;
  // segundos de coleta desde 08:00 (a coleta do dia vai de 08:00 a 17:00, com parada automática)
  const segColeta = () => lim(dev.seg0 + dev.ciclo - 8 * 3600, 0, 9 * 3600);
  const NOMEST = { ok: 'BOM', alerta: 'ATENÇÃO', alarme: 'AÇÃO' };

  // ---------------- quadros Modbus/TCP: MBAP (transação · protocolo 0 · comprimento · unit) + PDU ----------------
  // dados crus de um lote como o dispositivo responde: registradores em big-endian; bits empacotados por byte, do bit
  // menos significativo para o mais significativo, com os bits que sobram no último byte zerados
  function dadosLote(fc, addr, qtd) {
    const out = [];
    if (fc === 3 || fc === 4) {
      const m = fc === 3 ? dev.hr : dev.ir;
      for (let i = 0; i < qtd; i++) { const v = m[addr + i] || 0; out.push(v >> 8, v & 255); }
    } else {
      const m = fc === 1 ? dev.co : dev.di;
      for (let b = 0; b < Math.ceil(qtd / 8); b++) {
        let by = 0;
        for (let j = 0; j < 8; j++) { const i = b * 8 + j; if (i < qtd && m[addr + i]) by |= 1 << j; }
        out.push(by);
      }
    }
    return out;
  }
  // uma troca: pedido de leitura (FC1 a FC4) ou sonda de diagnóstico (FC07, FC65 a FC72: só o código da função)
  function troca(tid, fc, addr, qtd, exc) {
    const leitura = fc >= 1 && fc <= 4;
    const pedido = leitura ? [fc, addr >> 8, addr & 255, qtd >> 8, qtd & 255] : [fc];
    let resp;
    if (exc) resp = [fc | 0x80, exc];
    else if (leitura) { const d = dadosLote(fc, addr, qtd); resp = [fc, d.length].concat(d); }
    else resp = [fc, 0x00]; // FC07: um byte de estado
    return { tid, fc, addr, qtd, exc: exc || 0, leitura, pedido, resp };
  }
  const mbap = (tid, pdu) => h4(tid) + ' 0000 ' + h4(pdu.length + 1) + ' FF';
  const txtPedido = (t) => (t.leitura ? h2(t.fc) + ' ' + h4(t.addr) + ' ' + h4(t.qtd) : h2(t.fc));
  function txtResp(t, maxW) {
    const r = t.resp;
    let s = h2(r[0]) + ' ' + h2(r[1]);
    if (t.exc || !t.leitura) return s;
    const n = r.length - 2;
    if (t.fc === 3 || t.fc === 4) {
      const nw = n / 2, mw = Math.min(nw, maxW || 99);
      for (let i = 0; i < mw; i++) s += ' ' + h2(r[2 + 2 * i]) + h2(r[3 + 2 * i]);
      if (mw < nw) s += ' …';
    } else for (let i = 0; i < n; i++) s += ' ' + h2(r[2 + i]);
    return s;
  }

  // ======================= sinótico: dispositivo · cabo · XcoInit =======================
  // O cabo repassa uma sessão em laço, em câmera lenta (um quadro por segundo; no leitor, cada troca leva milissegundos):
  // sondar, fingerprint (FC07 responde; FC65 a FC72 negadas), varrer (a janela encolhe nas exceções 02) e coletar.
  const FASES = ['SONDAR', 'FINGERPRINT', 'VARRER', 'COLETAR'];
  const ROT = [{ f: 'SONDAR', fc: 3, a: 0, q: 7 }, { f: 'SONDAR', fc: 4, a: 0, q: 5 }, { f: 'FINGERPRINT', fc: 7 }, { f: 'FINGERPRINT', fc: 0x41, exc: 1 }, { f: 'FINGERPRINT', fc: 0x48, exc: 1 }];
  [96, 64, 32, 16, 8].forEach((q) => ROT.push({ f: 'VARRER', fc: 3, a: 0, q, exc: 2 }));
  ROT.push({ f: 'VARRER', fc: 3, a: 0, q: 4 });
  for (let c = 0; c < 3; c++) for (const L of S.LOTES) ROT.push({ f: 'COLETAR', fc: L.fc, a: L.addr, q: L.qtd });
  const SONDAS = [7, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48];
  function notaTroca(t, r) {
    if (t.exc === 2) return h2(t.resp[0]) + ' = ' + h2(t.fc) + ' | 0x80 · exceção 02: endereço ilegal → a janela encolhe de ' + r.q + ' para ' + (r.q > 64 ? 64 : r.q / 2);
    if (t.exc === 1) return h2(t.resp[0]) + ' = ' + h2(t.fc) + ' | 0x80 · exceção 01: o dispositivo nega a função' + (t.fc === 0x48 ? ' (FC66 a FC71 idem)' : '');
    if (!t.leitura) return 'FC07 responde: 1 byte de estado (00) · comprimento 3 = unit + FC + estado';
    const nb = t.resp.length - 2, len = t.resp.length + 1;
    if (r.f === 'VARRER') return 'achou dados: ' + r.q + ' registros → absorve para a frente e refina o fim por bissecção';
    if (t.fc === 3 || t.fc === 4) return 'comprimento ' + len + ' = unit + FC + contagem + ' + nb + ' bytes · ' + r.q + ' registradores';
    return 'comprimento ' + len + ' = unit + FC + contagem + 1 byte · ' + r.q + (r.q > 1 ? ' bits' : ' bit') + ' do LSB, sobra zerada';
  }

  S.sinotico('barramento', function (alvo) {
    const svg = el('svg', { viewBox: '0 0 1500 284', class: 'sv-svg', 'aria-hidden': 'true', focusable: 'false' }, alvo);
    svg.style.minWidth = '960px'; // 1.500 de largura: abaixo disso o texto fica miúdo (a área rola, como no supervisório)
    const T = (x, y, cls, s, anc) => {
      const e = el('text', { x, y, class: cls }, svg);
      if (anc) e.setAttribute('text-anchor', anc);
      if (s !== undefined) e.textContent = s;
      return e;
    };
    const R = (x, y, w, h, cls, rx) => el('rect', rx ? { x, y, width: w, height: h, rx, class: cls } : { x, y, width: w, height: h, class: cls }, svg);
    const LED = (cx, cy, r) => el('circle', { cx, cy, r: r || 4.5, class: 'sv-led' }, svg);
    const realce = (x, y, w, h) => el('rect', { x: x - 2.5, y: y - 2.5, width: w + 5, height: h + 5, rx: 3, fill: 'none', stroke: cor.ambar, 'stroke-width': 1.6, display: 'none' }, svg);
    const fluxos = [];
    const FL = (d) => { const p = el('path', { d, class: 'sv-fluxo sv-fluxo-int' }, svg); fluxos.push(p); return p; };
    const pontaD = (x, y) => el('path', { d: 'M' + x + ',' + y + ' l-6,-3.5 v7 z', fill: cor.ciano, opacity: 0.85 }, svg);
    const pontaB = (x, y) => el('path', { d: 'M' + x + ',' + y + ' l-3.5,-6 h7 z', fill: cor.ciano, opacity: 0.85 }, svg);
    const anc = (nome, x, y) => el('circle', { cx: x, cy: y, r: 0.6, class: 'sv-ancora', 'data-sala-ancora': nome }, svg);
    const cache = new Map();
    const setT = (e, s) => { if (e.textContent !== s) e.textContent = s; };
    const setA = (e, k, v) => { let m = cache.get(e); if (!m) cache.set(e, (m = {})); if (m[k] !== v) { m[k] = v; e.setAttribute(k, v); } };
    const setLed = (e, est) => { if (est) setA(e, 'data-e', est); else if (e.hasAttribute('data-e')) { e.removeAttribute('data-e'); const m = cache.get(e); if (m) m['data-e'] = null; } };

    // ---------- dispositivo: servidor Modbus/TCP com os quatro bancos ----------
    R(12, 20, 388, 240, 'sv-carcaca', 6);
    R(400, 86, 10, 20, 'sv-bocal-c');
    const ledB = {};
    const bitQ = (x, y) => ({ r: el('rect', { x, y: y - 10, width: 12, height: 12, rx: 1.5, fill: 'none', stroke: cor.eixo }, svg), t: T(x + 6, y - 1, 'sv-isa', '0', 'middle') });
    R(24, 32, 124, 52, 'sv-interno', 3);
    T(32, 46, 'sv-rot', 'BOBINAS · FC1');
    ledB[1] = LED(138, 42);
    const bCS = bitQ(32, 74);
    T(52, 73, 'sv-val sv-val-p', '00001');
    T(98, 73, 'sv-mini', 'CS-01');
    R(24, 92, 124, 96, 'sv-interno', 3);
    T(32, 106, 'sv-rot', 'ENTRADAS · FC2');
    ledB[2] = LED(138, 102);
    const bDI = [];
    ['—', 'AL-01', 'AL-02'].forEach((tag, i) => {
      const y = 130 + i * 22;
      bDI.push(bitQ(32, y));
      T(52, y - 1, 'sv-val sv-val-p', '1000' + (i + 1));
      T(98, y - 1, 'sv-mini', tag);
    });
    const hx = { 3: [], 4: [] };
    const banco = (fc, y, titulo, docs, tags, n) => {
      R(158, y, 234, 74, 'sv-interno', 3);
      T(166, y + 14, 'sv-rot', titulo);
      ledB[fc] = LED(382, y + 10);
      for (let i = 0; i < n; i++) {
        const x = 166 + i * 31;
        const fora = !catDe(fc, i);
        el('rect', { x, y: y + 20, width: 28, height: 20, rx: 1.5, class: 'sv-caixa' }, svg);
        const t = T(x + 14, y + 34, 'sv-isa', '0000', 'middle');
        if (fora && !(fc === 4 && (i === 2 || i === 3))) t.setAttribute('opacity', 0.5);
        hx[fc].push(t);
        T(x + 14, y + 52, 'sv-mini', String(docs + i), 'middle');
        if (tags[i]) T(x + 14, y + 66, 'sv-mini', tags[i], 'middle');
      }
    };
    banco(4, 32, 'REG. DE ENTRADA · FC4', 30001, ['TT-01', 'TT-02', '', '', 'PDT-01'], 5);
    el('path', { d: 'M230,90 v3 H287 v-3', fill: 'none', stroke: cor.dim2 }, svg);
    T(258.5, 101, 'sv-mini', 'vazão f32', 'middle'); // o par fora do catálogo (word baixa primeiro, CDAB)
    banco(3, 114, 'REG. DE RETENÇÃO · FC3', 40001, ['VT-01', 'VT-02', 'VT-03', '—', '—', '—', 'FT-01'], 7);
    T(24, 214, 'sv-nome', 'SERVIDOR MODBUS/TCP');
    T(24, 233, 'sv-val', '127.0.0.1:502 · unit 255');
    T(24, 250, 'sv-sub', 'dispositivo ilustrativo · 16 endereços em 4 bancos');
    anc('bits', 86, 32);
    anc('regs', 275, 32);

    // ---------- cabo: pedidos vão (âmbar), respostas voltam (verde; exceção em vermelho) ----------
    T(410, 13, 'sv-rot', 'SESSÃO EM LAÇO · CÂMERA LENTA, 1 QUADRO POR SEGUNDO');
    const fBox = [], fTxt = [], fRe = [];
    FASES.forEach((f, i) => {
      const x = 410 + i * 120;
      fBox.push(R(x, 22, 110, 20, 'sv-caixa', 2));
      fTxt.push(T(x + 55, 36, 'sv-rot', f, 'middle'));
      fRe.push(realce(x, 22, 110, 20));
    });
    el('path', { d: 'M410,96 H880', class: 'sv-tubo' }, svg);
    const tPedR = T(876, 64, 'sv-rot', 'PEDIDO ←', 'end');
    tPedR.style.fill = cor.ambar;
    const tRespR = T(414, 134, 'sv-rot', '→ RESPOSTA');
    tRespR.style.fill = cor.ok;
    T(645, 134, 'sv-mini', 'cabo Ethernet · TCP 502', 'middle');
    const quadro = (c, y) => {
      const g = el('g', { display: 'none' }, svg);
      const r = el('rect', { x: 0, y, width: 100, height: 16, rx: 2, fill: rgba(c, 0.14), stroke: c, 'stroke-width': 1.2 }, g);
      const t = el('text', { x: 6, y: y + 11.5, fill: c, 'font-family': S.MONO, 'font-size': 8.5, 'font-weight': 600 }, g);
      return { g, r, t, w: 100 };
    };
    const qPed = quadro(cor.ambar, 72), qResp = quadro(cor.ok, 104);
    // caixa que decodifica o quadro do momento
    R(410, 142, 470, 78, 'sv-caixa', 2);
    const ledD = LED(424, 156);
    const dTit = T(436, 160, 'sv-tag', '');
    T(424, 178, 'sv-sub', 'pedido');
    const dPed = T(484, 178, 'sv-val', '');
    T(424, 195, 'sv-sub', 'resposta');
    const dResp = T(484, 195, 'sv-val', '');
    const dNota = T(424, 212, 'sv-sub', '');
    // assinatura: a resposta do dispositivo às sondas (FC07 padrão; FC65 a FC72 definidas pelo fabricante)
    R(410, 228, 470, 32, 'sv-caixa', 2);
    T(420, 241, 'sv-rot', 'ASSINATURA');
    T(420, 254, 'sv-sub', '1 responde · 8 negadas');
    const sRe = [];
    SONDAS.forEach((fc, i) => {
      const x = 548 + i * 36.4;
      R(x, 233, 32, 22, 'sv-interno', 2);
      const l = LED(x + 8, 244, 3.6);
      l.setAttribute('data-e', fc === 7 ? 'ok' : 'trip');
      T(x + 21, 247.5, 'sv-isa', h2(fc), 'middle');
      sRe.push(realce(x, 233, 32, 22));
    });
    anc('assinatura', 645, 260);

    // ---------- XcoInit: cliente Modbus/TCP e o caminho interno até o laudo ----------
    R(892, 20, 596, 240, 'sv-carcaca', 6);
    R(880, 86, 12, 20, 'sv-bocal-c');
    T(906, 39, 'sv-tag', 'FRV XcoInit');
    T(984, 39, 'sv-sub', '· cliente Modbus/TCP');
    el('path', { d: 'M892,96 H906 M898,96 V198 H906', class: 'sv-fio' }, svg);
    FL('M1176,85 H1200');
    FL('M1337,120 V135 H968 V150');
    FL('M1030,198 H1054 M1178,198 H1202 M1326,198 H1350');
    pontaD(1200, 85);
    pontaB(968, 150);
    [1054, 1202, 1350].forEach((x) => pontaD(x, 198));
    T(1000, 131, 'sv-mini', 'mapa × catálogo → lotes do ciclo');
    const etapa = (x, y, w, h, titulo) => { R(x, y, w, h, 'sv-interno', 3); T(x + 8, y + 16, 'sv-rot', titulo); return LED(x + w - 10, y + 12); };
    const ledDesc = etapa(906, 50, 270, 70, 'AUTODESCOBERTA');
    T(916, 86, 'sv-val sv-val-p', 'FC3 0x0000–0x0006 · 7 registros');
    T(916, 101, 'sv-val sv-val-p', 'FC4 0x0000–0x0004 · 5 registros');
    T(916, 114, 'sv-sub', 'janela 96 → 1 · fim por bissecção');
    const ledCob = etapa(1200, 50, 274, 70, 'CATÁLOGO · COBERTURA');
    T(1210, 90, 'sv-val sv-val-g', '10/10 pontos · 100 %');
    T(1210, 108, 'sv-sub', 'bancada 270/270 · faltando 0');
    const ledCol = etapa(906, 150, 124, 96, 'COLETA CÍCLICA');
    T(914, 186, 'sv-val', 'ciclo 1 s');
    const xRel = T(914, 205, 'sv-val sv-val-g', '');
    T(914, 222, 'sv-sub', 'parada 17:00');
    const xCic = T(914, 238, 'sv-sub', '');
    const ledCsv = etapa(1054, 150, 124, 96, 'CSV DIÁRIO');
    T(1062, 184, 'sv-mini', 'pontos-' + dev.data + '.csv');
    T(1062, 203, 'sv-val', '+10 linhas/s');
    const xLin = T(1062, 220, 'sv-sub', '');
    const xMB = T(1062, 236, 'sv-sub', '');
    const ledMesa = etapa(1202, 150, 124, 96, 'MESA');
    T(1210, 184, 'sv-sub', 'ligado · falhas 0');
    const xVT = T(1210, 204, 'sv-val sv-val-g', '');
    T(1210, 220, 'sv-sub', 'VT-01 ao vivo');
    T(1210, 236, 'sv-sub', 'cobertura 10/10');
    const ledX1 = etapa(1350, 150, 124, 96, 'X·1 · LAUDO');
    const xV3 = T(1358, 186, 'sv-tag', 'VT-03 · AÇÃO');
    xV3.style.fill = cor.trip;
    T(1358, 202, 'sv-sub', 'z +4,0 · 4,18 mm/s');
    const xE1 = T(1358, 220, 'sv-sub', '');
    const xE2 = T(1358, 236, 'sv-sub', '');
    [ledCob, ledCsv, ledMesa, ledX1].forEach((l) => l.setAttribute('data-e', 'ok'));
    const reDesc = realce(906, 50, 270, 70), reCol = realce(906, 150, 124, 96);
    anc('descoberta', 1150, 50);
    anc('cobertura', 1337, 50);
    anc('coleta', 968, 246);
    anc('mesa', 1264, 246);
    anc('x1', 1412, 246);

    // números das telas dentro do desenho, só quando os balões saem (abaixo de 1.400 px)
    const gNum = el('g', { display: 'none' }, svg);
    [['1', 86, 11, 32], ['2', 275, 11, 32], ['3', 1150, 11, 50], ['4', 1337, 11, 50], ['6', 645, 272, 260], ['5', 968, 272, 246], ['7', 1264, 272, 246], ['8', 1412, 272, 246]].forEach(([n, x, y, ya]) => {
      el('path', { d: 'M' + x + ',' + (y < 100 ? y + 8 : y - 8) + ' V' + ya, fill: 'none', stroke: cor.ambar, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.8 }, gNum);
      el('circle', { cx: x, cy: y, r: 8, fill: cor.painel, stroke: cor.ambar, 'stroke-width': 1.5 }, gNum);
      el('text', { x, y: y + 3.5, 'text-anchor': 'middle', fill: cor.ambar, 'font-family': S.MONO, 'font-size': 10, 'font-weight': 700 }, gNum).textContent = n;
    });
    const mq = window.matchMedia ? window.matchMedia('(max-width: 1399px)') : null;
    const nums = () => gNum.setAttribute('display', mq && mq.matches ? 'inline' : 'none');
    nums();
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', nums); else if (mq.addListener) mq.addListener(nums); }

    // ---------- estado ----------
    const setBit = (b, v) => { setA(b.r, 'fill', v ? rgba(cor.ciano, 0.3) : 'none'); setA(b.r, 'stroke', v ? cor.ciano : cor.eixo); setT(b.t, v ? '1' : '0'); };
    function valores() {
      for (let i = 0; i < 7; i++) setT(hx[3][i], h4(dev.hr[i]));
      for (let i = 0; i < 5; i++) setT(hx[4][i], h4(dev.ir[i]));
      setBit(bCS, dev.co[0]);
      for (let i = 0; i < 3; i++) setBit(bDI[i], dev.di[i]);
      const s = segColeta();
      setT(xRel, dev.relogio());
      setT(xCic, 'ciclo nº ' + fmt(s));
      setT(xLin, fmt(s * 10) + ' linhas');
      setT(xMB, fmt((s * 10 * MEDIA) / 1e6, 1) + ' MB no dia');
      setT(xVT, fmt(dev.p['VT-01'].v, 2) + ' mm/s');
      setT(xE1, 'VT-01 ' + NOMEST[dev.p['VT-01'].est]);
      setT(xE2, 'TT-01 ' + NOMEST[dev.p['TT-01'].est]);
    }
    let cur = null, rot = null;
    function montarPasso(passo) {
      rot = ROT[passo];
      cur = troca((dev.tid + passo) & 0xffff, rot.fc, rot.a, rot.q, rot.exc);
      const lp = 'MBAP │ ' + txtPedido(cur), lr = 'MBAP │ ' + txtResp(cur, 2);
      setT(qPed.t, lp); qPed.w = 12 + lp.length * 5.1; setA(qPed.r, 'width', qPed.w.toFixed(1));
      setT(qResp.t, lr); qResp.w = 12 + lr.length * 5.1; setA(qResp.r, 'width', qResp.w.toFixed(1));
      const c = cur.exc ? cor.trip : cor.ok;
      setA(qResp.r, 'stroke', c); setA(qResp.r, 'fill', rgba(c, 0.14)); setA(qResp.t, 'fill', c);
      const alvoTxt = cur.leitura ? ' @' + S.hex(rot.a) + ' ×' + rot.q : cur.fc > 7 ? ' (0x' + h2(cur.fc) + ')' : '';
      setT(dTit, rot.f + ' · ' + nomeFC(cur.fc) + alvoTxt + ' · transação ' + S.hex(cur.tid));
      setT(dPed, mbap(cur.tid, cur.pedido) + ' │ ' + txtPedido(cur));
      setT(dResp, mbap(cur.tid, cur.resp) + ' │ ' + txtResp(cur, 6));
      setT(dNota, notaTroca(cur, rot));
      const fi = FASES.indexOf(rot.f);
      FASES.forEach((f, i) => { setA(fRe[i], 'display', i === fi ? 'inline' : 'none'); fTxt[i].style.fill = i === fi ? cor.ambar : ''; });
      const si = rot.f === 'FINGERPRINT' ? SONDAS.indexOf(cur.fc) : -1;
      sRe.forEach((r, i) => setA(r, 'display', i === si || (cur.fc === 0x48 && i > 1) ? 'inline' : 'none'));
      setA(reDesc, 'display', rot.f === 'VARRER' ? 'inline' : 'none');
      setA(reCol, 'display', rot.f === 'COLETAR' ? 'inline' : 'none');
    }
    function animar(u, fl) {
      const ida = fl && u < 0.5;
      const est = ida ? 'alerta' : cur.exc ? 'trip' : 'ok';
      const xa = 414, xbP = 876 - qPed.w, xbR = 876 - qResp.w;
      if (fl) {
        const p = lim((u - 0.03) / 0.42, 0, 1), q = lim((u - 0.53) / 0.42, 0, 1);
        setA(qPed.g, 'display', u < 0.47 ? 'inline' : 'none');
        setA(qResp.g, 'display', u >= 0.52 && u < 0.97 ? 'inline' : 'none');
        setA(qPed.g, 'transform', 'translate(' + (xbP + (xa - xbP) * suave(p)).toFixed(1) + ' 0)');
        setA(qResp.g, 'transform', 'translate(' + (xa + (xbR - xa) * suave(q)).toFixed(1) + ' 0)');
      } else {
        setA(qPed.g, 'display', 'inline');
        setA(qResp.g, 'display', 'inline');
        setA(qPed.g, 'transform', 'translate(' + ((xa + xbP) / 2).toFixed(1) + ' 0)');
        setA(qResp.g, 'transform', 'translate(' + ((xa + xbR) / 2).toFixed(1) + ' 0)');
      }
      setA(dResp, 'opacity', ida ? 0.35 : 1);
      setLed(ledD, est);
      for (const fc of [1, 2, 3, 4]) setLed(ledB[fc], cur.leitura && cur.fc === fc ? est : null);
      setLed(ledDesc, rot.f === 'VARRER' ? est : 'ok');
      setLed(ledCol, rot.f === 'COLETAR' ? est : 'ok');
    }
    let passoAnt = -1, cicloAnt = -1, offF = 0;
    function atualizar(dt) {
      const fl = fluida();
      if (fl && dt) { offF -= dt * 30; const o = offF.toFixed(1); for (const p of fluxos) p.style.strokeDashoffset = o; }
      const n = Math.floor(S.t), passo = ((n % ROT.length) + ROT.length) % ROT.length;
      if (passo !== passoAnt) { passoAnt = passo; montarPasso(passo); }
      if (dev.ciclo !== cicloAnt) { cicloAnt = dev.ciclo; valores(); }
      animar(fl ? S.t - n : 0.75, fl);
    }
    atualizar(0);
    return { atualizar };
  });

  // ======================= telas (canvas 4:3) =======================
  // Cada tela é desenhada numa grade virtual de 400 × 300 (posição × w/400 e × h/300) com o texto em N·k: como k nunca
  // passa de w/400, o que cabe na tela de 336 px cabe em todas.

  // ---------------- XCL·01 · bits de FC1 e FC2 ----------------
  // pulso: cada bit que vira de 0 para 1 no ciclo (o AL-01 do dispositivo acende quando VT-01 passa de 5,6)
  const bitsAnt = { c0: dev.co[0], d0: dev.di[0], d1: dev.di[1], d2: dev.di[2] };
  const pulsos = {};
  S.aoCiclo(() => {
    const ag = { c0: dev.co[0], d0: dev.di[0], d1: dev.di[1], d2: dev.di[2] };
    for (const c in ag) { if (ag[c] && !bitsAnt[c]) pulsos[c] = S.t; bitsAnt[c] = ag[c]; }
  });
  const BLOCOS = [
    { fc: 1, nome: 'bobinas', y: 22, m: dev.co, qtd: 1, chave: 'c', doc: 1, tags: ['CS-01'], cores: ['ok'] },
    { fc: 2, nome: 'entradas', y: 104, m: dev.di, qtd: 3, chave: 'd', doc: 10001, tags: ['—', 'AL-01', 'AL-02'], cores: ['ciano', 'alerta', 'alerta'] }
  ];
  function hachura(g, x, y, w, h, c, p) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.strokeStyle = c; g.lineWidth = 1;
    g.beginPath();
    for (let d = -h; d < w; d += p) { g.moveTo(x + d, y + h); g.lineTo(x + d + h, y); }
    g.stroke();
    g.restore();
  }
  S.tela('fc-bits', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), sx = w / 400, sy = h / 300;
    tx(g, 'FC01 bobinas · FC02 entradas discretas', 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.dim });
    tx(g, dev.relogio(), w - 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.dim2, a: 'right' });
    const x0 = 12 * sx, pas = (w - 24 * sx) / 8, cs = Math.min(pas - 8 * sx, 26 * sy);
    const fl = fluida();
    const celulas = [];
    for (const B of BLOCOS) {
      const yt = B.y * sy, yc = (B.y + 28) * sy;
      let by = 0;
      for (let i = 0; i < B.qtd; i++) if (B.m[i]) by |= 1 << i;
      tx(g, nomeFC(B.fc) + ' ' + B.nome + ' @0x0000 ×' + B.qtd, x0, yt + 10 * sy, { px: 9.5 * k, c: cor.ciano, peso: 600 });
      tx(g, 'resposta ' + h2(B.fc) + ' 01 │ ' + h2(by), w - 12 * sx, yt + 10 * sy, { px: 9.5 * k, c: cor.texto, a: 'right' });
      for (let i = 0; i < 8; i++) {
        const cx = x0 + pas * i + pas / 2, x = cx - cs / 2;
        const dado = i < B.qtd, v = dado ? B.m[i] : 0;
        tx(g, 'b' + i, cx, yc - 4 * sy, { px: 8.5 * k, c: i === 0 ? cor.dim : cor.dim2, a: 'center' });
        if (!dado) {
          g.fillStyle = 'rgba(4,9,14,0.6)'; g.fillRect(x, yc, cs, cs);
          hachura(g, x, yc, cs, cs, rgba(cor.dim2, 0.35), 5 * k);
          g.strokeStyle = rgba(cor.eixo, 0.8); g.lineWidth = 1; g.strokeRect(x + 0.5, yc + 0.5, cs - 1, cs - 1);
          tx(g, '0', cx, yc + cs / 2 + 4.5 * k, { px: 12 * k, c: cor.dim2, a: 'center', peso: 600 });
          tx(g, 'sobra', cx, yc + cs + 11 * sy, { px: 8.5 * k, c: cor.dim2, a: 'center' });
        } else {
          const c = cor[B.cores[i]];
          g.fillStyle = v ? rgba(c, 0.28) : 'rgba(4,9,14,0.6)'; g.fillRect(x, yc, cs, cs);
          g.strokeStyle = v ? c : cor.eixo; g.lineWidth = v ? 1.5 : 1; g.strokeRect(x + 0.5, yc + 0.5, cs - 1, cs - 1);
          tx(g, String(v), cx, yc + cs / 2 + 4.5 * k, { px: 12 * k, c: v ? cor.branco : cor.dim, a: 'center', peso: 700 });
          tx(g, S.hex(i), cx, yc + cs + 11 * sy, { px: 8.5 * k, c: cor.dim, a: 'center' });
          tx(g, B.tags[i], cx, yc + cs + 22 * sy, { px: 8.5 * k, c: B.tags[i] === '—' ? cor.dim2 : cor.texto, a: 'center', peso: 600 });
          const ag = S.t - (pulsos[B.chave + i] === undefined ? -99 : pulsos[B.chave + i]);
          if (ag >= 0 && ag < (fl ? 1.2 : 1)) {
            const cr = fl ? ag * 9 * k : 3 * k, al = fl ? 1 - ag / 1.2 : 0.9;
            g.strokeStyle = rgba(c, al); g.lineWidth = 2;
            g.strokeRect(x - cr, yc - cr, cs + 2 * cr, cs + 2 * cr);
          }
        }
        celulas.push([x, yc, cs, B, i]);
      }
    }
    // régua do tamanho do pedido: até 2.000 bits no padrão, o leitor fatia em 1.000
    const ry = 204 * sy, rx0 = 12 * sx, rx1 = w - 12 * sx, rh = 10 * sy;
    const xr = (n) => rx0 + (n / 2000) * (rx1 - rx0);
    tx(g, 'tamanho do pedido (bits)', rx0, ry - 6 * sy, { px: 9 * k, c: cor.dim });
    tx(g, 'leitor: fatias de 1.000', rx1, ry - 6 * sy, { px: 9 * k, c: cor.ambar, a: 'right' });
    g.fillStyle = rgba(cor.ciano, 0.22); g.fillRect(xr(0), ry, xr(1000) - xr(0), rh);
    hachura(g, xr(1000), ry, xr(2000) - xr(1000), rh, rgba(cor.dim2, 0.4), 5 * k);
    S.moldura(g, rx0, ry, rx1 - rx0, rh);
    g.strokeStyle = cor.ambar; g.lineWidth = 2;
    g.beginPath(); g.moveTo(xr(1000), ry - 3 * sy); g.lineTo(xr(1000), ry + rh + 3 * sy); g.stroke();
    [[1, '1', 'left'], [1000, '1.000', 'center'], [2000, '2.000', 'right']].forEach(([n, s, al]) => tx(g, s, al === 'left' ? rx0 : al === 'right' ? rx1 : xr(n), ry + rh + 11 * sy, { px: 8.5 * k, c: n === 1000 ? cor.ambar : cor.dim, a: al }));
    tx(g, 'leitor', (xr(0) + xr(1000)) / 2, ry + rh - 2 * sy, { px: 8.5 * k, c: cor.ciano, a: 'center' });
    tx(g, 'padrão Modbus', (xr(1000) + xr(2000)) / 2, ry + rh - 2 * sy, { px: 8.5 * k, c: cor.dim, a: 'center' });
    // rodapé: o alarme do dispositivo segue VT-01
    const vt = dev.p['VT-01'].v, al1 = vt >= S.REGUA['mm/s'].al;
    tx(g, 'AL-01 liga com VT-01 ≥ 5,6 · VT-01 agora ' + fmt(vt, 2) + ' mm/s', 8 * sx, 254 * sy, { px: 9.5 * k, c: al1 ? cor.alerta : cor.texto });
    tx(g, 'byte lido de b0 (LSB) a b7 · pulso = bit que virou 0→1', 8 * sx, 270 * sy, { px: 9 * k, c: cor.dim2 });
    tx(g, 'este dispositivo pede ×1 e ×3', 8 * sx, 285 * sy, { px: 9 * k, c: cor.dim2 });
    S.mira(g, a, { x: 0, y: 20 * sy, w, h: 170 * sy }, (mx, my) => {
      for (const [x, y, c, B, i] of celulas) {
        if (mx < x - 4 * sx || mx > x + c + 4 * sx || my < y - 14 * sy || my > y + c + 26 * sy) continue;
        if (i >= B.qtd) return [nomeFC(B.fc) + ' · byte 0 · bit b' + i, 'sobra do byte: vem zerada'];
        return [nomeFC(B.fc) + ' · byte 0 · bit b' + i, S.hex(i) + ' (' + String(B.doc + i).padStart(5, '0') + ') · ' + B.tags[i] + ' = ' + B.m[i]];
      }
      return null;
    });
    S.mira(g, a, { x: rx0, y: ry - 4 * sy, w: rx1 - rx0, h: rh + 8 * sy }, (mx) => {
      const n = Math.max(1, Math.round(((mx - rx0) / (rx1 - rx0)) * 2000));
      const f = Math.ceil(n / 1000), b1 = Math.ceil(Math.min(n, 1000) / 8), b2 = Math.ceil(Math.max(0, n - 1000) / 8);
      return ['pedido de ' + fmt(n) + ' bits', 'leitor: ' + f + (f > 1 ? ' pedidos (1.000 + ' + fmt(n - 1000) + ')' : ' pedido'), 'dados: ' + fmt(b1) + (f > 1 ? ' + ' + fmt(b2) : '') + ' bytes'];
    });
  });

  // ---------------- XCL·02 · janela de registradores do comando de sondagem ----------------
  const bin16 = (v) => { const s = (v & 0xffff).toString(2).padStart(16, '0'); return s.slice(0, 4) + ' ' + s.slice(4, 8) + ' ' + s.slice(8, 12) + ' ' + s.slice(12); };
  const NOTA_FORA = { '3:3': 'fora do catálogo', '3:4': 'fora do catálogo', '3:5': 'fora do catálogo', '4:2': 'f32 word baixa', '4:3': 'f32 word alta' };
  S.tela('fc-regs', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), sx = w / 400, sy = h / 300;
    const fc = Math.floor(S.t / 8) % 2 ? 4 : 3, qtd = fc === 3 ? 7 : 5, m = fc === 3 ? dev.hr : dev.ir;
    tx(g, '$ sondar ' + nomeFC(fc) + ' @0x0000 ×' + qtd, 8 * sx, 14 * sy, { px: 11 * k, c: cor.ciano, peso: 600 });
    tx(g, 'resposta ' + h2(fc) + ' ' + h2(qtd * 2) + ' · ' + qtd * 2 + ' bytes', w - 8 * sx, 14 * sy, { px: 10 * k, c: cor.dim2, a: 'right' });
    const col = [[8, 'addr', 'left'], [64, 'hex', 'left'], [148, 'u16', 'right'], [200, 'i16', 'right'], [214, 'ponto', 'left'], [392, 'escala', 'right']];
    for (const [x, s, al] of col) tx(g, s, x * sx, 31 * sy, { px: 10 * k, c: cor.dim2, a: al });
    g.strokeStyle = cor.eixo; g.lineWidth = 1;
    g.beginPath(); g.moveTo(8 * sx, 35 * sy + 0.5); g.lineTo(w - 8 * sx, 35 * sy + 0.5); g.stroke();
    const y0 = 50 * sy, pas = 15.5 * sy;
    for (let i = 0; i < qtd; i++) {
      const y = y0 + i * pas, v = m[i], c = catDe(fc, i), nota = NOTA_FORA[fc + ':' + i];
      const cc = c ? cor.texto : cor.dim;
      tx(g, S.hex(i), 8 * sx, y, { px: 11 * k, c: cor.dim });
      tx(g, h4(v), 64 * sx, y, { px: 11 * k, c: cor.ambar });
      tx(g, String(v), 148 * sx, y, { px: 11 * k, c: cc, a: 'right' });
      tx(g, String(i16(v)).replace('-', '−'), 200 * sx, y, { px: 11 * k, c: i16(v) < 0 ? cor.alerta : cc, a: 'right' });
      tx(g, c ? c.p : nota && nota.indexOf('f32') === 0 ? 'f32' : '—', 214 * sx, y, { px: 11 * k, c: c ? cor.texto : cor.dim2, peso: c ? 600 : 400 });
      tx(g, c ? fmt(S.escU16(c, v), c.max > 100 ? 1 : 2) + ' ' + c.u : nota, 392 * sx, y, { px: 11 * k, c: c ? cor.branco : cor.dim2, a: 'right' });
    }
    // o par 0x0002–0x0003 do FC4 lido como float nas duas ordens: a troca de word
    const ys = 166 * sy;
    g.strokeStyle = cor.eixo;
    g.beginPath(); g.moveTo(8 * sx, ys - 12 * sy + 0.5); g.lineTo(w - 8 * sx, ys - 12 * sy + 0.5); g.stroke();
    tx(g, 'FC04 0x0002–0x0003 · par de 32 bits (float)', 8 * sx, ys, { px: 10.5 * k, c: cor.ciano });
    const wA = dev.ir[2], wB = dev.ir[3];
    const ordens = [['ABCD', wA, wB, 178], ['CDAB', wB, wA, 208]];
    const bw = 42 * sx, bh = 19 * sy;
    const caixas = [];
    for (const [nome, p1, p2, yy] of ordens) {
      const y = yy * sy, val = f32(p1, p2), certo = nome === 'CDAB';
      tx(g, nome, 8 * sx, y + bh / 2 + 4 * k, { px: 11 * k, c: certo ? cor.ok : cor.trip, peso: 600 });
      [p1, p2].forEach((pv, j) => {
        const x = (50 + j * 48) * sx;
        g.fillStyle = 'rgba(4,9,14,0.7)'; g.fillRect(x, y, bw, bh);
        g.strokeStyle = pv === wA ? rgba(cor.ciano, 0.8) : rgba(cor.ambar, 0.8); g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
        tx(g, h4(pv), x + bw / 2, y + bh / 2 + 4 * k, { px: 11 * k, c: cor.branco, a: 'center' });
        caixas.push([x, y, nome, pv === wA ? '0x0002' : '0x0003', pv]);
      });
      tx(g, '→', 150 * sx, y + bh / 2 + 4 * k, { px: 11 * k, c: cor.dim });
      tx(g, certo ? fmt(val, 2) + ' m³/h · vazão' : expo(val) + ' · lixo', 166 * sx, y + bh / 2 + 4 * k, { px: 11 * k, c: certo ? cor.ok : cor.trip, peso: 600 });
    }
    // as duas words trocam de lugar (o X entre as ordens)
    g.strokeStyle = rgba(cor.dim, 0.55); g.lineWidth = 1; g.setLineDash([2, 2]);
    g.beginPath();
    g.moveTo(71 * sx, 178 * sy + bh); g.lineTo(119 * sx, 208 * sy);
    g.moveTo(119 * sx, 178 * sy + bh); g.lineTo(71 * sx, 208 * sy);
    g.stroke(); g.setLineDash([]);
    tx(g, 'troca de word: o dispositivo manda a word baixa primeiro', 8 * sx, 250 * sy, { px: 10 * k, c: cor.dim });
    tx(g, 'escala = mín + cru × (máx − mín) / 65535', 8 * sx, 268 * sy, { px: 10 * k, c: cor.dim2 });
    tx(g, 'cru u16 de 0 a 65535 · i16 acima de 32767 é negativo', 8 * sx, 286 * sy, { px: 10 * k, c: cor.dim2 });
    S.mira(g, a, { x: 0, y: y0 - 11 * sy, w, h: qtd * pas }, (mx, my) => {
      const i = Math.floor((my - (y0 - 11 * sy)) / pas);
      if (i < 0 || i >= qtd) return null;
      const v = m[i], c = catDe(fc, i);
      const l = [S.hex(i) + ' (' + ((fc === 3 ? 40001 : 30001) + i) + ') · u16 ' + v + ' · i16 ' + String(i16(v)).replace('-', '−'), 'bits ' + bin16(v)];
      if (c) l.push(c.p + ' = ' + fmt(c.min) + ' + ' + v + ' × ' + fmt(c.max - c.min) + '/65535 = ' + fmt(S.escU16(c, v), 2) + ' ' + c.u);
      else l.push(NOTA_FORA[fc + ':' + i]);
      return l;
    });
    S.mira(g, a, { x: 50 * sx, y: 178 * sy, w: 90 * sx, h: 30 * sy + bh }, (mx, my) => {
      for (const [x, y, nome, ad, pv] of caixas) if (mx >= x && mx <= x + bw && my >= y && my <= y + bh) return [nome + ' · word de ' + ad, h4(pv) + ' = ' + bin16(pv)];
      return ['ABCD lê 0x0002 como word alta', 'CDAB troca as words e acerta'];
    });
  });

  // ---------------- XCL·03 · autodescoberta: a janela encolhe nas exceções e o fim sai por bissecção ----------------
  // Janela cheia de 96; exceção 02 → 64, 32, 16, 8, 4, 2, 1 até achar dados; achou → avança com a mesma janela e,
  // a cada exceção, corta pela metade até 1 (o fim do bloco). Neste dispositivo: FC3 com 7 registros, FC4 com 5.
  const TENT = [];
  [[3, 7], [4, 5]].forEach(([fc, n]) => {
    let a = 0, q = 96, achou = false;
    while (q >= 1) {
      const ok = a + q <= n, fim = !ok && achou && q === 1;
      TENT.push({ fc, a, q, ok, n, nota: ok ? (achou ? 'absorve' : 'achou dados') : fim ? 'fim do bloco ' + S.hex(a - 1) : achou ? 'bissecção' : 'encolhe' });
      if (ok) { achou = true; a += q; } else q = q === 96 ? 64 : q / 2;
    }
  });
  const BANDAS = [{ fc: 3, nome: 'FC3 retenção', y: 24, n: 7 }, { fc: 4, nome: 'FC4 entrada', y: 98, n: 5 }];
  S.tela('fc-descoberta', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), sx = w / 400, sy = h / 300;
    const fl = fluida(), dur = fl ? 0.75 : 1, hold = fl ? 4 : 3;
    const tl = S.t % (TENT.length * dur + hold), idx = Math.floor(tl / dur), u = fl ? tl / dur - idx : 1;
    const feito = idx >= TENT.length, atual = feito ? -1 : idx, pend = !feito && u < 0.45;
    tx(g, 'varredura FC3 e FC4 · janela 96 → 1', 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.dim });
    tx(g, feito ? 'mapa pronto' : 'tentativa ' + (idx + 1) + '/' + TENT.length, w - 8 * sx, 14 * sy, { px: 9.5 * k, c: feito ? cor.ok : cor.dim2, a: 'right' });
    const xr0 = 10 * sx, L = w - 20 * sx;
    const xa = (ad) => (ad <= 16 ? xr0 + (ad / 16) * L * 0.62 : xr0 + L * 0.65 + ((Math.min(ad, 96) - 16) / 80) * L * 0.35);
    const ate = feito ? TENT.length - 1 : pend ? idx - 1 : idx; // tentativas com resposta já conhecida
    for (const B of BANDAS) {
      // registros achados e fim conhecido, pelas respostas até agora
      let lido = 0, fimOk = false;
      for (let i = 0; i <= ate; i++) { const t = TENT[i]; if (t.fc !== B.fc) continue; if (t.ok) lido = Math.max(lido, t.a + t.q); else if (t.nota.indexOf('fim') === 0) fimOk = true; }
      const yb = B.y * sy, yr = (B.y + 30) * sy, rh = 16 * sy;
      tx(g, B.nome, xr0, yb + 8 * sy, { px: 9.5 * k, c: cor.ciano, peso: 600 });
      tx(g, fimOk ? 'bloco 0x0000–' + S.hex(lido - 1) + ' (' + lido + ')' : lido ? 'achados ' + lido + ' · refinando o fim' : 'procurando dados', w - 10 * sx, yb + 8 * sy, { px: 9 * k, c: fimOk ? cor.ok : lido ? cor.ambar : cor.dim, a: 'right' });
      // trilho: 0x00 a 0x10 em células, 0x10 a 0x60 comprimido
      for (let ad = 0; ad < 16; ad++) {
        const x = xa(ad), cw = xa(ad + 1) - x;
        const no = ad < lido;
        g.fillStyle = no ? rgba(cor.ciano, 0.38) : 'rgba(4,9,14,0.6)';
        g.fillRect(x + 1, yr, cw - 2, rh);
        g.strokeStyle = no ? rgba(cor.ciano, 0.9) : rgba(cor.eixo, 0.9); g.lineWidth = 1;
        g.strokeRect(x + 1.5, yr + 0.5, cw - 3, rh - 1);
        if (fimOk && ad === lido) { g.strokeStyle = cor.trip; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 1, yr - 2 * sy); g.lineTo(x + 1, yr + rh + 2 * sy); g.stroke(); }
      }
      g.fillStyle = 'rgba(4,9,14,0.6)'; g.fillRect(xa(16.001), yr, xa(96) - xa(16.001), rh);
      hachura(g, xa(16.001), yr, xa(96) - xa(16.001), rh, rgba(cor.dim2, 0.25), 6 * k);
      S.moldura(g, xa(16.001), yr, xa(96) - xa(16.001), rh);
      tx(g, '≈', (xa(16) + xa(16.001)) / 2, yr + rh / 2 + 3.5 * k, { px: 10 * k, c: cor.dim2, a: 'center' });
      [[0, '0x00'], [4, '0x04'], [8, '0x08'], [12, '0x0C'], [16, '0x10'], [48, '0x30'], [96, '0x60']].forEach(([ad, s]) => tx(g, s, ad === 96 ? xa(96) : xa(ad), yr + rh + 11 * sy, { px: 8.5 * k, c: cor.dim2, a: ad === 0 ? 'left' : ad === 96 ? 'right' : 'center' }));
      // janela da tentativa do momento
      const t = atual >= 0 ? TENT[atual] : null;
      if (t && t.fc === B.fc) {
        const c = pend ? cor.ambar : t.ok ? cor.ok : cor.trip;
        const x1 = xa(t.a), x2 = xa(Math.min(t.a + t.q, 96));
        g.fillStyle = rgba(c, 0.2); g.fillRect(x1, yr - 4 * sy, x2 - x1, rh + 8 * sy);
        g.strokeStyle = c; g.lineWidth = 2; g.strokeRect(x1 + 1, yr - 4 * sy, x2 - x1 - 2, rh + 8 * sy);
        const rot = '×' + t.q + (pend ? ' …' : t.ok ? ' ok' : ' exceção 02');
        g.font = F(9 * k, 600);
        const lw = g.measureText(rot).width;
        tx(g, rot, Math.min(Math.max(x1, xr0), w - 10 * sx - lw), yr - 7 * sy, { px: 9 * k, c, peso: 600 });
      }
    }
    // registro curto das tentativas
    const yl = 186 * sy, pl = 14 * sy;
    tx(g, 'registro', 8 * sx, yl - 4 * sy, { px: 9 * k, c: cor.dim2 });
    const ultimo = feito ? TENT.length - 1 : idx, prim = Math.max(0, ultimo - 4);
    for (let i = prim; i <= ultimo; i++) {
      const t = TENT[i], y = yl + (i - prim + 1) * pl;
      const esp = i === atual && pend;
      const resp = esp ? '…' : t.ok ? h2(t.fc) + ' ' + h2(t.q * 2) : h2(t.fc | 0x80) + ' 02';
      const pe = (nomeFC(t.fc) + ' @' + S.hex(t.a) + ' ×' + t.q).padEnd(17, ' ');
      tx(g, pe + '→ ' + resp.padEnd(6, ' ') + (esp ? '' : t.nota), 8 * sx, y, { px: 9 * k, c: esp ? cor.ambar : t.ok ? cor.ok : rgba(cor.trip, 0.95) });
    }
    tx(g, feito ? 'mapa: FC3 0x0000–0x0006 (7) · FC4 0x0000–0x0004 (5)' : 'exceção 02 ou 03 do dispositivo → a janela encolhe', 8 * sx, 288 * sy, { px: 9 * k, c: feito ? cor.ciano : cor.dim2, peso: feito ? 600 : 400 });
    for (const B of BANDAS) {
      const yr = (B.y + 30) * sy;
      S.mira(g, a, { x: xr0, y: yr - 6 * sy, w: L, h: 28 * sy }, (mx) => {
        const f = (mx - xr0) / L;
        if (f > 0.62 && f < 0.65) return ['escala comprimida a partir de 0x10'];
        const ad = f <= 0.62 ? Math.floor((f / 0.62) * 16) : 16 + Math.floor(((f - 0.65) / 0.35) * 80);
        const doc = (B.fc === 3 ? 40001 : 30001) + ad;
        return ['FC' + B.fc + ' ' + S.hex(ad) + ' (' + doc + ')', ad < B.n ? 'existe no dispositivo · entra no bloco' : 'não existe: o pedido volta com exceção 02'];
      });
    }
  });

  // ---------------- XCL·04 · cobertura: mapa × catálogo (anel de bancada e os 10 pontos deste dispositivo) ----------------
  const NBANC = 270;
  const DOCS = CAT.map((c) => c.p + ' · ' + nomeFC(c.fn) + ' ' + S.hex(c.addr) + ' (' + String(c.doc).padStart(5, '0') + ')');
  S.tela('fc-cobertura', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), sx = w / 400, sy = h / 300;
    // cruza em 3 s e fica 17 s em 100 % (no modo 1 Hz, sempre 100 %): a tela mostra a prova, não uma falha
    const p = S.modo() === '1hz' ? 1 : lim((S.t % 20) / 3, 0, 1), nAch = Math.round(p * NBANC), pct = Math.round(p * 100);
    tx(g, 'mapa descoberto × catálogo da engenharia', 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.dim });
    tx(g, 'ensaio de bancada', w - 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.dim2, a: 'right' });
    // anel
    const cx = 74 * sx, cy = 104 * sy, R = 52 * Math.min(sx, sy), esp = 10 * k;
    g.lineWidth = esp;
    g.strokeStyle = rgba(cor.eixo, 0.6);
    g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.stroke();
    g.strokeStyle = p >= 1 ? cor.ok : cor.ciano;
    g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + p * 2 * Math.PI); g.stroke();
    tx(g, pct + ' %', cx, cy + 4 * k, { px: 19 * k, c: cor.ambar, a: 'center', peso: 700 });
    tx(g, nAch + '/' + NBANC, cx, cy + 19 * k, { px: 10 * k, c: cor.texto, a: 'center' });
    tx(g, p >= 1 ? 'faltando: 0' : 'cruzando o catálogo…', cx, cy + R + 22 * sy, { px: 10 * k, c: p >= 1 ? cor.ok : cor.ambar, a: 'center', peso: 600 });
    tx(g, '270 pontos do catálogo', cx, cy + R + 36 * sy, { px: 9 * k, c: cor.dim, a: 'center' });
    // grade dos 270 pontos de bancada
    const gx = 150 * sx, gy = 26 * sy, gw = 242 * sx, gh = 168 * sy, nc = 18, nl = 15;
    const cw = gw / nc, ch = gh / nl;
    g.fillStyle = rgba(cor.ciano, 0.55);
    for (let i = 0; i < nAch; i++) g.fillRect(gx + (i % nc) * cw + 1, gy + Math.floor(i / nc) * ch + 1, cw - 2, ch - 2);
    g.fillStyle = 'rgba(4,9,14,0.7)';
    for (let i = nAch; i < NBANC; i++) g.fillRect(gx + (i % nc) * cw + 1, gy + Math.floor(i / nc) * ch + 1, cw - 2, ch - 2);
    if (nAch < NBANC) { const i = nAch; g.strokeStyle = cor.ambar; g.lineWidth = 1.5; g.strokeRect(gx + (i % nc) * cw + 1, gy + Math.floor(i / nc) * ch + 1, cw - 2, ch - 2); }
    S.moldura(g, gx, gy, gw, gh);
    // os 10 pontos deste dispositivo
    const yp = 214 * sy;
    tx(g, 'catálogo de exemplo da demonstração · 10/10', 8 * sx, yp, { px: 9.5 * k, c: cor.ciano, peso: 600 });
    const pw = (384 * sx - 4 * 6 * sx) / 5, ph = 18 * sy;
    CAT.forEach((c, i) => {
      const x = 8 * sx + (i % 5) * (pw + 6 * sx), y = yp + 8 * sy + Math.floor(i / 5) * (ph + 6 * sy);
      g.fillStyle = 'rgba(4,9,14,0.7)'; g.fillRect(x, y, pw, ph);
      g.strokeStyle = rgba(cor.ok, 0.6); g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);
      S.led(g, x + 8 * sx, y + ph / 2, 3 * k, cor.ok);
      tx(g, c.p, x + 16 * sx, y + ph / 2 + 3.5 * k, { px: 9 * k, c: cor.texto, peso: 600 });
    });
    tx(g, 'no mapa, fora do catálogo: 5 registradores', 8 * sx, 290 * sy, { px: 9 * k, c: cor.dim2 });
    S.mira(g, a, { x: gx, y: gy, w: gw, h: gh }, (mx, my) => {
      const i = Math.floor((my - gy) / ch) * nc + Math.floor((mx - gx) / cw);
      if (i < 0 || i >= NBANC) return null;
      return ['ponto ' + (i + 1) + ' de ' + NBANC + ' (bancada)', i < nAch ? 'coberto: está no mapa descoberto' : 'conferindo'];
    });
    S.mira(g, a, { x: 8 * sx, y: yp + 8 * sy, w: 384 * sx, h: 2 * ph + 6 * sy }, (mx, my) => {
      const col = Math.floor((mx - 8 * sx) / (pw + 6 * sx)), lin = Math.floor((my - yp - 8 * sy) / (ph + 6 * sy));
      const i = lin * 5 + col;
      if (col < 0 || col > 4 || lin < 0 || lin > 1) return null;
      return [DOCS[i], 'coberto: no mapa e no catálogo'];
    });
  });

  // ---------------- XCL·05 · coleta cíclica: linha do tempo do dia e o CSV sendo gravado ----------------
  const hm = (seg) => { const m = Math.max(0, Math.round(seg / 60)); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
  const relDe = (seg) => { const z = (n) => String(n).padStart(2, '0'); const t = 8 * 3600 + Math.round(seg); return z(Math.floor(t / 3600)) + ':' + z(Math.floor((t % 3600) / 60)); };
  S.tela('fc-coleta', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), sx = w / 400, sy = h / 300, m = a.mem;
    const s = segColeta(), lin = s * 10;
    tx(g, 'coleta 08:00–17:00 · ciclo 1 s', 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.dim });
    tx(g, 'gravando', w - 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.ok, a: 'right', peso: 600 });
    g.font = F(9.5 * k, 600);
    S.led(g, w - 8 * sx - g.measureText('gravando').width - 8 * k, 10.5 * sy, 3.2 * k, cor.ok);
    // linha do tempo do dia, com o cursor no relógio da coleta e a parada automática às 17:00
    const lx0 = 12 * sx, lx1 = w - 12 * sx, ly = 44 * sy, lh = 12 * sy;
    const xt = (seg) => lx0 + (seg / 32400) * (lx1 - lx0);
    g.fillStyle = rgba(cor.ciano, 0.35); g.fillRect(lx0, ly, xt(s) - lx0, lh);
    g.fillStyle = 'rgba(4,9,14,0.6)'; g.fillRect(xt(s), ly, lx1 - xt(s), lh);
    S.moldura(g, lx0, ly, lx1 - lx0, lh);
    g.strokeStyle = cor.eixo; g.lineWidth = 1;
    for (let hh = 8; hh <= 17; hh++) {
      const x = Math.round(xt((hh - 8) * 3600)) + 0.5;
      g.beginPath(); g.moveTo(x, ly + lh); g.lineTo(x, ly + lh + 3 * sy); g.stroke();
      tx(g, String(hh).padStart(2, '0'), x, ly + lh + 13 * sy, { px: 8.5 * k, c: hh === 17 ? cor.trip : cor.dim2, a: hh === 8 ? 'left' : hh === 17 ? 'right' : 'center' });
    }
    g.fillStyle = cor.trip; g.fillRect(lx1 - 4 * k, ly + lh / 2 - 4 * k, 8 * k, 8 * k);
    tx(g, 'parada automática', lx1, ly - 6 * sy, { px: 8.5 * k, c: cor.trip, a: 'right' });
    const xc = xt(s);
    g.strokeStyle = cor.ambar; g.lineWidth = 2;
    g.beginPath(); g.moveTo(xc, ly - 4 * sy); g.lineTo(xc, ly + lh + 4 * sy); g.stroke();
    g.font = F(9.5 * k, 600);
    const rel = dev.relogio(), rw = g.measureText(rel).width;
    tx(g, rel, lim(xc - rw / 2, lx0, lx1 - rw - 100 * sx), ly - 6 * sy, { px: 9.5 * k, c: cor.ambar, peso: 600 });
    // contadores
    const cont = [['ciclos', fmt(s)], ['linhas no CSV', fmt(lin)], ['arquivo', fmt((lin * MEDIA) / 1e6, 1) + ' MB'], ['até a parada', hm(32400 - s)]];
    cont.forEach(([r, v], i) => {
      const x = 8 * sx + i * 97 * sx;
      tx(g, r, x, 88 * sy, { px: 9.5 * k, c: cor.dim2 });
      tx(g, v, x, 104 * sy, { px: 11.5 * k, c: cor.ambar, peso: 600 });
    });
    // o arquivo do dia e as últimas linhas
    tx(g, 'pontos-' + dev.data + '.csv', 8 * sx, 128 * sy, { px: 9.5 * k, c: cor.ciano, peso: 600 });
    tx(g, '10 pontos por ciclo', w - 8 * sx, 128 * sy, { px: 9 * k, c: cor.dim2, a: 'right' });
    const ay = 134 * sy, ah = h - 6 * sy - ay, pl = 16 * sy;
    g.fillStyle = 'rgba(4,9,14,0.55)'; g.fillRect(6 * sx, ay, w - 12 * sx, ah);
    S.moldura(g, 6 * sx, ay, w - 12 * sx, ah);
    tx(g, 'ts,ponto,doc,fn,addr0,valor_cru,valor_escala,unidade', 10 * sx, ay + 13 * sy, { px: 10 * k, c: cor.dim2 });
    if (m.ciclo !== dev.ciclo) { m.ciclo = dev.ciclo; m.tRol = S.t; }
    const prog = fluida() ? lim((S.t - m.tRol) / 0.45, 0, 1) : 1;
    const off = (1 - suave(prog)) * 10 * pl;
    const y0 = ay + 31 * sy, N = Math.max(1, Math.floor((ay + ah - 4 * sy - y0) / pl) + 1), L = dev.csv;
    g.save();
    g.beginPath(); g.rect(6 * sx, ay + 16 * sy, w - 12 * sx, ah - 17 * sy); g.clip();
    for (let i = Math.max(0, L.length - N - 10); i < L.length; i++) {
      const r = i - (L.length - N), y = y0 + r * pl + off;
      if (y < ay + 14 * sy || y > ay + ah + pl) continue;
      tx(g, L[i], 10 * sx, y, { px: 11 * k, c: i >= L.length - 10 ? cor.texto : cor.dim });
    }
    g.restore();
    S.mira(g, a, { x: lx0, y: ly - 4 * sy, w: lx1 - lx0, h: lh + 8 * sy }, (mx) => {
      const t = Math.round(((mx - lx0) / (lx1 - lx0)) * 32400);
      if (t <= s) return [relDe(t) + ' · ciclo nº ' + fmt(t), fmt(t * 10) + ' linhas até aqui'];
      return [relDe(t) + ' · ainda não coletado', 'falta ' + hm(t - s) + ' até lá'];
    });
    S.mira(g, a, { x: 6 * sx, y: y0 - pl + 3 * sy, w: w - 12 * sx, h: N * pl }, (mx, my) => {
      const r = Math.floor((my - (y0 - pl + 3 * sy)) / pl), i = L.length - N + r;
      if (r < 0 || r >= N || i < 0 || i >= L.length) return null;
      const f = L[i].split(',');
      return [f[1] + ' · ' + f[0].slice(11), 'cru ' + f[5] + ' → ' + f[6].replace('.', ',') + ' ' + f[7], nomeFC(+f[3]) + ' · addr0 ' + f[4] + ' · doc ' + f[2]];
    });
  });

  // ---------------- XCL·06 · fingerprint: as 9 sondas (FC07 padrão; FC65 a FC72 do fabricante) e a resposta crua de cada uma ----------------
  const SONDA_TID = 0x0030;
  S.tela('fc-assinatura', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), sx = w / 400, sy = h / 300;
    const fl = fluida(), dur = fl ? 0.9 : 1, hold = 4;
    const tl = S.t % (SONDAS.length * dur + hold), idx = Math.floor(tl / dur), u = fl ? tl / dur - idx : 1;
    const feito = idx >= SONDAS.length, pend = !feito && u < 0.45;
    const nResp = feito ? SONDAS.length : pend ? idx : idx + 1; // sondas com resposta já recebida
    tx(g, 'sondas · FC07 (padrão) e FC65 a FC72 (do fabricante)', 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.dim });
    tx(g, 'unit 255', w - 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.dim2, a: 'right' });
    const y0 = 34 * sy, pl = 14.2 * sy;
    tx(g, 'função', 8 * sx, y0 - 4 * sy, { px: 8.5 * k, c: cor.dim2 });
    tx(g, 'pedido → resposta', 110 * sx, y0 - 4 * sy, { px: 8.5 * k, c: cor.dim2 });
    SONDAS.forEach((fc, i) => {
      const y = y0 + (i + 1) * pl, ok = fc === 7;
      const resp = ok ? '07 00' : h2(fc | 0x80) + ' 01';
      const tem = i < nResp, esp = !feito && i === idx && pend;
      const c = tem ? (ok ? cor.ok : cor.trip) : esp ? cor.ambar : cor.dim2;
      if (!feito && i === idx) { g.fillStyle = rgba(cor.ambar, 0.08); g.fillRect(4 * sx, y - 10 * sy, w - 8 * sx, pl); }
      tx(g, nomeFC(fc), 8 * sx, y, { px: 9.5 * k, c: tem || esp ? cor.texto : cor.dim2, peso: 600 });
      tx(g, '0x' + h2(fc), 50 * sx, y, { px: 9 * k, c: cor.dim });
      tx(g, h2(fc) + ' → ' + (tem ? resp : esp ? '…' : '—'), 110 * sx, y, { px: 9.5 * k, c: tem ? cor.branco : c });
      tx(g, tem ? (ok ? 'responde' : 'exceção 01 · negada') : esp ? 'aguardando' : '', 214 * sx, y, { px: 9 * k, c });
      if (tem) S.led(g, w - 14 * sx, y - 3.5 * k, 3.4 * k, c);
    });
    // o quadro cru da sonda do momento (ou da última)
    const j = Math.min(idx, SONDAS.length - 1), fc = SONDAS[j], tid = (SONDA_TID + j) & 0xffff, ok = fc === 7;
    const by = 176 * sy, bh = 66 * sy;
    g.fillStyle = 'rgba(4,9,14,0.7)'; g.fillRect(6 * sx, by, w - 12 * sx, bh);
    g.strokeStyle = pend ? cor.ambar : ok ? rgba(cor.ok, 0.7) : rgba(cor.trip, 0.7); g.lineWidth = 1; g.strokeRect(6 * sx + 0.5, by + 0.5, w - 12 * sx - 1, bh - 1);
    tx(g, 'quadro cru · sonda ' + (j + 1) + '/9 · transação ' + S.hex(tid), 12 * sx, by + 13 * sy, { px: 9 * k, c: cor.dim });
    tx(g, 'pedido   ' + h4(tid) + ' 0000 0002 FF │ ' + h2(fc), 12 * sx, by + 29 * sy, { px: 9.5 * k, c: cor.ambar });
    const rr = ok ? '07 00' : h2(fc | 0x80) + ' 01';
    tx(g, 'resposta ' + (pend ? '…' : h4(tid) + ' 0000 0003 FF │ ' + rr), 12 * sx, by + 44 * sy, { px: 9.5 * k, c: pend ? cor.dim2 : ok ? cor.ok : cor.trip });
    tx(g, ok ? 'FC07: 1 byte de estado (00) · comprimento 3' : h2(fc | 0x80) + ' = ' + h2(fc) + ' | 0x80 · exceção 01: função negada', 12 * sx, by + 59 * sy, { px: 9 * k, c: cor.dim });
    // resumo
    const neg = Math.max(0, nResp - 1), resp1 = nResp > 0 ? 1 : 0;
    const ys = 266 * sy;
    tx(g, resp1 + ' responde', 8 * sx, ys, { px: 12 * k, c: cor.ok, peso: 700 });
    g.font = F(12 * k, 700);
    const w1 = g.measureText(resp1 + ' responde').width;
    tx(g, ' · ', 8 * sx + w1, ys, { px: 12 * k, c: cor.dim2, peso: 700 });
    tx(g, neg + ' negadas', 8 * sx + w1 + g.measureText(' · ').width, ys, { px: 12 * k, c: cor.trip, peso: 700 });
    const cw = 15 * sx, cx0 = w - 8 * sx - 9 * cw;
    SONDAS.forEach((f, i) => {
      g.fillStyle = i < nResp ? (f === 7 ? rgba(cor.ok, 0.75) : rgba(cor.trip, 0.75)) : 'rgba(4,9,14,0.7)';
      g.fillRect(cx0 + i * cw + 1, ys - 11 * sy, cw - 2, 13 * sy);
    });
    S.moldura(g, cx0, ys - 12 * sy, 9 * cw, 15 * sy);
    tx(g, 'assinatura que vai para o comissionamento e a auditoria', 8 * sx, 289 * sy, { px: 8.5 * k, c: cor.dim2 });
    S.mira(g, a, { x: 0, y: y0 + 2 * sy, w, h: SONDAS.length * pl }, (mx, my) => {
      const i = Math.floor((my - y0 - 2 * sy) / pl);
      if (i < 0 || i >= SONDAS.length) return null;
      const f = SONDAS[i];
      return f === 7 ? ['FC07 (0x07) · ler estado de exceção', 'resposta 07 00 · 1 byte de estado', 'o dispositivo responde'] : [nomeFC(f) + ' (0x' + h2(f) + ') · definida pelo fabricante', 'resposta ' + h2(f | 0x80) + ' 01 = exceção 01', 'o dispositivo nega a função'];
    });
  });

  // ---------------- XCL·07 · mesa em miniatura: conexão, botões, estatísticas, alarmes do dia e série de VT-01 ----------------
  const BOTOES = ['Ligar', 'Sondar', 'Fingerprint', 'Varrer', 'Coletar/Parar'];
  const ALARMES = [['13', 'contagens', 'texto'], ['2', 'não reconhecidos', 'trip'], ['1', 'excluído na janela', 'alerta'], ['4', 'alarmes novos', 'ciano']];
  const LEIT = [['VT-01', 'mm/s', 2], ['VT-02', 'mm/s', 2], ['TT-01', '°C', 1]];
  S.tela('fc-mesa', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), sx = w / 400, sy = h / 300;
    g.fillStyle = 'rgba(4,9,14,0.8)'; g.fillRect(0, 0, w, 22 * sy);
    tx(g, '127.0.0.1:502 · unit 255', 8 * sx, 15 * sy, { px: 9.5 * k, c: cor.dim });
    tx(g, 'ligado · ciclo 1 s', w - 8 * sx, 15 * sy, { px: 9.5 * k, c: cor.ok, a: 'right', peso: 600 });
    g.font = F(9.5 * k, 600);
    S.led(g, w - 8 * sx - g.measureText('ligado · ciclo 1 s').width - 8 * k, 11.5 * sy, 3.2 * k, cor.ok);
    const bw = (384 * sx - 4 * 5 * sx) / 5, bh = 18 * sy;
    BOTOES.forEach((b, i) => {
      const x = 8 * sx + i * (bw + 5 * sx), y = 28 * sy, at = i === 4, lig = i === 0;
      g.fillStyle = at ? rgba(cor.ambar, 0.14) : 'rgba(4,9,14,0.7)'; g.fillRect(x, y, bw, bh);
      g.strokeStyle = at ? cor.ambar : lig ? rgba(cor.ok, 0.7) : cor.eixo; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
      tx(g, b, x + bw / 2, y + bh / 2 + 3.2 * k, { px: 8.5 * k, c: at ? cor.ambar : lig ? cor.ok : cor.texto, a: 'center', peso: at ? 600 : 400 });
    });
    const s = segColeta();
    const est = [['ciclos', fmt(s), cor.ambar], ['leituras', fmt(s * 10), cor.ambar], ['falhas', '0', cor.ok], ['cobertura', '10/10', cor.ok]];
    const tw = (384 * sx - 3 * 6 * sx) / 4;
    est.forEach(([r, v, c], i) => {
      const x = 8 * sx + i * (tw + 6 * sx), y = 54 * sy;
      g.fillStyle = 'rgba(4,9,14,0.6)'; g.fillRect(x, y, tw, 38 * sy);
      S.moldura(g, x, y, tw, 38 * sy);
      tx(g, r, x + 6 * sx, y + 12 * sy, { px: 8.5 * k, c: cor.dim2 });
      tx(g, v, x + 6 * sx, y + 31 * sy, { px: 13 * k, c, peso: 600 });
    });
    tx(g, 'resumo de alarmes do dia', 8 * sx, 104 * sy, { px: 8.5 * k, c: cor.dim2 });
    ALARMES.forEach(([n, r, c], i) => {
      const x = 8 * sx + (i % 2) * 196 * sx, y = (119 + Math.floor(i / 2) * 15) * sy;
      tx(g, n, x, y, { px: 11 * k, c: cor[c], peso: 700 });
      g.font = F(11 * k, 700);
      tx(g, r, x + g.measureText(n + ' ').width, y, { px: 9.5 * k, c: cor.dim });
    });
    // linhas de leitura
    g.strokeStyle = cor.eixo; g.lineWidth = 1;
    g.beginPath(); g.moveTo(8 * sx, 146 * sy + 0.5); g.lineTo(w - 8 * sx, 146 * sy + 0.5); g.stroke();
    LEIT.forEach(([tag, u, cs], i) => {
      const x = 8 * sx + i * 128 * sx, pq = dev.p[tag];
      tx(g, tag, x, 162 * sy, { px: 9.5 * k, c: cor.ambar, peso: 700 });
      g.font = F(9.5 * k, 700);
      tx(g, fmt(pq.v, cs) + ' ' + u, x + g.measureText(tag + ' ').width, 162 * sy, { px: 9.5 * k, c: pq.est === 'ok' ? cor.branco : S.estadoCor(pq.est) });
    });
    // série ao vivo de VT-01 (3 minutos, um valor por ciclo) com o alerta 5,6 e o alarme 7,1
    const q = dev.p['VT-01'], H = q.hist, n = H.length;
    const l = 30 * sx, r = w - 10 * sx, t = 190 * sy, b = h - 22 * sy, vmin = 2, vmax = 8;
    const yv = (v) => b - ((lim(v, vmin, vmax) - vmin) / (vmax - vmin)) * (b - t);
    const xi = (i) => r - ((n - 1 - i) / 179) * (r - l);
    tx(g, 'VT-01 · mm/s · 3 min', l, t - 8 * sy, { px: 9.5 * k, c: cor.ciano, peso: 600 });
    tx(g, fmt(q.v, 2), r, t - 7 * sy, { px: 13 * k, c: S.estadoCor(q.est), a: 'right', peso: 700 });
    S.moldura(g, l, t, r - l, b - t);
    for (const v of [2, 4, 6, 8]) tx(g, String(v), l - 4 * sx, yv(v) + 3 * k, { px: 8.5 * k, c: cor.dim, a: 'right' });
    for (const [v, c, tr] of [[5.6, cor.alerta, [4, 3]], [7.1, cor.trip, []]]) S.linha(g, [[l, yv(v)], [r, yv(v)]], rgba(c, 0.8), 1, tr);
    tx(g, '5,6', r - 3 * sx, yv(5.6) - 3 * sy, { px: 8.5 * k, c: cor.alerta, a: 'right' });
    tx(g, '7,1', r - 3 * sx, yv(7.1) - 3 * sy, { px: 8.5 * k, c: cor.trip, a: 'right' });
    if (n > 1) {
      g.save(); g.beginPath(); g.rect(l, t, r - l, b - t); g.clip();
      g.beginPath();
      for (let i = 0; i < n; i++) { const X = xi(i), Y = yv(H[i]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
      g.strokeStyle = cor.ciano; g.lineWidth = 1.5; g.stroke();
      g.restore();
      S.led(g, xi(n - 1), yv(H[n - 1]), 2.6 * k, cor.branco);
    }
    [['−3 min', l, 'left'], ['−2', l + (r - l) / 3, 'center'], ['−1', l + (2 * (r - l)) / 3, 'center'], ['agora', r, 'right']].forEach(([s_, x, al]) => tx(g, s_, x, b + 12 * sy, { px: 8.5 * k, c: cor.dim2, a: al }));
    S.mira(g, a, { x: l, y: t, w: r - l, h: b - t }, (mx) => {
      if (n < 2) return null;
      const i = lim(Math.round(n - 1 - ((r - mx) / (r - l)) * 179), 0, n - 1), v = H[i];
      return [(i === n - 1 ? 'agora' : '−' + (n - 1 - i) + ' s') + ' · VT-01 ' + fmt(v, 2) + ' mm/s', v >= 7.1 ? 'acima do alarme 7,1' : v >= 5.6 ? 'acima do alerta 5,6' : 'abaixo do alerta 5,6'];
    });
  });

  // ---------------- XCL·08 · régua do X·1: BOM / ATENÇÃO / AÇÃO, severidade, pontos vivos e o desvio do normal ----------------
  // normal aprendido (μ ± σ) só onde o laudo da página o publica: VT-01 4,60 ± 0,55 e TT-01 60,2 ± 1,8
  const PTS = [{ p: 'VT-01', d: 'mancal A · X', u: 'mm/s', v0: 0, v1: 10, cs: 2, nm: [4.6, 0.55] }, { p: 'VT-02', d: 'mancal A · Y', u: 'mm/s', v0: 0, v1: 10, cs: 2 }, { p: 'TT-01', d: 'mancal A', u: '°C', v0: 40, v1: 100, cs: 1, nm: [60.2, 1.8] }];
  const MU = 2.9, SG = 0.32, HOJE = 4.18;
  const SINO = new Float32Array(81);
  for (let i = 0; i <= 80; i++) { const v = 2 + (i / 80) * 4, z = (v - MU) / SG; SINO[i] = Math.exp(-0.5 * z * z); }
  function zonas(g, x0, x1, y, hh, v0, v1, r, al) {
    const xv = (v) => x0 + ((v - v0) / (v1 - v0)) * (x1 - x0);
    g.fillStyle = rgba(cor.ok, al); g.fillRect(x0, y, xv(r.al) - x0, hh);
    g.fillStyle = rgba(cor.alerta, al + 0.05); g.fillRect(xv(r.al), y, xv(r.alarme) - xv(r.al), hh);
    g.fillStyle = rgba(cor.trip, al + 0.05); g.fillRect(xv(r.alarme), y, x1 - xv(r.alarme), hh);
    S.moldura(g, x0, y, x1 - x0, hh);
    return xv;
  }
  const estDe = (v, r) => (v >= r.alarme ? 'alarme' : v >= r.al ? 'alerta' : 'ok');
  S.tela('fc-x1', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), sx = w / 400, sy = h / 300, RV = S.REGUA['mm/s'];
    tx(g, 'régua X·1 · vibração mm/s', 8 * sx, 14 * sy, { px: 9.5 * k, c: cor.dim });
    tx(g, 'severidade 1–4 · 4 = mais severo', w - 8 * sx, 14 * sy, { px: 9 * k, c: cor.dim2, a: 'right' });
    // régua grande: o par clássico alerta 5,6 / alarme 7,1 = severidade 2 / 4
    const rx0 = 12 * sx, rx1 = w - 12 * sx, ry = 36 * sy, rh = 16 * sy;
    const xv = zonas(g, rx0, rx1, ry, rh, 0, 10, RV, 0.28);
    [['BOM', 2.8, cor.ok], ['ATENÇÃO', 6.35, cor.alerta], ['AÇÃO', 8.55, cor.trip]].forEach(([s_, v, c]) => tx(g, s_, xv(v), ry + rh / 2 + 3.2 * k, { px: 8.5 * k, c, a: 'center', peso: 700 }));
    tx(g, '5,6 · sev 2', xv(5.6) - 3 * sx, ry - 4 * sy, { px: 8.5 * k, c: cor.alerta, a: 'right', peso: 600 });
    tx(g, '7,1 · sev 4', xv(7.1) + 3 * sx, ry - 4 * sy, { px: 8.5 * k, c: cor.trip, peso: 600 });
    for (const v of [0, 2, 4, 6, 8, 10]) tx(g, String(v), xv(v), ry + rh + 11 * sy, { px: 8.5 * k, c: cor.dim2, a: v === 0 ? 'left' : v === 10 ? 'right' : 'center' });
    // pontos vivos, cada um na própria régua
    const yp = 84 * sy, pl = 22 * sy, mx0 = 62 * sx, mx1 = 236 * sx;
    PTS.forEach((P, i) => {
      const q = dev.p[P.p], r = S.REGUA[P.u], y = yp + i * pl;
      tx(g, P.p, 8 * sx, y + 4 * sy, { px: 9.5 * k, c: cor.texto, peso: 600 });
      const xm = zonas(g, mx0, mx1, y - 5 * sy, 10 * sy, P.v0, P.v1, r, 0.22);
      if (P.nm) {
        const a1 = xm(P.nm[0] - P.nm[1]), a2 = xm(P.nm[0] + P.nm[1]), am = xm(P.nm[0]), yn = y + 8 * sy;
        S.linha(g, [[a1, yn - 3 * sy], [a1, yn], [a2, yn], [a2, yn - 3 * sy]], rgba(cor.ciano, 0.9), 1.2);
        S.linha(g, [[am, yn - 3 * sy], [am, yn + 2 * sy]], rgba(cor.ciano, 0.9), 1.2);
      }
      const X = xm(lim(q.v, P.v0, P.v1));
      g.fillStyle = cor.branco;
      g.beginPath(); g.moveTo(X, y - 6 * sy); g.lineTo(X - 4 * k, y - 11 * sy); g.lineTo(X + 4 * k, y - 11 * sy); g.closePath(); g.fill();
      g.fillRect(X - 1, y - 6 * sy, 2, 12 * sy);
      tx(g, fmt(q.v, P.cs) + ' ' + P.u, 312 * sx, y + 4 * sy, { px: 9.5 * k, c: cor.branco, a: 'right' });
      const c = S.estadoCor(q.est), nm = NOMEST[q.est];
      g.font = F(8.5 * k, 700);
      const pw = g.measureText(nm).width + 10 * k, px = w - 8 * sx - pw;
      g.fillStyle = rgba(c, 0.14); g.fillRect(px, y - 7 * sy, pw, 14 * sy);
      g.strokeStyle = rgba(c, 0.7); g.lineWidth = 1; g.strokeRect(px + 0.5, y - 7 * sy + 0.5, pw - 1, 14 * sy - 1);
      tx(g, nm, px + pw / 2, y + 3 * sy, { px: 8.5 * k, c, a: 'center', peso: 700 });
    });
    tx(g, 'normal aprendido (laudo): VT-01 4,60 ± 0,55 · TT-01 60,2 ± 1,8', 8 * sx, 146 * sy, { px: 8.5 * k, c: cor.ciano });
    // o caso do laudo: VT-03 sai do próprio normal e acende AÇÃO antes de tocar o alerta 5,6
    const yc = 164 * sy;
    tx(g, 'caso do laudo · VT-03 · mancal B', 8 * sx, yc, { px: 9.5 * k, c: cor.ciano, peso: 600 });
    const bl = 12 * sx, br = w - 12 * sx, bt = yc + 10 * sy, bb = 252 * sy;
    const xb = (v) => bl + ((v - 2) / 4) * (br - bl);
    S.moldura(g, bl, bt, br - bl, bb - bt);
    g.beginPath(); g.moveTo(xb(2), bb);
    for (let i = 0; i <= 80; i++) g.lineTo(xb(2 + (i / 80) * 4), bb - SINO[i] * (bb - bt) * 0.82);
    g.lineTo(xb(6), bb); g.closePath();
    g.fillStyle = rgba(cor.ok, 0.18); g.fill();
    g.strokeStyle = rgba(cor.ok, 0.85); g.lineWidth = 1.3; g.stroke();
    for (const [z, s_] of [[-2, '−2σ'], [2, '+2σ'], [3, '+3σ']]) {
      const X = xb(MU + z * SG);
      S.linha(g, [[X, bt + 12 * sy], [X, bb]], rgba(cor.dim, 0.6), 1, [2, 3]);
      tx(g, s_, X, bt + 10 * sy, { px: 8.5 * k, c: cor.dim2, a: 'center' });
    }
    S.linha(g, [[xb(5.6), bt], [xb(5.6), bb]], cor.alerta, 1.2, [4, 3]);
    tx(g, 'alerta 5,6', xb(5.6) - 3 * sx, bb - 5 * sy, { px: 8.5 * k, c: cor.alerta, a: 'right' });
    tx(g, 'não tocado', xb(5.6) - 3 * sx, bb - 16 * sy, { px: 8.5 * k, c: cor.alerta, a: 'right' });
    const XH = xb(HOJE);
    S.linha(g, [[XH, bt + 14 * sy], [XH, bb]], cor.trip, 2);
    S.led(g, XH, bb - 2 * sy, 3.4 * k, cor.trip);
    tx(g, 'hoje 4,18', XH + 4 * sx, bt + 24 * sy, { px: 9 * k, c: cor.trip, peso: 600 });
    tx(g, 'z +4,0', XH + 4 * sx, bt + 36 * sy, { px: 9 * k, c: cor.trip, peso: 600 });
    for (const v of [2, 3, 4, 5, 6]) tx(g, String(v), xb(v), bb + 11 * sy, { px: 8.5 * k, c: cor.dim2, a: v === 2 ? 'left' : v === 6 ? 'right' : 'center' });
    tx(g, 'normal 2,90 ± 0,32 · hoje 4,18 · z +4,0 →', 8 * sx, 279 * sy, { px: 9 * k, c: cor.texto });
    g.font = F(9 * k);
    tx(g, 'AÇÃO', 8 * sx + g.measureText('normal 2,90 ± 0,32 · hoje 4,18 · z +4,0 → ').width, 279 * sy, { px: 9 * k, c: cor.trip, peso: 700 });
    tx(g, 'o desvio do próprio normal acende antes do limite', 8 * sx, 293 * sy, { px: 8.5 * k, c: cor.dim2 });
    S.mira(g, a, { x: rx0, y: ry - 2 * sy, w: rx1 - rx0, h: rh + 4 * sy }, (mx) => {
      const v = ((mx - rx0) / (rx1 - rx0)) * 10, e = estDe(v, RV);
      return [fmt(v, 2) + ' mm/s', e === 'ok' ? 'BOM · abaixo do alerta 5,6' : e === 'alerta' ? 'ATENÇÃO · severidade 2 (alerta 5,6)' : 'AÇÃO · severidade 4 (alarme 7,1)'];
    });
    S.mira(g, a, { x: 0, y: yp - 12 * sy, w, h: 3 * pl }, (mx, my) => {
      const i = Math.floor((my - yp + 12 * sy) / pl);
      if (i < 0 || i > 2) return null;
      const P = PTS[i], q = dev.p[P.p], r = S.REGUA[P.u];
      const l = [P.p + ' · ' + P.d, 'agora ' + fmt(q.v, P.cs) + ' ' + P.u + ' · ' + NOMEST[q.est], 'alerta ' + fmt(r.al, P.cs === 2 ? 1 : 0) + ' · alarme ' + fmt(r.alarme, P.cs === 2 ? 1 : 0) + ' ' + P.u];
      if (P.nm) l.push('normal ' + fmt(P.nm[0], P.cs) + ' ± ' + fmt(P.nm[1], P.cs) + ' · z ' + fmt((q.v - P.nm[0]) / P.nm[1], 1));
      return l;
    });
    S.mira(g, a, { x: bl, y: bt, w: br - bl, h: bb - bt }, (mx) => {
      const v = 2 + ((mx - bl) / (br - bl)) * 4, z = (v - MU) / SG;
      return [fmt(v, 2) + ' mm/s · z ' + (z >= 0 ? '+' : '') + fmt(z, 1), v >= 5.6 ? 'acima do alerta 5,6' : z > 3 ? 'além de +3σ do normal aprendido' : z > 2 ? 'entre +2σ e +3σ' : z >= -2 ? 'dentro de ±2σ do normal' : 'abaixo de −2σ'];
    });
  });
})();
