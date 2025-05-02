// Astrografia 🌌 — Núcleo Consolidado v3.3 (Swiss + GPT)
(() => {
  'use strict';

  const API = {
    generate: 'https://astrografia.onrender.com/positions',
    interpretar: '/.netlify/functions/interpretSection'
  };

  const $ = s => document.querySelector(s);

  const formEl        = $('#astro-form');
  const nameEl        = $('#name');
  const dateEl        = $('#birthDate');
  const timeEl        = $('#birthTime');
  const placeEl       = $('#birthPlace');
  const resultSection = $('#result-section');
  const summaryEl     = $('#summary');
  const chartEl       = $('#chart-container');
  const reportEl      = $('#report-container');
  const sectionBtns   = document.querySelectorAll('.btn-section');
  const sectionGroup  = $('#section-buttons');

  let dadosGerados = null;

  // 🔄 Recupera cache salvo
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
      }
    } catch (e) {
      console.warn('[Astrografia] Falha ao ler cache:', e);
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

    const name       = nameEl.value.trim();
    const birthDate  = dateEl.value;
    const birthTime  = timeEl.value;
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

    const response = await obterPosicoesPlanetarias({ name, birthDate, birthTime, birthPlace });

    dadosGerados = response;
    localStorage.setItem('astroData', JSON.stringify(response));

    summaryEl.textContent = '✅ Mapa gerado com sucesso!';
    exibirPlanetas(response.planets, response.ascendant);
    sectionGroup?.classList.remove('hidden');

    btn.disabled = false;
    btn.textContent = 'Obter Mapa Astral';
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
          ascendant: dadosGerados.ascendant
        })
      });

      const json = await res.json();
      if (json.html) {
        reportEl.innerHTML = json.html;
        localStorage.setItem(cacheKey, json.html);
      } else {
        reportEl.innerHTML = '<p>⚠️ Erro ao gerar relatório.</p>';
      }

    } catch (err) {
      console.error('Erro ao interpretar:', err);
      reportEl.innerHTML = '<p>⚠️ Erro ao se comunicar com o servidor.</p>';
    }

    btn.textContent = '✔️ Interpretado';
    btn.disabled = true;
  });

})();
