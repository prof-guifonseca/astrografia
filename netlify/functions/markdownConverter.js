const { marked } = require('marked');

// Configurações globais do parser Markdown
marked.setOptions({
  breaks: true,          // Converte quebras de linha (\n) em <br>
  gfm: true,             // Habilita o modo GitHub Flavored Markdown
  mangle: false,         // Evita ofuscação automática de emails
  headerIds: false       // Remove ids automáticos em títulos
});

/**
 * Converte texto em Markdown para HTML seguro e formatado
 * @param {string} markdownText - Texto em formato Markdown
 * @returns {string} HTML convertido
 */
function convertMarkdownToHTML(markdownText = '') {
  if (typeof markdownText !== 'string') return '';
  return marked.parse(markdownText.trim());
}

module.exports = { convertMarkdownToHTML };
