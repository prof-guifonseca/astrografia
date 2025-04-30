const { marked } = require('marked');

// Define as opções uma única vez fora da função
marked.setOptions({
  breaks: true,          // Quebra de linha com \n
  gfm: true,             // GitHub Flavored Markdown
  mangle: false,         // Evita ofuscação de emails
  headerIds: false       // Não adiciona ids em headings
});

/**
 * Converte texto Markdown para HTML formatado
 * @param {string} markdownText
 * @returns {string} html
 */
function convertMarkdownToHTML(markdownText = '') {
  if (typeof markdownText !== 'string') return '';
  return marked.parse(markdownText.trim());
}

module.exports = { convertMarkdownToHTML };
