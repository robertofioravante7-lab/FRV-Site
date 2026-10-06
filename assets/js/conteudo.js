/* Conteudo do site da FRV Engenharia, copiado palavra por palavra do index.html do site no ar (05/10/2026).
   Fonte unica da pagina inicial (assets/js/home.js). NAO editar texto aqui: conteudo so muda com autorizacao do Roberto.
   Uso: <script src="conteudo.js"></script> e depois window.FRV. */
window.FRV = {
  img: 'assets/img/',
  title: 'FRV Engenharia - Montagem Eletromecânica, Manutenção e Energias Renováveis',
  logo: { icon: 'logo-icon-white.png', full: 'logo-frv-white.png', alt: 'FRV', altFull: 'FRV Engenharia', small: 'Engenharia' },
  nav: [['Sobre', 'sobre'], ['Áreas de atuação', 'areas'], ['Inovação', 'inovacao'], ['Contato', 'contato']],
  navCta: ['Fale conosco', 'contato'],

  hero: {
    bg: 'hero-refinaria.jpg',
    eyebrow: 'Montagem eletromecânica & energias renováveis',
    h1a: 'Do projeto ao', h1b: 'comissionamento',
    sub: 'Sólida experiência consolidada no setor de óleo e gás.',
    desc: 'Montagem eletromecânica, contratos de manutenção, energias renováveis e desenvolvimento de tecnologias próprias para os setores de óleo & gás, petroquímica, papel & celulose e energia elétrica.',
    cta: [['Fale conosco', 'contato'], ['Tecnologias próprias', 'inovacao']]
  },

  /* Instrumento do topo: diagrama fasorial com tecla RUN/STOP (o valor da frequencia oscila em torno de 60,00) */
  inst: {
    title: 'Monitor de qualidade de energia · FRV', tag: 'Demonstração', run: 'RUN', stop: 'STOP',
    runAria: 'Ligar a animação do instrumento', stopAria: 'Parar a animação do instrumento',
    reads: [['Frequência', '60,00', 'Hz'], ['Sequência', 'ABC', ''], ['Defasagem', '120,0', '°']],
    aria: 'Diagrama fasorial: três fasores defasados de 120 graus girando, cada um desenhando sua senoide. Sinal de demonstração'
  },

  setores: { label: 'Por onde passamos', items: [['01', 'Óleo e Gás'], ['02', 'Petroquímica'], ['03', 'Papel e Celulose'], ['04', 'Energia Elétrica']] },

  sobre: {
    eyebrow: 'Quem somos', h2a: 'Expertise comprovada em', h2b: 'projetos críticos',
    /* p1 tem um trecho em negrito (b: 1) */
    p1: [{ t: 'A FRV Engenharia é especialista em soluções eletromecânicas para os setores de ' }, { t: 'petróleo, gás, petroquímica, papel & celulose e energia elétrica', b: 1 }, { t: '. Com histórico consolidado de atuação em contratos Petrobras, desenvolvemos expertise única do projeto ao comissionamento.' }],
    p2: 'Nossa equipe é formada por engenheiros certificados com vasta experiência em campo — projeto, inspeção, montagem, comissionamento, calibração e testes em instalações industriais de alta complexidade.',
    kv: [
      ['Expertise', 'Montagem eletromecânica, instrumentação e automação, sistemas elétricos, contratos de manutenção, energias renováveis e desenvolvimento de tecnologias proprietárias.'],
      ['Missão', 'Fornecer soluções eletromecânicas inovadoras e especializadas, garantindo qualidade, segurança e excelência técnica em cada projeto, superando as exigências de clientes como Petrobras.'],
      ['Diferenciais', 'Montagem e comissionamento especializado, tecnologias proprietárias com IA aplicada, equipes certificadas e conformidade com normas nacionais e internacionais.']
    ]
  },

  areas: {
    eyebrow: 'Nosso objetivo', h2a: 'Baseados em nosso plano de negócio,', h2b: 'estes são nossos pilares',
    aria: 'Diagrama unifilar: a FRV Engenharia alimenta um barramento com quatro saídas, uma para cada pilar do plano de negócio',
    /* [rotulo, titulo, resumo, destino] */
    pil: [
      ['SAÍDA 01', 'Montagem Eletromecânica', 'Pacotes especiais · instrumentação · elétrica · rotativos', 'p01'],
      ['SAÍDA 02', 'Contratos de Manutenção', 'Calibração · monitoramento de máquinas · UFV · HVAC', 'p02'],
      ['SAÍDA 03', 'Energias Renováveis', 'Fotovoltaica · PCH/CGH · turbogeradores', 'p03'],
      ['SAÍDA 04', 'Desenvolvimento de Tecnologias', 'Sensores · monitoramento · IA aplicada a normas', 'inovacao']
    ],
    /* Desenho do unifilar do site (viewBox 0 0 1000 250). Classes: ln = linha, bg = preenchimento, hot = barramento,
       d = desenha ao aparecer (usa --l = comprimento e --dl = atraso), t-big e t-hot = textos. */
    svg: `<text class="t-big" x="500" y="14" text-anchor="middle">FRV ENGENHARIA</text>
<path class="ln d" style="--l:34;--dl:0s" d="M500 26 L500 58"/>
<rect class="ln bg d" style="--l:96;--dl:.25s" x="488" y="58" width="24" height="24"/>
<path class="ln d" style="--l:30;--dl:.45s" d="M491 79 L509 61"/>
<text x="522" y="75">52-G</text>
<path class="ln d" style="--l:22;--dl:.55s" d="M500 82 L500 102"/>
<circle class="ln bg d" style="--l:76;--dl:.7s" cx="500" cy="114" r="12"/>
<circle class="ln bg d" style="--l:76;--dl:.85s" cx="500" cy="132" r="12"/>
<text x="522" y="128">PLANO DE NEGÓCIO</text>
<path class="ln d" style="--l:30;--dl:1s" d="M500 144 L500 172"/>
<path class="hot d" style="--l:752;--dl:1.15s" d="M124 172 L876 172"/>
<text class="t-hot" x="124" y="163">BARRAMENTO · 4 PILARES</text>
<path class="ln d" style="--l:22;--dl:1.7s" d="M125 172 L125 192"/>
<rect class="ln bg d" style="--l:64;--dl:1.8s" x="117" y="192" width="16" height="16"/>
<path class="ln d" style="--l:42;--dl:1.95s" d="M125 208 L125 250"/>
<path class="ln d" style="--l:22;--dl:1.8s" d="M375 172 L375 192"/>
<rect class="ln bg d" style="--l:64;--dl:1.9s" x="367" y="192" width="16" height="16"/>
<path class="ln d" style="--l:42;--dl:2.05s" d="M375 208 L375 250"/>
<path class="ln d" style="--l:22;--dl:1.9s" d="M625 172 L625 192"/>
<rect class="ln bg d" style="--l:64;--dl:2s" x="617" y="192" width="16" height="16"/>
<path class="ln d" style="--l:42;--dl:2.15s" d="M625 208 L625 250"/>
<path class="ln d" style="--l:22;--dl:2s" d="M875 172 L875 192"/>
<rect class="ln bg d" style="--l:64;--dl:2.1s" x="867" y="192" width="16" height="16"/>
<path class="ln d" style="--l:42;--dl:2.25s" d="M875 208 L875 250"/>`
  },

  pilarWord: 'Pilar',
  /* pilares: numero, primeira parte do titulo, parte destacada, servicos */
  pilares: [
    { id: 'p01', n: '01', a: 'Montagem', b: 'Eletromecânica', servicos: ['p01a', 'p01b', 'p01c', 'p01d', 'p01e'] },
    { id: 'p02', n: '02', a: 'Contratos de', b: 'Manutenção', servicos: ['p02a'] },
    { id: 'p03', n: '03', a: 'Energias', b: 'Renováveis', servicos: ['p03a'] }
  ],

  /* servicos: code, h3, sub (opcional), note (opcional), items OU two [[subtitulo, itens]], figs [[arquivo, alt, codigo, legenda, posicao]]
     cols2: true quando o site mostra a lista em duas colunas */
  det: {
    p01a: { code: '01·A', h3: 'Pacotes Especiais', sub: 'Projeto, montagem e comissionamento', cols2: true,
      items: ['Flare / Blowdown', 'Casa de analisadores e sistemas de condicionamento de amostra', 'Sistema de telemetria de tanques', 'Válvulas motorizadas com atuadores eletro-hidráulicos', 'Fornos de processo', 'Turbina a vapor / Motor diesel', 'Compressores de processo e sistemas de controle de capacidade', 'DSM / BN-1900 / BN-3500', 'HVAC', 'TI / TCOM / CFTV', 'RACI'],
      figs: [['flare.webp', 'Sistema de flare em unidade industrial', 'FIG. 01·A-1', 'Sistema de flare', 'top'], ['tanques.jpeg', 'Parque de tanques e tubulações de processo', 'FIG. 01·A-2', 'Parque de tanques']] },
    p01b: { code: '01·B', h3: 'Instrumentação / Automação',
      items: ['Projeto / Inspeção / Montagem e comissionamento', 'Calibração de instrumentos e teste de válvula (controle, segurança, ON-OFF)', 'Analisadores de processo e segurança', 'Certificação de redes de comunicação', 'Desenvolvimento e configuração de lógicas de controle'],
      figs: [['analisador-microdist.webp', 'Analisador de processo MicroDist', 'FIG. 01·B-1', 'Analisador de processo · MicroDist'], ['analisador-ponto-fulgor.webp', 'Analisador de processo de ponto de fulgor', 'FIG. 01·B-2', 'Analisador de processo · ponto de fulgor']] },
    p01c: { code: '01·C', h3: 'Elétrica',
      items: ['Projeto / Inspeção / Montagem e comissionamento', 'Teste de cabo BT / MT', 'Teste de transformador / painel', 'Teste de motor elétrico', 'Aterramento / SPDA', 'Análise de qualidade de energia'],
      figs: [['teste-painel-industrial.jpeg', 'Teste elétrico em painel industrial', 'FIG. 01·C-1', 'Teste em painel industrial'], ['teste-aterramento-campo.jpeg', 'Teste de aterramento em campo', 'FIG. 01·C-2', 'Aterramento em campo']] },
    p01d: { code: '01·D', h3: 'Equipamentos Rotativos / Estáticos',
      items: ['Inspeção e comissionamento', 'Alinhamento / Paralelismo final', 'Running em vazio / carga', 'Monitoramento e avaliação de vibração', 'Teste hidrostático'],
      figs: [['rotativos-turbina.webp', 'Planta de turbina a gás, referência de equipamento rotativo', 'FIG. 01·D-1', 'Turbina a gás (referência)']] },
    p01e: { code: '01·E · Ciclo completo de obra', h3: 'Inspeção, Montagem e Comissionamento',
      note: 'Do recebimento de materiais à operação assistida, cobrimos todo o ciclo de vida da instalação.',
      two: [['Inspeção', ['Recebimento e preservação de materiais', 'Nivelamento e pré-alinhamento de eixo', 'Grauteamento', 'Alinhamento final de eixo', 'Liberação das tubulações', 'Teste hidrostático e de estanqueidade', 'Flushing do sistema de lubrificação, controle e selagem', 'Limpeza mecânica e química', 'Testes funcionais de equipamentos', 'Testes de performance de sistemas']],
            ['Montagem', ['Turbina a gás / Turbina a vapor', 'Gerador', 'Compressores', 'Conjunto motobomba', 'Ventiladores', 'Tubulações e estruturas metálicas', 'Filtros e juntas de vedação', 'Reparos com solda', 'Aplicação de torque de parafusos com equipamentos especiais']]],
      figs: [['inspecao-comissionamento.webp', 'Válvulas e conexões industriais inspecionadas', 'FIG. 01·E-1', 'Válvulas e conexões inspecionadas']] },
    p02a: { code: '02·A', h3: 'Manutenção Especializada',
      items: ['Calibração / Reparo de instrumentos e válvulas', 'System One / DSM / BN-3500', 'UFV', 'HVAC', 'Telemetria de tanques', 'CLP de pacotes', 'Analisadores'],
      figs: [['painel-monitoramento-dsm.jpeg', 'Manutenção de painel de controle DSM', 'FIG. 02·A-1', 'Painel de controle DSM'], ['usina-fotovoltaica.jpeg', 'Usina fotovoltaica em manutenção', 'FIG. 02·A-2', 'Usina fotovoltaica']] },
    p03a: { code: '03·A', h3: 'Fotovoltaica, PCH/CGH e Turbogeradores',
      items: ['Projeto / Inspeção e comissionamento', 'Fotovoltaica', 'PCH / CGH', 'Turbogeradores', 'Consultoria clientes ACL'],
      figs: [['pch-vista-aerea.jpeg', 'Vista aérea de pequena central hidrelétrica', 'FIG. 03·A-1', 'PCH, vista aérea'], ['pch-casa-de-forca.jpeg', 'Casa de força de PCH', 'FIG. 03·A-2', 'Casa de força']] }
  },

  inov: {
    eyebrow: 'Pilar 04 · Desenvolvimento de tecnologias', h2a: 'Tecnologia própria a serviço da', h2b: 'engenharia',
    lead: 'Soluções desenvolvidas internamente para resolver desafios reais de campo, unindo instrumentação, monitoramento inteligente e inteligência artificial.',
    /* svg: grafico do modulo (viewBox 0 0 vw 92). Classes: g = linha neutra, h = linha de destaque, th = texto de destaque */
    mods: [
      { b: 'Mód. 01', top: 'Software próprio · ', em: 'TRL 5 · versão alfa', vw: 360, svg: `<path class="g" d="M12 74 L348 74" opacity=".35"/><path class="h" stroke-dasharray="3 3" d="M71 8 L71 74 M187 8 L187 74 M301 8 L301 74"/><polyline class="g" points="12,64 26,63 40,65 54,64 66,63 68,64 70,20 72,20 74,64 88,65 102,63 116,64 130,65 144,63 158,64 172,65 184,64 186,14 188,14 190,64 204,63 218,65 232,64 246,63 260,64 274,65 288,63 296,64 298,30 304,30 306,64 320,63 334,65 348,64"/><text x="12" y="88">FI-TOCHA · 30 DIAS</text><text class="th" x="348" y="88" text-anchor="end">3 EVENTOS DE ALÍVIO</text>`,
        h3: 'FRV Atalaia', p: 'Software de engenharia que verifica o sistema de tocha inteiro pelas normas API 521, API 520 e API 537 e mostra onde dá para reduzir gás de purga sem abrir mão da segurança.', link: ['Ver detalhes do produto →', 'atalaia/'] },
      { b: 'Mód. 02', top: 'Tecnologia própria', vw: 240, svg: `<path class="h" stroke-dasharray="4 4" d="M12 32 L228 32"/><text class="th" x="12" y="26">LIMITE</text><polyline class="g" points="12,74 38,70 64,72 90,62 116,66 142,52 168,58 194,46 228,50"/><circle class="h" cx="228" cy="50" r="3"/>`,
        h3: 'Sensor de Amônia', p: 'Sensor proprietário de alta precisão para monitoramento de amônia em processos industriais críticos.' },
      { b: 'Mód. 03', top: 'Tecnologia própria', vw: 240, svg: `<path class="g" d="M12 46 L228 46" opacity=".35"/><path class="h" d="M12 46 C 30 8, 48 8, 66 46 S 102 84, 120 46 S 156 8, 174 46 S 210 84, 228 46"/><text x="12" y="86">DHT · HARMÔNICAS</text>`,
        h3: 'Monitor de Qualidade de Energia', p: 'Equipamento próprio para análise contínua de qualidade de energia elétrica em plantas industriais.' },
      { b: 'Mód. 04', top: 'Tecnologia própria', vw: 240, svg: `<path class="g" d="M20 72 L44 28 L84 28 L60 72 Z"/><path class="g" d="M74 72 L98 28 L138 28 L114 72 Z"/><path class="h" d="M128 72 L152 28 L192 28 L168 72 Z"/><text class="th" x="150" y="86">FALHA · STRING 03</text>`,
        h3: 'Monitoramento Fotovoltaico', p: 'Sistema de monitoramento e identificação automática de falhas em usinas fotovoltaicas.' },
      { b: 'Mód. 05', top: 'Tecnologia própria', vw: 240, svg: `<rect class="g" x="22" y="14" width="46" height="62"/><path class="g" d="M30 28 L60 28 M30 38 L60 38 M30 48 L54 48 M30 58 L58 58"/><path class="g" d="M68 45 L118 45 M150 22 L118 45 L150 68 M150 22 L196 30 M150 68 L196 60 M196 30 L196 60" opacity=".7"/><circle class="g" cx="118" cy="45" r="4"/><circle class="g" cx="150" cy="22" r="4"/><circle class="g" cx="150" cy="68" r="4"/><circle class="g" cx="196" cy="30" r="4"/><circle class="h" cx="196" cy="60" r="5"/>`,
        h3: 'Base de Normas com LLM', p: 'Banco de dados vetorizado especialista em normas nacionais e internacionais, com LLM para avaliação de relatórios e contratos.' }
    ]
  },

  contato: {
    eyebrow: 'Fale com a gente', h2a: 'Entre em', h2b: 'contato',
    emailH: 'E-mail', email: 'roberto@frv.eng.br', emailHref: 'mailto:roberto@frv.eng.br', emailBtn: 'Enviar e-mail',
    emailBtnHref: 'mailto:roberto@frv.eng.br?subject=Contato%20via%20site%20-%20FRV%20Engenharia&body=Ol%C3%A1%2C%20Roberto!%20Vim%20atrav%C3%A9s%20do%20site%20da%20FRV%20Engenharia%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20os%20servi%C3%A7os.',
    telH: 'Telefone / WhatsApp', tel: '(81) 99365-7878', telHref: 'tel:+5581993657878', waBtn: 'Chamar no WhatsApp',
    waHref: 'https://wa.me/5581993657878?text=Ol%C3%A1!%20Vim%20atrav%C3%A9s%20do%20site%20da%20FRV%20Engenharia%20e%20gostaria%20de%20saber%20mais%20sobre%20os%20servi%C3%A7os%20de%20voc%C3%AAs.',
    respH: 'Responsável técnico', resp: 'Eng. Roberto Fioravante'
  },

  rodape: {
    p1: [{ t: 'FRV Engenharia', b: 1 }, { t: ' — Montagem Eletromecânica, Manutenção, Energias Renováveis e Tecnologia.' }],
    p2: '© 2026 FRV Engenharia. Todos os direitos reservados.',
    mono: 'Do projeto ao comissionamento'
  },

  /* Aviso de cookies: mesmo texto e mesma chave do site. Nas propostas o Google Analytics NAO carrega. */
  cookies: { key: 'frv_cookie_consent', text: 'Usamos cookies de análise para entender como os visitantes usam este site. Seus dados não são vendidos nem compartilhados.', decline: 'Recusar', accept: 'Aceitar' }
};
