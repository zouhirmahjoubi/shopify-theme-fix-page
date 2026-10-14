// Builds casify-theme/assets/cv-phone-scan-type.js: Playfair Display glyph
// outlines (800 roman, 700 italic) for the 3D headline in cv-phone-scan.js.
// Dev only, not part of the theme. In an empty folder:
//   npm install opentype.js@1 @fontsource/playfair-display@5
//   node build-type.js <path to>/assets/cv-phone-scan-type.js
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const OUT = process.argv[2];
const files = {
  r: 'node_modules/@fontsource/playfair-display/files/playfair-display-latin-800-normal.woff',
  i: 'node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff'
};

const chars = [];
for (let c = 0x21; c <= 0x7e; c++) chars.push(String.fromCharCode(c));
chars.push('é', 'º', '‘', '’', '“', '”', '–', '—', '…', '£', '€');

const r = (v) => Math.round(v);
const faces = {};
let upem = 0;
for (const [face, file] of Object.entries(files)) {
  const font = opentype.parse(fs.readFileSync(path.join(__dirname, file)).buffer.slice(0));
  upem = font.unitsPerEm;
  const glyphs = {};
  for (const ch of chars) {
    const g = font.charToGlyph(ch);
    if (!g || g.index === 0) continue;
    const parts = [];
    let px = null;
    let py = null;
    for (const cmd of g.path.commands) {
      if (cmd.type === 'L' && r(cmd.x) === px && r(cmd.y) === py) continue;
      if (cmd.type !== 'Z') { px = r(cmd.x); py = r(cmd.y); }
      if (cmd.type === 'M') parts.push('M', r(cmd.x), r(cmd.y));
      else if (cmd.type === 'L') parts.push('L', r(cmd.x), r(cmd.y));
      else if (cmd.type === 'Q') parts.push('Q', r(cmd.x1), r(cmd.y1), r(cmd.x), r(cmd.y));
      else if (cmd.type === 'C') parts.push('C', r(cmd.x1), r(cmd.y1), r(cmd.x2), r(cmd.y2), r(cmd.x), r(cmd.y));
      else if (cmd.type === 'Z') parts.push('Z');
    }
    glyphs[ch] = [r(g.advanceWidth), parts.join(' ')];
  }
  faces[face] = glyphs;
  console.log(face, Object.keys(glyphs).length, 'glyphs', font.names.fullName && font.names.fullName.en);
}

const head = `/* Casify — glyph outlines for the "3D phone scan" headline (assets/cv-phone-scan.js).
 * Playfair Display (SIL Open Font License 1.1, the brand display face):
 * r = ExtraBold 800, i = Bold Italic 700, the two weights the headline uses.
 * Printable ASCII, é, º, curly quotes, dashes, ellipsis, £ and €; font units (${upem} per em),
 * y up, origin on the baseline at the pen position. Each glyph is
 * [advance, path] with path commands M/L/Q/C/Z. Generated from the
 * @fontsource/playfair-display 5 files with opentype.js; do not hand-edit. */
`;
fs.writeFileSync(OUT, head + 'export default ' + JSON.stringify({ upem, r: faces.r, i: faces.i }) + ';\n');
console.log('bytes', fs.statSync(OUT).size);
