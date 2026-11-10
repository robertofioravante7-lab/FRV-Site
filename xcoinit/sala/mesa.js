// FRV XcoInit · topo da página do produto (10/11/2026): a mesa de leitura escura.
// As quatro leituras, os mini-anunciadores e a linha de atividade do barramento seguem o dispositivo
// ilustrativo de paineis.js (um ciclo de 1 s); a tendência viva de VT-01 é um canvas com as linhas de
// alerta 5,6 e de alarme 7,1 mm/s. Um anunciador só acende depois de 3 ciclos seguidos acima do limite
// (a confirmação do X·1) e só apaga depois de 3 ciclos abaixo do limite menos a histerese.
'use strict';
(function () {
  const S = window.XcoSala;
  if (!S) return;
  const $ = (id) => document.getElementById(id);
  const JAN = { ok: 'off', alerta: 'alerta', alarme: 'trip' };
  const acesas = {};

  function janela(nome, e) {
    const j = document.querySelector('[data-mesa-jan="' + nome + '"]');
    if (!j) return;
    if (j.getAttribute('data-e') !== e) {
      j.setAttribute('data-e', e);
      acesas[nome] = e !== 'off' ? performance.now() : 0;
    }
    // alarme novo pisca por 6 s (não há botão de reconhecer na mesa do topo), depois fica aceso fixo
    j.classList.toggle('pisca', !!acesas[nome] && performance.now() - acesas[nome] < 6000);
  }
  function valor(id, q, casas) {
    const e = $(id);
    if (!e) return;
    e.textContent = S.fmt(q.v, casas);
    e.setAttribute('data-e', q.est);
  }
  function atualizar(dev) {
    valor('hVT1', dev.p['VT-01'], 2);
    valor('hVT2', dev.p['VT-02'], 2);
    valor('hMT1', dev.p['TT-01'], 1);
    janela('VT-01', JAN[dev.p['VT-01'].est]);
    janela('VT-02', JAN[dev.p['VT-02'].est]);
    janela('TT-01', JAN[dev.p['TT-01'].est]);
    const lg = $('hLote');
    if (lg) lg.textContent = 'ciclo ' + S.fmt(dev.ciclo) + ' · ' + dev.lote + ' · latência ~2 ms';
  }
  S.aoCiclo(atualizar);
  S.aoIniciar.push(() => atualizar(S.dev));

  // ---- tendência viva de VT-01 (3 min, um valor por ciclo), com as zonas da régua
  S.tela('mesa-tend', (g, w, h, a) => {
    const c = S.cor, k = S.esc(w), dev = S.dev;
    const q = dev.p['VT-01'];
    const R = S.REGUA['mm/s'];
    S.base(g, w, h);
    const l = 30 * k, r = w - 12 * k, t = 22 * k, b = h - 17 * k;
    const Y0 = 2, Y1 = 8;
    const y = (v) => b - ((S.lim(v, Y0, Y1) - Y0) / (Y1 - Y0)) * (b - t);
    const hist = q.hist, n = hist.length;
    const x = (i) => l + (i / Math.max(n - 1, 1)) * (r - l);
    // zonas ATENÇÃO e AÇÃO
    g.fillStyle = S.rgba(c.alerta, 0.07); g.fillRect(l, y(R.alarme), r - l, y(R.al) - y(R.alarme));
    g.fillStyle = S.rgba(c.trip, 0.08); g.fillRect(l, t, r - l, y(R.alarme) - t);
    S.moldura(g, l, t, r - l, b - t);
    for (const v of [2, 4, 6, 8]) S.tx(g, S.fmt(v), l - 5 * k, y(v) + 3 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    for (const [s, rot] of [[60, '−2 min'], [120, '−1 min']]) {
      const X = x(s); g.strokeStyle = c.eixo; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(X, t); g.lineTo(X, b); g.stroke(); g.setLineDash([]);
      S.tx(g, rot, X, b + 12 * k, { px: 8.5 * k, c: c.dim, a: 'center' });
    }
    S.tx(g, '−3 min', l, b + 12 * k, { px: 8.5 * k, c: c.dim });
    S.tx(g, 'agora', r, b + 12 * k, { px: 8.5 * k, c: c.dim, a: 'right' });
    // limites
    S.linha(g, [[l, y(R.al)], [r, y(R.al)]], c.alerta, 1.1, [5, 3]);
    S.linha(g, [[l, y(R.alarme)], [r, y(R.alarme)]], c.trip, 1.1);
    S.tx(g, 'alerta 5,6 · sev 2', l + 5 * k, y(R.al) - 4 * k, { px: 8.5 * k, c: c.alerta });
    S.tx(g, 'alarme 7,1 · sev 4', l + 5 * k, y(R.alarme) - 4 * k, { px: 8.5 * k, c: c.trip });
    // série
    g.save(); g.beginPath(); g.rect(l, t, r - l, b - t); g.clip();
    g.beginPath();
    for (let i = 0; i < n; i++) { const X = x(i), Y = y(hist[i]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
    g.strokeStyle = c.ciano; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
    // ciclos acima do alerta marcados na base
    g.fillStyle = S.rgba(c.alerta, 0.55);
    for (let i = 0; i < n; i++) if (hist[i] >= R.al) g.fillRect(x(i) - 1, b - 3 * k, 2, 3 * k);
    g.restore();
    const ult = hist[n - 1];
    const corEst = q.est === 'ok' ? c.ciano : S.estadoCor(q.est);
    S.led(g, x(n - 1), y(ult), 3.2 * k, corEst);
    // cabeçalho: ponto, estado confirmado e contador de confirmação
    S.tx(g, 'VT-01 · mm/s · 3 min · ciclo 1 s', l, 14 * k, { px: 9.5 * k, c: c.dim });
    const nome = q.est === 'ok' ? 'BOM' : q.est === 'alerta' ? 'ATENÇÃO' : 'AÇÃO';
    let dir = S.fmt(ult, 2) + ' mm/s · ' + nome;
    if (q.est === 'ok' && q.acima > 0) dir = 'confirmando ' + Math.min(q.acima, S.CONFIRMA) + '/' + S.CONFIRMA + ' · ' + dir;
    else if (q.est !== 'ok' && q.abaixo > 0) dir = 'retorno ' + Math.min(q.abaixo, S.CONFIRMA) + '/' + S.CONFIRMA + ' · ' + dir;
    S.tx(g, dir, r, 14 * k, { px: 9.5 * k, c: q.est === 'ok' ? (q.acima ? c.alerta : c.texto) : S.estadoCor(q.est), a: 'right', peso: 600 });
    S.mira(g, a, { x: l, y: t, w: r - l, h: b - t }, (mx) => {
      const i = S.lim(Math.round(((mx - l) / (r - l)) * (n - 1)), 0, n - 1);
      const v = hist[i];
      const zona = v >= R.alarme ? 'AÇÃO' : v >= R.al ? 'ATENÇÃO' : 'BOM';
      return [S.fmt(i - (n - 1)) + ' s', 'VT-01 ' + S.fmt(v, 2) + ' mm/s', 'zona ' + zona];
    });
  });
})();
