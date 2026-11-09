#!/usr/bin/env node
// Converts LOCAL system fonts (no downloads) into three.js typeface JSON for extruded 3D text.
//   node scripts/make-typeface.mjs
import opentype from 'opentype.js';
import {readFileSync, writeFileSync} from 'node:fs';

const SUP = '/System/Library/Fonts/Supplemental';
const FONTS = [
  ['ArialBlack', `${SUP}/Arial Black.ttf`],
  ['Impact', `${SUP}/Impact.ttf`],
  ['TrebuchetBoldItalic', `${SUP}/Trebuchet MS Bold Italic.ttf`],
  ['VerdanaBold', `${SUP}/Verdana Bold.ttf`],
  ['GeorgiaBold', `${SUP}/Georgia Bold.ttf`],
];
const CHARS = Array.from({length: 95}, (_, i) => String.fromCharCode(32 + i)).join('') + '©®™•…€£¢°×÷¿¡“”‘’–—';

for (const [name, file] of FONTS) {
  const buf = readFileSync(file);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const s = 1000 / font.unitsPerEm;
  const r = (v) => Math.round(v * s);
  const glyphs = {};
  for (const ch of CHARS) {
    const g = font.charToGlyph(ch);
    if (!g || (g.index === 0 && ch !== ' ')) continue;
    const cmds = g.getPath(0, 0, font.unitsPerEm).commands; // y-down at size=unitsPerEm
    let o = '';
    for (const c of cmds) {
      // opentype getPath flips y (screen coords); flip back to font coords
      if (c.type === 'M') o += `m ${r(c.x)} ${r(-c.y)} `;
      else if (c.type === 'L') o += `l ${r(c.x)} ${r(-c.y)} `;
      else if (c.type === 'Q') o += `q ${r(c.x)} ${r(-c.y)} ${r(c.x1)} ${r(-c.y1)} `;
      else if (c.type === 'C') o += `b ${r(c.x)} ${r(-c.y)} ${r(c.x1)} ${r(-c.y1)} ${r(c.x2)} ${r(-c.y2)} `;
    }
    const bb = g.getBoundingBox();
    glyphs[ch] = {ha: r(g.advanceWidth), x_min: r(bb.x1), x_max: r(bb.x2), o: o.trim()};
  }
  const out = {
    glyphs, familyName: font.names.fontFamily?.en || name,
    ascender: r(font.ascender), descender: r(font.descender),
    underlinePosition: r(font.tables.post?.underlinePosition || -100), underlineThickness: r(font.tables.post?.underlineThickness || 50),
    boundingBox: {xMin: r(font.tables.head.xMin), yMin: r(font.tables.head.yMin), xMax: r(font.tables.head.xMax), yMax: r(font.tables.head.yMax)},
    resolution: 1000, original_font_information: {format: 0, fontFamily: name},
  };
  writeFileSync(`src/assets/fonts/${name}.typeface.json`, JSON.stringify(out));
  console.log(name, Object.keys(glyphs).length, 'glyphs');
}
