import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const template = readFileSync(new URL('./template.html', import.meta.url), 'utf8');
const products = JSON.parse(readFileSync(new URL('./products.json', import.meta.url), 'utf8'));

mkdirSync(new URL('./out/', import.meta.url), { recursive: true });

for (const p of products) {
  const html = template
    .replace('{{IMG}}', '../' + p.img)
    .replace('{{TITLE}}', escapeHtml(p.title))
    .replace('{{PRICE}}', escapeHtml(p.price));
  const outPath = new URL(`./out/${p.handle}.html`, import.meta.url);
  writeFileSync(outPath, html, 'utf8');
  console.log('wrote', p.handle);
}
