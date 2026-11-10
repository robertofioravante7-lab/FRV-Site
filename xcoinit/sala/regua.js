// FRV XcoInit · régua X·1 da página do produto (seção #ferramentas, 10/11/2026): as seis telas escuras do módulo X·1.
// Limite com severidade e agulha ao vivo, sino do normal aprendido (z), mudança contra a régua das quatro anteriores,
// minitendência por hora com o tempo até o alerta, marcadores de rolamento sobre o espectro e confirmação em ciclos.
// Uma história só, a do laudo da página: VT-01 · mancal A BOM em 4,82 mm/s; VT-03 · mancal B em AÇÃO por z, abaixo de 5,6.
// Valores ilustrativos, gerados aqui com semente fixa; relógio, mouse, tamanho e modo 1 Hz vêm de paineis.js.
'use strict';
(function () {
  const S = window.XcoSala;
  if (!S || !S.tela) return;
  const c = S.cor; // o mesmo objeto que paineis.js preenche com as variáveis --sv-* do CSS
  const { tx, fmt, rgba, F, lim } = S;
  const R = S.REGUA['mm/s']; // alerta 5,6 (sev 2) · alarme 7,1 (sev 4) · faixa do canal 0–20 mm/s
  const HIST = R.faixa / 64; // histerese no retorno: faixa do canal / 64 = 0,3125 mm/s
  const RET = R.al - HIST; // volta ao BOM só abaixo de 5,6 − 0,31 = 5,29
  const NOME = { ok: 'BOM', alerta: 'ATENÇÃO', trip: 'AÇÃO' };
  const uma = () => S.modo() === '1hz';
  const DEZ = (d) => 0.5 * Math.pow(10, -d);
  const sinal = (v, d) => (Math.abs(v) < DEZ(d) ? fmt(0, d) : (v > 0 ? '+' : '') + fmt(v, d));

  // ---------------- utilidades desta seção ----------------
  function larg(g, s, px, peso) { g.font = F(px, peso); return g.measureText(s).width; }
  // rótulo sobre fundo do painel: apaga a grade e as linhas que passam atrás do texto
  function rot(g, s, x, y, o, k) {
    const lw = larg(g, s, o.px, o.peso);
    const al = o.a || 'left';
    const x0 = al === 'center' ? x - lw / 2 : al === 'right' ? x - lw : x;
    g.fillStyle = rgba(c.painel, 0.92);
    g.fillRect(x0 - 2 * k, y - o.px * 0.82, lw + 4 * k, o.px * 1.08);
    tx(g, s, x, y, o);
    return lw;
  }
  // selo de estado, como o .x1-pill da página: texto em negrito na cor do estado, fundo tingido e borda
  function selo(g, s, x, y, cc, k, al) {
    const px = 8.5 * k, lw = larg(g, s, px, 700);
    const bw = lw + 8 * k, bh = 12 * k;
    const x0 = al === 'right' ? x - bw : al === 'center' ? x - bw / 2 : x;
    g.fillStyle = rgba(cc, 0.14);
    g.fillRect(x0, y - bh / 2, bw, bh);
    g.strokeStyle = rgba(cc, 0.65);
    g.lineWidth = 1;
    g.strokeRect(Math.round(x0) + 0.5, Math.round(y - bh / 2) + 0.5, Math.round(bw) - 1, Math.round(bh) - 1);
    tx(g, s, x0 + bw / 2, y + 3 * k, { px, c: cc, a: 'center', peso: 700 });
    return bw;
  }
  // cabeçalho da tela: texto à esquerda e, se couber, o da direita
  function cab(g, w, k, esq, dir, cDir) {
    tx(g, esq, 8 * k, 14 * k, { px: 9.5 * k, c: c.dim });
    if (!dir) return;
    const we = larg(g, esq, 9.5 * k), wd = larg(g, dir, 9 * k);
    if (8 * k + we + 14 * k + wd <= w - 8 * k) tx(g, dir, w - 8 * k, 14 * k, { px: 9 * k, c: cDir || c.dim2, a: 'right' });
  }
  const nx = (v) => Math.round(v) + 0.5; // linha de 1 px nítida
  function vl(g, x, y0, y1, cc, lw, tr) { S.linha(g, [[nx(x), y0], [nx(x), y1]], cc, lw || 1, tr); }
  function hl(g, x0, x1, y, cc, lw, tr) { S.linha(g, [[x0, nx(y)], [x1, nx(y)]], cc, lw || 1, tr); }
  // triângulo de marca com a ponta em (x, y): para cima (d = -1) ou para baixo (d = 1)
  function tri(g, x, y, r, d, cc) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - r, y - d * r * 1.5);
    g.lineTo(x + r, y - d * r * 1.5);
    g.closePath();
    g.fillStyle = cc;
    g.fill();
  }
  // anel que pulsa em volta de um ponto (só no modo fluido; no 1 Hz fica parado)
  function pulso(g, x, y, r, cc, k) {
    if (uma()) return;
    const f = (S.t % 1.6) / 1.6;
    g.strokeStyle = rgba(cc, 0.65 * (1 - f));
    g.lineWidth = 1.2;
    g.beginPath(); g.arc(x, y, r + f * 9 * k, 0, 2 * Math.PI); g.stroke();
  }
  // rótulos numa fileira sem sobreposição: cada um o mais perto possível do seu alvo (grupos que se tocam
  // andam juntos, centrados na média dos alvos). itens: [{alvo, larg}] → grava it.x (centro do rótulo)
  function arrumar(itens, x0, x1, vao) {
    const ord = itens.slice().sort((p, q) => p.alvo - q.alvo);
    const pos = (gr) => {
      let acc = 0, soma = 0;
      gr.offs = gr.itens.map((it) => { const o = acc + it.larg / 2; acc += it.larg + vao; return o; });
      gr.L = acc - vao;
      gr.itens.forEach((it, i) => { soma += it.alvo - gr.offs[i]; });
      gr.esq = lim(soma / gr.itens.length, x0, x1 - gr.L);
    };
    const grupos = ord.map((it) => ({ itens: [it] }));
    grupos.forEach(pos);
    for (let mudou = true; mudou;) {
      mudou = false;
      for (let i = 0; i < grupos.length - 1; i++) {
        const A = grupos[i], B = grupos[i + 1];
        if (A.esq + A.L + vao > B.esq) {
          const G = { itens: A.itens.concat(B.itens) };
          pos(G);
          grupos.splice(i, 2, G);
          mudou = true;
          break;
        }
      }
    }
    for (const gr of grupos) gr.itens.forEach((it, i) => { it.x = gr.esq + gr.offs[i]; });
    return itens;
  }
  const estDe = (v) => (v >= R.alarme ? 'trip' : v >= R.al ? 'alerta' : 'ok');
  const sevDe = (v) => (v >= R.alarme ? 4 : v >= R.al ? 2 : 0); // sev 1 e 3 vazias no arquivo deste exemplo

  // ================= 1 · limite: barra graduada, zonas, severidade e agulha ao vivo =================
  const HOJE_A = 4.82; // VT-01 · mancal A no laudo de hoje
  // leitura do ciclo de 1 s: a até ±0,085 de 4,82 (sequência fixa); a agulha ainda treme ±0,01 no modo fluido
  const VIVO = (() => {
    const r = S.prng(482);
    const v = [];
    let x = 0;
    for (let i = 0; i < 32; i++) { x = 0.55 * x + (r() - 0.5) * 0.1; v.push(lim(x, -0.085, 0.085)); }
    return v;
  })();
  const vivo = (s) => HOJE_A + VIVO[((s % VIVO.length) + VIVO.length) % VIVO.length];
  const ZONAS = [[0, R.al, 'ok'], [R.al, R.alarme, 'alerta'], [R.alarme, 8, 'trip']];

  S.tela('x1-limite', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), H = h / k, m = a.mem;
    const lido = vivo(Math.floor(S.t));
    if (uma() || m.ag === undefined) m.ag = lido;
    else m.ag += (lido - m.ag) * (1 - Math.exp(-(a.dt || 0) / 0.3));
    const ag = uma() ? lido : m.ag + 0.01 * Math.sin(S.t * 7.3);
    cab(g, w, k, 'VT-01 · mancal A · vibração · mm/s', 'limiar por ponto');
    const l = 16 * k, r = w - 16 * k, VM = 8;
    const xv = (v) => l + (lim(v, 0, VM) / VM) * (r - l);

    // ---- leitura do ciclo: LED, número, selo; à direita, severidade e margem até o alerta
    const yL = 50 * k, e = estDe(lido);
    S.led(g, l + 4 * k, yL - 7 * k, 4.2 * k, S.estadoCor(e));
    const sn = fmt(lido, 2), wn = larg(g, sn, 22 * k, 500);
    tx(g, sn, l + 14 * k, yL, { px: 22 * k, c: c.branco, peso: 500 });
    tx(g, 'mm/s', l + 18 * k + wn, yL, { px: 10 * k, c: c.dim });
    selo(g, NOME[e], l + 26 * k + wn + larg(g, 'mm/s', 10 * k), yL - 4 * k, S.estadoCor(e), k);
    tx(g, 'ao vivo · ciclo 1 s · sev ' + sevDe(lido), r, yL - 14 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    tx(g, 'margem até o alerta ' + fmt(R.al - lido, 2), r, yL, { px: 9 * k, c: c.texto, a: 'right' });

    // ---- a barra (centrada entre a leitura e o arquivo)
    const yb = (80 + (H - 193) / 2) * k, hb = 26 * k;
    for (const [v0, v1, est] of ZONAS) {
      const x0 = xv(v0), x1 = xv(v1), cz = S.estadoCor(est);
      g.fillStyle = rgba(cz, 0.17);
      g.fillRect(x0, yb, x1 - x0, hb);
      g.fillStyle = rgba(cz, 0.85);
      g.fillRect(x0, yb + hb - 4 * k, x1 - x0, 4 * k);
      const nome = NOME[est];
      if (larg(g, nome, 9 * k, 700) + 6 * k < x1 - x0) tx(g, nome, (x0 + x1) / 2, yb + 13.5 * k, { px: 9 * k, c: cz, a: 'center', peso: 700 });
    }
    S.moldura(g, l, yb, r - l, hb);
    // graduação: traço a cada 0,1, médio a cada 0,5 e grande a cada 1 mm/s
    g.lineWidth = 1;
    for (let pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (let i = 0; i <= VM * 10; i++) {
        const grande = i % 10 === 0, medio = i % 5 === 0;
        if ((grande || medio) !== !!pass) continue;
        const X = nx(xv(i / 10));
        g.moveTo(X, yb + hb);
        g.lineTo(X, yb + hb + (grande ? 7 : medio ? 4.5 : 2.5) * k);
      }
      g.strokeStyle = pass ? c.dim : c.eixo;
      g.stroke();
    }
    for (let v = 0; v <= VM; v++) tx(g, fmt(v), xv(v), yb + hb + 17 * k, { px: 8.5 * k, c: c.dim, a: 'center' });
    // limites do arquivo: alerta 5,6 = sev 2 (tracejado) e alarme 7,1 = sev 4 (cheio)
    for (const [v, est, nome, sev, tr] of [[R.al, 'alerta', 'alerta', 2, [4, 3]], [R.alarme, 'trip', 'alarme', 4, null]]) {
      const X = xv(v), cz = S.estadoCor(est);
      vl(g, X, yb - 3 * k, yb + hb + 8 * k, cz, 1.5, tr);
      tx(g, nome + ' ' + fmt(v, 1), X, yb - 17 * k, { px: 9.5 * k, c: cz, a: 'center', peso: 600 });
      tx(g, 'sev ' + sev, X, yb - 6 * k, { px: 8.5 * k, c: c.dim, a: 'center' });
    }
    // marca de hoje (laudo): 4,82, BOM
    const xh = xv(HOJE_A), yh = yb + hb + 23 * k;
    S.linha(g, [[nx(xh), yb + hb + 1], [nx(xh), yh]], rgba(c.ciano, 0.55), 1, [2, 2]);
    tri(g, xh, yh, 4 * k, -1, c.ciano);
    const sh = 'laudo de hoje ' + fmt(HOJE_A, 2), wh = larg(g, sh, 9.5 * k, 600), ws = larg(g, 'BOM', 8.5 * k, 700) + 8 * k;
    const xg = lim(xh - (wh + 6 * k + ws) / 2, l, r - wh - 6 * k - ws);
    tx(g, sh, xg, yh + 19 * k, { px: 9.5 * k, c: c.ciano, peso: 600 });
    selo(g, 'BOM', xg + wh + 6 * k, yh + 15.5 * k, c.ok, k);
    // agulha ao vivo, em volta da marca de hoje
    g.save();
    g.shadowColor = c.branco;
    g.shadowBlur = 5;
    S.linha(g, [[xv(ag), yb - 4 * k], [xv(ag), yb + hb + 2 * k]], c.branco, 2);
    g.restore();
    tri(g, xv(ag), yb - 3 * k, 3.6 * k, 1, c.branco);

    // ---- a linha do arquivo de limites da engenharia (coluna vazia = sem limite)
    const yc = (H - 48) * k, xc0 = l, xc1 = r;
    g.fillStyle = rgba(c.painel, 0.9);
    g.fillRect(xc0, yc, xc1 - xc0, 42 * k);
    S.moldura(g, xc0, yc, xc1 - xc0, 42 * k);
    hl(g, xc0, xc1, yc + 14 * k, rgba(c.eixo, 0.8));
    tx(g, 'arquivo de limites da engenharia', xc0 + 6 * k, yc + 10 * k, { px: 8.5 * k, c: c.dim });
    tx(g, 'coluna vazia = sem limite', xc1 - 6 * k, yc + 10 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    const CAB = ['unidade', 'sev1', 'sev2', 'sev3', 'sev4'];
    const LIN = [['mm/s', c.texto, 400], ['—', c.dim2, 400], [fmt(R.al, 1), c.alerta, 700], ['—', c.dim2, 400], [fmt(R.alarme, 1), c.trip, 700]];
    const pxa = 9 * k, sep = larg(g, ' ; ', pxa);
    let xa = xc0 + 6 * k;
    CAB.forEach((s, i) => {
      const wc = Math.max(larg(g, s, pxa), larg(g, LIN[i][0], pxa, 700));
      tx(g, s, xa, yc + 26 * k, { px: pxa, c: c.dim });
      tx(g, LIN[i][0], xa, yc + 38 * k, { px: pxa, c: LIN[i][1], peso: LIN[i][2] });
      xa += wc;
      if (i < CAB.length - 1) {
        tx(g, ' ; ', xa, yc + 26 * k, { px: pxa, c: c.dim2 });
        tx(g, ' ; ', xa, yc + 38 * k, { px: pxa, c: c.dim2 });
        xa += sep;
      }
    });

    S.mira(g, a, { x: l, y: yb - 4 * k, w: r - l, h: hb + 24 * k }, (mx) => {
      const v = ((mx - l) / (r - l)) * VM, e2 = estDe(v);
      return [
        fmt(v, 2) + ' mm/s',
        NOME[e2] + ' · sev ' + sevDe(v),
        v < R.al ? 'margem até o alerta ' + fmt(R.al - v, 2) : v < R.alarme ? 'faltam ' + fmt(R.alarme - v, 2) + ' até o alarme' : 'acima do alarme ' + fmt(R.alarme, 1)
      ];
    });
  });

  // ================= 2 · normal aprendido: o sino de VT-03 e o z de hoje =================
  const NB = { mu: 2.9, sd: 0.32, hoje: 4.18, v0: 1.5, v1: 4.6 };
  const zDe = (v) => (v - NB.mu) / NB.sd;
  const zonaZ = (z) => (Math.abs(z) >= 3 ? 'trip' : Math.abs(z) >= 2 ? 'alerta' : 'ok');

  S.tela('x1-normal', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), H = h / k;
    cab(g, w, k, 'VT-03 · mancal B · normal aprendido', fmt(NB.mu, 2) + ' ± ' + fmt(NB.sd, 2) + ' mm/s · congelado');
    const l = 14 * k, r = w - 14 * k, t = 40 * k, b = (H - 40) * k;
    const xv = (v) => l + ((v - NB.v0) / (NB.v1 - NB.v0)) * (r - l);
    const xz = (z) => xv(NB.mu + z * NB.sd);
    const pico = (b - t) * 0.72;
    const yd = (v) => { const z = zDe(v); return b - pico * Math.exp(-0.5 * z * z); };
    // faixas: âmbar de 2σ a 3σ, vermelho além de 3σ, dos dois lados
    g.fillStyle = rgba(c.alerta, 0.07);
    g.fillRect(xz(-3), t, xz(-2) - xz(-3), b - t);
    g.fillRect(xz(2), t, xz(3) - xz(2), b - t);
    g.fillStyle = rgba(c.trip, 0.09);
    g.fillRect(l, t, xz(-3) - l, b - t);
    g.fillRect(xz(3), t, r - xz(3), b - t);
    // sino: área tingida por zona (os pontos da curva ficam guardados enquanto o tamanho não muda)
    const m = a.mem, chave = Math.round(w) + 'x' + Math.round(h);
    if (m.chave !== chave) {
      m.chave = chave;
      m.pts = [];
      for (let i = 0; i <= 180; i++) { const v = NB.v0 + (i / 180) * (NB.v1 - NB.v0); m.pts.push([xv(v), yd(v)]); }
    }
    const pts = m.pts;
    const area = (x0, x1, cz) => {
      g.save();
      g.beginPath(); g.rect(x0, t, x1 - x0, b - t); g.clip();
      g.beginPath(); g.moveTo(pts[0][0], b);
      for (const p of pts) g.lineTo(p[0], p[1]);
      g.lineTo(pts[pts.length - 1][0], b); g.closePath();
      g.fillStyle = cz; g.fill();
      g.restore();
    };
    area(xz(-2), xz(2), rgba(c.ciano, 0.16));
    area(xz(-3), xz(-2), rgba(c.alerta, 0.45));
    area(xz(2), xz(3), rgba(c.alerta, 0.45));
    area(l, xz(-3), rgba(c.trip, 0.6));
    area(xz(3), r, rgba(c.trip, 0.6));
    // linhas de σ, o normal e os rótulos do eixo z em cima
    for (const [z, nome, cz] of [[-3, '−3σ', c.trip], [-2, '−2σ', c.alerta], [2, '+2σ', c.alerta], [3, '+3σ', c.trip]]) {
      vl(g, xz(z), t, b, rgba(cz, 0.7), 1, [3, 3]);
      tx(g, nome, xz(z), t - 6 * k, { px: 9.5 * k, c: cz, a: 'center', peso: 600 });
    }
    vl(g, xz(0), t, b, rgba(c.texto, 0.45), 1, [2, 3]);
    tx(g, 'normal', xz(0), t - 6 * k, { px: 9.5 * k, c: c.texto, a: 'center', peso: 600 });
    S.linha(g, pts, c.ciano, 1.6);
    S.moldura(g, l, t, r - l, b - t);
    // eixo em mm/s
    for (let v = 1.5; v <= 4.51; v += 0.5) {
      const X = xv(v);
      vl(g, X, b, b + 4 * k, c.eixo);
      tx(g, fmt(v, 1), X, b + 14 * k, { px: 8.5 * k, c: c.dim, a: 'center' });
    }
    // hoje: 4,18 mm/s → z = +4,0 (vermelho, AÇÃO)
    const zh = zDe(NB.hoje), xh = xv(NB.hoje);
    vl(g, xh, t, b, c.trip, 2);
    tri(g, xh, t + 1, 4 * k, 1, c.trip);
    pulso(g, xh, b, 4 * k, c.trip, k);
    S.led(g, xh, b, 3.6 * k, c.trip);
    rot(g, 'hoje z ' + sinal(zh, 1) + ' · AÇÃO', xh - 7 * k, t + 15 * k, { px: 9.5 * k, c: c.trip, a: 'right', peso: 700 }, k);
    rot(g, fmt(NB.hoje, 2) + ' mm/s', xh - 7 * k, t + 28 * k, { px: 9 * k, c: c.texto, a: 'right' }, k);
    // a conta, embaixo
    tx(g, 'hoje: z = (' + fmt(NB.hoje, 2) + ' − ' + fmt(NB.mu, 2) + ') / ' + fmt(NB.sd, 2) + ' = ' + sinal(zh, 1) + ' · |z| ≥ 3 → AÇÃO', l, (H - 9) * k, { px: 9 * k, c: c.dim });

    S.mira(g, a, { x: l, y: t, w: r - l, h: b - t }, (mx) => {
      const v = NB.v0 + ((mx - l) / (r - l)) * (NB.v1 - NB.v0), z = zDe(v), e = zonaZ(z);
      return [fmt(v, 2) + ' mm/s', 'z ' + sinal(z, 1), e === 'ok' ? 'dentro do normal (|z| < 2)' : e === 'alerta' ? 'amarelo · ATENÇÃO (|z| ≥ 2)' : 'vermelho · AÇÃO (|z| ≥ 3)'];
    });
  });

  // ================= 3 · mudança: hoje contra a régua das quatro amostras anteriores =================
  const AM = [['−4', 3.44], ['−3', 3.49], ['−2', 3.53], ['−1', 3.58], ['hoje', 4.18]];
  const REG = (AM[0][1] + AM[1][1] + AM[2][1] + AM[3][1]) / 4; // 3,51
  const PR = (AM[4][1] / REG - 1) * 100; // +19,1 % contra a régua
  const PU = (AM[4][1] / AM[3][1] - 1) * 100; // +16,8 % contra só a última

  S.tela('x1-mudanca', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), H = h / k;
    cab(g, w, k, 'VT-03 · mancal B · mm/s', 'régua = média das 4 anteriores');
    const l = 28 * k, rp = w * 0.6, t = 28 * k, b = (H - 26) * k;
    const YM = 4.5;
    const yv = (v) => b - (v / YM) * (b - t);
    for (const v of [1, 2, 3, 4]) {
      hl(g, l, rp, yv(v), rgba(c.eixo, 0.75), 1, [2, 3]);
      tx(g, fmt(v), l - 5 * k, yv(v) + 3 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    }
    tx(g, '0', l - 5 * k, b + 3 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    const n = AM.length, slot = (rp - l) / n, bw = Math.min(slot * 0.58, 34 * k);
    const xc = (i) => l + slot * (i + 0.5);
    const mo = a.mouse;
    const mi = mo && mo.x >= l && mo.x <= rp && mo.y >= t && mo.y <= b ? lim(Math.floor((mo.x - l) / slot), 0, n - 1) : -1;
    AM.forEach(([nome, v], i) => {
      const hoje = i === n - 1, x0 = xc(i) - bw / 2, y0 = yv(v);
      g.fillStyle = hoje ? c.laranja : rgba(c.aco, 0.95);
      g.fillRect(x0, y0, bw, b - y0);
      g.fillStyle = hoje ? rgba(c.branco, 0.4) : rgba(c.dim, 0.75);
      g.fillRect(x0, y0, bw, 2 * k);
      if (i === mi) { g.strokeStyle = c.branco; g.lineWidth = 1; g.strokeRect(nx(x0) - 1, nx(y0) - 1, Math.round(bw) + 1, Math.round(b - y0) + 1); }
      tx(g, fmt(v, 2), xc(i), y0 + 14 * k, { px: 8.5 * k, c: hoje ? c.painel : c.texto, a: 'center', peso: hoje ? 700 : 500 });
      tx(g, nome, xc(i), b + 14 * k, { px: 9 * k, c: hoje ? c.laranja : c.dim, a: 'center', peso: hoje ? 700 : 400 });
    });
    hl(g, l, rp, b, c.eixo);
    // régua (média das quatro anteriores) e a cota de hoje contra ela
    const yr = yv(REG), yh = yv(AM[n - 1][1]);
    const xq = xc(n - 1) + bw / 2 + 6 * k;
    S.linha(g, [[l + 2 * k, yr], [xq + 2 * k, yr]], c.branco, 1.3, [6, 3]);
    g.strokeStyle = c.laranja;
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(xq - 3 * k, yh); g.lineTo(xq + 3 * k, yh);
    g.moveTo(xq, yh); g.lineTo(xq, yr);
    g.stroke();
    S.seta(g, xq, yr - 1, xq, yh + 1, c.laranja, k * 0.8);
    // leituras à direita
    const xt = xq + 8 * k;
    tx(g, sinal(PR, 1) + ' %', xt, (yh + yr) / 2 + 6 * k, { px: 17 * k, c: c.laranja, peso: 600 });
    tx(g, 'contra a régua ' + fmt(REG, 2), xt, yr + 14 * k, { px: 9 * k, c: c.texto });
    tx(g, 'contra só a última: ' + sinal(PU, 1) + ' %', xt, yr + 30 * k, { px: 8.5 * k, c: c.dim });
    // a memória: as quatro anteriores que fazem a régua
    const yM = b - 30 * k, cw = Math.min(26 * k, (w - 8 * k - xt) / 5.6);
    tx(g, 'memória · 4 anteriores', xt, yM - 6 * k, { px: 8.5 * k, c: c.dim });
    for (let i = 0; i < 4; i++) {
      const x0 = xt + i * cw;
      g.fillStyle = rgba(c.aco, 0.55);
      g.fillRect(x0, yM, cw, 15 * k);
      g.strokeStyle = c.eixo;
      g.lineWidth = 1;
      g.strokeRect(nx(x0), nx(yM), Math.round(cw), Math.round(15 * k));
      tx(g, fmt(AM[i][1], 2), x0 + cw / 2, yM + 11 * k, { px: 8.5 * k, c: c.texto, a: 'center' });
    }
    tx(g, '→ ' + fmt(REG, 2), xt + 4 * cw + 4 * k, yM + 11 * k, { px: 9 * k, c: c.branco, peso: 600 });

    S.mira(g, a, { x: l, y: t, w: rp - l, h: b - t }, (mx, my) => {
      const i = lim(Math.floor((mx - l) / slot), 0, n - 1);
      const v = ((b - my) / (b - t)) * YM;
      const ls = i < n - 1
        ? ['amostra ' + AM[i][0] + ' · ' + fmt(AM[i][1], 2) + ' mm/s', 'entra na régua (média ' + fmt(REG, 2) + ')']
        : ['hoje · ' + fmt(AM[i][1], 2) + ' mm/s', 'régua ' + fmt(REG, 2) + ' → ' + sinal(PR, 1) + ' %', 'só a última ' + fmt(AM[3][1], 2) + ' → ' + sinal(PU, 1) + ' %'];
      ls.push('mira ' + fmt(v, 2) + ' mm/s · ' + sinal((v / REG - 1) * 100, 1) + ' % da régua');
      return ls;
    });
  });

  // ================= 4 · minitendência: declive por hora (mínimos quadrados) e tempo até o alerta =================
  const TD = (() => {
    const N = 61, m = N - 1; // um ponto por minuto, de −60 min a agora
    const r = S.prng(6061);
    const u = [];
    let ar = 0;
    for (let i = 0; i < m; i++) { ar = 0.45 * ar + (r() + r() + r() - 1.5) * 0.05; u.push(ar); }
    // tira do ruído a média e a inclinação: a reta sai exata de 3,58 a 4,18 e o último ponto fica em 4,18
    let s1 = 0, st = 0, stt = 0, su = 0, stu = 0;
    for (let i = 0; i < m; i++) { s1++; st += i; stt += i * i; su += u[i]; stu += i * u[i]; }
    const d = s1 * stt - st * st, A = (stt * su - st * stu) / d, B = (s1 * stu - st * su) / d;
    const y = [];
    for (let i = 0; i < N; i++) y.push(3.58 + (0.6 * i) / 60 + (i < m ? u[i] - A - B * i : 0));
    // a regressão como o leitor faz: tempo em horas (−1 a 0), declive por hora e r²
    let mx = 0, my = 0;
    for (let i = 0; i < N; i++) { mx += (i - 60) / 60; my += y[i]; }
    mx /= N; my /= N;
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < N; i++) { const dx = (i - 60) / 60 - mx, dy = y[i] - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    const dec = sxy / sxx, agora = my - dec * mx;
    return { y, n: N, dec, agora, r2: (sxy * sxy) / (sxx * syy), eta: (R.al - agora) / dec };
  })();

  S.tela('x1-tendencia', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), H = h / k;
    cab(g, w, k, 'VT-03 · mancal B · janela de 60 min', '1 ponto por minuto');
    const l = 30 * k, r = w - 12 * k, t = 26 * k, b = (H - 24) * k;
    const Y0 = 3.2, Y1 = 6.0;
    const xi = (i) => l + (i / 60) * (r - l);
    const yv = (v) => b - ((v - Y0) / (Y1 - Y0)) * (b - t);
    // papel milimetrado da janela: 1 min × 0,1 mm/s, traço forte a cada 5 min e a cada 0,5 mm/s
    g.fillStyle = c.painel;
    g.fillRect(l, t, r - l, b - t);
    g.lineWidth = 1;
    for (let forte = 0; forte < 2; forte++) {
      g.beginPath();
      for (let i = 0; i <= 60; i++) if ((i % 5 === 0) === !!forte) { const X = nx(xi(i)); g.moveTo(X, t); g.lineTo(X, b); }
      for (let j = 0; j <= 28; j++) {
        const v = Y0 + j / 10;
        if ((Math.abs(v * 2 - Math.round(v * 2)) < 1e-6) !== !!forte) continue;
        const Y = nx(yv(v)); g.moveTo(l, Y); g.lineTo(r, Y);
      }
      g.strokeStyle = forte ? c.grade2 : rgba(c.ciano, 0.07);
      g.stroke();
    }
    S.moldura(g, l, t, r - l, b - t);
    for (const v of [3.5, 4, 4.5, 5, 5.5]) tx(g, fmt(v, 1), l - 4 * k, yv(v) + 3 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    tx(g, '−60 min', l, b + 13 * k, { px: 8.5 * k, c: c.dim });
    for (const i of [15, 30, 45]) tx(g, '−' + (60 - i), xi(i), b + 13 * k, { px: 8.5 * k, c: c.dim, a: 'center' });
    tx(g, 'agora', r, b + 13 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    // alerta 5,6 (sev 2), ainda acima da série
    hl(g, l, r, yv(R.al), c.alerta, 1.2, [5, 3]);
    tx(g, 'alerta ' + fmt(R.al, 1) + ' · sev 2', l + 6 * k, yv(R.al) - 5 * k, { px: 8.5 * k, c: c.alerta });
    // série e reta de mínimos quadrados
    const pts = TD.y.map((v, i) => [xi(i), yv(v)]);
    S.linha(g, pts, rgba(c.ciano, 0.85), 1.3);
    g.fillStyle = c.ciano;
    for (const p of pts) { g.beginPath(); g.arc(p[0], p[1], 1.3 * k, 0, 2 * Math.PI); g.fill(); }
    S.linha(g, [[xi(0), yv(TD.agora - TD.dec)], [xi(60), yv(TD.agora)]], c.ambar, 1.4, [6, 4]);
    const ult = pts[pts.length - 1];
    pulso(g, ult[0], ult[1], 2.5 * k, c.ciano, k);
    g.fillStyle = c.branco;
    g.beginPath(); g.arc(ult[0], ult[1], 2.6 * k, 0, 2 * Math.PI); g.fill();
    // leitura do declive, com o critério do leitor para estimar o tempo (r² ≥ 0,8 e n ≥ 6)
    const xL = l + 8 * k, yL = yv(R.al) + 22 * k;
    const estima = TD.r2 >= 0.8 && TD.n >= 6 && TD.dec > 0;
    rot(g, sinal(TD.dec, 1) + ' mm/s por hora', xL, yL, { px: 13 * k, c: c.ambar, peso: 600 }, k);
    rot(g, 'mínimos quadrados · r² ' + fmt(TD.r2, 2) + ' ≥ 0,8 · n ' + TD.n + ' ≥ 6', xL, yL + 14 * k, { px: 8.5 * k, c: c.texto }, k);
    rot(g, estima ? 'critério atendido: estima o tempo' : 'critério não atendido: sem estimativa', xL, yL + 26 * k, { px: 8.5 * k, c: c.dim }, k);
    // cota de agora até o alerta: o que falta ÷ o declive = tempo estimado (só com o critério atendido)
    if (estima) {
      const xq = r - 9 * k, ya = yv(R.al), yb = yv(TD.agora);
      S.linha(g, [[xq, ya + 1], [xq, yb - 1]], c.ambar, 1.2);
      S.seta(g, xq, yb - 4 * k, xq, ya + 1, c.ambar, k * 0.8);
      S.seta(g, xq, ya + 4 * k, xq, yb - 1, c.ambar, k * 0.8);
      const ym = (ya + yb) / 2;
      rot(g, 'faltam ' + fmt(R.al - TD.agora, 2) + ' mm/s', xq - 6 * k, ym - 8 * k, { px: 9 * k, c: c.texto, a: 'right' }, k);
      rot(g, '÷ ' + fmt(TD.dec, 1) + ' por hora', xq - 6 * k, ym + 5 * k, { px: 8.5 * k, c: c.dim, a: 'right' }, k);
      rot(g, '≈ ' + fmt(TD.eta, 1) + ' h até o alerta', xq - 6 * k, ym + 20 * k, { px: 10 * k, c: c.ambar, a: 'right', peso: 700 }, k);
    }

    S.mira(g, a, { x: l, y: t, w: r - l, h: b - t }, (mx) => {
      const i = lim(Math.round(((mx - l) / (r - l)) * 60), 0, 60);
      const reta = TD.agora - TD.dec * ((60 - i) / 60);
      return [(i === 60 ? 'agora' : '−' + (60 - i) + ' min'), 'VT-03 ' + fmt(TD.y[i], 2) + ' mm/s', 'reta ' + fmt(reta, 2) + ' · resíduo ' + sinal(TD.y[i] - reta, 2)];
    });
  });

  // ================= 5 · marcadores de rolamento sobre o espectro (ilustrativo) =================
  // 3.560 rpm = motor de 2 polos em 60 Hz (10/11/2026); as frequências saem da geometria: 9 corpos, d/D 0,40, ângulo 0
  const RPM = 3560, FR = RPM / 60, NC = 9, DD = 0.4; // 1× = 59,3 Hz
  const F_FTF = (FR / 2) * (1 - DD), F_BSF = (FR / (2 * DD)) * (1 - DD * DD), F_BPFO = (NC / 2) * FR * (1 - DD), F_BPFI = (NC / 2) * FR * (1 + DD);
  const MK = [
    { n: 'FTF', f: F_FTF, amp: 0.07, tipo: 'rol', o: 'gaiola · fr/2 · (1 − d/D)' },
    { n: '1×', f: FR, amp: 1.6, tipo: 'ordem', o: 'rotação do eixo · 3.560 rpm' },
    { n: 'BSF', f: F_BSF, amp: 0.09, tipo: 'rol', o: 'corpo rolante · fr/(2·d/D) · (1 − (d/D)²)' },
    { n: '2×', f: 2 * FR, amp: 0.55, tipo: 'ordem', o: '2× a rotação' },
    { n: '2×BSF', f: 2 * F_BSF, amp: 0.08, tipo: 'rol', o: '2× o corpo rolante' },
    { n: 'BPFO', f: F_BPFO, amp: 3.4, tipo: 'bpfo', o: 'pista externa · 4,5 · fr · (1 − d/D)' },
    { n: 'BPFI', f: F_BPFI, amp: 0.35, tipo: 'rol', o: 'pista interna · 4,5 · fr · (1 + d/D)' }
  ];
  const H2 = { n: '2×BPFO', f: 2 * F_BPFO, amp: 1.1, o: '2º harmônico da pista externa' };
  const FMAX = 400, DF = 0.25;
  const ESP = (() => {
    const n = Math.round(FMAX / DF) + 1;
    const v = new Float32Array(n);
    const r = S.prng(1345);
    let p = 0;
    for (let i = 0; i < n; i++) { p = 0.6 * p + 0.4 * r(); v[i] = 0.035 + 0.05 * p + 0.03 * Math.exp(-(i * DF) / 30); }
    for (const q of MK.concat([H2])) {
      for (let i = Math.max(0, Math.floor((q.f - 3) / DF)); i <= Math.min(n - 1, Math.ceil((q.f + 3) / DF)); i++) {
        const d = (i * DF - q.f) / 0.55;
        v[i] += q.amp * Math.exp(-0.5 * d * d);
      }
    }
    return v;
  })();
  const espEm = (f) => ESP[lim(Math.round(f / DF), 0, ESP.length - 1)];

  S.tela('x1-marcadores', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), H = h / k, m = a.mem;
    // cabeçalho: a geometria catalogada e a fonte
    const c1 = 'rolamento 9 corpos · d/D ' + fmt(0.4, 2) + ' · ' + fmt(RPM) + ' rpm (1× ' + fmt(FR, 1) + ' Hz) · ';
    let px = 9.5 * k;
    while (px > 8.5 * k && larg(g, c1 + 'fonte citada', px) > w - 16 * k) px -= 0.25 * k;
    tx(g, c1, 8 * k, 14 * k, { px, c: c.dim });
    tx(g, 'fonte citada', 8 * k + larg(g, c1, px), 14 * k, { px, c: c.ambar, peso: 600 });
    const l = 26 * k, r = w - 10 * k, t = 50 * k, b = (H - 46) * k, AMX = 4;
    const xf = (f) => l + (f / FMAX) * (r - l);
    const ya = (v) => b - (Math.min(v, AMX) / AMX) * (b - t);
    for (const v of [1, 2, 3, 4]) {
      hl(g, l, r, ya(v), rgba(c.eixo, 0.6), 1, [2, 3]);
      tx(g, fmt(v), l - 4 * k, ya(v) + 3 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    }
    tx(g, 'mm/s', l - 4 * k, t + 14 * k, { px: 8.5 * k, c: c.dim2, a: 'right' });
    for (let f = 0; f <= FMAX; f += 50) {
      vl(g, xf(f), b, b + 4 * k, c.eixo);
      tx(g, f === FMAX ? fmt(f) + ' Hz' : fmt(f), xf(f), b + 14 * k, { px: 8.5 * k, c: c.dim, a: f === FMAX ? 'right' : f ? 'center' : 'left' });
    }
    // cursores (atrás do espectro) com rótulo e frequência numa fileira sem sobreposição
    const corM = (q) => (q.tipo === 'bpfo' ? c.trip : q.tipo === 'ordem' ? c.texto : c.ambar);
    const yN = 30 * k, yF = 40 * k;
    const itens = MK.map((q) => ({ q, alvo: xf(q.f), larg: Math.max(larg(g, q.n, 9 * k, 700), larg(g, fmt(q.f, 1), 8.5 * k)) + 2 * k }));
    arrumar(itens, 4 * k, w - 4 * k, 5 * k);
    for (const it of itens) {
      const q = it.q, X = it.alvo, cc = corM(q), forte = q.tipo === 'bpfo';
      S.linha(g, [[X, b], [X, t - 3 * k]], rgba(cc, forte ? 0.95 : 0.6), forte ? 1.4 : 1, [3, 3]);
      S.linha(g, [[X, t - 3 * k], [it.x, yF + 4 * k]], rgba(cc, forte ? 0.95 : 0.6), 1);
      tx(g, q.n, it.x, yN, { px: 9 * k, c: cc, a: 'center', peso: 700 });
      tx(g, fmt(q.f, 1), it.x, yF, { px: 8.5 * k, c: forte ? c.trip : c.dim, a: 'center', peso: forte ? 600 : 400 });
    }
    S.moldura(g, l, t, r - l, b - t);
    // espectro: envoltória por coluna (o pico estreito não some em tela pequena), guardada por largura
    const nc = Math.max(2, Math.round(r - l));
    if (!m.env || m.env.length !== nc) {
      m.env = new Float32Array(nc);
      for (let j = 0; j < nc; j++) {
        const i0 = Math.floor(((j / nc) * FMAX) / DF), i1 = Math.max(i0, Math.floor((((j + 1) / nc) * FMAX) / DF));
        let mx = 0;
        for (let i = i0; i <= Math.min(i1, ESP.length - 1); i++) if (ESP[i] > mx) mx = ESP[i];
        m.env[j] = mx;
      }
    }
    const env = m.env, xj = (j) => l + ((j + 0.5) / nc) * (r - l);
    g.beginPath();
    g.moveTo(l, b);
    for (let j = 0; j < nc; j++) g.lineTo(xj(j), ya(env[j]));
    g.lineTo(r, b);
    g.closePath();
    g.fillStyle = rgba(c.ciano, 0.12);
    g.fill();
    const trecho = (f0, f1, cc, lw) => {
      g.beginPath();
      let ini = true;
      for (let j = 0; j < nc; j++) {
        const f = ((j + 0.5) / nc) * FMAX;
        if (f < f0 || f > f1) continue;
        if (ini) { g.moveTo(xj(j), ya(env[j])); ini = false; } else g.lineTo(xj(j), ya(env[j]));
      }
      g.strokeStyle = cc; g.lineWidth = lw; g.stroke();
    };
    const BPFO = MK.find((q) => q.tipo === 'bpfo');
    trecho(0, FMAX, c.ciano, 1.2);
    trecho(BPFO.f - 2.5, BPFO.f + 2.5, c.trip, 1.8);
    trecho(H2.f - 2.5, H2.f + 2.5, c.trip, 1.5);
    // destaque da BPFO e o 2º harmônico
    const xb = xf(BPFO.f), yb = ya(espEm(BPFO.f));
    pulso(g, xb, yb, 2.5 * k, c.trip, k);
    S.led(g, xb, yb, 2.6 * k, c.trip);
    rot(g, 'pico alto na BPFO · pista externa', xb + 8 * k, yb + 10 * k, { px: 9 * k, c: c.trip, peso: 600 }, k);
    rot(g, H2.n + ' ' + fmt(H2.f, 1), xf(H2.f), ya(espEm(H2.f)) - 6 * k, { px: 8.5 * k, c: rgba(c.trip, 0.9), a: 'center' }, k);
    tx(g, 'espectro ilustrativo', xf(190), b - 14 * k, { px: 8.5 * k, c: c.dim2 });
    // de onde vem o espectro: o Modbus só entrega valores estáticos (honestidade de canal); a onda vem do X·U ou do FC20
    const NOTA = ['espectro do X·FFT, com a onda do X·U ou do FC20', 'pelo Modbus, o X·1 entrega os marcadores calculados e a fonte'];
    const inteira = NOTA.join(' · '), lnota = w - 16 * k;
    g.font = F(8.5 * k);
    const linhasNota = g.measureText(inteira).width <= lnota ? [inteira] : [NOTA[0] + ' ·'].concat(S.quebraTexto(g, NOTA[1], lnota));
    linhasNota.slice(0, 2).forEach((s, i) => tx(g, s, 8 * k, (H - 18 + i * 11) * k, { px: 8.5 * k, c: c.dim }));

    S.mira(g, a, { x: l, y: t, w: r - l, h: b - t }, (mx) => {
      const f = ((mx - l) / (r - l)) * FMAX;
      let perto = null;
      for (const q of MK.concat([H2])) if (Math.abs(q.f - f) <= 4 && (!perto || Math.abs(q.f - f) < Math.abs(perto.f - f))) perto = q;
      const ls = [fmt(f, 1) + ' Hz · ordem ' + fmt(f / FR, 2) + '×', 'amplitude ' + fmt(espEm(f), 2) + ' mm/s'];
      if (perto) ls.push(perto.n + ' ' + fmt(perto.f, 1) + ' Hz · ' + perto.o);
      return ls;
    });
  });

  // ================= 6 · confirmação em ciclos e histerese no retorno (VT-01 · mancal A, ATENÇÃO → BOM às 08:17) =================
  // O mancal A vem da madrugada em ATENÇÃO: cai para a faixa de histerese (5,29 a 5,6) e o estado segura; 3 ciclos
  // seguidos abaixo de 5,29 e volta ao BOM às 08:17:00 (o "▼ Mancal A voltou ao BOM · 08:17" do cartão); já em BOM,
  // um sobressalto de 1 ciclo acima de 5,6 conta 1/3 e zera, sem escalar.
  const T0 = 8 * 3600 + 16 * 60 + 50; // 08:16:50, o primeiro ciclo da janela
  const SEQ = [5.81, 5.76, 5.7, 5.64, 5.55, 5.47, 5.41, 5.35, 5.22, 5.13, 5.04, 4.97, 4.93, 4.98, 5.06, 5.79, 5.03, 4.95, 4.9, 4.87];
  const EST0 = 'alerta'; // estado no começo da janela: ATENÇÃO confirmada desde a madrugada
  const hms = (s) => { const z = (x) => String(x).padStart(2, '0'); return z(Math.floor(s / 3600)) + ':' + z(Math.floor((s % 3600) / 60)) + ':' + z(s % 60); };
  // a régua do X·1 ciclo a ciclo: escala com 3 ciclos seguidos acima do limite; volta com 3 seguidos abaixo de 5,29
  const CF = (() => {
    let est = EST0, acima = EST0 === 'ok' ? 0 : S.CONFIRMA, abaixo = 0;
    return SEQ.map((v) => {
      const antes = est, acimaAntes = acima;
      const nivel = estDe(v);
      if (nivel !== 'ok') { acima++; abaixo = 0; } else if (v < RET) { abaixo++; acima = 0; } else { acima = 0; abaixo = 0; }
      if (nivel !== 'ok' && acima >= S.CONFIRMA && est !== nivel) est = nivel;
      if (est !== 'ok' && abaixo >= S.CONFIRMA) est = 'ok';
      let conta = '';
      if (antes === 'ok') conta = acima > 0 && acima <= S.CONFIRMA ? acima + '/3' : acimaAntes > 0 ? 'zera' : '';
      else conta = nivel !== 'ok' ? '' : v >= RET ? 'segura' : abaixo + '/3';
      return { v, est, antes, conta, zona: nivel !== 'ok' ? 'acima' : v >= RET ? 'faixa' : 'abaixo', sobe: antes === 'ok' };
    });
  })();
  const I_VOLTA = CF.findIndex((q) => q.antes !== 'ok' && q.est === 'ok'); // 08:17:00, o "▼ Mancal A voltou ao BOM" do cartão
  function lerCiclo(i) {
    const q = CF[i];
    let ev = q.conta;
    if (ev === '3/3') ev += q.sobe ? ' ▲' : ' ▼';
    else if (ev && ev !== 'zera' && ev !== 'segura') ev = (q.sobe ? 'acima ' : 'abaixo ') + ev;
    else if (ev === 'segura') ev = 'faixa: segura';
    else if (!ev) ev = q.zona === 'acima' ? 'acima do alerta' : q.zona === 'faixa' ? 'na faixa' : 'abaixo do alerta';
    return { t: hms(T0 + i), v: q.v, ev, est: q.est };
  }

  S.tela('x1-confirma', (g, w, h, a) => {
    S.base(g, w, h);
    const k = S.esc(w), H = h / k, N = SEQ.length;
    const l = 42 * k, r = w - 8 * k, t = 22 * k, b = (H - 50) * k;
    const Y0 = 4.7, Y1 = 6.15;
    const cw = (r - l) / N, xc = (i) => l + cw * (i + 0.5);
    const yv = (v) => b - ((v - Y0) / (Y1 - Y0)) * (b - t);
    const yC0 = b + 5 * k, yC1 = b + 18 * k, yE0 = b + 21 * k, yE1 = b + 34 * k;
    // cursor: anda um ciclo por segundo (contínuo no modo fluido, aos saltos no 1 Hz), pausa 3 s no fim do laço;
    // com o mouse em cima, o cursor é o mouse
    const mo = a.mouse;
    const dentro = mo && mo.x >= l && mo.x <= r && mo.y >= t && mo.y <= yE1;
    const LACO = N + 3;
    const p = uma() ? Math.floor(S.t) % LACO : S.t % LACO;
    const ic = dentro ? lim(Math.floor((mo.x - l) / cw), 0, N - 1) : Math.min(Math.floor(p), N - 1);
    const xcur = dentro ? null : uma() ? xc(ic) : l + Math.min(p, N) * cw;
    // cabeçalho: ponto e a leitura do ciclo do cursor (o nome do ponto encurta se faltar lugar)
    const lc = lerCiclo(ic);
    const sEst = NOME[lc.est], wEst = larg(g, sEst, 9 * k, 700);
    const sLei = lc.t + ' · ' + fmt(lc.v, 2) + ' · ' + lc.ev + ' · ', wLei = larg(g, sLei, 9 * k);
    tx(g, sEst, w - 8 * k, 13 * k, { px: 9 * k, c: S.estadoCor(lc.est), a: 'right', peso: 700 });
    tx(g, sLei, w - 8 * k - wEst, 13 * k, { px: 9 * k, c: c.texto, a: 'right' });
    const livre = w - 16 * k - wEst - wLei - 10 * k;
    const sPt = ['VT-01 · mancal A · ciclo 1 s', 'VT-01 · mancal A', 'VT-01'].find((s) => larg(g, s, 9.5 * k) <= livre);
    if (sPt) tx(g, sPt, 8 * k, 13 * k, { px: 9.5 * k, c: c.dim });
    // coluna do ciclo em destaque e o cursor do laço (atrás da série e dos rótulos)
    g.fillStyle = rgba(c.branco, 0.06);
    g.fillRect(l + ic * cw, t, cw, yE1 - t);
    if (xcur !== null) {
      vl(g, xcur, t, yE1, rgba(c.branco, 0.6), 1);
      tri(g, xcur, t, 3.5 * k, 1, c.branco);
    }
    // faixa de histerese (5,29 a 5,6), alerta e retorno
    g.fillStyle = rgba(c.ciano, 0.06);
    g.fillRect(l, yv(R.al), r - l, yv(RET) - yv(R.al));
    S.moldura(g, l, t, r - l, b - t);
    hl(g, l, r, yv(R.al), c.alerta, 1.2, [5, 3]);
    hl(g, l, r, yv(RET), c.ok, 1, [2, 3]);
    tx(g, 'alerta', l - 4 * k, yv(R.al) - 2 * k, { px: 8.5 * k, c: c.alerta, a: 'right' });
    tx(g, fmt(R.al, 1), l - 4 * k, yv(R.al) + 8 * k, { px: 8.5 * k, c: c.alerta, a: 'right', peso: 600 });
    tx(g, 'retorno', l - 4 * k, yv(RET) - 2 * k, { px: 8.5 * k, c: c.ok, a: 'right' });
    tx(g, fmt(RET, 2), l - 4 * k, yv(RET) + 8 * k, { px: 8.5 * k, c: c.ok, a: 'right', peso: 600 });
    // eventos: escala em ATENÇÃO e volta ao BOM (linha vertical do gráfico até a pista do contador)
    for (let i = 0; i < N; i++) {
      if (CF[i].est === CF[i].antes) continue;
      vl(g, xc(i), t, yC1, rgba(S.estadoCor(CF[i].est), 0.7), 1, [2, 2]);
    }
    rot(g, 'histerese', r - 4 * k, yv(R.al) + 10 * k, { px: 8.5 * k, c: c.dim, a: 'right' }, k);
    rot(g, '20/64 = ' + fmt(HIST, 2), r - 4 * k, yv(R.al) + 20 * k, { px: 8.5 * k, c: c.dim, a: 'right' }, k);
    // o sobressalto: um ciclo acima, contador 1/3 e zera
    const iS = CF.findIndex((q) => q.conta === 'zera') - 1;
    if (iS >= 0) {
      tx(g, 'sobressalto', xc(iS) + 7 * k, t + 10 * k, { px: 8.5 * k, c: c.alerta });
      tx(g, 'não escala', xc(iS) + 7 * k, t + 20 * k, { px: 8.5 * k, c: c.dim });
    }
    // série, um ponto por ciclo, colorido pela zona
    S.linha(g, SEQ.map((v, i) => [xc(i), yv(v)]), rgba(c.ciano, 0.8), 1.3);
    CF.forEach((q, i) => {
      const cc = q.zona === 'acima' ? c.alerta : q.zona === 'faixa' ? c.texto : c.ciano;
      g.fillStyle = cc;
      g.beginPath(); g.arc(xc(i), yv(q.v), (i === ic ? 3.4 : 2.4) * k, 0, 2 * Math.PI); g.fill();
      if (i === ic) { g.strokeStyle = c.branco; g.lineWidth = 1.2; g.beginPath(); g.arc(xc(i), yv(q.v), 5.5 * k, 0, 2 * Math.PI); g.stroke(); }
    });
    // pista do contador: 1/3, 2/3, 3/3, zera e segura (em tela muito estreita, 1 e 2 sem o "/3")
    tx(g, 'conta', l - 4 * k, yC1 - 3.5 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    const curto = larg(g, '1/3', 8.5 * k) + 3.5 * k > cw;
    S.moldura(g, l, yC0, r - l, yC1 - yC0);
    for (let i = 0; i < N;) {
      const q = CF[i];
      if (q.conta === 'segura') {
        let j = i;
        while (j + 1 < N && CF[j + 1].conta === 'segura') j++;
        const x0 = l + i * cw + 2 * k, x1 = l + (j + 1) * cw - 2 * k, yy = (yC0 + yC1) / 2;
        hl(g, x0, x1, yy, rgba(c.alerta, 0.6));
        vl(g, x0, yy - 3 * k, yy + 3 * k, rgba(c.alerta, 0.6));
        vl(g, x1, yy - 3 * k, yy + 3 * k, rgba(c.alerta, 0.6));
        rot(g, 'segura', (x0 + x1) / 2, yC1 - 3.5 * k, { px: 8.5 * k, c: c.alerta, a: 'center', peso: 600 }, k);
        i = j + 1;
        continue;
      }
      if (q.conta === 'zera') {
        // o contador volta a zero: o texto começa na casa dele e avança sobre as vazias da direita
        tx(g, 'zera', l + i * cw + 3 * k, yC1 - 3.5 * k, { px: 8.5 * k, c: c.dim });
      } else if (q.conta) {
        const cc = q.sobe ? c.alerta : c.ok;
        if (q.conta === '3/3') { g.fillStyle = rgba(cc, 0.2); g.fillRect(l + i * cw + 1, yC0 + 1, cw - 2, yC1 - yC0 - 2); }
        const s = curto && q.conta !== '3/3' ? q.conta.charAt(0) : q.conta;
        tx(g, s, xc(i), yC1 - 3.5 * k, { px: 8.5 * k, c: cc, a: 'center', peso: q.conta === '3/3' ? 700 : 500 });
      }
      i++;
    }
    // faixa de estado: ATENÇÃO desde a madrugada → ▼ BOM às 08:17:00
    tx(g, 'estado', l - 4 * k, yE1 - 3.5 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    for (let i = 0; i < N;) {
      let j = i;
      while (j + 1 < N && CF[j + 1].est === CF[i].est) j++;
      const cz = S.estadoCor(CF[i].est), x0 = l + i * cw, x1 = l + (j + 1) * cw;
      g.fillStyle = rgba(cz, 0.22);
      g.fillRect(x0, yE0, x1 - x0, yE1 - yE0);
      g.fillStyle = cz;
      g.fillRect(x0, yE1 - 2 * k, x1 - x0, 2 * k);
      const seta = i === 0 ? '' : CF[i].est === 'ok' ? '▼ ' : '▲ ';
      let s = seta + NOME[CF[i].est] + (i ? ' ' + hms(T0 + i) : CF[i].est !== 'ok' ? ' desde a madrugada' : '');
      if (larg(g, s, 8.5 * k, 700) > x1 - x0 - 6 * k) s = seta + NOME[CF[i].est];
      tx(g, s, x0 + 4 * k, yE1 - 4.5 * k, { px: 8.5 * k, c: cz, peso: 700 });
      i = j + 1;
    }
    S.moldura(g, l, yE0, r - l, yE1 - yE0);
    // relógio dos ciclos
    g.strokeStyle = c.eixo;
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= N; i++) { const X = nx(l + i * cw); g.moveTo(X, yE1); g.lineTo(X, yE1 + 3 * k); }
    g.stroke();
    for (let i = I_VOLTA % 5; i < N; i += 5) tx(g, hms(T0 + i), xc(i), yE1 + 13 * k, { px: 8.5 * k, c: i === I_VOLTA ? c.ok : c.dim, a: 'center', peso: i === I_VOLTA ? 600 : 400 });

    S.mira(g, a, { x: l, y: t, w: r - l, h: yE1 - t }, () => {
      const q = CF[ic], lq = lerCiclo(ic);
      return [lq.t + ' · ciclo ' + (ic + 1) + ' de ' + N, fmt(q.v, 2) + ' mm/s · ' + (q.zona === 'acima' ? 'acima do alerta 5,6' : q.zona === 'faixa' ? 'na faixa de histerese' : 'abaixo de ' + fmt(RET, 2)), 'conta ' + (q.conta || '—') + ' · estado ' + NOME[q.est]];
    });
  });
})();
