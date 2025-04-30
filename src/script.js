// Astrografia 🌌 — Núcleo Consolidado v1.5 (Assíncrono)
(() => {
  'use strict';

  const API = {
    generate: '/.netlify/functions/iniciarGeracaoMapa'
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
  const downloadBtn   = $('#downloadPDF');
  const reportEl      = $('#report-container');

  // Envia dados e inicia processo assíncrono
  async function iniciarGeracaoAssincrona(userData) {
    try {
      const res = await fetch(API.generate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Astrografia] Erro HTTP:', res.status, errorText);
        throw new Error('Erro ao iniciar geração');
      }

      const { mensagem } = await res.json();
      return mensagem || 'Mapa astral em processamento.';

    } catch (err) {
      console.error('[Astrografia] Falha ao iniciar mapa astral:', err);
      return '⚠️ Não foi possível iniciar a geração do mapa astral.';
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

    summaryEl.textContent = '⌛ Enviando seus dados para o universo...';
    chartEl.innerHTML = '';
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');
    downloadBtn.classList.add('hidden');

    const mensagem = await iniciarGeracaoAssincrona({
      nome: name,
      dataNascimento: birthDate,
      horaNascimento: birthTime,
      localNascimento: birthPlace
    });

    summaryEl.textContent = mensagem;

    generateBtn.disabled = false;
    generateBtn.textContent = 'Gerar Mapa Astral';
  });

})();
