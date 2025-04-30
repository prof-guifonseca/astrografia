// Astrografia 🌌 — Núcleo Consolidado v1.3 (2025-04-30)
(() => {
  'use strict';

  // ===== Configurações =====
  const API = {
    generate: '/api/generateMap' // usa redirect configurado no netlify.toml
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
  const reportEl      = $('#report-container');

  // ===== Função principal de requisição =====
  async function fetchAstroData(userData) {
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

      const { summary, chartSVG, pdfBase64, htmlReport } = await res.json();
      return { summary, chartSVG, pdfBase64, htmlReport };

    } catch (err) {
      console.error('[Astrografia] Erro ao gerar mapa astral:', err);
      return {
        summary: '⚠️ Não foi possível gerar o mapa astral agora.',
        chartSVG: '',
        pdfBase64: '',
        htmlReport: ''
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
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');
    downloadBtn.classList.add('hidden');

    const { summary, chartSVG, pdfBase64, htmlReport } = await fetchAstroData({
      name,
      birthDate,
      birthTime,
      birthPlace
    });

    summaryEl.textContent = summary || '⚠️ Relatório indisponível.';
    chartEl.innerHTML = chartSVG || '';
    reportEl.innerHTML = htmlReport || '<p>⚠️ Relatório indisponível.</p>';

    if (pdfBase64) {
      downloadBtn.classList.remove('hidden');
      downloadBtn.onclick = () => {
        const blob = b64toBlob(pdfBase64, 'application/pdf');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-astrografia-${name}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      };
    }
  });

  // ===== Função auxiliar: converte base64 para Blob =====
  function b64toBlob(base64, mime = '') {
    const byteChars = atob(base64);
    const byteArrays = [];
    for (let i = 0; i < byteChars.length; i += 512) {
      const slice = byteChars.slice(i, i + 512);
      const byteNumbers = new Array(slice.length).fill().map((_, j) => slice.charCodeAt(j));
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: mime });
  }

})();
