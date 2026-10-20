// FRV XcoInit · página do produto — animação leve dos ilustrativos (hero + diagrama).
// Externo de propósito: o CSP do site usa script-src 'self' (sem inline).
// Todos os valores são fictícios e gerados aqui, no navegador.
'use strict';
(function () {
  const fmt = (v) => v.toFixed(2).replace('.', ',');
  const clinha = (v, a, b, passo) => {
    // random walk gentil com retorno ao meio da faixa
    let nv = v + (Math.random() - 0.5) * passo + (a + b) / 2 * 0.02 - v * 0.02;
    return Math.max(a, Math.min(b, nv));
  };
  const pontos = (arr, w, h, mn, mx) => {
    if (!arr.length) return '';
    const dx = (mx - mn) || 1;
    return arr.map((v, k) =>
      (k / (arr.length - 1 || 1) * w).toFixed(1) + ',' +
      (h - ((v - mn) / dx * (h - 6) + 3)).toFixed(1)
    ).join(' ');
  };

  // --- mock do hero: VT-01 / VT-02 / MT-01 caminham, série cresce
  const eVT1 = document.getElementById('hVT1');
  const eVT2 = document.getElementById('hVT2');
  const eMT1 = document.getElementById('hMT1');
  const hSpark = document.getElementById('hSpark');
  let vt1 = 4.82, vt2 = 4.91, mt1 = 63.4;
  const hist = [];
  for (let i = 0; i < 40; i++) hist.push(4.2 + Math.sin(i / 5) * 0.9 + Math.random() * 0.4);
  setInterval(() => {
    vt1 = clinha(vt1, 3.4, 6.4, 0.35);
    vt2 = clinha(vt2, 3.6, 6.6, 0.32);
    mt1 = clinha(mt1, 58, 70, 0.5);
    if (eVT1) eVT1.textContent = fmt(vt1);
    if (eVT2) eVT2.textContent = fmt(vt2);
    if (eMT1) eMT1.textContent = fmt(mt1);
    hist.push(vt1); if (hist.length > 40) hist.shift();
    if (hSpark) hSpark.setAttribute('points', pontos(hist, 240, 40, 3.2, 6.8));
    const spX = document.getElementById('spX');
    if (spX) spX.setAttribute('points', pontos(hist, 124, 36, 3.2, 6.8)
      .split(' ').map((pt) => pt.split(',').map(Number))
      .map(([x, y]) => (566 + x).toFixed(1) + ',' + (112 + y).toFixed(1))
      .join(' '));
  }, 1500);
})();
