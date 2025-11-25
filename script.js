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

  // Mapeamento dos signos para seus elementos clássicos. Isso nos permite
  // criar interpretações mais ricas ao considerar a compatibilidade entre
  // os planetas em diferentes signos (Fogo, Terra, Ar ou Água). Por
  // exemplo, planetas em signos do mesmo elemento tendem a atuar de forma
  // harmoniosa, enquanto elementos distintos trazem dinamismo e
  // complementaridade.
  const SIGN_ELEMENTS = {
    'Áries': 'Fogo', 'Leão': 'Fogo', 'Sagitário': 'Fogo',
    'Touro': 'Terra', 'Virgem': 'Terra', 'Capricórnio': 'Terra',
    'Gêmeos': 'Ar', 'Libra': 'Ar', 'Aquário': 'Ar',
    'Câncer': 'Água', 'Escorpião': 'Água', 'Peixes': 'Água'
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

  // O aplicativo não utiliza mais cache local. A cada visita os dados
  // astrológicos são calculados ou requisitados novamente. Isso garante
  // que nenhuma informação pessoal fique armazenada no navegador do
  // usuário. Portanto não há necessidade de restaurar dados de
  // localStorage ou gerenciar expiração de cache.

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
    // Incluímos fuso horário (timezone) se fornecido pela Netlify function de coordenadas.
    const params = {
      date: birthDate,
      time: birthTime,
      lat: coords?.lat,
      lon: coords?.lng,
      timezone: coords?.timezone
    };
    const response = await obterPosicoesPlanetarias(params);
    dadosGerados = response;
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
    sectionBtns.forEach(b => b.classList.remove('btn-section--active'));
    btn.classList.add('btn-section--active');
    reportEl.innerHTML = '';

    btn.textContent = 'Gerando...';
    btn.disabled = true;

    // Função local para interpretar cada tema com base nos arquétipos e
    // elementos dos signos.  Utilizamos quatro características por
    // planeta (quando disponíveis) e consideramos se os elementos dos
    // planetas envolvidos são iguais ou diferentes para oferecer
    // interpretações mais profundas e nuances adicionais.
    function interpretTheme(themeKey, data) {
      const planets = data?.planets || [];
      const asc = data?.ascendant;
      const getPlanet = (name) => planets.find(p => p.name === name);
      const html = [];
      // Utilitário para obter lista de traços completos de um signo
      function traitsOf(sign, count = 4) {
        const traits = SIGN_INFO[sign]?.traits || [];
        return traits.slice(0, count).join(', ');
      }
      // Utilitário para frase de sinergia entre dois elementos
      function synergyPhrase(el1, el2) {
        if (!el1 || !el2) return '';
        if (el1 === el2) {
          return `Como ambos pertencem ao elemento <strong>${el1}</strong>, suas energias tendem a atuar de forma harmoniosa e natural.`;
        }
        return `A combinação de elementos distintos (<strong>${el1}</strong> e <strong>${el2}</strong>) traz dinamismo e complementaridade, oferecendo oportunidades de aprendizado e equilíbrio.`;
      }
      switch (themeKey) {
        case 'amor': {
          const venus = getPlanet('Venus');
          const mars = getPlanet('Mars');
          if (!venus || !mars || !asc) break;
          const venTraits = traitsOf(venus.sign);
          const marsTraits = traitsOf(mars.sign);
          const venElement = SIGN_ELEMENTS[venus.sign];
          const marsElement = SIGN_ELEMENTS[mars.sign];
          html.push(`<h4>❤️ Amor e Relacionamentos</h4>`);
          html.push(`<p>Com Vênus em <strong>${venus.sign}</strong> (${venus.signDegree.toFixed(1)}°), você expressa o afeto de maneira ${venTraits}. Vênus governa a forma como amamos, buscamos harmonia e apreciamos a beleza; este posicionamento revela como você se conecta emocionalmente e valoriza os vínculos afetivos.</p>`);
          html.push(`<p>Marte em <strong>${mars.sign}</strong> (${mars.signDegree.toFixed(1)}°) acrescenta uma energia ${marsTraits} aos seus desejos e iniciativas. Marte mostra como perseguimos o que queremos, inclusive nos relacionamentos, e como lidamos com a paixão e a assertividade.</p>`);
          html.push(`<p>${synergyPhrase(venElement, marsElement)} Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) colore a maneira como você se apresenta e influencia as dinâmicas afetivas, determinando como você reage aos estímulos românticos e às expectativas nas relações.</p>`);
          break;
        }
        case 'carreira': {
          const jup = getPlanet('Jupiter');
          const sat = getPlanet('Saturn');
          if (!jup || !sat || !asc) break;
          const jupTraits = traitsOf(jup.sign);
          const satTraits = traitsOf(sat.sign);
          const jupElement = SIGN_ELEMENTS[jup.sign];
          const satElement = SIGN_ELEMENTS[sat.sign];
          html.push(`<h4>💼 Carreira e Propósito</h4>`);
          html.push(`<p>Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) sugere que suas oportunidades profissionais florescem quando você aposta em ${jupTraits}. Júpiter é o planeta da expansão e do crescimento; seu signo revela onde você busca prosperar, buscar conhecimento e se aventurar.</p>`);
          html.push(`<p>Saturno em <strong>${sat.sign}</strong> (${sat.signDegree.toFixed(1)}°) traz uma disciplina ${satTraits} às suas ambições. Saturno indica onde precisamos trabalhar com persistência e responsabilidade para conquistar resultados duradouros, estruturando sua visão de carreira.</p>`);
          html.push(`<p>${synergyPhrase(jupElement, satElement)} O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) mostra a postura que você adota ao perseguir suas metas e como é percebido no ambiente profissional, influenciando sua autoridade e liderança.</p>`);
          break;
        }
        case 'familia': {
          const moon = getPlanet('Moon');
          const sun = getPlanet('Sun');
          if (!moon || !asc) break;
          const moonTraits = traitsOf(moon.sign);
          const sunTraits = sun ? traitsOf(sun.sign) : '';
          const moonElement = SIGN_ELEMENTS[moon.sign];
          const sunElement = sun ? SIGN_ELEMENTS[sun.sign] : null;
          html.push(`<h4>🏠 Família e Origens</h4>`);
          html.push(`<p>A Lua em <strong>${moon.sign}</strong> (${moon.signDegree.toFixed(1)}°) reflete uma natureza emocional ${moonTraits}. Ela revela como você nutre, procura segurança e se conecta com suas raízes; seu signo aponta para o tipo de vínculo familiar que lhe conforta e alimenta.</p>`);
          if (sun) {
            html.push(`<p>O Sol em <strong>${sun.sign}</strong> (${sun.signDegree.toFixed(1)}°) contribui com uma essência ${sunTraits} às suas relações familiares, mostrando como sua identidade e vitalidade se manifestam dentro do lar e com aqueles que ama.</p>`);
          }
          html.push(`<p>${synergyPhrase(moonElement, sunElement || moonElement)} Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) mostra como você acolhe e protege aqueles ao seu redor, influenciando a forma como se expressa no lar e construindo um senso de pertencimento.</p>`);
          break;
        }
        case 'espiritualidade': {
          const nep = getPlanet('Neptune');
          const jup = getPlanet('Jupiter');
          if (!nep || !asc) break;
          const nepTraits = traitsOf(nep.sign);
          const jupTraits = jup ? traitsOf(jup.sign) : '';
          const nepElement = SIGN_ELEMENTS[nep.sign];
          const jupElement = jup ? SIGN_ELEMENTS[jup.sign] : null;
          html.push(`<h4>🧘 Espiritualidade</h4>`);
          html.push(`<p>Netuno em <strong>${nep.sign}</strong> (${nep.signDegree.toFixed(1)}°) aponta para uma conexão espiritual ${nepTraits}. Netuno rege sonhos, intuições e as águas profundas do inconsciente; seu signo indica por onde você se perde e se encontra no mistério da vida.</p>`);
          if (jup) {
            html.push(`<p>Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) complementa sua jornada espiritual com uma energia ${jupTraits}, incentivando a busca por sabedoria e sentido através de práticas filosóficas e experiências transcendentes.</p>`);
          }
          html.push(`<p>${synergyPhrase(nepElement, jupElement || nepElement)} O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) orienta a forma como você manifesta sua busca interior no cotidiano, trazendo sua espiritualidade para a prática e inspirando outras pessoas.</p>`);
          break;
        }
        case 'missao': {
          const sun = getPlanet('Sun');
          const jup = getPlanet('Jupiter');
          if (!sun || !asc) break;
          const sunTraits = traitsOf(sun.sign);
          const jupTraits = jup ? traitsOf(jup.sign) : '';
          const sunElement = SIGN_ELEMENTS[sun.sign];
          const jupElement = jup ? SIGN_ELEMENTS[jup.sign] : null;
          html.push(`<h4>🚀 Missão de Vida</h4>`);
          html.push(`<p>O Sol em <strong>${sun.sign}</strong> (${sun.signDegree.toFixed(1)}°) revela uma essência marcada por ${sunTraits}. O Sol representa nosso núcleo, vitalidade e propósito; seu signo indica onde você brilha e inspira, revelando a natureza da sua missão.</p>`);
          if (jup) {
            html.push(`<p>Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) reforça seu propósito ao acrescentar uma visão ${jupTraits}, ampliando seus horizontes e incentivando você a crescer através do conhecimento e da aventura.</p>`);
          }
          html.push(`<p>${synergyPhrase(sunElement, jupElement || sunElement)} O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) colore a expressão dessa missão, mostrando como você se coloca no mundo e direciona sua energia para realizar o que deseja.</p>`);
          break;
        }
        case 'desafios': {
          const plut = getPlanet('Pluto');
          const mars = getPlanet('Mars');
          const sat = getPlanet('Saturn');
          if (!plut || !mars || !asc) break;
          const plutTraits = traitsOf(plut.sign);
          const marsTraits = traitsOf(mars.sign);
          const satTraits = sat ? traitsOf(sat.sign) : '';
          const plutElement = SIGN_ELEMENTS[plut.sign];
          const marsElement = SIGN_ELEMENTS[mars.sign];
          const satElement = sat ? SIGN_ELEMENTS[sat.sign] : null;
          html.push(`<h4>⚖️ Desafios Pessoais</h4>`);
          html.push(`<p>Plutão em <strong>${plut.sign}</strong> (${plut.signDegree.toFixed(1)}°) fala de processos de ${plutTraits}. Este planeta mostra onde precisamos nos transformar profundamente, lidar com perdas e renascimentos, e trabalhar com a sombra interior.</p>`);
          html.push(`<p>Marte em <strong>${mars.sign}</strong> (${mars.signDegree.toFixed(1)}°) apresenta desafios ligados à ${marsTraits}. Reconhecer a natureza de Marte ajuda a lidar melhor com impulsos, assertividade e confrontos, transformando a agressividade em coragem consciente.</p>`);
          if (sat) {
            html.push(`<p>Saturno em <strong>${sat.sign}</strong> (${sat.signDegree.toFixed(1)}°) adiciona uma camada de ${satTraits} aos seus obstáculos, indicando onde a vida pode exigir disciplina, paciência e estrutura para superar limitações.</p>`);
          }
          html.push(`<p>${synergyPhrase(plutElement, marsElement)} Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) ajuda a integrar essas forças, apontando caminhos de crescimento e autoconhecimento ao enfrentar provações.</p>`);
          break;
        }
        default: {
          // Caso nenhum dos temas seja reconhecido, exibimos um aviso.
          html.push('<p>⚠️ Tema não reconhecido.</p>');
          break;
        }
      }
      return html.join('');
    }

    const interpretation = interpretTheme(tema, dadosGerados);
    reportEl.innerHTML = interpretation;

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
