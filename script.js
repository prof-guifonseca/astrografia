// Astrografia 🌌 — Versão alinhada com Netlify Functions
(() => {
  'use strict';

  // Endpoints Netlify (serverless). Mantêm as chaves fora do cliente.
  const API = {
    astro: '/.netlify/functions/getAstroData',
    coords: '/.netlify/functions/getCoordinates',
    perspective: '/.netlify/functions/interpretPerspective'
  };

  const $ = s => document.querySelector(s);

  /*
   * =============================
   *   Efemérides locais 🪐
   *
   * Fallback local caso a função serverless falhe (modo offline).
   * Usa um modelo circular simplificado a partir do epoch J2000.
   * NÃO substitui efemérides profissionais; serve apenas como
   * aproximação lúdica quando não há resposta do backend.
   */

  // Nomes dos signos em português na ordem zodiacal.
  const SIGNS_PT = [
    'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
    'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
  ];

  const SIGN_INFO = {
    'Áries': { traits: ['corajoso', 'impulsivo', 'independente', 'dinâmico'] },
    'Touro': { traits: ['estável', 'determinado', 'prático', 'sensual'] },
    'Gêmeos': { traits: ['comunicativo', 'curioso', 'versátil', 'social'] },
    'Câncer': { traits: ['emocional', 'protetor', 'nutritivo', 'sensível'] },
    'Leão': { traits: ['confiante', 'generoso', 'expressivo', 'criativo'] },
    'Virgem': { traits: ['analítico', 'organizado', 'detalhista', 'prudente'] },
    'Libra': { traits: ['harmonioso', 'sociável', 'diplomático', 'esteta'] },
    'Escorpião': { traits: ['intenso', 'transformador', 'profundo', 'misterioso'] },
    'Sagitário': { traits: ['aventureiro', 'otimista', 'filosófico', 'expansivo'] },
    'Capricórnio': { traits: ['disciplinado', 'ambicioso', 'pragmático', 'responsável'] },
    'Aquário': { traits: ['inovador', 'independente', 'visionário', 'humanitário'] },
    'Peixes': { traits: ['sensível', 'imaginativo', 'compassivo', 'místico'] }
  };

  const SIGN_ELEMENTS = {
    'Áries': 'Fogo', 'Leão': 'Fogo', 'Sagitário': 'Fogo',
    'Touro': 'Terra', 'Virgem': 'Terra', 'Capricórnio': 'Terra',
    'Gêmeos': 'Ar', 'Libra': 'Ar', 'Aquário': 'Ar',
    'Câncer': 'Água', 'Escorpião': 'Água', 'Peixes': 'Água'
  };

  // Map para derivar iconKey quando necessário (fallback local)
  const PLANET_ICON_KEY_PT = {
    'Sol': 'sun',
    'Lua': 'moon',
    'Mercúrio': 'mercury',
    'Vênus': 'venus',
    'Marte': 'mars',
    'Júpiter': 'jupiter',
    'Saturno': 'saturn',
    'Urano': 'uranus',
    'Netuno': 'neptune',
    'Plutão': 'pluto'
  };

  const ANGLE_ICON_KEY_PT = {
    'Ascendente': 'ascendant',
    'Descendente': 'descendant',
    'Meio do Céu': 'midheaven',
    'Fundo do Céu': 'imum-coeli'
  };

  // Definições dos planetas (português) para o fallback local
  const PLANET_DEFS = [
    { name: 'Sol',      period: 365.256,   init: 280.460,    icon: '☀️', iconKey: 'sun' },
    { name: 'Lua',      period: 27.321582, init: 218.316,    icon: '🌙', iconKey: 'moon' },
    { name: 'Mercúrio', period: 87.969,    init: 252.25084,  icon: '☿️', iconKey: 'mercury' },
    { name: 'Vênus',    period: 224.701,   init: 181.97973,  icon: '♀️', iconKey: 'venus' },
    { name: 'Marte',    period: 686.98,    init: 355.43300,  icon: '♂️', iconKey: 'mars' },
    { name: 'Júpiter',  period: 4332.59,   init: 34.35151,   icon: '♃', iconKey: 'jupiter' },
    { name: 'Saturno',  period: 10759.22,  init: 50.07744,   icon: '♄', iconKey: 'saturn' },
    { name: 'Urano',    period: 30685.4,   init: 314.05501,  icon: '♅', iconKey: 'uranus' },
    { name: 'Netuno',   period: 60190.03,  init: 304.34866,  icon: '♆', iconKey: 'neptune' },
    { name: 'Plutão',   period: 90560,     init: 238.92903,  icon: '♇', iconKey: 'pluto' }
  ];

  /**
   * Fallback local: calcula posições planetárias aproximadas.
   * @param {string} dateStr YYYY-MM-DD
   * @param {string} timeStr HH:MM
   * @returns {{planets: Array, ascendant: Object}}
   */
  function computeAstroData(dateStr, timeStr) {
    try {
      const [y, m, d] = (dateStr || '').split('-').map(Number);
      const [h, mi] = (timeStr || '').split(':').map(Number);
      const birth = new Date(Date.UTC(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0));
      const epoch = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
      const days = (birth - epoch) / 86400000;

      let earthLong = 100.46435 + (360 / 365.256) * days;
      earthLong = ((earthLong % 360) + 360) % 360;

      const planets = [];
      PLANET_DEFS.forEach(p => {
        let deg;
        if (p.name === 'Sol') {
          deg = (earthLong + 180) % 360;
        } else {
          deg = p.init + (360 / p.period) * days;
          deg = ((deg % 360) + 360) % 360;
        }
        const signIndex = Math.floor(deg / 30);
        const sign = SIGNS_PT[signIndex];
        const signDegree = deg % 30;
        planets.push({
          name: p.name,        // português
          sign,                // português
          signDegree,
          degree: deg,
          icon: p.icon,
          iconKey: p.iconKey
        });
      });

      const hourVal = Number.isFinite(h) ? h : 0;
      const minVal = Number.isFinite(mi) ? mi : 0;
      const timeFraction = ((hourVal + minVal / 60) / 24) % 1;
      const ascDeg = (timeFraction * 360) % 360;
      const ascSignIndex = Math.floor(ascDeg / 30);
      const ascSign = SIGNS_PT[ascSignIndex];

      return {
        planets,
        ascendant: { sign: ascSign, degree: ascDeg % 30 }
      };
    } catch (err) {
      console.error('[Astrografia] Erro ao calcular mapa local:', err);
      return { planets: [], ascendant: null };
    }
  }

  const formEl = $('#astro-form');
  const nameEl = $('#name');
  const dateEl = $('#birthDate');
  const timeEl = $('#birthTime');
  const placeEl = $('#birthPlace');
  const resultSection = $('#result-section');
  const summaryEl = $('#summary');
  const chartEl = $('#chart-container');
  const reportEl = $('#report-container');
  const sectionBtns = document.querySelectorAll('.btn-section');
  const sectionGroup = $('#section-buttons');
  const perspectiveSec = $('#perspective-section');
  const perspectiveEl = $('#perspective-text');
  const submitPerspectiveBtn = $('#submit-perspective');
  const perspectiveResult = $('#perspective-result');

  // Elementos para resultados temáticos acumulativos
  const thematicResultsSection = document.getElementById('thematic-results');
  const thematicResultsContainer = document.getElementById('thematic-results-container');

  // Armazena o primeiro nome do usuário para personalização
  let firstName = '';

  // Novos elementos de fuso horário / horário de verão
  const timezoneBaseEl = $('#timezoneBase');
  const dstFlagEl = $('#dstFlag');

  let dadosGerados = null;

  // ===============================
  //  Geocodificação (Netlify)
  // ===============================
  async function obterCoordenadas(local) {
    try {
      const url = `${API.coords}?place=${encodeURIComponent(local)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao obter coordenadas');
      return await res.json(); // { lat, lng, timezone?, tzName? }
    } catch (err) {
      console.error('[Astrografia] Erro ao obter coordenadas:', err);
      showToast('Não foi possível determinar as coordenadas. Usando cálculo aproximado.', 'warning');
      return null;
    }
  }

  // ===============================
  //  Posições planetárias (Netlify)
  // ===============================
  async function obterPosicoesPlanetarias(params) {
    try {
      const res = await fetch(API.astro, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json?.planets?.length) {
        // json já vem com { planets, ascendant, houses, angles, source, reason? }
        return json;
      }

      throw new Error('Resposta sem planetas');
    } catch (err) {
      console.error('[Astrografia] Erro ao obter posições:', err);
      // Fallback local: mesmo shape básico, mas marcando a origem
      const fallback = computeAstroData(params.date, params.time);
      return {
        ...fallback,
        houses: null,
        angles: fallback.ascendant
          ? {
              ascendant: {
                name: 'Ascendente',
                sign: fallback.ascendant.sign,
                degree: fallback.ascendant.degree,
                iconKey: 'ascendant',
                icon: '🌅'
              },
              midheaven: null,
              descendant: null,
              ic: null
            }
          : null,
        source: 'fallback-local'
      };
    }
  }

  // ===============================
  //  Toasts
  // ===============================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast--hide');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
  }

  // ===============================
  //  Renderização do mapa
  // ===============================
  function exibirMapa(data = {}) {
    const planets = data.planets || [];
    const ascendant = data.ascendant || null;
    const houses = data.houses || null;
    const angles = data.angles || {};
    const source = data.source;

    chartEl.innerHTML = '<h3 class="fade-in">🔭 Posições Planetárias</h3>';

    if (!planets.length) {
      chartEl.innerHTML += '<p>⚠️ Nenhuma posição planetária encontrada.</p>';
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.classList.add('report-html');

    let html = '';

    // ---------- Tabela principal: planetas ----------
    html += `
      <h4>Corpos celestes</h4>
      <table class="astro-table">
        <thead>
          <tr>
            <th>Corpo</th>
            <th>Signo</th>
            <th>Casa</th>
            <th>Grau</th>
          </tr>
        </thead>
        <tbody>
    `;

    planets.forEach(p => {
      const sign = p.sign || '—';
      const casa = typeof p.house === 'number' ? p.house : '—';

      let grauNum;
      if (typeof p.signDegree === 'number') {
        grauNum = p.signDegree;
      } else if (typeof p.degree === 'number') {
        grauNum = p.degree % 30;
      }
      const grauStr = typeof grauNum === 'number' ? `${grauNum.toFixed(1)}°` : '—';

      const iconKey = p.iconKey || PLANET_ICON_KEY_PT[p.name];
      const emoji = p.icon || '';
      const iconSpan = iconKey
        ? `<span class="astro-icon astro-icon--${iconKey}" data-icon-key="${iconKey}">${emoji}</span>`
        : (emoji || '🔹');

      html += `
        <tr>
          <td>${iconSpan} <strong>${p.name}</strong></td>
          <td>${sign}</td>
          <td>${casa}</td>
          <td>${grauStr}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    // ---------- Ângulos principais ----------
    const angleList = [];
    if (angles && typeof angles === 'object') {
      if (angles.ascendant) angleList.push(angles.ascendant);
      if (angles.midheaven) angleList.push(angles.midheaven);
      if (angles.descendant) angleList.push(angles.descendant);
      if (angles.ic) angleList.push(angles.ic);
    }

    if (angleList.length) {
      html += `
        <h4>Ângulos principais</h4>
        <table class="astro-table">
          <thead>
            <tr>
              <th>Ponto</th>
              <th>Signo</th>
              <th>Casa</th>
              <th>Grau</th>
            </tr>
          </thead>
          <tbody>
      `;

      angleList.forEach(a => {
        const nome = a.name || '—';
        const signo = a.sign || '—';
        let casa = a.house;

        if (casa == null) {
          if (nome === 'Ascendente') casa = 1;
          else if (nome === 'Fundo do Céu') casa = 4;
          else if (nome === 'Descendente') casa = 7;
          else if (nome === 'Meio do Céu') casa = 10;
        }

        const grauStr =
          typeof a.degree === 'number' ? `${a.degree.toFixed(1)}°` : '—';

        const iconKey = a.iconKey || ANGLE_ICON_KEY_PT[nome];
        const emoji = a.icon || '';
        const iconSpan = iconKey
          ? `<span class="astro-icon astro-icon--${iconKey}" data-icon-key="${iconKey}">${emoji}</span>`
          : (emoji || '🔹');

        html += `
          <tr>
            <td>${iconSpan} <strong>${nome}</strong></td>
            <td>${signo}</td>
            <td>${casa != null ? casa : '—'}</td>
            <td>${grauStr}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;
    } else if (ascendant?.sign) {
      // fallback mínimo se angles não veio mas temos ascendente
      const grauAsc = typeof ascendant.degree === 'number'
        ? `${ascendant.degree.toFixed(1)}°`
        : '—';
      html += `<p>🌅 Ascendente em <strong>${ascendant.sign}</strong> (${grauAsc}).</p>`;
    }

    // ---------- Cúspides das casas ----------
    if (Array.isArray(houses) && houses.length) {
      html += `
        <h4>Cúspides das casas</h4>
        <table class="astro-table">
          <thead>
            <tr>
              <th>Casa</th>
              <th>Signo</th>
              <th>Grau</th>
            </tr>
          </thead>
          <tbody>
      `;

      houses
        .slice()
        .sort((a, b) => a.house - b.house)
        .forEach(h => {
          const grauStr =
            typeof h.degree === 'number' ? `${h.degree.toFixed(1)}°` : '—';
          html += `
            <tr>
              <td>${h.house}</td>
              <td>${h.sign || '—'}</td>
              <td>${grauStr}</td>
            </tr>
          `;
        });

      html += `
          </tbody>
        </table>
      `;
    }

    if (source === 'fallback' || source === 'fallback-local') {
      html += `<p><em>⚠️ Mapa calculado de forma aproximada (sem efemérides completas).</em></p>`;
    }

    wrapper.innerHTML = html;
    chartEl.appendChild(wrapper);
  }

  // ===============================
  //  Submit do formulário
  // ===============================
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameEl.value.trim();
    const birthDate = dateEl.value;
    const birthTime = timeEl.value;
    const birthPlace = placeEl.value.trim();

    if (!name || !birthDate || !birthTime || !birthPlace) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    // Captura o primeiro nome para uso em leituras personalizadas
    const nameParts = name.split(/\s+/);
    firstName = nameParts.length ? nameParts[0] : name;

    const btn = $('#generateMap');
    btn.disabled = true;
    btn.textContent = '⌛ Gerando...';

    summaryEl.textContent = 'Calculando posições com alta precisão...';
    chartEl.innerHTML = '';
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');

    // Coordenadas (pode vir timezone do OpenCage)
    const coords = await obterCoordenadas(birthPlace);

    // Monta parâmetros básicos
    const params = {
      date: birthDate,
      time: birthTime,
      lat: coords?.lat,
      lon: coords?.lng
    };

    // Tratamento de fuso horário / horário de verão
    let timezoneOffset;
    const timezoneBaseStr = timezoneBaseEl ? timezoneBaseEl.value : '';
    const dstFlag = dstFlagEl ? dstFlagEl.checked : false;

    if (timezoneBaseEl && timezoneBaseStr !== '') {
      let tzBaseNum = Number(timezoneBaseStr); // ex.: -3
      if (!Number.isNaN(tzBaseNum) && Number.isFinite(tzBaseNum)) {
        if (dstFlag) tzBaseNum += 1; // +1h se horário de verão marcado
        timezoneOffset = tzBaseNum;
      }
    } else if (coords && typeof coords.timezone !== 'undefined') {
      timezoneOffset = coords.timezone;
    }

    if (typeof timezoneOffset === 'number' && Number.isFinite(timezoneOffset)) {
      params.timezone = timezoneOffset;
    }

    const response = await obterPosicoesPlanetarias(params);
    dadosGerados = response;

    if (response.source === 'api') {
      summaryEl.textContent = '✅ Mapa gerado com efemérides precisas.';
    } else if (response.source === 'fallback') {
      summaryEl.textContent = '⚠️ Mapa gerado com cálculo aproximado (fallback do servidor).';
      if (response.reason) {
        console.warn('[Astrografia] Fallback do servidor:', response.reason);
        showToast(`Usando fallback do servidor: ${response.reason}`, 'warning');
      } else {
        showToast('Usando cálculo aproximado de posições. Resultados podem ser menos precisos.', 'warning');
      }
    } else if (response.source === 'fallback-local') {
      summaryEl.textContent = '⚠️ Mapa gerado localmente (modo offline / erro de rede).';
      showToast('Mapa calculado localmente. Use como referência lúdica, não como cálculo profissional.', 'warning');
    } else {
      summaryEl.textContent = '✅ Mapa gerado.';
    }

    exibirMapa(response);
    sectionGroup?.classList.remove('hidden');
    perspectiveSec?.classList.remove('hidden');

    // Limpa resultados temáticos anteriores ao gerar novo mapa
    if (thematicResultsContainer) {
      thematicResultsContainer.innerHTML = '';
      thematicResultsSection?.classList.add('hidden');
    }

    btn.disabled = false;
    btn.textContent = 'Gerar Mapa Astral';
  });

  // ===============================
  //  Interpretações por tema
  // ===============================
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-topic]');
    if (!btn || !dadosGerados) return;

    const tema = btn.dataset.topic;
    sectionBtns.forEach(b => b.classList.remove('btn-section--active'));
    btn.classList.add('btn-section--active');
    // Não limpamos mais o reportEl; as leituras serão acumuladas em cards separados

    btn.textContent = 'Gerando...';
    btn.disabled = true;

    function interpretTheme(themeKey, data) {
      const planets = data?.planets || [];
      const asc = data?.ascendant;
      const getPlanet = (name) => planets.find(p => p.name === name);
      const html = [];

      function traitsOf(sign, count = 4) {
        const traits = SIGN_INFO[sign]?.traits || [];
        return traits.slice(0, count).join(', ');
      }

      function synergyPhrase(el1, el2) {
        if (!el1 || !el2) return '';
        if (el1 === el2) {
          return `Como ambos pertencem ao elemento <strong>${el1}</strong>, suas energias tendem a atuar de forma harmoniosa e natural.`;
        }
        return `A combinação de elementos distintos (<strong>${el1}</strong> e <strong>${el2}</strong>) traz dinamismo e complementaridade, oferecendo oportunidades de aprendizado e equilíbrio.`;
      }

      switch (themeKey) {
        case 'amor': {
          const venus = getPlanet('Vênus');
          const mars = getPlanet('Marte');
          if (!venus || !mars || !asc) break;
          const venTraits = traitsOf(venus.sign, 4);
          const marsTraits = traitsOf(mars.sign, 4);
          const venElement = SIGN_ELEMENTS[venus.sign];
          const marsElement = SIGN_ELEMENTS[mars.sign];
          html.push(`<h4>❤️ Amor e Relacionamentos</h4>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}o seu universo afetivo é moldado por Vênus em <strong>${venus.sign}</strong> (${venus.signDegree.toFixed(1)}°) e Marte em <strong>${mars.sign}</strong> (${mars.signDegree.toFixed(1)}°). Esses dois astros falam sobre a maneira como você ama e deseja. Vênus, que governa o amor e a harmonia, indica que você expressa o afeto de forma ${venTraits}, sempre buscando beleza e equilíbrio nas relações.</p>`);
          html.push(`<p>Ao mesmo tempo, Vênus em ${venus.sign} convida você a explorar a própria sensualidade com delicadeza. Este posicionamento sugere uma alma que aprecia gestos gentis e gestos de carinho, valorizando a estética e a poesia do cotidiano. Permita-se receber e oferecer ternura, reconhecendo que, para você, amor também é arte.</p>`);
          html.push(`<p>Marte em ${mars.sign}, por sua vez, acrescenta uma energia ${marsTraits} aos seus desejos e iniciativas. Ele mostra de que forma você persegue o que quer, inclusive nos relacionamentos, revelando como manifesta a paixão e a assertividade. Em ${mars.sign}, Marte impulsiona você a vivenciar encontros com intensidade e autenticidade.</p>`);
          html.push(`<p>${synergyPhrase(venElement, marsElement)} Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) colore a maneira como você se apresenta, influenciando as dinâmicas afetivas e a forma como inicia conexões. Este ascendente oferece uma lente através da qual o mundo percebe sua busca por cumplicidade.</p>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}o amor para você é um jardim cultivado com paciência e intenção. Explore a doçura de Vênus e a força de Marte para construir laços que honrem quem você é. Lembre-se de que amar é um ato contínuo de presença, onde cada gesto, por menor que pareça, é um universo inteiro.</p>`);
          break;
        }
        case 'carreira': {
          const jup = getPlanet('Júpiter');
          const sat = getPlanet('Saturno');
          if (!jup || !sat || !asc) break;
          const jupTraits = traitsOf(jup.sign, 4);
          const satTraits = traitsOf(sat.sign, 4);
          const jupElement = SIGN_ELEMENTS[jup.sign];
          const satElement = SIGN_ELEMENTS[sat.sign];
          html.push(`<h4>💼 Carreira e Propósito</h4>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}a sua trajetória profissional é guiada por Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) e Saturno em <strong>${sat.sign}</strong> (${sat.signDegree.toFixed(1)}°). Júpiter, planeta da expansão e do crescimento, indica que suas oportunidades florescem quando você aposta em ${jupTraits}, permitindo-se sonhar alto e abraçar projetos que ampliem seus horizontes.</p>`);
          html.push(`<p>Com Júpiter em ${jup.sign}, você é convidado a cultivar uma visão generosa de mundo, aprendendo através de experiências e estudos que nutrem sua curiosidade. Deixe que a curiosidade guie seus passos e permita-se explorar caminhos menos óbvios, pois ali podem estar suas maiores conquistas.</p>`);
          html.push(`<p>Saturno em ${sat.sign} traz uma disciplina ${satTraits} às suas ambições. Este planeta, guardião dos limites e da responsabilidade, mostra onde precisamos trabalhar com persistência e atenção aos detalhes para conquistar resultados duradouros. Ele pede que você abrace a maturidade e a paciência.</p>`);
          html.push(`<p>${synergyPhrase(jupElement, satElement)} O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) mostra a postura que você adota ao perseguir suas metas e como as pessoas percebem seu empenho. A forma como você inicia projetos e apresenta suas ideias influencia diretamente as oportunidades que se manifestam.</p>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}confie na sua habilidade de equilibrar sonho e realidade. Ao unir a expansão de Júpiter com a estrutura de Saturno, você constrói um propósito sólido, capaz de atravessar desafios e criar um legado significativo.</p>`);
          break;
        }
        case 'familia': {
          const moon = getPlanet('Lua');
          const sun = getPlanet('Sol');
          if (!moon || !asc) break;
          const moonTraits = traitsOf(moon.sign, 4);
          const sunTraits = sun ? traitsOf(sun.sign, 4) : '';
          const moonElement = SIGN_ELEMENTS[moon.sign];
          const sunElement = sun ? SIGN_ELEMENTS[sun.sign] : null;
          html.push(`<h4>🏠 Família e Origens</h4>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}no coração de suas origens reside a Lua em <strong>${moon.sign}</strong> (${moon.signDegree.toFixed(1)}°). Este posicionamento revela uma natureza emocional ${moonTraits}, indicando como você procura segurança e se conecta com suas raízes. A Lua fala de memórias, nutrição e vínculo com o passado.</p>`);
          html.push(`<p>Ao mergulhar nas suas origens, permita-se revisitar histórias familiares e compreender como elas moldam sua sensibilidade. A Lua em ${moon.sign} convida você a honrar tradições e a buscar conforto nos pequenos rituais cotidianos que o ancoram.</p>`);
          if (sun) {
            html.push(`<p>O Sol em <strong>${sun.sign}</strong> (${sun.signDegree.toFixed(1)}°) contribui com uma essência ${sunTraits} às suas relações familiares, mostrando como sua identidade se manifesta dentro do lar. Seu brilho pessoal inspira aqueles que estão ao seu redor e colore a maneira como você percebe a família.</p>`);
            html.push(`<p>O Sol, essência da individualidade, ilumina as paredes da casa interna e externa. Valorize os momentos em que você é chamado a ser a força e a alegria da família, mas também permita-se receber apoio quando necessário.</p>`);
          }
          html.push(`<p>${synergyPhrase(moonElement, sunElement || moonElement)} Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) mostra como você acolhe e protege aqueles ao seu redor, revelando a máscara que veste ao entrar em contato com seu clã. Esta energia inicial influencia como você constrói lares e abriga memórias.</p>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}cultivar o espaço interno é uma arte. Honre suas emoções e permita que sua casa, seja ela física ou simbólica, seja um refúgio onde você possa sempre voltar e recarregar suas energias.</p>`);
          break;
        }
        case 'espiritualidade': {
          const nep = getPlanet('Netuno');
          const jup = getPlanet('Júpiter');
          if (!nep || !asc) break;
          const nepTraits = traitsOf(nep.sign, 4);
          const jupTraits = jup ? traitsOf(jup.sign, 4) : '';
          const nepElement = SIGN_ELEMENTS[nep.sign];
          const jupElement = jup ? SIGN_ELEMENTS[jup.sign] : null;
          html.push(`<h4>🧘 Espiritualidade</h4>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}sua jornada espiritual é profundamente influenciada por Netuno em <strong>${nep.sign}</strong> (${nep.signDegree.toFixed(1)}°). Netuno rege sonhos, intuições e o inconsciente; em ${nep.sign}, ele aponta para uma conexão ${nepTraits} com o mistério da vida. Ele convida a dissolver limites e a entregar-se ao fluxo.</p>`);
          html.push(`<p>Este posicionamento amplia sua sensibilidade e pede que você confie na linguagem do invisível: símbolos, sincronicidades e a voz interior. Práticas como meditação, arte ou contemplação da natureza podem despertar visões e acalmar a alma.</p>`);
          if (jup) {
            html.push(`<p>Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) complementa sua jornada com uma energia ${jupTraits}, incentivando a busca por sabedoria e sentido. Júpiter expande as fronteiras do conhecimento e sugere que o estudo de filosofias e culturas pode nutrir seu espírito.</p>`);
            html.push(`<p>Ao combinar Netuno e Júpiter, você equilibra fé e razão, misticismo e filosofia. Permita-se explorar caminhos espirituais e acadêmicos; ambos enriquecem sua experiência e ajudam a construir uma cosmovisão abrangente.</p>`);
          }
          html.push(`<p>${synergyPhrase(nepElement, jupElement || nepElement)} O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) orienta a forma como você manifesta sua busca interior no cotidiano. Ele colore a maneira como você inicia jornadas espirituais e como compartilha suas descobertas com os outros.</p>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}lembre-se de que espiritualidade não é um destino, mas um caminho. Confie na sua intuição e permita-se ser guiado por uma curiosidade sagrada; assim, cada passo se torna um ritual de conexão com o todo.</p>`);
          break;
        }
        case 'missao': {
          const sun = getPlanet('Sol');
          const jup = getPlanet('Júpiter');
          if (!sun || !asc) break;
          const sunTraits = traitsOf(sun.sign, 4);
          const jupTraits = jup ? traitsOf(jup.sign, 4) : '';
          const sunElement = SIGN_ELEMENTS[sun.sign];
          const jupElement = jup ? SIGN_ELEMENTS[jup.sign] : null;
          html.push(`<h4>🚀 Missão de Vida</h4>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}o Sol em <strong>${sun.sign}</strong> (${sun.signDegree.toFixed(1)}°) revela uma essência marcada por ${sunTraits}. O Sol representa nosso núcleo, vitalidade e propósito, indicando onde brilhamos de maneira autêntica. Essa é a chama que impulsiona sua missão.</p>`);
          html.push(`<p>Reconhecer o seu Sol implica assumir sua luz e, ao mesmo tempo, suas sombras. Ao honrar as qualidades do signo solar, você se alinha com o coração da sua existência e se sente mais vivo, confiante e seguro de si.</p>`);
          if (jup) {
            html.push(`<p>Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) reforça seu propósito ao acrescentar uma visão ${jupTraits}, ampliando seus horizontes. Este planeta impulsiona a busca por significado e convida a uma vida com sentido maior.</p>`);
            html.push(`<p>Combinar Sol e Júpiter significa viver com entusiasmo e generosidade. Ao explorar oportunidades, estudos e viagens, você alimenta a chama do Sol e expande as possibilidades para sua missão se desenvolver.</p>`);
          }
          html.push(`<p>${synergyPhrase(sunElement, jupElement || sunElement)} O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) colore a expressão dessa missão, mostrando como você se coloca no mundo e como os outros testemunham seu brilho. Ele serve como ponte entre essência e exterior.</p>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}sua missão de vida é um processo contínuo de descoberta e entrega. Nutra seu Sol, expanda com Júpiter e use o Ascendente como canal para compartilhar seus dons. Confie que, ao seguir seu coração, você já está cumprindo seu destino.</p>`);
          break;
        }
        case 'desafios': {
          const plut = getPlanet('Plutão');
          const mars = getPlanet('Marte');
          const sat = getPlanet('Saturno');
          if (!plut || !mars || !asc) break;
          const plutTraits = traitsOf(plut.sign, 4);
          const marsTraits = traitsOf(mars.sign, 4);
          const satTraits = sat ? traitsOf(sat.sign, 4) : '';
          const plutElement = SIGN_ELEMENTS[plut.sign];
          const marsElement = SIGN_ELEMENTS[mars.sign];
          const satElement = sat ? SIGN_ELEMENTS[sat.sign] : null;
          html.push(`<h4>⚖️ Desafios Pessoais</h4>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}Plutão em <strong>${plut.sign}</strong> (${plut.signDegree.toFixed(1)}°) fala de processos de ${plutTraits}. Ele mostra onde precisamos nos transformar profundamente, onde a vida nos convida a renascer das cinzas e liberar padrões antigos.</p>`);
          html.push(`<p>Encarar Plutão é abraçar a sombra e reconhecer que em cada fim existe um recomeço. Permita-se mergulhar em temas que despertam medo ou resistência; ali reside o potencial de cura e empoderamento.</p>`);
          html.push(`<p>Marte em <strong>${mars.sign}</strong> (${mars.signDegree.toFixed(1)}°) apresenta desafios ligados à ${marsTraits}. Este planeta nos ensina a manejar impulsos, a canalizar a energia de forma construtiva e a encarar confrontos sem perder a integridade.</p>`);
          if (sat) {
            html.push(`<p>Saturno em <strong>${sat.sign}</strong> (${sat.signDegree.toFixed(1)}°) adiciona uma camada de ${satTraits} aos seus obstáculos, indicando onde a vida pode exigir disciplina, paciência e estrutura. É através de Saturno que aprendemos a respeitar limites e a construir bases sólidas.</p>`);
            html.push(`<p>Saturno é o mestre do tempo; ele não nega recompensas, apenas espera que estejamos prontos. Ao abraçar seus ensinamentos, você transforma desafios em degraus para o crescimento.</p>`);
          }
          html.push(`<p>${synergyPhrase(plutElement, marsElement)} Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) ajuda a integrar essas forças, apontando caminhos de crescimento. A forma como você aborda seus desafios influencia a transmutação de energia.</p>`);
          html.push(`<p>${firstName ? `${firstName}, ` : ''}lembre-se de que desafios não são punições, mas oportunidades de amadurecer. Ao aceitar a complexidade de Plutão, a coragem de Marte e a sabedoria de Saturno, você se fortalece e aprende a trilhar sua jornada com resiliência.</p>`);
          break;
        }
        default: {
          html.push('<p>⚠️ Tema não reconhecido.</p>');
          break;
        }
      }

      if (!html.length) {
        return '<p>⚠️ Não há dados suficientes para interpretar este tema.</p>';
      }
      return html.join('');
    }

    const interpretation = interpretTheme(tema, dadosGerados);

    // Cria um novo card para esta leitura e adiciona ao container de leituras
    if (thematicResultsContainer) {
      const card = document.createElement('div');
      card.className = 'report-html card';
      card.innerHTML = interpretation;
      thematicResultsContainer.appendChild(card);
      // Exibe a seção de resultados se estiver oculta
      thematicResultsSection?.classList.remove('hidden');
    }

    btn.textContent = '✔️ Interpretado';
    btn.disabled = true;
  });

  // ===============================
  //  Perspectiva pessoal
  // ===============================
  submitPerspectiveBtn?.addEventListener('click', async () => {
    const texto = perspectiveEl.value.trim();
    if (!texto) {
      showToast('Por favor, escreva sua perspectiva pessoal.', 'error');
      return;
    }
    submitPerspectiveBtn.disabled = true;
    submitPerspectiveBtn.textContent = '⌛ Interpretando...';
    perspectiveResult.innerHTML = '';
    try {
      const res = await fetch(API.perspective, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Inclui o primeiro nome para personalizar a interpretação no backend
        body: JSON.stringify({ text: texto, astro: dadosGerados, firstName })
      });
      if (res.ok) {
        const json = await res.json();
        perspectiveResult.innerHTML = `<article class="report-html">${json.html}</article>`;
      } else {
        const msg = interpretPerspectiveLocal(texto, dadosGerados || {});
        perspectiveResult.innerHTML = `<article class="report-html">${msg}</article>`;
      }
    } catch (err) {
      console.error('[Astrografia] Erro ao interpretar perspectiva:', err);
      const msg = interpretPerspectiveLocal(texto, dadosGerados || {});
      perspectiveResult.innerHTML = `<article class="report-html">${msg}</article>`;
    }
    submitPerspectiveBtn.disabled = false;
    submitPerspectiveBtn.textContent = 'Interpretar Minha Perspectiva';
  });

  // Fallback local da perspectiva, usando nomes em PT
  function interpretPerspectiveLocal(text, data) {
    const sun = data?.planets?.find(p => p.name === 'Sol');
    const asc = data?.ascendant;
    let msg = '<p><strong>Obrigado por compartilhar sua perspectiva.</strong></p>';
    if (sun && asc && SIGN_INFO[sun.sign]) {
      const traits = SIGN_INFO[sun.sign].traits.slice(0, 2).join(' e ');
      msg += `<p>Como nativo de <strong>${sun.sign}</strong>, sua essência é marcada por ${traits}. `;
      msg += `O Ascendente em <strong>${asc.sign}</strong> influencia a maneira como você encara situações presentes.</p>`;
    }
    if (text.length > 20) {
      msg += '<p>Sua mensagem revela profundidade e autenticidade. Use esse momento para reconectar-se com seus valores e confiar no processo. Cada experiência é uma oportunidade de crescimento.</p>';
    } else {
      msg += '<p>Permita-se sentir e refletir. Pequenos pensamentos também carregam verdades. Honre suas necessidades e siga em frente com gentileza.</p>';
    }
    return msg;
  }

})();
