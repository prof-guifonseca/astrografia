// Astrografia 🌌 — Núcleo Consolidado v3.4 (Swiss + GPT + OpenCage)
(() => {
  'use strict';

  const API = {
    generate: 'https://astrografia.onrender.com/positions',
    interpretar: '/.netlify/functions/interpretSection'
  };

  const OPENCAGE_KEY = 'b639372a8f024a78b7ad0c15f4f5ea70';

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

  // 🔄 Recupera cache local
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

  // 📍 Coordenadas do local via OpenCage
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

  // 🚀 Requisição principal ao backend Flask
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

  // 🌌 Renderização visual do mapa
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

  // 🧾 Envio do formulário
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name       = nameEl.value.trim();
    const birthDate  = dateEl.value; // YYYY-MM-DD (garantido pelo input[type=date])
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

    const coordenadas = await obterCoordenadas(birthPlace);
    if (!coordenadas) {
      alert('Não foi possível localizar o local de nascimento.');
      btn.disabled = false;
      btn.textContent = 'Obter Mapa Astral';
      return;
    }

    const response = await obterPosicoesPlanetarias({
      name, birthDate, birthTime, birthPlace,
      lat: coordenadas.lat,
      lng: coordenadas.lng
    });

    dadosGerados = response;
    localStorage.setItem('astroData', JSON.stringify(response));

    summaryEl.textContent = '✅ Mapa gerado com sucesso!';
    exibirPlanetas(response.planets, response.ascendant);
    sectionGroup?.classList.remove('hidden');

    btn.disabled = false;
    btn.textContent = 'Obter Mapa Astral';
  });

  // 📖 Botões de relatórios temáticos
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
