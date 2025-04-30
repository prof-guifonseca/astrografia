const { marked } = require('marked');

/**
 * Converte texto Markdown para HTML formatado e seguro
 * @param {string} markdownText
 * @returns {string} html
 */
function convertMarkdownToHTML(markdownText = '') {
  if (typeof markdownText !== 'string') return '';
  
  // Configurações opcionais de segurança ou estilo futuro
  marked.setOptions({
    breaks: true,                // Quebra de linha com \n
    gfm: true,                   // GitHub Flavored Markdown
    mangle: false,               // Evita ofuscação de emails (opcional)
    headerIds: false             // Remove ids automáticos nos títulos
  });

  return marked.parse(markdownText.trim());
}

module.exports = { convertMarkdownToHTML };