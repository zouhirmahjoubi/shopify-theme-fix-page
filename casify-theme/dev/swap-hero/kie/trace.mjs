// Dev only: trace the flat ornament tiles (from trace.py) into SVG with imagetracerjs.
//   node trace.mjs <tiles_dir> <assets_dir>
// The palette is the Casify theme tokens, so every traced fill is exactly a token colour;
// transparent pixels (the keyed-out white) stay empty.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ImageTracer = require('imagetracerjs');
const { PNG } = require('pngjs');

const [tilesDir, assetsDir] = process.argv.slice(2);
const hex = (h) => ({ r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 255 });
const pal = [{ r: 0, g: 0, b: 0, a: 0 }, ...['C4302B', 'A8231F', 'FDF9F1', '4E7C7B', '6C9E9C', 'D2B57C', 'B08F52', '33231A'].map(hex)];
const options = { pal, colorsampling: 0, numberofcolors: pal.length, colorquantcycles: 1, ltres: 1, qtres: 1, pathomit: 24, roundcoords: 1, strokewidth: 0, linefilter: true, blurradius: 0, viewbox: true, desc: false };

for (let i = 1; i <= 3; i++) {
  const png = PNG.sync.read(readFileSync(`${tilesDir}/tile-${i}.png`));
  const imgd = { width: png.width, height: png.height, data: png.data };
  let svg = ImageTracer.imagedataToSVG(imgd, options);
  svg = svg
    .replace(/<path[^>]*opacity="0"[^>]*\/>/g, '')
    .replace(/ stroke="[^"]*"| stroke-width="[^"]*"/g, '')
    .replace(/fill="rgb\((\d+),(\d+),(\d+)\)"/g, (m, r, g, b) => 'fill="#' + [r, g, b].map((n) => (+n).toString(16).padStart(2, '0')).join('').toUpperCase() + '"')
    .replace(/ opacity="1"/g, '')
    .replace(/<svg [^>]*viewBox="([^"]+)"[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="$1">')
    .replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  const out = `${assetsDir}/cv-swap-ornament-${i}.svg`;
  writeFileSync(out, svg);
  const fills = [...new Set(svg.match(/fill="#[0-9A-F]{6}"/g) || [])].join(' ');
  console.log(`${out}  ${svg.length} bytes  ${(svg.match(/<path/g) || []).length} paths  ${fills}`);
}
