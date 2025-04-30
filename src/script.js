// Astrografia 🌌 — Núcleo Consolidado v1.1 (2025-04-30)
(() => {
  'use strict';

  // ===== Configurações =====
  const API = {
    generate: '/.netlify/functions/generateMap'
  };

  // ===== Utilitários DOM =====
  const $ = selector => document.querySelector(selector);

  // ===== Elementos =====
  const nameEl        = $('#name');
  const dateEl        = $('#birthDate');
  const timeEl        = $('#birthTime');
  const placeEl       = $('#birthPlace');
  const generateBtn   = $('#generateMap');
  const resultSection = $('#result-section');
  const summaryEl     = $('#summary');
  const chartEl       = $('#chart-container');
  const downloadBtn   = $('#downloadPDF');

  // ===== Função principal de requisição =====
  async function fetchAstroData(userData) {
    try {
      const res = await fetch(API.generate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!res.ok) throw new Error();
      const { summary, chartSVG, pdfBase64 } = await res.json();

      return { summary, chartSVG, pdfBase64 };
    } catch (err) {
      console.error('[Astrografia] Erro ao gerar mapa astral:', err);
      return {
        summary: '⚠️ Não foi possível gerar o mapa astral agora.',
        chartSVG: '',
        pdfBase64: ''
      };
    }
  }

  // ===== Evento: clique no botão Gerar Mapa =====
  generateBtn.addEventListener('click', async () => {
    const name = nameEl.value.trim();
    const birthDate = dateEl.value;
    const birthTime = timeEl.value;
    const birthPlace = placeEl.value.trim();

    if (!name || !birthDate || !birthTime || !birthPlace) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    summaryEl.textContent = '⌛ Gerando seu mapa astral...';
    chartEl.innerHTML = '';
    resultSection.classList.remove('hidden');
    downloadBtn.classList.add('hidden');

    const { summary, chartSVG, pdfBase64 } = await fetchAstroData({
      name,
      birthDate,
      birthTime,
      birthPlace
    });

    summaryEl.textContent = summary || '⚠️ Relatório indisponível.';
    chartEl.innerHTML = chartSVG || '';

    if (pdfBase64) {
      downloadBtn.classList.remove('hidden');
      downloadBtn.onclick = () => {
        const link = document.createElement('a');
        link.href = 'data:application/pdf;base64,' + pdfBase64;
        link.download = `relatorio-astrografia-${name}.pdf`;
        link.click();
      };
    }
  });

})();
