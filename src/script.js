// Astrografia 🌌 — Núcleo Consolidado v2.3.1 (com Ascendente)
(() => {
  'use strict';

  const API = {
    generate: '/.netlify/functions/getPositions',
    interpretar: '/.netlify/functions/interpretSection'
  };

  const $ = s => document.querySelector(s);

  const nameEl        = $('#name');
  const dateEl        = $('#birthDate');
  const timeEl        = $('#birthTime');
  const placeEl       = $('#birthPlace');
  const generateBtn   = $('#generateMap');
  const resultSection = $('#result-section');
  const summaryEl     = $('#summary');
  const chartEl       = $('#chart-container');
  const reportEl      = $('#report-container');
  const temasSecao    = $('#premium-sections');

  let dadosGerados = null;

  // Tenta recuperar do cache
  const cache = localStorage.getItem('astroData');
  if (cache) {
    try {
      dadosGerados = JSON.parse(cache);
      if (dadosGerados?.planets?.length) {
        summaryEl.textContent = '⚡ Dados carregados do cache.';
        resultSection.classList.remove('hidden');
        temasSecao?.classList.remove('hidden');
        exibirPlanetas(dadosGerados.planets, dadosGerados.ascendant);
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
      return { planets: [] };
    }
  }

  function exibirPlanetas(planets = [], ascendant = null) {
    if (!planets.length) {
      chartEl.innerHTML = '<p>⚠️ Nenhuma posição planetária encontrada.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.classList.add('report-html');

    // Ascendente
    if (ascendant) {
      const ascLi = document.createElement('li');
      ascLi.innerHTML = `🌅 Ascendente: <strong>${ascendant.sign}</strong> ${ascendant.degree}°`;
      ul.appendChild(ascLi);
    }

    // Planetas
    planets.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.icon || '🔹'} ${p.name}: ${p.sign} ${p.signDegree}°`;
      ul.appendChild(li);
    });

    chartEl.innerHTML = '<h3 class="fade-in">🔭 Mapa Astral</h3>';
    chartEl.appendChild(ul);
  }

  generateBtn.addEventListener('click', async () => {
    const name = nameEl.value.trim();
    const birthDate = dateEl.value;
    const birthTime = timeEl.value;
    const birthPlace = placeEl.value.trim();

    if (!name || !birthDate || !birthTime || !birthPlace) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Calculando...';
    summaryEl.textContent = '⌛ Calculando posições planetárias...';
    chartEl.innerHTML = '';
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');

    const response = await obterPosicoesPlanetarias({
      name, birthDate, birthTime, birthPlace
    });

    dadosGerados = response;
    localStorage.setItem('astroData', JSON.stringify(response));

    summaryEl.textContent = '✅ Posições planetárias calculadas.';
    exibirPlanetas(response.planets, response.ascendant);
    temasSecao?.classList.remove('hidden');

    generateBtn.disabled = false;
    generateBtn.textContent = 'Gerar Mapa Astral';
  });

  // Interpretação por seção
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-topic]');
    if (!btn || !dadosGerados) return;

    const tema = btn.dataset.topic;
    const cacheKey = `astroInterpretacao:${tema}`;

    // Remove classe ativa de todos
    document.querySelectorAll('.btn-section').forEach(b => b.classList.remove('btn-section--active'));
    btn.classList.add('btn-section--active');

    // Oculta qualquer interpretação anterior
    reportEl.innerHTML = '';

    // Verifica cache primeiro
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
          name: nameEl.value.trim(),
          ascendant: dadosGerados.ascendant // já disponível
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

    btn.textContent = btn.dataset.label || '✔️ Interpretado';
    btn.disabled = true;
  });
})();
