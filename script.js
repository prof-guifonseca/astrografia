// Astrografia 🌌 — Versão Alinhada com Backend Flask
(() => {
  'use strict';

  // Endpoints now point to Netlify serverless functions. These proxy
  // external services and keep API keys off the client. See
  // `/netlify/functions` for implementation details.
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
   * Esta aplicação originalmente dependia de chamadas a um backend e serviços
   * externos para calcular posições planetárias e interpretar temas. Para
   * torná‑la completamente funcional sem rede, implementamos abaixo um
   * conjunto de constantes e funções astrológicas simplificadas.
   *
   * As posições dos planetas são estimadas a partir de valores médios no
   * epoch J2000 (01/01/2000 às 12:00 UTC) e seus períodos orbitais em dias.
   * A longitude geocêntrica do Sol é calculada como a posição da Terra
   * acrescida de 180°, e o Ascendente é aproximado em função do horário
   * local (cada período de 2h corresponde a um signo). Estas fórmulas não
   * substituem efemérides profissionais, mas fornecem resultados
   * coerentes para fins lúdicos e educativos.
   */

  // Nomes dos signos em português na ordem zodiacal.
  const SIGNS_PT = [
    'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
    'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
  ];

  // Descrições arquetípicas básicas para cada signo. Estas palavras‑chave
  // alimentam as interpretações temáticas e podem ser ajustadas conforme
  // preferência.
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

  // Definições dos planetas: período orbital (dias), longitude média em J2000
  // (graus) e ícone representativo. As longitudes iniciais foram extraídas
  // de efemérides astronômicas e arredondadas para simplificar o cálculo.
  const PLANET_DEFS = [
    { name: 'Sun',     period: 365.256,   init: 280.460,    icon: '☀️' },
    { name: 'Moon',    period: 27.321582, init: 218.316,    icon: '🌙' },
    { name: 'Mercury', period: 87.969,    init: 252.25084,  icon: '☿️' },
    { name: 'Venus',   period: 224.701,   init: 181.97973,  icon: '♀️' },
    { name: 'Mars',    period: 686.98,    init: 355.43300,  icon: '♂️' },
    { name: 'Jupiter', period: 4332.59,   init: 34.35151,   icon: '♃' },
    { name: 'Saturn',  period: 10759.22,  init: 50.07744,   icon: '♄' },
    { name: 'Uranus',  period: 30685.4,   init: 314.05501,  icon: '♅' },
    { name: 'Neptune', period: 60190.03,  init: 304.34866,  icon: '♆' },
    { name: 'Pluto',   period: 90560,     init: 238.92903,  icon: '♇' }
  ];

  /**
   * Calcula as posições planetárias e o ascendente de forma aproximada.
   *
   * @param {string} dateStr Data no formato YYYY-MM-DD
   * @param {string} timeStr Hora no formato HH:MM
   * @returns {{planets: Array, ascendant: Object}} Retorna objetos com
   *          propriedades name, sign, signDegree, degree e icon para cada
   *          planeta, bem como o ascendente com signo e grau.
   */
  function computeAstroData(dateStr, timeStr) {
    try {
      // Analisa data e hora fornecidas pelo usuário. Consideramos o fuso
      // horário UTC para simplificação; para maior precisão seria
      // necessário incluir a longitude e o fuso local.
      const [y, m, d] = (dateStr || '').split('-').map(Number);
      const [h, mi] = (timeStr || '').split(':').map(Number);
      const birth = new Date(Date.UTC(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0));
      // Epoch J2000: 1 de janeiro de 2000 às 12:00 UTC
      const epoch = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
      const days = (birth - epoch) / 86400000;

      // Calcula longitude média da Terra para determinar o Sol geocêntrico.
      let earthLong = 100.46435 + (360 / 365.256) * days;
      earthLong = ((earthLong % 360) + 360) % 360;

      const planets = [];
      PLANET_DEFS.forEach(p => {
        let deg;
        if (p.name === 'Sun') {
          // O Sol, do ponto de vista terrestre, está sempre oposto à Terra.
          deg = (earthLong + 180) % 360;
        } else {
          deg = p.init + (360 / p.period) * days;
          deg = ((deg % 360) + 360) % 360;
        }
        const signIndex = Math.floor(deg / 30);
        const sign = SIGNS_PT[signIndex];
        const signDegree = deg % 30;
        planets.push({
          name: p.name,
          sign: sign,
          signDegree: signDegree,
          degree: deg,
          icon: p.icon
        });
      });

      // Ascendente aproximado: divide o ciclo de 24h em 12 segmentos de 2h.
      const timeFraction = (((h || 0) + ((mi || 0) / 60)) / 24) % 1;
      const ascDeg = (timeFraction * 360) % 360;
      const ascSignIndex = Math.floor(ascDeg / 30);
      const ascSign = SIGNS_PT[ascSignIndex];

      return {
        planets: planets,
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

  let dadosGerados = null;

  // Recupera dados armazenados com TTL. Se expirado remove do cache.
  (function restoreCache() {
    const astroCache = localStorage.getItem('astroData');
    if (!astroCache) return;
    try {
      const parsed = JSON.parse(astroCache);
      if (parsed.expires && Date.now() > parsed.expires) {
        localStorage.removeItem('astroData');
        return;
      }
      if (parsed?.data?.planets?.length && parsed?.data?.ascendant) {
        dadosGerados = parsed.data;
        summaryEl.textContent = '⚡ Dados carregados do cache.';
        resultSection.classList.remove('hidden');
        exibirPlanetas(parsed.data.planets, parsed.data.ascendant);
        sectionGroup?.classList.remove('hidden');
        perspectiveSec?.classList.remove('hidden');
      }
    } catch (e) {
      console.warn('[Astrografia] Falha ao ler cache:', e);
    }
  })();

  // Consulta a Netlify function para obter latitude e longitude a partir do local.
  async function obterCoordenadas(local) {
    try {
      const url = `${API.coords}?place=${encodeURIComponent(local)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao obter coordenadas');
      return await res.json();
    } catch (err) {
      console.error('[Astrografia] Erro ao obter coordenadas:', err);
      showToast('Não foi possível determinar as coordenadas. Usando cálculo aproximado.', 'warning');
      return null;
    }
  }

  // Consulta a Netlify function para obter posições planetárias precisas. Recebe
  // fallback calculado localmente se a requisição falhar ou a resposta for
  // incompleta.
  async function obterPosicoesPlanetarias(params) {
    try {
      const res = await fetch(API.astro, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.planets?.length) return json;
      }
      throw new Error('Resposta vazia');
    } catch (err) {
      console.error('[Astrografia] Erro ao obter posições:', err);
      return computeAstroData(params.date, params.time);
    }
  }

  // Função utilitária para exibir mensagens temporárias (toast). Recebe o texto
  // e um tipo opcional (success, warning, error).
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    // Remover após 4s
    setTimeout(() => {
      toast.classList.add('toast--hide');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
  }

  function exibirPlanetas(planets = [], ascendant = null) {
    chartEl.innerHTML = '<h3 class="fade-in">🔭 Posições Celestes</h3>';

    if (!planets.length) {
      chartEl.innerHTML += '<p>⚠️ Nenhuma posição planetária encontrada.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.classList.add('report-html');

    if (ascendant?.sign) {
      ul.innerHTML += `<li>🌅 Ascendente: <strong>${ascendant.sign}</strong> ${Number(ascendant.degree).toFixed(1)}°</li>`;
    }

    planets.forEach(p => {
      const grau = typeof p.degree === 'number' ? `${p.degree.toFixed(1)}°` : '?°';
      ul.innerHTML += `<li>${p.icon || '🔹'} ${p.name}: ${p.sign} ${grau}</li>`;
    });

    chartEl.appendChild(ul);
  }

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
    const btn = $('#generateMap');
    btn.disabled = true;
    btn.textContent = '⌛ Gerando...';
    summaryEl.textContent = 'Calculando posições com alta precisão...';
    chartEl.innerHTML = '';
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');
    // Primeira etapa: determinar coordenadas
    const coords = await obterCoordenadas(birthPlace);
    // Segunda etapa: solicitar posições precisas se possível
    const params = { date: birthDate, time: birthTime, lat: coords?.lat, lon: coords?.lng };
    const response = await obterPosicoesPlanetarias(params);
    dadosGerados = response;
    // Salva no cache com expiração de 24h
    localStorage.setItem('astroData', JSON.stringify({ data: response, expires: Date.now() + 24 * 60 * 60 * 1000 }));
    summaryEl.textContent = '✅ Mapa gerado com sucesso!';
    exibirPlanetas(response.planets, response.ascendant);
    sectionGroup?.classList.remove('hidden');
    perspectiveSec?.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Gerar Mapa Astral';
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-topic]');
    if (!btn || !dadosGerados) return;

    const tema = btn.dataset.topic;
    const cacheKey = `astroInterpretacao:${tema}`;

    sectionBtns.forEach(b => b.classList.remove('btn-section--active'));
    btn.classList.add('btn-section--active');
    reportEl.innerHTML = '';

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      reportEl.innerHTML = cached;
      return;
    }

    btn.textContent = 'Gerando...';
    btn.disabled = true;

    // Função local para interpretar cada tema com base nos arquétipos.
    function interpretTheme(themeKey, data) {
      const planets = data.planets;
      const asc = data.ascendant;
      const getPlanet = (name) => planets.find(p => p.name === name);
      const html = [];
      switch (themeKey) {
        case 'amor': {
          const venus = getPlanet('Venus');
          const mars = getPlanet('Mars');
          const venTraits = SIGN_INFO[venus.sign].traits.slice(0, 2).join(' e ');
          const marsTraits = SIGN_INFO[mars.sign].traits.slice(0, 2).join(' e ');
          html.push(`<h4>❤️ Amor e Relacionamentos</h4>`);
          html.push(`<p>Com Vênus em <strong>${venus.sign}</strong> (${venus.signDegree.toFixed(1)}°), você expressa o afeto de maneira ${venTraits}. Vênus governa a forma como amamos e buscamos harmonia; este posicionamento revela como se conecta emocionalmente.</p>`);
          html.push(`<p>Marte em <strong>${mars.sign}</strong> (${mars.signDegree.toFixed(1)}°) acrescenta uma energia ${marsTraits} aos seus desejos e iniciativas. Marte mostra como perseguimos o que queremos, inclusive nos relacionamentos.</p>`);
          html.push(`<p>Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) colore a maneira como você se apresenta e influencia as dinâmicas afetivas.</p>`);
          break;
        }
        case 'carreira': {
          const jup = getPlanet('Jupiter');
          const sat = getPlanet('Saturn');
          const jupTraits = SIGN_INFO[jup.sign].traits.slice(0, 2).join(' e ');
          const satTraits = SIGN_INFO[sat.sign].traits.slice(0, 2).join(' e ');
          html.push(`<h4>💼 Carreira e Propósito</h4>`);
          html.push(`<p>Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) sugere que suas oportunidades profissionais florescem quando você aposta em ${jupTraits}. Júpiter expande aquilo em que tocamos; seu signo revela onde você busca crescimento.</p>`);
          html.push(`<p>Saturno em <strong>${sat.sign}</strong> (${sat.signDegree.toFixed(1)}°) traz uma disciplina ${satTraits} às suas ambições. Saturno mostra onde precisamos trabalhar com persistência para conquistar resultados duradouros.</p>`);
          html.push(`<p>O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) indica a postura que você adota ao perseguir suas metas e como é percebido no ambiente profissional.</p>`);
          break;
        }
        case 'familia': {
          const moon = getPlanet('Moon');
          const moonTraits = SIGN_INFO[moon.sign].traits.slice(0, 2).join(' e ');
          html.push(`<h4>🏠 Família e Origens</h4>`);
          html.push(`<p>A Lua em <strong>${moon.sign}</strong> (${moon.signDegree.toFixed(1)}°) reflete uma natureza emocional ${moonTraits}. Ela revela como você nutre e procura segurança; seu signo aponta para o tipo de vínculo familiar que lhe conforta.</p>`);
          html.push(`<p>O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) mostra como você acolhe e protege aqueles ao seu redor, influenciando a forma como se expressa no lar.</p>`);
          break;
        }
        case 'espiritualidade': {
          const nep = getPlanet('Neptune');
          const nepTraits = SIGN_INFO[nep.sign].traits.slice(0, 2).join(' e ');
          html.push(`<h4>🧘 Espiritualidade</h4>`);
          html.push(`<p>Netuno em <strong>${nep.sign}</strong> (${nep.signDegree.toFixed(1)}°) aponta para uma conexão espiritual ${nepTraits}. Netuno rege sonhos e intuições; seu signo indica por onde você se perde e se encontra no mistério da vida.</p>`);
          html.push(`<p>O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) orienta a forma como você manifesta sua busca interior no cotidiano, trazendo sua espiritualidade para a prática.</p>`);
          break;
        }
        case 'missao': {
          const sun = getPlanet('Sun');
          const sunTraits = SIGN_INFO[sun.sign].traits.slice(0, 2).join(' e ');
          html.push(`<h4>🚀 Missão de Vida</h4>`);
          html.push(`<p>O Sol em <strong>${sun.sign}</strong> (${sun.signDegree.toFixed(1)}°) revela uma essência marcada por ${sunTraits}. O Sol representa nosso núcleo e propósito; o seu signo indica onde você brilha e inspira.</p>`);
          html.push(`<p>O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) colore a expressão dessa missão, mostrando como você se coloca no mundo e direciona sua energia.</p>`);
          break;
        }
        case 'desafios': {
          const plut = getPlanet('Pluto');
          const mars = getPlanet('Mars');
          const plutTraits = SIGN_INFO[plut.sign].traits.slice(0, 2).join(' e ');
          const marsTraits2 = SIGN_INFO[mars.sign].traits.slice(0, 2).join(' e ');
          html.push(`<h4>⚖️ Desafios Pessoais</h4>`);
          html.push(`<p>Plutão em <strong>${plut.sign}</strong> (${plut.signDegree.toFixed(1)}°) fala de processos de ${plutTraits}. Este planeta mostra onde precisamos nos transformar profundamente.</p>`);
          html.push(`<p>Marte em <strong>${mars.sign}</strong> (${mars.signDegree.toFixed(1)}°) apresenta desafios ligados à ${marsTraits2}. Reconhecer a natureza de Marte ajuda a lidar melhor com impulsos e conflitos.</p>`);
          html.push(`<p>Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) ajuda a integrar essas forças, apontando caminhos de crescimento.</p>`);
          break;
        }
        default: {
          html.push('<p>⚠️ Tema não reconhecido.</p>');
        }
      }
      return html.join('');
    }

    const interpretation = interpretTheme(tema, dadosGerados);
    reportEl.innerHTML = interpretation;
    localStorage.setItem(cacheKey, interpretation);

    btn.textContent = '✔️ Interpretado';
    btn.disabled = true;
  });

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
        body: JSON.stringify({ text: texto, astro: dadosGerados })
      });
      if (res.ok) {
        const json = await res.json();
        perspectiveResult.innerHTML = `<article class="report-html">${json.html}</article>`;
      } else {
        // fallback to local interpretation if serverless function fails
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

  // Fallback client‑side interpretation if the serverless function is
  // unavailable. Uses SIGN_INFO defined in this scope.
  function interpretPerspectiveLocal(text, data) {
    const sun = data?.planets?.find(p => p.name === 'Sun');
    const asc = data?.ascendant;
    let msg = '<p><strong>Obrigado por compartilhar sua perspectiva.</strong></p>';
    if (sun && asc) {
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
