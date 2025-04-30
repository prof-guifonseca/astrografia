// Astrografia 🌌 — Núcleo Consolidado v2.2 (getPositions + cache + leitura setorizada + destaque ativo)
(() => {
  'use strict';

  const API = {
    generate: '/.netlify/functions/getPositions'
  };

  const $ = selector => document.querySelector(selector);

  const nameEl        = $('#name');
  const dateEl        = $('#birthDate');
  const timeEl        = $('#birthTime');
  const placeEl       = $('#birthPlace');
  const generateBtn   = $('#generateMap');
  const resultSection = $('#result-section');
  const summaryEl     = $('#summary');
  const chartEl       = $('#chart-container');
  const reportEl      = $('#report-container');

  let dadosGerados = null;

  // Carrega do localStorage, se existir
  const cache = localStorage.getItem('astroData');
  if (cache) {
    try {
      dadosGerados = JSON.parse(cache);
      if (dadosGerados?.planets?.length) {
        summaryEl.textContent = '⚡ Dados carregados do cache.';
        resultSection.classList.remove('hidden');
        exibirPlanetas(dadosGerados.planets);
        document.getElementById('premium-sections')?.classList.remove('hidden');
      }
    } catch (e) {
      console.warn('[Astrografia] Erro ao carregar cache:', e);
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

  function exibirPlanetas(planets = []) {
    if (!planets.length) {
      chartEl.innerHTML = '<p>⚠️ Nenhuma posição planetária encontrada.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.classList.add('report-html');
    planets.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `☉ ${p.name}: ${p.sign} ${p.signDegree}°`;
      ul.appendChild(li);
    });

    chartEl.innerHTML = '<h3 class="fade-in">🔭 Posições Planetárias</h3>';
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
    summaryEl.textContent = '⌛ Calculando posições dos planetas...';
    chartEl.innerHTML = '';
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');

    const response = await obterPosicoesPlanetarias({
      name, birthDate, birthTime, birthPlace
    });

    dadosGerados = response;
    localStorage.setItem('astroData', JSON.stringify(response));

    summaryEl.textContent = '✅ Posições planetárias calculadas.';
    exibirPlanetas(response.planets);
    document.getElementById('premium-sections')?.classList.remove('hidden');

    generateBtn.disabled = false;
    generateBtn.textContent = 'Gerar Mapa Astral';
  });

  // Interpretação temática
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-topic]');
    if (!btn || !dadosGerados) return;

    // Remove destaque anterior
    document.querySelectorAll('.btn-section').forEach(b => b.classList.remove('btn-section--active'));
    btn.classList.add('btn-section--active');

    const tema = btn.dataset.topic;
    btn.textContent = 'Gerando...';
    btn.disabled = true;

    try {
      const res = await fetch('/.netlify/functions/interpretSection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema, planetas: dadosGerados })
      });

      const json = await res.json();
      if (json.html) {
        reportEl.innerHTML = json.html;
        localStorage.setItem(`astroInterpretacao:${tema}`, json.html);
      }
    } catch (err) {
      console.error('Erro ao interpretar:', err);
      reportEl.innerHTML = '<p>⚠️ Erro ao gerar relatório.</p>';
    }

    btn.textContent = btn.dataset.label || 'Interpretado';
    btn.disabled = true;
  });
})();