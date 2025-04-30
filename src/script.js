// Astrografia 🌌 — Núcleo Consolidado v1.6 (HTML direto)
(() => {
  'use strict';

  const API = {
    generate: '/.netlify/functions/generateMap'
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

  // Chamada ao backend que retorna o HTML interpretado
  async function gerarRelatorioHTML(userData) {
    try {
      const res = await fetch(API.generate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Astrografia] Erro HTTP:', res.status, errorText);
        throw new Error('Erro ao gerar relatório');
      }

      const { summary, htmlReport } = await res.json();
      return { summary, htmlReport };

    } catch (err) {
      console.error('[Astrografia] Falha na geração do relatório:', err);
      return {
        summary: '⚠️ Não foi possível gerar o mapa astral agora.',
        htmlReport: ''
      };
    }
  }

  // Evento: clique no botão Gerar Mapa
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
    generateBtn.textContent = 'Gerando...';

    summaryEl.textContent = '⌛ Processando seu mapa astral...';
    chartEl.innerHTML = '';
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');

    const { summary, htmlReport } = await gerarRelatorioHTML({
      name,
      birthDate,
      birthTime,
      birthPlace
    });

    summaryEl.textContent = summary;
    reportEl.innerHTML = htmlReport || '<p>⚠️ Relatório indisponível.</p>';

    generateBtn.disabled = false;
    generateBtn.textContent = 'Gerar Mapa Astral';
  });

})();
