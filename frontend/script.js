// Astrografia 🌌 — Versão Alinhada com Backend Flask
(() => {
  'use strict';

  const API = {
    generate: 'https://astrografia.onrender.com/api/astro/positions',
    interpretar: 'https://astrografia.onrender.com/api/interpretar',
    perspectiva: 'https://astrografia.onrender.com/api/perspectives'
  };

  const OPENCAGE_KEY = 'b639372a8f024a78b7ad0c15f4f5ea70';
  const $ = s => document.querySelector(s);

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

  const astroCache = localStorage.getItem('astroData');
  if (astroCache) {
    try {
      const parsed = JSON.parse(astroCache);
      if (parsed?.planets?.length && parsed?.ascendant) {
        dadosGerados = parsed;
        summaryEl.textContent = '⚡ Dados carregados do cache.';
        resultSection.classList.remove('hidden');
        exibirPlanetas(parsed.planets, parsed.ascendant);
        sectionGroup?.classList.remove('hidden');
        perspectiveSec?.classList.remove('hidden');
      }
    } catch (e) {
      console.warn('[Astrografia] Falha ao ler cache:', e);
    }
  }

  async function obterCoordenadas(local) {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(local)}&key=${OPENCAGE_KEY}&language=pt&limit=1`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      return json?.results?.[0]?.geometry || null;
    } catch (err) {
      console.error('[Astrografia] Erro ao obter coordenadas:', err);
      return null;
    }
  }

  async function obterPosicoesPlanetarias(userData) {
    try {
      const res = await fetch(API.generate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!res.ok) throw new Error('Erro na requisição');
      return await res.json();
    } catch (err) {
      console.error('[Astrografia] Erro ao obter posições:', err);
      return { planets: [], ascendant: null };
    }
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
      alert('Por favor, preencha todos os campos.');
      return;
    }

    const btn = $('#generateMap');
    btn.disabled = true;
    btn.textContent = '⌛ Gerando...';
    summaryEl.textContent = 'Calculando posições com alta precisão...';
    chartEl.innerHTML = '';
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');

    const coordenadas = await obterCoordenadas(birthPlace);
    if (!coordenadas) {
      alert('Não foi possível localizar o local de nascimento.');
      btn.disabled = false;
      btn.textContent = 'Gerar Mapa Astral';
      return;
    }

    const response = await obterPosicoesPlanetarias({
      name, birthDate, birthTime, birthPlace,
      lat: coordenadas.lat,
      lon: coordenadas.lng,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    dadosGerados = response;
    localStorage.setItem('astroData', JSON.stringify(response));

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

    try {
      const res = await fetch(API.interpretar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tema,
          planetas: dadosGerados.planets,
          nome: nameEl.value.trim(),
          ascendente: dadosGerados.ascendant
        })
      });

      const json = await res.json();
      if (json?.html) {
        reportEl.innerHTML = json.html;
        localStorage.setItem(cacheKey, json.html);
      } else {
        reportEl.innerHTML = '<p>⚠️ Não foi possível gerar esta interpretação.</p>';
      }

    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      reportEl.innerHTML = '<p>⚠️ Erro ao se conectar com os astros. Tente novamente.</p>';
    }

    btn.textContent = '✔️ Interpretado';
    btn.disabled = true;
  });

  submitPerspectiveBtn?.addEventListener('click', async () => {
    const texto = perspectiveEl.value.trim();
    if (!texto) {
      alert('Por favor, escreva sua perspectiva pessoal.');
      return;
    }

    submitPerspectiveBtn.disabled = true;
    submitPerspectiveBtn.textContent = 'Enviando...';
    perspectiveResult.innerHTML = '';

    try {
      const res = await fetch(API.perspectiva, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texto })
      });

      const json = await res.json();
      if (json?.perspective?.response_md) {
        perspectiveResult.innerHTML = `<article class="report-html">${json.perspective.response_md}</article>`;
      } else {
        perspectiveResult.innerHTML = '<p>⚠️ Não foi possível interpretar sua perspectiva agora.</p>';
      }
    } catch (err) {
      console.error('Erro ao enviar perspectiva:', err);
      perspectiveResult.innerHTML = '<p>⚠️ Houve um erro ao processar sua mensagem.</p>';
    }

    submitPerspectiveBtn.disabled = false;
    submitPerspectiveBtn.textContent = 'Interpretar Minha Perspectiva';
  });

})();
