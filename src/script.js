// Astrografia 🌌 — Núcleo Consolidado v1.8 (HTML direto com GPT-4o)
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

  // Requisição ao backend que retorna HTML interpretado
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
        throw new Error('Erro na requisição');
      }

      const { summary, htmlReport } = await res.json();
      return { summary, htmlReport };

    } catch (err) {
      console.error('[Astrografia] Erro ao gerar relatório:', err);
      return {
        summary: '⚠️ Houve uma falha na geração do mapa astral. Tente novamente mais tarde.',
        htmlReport: ''
      };
    }
  }

  // Evento: clique no botão "Gerar Mapa Astral"
  generateBtn.addEventListener('click', async () => {
    const name = nameEl.value.trim();
    const birthDate = dateEl.value;
    const birthTime = timeEl.value;
    const birthPlace = placeEl.value.trim();

    if (!name || !birthDate || !birthTime || !birthPlace) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    // Estado de carregamento
    generateBtn.disabled = true;
    generateBtn.textContent = 'Gerando...';
    summaryEl.textContent = '✨ Conectando com as constelações...';
    chartEl.innerHTML = '';
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');

    // Gera o relatório
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
