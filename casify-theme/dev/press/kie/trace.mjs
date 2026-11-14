// Dev only: trace the flat tiles (from trace.py) into SVG with imagetracerjs.
//   node trace.mjs <tiles_dir> <assets_dir>
// The palette is the Casify theme tokens, so every traced fill is exactly a token colour;
// transparent pixels stay empty. Uses the packages installed in dev/swap-hero/kie.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../swap-hero/kie/package.json', import.meta.url));
const ImageTracer = require('imagetracerjs');
const { PNG } = require('pngjs');

const [tilesDir, assetsDir] = process.argv.slice(2);
const hex = (h) => ({ r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 255 });
const pal = [{ r: 0, g: 0, b: 0, a: 0 }, ...['C4302B', 'FDF9F1', '4E7C7B', '33605F', 'D2B57C', '33231A'].map(hex)];
const options = { pal, colorsampling: 0, numberofcolors: pal.length, colorquantcycles: 1, ltres: 1.5, qtres: 1.5, pathomit: 30, roundcoords: 0, strokewidth: 0, linefilter: true, blurradius: 0, viewbox: true, desc: false };

for (const file of readdirSync(tilesDir).filter((f) => f.endsWith('.png'))) {
  const name = file.slice(0, -4);
  const png = PNG.sync.read(readFileSync(`${tilesDir}/${file}`));
  const imgd = { width: png.width, height: png.height, data: png.data };
  let svg = ImageTracer.imagedataToSVG(imgd, options);
  svg = svg
    .replace(/<path[^>]*opacity="0"[^>]*\/>/g, '')
    .replace(/ stroke="[^"]*"| stroke-width="[^"]*"/g, '')
    .replace(/fill="rgb\((\d+),(\d+),(\d+)\)"/g, (m, r, g, b) => 'fill="#' + [r, g, b].map((n) => (+n).toString(16).padStart(2, '0')).join('').toUpperCase() + '"')
    .replace(/ opacity="1"/g, '')
    .replace(/<svg [^>]*viewBox="([^"]+)"[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="$1">')
    .replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  const out = `${assetsDir}/cv-press-${name}.svg`;
  writeFileSync(out, svg);
  const fills = [...new Set(svg.match(/fill="#[0-9A-F]{6}"/g) || [])].join(' ');
  console.log(`${out}  ${svg.length} bytes  ${(svg.match(/<path/g) || []).length} paths  ${fills}`);
}
