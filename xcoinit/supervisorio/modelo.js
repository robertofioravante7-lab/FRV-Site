// FRV XcoInit · supervisório do Trem A (simulação ilustrativa) — modelo físico e cenários.
// Externo de propósito: o CSP do site usa script-src 'self' (sem inline).
// Nada aqui conversa com dispositivo: é um trem fictício, com números coerentes entre si.
// Física simplificada e declarada: rotor de 1 grau de liberdade com desbalanceamento,
// mancal curto (Ocvirk) para o centro do eixo, leis de semelhança no compressor e politrópica no gás.
// A votação 2oo3 (retardo por canal, veto por Not-OK, first-out) e a regra de hipótese
// (Pearson r <= -0,8, "hipótese, nunca veredito") seguem as regras do XcoInit.
'use strict';
(function () {
  const SV = (window.XcoSV = window.XcoSV || {});
  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
  const suave = (u) => { u = lim(u, 0, 1); return u * u * (3 - 2 * u); };
  const lerp = (a, b, u) => a + (b - a) * u;

  // ---------------- números do trem fictício ----------------
  const C = {
    N0: 3600,            // rpm do compressor (1× = 60 Hz)
    ZP: 41, ZG: 83,      // pinhão (eixo da turbina) e coroa (eixo do compressor)
    NC: 3082,            // crítica: pico da resposta 1×
    ZETA: 0.1776938,     // amortecimento que fecha o pico em 3.082 rpm e Δφ = 134° de 400 a 3.600 rpm
    PHI0: 60,            // ° entre a marca de referência de fase e o ponto pesado (fictício)
    A_PICO: 27.5,        // µm pp, 1× compensado no pico
    SR_AMP: 4.0, SR_FASE: 20, // slow roll 4 µm pp ∠ 20°, subtraído
    FOLGA_D: 180,        // µm, folga diametral do mancal radial
    EPS0: 0.35,          // excentricidade em 3.600 rpm, carga normal
    GAP0: -10.0,         // Vcc no ponto nominal
    SENS: 7.87e-3,       // V/µm (7,87 V/mm)
    GAP_MIN: -18, GAP_MAX: -2,
    XT_AL: 60, XT_PE: 90,      // µm pp
    VT_AL: 7.9, VT_PE: 12.4,   // mm/s pk
    VT_FUNDO: 20,              // fundo de escala
    RETARDO: 2.0,              // s, por canal
    R: 518.28, K: 1.31, Z: 1.0, // metano
    PS: 1000, TS: 27,          // kPa, °C
    Q0: 4615,                  // m³/h, ponto nominal
    QS100: 3600, HS100: 219,   // ponto de surge da linha de 100 %
    KH: 1.543e-5,              // curvatura da linha de 100 % (kJ/kg por (m³/h)²)
    Q_BEP: 5000,               // melhor eficiência a 100 %
    ETA0: 77.4,                // ηp nominal (%)
    ETA_SURGE: 72.83,          // ηp na linha de surge: fecha a perda em 114 kW = R$ 70,76/h
    ETA_REF: 77.4,             // referência da perda
    TARIFA: 0.62,              // R$/kWh
    S_MIN: 0.80, S_MAX: 1.05,  // faixa do mapa (fração da rotação)
    CONTROLE: 10, APERTADA: 20, // % de margem
    WHIRL: 0.48, AW_MAX: 46,   // ordem e amplitude final do whirl (µm pp)
    TT201_AL: 32, TT202_AL: 160
  };
  C.NN = C.NC * Math.sqrt(1 - 2 * C.ZETA * C.ZETA); // natural não amortecida (≈ 2.983 rpm)
  C.KETA = (C.ETA0 - C.ETA_SURGE) / ((C.QS100 - C.Q_BEP) ** 2 - (C.Q0 - C.Q_BEP) ** 2);
  C.ETA_MAX = C.ETA0 + C.KETA * (C.Q0 - C.Q_BEP) ** 2;
  C.NT0 = (C.N0 * C.ZG) / C.ZP;        // turbina ≈ 7.288 rpm
  C.GMF0 = (C.ZG * C.N0) / 60;          // 4.980 Hz
  C.QCHOKE = C.QS100 + Math.sqrt((C.HS100 - 80) / C.KH); // fim da linha de 100 % (80 kJ/kg)
  C.RHO = (C.PS * 1e3) / (C.Z * C.R * (C.TS + 273.15)); // kg/m³ na sucção

  // ---------------- rotor: resposta ao desbalanceamento (1 grau de liberdade) ----------------
  function resposta(N) {
    const r = Math.max(N, 0) / C.NN;
    return { a: (r * r) / Math.hypot(1 - r * r, 2 * C.ZETA * r), lag: Math.atan2(2 * C.ZETA * r, 1 - r * r) * R2D };
  }
  const KAMP = C.A_PICO / resposta(C.NC).a;
  const SRX = C.SR_AMP * Math.cos(-C.SR_FASE * D2R);
  const SRY = C.SR_AMP * Math.sin(-C.SR_FASE * D2R);
  // 1× de XT-301X: compensado (amp, fase em ° de 0 a -360) e bruto (com o slow roll)
  function rotor1x(N) {
    const r = resposta(N);
    const amp = KAMP * r.a;
    const fase = -(C.PHI0 + r.lag);
    const bx = amp * Math.cos(fase * D2R) + SRX;
    const by = amp * Math.sin(fase * D2R) + SRY;
    return { amp, fase, bruta: Math.hypot(bx, by), faseBruta: Math.atan2(by, bx) * R2D };
  }

  // ---------------- mancal curto: excentricidade e centro do eixo ----------------
  const fOcv = (e) => { const q = 1 - e * e; return (e * Math.sqrt(Math.PI * Math.PI * q + 16 * e * e)) / (q * q); };
  const K_OCV = fOcv(C.EPS0) * C.N0;
  function excentricidade(N, carga) {
    if (N < 5) return 0.995;
    const alvo = (K_OCV * carga) / N;
    let a = 1e-4, b = 0.995;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (fOcv(m) > alvo) b = m; else a = m; }
    return (a + b) / 2;
  }
  // Visto do acionador, rotação anti-horária: o eixo sai do fundo e sobe para a direita
  // (ângulo de atitude medido da linha de carga no sentido da rotação).
  function centroEixo(eps) {
    const psi = Math.atan((Math.PI * Math.sqrt(1 - eps * eps)) / (4 * eps));
    const ang = -Math.PI / 2 + psi;
    const e = (eps * C.FOLGA_D) / 2;
    return { x: e * Math.cos(ang), y: e * Math.sin(ang), psi: psi * R2D };
  }
  const U45 = Math.SQRT1_2;
  const projX = (p) => (p.x + p.y) * U45; // XT-301X: 45° à direita
  const projY = (p) => (p.y - p.x) * U45; // XT-301Y: 45° à esquerda
  const P0 = centroEixo(C.EPS0);
  function gaps(p) {
    return { X: C.GAP0 + C.SENS * (projX(p) - projX(P0)), Y: C.GAP0 + C.SENS * (projY(p) - projY(P0)) };
  }

  // ---------------- compressor: mapa e politrópica ----------------
  const H100 = (q) => C.HS100 - C.KH * (q - C.QS100) ** 2;
  const Hmapa = (q, s) => s * s * H100(q / s);
  const etaMapa = (q, s) => C.ETA_MAX - C.KETA * (q / s - C.Q_BEP) ** 2 - 25 * (s - 1) ** 2;
  // eficiência num ponto qualquer do plano (Q, H), achando a rotação pela lei de semelhança
  function etaEm(Q, H) {
    let a = C.S_MIN, b = C.S_MAX;
    if (H < Hmapa(Q, a) || H > Hmapa(Q, b)) return null;
    for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (Hmapa(Q, m) > H) b = m; else a = m; }
    const s = (a + b) / 2;
    const qn = Q / s;
    if (qn < C.QS100 || qn > C.QCHOKE) return null;
    return etaMapa(Q, s);
  }
  // rp, Td e potência a partir do head e da eficiência (gás perfeito, Z = 1)
  function politropica(H, eta, TsC) {
    const Ts = TsC + 273.15;
    const m = (C.K - 1) / (C.K * (eta / 100));
    const rm = 1 + (H * 1e3 * m) / (C.Z * C.R * Ts);
    return { rp: Math.pow(rm, 1 / m), Td: Ts * rm - 273.15 };
  }

  // ---------------- utilidades ----------------
  function prng(semente) {
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pearson(x, y) {
    const n = x.length;
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
    if (sxx < 1e-12 || syy < 1e-12) return 0;
    return sxy / Math.sqrt(sxx * syy);
  }

  // ---------------- cenário 4: envoltórias da vibração nos ciclos de surge (1 ciclo por segundo) ----------------
  // Sequência da bancada do X·670: A cruza PERIGO (first-out), C cruza 1 s depois mas está em Not-OK,
  // B cruza 3 s depois do first-out e o 2oo3 fecha por A·B com o retardo de 2 s.
  const T_SURGE = 12;                                     // s do início do cenário até o ponto tocar a linha de surge
  const ENV_A = [8.4, 10.6, 12.5, 13.3, 13.9, 14.3, 14.6, 14.8, 14.9];
  const ENV_B = [8.0, 9.6, 10.9, 11.8, 12.2, 12.6, 13.2, 13.6, 13.8];
  const ENV_XT = [22, 28, 33, 36, 38, 40, 41, 42, 42];
  const C_ESPURIA = 3;                                    // ciclo em que a leitura espúria de C passa de PERIGO
  // ciclo de surge profundo: A (linha de surge) → B (fluxo reverso) → C (head cai) → D (volta à frente) → A
  const Q_D = C.QS100 + Math.sqrt((C.HS100 - 150) / C.KH);
  function cicloSurge(f) {
    if (f < 0.06) { const u = f / 0.06; return { Q: lerp(C.QS100, -500, u), H: lerp(C.HS100, 214, u) }; }
    if (f < 0.31) { const u = (f - 0.06) / 0.25; return { Q: lerp(-500, -300, u), H: lerp(214, 150, u) }; }
    if (f < 0.37) { const u = (f - 0.31) / 0.06; return { Q: lerp(-300, Q_D, u), H: 150 }; }
    const u = suave((f - 0.37) / 0.63);
    const Q = lerp(Q_D, C.QS100, u);
    return { Q, H: H100(Q) };
  }

  const DT = 0.05; // passo fixo da simulação (20 Hz), independente do quadro da tela

  // ---------------- simulador ----------------
  function Simulador(semente) {
    this.rnd = prng(semente || 20261109);
    this.ru = {};
    this.T = 0;            // relógio absoluto (s)
    this.acc = 0;
    this.cascata = [];     // fatias do espectro de VT-301A (1 por segundo)
    this.amostras = [];    // vibração × processo (4 por segundo), para o quadrante 6
    this.trilha = [];      // ponto do mapa nos últimos 1,2 s
    this.scl = [];         // centro do eixo (rastro)
    this.idFatia = 0;
    this.iniciar(1);
  }
  const P = Simulador.prototype;

  // ruído suave com retorno ao zero, por nome
  P.r = function (nome, k, sigma) {
    let v = this.ru[nome] || 0;
    v += -v * k + (this.rnd() - 0.5) * sigma;
    this.ru[nome] = v;
    return v;
  };

  P.iniciar = function (cen) {
    this.cen = cen;
    this.k = 0;
    this.t = 0;
    this.T0 = this.T;
    this.ev = [];
    this.feito = {};
    this.carga = 1;
    this.aw = 0;
    this.trip = false;
    this.tTrip = null;
    this.fo = null;
    this.tFO = null;
    this.vt = [0, 1, 2].map((i) => ({ id: 'ABC'[i], tag: 'VT-301' + 'ABC'[i], v: 3, notok: false, al: false, acima: false, tAcima: null, conf: false }));
    this.portas = { AB: false, AC: false, BC: false };
    this.bode = [];
    this.critica = null;
    this.pico = null;
    this.hip = { rSM: null, rEta: null, minSM: null, lista: [], n: 0, congelado: false };
    this.N = cen === 2 ? 400 : C.N0;
    this.Qbase = (C.Q0 * this.N) / C.N0;
    this.fv = { cmd: 0, pos: 0, travada: cen === 4 };
    this.surge = false;
    this.ciclo = -1;
    this.scl = [];
    this.trilha = [];
    const nomes = { 1: '01 · regime nominal', 2: '02 · partida', 3: '03 · oil whirl 0,48×', 4: '04 · surge + trip 2oo3' };
    this.evento('cen', 'cenário ' + nomes[cen], 'info');
    if (cen === 2) this.evento('rampa', 'partida a partir do giro lento · 400 rpm', 'info');
    if (cen === 3) this.evento('carga', 'injetado: mancal radial descarregado', 'info');
    if (cen === 4) this.evento('vazao', 'injetado: queda de vazão · FV-201 travada', 'info');
    this.calcular();
  };

  P.evento = function (chave, txt, tipo, extra) {
    if (this.feito[chave]) return;
    this.feito[chave] = true;
    this.ev.push(Object.assign({ t: this.t, txt, tipo }, extra || {}));
  };

  P.avancar = function (dtReal) {
    this.acc += Math.min(Math.max(dtReal, 0), 1.5);
    while (this.acc >= DT - 1e-9) { this.acc -= DT; this.passo(); }
  };

  P.passo = function () {
    this.k += 1;
    this.t = this.k * DT;
    this.T += DT;
    this.roteiro();
    this.calcular();
    this.votar();
    this.amostrar();
    if (this.aoPasso) this.aoPasso(this);
  };

  // o que cada cenário injeta, em função do tempo
  P.roteiro = function () {
    const t = this.t, cen = this.cen;
    this.surge = false;
    if (cen === 1) {
      this.N = C.N0 + this.r('n', 0.08, 1.6);
      this.Qbase = C.Q0;
    } else if (cen === 2) {
      this.N = 400 + 3200 * suave(t / 30) + this.r('n', 0.08, 1.2);
      this.Qbase = (C.Q0 * this.N) / C.N0;
      if (t >= 30) this.evento('fim', '3.600 rpm · regime', 'info');
    } else if (cen === 3) {
      this.N = C.N0 + this.r('n', 0.08, 1.6);
      this.Qbase = C.Q0;
      this.carga = 1 - 0.8 * suave(t / 6);
    } else if (cen === 4) {
      if (!this.trip) {
        this.N = C.N0 + this.r('n', 0.08, 1.6);
        if (t < T_SURGE) {
          this.Qbase = C.Q0 - (C.Q0 - C.QS100) * Math.pow(t / T_SURGE, 1.35);
        } else {
          this.surge = true;
          this.ciclo = Math.floor(t - T_SURGE + 1e-9);
          this.fase = t - T_SURGE - this.ciclo;
          this.Qbase = C.QS100;
          this.evento('surge', 'SURGE · ciclos na linha de surge', 'trip');
        }
      } else {
        const x = t - this.tTrip;
        this.N = Math.max(0, 3900 * Math.exp(-x / 12) - 300);
        this.Qbase = this.N > 0 ? C.QS100 * (this.N / C.N0) : 0;
        if (this.N <= 0) this.evento('parado', 'máquina parada · trip retido', 'info');
      }
      if (t >= 0.6 - 1e-9) {
        if (!this.vt[2].notok) this.evento('notokC', 'VT-301C · NOT-OK (fio aberto)', 'notok', { tag: 'VT-301C' });
        this.vt[2].notok = true;
      }
    }
  };

  P.calcular = function () {
    const N = Math.max(this.N, 0);
    const s = N / C.N0;
    this.s = s;
    this.Nt = (N * C.ZG) / C.ZP;
    this.f1 = N / 60;

    // ---- rotor e mancal
    const x1 = rotor1x(N);
    this.x1 = x1;
    this.eps = excentricidade(N, this.carga);
    const p = centroEixo(this.eps);
    this.centro = p;
    this.gap = gaps(p);
    // whirl: o filme de óleo perde estabilidade com o eixo alto no mancal (excentricidade baixa)
    if (this.cen === 3) {
      const alvo = this.eps < 0.22 ? C.AW_MAX : 0;
      this.aw += (alvo - this.aw) * (1 - Math.exp(-DT / 2.4));
      if (this.aw > 3) this.evento('whirl', 'subsíncrono 0,48× nascendo na cascata', 'alerta');
    } else {
      this.aw *= 0.9;
    }
    this.a2 = 2.0 * s * s; // 2× (µm pp)
    // contribuição aerodinâmica (cenário 4)
    let aero = 0, xtSurge = 0;
    if (this.cen === 4) {
      const u = lim((C.Q0 - this.Qbase) / (C.Q0 - C.QS100), 0, 1);
      if (!this.trip) {
        aero = 12 * u * u;
        if (this.surge) xtSurge = ENV_XT[Math.min(this.ciclo, ENV_XT.length - 1)];
      } else {
        const d = Math.pow(s, 2);
        aero = 12 * d;
        xtSurge = ENV_XT[ENV_XT.length - 1] * d;
      }
    }
    const ruidoX = this.r('xtx', 0.15, 0.5), ruidoY = this.r('xty', 0.15, 0.5);
    this.xtX = Math.max(0, x1.bruta + this.a2 + this.aw + aero + xtSurge + ruidoX * 0.6);
    this.xtY = Math.max(0, x1.bruta * 0.86 + this.a2 * 0.86 + this.aw + aero * 0.9 + xtSurge * 0.9 + ruidoY * 0.6);
    if (this.xtX >= C.XT_AL) this.evento('xtxal', 'XT-301X · ALERTA (' + this.xtX.toFixed(0) + ' µm pp)', 'alerta');
    if (this.xtY >= C.XT_AL) this.evento('xtyal', 'XT-301Y · ALERTA', 'alerta');

    // ---- espectro de VT-301A (mm/s pk) e valores globais de VT-301A/B/C
    const comps = [];
    if (N > 20) {
      const kv = 2.8 / (KAMP * resposta(C.N0).a);
      comps.push({ f: this.f1, a: kv * x1.amp * s, o: '1×' });
      comps.push({ f: 2 * this.f1, a: 0.85 * s * s, o: '2×' });
      comps.push({ f: 3 * this.f1, a: 0.32 * s * s * s, o: '3×' });
      if (this.aw > 0.5) comps.push({ f: C.WHIRL * this.f1, a: 0.028 * this.aw, o: '0,48×' });
      const g = C.ZG * this.f1, fp = (this.f1 * C.ZG) / C.ZP;
      comps.push({ f: g, a: 0.42 * s * s, o: 'GMF' });
      comps.push({ f: g - this.f1, a: 0.12 * s * s }, { f: g + this.f1, a: 0.12 * s * s });
      comps.push({ f: g - fp, a: 0.08 * s * s }, { f: g + fp, a: 0.08 * s * s });
    }
    let e2 = 0;
    for (const c of comps) e2 += c.a * c.a;
    const base = Math.sqrt(e2 + 0.0016);
    let vA = base * (1 + this.r('va', 0.2, 0.006));
    let vB = base * 1.03 * (1 + this.r('vb', 0.2, 0.006));
    let vC = base * (1 + this.r('vc', 0.2, 0.006));
    if (this.cen === 4) {
      const u = lim((C.Q0 - this.Qbase) / (C.Q0 - C.QS100), 0, 1);
      if (!this.trip) {
        if (this.surge) {
          const k = Math.min(this.ciclo, ENV_A.length - 1);
          const rip = 0.06 * Math.abs(Math.sin(Math.PI * this.fase));
          vA = ENV_A[k] + rip;
          vB = ENV_B[k] + rip;
        } else {
          vA += 2.2 * u * u;
          vB += 2.0 * u * u;
        }
      } else {
        const d = s * s;
        vA = ENV_A[ENV_A.length - 1] * d + base * 0.2;
        vB = ENV_B[ENV_B.length - 1] * d + base * 0.2;
      }
      if (this.vt[2].notok) {
        // fio aberto: leitura espúria, que passa de PERIGO no ciclo 3 de surge (+1.000 ms do first-out)
        if (this.surge && this.ciclo >= C_ESPURIA) vC = this.ciclo === C_ESPURIA && this.fase < 1e-6 ? 12.4 : 12.4 + 7.4 * this.rnd();
        else if (this.trip) vC = 12.4 + 7.4 * this.rnd();
        else vC = 1.5 + 4 * this.rnd();
      }
      // energia de baixa frequência dos ciclos de surge, para a cascata fechar com o valor global
      const falta = vA * vA - e2;
      if ((this.surge || this.trip) && falta > 0.04 && N > 20) comps.push({ f: 9, a: Math.sqrt(falta / 3), larg: 6, o: 'surge' });
    }
    this.vt[0].v = vA;
    this.vt[1].v = vB;
    this.vt[2].v = vC;
    this.comps = comps;

    // ---- processo e mapa
    this.Ts = C.TS + (this.cen === 4 && (this.surge || this.trip) ? 6 * lim((this.t - T_SURGE) / 4, 0, 1) : 0) + this.r('ts', 0.1, 0.03);
    this.Ps = C.PS + this.r('ps', 0.1, 0.6);
    const temMapa = s >= C.S_MIN - 1e-6 && s <= C.S_MAX + 1e-6;
    const parada = this.cen === 4 && this.trip;
    let Q, H, pontoQ, pontoH, etaFis;
    if (this.surge) {
      const cs = cicloSurge(this.fase);
      pontoQ = cs.Q;
      pontoH = cs.H;
      Q = C.QS100;           // leitura média do ciclo, na linha de surge
      H = C.HS100;
      etaFis = C.ETA_SURGE;
    } else if (N > 20) {
      Q = this.Qbase * (1 + this.r('q', 0.1, 0.0016));
      H = Hmapa(Q, s);
      etaFis = etaMapa(Q, Math.max(s, 0.3)) + this.r('eta', 0.1, 0.01);
      pontoQ = Q;
      pontoH = H;
    } else {
      Q = 0; H = 0; etaFis = null; pontoQ = 0; pontoH = 0;
    }
    // ηp como o X·THERMO calcula: com a máquina em carga (≥ 50 % da rotação) e fora da parada
    this.eta = !parada && etaFis !== null && s >= 0.5 ? etaFis : null;
    this.Q = Q;
    this.H = H;
    this.FT = this.surge ? Math.max(0, pontoQ) : Q;
    this.ponto = { Q: pontoQ, H: pontoH };
    this.Qsurge = C.QS100 * s;
    // sem mapa, sem número: abaixo de 80 % da rotação a margem não é calculada
    this.margem = temMapa && N > 20 && !parada ? ((Q - this.Qsurge) / Q) * 100 : null;
    this.foraMapa = !temMapa && N > 20;
    if (parada) {
      // depois do trip: gás preso na descarga, a pressão cai para a de equalização e a temperatura esfria devagar
      this.Pd += (1850 - this.Pd) * 0.02;
      this.Td += (60 - this.Td) * 0.004;
    } else if (etaFis !== null) {
      this.Pd = this.Ps * politropica(this.surge ? Math.max(pontoH, 1) : H, etaFis, this.Ts).rp;
      this.Td = politropica(H, etaFis, this.Ts).Td + (this.surge ? 4 * lim((this.t - T_SURGE) / 5, 0, 1) : 0);
    } else {
      this.Pd = this.Ps;
      this.Td = this.Ts;
    }
    this.rp = this.Pd / this.Ps;
    this.Qm = (C.RHO * Q) / 3600;
    if (this.eta !== null) {
      this.pot = (this.Qm * H) / (this.eta / 100);
      this.perda = Math.max(0, this.Qm * H * (100 / this.eta - 100 / C.ETA_REF));
    } else {
      this.pot = null;
      this.perda = null;
    }
    this.perdaR = this.perda === null ? null : this.perda * C.TARIFA;

    // válvula anti-surge (cenário 4: travada fechada)
    const pedido = this.margem === null ? 0 : lim((C.CONTROLE + 4 - this.margem) * 8, 0, 100);
    this.fv.cmd = this.cen === 4 ? (this.trip || this.surge ? 100 : pedido) : 0;
    this.fv.pos = 0;

    // eventos de margem
    if (this.margem !== null && this.cen === 4 && !this.trip) {
      if (this.margem < C.APERTADA) this.evento('m20', 'margem de surge < 20 % (apertada)', 'alerta');
      if (this.margem < C.CONTROLE) this.evento('m10', 'margem < 10 % · cruzou a linha de controle', 'alerta');
    }
  };

  // votação 2oo3 de VT-301A/B/C, como o X·670 reconstrói (só leitura)
  P.votar = function () {
    const t = this.t;
    for (const c of this.vt) {
      c.al = c.v >= C.VT_AL;
      const acima = c.v >= C.VT_PE - 1e-9;
      if (acima && !c.acima) {
        c.acima = true;
        c.tAcima = t;
        if (!c.notok && this.fo === null) { this.fo = c.id; this.tFO = t; }
        const v = c.v.toFixed(2).replace('.', ',');
        if (c.notok) this.evento('x' + c.id, c.tag + ' ≥ PERIGO · ' + v + ' · bloqueado por Not-OK', 'notok', { tag: c.tag });
        else this.evento('x' + c.id, c.tag + ' ≥ PERIGO · ' + v + (this.fo === c.id ? ' · FIRST-OUT' : ''), 'trip', { tag: c.tag, fo: this.fo === c.id });
      }
      if (!acima && c.acima && !this.trip) { c.acima = false; c.tAcima = null; }
      const conf = c.acima && !c.notok && t - c.tAcima >= C.RETARDO - 1e-9;
      if (conf && !c.conf) this.evento('c' + c.id, c.tag + ' confirmado (retardo 2 s)', 'trip', { tag: c.tag });
      if (!this.trip) c.conf = conf;
    }
    const [A, B, Cc] = this.vt;
    if (!this.trip) this.portas = { AB: A.conf && B.conf, AC: A.conf && Cc.conf, BC: B.conf && Cc.conf };
    if (!this.trip && (this.portas.AB || this.portas.AC || this.portas.BC)) {
      this.trip = true;
      this.tTrip = t;
      const por = this.portas.AB ? 'A·B' : this.portas.AC ? 'A·C' : 'B·C';
      this.evento('trip', 'TRIP 2oo3 (' + por + ') · sistema de proteção', 'trip', { tag: 'TRIP' });
      this.hip.congelado = true;
    }
  };

  P.amostrar = function () {
    const N = this.N;
    // Bode e polar: partida (cenário 2) e parada depois do trip (cenário 4), a cada 10 rpm
    const gravando = this.cen === 2 || (this.cen === 4 && this.trip);
    if (gravando && N >= 380) {
      const u = this.bode[this.bode.length - 1];
      if (!u || Math.abs(N - u.N) >= 10) {
        this.bode.push({
          N, amp: this.x1.amp, fase: this.x1.fase,
          ampM: this.x1.amp + this.r('ba', 0.3, 0.25), faseM: this.x1.fase + this.r('bf', 0.3, 1.2),
          tipo: this.cen === 2 ? 'partida' : 'parada'
        });
        this.detectarCritica();
      }
    }
    // cascata: uma fatia por segundo
    if (this.k % 20 === 0) {
      this.idFatia += 1;
      this.cascata.push({ id: this.idFatia, T: this.T, N, comps: this.comps.map((c) => Object.assign({}, c)) });
      if (this.cascata.length > 24) this.cascata.shift();
    }
    // vibração × processo: 4 amostras por segundo
    if (this.k % 5 === 0) {
      this.amostras.push({ T: this.T, cen: this.cen, xt: this.xtX, q: this.FT, sm: this.margem, eta: this.eta, trip: this.trip });
      while (this.amostras.length && this.amostras[0].T < this.T - 60.01) this.amostras.shift();
      this.analisar();
    }
    // rastro do ponto no mapa e do centro do eixo
    this.trilha.push({ Q: this.ponto.Q, H: this.ponto.H });
    if (this.trilha.length > 24) this.trilha.shift();
    if (this.k % 4 === 0) {
      this.scl.push({ x: this.centro.x, y: this.centro.y });
      if (this.scl.length > 180) this.scl.shift();
    }
  };

  // crítica pela regra do X·RAMPA: pico de 1× e inversão de fase de pelo menos 120° desde o início da rampa
  P.detectarCritica = function () {
    const b = this.bode;
    if (b.length < 3) return;
    let im = 0;
    for (let i = 1; i < b.length; i++) if (b[i].amp > b[im].amp) im = i;
    if (im === 0 || im === b.length - 1) return;
    const a = b[im - 1], c = b[im], d = b[im + 1];
    // vértice da parábola pelos três pontos em volta do máximo
    const den = (a.N - c.N) * (a.N - d.N) * (c.N - d.N);
    const A = (d.N * (c.amp - a.amp) + c.N * (a.amp - d.amp) + a.N * (d.amp - c.amp)) / den;
    const B = (d.N * d.N * (a.amp - c.amp) + c.N * c.N * (d.amp - a.amp) + a.N * a.N * (c.amp - d.amp)) / den;
    const Npico = -B / (2 * A);
    const dphi = Math.abs(b[b.length - 1].fase - b[0].fase);
    this.pico = { N: Npico, amp: c.amp };
    if (this.cen === 2) {
      if (b[b.length - 1].amp < 0.97 * c.amp) this.evento('pico', 'pico de 1× em ' + fmtN(Npico) + ' rpm', 'alerta');
      if (dphi >= 120) {
        this.critica = { N: Npico, dphi };
        this.evento('critica', 'crítica declarada: pico + inversão de fase ≥ 120°', 'alerta');
      }
    } else if (dphi >= 120) {
      this.critica = { N: Npico, dphi };
      this.evento('critica', 'parada: crítica em ' + fmtN(Npico) + ' rpm', 'info');
    }
  };

  // regra do XcoInit: r de Pearson na janela; hipótese só com r <= -0,8 — hipótese, nunca veredito
  P.analisar = function () {
    if (this.hip.congelado) return;
    const jan = this.amostras.filter((a) => a.cen === this.cen && a.T > this.T0 + 0.01 && a.T > this.T - 30);
    this.hip.n = jan.length;
    if (jan.length < 40) { this.hip.rSM = null; this.hip.rEta = null; return; }
    const xt = jan.map((a) => a.xt);
    const okSM = jan.every((a) => a.sm !== null);
    const okEta = jan.every((a) => a.eta !== null);
    this.hip.rSM = okSM ? pearson(xt, jan.map((a) => a.sm)) : null;
    this.hip.rEta = okEta ? pearson(xt, jan.map((a) => a.eta)) : null;
    this.hip.minSM = okSM ? Math.min.apply(null, jan.map((a) => a.sm)) : null;
    // hipótese levantada fica registrada no cenário (como no laudo); o r segue ao vivo
    const lista = this.hip.lista.slice();
    if (this.hip.rSM !== null && this.hip.rSM <= -0.8 && this.hip.minSM < 25 && lista.indexOf('surge') < 0) lista.push('surge');
    if (this.hip.rEta !== null && this.hip.rEta <= -0.8 && lista.indexOf('aero') < 0) lista.push('aero');
    this.hip.lista = lista;
    if (lista.indexOf('surge') >= 0) this.evento('hsurge', 'hipótese levantada: vibração × aproximação do surge', 'alerta');
    if (lista.indexOf('aero') >= 0) this.evento('haero', 'hipótese levantada: vibração × queda de ηp', 'alerta');
  };

  function fmtN(v) { return Math.round(v).toLocaleString('pt-BR'); }

  // curva de referência da partida (sem ruído), para o fundo do Bode e do polar
  function bodeReferencia() {
    const out = [];
    for (let N = 400; N <= 3600; N += 20) { const r = rotor1x(N); out.push({ N, amp: r.amp, fase: r.fase }); }
    return out;
  }
  // faixa de meia potência em volta da crítica (amplitude >= pico / √2)
  function faixaCritica() {
    const pk = rotor1x(C.NC).amp / Math.SQRT2;
    let n1 = null, n2 = null;
    for (let N = 1500; N <= 5000; N += 2) {
      const a = rotor1x(N).amp;
      if (a >= pk && n1 === null) n1 = N;
      if (a >= pk) n2 = N;
    }
    return { n1, n2 };
  }

  SV.C = C;
  SV.Simulador = Simulador;
  SV.rotor1x = rotor1x;
  SV.Hmapa = Hmapa;
  SV.H100 = H100;
  SV.etaEm = etaEm;
  SV.etaMapa = etaMapa;
  SV.centroEixo = centroEixo;
  SV.bodeReferencia = bodeReferencia;
  SV.faixaCritica = faixaCritica;
  SV.pearson = pearson;
  SV.prng = prng;
})();
