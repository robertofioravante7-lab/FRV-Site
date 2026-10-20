// FRV XcoInit · mesa de demonstração — dados ilustrativos, nenhum dispositivo conectado.
// Arquivo externo de propósito: o CSP do site usa script-src 'self' (sem inline).
'use strict';

// PONTOS ilustrativos (cruzam FC1/FC2 bits + FC3/FC4 registradores)
const P = [
  {p:'VT-01', tag:'VT-0101', d:'vibração eixo X · mancal A',   fn:3, doc:30001, cru:i=>3.6+Math.abs(Math.sin(i/9))*2.4,  esc:v=>v,  u:'mm/s'},
  {p:'VT-02', tag:'VT-0102', d:'vibração eixo Y · mancal A',   fn:3, doc:30002, cru:i=>4.4+Math.abs(Math.cos(i/11))*2.2, esc:v=>v,  u:'mm/s'},
  {p:'VT-03', tag:'VT-0103', d:'vibração axial · mancal B',    fn:3, doc:30003, cru:i=>2.1+Math.abs(Math.sin(i/7))*1.3,  esc:v=>v,  u:'mm/s'},
  {p:'MT-01', tag:'MT-0110', d:'temperatura mancal A',         fn:4, doc:40001, cru:i=>58+Math.sin(i/23)*4+ (i%97===0?9:0), esc:v=>v, u:'°C'},
  {p:'MT-02', tag:'MT-0111', d:'temperatura óleo lubrificante',fn:4, doc:40002, cru:i=>52+Math.sin(i/31)*3,              esc:v=>v,  u:'°C'},
  {p:'FS-01', tag:'FS-0120', d:'vazão de processo',            fn:3, doc:30007, cru:i=>184+Math.sin(i/17)*12,            esc:v=>v,  u:'m³/h'},
  {p:'PD-01', tag:'PD-0121', d:'pressão diferencial',          fn:4, doc:40005, cru:i=>64+Math.sin(i/13)*5,              esc:v=>v,  u:'kPa'},
  {p:'CS-01', tag:'CS-0101', d:'estado · em operação',         fn:1, doc:10001, cru:()=>1,                               esc:v=>v?'rotando':'parado', u:'bit'},
  {p:'AL-01', tag:'AL-0102', d:'alarme de vibração alto',      fn:2, doc:10002, cru:i=>chk(38.0,'VT-01',i)?1:0,          esc:v=>v?'ALERTA':'normal', u:'bit'},
  {p:'AL-02', tag:'AL-0103', d:'alarme de temperatura alta',   fn:2, doc:10003, cru:i=>chk(70,'MT-01',i)?1:0,            esc:v=>v?'ALERTA':'normal', u:'bit'},
];
// pequeno motor acionado pra demonstrar alarmes em fase com o valor
const VALS = {};
P.forEach(p => VALS[p.tag] = []);
function chk(lim, pai, i){ // TRUE ocasional quando o ponto pai passa do limite
  const pp = P.find(x => x.p === pai);
  if (!pp) return false;
  const v = 3.6+Math.abs(Math.sin(i/9))*2.4; // espelha VT-01 cru
  return Math.abs(v) >= lim || (i % 61 === 0);
}
function spark(arr, tgt){ // polyline dos últimos 40 valores
  const s = arr.slice(-40);
  if (!s.length) return;
  const w = 150, h = 24, mn = Math.min(...s), mx = Math.max(...s), dx = (mx - mn) || 1;
  const pts = s.map((v,k) => (k / (s.length - 1 || 1) * w).toFixed(1) + ',' + (h - ((v - mn) / dx * (h - 2) + 1)).toFixed(1)).join(' ');
  tgt.setAttribute('points', pts);
}
let t = 0, ok = 0;
function tick(){
  t++;
  document.getElementById('cCiclos').textContent = t;
  for (const p of P){
    let cru = p.cru(t);
    if (falhaAtiva && p.p === 'VT-03'){ drift = Math.min(2.5, drift + 0.02); cru += drift; }
    const esc = p.esc(cru);
    ok++;
    VALS[p.tag].push(cru); if (VALS[p.tag].length > 60) VALS[p.tag].shift();
    let lin = document.getElementById('L' + p.tag);
    if (!lin){
      lin = document.createElement('tr'); lin.id = 'L' + p.tag;
      lin.innerHTML = '<td><b>' + p.p + '</b></td><td>' + p.tag + '</td><td>' + p.d + '</td><td>FC' + p.fn +
        '</td><td>' + p.doc + '</td><td class="n" id="V' + p.tag + '"></td><td>' + p.u +
        '</td><td><svg viewBox="0 0 150 26" preserveAspectRatio="none"><polyline/></svg></td><td id="S' + p.tag + '"></td>';
      document.getElementById('tabeto').appendChild(lin);
    }
    const fmt = (u) => u === 'bit' ? String(cru) : cru.toFixed(2).replace('.', ',');
    document.getElementById('V' + p.tag).textContent = fmt(p.u) + ' → ' + (p.u === 'bit' ? esc : esc.toFixed(1).replace('.', ','));
    const alerta = (p.u === '°C' && cru > 66) || (p.u === 'mm/s' && cru > 5.6);
    const cel = document.getElementById('S' + p.tag);
    cel.textContent = (p.u === 'bit') ? esc : (alerta ? 'ALERTA' : 'OK');
    cel.className = (p.u === 'bit') ? (esc === 'ALERTA' ? 'al' : 'ok') : (alerta ? 'al' : 'ok');
    spark(VALS[p.tag], lin.querySelector('polyline'));
  }
  document.getElementById('cOk').textContent = ok;
  const seq = [];
  if (t % 5 === 1) seq.push('FC3 lote @0x006 ×7 ok');
  if (t % 5 === 2) seq.push('FC4 lote @0x000 ×5 ok');
  if (t % 5 === 3) seq.push('FC1 bits @0x010 ×3 ok');
  if (t % 5 === 4) seq.push('FC2 bits @0x010 ×3 ok');
  if (t % 5 === 0) seq.push('cobertura re-verificada: 10/10 (100 %)');
  document.getElementById('lote').textContent = 'ciclo ' + t + ' · ' + (seq[0] || 'sem lotes pendentes') + ' · latência ~2 ms';
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR');
}
document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR');

// ===== módulo de análise (prévia · dados ilustrativos) =====
const FABRICA = [
  { id: 'F1',   ordem: '1×',   nome: 'f_r (gira do eixo)',    b: 'frequência fundamental do eixo',            f: 49.8,  r: 'desequilíbrio / alinhamento' },
  { id: 'F2',   ordem: '2×',   nome: '2× f_r',                b: 'segundo harmônico do eixo',                 f: 99.6,  r: 'desalinhamento / soltura' },
  { id: 'FTF',  ordem: 'FTF',  nome: 'gaiola',                b: 'frequência fundamental da gaiola',          f: 14.9,  r: 'jaula / lubrificação' },
  { id: 'BSF',  ordem: 'BSF',  nome: 'giro da bola',          b: 'giro do corpo rolante',                     f: 52.3,  r: 'defeito no corpo rolante' },
  { id: 'BPFO', ordem: 'BPFO', nome: 'anel externo',          b: 'passagem da bola na pista externa',         f: 134.5, r: 'defeito na pista externa' },
  { id: 'BPFI', ordem: 'BPFI', nome: 'anel interno',          b: 'passagem da bola na pista interna',         f: 313.7, r: 'defeito na pista interna' },
];
for (const m of FABRICA){
  const tr = document.createElement('tr');
  tr.innerHTML = '<td>' + m.ordem + '</td><td><b>' + m.nome + '</b></td><td>' + m.b + '</td>' +
    "<td class='n'>" + m.f.toFixed(1) + ' Hz</td>' +
    "<td><div class='fbar'><div id='" + m.id + "'></div></div></td>" +
    '<td>' + m.r + '</td>';
  document.getElementById('tab-freq').appendChild(tr);
}
const ENER = { F1: 22, F2: 14, FTF: 8, BSF: 17, BPFO: 29, BPFI: 20 }; // frações ilustrativas
function desenhaHisto(id, arr, min, max){
  const pl = document.getElementById(id);
  const h = 76, dx = (max - min) || 1;
  const pts = arr.map((v, k) => {
    const x = (k / 59 * 560).toFixed(1);
    const y = (h - 2 - ((v - min) / dx * (h - 8))).toFixed(1);
    return x + ',' + y;
  }).join(' ');
  pl.setAttribute('points', pts);
}
let vida = 87 + Math.random() * 6;

// X·1 · normal × agora — aprende 60 ciclos, congela o normal e compara dia contra dia
const histo = { vt: [], mt: [], vt03: [] };
const normal = { vt: null, b: null };
let drift = 0, falhaAtiva = false;
const fmt2 = (v) => v.toFixed(2).replace('.', ',');
function estatistica(arr){
  const n = arr.length, media = arr.reduce((a, b) => a + b, 0) / n;
  const sigma = Math.sqrt(arr.reduce((a, b) => a + (b - media) * (b - media), 0) / (n - 1));
  return { m: media, s: sigma };
}
function marcaNormal(id, base, ult){
  if (!base){
    document.getElementById('n' + id + 'm').textContent = 'aprendendo… ' + t + '/60';
    return;
  }
  const dev = ult - base.m;
  const z = base.s > 1e-9 ? dev / base.s : (Math.abs(dev) > 1e-9 ? 99 : 0);
  const abs = Math.min(Math.abs(z), 99);
  const nivel = abs >= 3 ? 'AÇÃO' : abs >= 2 ? 'ATENÇÃO' : 'BOM';
  const cls = abs >= 3 ? 'nok' : abs >= 2 ? 'al' : 'ok';
  document.getElementById('n' + id + 'm').textContent = fmt2(base.m) + ' ± ' + fmt2(base.s);
  document.getElementById('n' + id + 'a').textContent = fmt2(ult);
  document.getElementById('n' + id + 'd').textContent = (dev >= 0 ? '+' : '−') + fmt2(Math.abs(dev));
  document.getElementById('n' + id + 'z').textContent = (z >= 0 ? '+' : '−') + abs.toFixed(1).replace('.', ',');
  const e = document.getElementById('n' + id + 'e');
  e.textContent = nivel; e.className = 'pill-estado ' + cls;
}
document.getElementById('btnFalha').onclick = function(){
  falhaAtiva = true;
  this.disabled = true;
  document.getElementById('notaFalha').textContent = 'desgaste em curso no mancal B (dados ilustrativos) — observe o z subir sem o alarme tocar';
};
function analise(){
  histo.vt.push(VALS['VT-0101'][VALS['VT-0101'].length - 1]);
  histo.mt.push(VALS['MT-0110'][VALS['MT-0110'].length - 1]);
  histo.vt03.push(VALS['VT-0103'][VALS['VT-0103'].length - 1]);
  while (histo.vt.length > 60) histo.vt.shift();
  while (histo.mt.length > 60) histo.mt.shift();
  while (histo.vt03.length > 60) histo.vt03.shift();
  if (!normal.vt && histo.vt.length >= 60){
    normal.vt = estatistica(histo.vt);
    normal.b = estatistica(histo.vt03);
    document.getElementById('btnFalha').disabled = false;
    document.getElementById('notaFalha').textContent = 'aprendizado concluído — o normal está congelado · o desgaste simulado soma +1,2 mm/s por minuto de máquina, sem passar de nenhum limite · recarregar a página zera tudo';
  }
  marcaNormal('VT', normal.vt, histo.vt[histo.vt.length - 1]);
  marcaNormal('B', normal.b, histo.vt03[histo.vt03.length - 1]);
  desenhaHisto('plVT', histo.vt, 2.5, 8.5);
  desenhaHisto('plMT', histo.mt, 44, 82);
  const vt = histo.vt, mt = histo.mt;
  const rms = vt.length ? vt[vt.length - 1] : 4;
  const dc = (mt.length ? mt[mt.length - 1] : 52) - 52;
  const declive = vt.length > 12 ? (vt[vt.length - 1] - vt[0]) / 12 : 0;
  const idx = Math.max(0, Math.min(100,
    0.55 * (rms / 7.1 * 42) + 0.25 * (dc / 25 * 34) + 0.20 * Math.abs(declive) * 240));
  document.getElementById('sIdx').textContent = idx.toFixed(0) + ' / 100';
  const bar = document.getElementById('sBar');
  bar.style.width = idx + '%';
  bar.style.background = idx < 40 ? '#1f8a4c' : idx < 70 ? '#b9770e' : '#c0392b';
  const est = document.getElementById('sEstado');
  const msg = document.getElementById('sMsg');
  const jan = document.getElementById('sJanela');
  if (idx < 40){ est.textContent = 'BOM'; est.className = 'v ok'; msg.textContent = 'comportamento normal contra a baseline'; jan.textContent = 'sem prazo'; }
  else if (idx < 70){ est.textContent = 'ATENÇÃO'; est.className = 'v al'; msg.textContent = 'energia acima do normal — vigiar na próxima janela'; jan.textContent = 'planejar ~' + Math.max(1, Math.round((90 - vida) / 4)) + ' sem.'; }
  else { est.textContent = 'AÇÃO'; est.className = 'v nok'; msg.textContent = 'padrão compatível com degradação de pista'; jan.textContent = 'troca em ~' + Math.max(1, Math.round((100 - vida) / 9)) + ' dias'; }
  if (Math.abs(declive) > 0.08) vida = Math.max(12, vida - 0.05);
  for (const [k, frac] of Object.entries(ENER)){
    const el = document.getElementById(k);
    if (el) el.style.width = Math.min(100, frac * (0.9 + Math.random() * 0.25)) + '%';
  }
}
setInterval(tick, 1000); tick(); analise(); setInterval(analise, 1000);
