import { QUOTES } from './utils.js';

export function initQuotes() {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const el = document.getElementById('quoteText');
  if (el) el.textContent = `\u201C${quote}\u201D`;
}
