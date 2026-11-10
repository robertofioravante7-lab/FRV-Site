// FRV XcoInit · sala de controle · seção "A máquina, em movimento" (#visao), 10/11/2026.
// Desenha o sinótico SVG do Trem B em vista de planta: motor de indução → acoplamento → compressor alternativo de
// dois estágios balanceado-oposto (cárter em corte com o virabrequim de 2 manivelas a 180°, bielas, cruzetas, hastes,
// gaxetas, cilindros horizontais opostos, válvulas e intercooler), os 8 pontos com sensor, LED, caixa e balão, o cabo
// até o dispositivo de monitoramento e o Modbus/TCP até o painel FRV XCOINIT. Valores ilustrativos, gerados aqui.
'use strict';
(function () {
  const S = window.XcoSala;
  if (!S || !S.sinotico || !S.el) return;

  // ---------------- geometria (unidades do viewBox 1400 × 600) ----------------
  const YA = 300; // eixo do trem
  const R = 20, L = 64, LH = 84; // raio da manivela, biela e haste (cruzeta → centro do pistão)
  const UREF = 64; // posição de desenho da cruzeta (o grupo móvel anda a partir dela)
  const T1 = 454, T2 = 603; // manivelas do est. 1 (lado norte, para cima) e do est. 2 (lado sul, para baixo)
  const D1 = 116, D2 = 84; // diâmetro (largura em planta) dos cilindros: est. 1 maior
  const CX = 112, CY = 448; // corte A–A
  const CR = 16, CL = 52; // manivela e biela no corte (mesma razão biela/manivela da planta)
  const ETH0 = 1062, ETH1 = 1116, ETHY = 300; // cabo Ethernet entre o dispositivo e o painel

  // os oito pontos (tags da série 100: o Trem B é outra máquina; o Trem A do supervisório usa 201/301), na ordem dos
  // balões: 1 a 4 nas caixas de cima e 5 a 8 nas de baixo, da esquerda para a direita (ajuste de 10/11/2026).
  // base, casas, unidade, faixa do passeio (±), subtítulo e estado
  const PONTOS = [
    { n: 1, tag: 'ST-101', base: 596, d: 0, u: 'rpm', amp: 0.002, sub: 'acoplamento · rasgo' }, // 12 polos em 60 Hz (10/11/2026)
    { n: 2, tag: 'XT-103', base: 0.42, d: 2, u: 'mm', amp: 0.018, sub: 'queda de haste est. 1', alerta: true },
    { n: 3, tag: 'VT-102', base: 4.18, d: 2, u: 'mm/s', amp: 0.02, sub: 'cárter · manivela 2' },
    { n: 4, tag: 'XT-101 ax', base: 0.2, d: 2, u: 'mm', amp: 0.02, sub: 'axial · ponta livre' },
    { n: 5, tag: 'XT-102', base: 0.15, d: 2, u: 'mm', amp: 0.02, sub: 'radial · motor LA' },
    { n: 6, tag: 'TT-101', base: 58.4, d: 1, u: '°C', amp: 0.012, sub: 'mancal principal A' },
    { n: 7, tag: 'VT-101', base: 4.82, d: 2, u: 'mm/s', amp: 0.02, sub: 'cárter · manivela 1' },
    // gás na descarga do est. 2, logo depois das válvulas: é a temperatura que denuncia válvula vazando (10/11/2026)
    { n: 8, tag: 'TT-102', base: 118.4, d: 1, u: '°C', amp: 0.012, sub: 'descarga est. 2' }
  ];
  const ATENCAO_RD = 0.4; // limite ilustrativo de atenção da queda de haste (mm)

  S.sinotico('trem-b', (alvo, S) => {
    const cor = S.cor, el = S.el, fmt = S.fmt;
    const PTS = PONTOS.map((p) => Object.assign({}, p)); // cópia por montagem: guarda os elementos e o passeio de cada ponto
    const svg = el('svg', { viewBox: '0 0 1400 600', class: 'sv-svg', 'aria-hidden': 'true', focusable: 'false' }, alvo);
    const G = (pai, cl) => el('g', cl ? { class: cl } : {}, pai || svg);
    const R_ = (pai, x, y, w, h, cl, extra) => el('rect', Object.assign({ x, y, width: w, height: h, class: cl }, extra || {}), pai);
    // texto com atributos (sem classe) ou com uma classe do supervisório
    function Tx(pai, x, y, s, o) {
      o = o || {};
      const at = { x, y };
      if (o.cl) at.class = o.cl;
      else Object.assign(at, { 'font-family': S.MONO, 'font-size': o.px || 10, 'font-weight': o.peso || 400, fill: o.c || cor.dim });
      if (o.a) at['text-anchor'] = o.a;
      if (o.ls) at['letter-spacing'] = o.ls;
      if (o.tr) at.transform = o.tr;
      const e = el('text', at, pai);
      e.textContent = s;
      return e;
    }
    const yU = (d, u) => YA + d * u; // posição em planta a partir do eixo (d = −1 norte, +1 sul)
    const faixa = (d, u1, u2) => { const a = yU(d, u1), b = yU(d, u2); return [Math.min(a, b), Math.abs(b - a)]; };
    const mov = {}; // elementos que o atualizar mexe

    // camadas: máquina; fios por cima dela e por baixo dos tubos (o cabo passa por baixo da tubulação); sensores e textos
    const gMaq = G(svg, 'tb-maq');
    const gFios = G(svg, 'tb-fios');
    const gTubos = G(svg, 'tb-tubos');
    const gSen = G(svg, 'tb-sensores');
    const gTxt = G(svg, 'tb-rotulos');

    // ================= MOTOR de indução (planta) =================
    R_(gMaq, 30, YA - 44, 16, 88, 'sv-pedestal', { rx: 6 }); // tampa do ventilador
    for (const [x, y] of [[58, YA - 66], [190, YA - 66], [58, YA + 58], [190, YA + 58]]) R_(gMaq, x, y, 24, 8, 'sv-pedestal');
    R_(gMaq, 44, YA - 58, 184, 116, 'sv-carcaca', { rx: 10 });
    for (let y = YA - 50; y <= YA + 50; y += 8) {
      if (Math.abs(y - YA) < 8) continue;
      el('line', { x1: 54, y1: y, x2: 218, y2: y, stroke: cor.eixo, 'stroke-opacity': 0.55, 'stroke-width': 1.4 }, gMaq);
    }
    R_(gMaq, 104, YA - 80, 60, 22, 'sv-pedestal', { rx: 3 }); // caixa de ligação
    R_(gMaq, 228, YA - 24, 18, 48, 'sv-mancal', { rx: 3 }); // mancal do lado acoplado (LA)
    R_(gMaq, 230, YA - 9, 14, 3, 'sv-sapata');
    R_(gMaq, 230, YA + 6, 14, 3, 'sv-sapata');
    R_(gMaq, 244, YA - 6, 30, 12, 'sv-eixo');

    // ================= acoplamento (cubo com rasgo para a ST-101) =================
    R_(gMaq, 272, YA - 15, 10, 30, 'sv-cubo', { rx: 2 });
    R_(gMaq, 282, YA - 7, 36, 14, 'sv-eixo');
    R_(gMaq, 318, YA - 15, 10, 30, 'sv-cubo', { rx: 2 });
    mov.rasgo = R_(gMaq, 273, YA - 2, 8, 4, 'sv-entalhe');
    R_(gMaq, 328, YA - 6, 20, 12, 'sv-eixo');

    // ================= COMPRESSOR: cárter em corte com o virabrequim =================
    R_(gMaq, 346, YA - 48, 354, 96, 'sv-carcaca', { rx: 8 });
    R_(gMaq, 356, YA - 38, 334, 76, 'sv-interno', { rx: 4 });
    // eixo entre os mancais e a ponta livre (passa da parede para a sonda axial)
    for (const [a, b] of [[346, 426], [482, 575], [631, 712]]) R_(gMaq, a, YA - 6, b - a, 12, 'sv-eixo');
    // manivelas: braços (com contrapeso) e moente; o braço e o moente andam em planta com r·cos θ
    mov.bracos = [];
    mov.moentes = [];
    for (const [T, d] of [[T1, -1], [T2, 1]]) {
      const bs = [R_(gMaq, T - 28, YA - 8, 10, 16, 'sv-cubo', { rx: 2 }), R_(gMaq, T + 18, YA - 8, 10, 16, 'sv-cubo', { rx: 2 })];
      mov.bracos.push({ d, bs });
      mov.moentes.push({ d, e: R_(gMaq, T - 18, YA - 7, 36, 14, 'sv-eixo', { rx: 3 }) });
    }
    // mancais principais A, B e C
    for (const [x, nome] of [[372, 'A'], [536, 'B'], [670, 'C']]) {
      R_(gMaq, x - 12, YA - 24, 24, 48, 'sv-mancal', { rx: 3 });
      R_(gMaq, x - 10, YA - 10, 20, 3, 'sv-sapata');
      R_(gMaq, x - 10, YA + 7, 20, 3, 'sv-sapata');
      Tx(gMaq, x, YA - 28, nome, { px: 9.5, peso: 600, c: cor.dim, a: 'middle' });
    }
    R_(gMaq, 712, YA - 9, 4, 18, 'sv-colar'); // face da ponta livre (alvo da sonda axial)

    // ================= estágios: guia da cruzeta, peça distanciadora, gaxeta, cilindro e válvulas =================
    mov.est = [];
    function estagio(T, d, D, sucOeste) {
      const g = G(gMaq);
      let f = faixa(d, 38, 96); R_(g, T - 22, f[0], 44, f[1], 'sv-carcaca', { rx: 3 });
      R_(g, T - 18, f[0], 36, f[1], 'sv-interno');
      f = faixa(d, 96, 114); R_(g, T - 14, f[0], 28, f[1], 'sv-interno', { stroke: cor.eixo });
      f = faixa(d, 114, 188); R_(g, T - D / 2, f[0], D, f[1], 'sv-carcaca', { rx: 5 });
      f = faixa(d, 118, 182); R_(g, T - D / 2 + 8, f[0], D - 16, f[1], 'sv-interno');
      f = faixa(d, 188, 192); R_(g, T - D / 2 + 4, f[0], D - 8, f[1], 'sv-pedestal');
      // válvulas: sucção (S) de um lado, descarga (D) do outro, uma em cada ponta do cilindro (dupla ação)
      for (const u of [128, 172]) {
        for (const lado of [-1, 1]) {
          const x = lado < 0 ? T - D / 2 - 14 : T + D / 2;
          R_(g, x, yU(d, u) - 7, 14, 14, 'sv-valvula', { rx: 2 });
          const suc = (lado < 0) === sucOeste;
          Tx(g, x + 7, yU(d, u) + 3.5, suc ? 'S' : 'D', { px: 9, peso: 700, c: suc ? cor.ciano : cor.texto, a: 'middle' });
        }
      }
      // grupo móvel: cruzeta, haste e pistão (com a fita-guia no meio e os anéis)
      const gm = G(gMaq);
      f = faixa(d, UREF - 9, UREF + 9); R_(gm, T - 16, f[0], 32, f[1], 'sv-rotor', { rx: 2 });
      el('circle', { cx: T, cy: yU(d, UREF), r: 4, class: 'sv-cubo' }, gm);
      f = faixa(d, UREF + 9, UREF + LH - 8); R_(gm, T - 3, f[0], 6, f[1], 'sv-eixo');
      f = faixa(d, UREF + LH - 8, UREF + LH + 8); R_(gm, T - D / 2 + 10, f[0], D - 20, f[1], 'sv-rotor', { rx: 2 });
      f = faixa(d, UREF + LH - 1.5, UREF + LH + 1.5); R_(gm, T - D / 2 + 10, f[0], D - 20, f[1], 'sv-sapata');
      for (const u of [UREF + LH - 5, UREF + LH + 5]) el('line', { x1: T - D / 2 + 11, y1: yU(d, u), x2: T + D / 2 - 11, y2: yU(d, u), stroke: cor.dim, 'stroke-width': 0.8 }, gm);
      // biela (linha do moente à cruzeta), por baixo da cruzeta
      const biela = el('line', { x1: T, y1: YA, x2: T, y2: yU(d, UREF), stroke: cor.dim2, 'stroke-width': 9, 'stroke-linecap': 'round' }, gMaq);
      mov.est.push({ T, d, gm, biela });
    }
    estagio(T1, -1, D1, true);
    estagio(T2, 1, D2, false);
    // XT-103: sonda de queda de haste na peça distanciadora do est. 1, por BAIXO da haste e junto da gaxeta
    // (em planta a haste a encobre; aparece dos dois lados dela)
    el('circle', { cx: T1, cy: yU(-1, 101), r: 5.5, class: 'sv-sonda' }, gMaq);
    // ordem de desenho: biela < cruzeta/haste/pistão < gaxeta
    for (const e of mov.est) gMaq.appendChild(e.gm);
    for (const e of mov.est) {
      const f = faixa(e.d, 106, 114);
      R_(gMaq, e.T - 11, f[0], 22, f[1], 'sv-mancal');
      for (const x of [e.T - 6, e.T, e.T + 6]) el('line', { x1: x, y1: f[0] + 1, x2: x, y2: f[0] + f[1] - 1, stroke: cor.aco, 'stroke-width': 1 }, gMaq);
    }

    // ================= tubulação de processo: sucção → est. 1 → intercooler → est. 2 → descarga =================
    const TUBOS = ['M330,150 H376', 'M376,128 V172', 'M532,128 V172', 'M532,150 H846 V170', 'M846,410 V450 H665', 'M665,428 V472', 'M541,428 V472', 'M541,450 H494'];
    for (const d of TUBOS) el('path', { d, class: 'sv-tubo' }, gTubos);
    R_(gTubos, 830, 170, 32, 240, 'sv-carcaca', { rx: 14 }); // intercooler (casco e tubos)
    for (const x of [838, 846, 854]) el('line', { x1: x, y1: 186, x2: x, y2: 394, stroke: cor.eixo, 'stroke-width': 1.2 }, gTubos);
    mov.fluxos = ['M330,150 H372', 'M536,150 H846 V172', 'M846,172 V408', 'M846,410 V450 H669', 'M537,450 H496'].map((d, i) =>
      el('path', { d, class: i === 2 ? 'sv-fluxo sv-fluxo-int' : 'sv-fluxo' }, gTubos));
    el('path', { d: 'M486,450 l9,-6 v12 z', fill: cor.ciano, opacity: 0.85 }, gTubos);
    Tx(gTxt, 330, 139, 'SUCÇÃO', { cl: 'sv-rot' });
    Tx(gTxt, 522, 437, 'DESCARGA', { cl: 'sv-rot', a: 'end' });
    Tx(gTxt, 822, 290, 'INTERCOOLER', { cl: 'sv-rot', a: 'middle', tr: 'rotate(-90 822 290)' });

    // ================= sensores (ciano) no lugar medido =================
    // ST-101: sonda radial sobre o cubo do acoplamento, lendo o rasgo uma vez por volta
    R_(gSen, 274.5, YA - 50, 5, 31, 'sv-sonda');
    R_(gSen, 272, YA - 57, 10, 7, 'sv-acel', { rx: 1.5 });
    // XT-102: sonda radial no mancal LA do motor, entrando pelo lado sul
    R_(gSen, 234.5, YA + 12, 5, 34, 'sv-sonda');
    R_(gSen, 232, YA + 46, 10, 7, 'sv-acel', { rx: 1.5 });
    // VT-101 e VT-102: velocidade no cárter, cada uma junto da sua manivela, no lado livre do cilindro
    R_(gSen, 440, YA + 48, 12, 12, 'sv-acel', { rx: 1.5 });
    R_(gSen, 597, YA - 60, 12, 12, 'sv-acel', { rx: 1.5 });
    // TT-101: sensor de temperatura no metal do mancal principal A
    R_(gSen, 369.5, YA + 12, 5, 12, 'sv-sonda', { rx: 1 });
    // TT-102: poço termométrico no tubo de descarga do est. 2, logo depois das válvulas de descarga (gás)
    R_(gSen, 513, 446, 4, 20, 'sv-sonda', { rx: 1 });
    R_(gSen, 510, 466, 10, 7, 'sv-acel', { rx: 1.5 });
    // XT-101 ax: sonda axial de frente para a ponta livre do virabrequim, num suporte
    R_(gSen, 740, YA + 3, 10, 18, 'sv-pedestal');
    R_(gSen, 720, YA - 3.5, 34, 7, 'sv-sonda', { rx: 1 });

    // ================= nomes e rótulos =================
    Tx(gTxt, 20, 44, 'VISTA DE PLANTA', { cl: 'sv-nome' });
    Tx(gTxt, 20, 60, 'cilindros horizontais opostos', { px: 10.5, c: cor.dim });
    Tx(gTxt, 137, 386, 'MOTOR', { cl: 'sv-nome', a: 'middle' });
    Tx(gTxt, 137, 400, 'de indução · 12 polos · 60 Hz', { px: 10, c: cor.dim2, a: 'middle' });
    Tx(gTxt, 540, 238, 'COMPRESSOR', { cl: 'sv-nome', a: 'middle' });
    Tx(gTxt, 430, 106, 'est. 1', { cl: 'sv-nome', a: 'middle' });
    Tx(gTxt, 676, 484, 'est. 2', { cl: 'sv-nome' });
    Tx(gTxt, 300, 340, 'acoplamento', { px: 9.5, c: cor.dim2, a: 'middle' });
    Tx(gTxt, 455, YA + 36, 'cárter · virabrequim', { px: 9.5, c: cor.dim2, a: 'middle' });

    // ================= DETALHE: por que a haste "cai" (vista lateral do est. 1) =================
    const gD = G(svg, 'tb-detalhe');
    R_(gD, 18, 88, 186, 124, '', { fill: 'none', stroke: cor.eixo, 'stroke-dasharray': '2 3' });
    Tx(gD, 26, 102, 'DETALHE · vista lateral', { px: 9.5, peso: 600, c: cor.dim });
    R_(gD, 132, 116, 64, 48, 'sv-interno', { stroke: cor.eixo });
    R_(gD, 152, 119, 32, 40, 'sv-rotor', { rx: 2 });
    R_(gD, 156, 159, 24, 4, 'sv-sapata');
    R_(gD, 28, 124, 18, 4, 'sv-interno', { stroke: cor.eixo });
    R_(gD, 28, 152, 18, 4, 'sv-interno', { stroke: cor.eixo });
    R_(gD, 30, 129, 14, 22, 'sv-rotor', { rx: 2 });
    el('line', { x1: 46, y1: 140, x2: 152, y2: 140, stroke: cor.dim2, 'stroke-width': 1, 'stroke-dasharray': '3 3' }, gD);
    el('line', { x1: 44, y1: 140, x2: 152, y2: 147, stroke: cor.dim, 'stroke-width': 6 }, gD);
    R_(gD, 120, 134, 10, 20, 'sv-mancal');
    R_(gD, 104.5, 151, 5, 18, 'sv-sonda');
    Tx(gD, 114, 166, 'sonda', { px: 9.5, c: cor.ciano });
    Tx(gD, 156, 176, 'fita-guia', { px: 9.5, c: '#d97706' });
    Tx(gD, 60, 133, 'haste', { px: 9.5, c: cor.dim2 });
    Tx(gD, 26, 192, 'a fita-guia gasta, o pistão', { px: 9.5, c: cor.dim });
    Tx(gD, 26, 205, 'desce e a haste "cai"', { px: 9.5, c: cor.dim });

    // ================= CORTE A–A: o virabrequim visto do motor (a manivela gira num plano vertical) =================
    const gC = G(svg, 'tb-corte');
    R_(gC, CX - 77, CY - 8, 50, 16, 'sv-interno', { stroke: cor.eixo });
    R_(gC, CX + 27, CY - 8, 50, 16, 'sv-interno', { stroke: cor.eixo });
    el('circle', { cx: CX, cy: CY, r: 38, class: 'sv-mancal' }, gC);
    el('circle', { cx: CX, cy: CY, r: 31, class: 'sv-folga' }, gC);
    // seta do giro (anti-horário visto do motor): arco por dentro da folga, de 20° a 66° abaixo da horizontal
    const ga = (a, r) => [CX - r * Math.cos(a), CY + r * Math.sin(a)];
    const [ax0, ay0] = ga(0.35, 26), [ax1, ay1] = ga(1.15, 26);
    el('path', { d: 'M' + ax0.toFixed(1) + ',' + ay0.toFixed(1) + ' A 26 26 0 0 0 ' + ax1.toFixed(1) + ',' + ay1.toFixed(1), class: 'sv-giro' }, gC);
    const tg = [Math.sin(1.15), Math.cos(1.15)], pp = [-tg[1], tg[0]];
    el('path', { d: 'M' + (ax1 + 6 * tg[0]).toFixed(1) + ',' + (ay1 + 6 * tg[1]).toFixed(1) + ' L' + (ax1 + 3.5 * pp[0]).toFixed(1) + ',' + (ay1 + 3.5 * pp[1]).toFixed(1) + ' L' + (ax1 - 3.5 * pp[0]).toFixed(1) + ',' + (ay1 - 3.5 * pp[1]).toFixed(1) + ' Z', class: 'sv-giro-p' }, gC);
    mov.corteGiro = G(gC);
    R_(mov.corteGiro, CX - CR - 6, CY - 5, 2 * CR + 12, 10, 'sv-cubo', { rx: 5 });
    el('circle', { cx: CX - CR, cy: CY, r: 4.5, class: 'sv-entalhe' }, mov.corteGiro);
    el('circle', { cx: CX + CR, cy: CY, r: 4.5, class: 'sv-eixo' }, mov.corteGiro);
    el('circle', { cx: CX, cy: CY, r: 5.5, class: 'sv-eixo-c' }, mov.corteGiro);
    mov.corte = [-1, 1].map((lado) => ({
      lado,
      biela: el('line', { x1: CX, y1: CY, x2: CX + lado * CL, y2: CY, stroke: cor.dim2, 'stroke-width': 5, 'stroke-linecap': 'round' }, gC),
      cruzeta: R_(gC, CX + lado * CL - 7, CY - 6, 14, 12, 'sv-rotor', { rx: 2 })
    }));
    Tx(gC, CX - 60, CY - 14, 'est. 1', { px: 9.5, c: cor.dim, a: 'middle' });
    Tx(gC, CX + 60, CY - 14, 'est. 2', { px: 9.5, c: cor.dim, a: 'middle' });
    Tx(gC, 24, 498, 'CORTE A–A · visto do motor', { px: 9.5, c: cor.dim });
    Tx(gC, 24, 511, 'manivelas a 180°', { px: 9.5, c: cor.dim2 });

    // ================= caixas de leitura (balão, tag, LED, valor, subtítulo) e cabo até o dispositivo =================
    const CW = 132, CH = 52;
    const balao = (pai, cx, cy, n) => {
      el('circle', { cx, cy, r: 8.5, fill: '#0b1219', stroke: cor.ambar, 'stroke-width': 1.5 }, pai);
      Tx(pai, cx, cy + 3.5, String(n), { px: 10, peso: 700, c: cor.ambar, a: 'middle' });
    };
    // lugar de cada caixa, o fio do sensor até ela e o cabo dela até a borneira do dispositivo (sem cruzar fios)
    const LUGAR = {
      'ST-101': { bx: 211, by: 28, fio: 'M277,243 V80', cabo: 'M277,28 V8 H892.5 V222 H904' },
      'XT-103': { bx: 424, by: 28, fio: 'M459.5,199 H546 V96 H490 V80', cabo: 'M490,28 V11.5 H890 V226 H904' },
      'VT-102': { bx: 564, by: 28, fio: 'M603,240 V96 H630 V80', cabo: 'M630,28 V15 H887.5 V230 H904' },
      'XT-101 ax': { bx: 706, by: 28, fio: 'M737,296.5 V96 H772 V80', cabo: 'M772,28 V18.5 H885 V234 H904' },
      'XT-102': { bx: 134, by: 514, fio: 'M237,353 V504 H200 V514', cabo: 'M200,566 V584.5 H892.5 V374 H904' },
      'TT-101': { bx: 272, by: 514, fio: 'M372,324 V504 H338 V514', cabo: 'M338,566 V581 H890 V370 H904' },
      'VT-101': { bx: 410, by: 514, fio: 'M446,360 V504 H476 V514', cabo: 'M476,566 V577.5 H887.5 V366 H904' },
      'TT-102': { bx: 548, by: 514, fio: 'M515,473 V504 H614 V514', cabo: 'M614,566 V574 H885 V362 H904' }
    };
    const gCx = G(svg, 'tb-caixas');
    for (const p of PTS) {
      const l = LUGAR[p.tag];
      el('path', { d: l.fio, class: 'sv-fio' }, gFios);
      el('path', { d: l.cabo, class: 'sv-fio' }, gFios);
      const g = G(gCx);
      const cx = R_(g, l.bx, l.by, CW, CH, 'sv-caixa', { rx: 3 });
      if (p.alerta) cx.style.stroke = cor.alerta;
      balao(g, l.bx + 14, l.by + 14, p.n);
      Tx(g, l.bx + 28, l.by + 18, p.tag, { cl: 'sv-tag' });
      p.led = el('circle', { cx: l.bx + CW - 12, cy: l.by + 14, r: 4.5, class: 'sv-led', 'data-e': p.alerta ? 'alerta' : 'ok' }, g);
      p.txt = Tx(g, l.bx + 10, l.by + 36, '', { cl: 'sv-val sv-val-g' });
      if (p.alerta) p.txt.style.fill = cor.alerta;
      Tx(g, l.bx + 10, l.by + 48, p.sub, { px: 9.5, c: cor.dim });
    }

    // ================= dispositivo de monitoramento: borneira, 8 canais numerados com LED e a placa de rede =================
    const gR = G(svg, 'tb-rack');
    Tx(gR, 978, 172, 'DISPOSITIVO DE', { cl: 'sv-nome', a: 'middle' });
    Tx(gR, 978, 186, 'MONITORAMENTO', { cl: 'sv-nome', a: 'middle' });
    R_(gR, 900, 196, 156, 208, 'sv-carcaca', { rx: 4 });
    // borneira em dois grupos, um borne por fio (cabo de cima e cabo de baixo)
    for (const [y0, ys] of [[216, [222, 226, 230, 234]], [356, [362, 366, 370, 374]]]) {
      R_(gR, 904, y0, 10, 24, 'sv-pedestal');
      for (const y of ys) el('circle', { cx: 909, cy: y, r: 1.6, fill: cor.dim }, gR);
    }
    mov.canais = [];
    const nAlerta = PTS.find((p) => p.alerta).n; // o LED âmbar fica no canal do XT-103
    for (let i = 0; i < 8; i++) {
      const x = 920 + i * 13;
      R_(gR, x, 206, 12, 188, 'sv-interno', { stroke: cor.eixo });
      Tx(gR, x + 6, 222, String(i + 1), { px: 10, peso: 700, c: cor.texto, a: 'middle' });
      mov.canais.push(el('circle', { cx: x + 6, cy: 236, r: 3.6, class: 'sv-led', 'data-e': i === nAlerta - 1 ? 'alerta' : 'ok' }, gR));
      R_(gR, x + 3, 372, 6, 14, 'sv-pedestal');
    }
    R_(gR, 1027, 206, 26, 188, 'sv-interno', { stroke: cor.eixo });
    Tx(gR, 1040, 222, 'TCP', { px: 9, peso: 700, c: cor.texto, a: 'middle' });
    el('circle', { cx: 1040, cy: 236, r: 3.6, class: 'sv-led', 'data-e': 'ok' }, gR);
    mov.act = el('circle', { cx: 1040, cy: 250, r: 3.6, class: 'sv-led', 'data-e': 'ok' }, gR);
    R_(gR, 1043, 294, 13, 12, 'sv-pedestal', { stroke: cor.texto });

    // ================= Ethernet Modbus/TCP com os pacotes andando até o painel =================
    el('line', { x1: 1056, y1: ETHY, x2: 1136, y2: ETHY, stroke: cor.azul, 'stroke-width': 2.5 }, gR);
    R_(gR, 1128, ETHY - 5, 8, 10, 'sv-pedestal', { stroke: cor.texto });
    Tx(gR, 1096, ETHY - 12, 'Modbus/TCP', { px: 10, peso: 600, c: cor.ciano, a: 'middle' });
    Tx(gR, 1096, ETHY + 20, 'Ethernet', { px: 9.5, c: cor.dim2, a: 'middle' });
    mov.pacotes = [0, 1, 2].map(() => R_(gR, ETH0, ETHY - 3, 10, 6, '', { fill: cor.ciano, rx: 1 }));

    // ================= painel coletor FRV XCOINIT =================
    const gP = G(svg, 'tb-painel');
    const PX = 1136;
    R_(gP, PX, 60, 252, 440, 'sv-caixa', { rx: 4 });
    Tx(gP, PX + 16, 88, 'FRV XCOINIT', { px: 15, peso: 700, c: cor.branco });
    Tx(gP, PX + 16, 106, 'MODBUS/TCP · X·1', { px: 11, peso: 600, c: cor.laranja });
    Tx(gP, PX + 238, 88, '8 pontos', { px: 10, c: cor.dim2, a: 'end' });
    el('line', { x1: PX + 8, y1: 118, x2: PX + 244, y2: 118, stroke: cor.eixo, 'stroke-width': 1 }, gP);
    PTS.forEach((p, i) => {
      const y = 140 + 30 * i;
      balao(gP, PX + 17, y - 4, p.n);
      Tx(gP, PX + 33, y, p.tag, { cl: 'sv-tag' });
      p.ptxt = Tx(gP, PX + 178, y, '', { cl: 'sv-val sv-val-g', a: 'end' });
      if (p.alerta) p.ptxt.style.fill = cor.alerta;
      Tx(gP, PX + 183, y, p.u, { px: 10, c: cor.dim });
      p.pled = el('circle', { cx: PX + 238, cy: y - 4, r: 4.5, class: 'sv-led', 'data-e': p.alerta ? 'alerta' : 'ok' }, gP);
      el('line', { x1: PX + 8, y1: y + 11, x2: PX + 244, y2: y + 11, stroke: cor.eixo, 'stroke-opacity': 0.45, 'stroke-width': 1 }, gP);
    });
    // mini tendência da queda de haste (o ponto em atenção), 60 s
    const TX0 = PX + 12, TX1 = PX + 240, TY0 = 392, TY1 = 452;
    const ty = (v) => TY1 - ((v - 0.36) / 0.1) * (TY1 - TY0);
    Tx(gP, TX0, 384, 'XT-103 · queda de haste · 60 s', { px: 9.5, c: cor.dim });
    R_(gP, TX0, TY0, TX1 - TX0, TY1 - TY0, '', { fill: 'none', stroke: cor.eixo, 'stroke-opacity': 0.7 });
    el('line', { x1: TX0, y1: ty(ATENCAO_RD), x2: TX1, y2: ty(ATENCAO_RD), stroke: cor.alerta, 'stroke-width': 1, 'stroke-dasharray': '4 3', opacity: 0.8 }, gP);
    Tx(gP, TX1 - 4, ty(ATENCAO_RD) + 12, 'atenção 0,40 mm', { px: 9, c: cor.alerta, a: 'end' });
    mov.tend = el('polyline', { points: '', fill: 'none', stroke: cor.alerta, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, gP);
    el('circle', { cx: PX + 17, cy: 476, r: 4.5, class: 'sv-led', 'data-e': 'ok' }, gP);
    Tx(gP, PX + 30, 480, 'ligado · coletando', { px: 11, peso: 600, c: cor.texto });
    Tx(gP, PX + 238, 480, 'ciclo 1 s', { px: 10, c: cor.dim2, a: 'end' });

    // ================= valores: passeio de ±1–2 % em volta da base (semente fixa: a foto sai igual a cada carga) =================
    const rnd = S.prng(20261110 + 2);
    const passo = (p) => {
      p.w = S.lim((p.w || 0) + (rnd() - 0.5) * p.amp * 0.45 - (p.w || 0) * 0.06, -p.amp, p.amp);
      p.v = p.base * (1 + p.w);
    };
    const rd = PTS.find((p) => p.alerta); // XT-103, o ponto da tendência
    const hist = [];
    for (let i = 0; i < 60; i++) { passo(rd); hist.push(rd.v); }
    PTS.forEach((p) => { p.w = 0; p.v = p.base; }); // monta com os valores-base da descrição
    hist[hist.length - 1] = rd.v;
    function escreverValores() {
      for (const p of PTS) {
        const s = fmt(p.v, p.d);
        const sv = s + ' ' + p.u;
        if (p.txt.textContent !== sv) p.txt.textContent = sv;
        if (p.ptxt.textContent !== s) p.ptxt.textContent = s;
      }
    }
    function tracarTendencia() {
      let pts = '';
      const n = hist.length;
      for (let i = 0; i < n; i++) pts += (TX0 + 2 + ((TX1 - TX0 - 4) * i) / (n - 1)).toFixed(1) + ',' + ty(hist[i]).toFixed(1) + ' ';
      mov.tend.setAttribute('points', pts.trim());
    }

    // ================= movimento =================
    let th = 0.7, ofs = 0, tPac = 0, acum = 0, seg = Math.floor(S.t), primeira = true;
    function aplicarMovimento() {
      const c = Math.cos(th), s = Math.sin(th);
      const uPin = R * c, uCh = uPin + Math.sqrt(L * L - R * R * s * s);
      for (const e of mov.est) {
        e.gm.setAttribute('transform', 'translate(0 ' + (e.d * (uCh - UREF)).toFixed(2) + ')');
        e.biela.setAttribute('y1', (YA + e.d * uPin).toFixed(2));
        e.biela.setAttribute('y2', (YA + e.d * uCh).toFixed(2));
      }
      mov.moentes.forEach((m) => m.e.setAttribute('transform', 'translate(0 ' + (m.d * uPin).toFixed(2) + ')'));
      mov.bracos.forEach((b) => {
        const a = YA - b.d * 0.45 * uPin, z = YA + b.d * uPin;
        const y = Math.min(a, z) - 8, h = Math.abs(z - a) + 16;
        for (const r of b.bs) { r.setAttribute('y', y.toFixed(2)); r.setAttribute('height', h.toFixed(2)); }
      });
      // rasgo do cubo: passa sob a ST-101 uma vez por volta (some quando está do lado de baixo)
      mov.rasgo.setAttribute('transform', 'translate(0 ' + (-11 * s).toFixed(2) + ')');
      mov.rasgo.setAttribute('opacity', c > 0 ? '1' : '0.18');
      // corte A–A: a manivela gira (anti-horário, visto do motor) e as cruzetas vão e voltam
      mov.corteGiro.setAttribute('transform', 'rotate(' + (-th * 180 / Math.PI).toFixed(2) + ' ' + CX + ' ' + CY + ')');
      const ux = CR * c + Math.sqrt(CL * CL - CR * CR * s * s);
      for (const k of mov.corte) {
        const px = CX + k.lado * CR * c, py = CY - k.lado * CR * s;
        const xh = CX + k.lado * ux;
        k.biela.setAttribute('x1', px.toFixed(2)); k.biela.setAttribute('y1', py.toFixed(2));
        k.biela.setAttribute('x2', xh.toFixed(2));
        k.cruzeta.setAttribute('transform', 'translate(' + (xh - (CX + k.lado * CL)).toFixed(2) + ' 0)');
      }
      const o = ofs.toFixed(1);
      for (const f of mov.fluxos) f.setAttribute('stroke-dashoffset', o);
      const curso = ETH1 - ETH0;
      mov.pacotes.forEach((p, i) => {
        const u = (((tPac * 0.42 + i / 3) % 1) + 1) % 1;
        p.setAttribute('transform', 'translate(' + (u * curso).toFixed(1) + ' 0)');
      });
    }

    escreverValores();
    tracarTendencia();
    aplicarMovimento();

    return {
      atualizar(dt) {
        if (dt > 0) {
          th = (th + dt * 0.5 * 2 * Math.PI) % (2 * Math.PI); // ~0,5 volta/s (visual; a rotação real está na ST-101)
          ofs -= dt * 26;
          tPac += dt;
          aplicarMovimento();
          primeira = false;
        } else if (primeira) { aplicarMovimento(); primeira = false; }
        // valores: no máximo 4 vezes por segundo no modo fluido; a cada chamada no modo 1 Hz
        acum += dt;
        if (dt > 0 && acum < 0.25) return;
        acum = 0;
        for (const p of PTS) passo(p);
        escreverValores();
        const sAgora = Math.floor(S.t);
        if (sAgora !== seg || dt === 0) {
          seg = sAgora;
          hist.push(rd.v);
          if (hist.length > 60) hist.shift();
          tracarTendencia();
          // placa de rede: o LED de atividade troca a cada ciclo de leitura
          mov.act.setAttribute('data-e', mov.act.getAttribute('data-e') === 'ok' ? 'off' : 'ok');
        }
      }
    };
  });
})();
