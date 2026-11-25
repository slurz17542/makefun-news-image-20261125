// news-image-20261125: "The World in One Page - 25 November 2026".
// Renders Wednesday 25 November 2026's world news as a single 1024x1024 PNG,
// drawn entirely from code (Node standard library only: fs, path, zlib).
// No network, no randomness, no clock: two runs write identical bytes.
//
// Stories verified against Reuters / BBC / WSJ / CNN / The Guardian / AAP,
// all dated Wednesday 25 November 2026 in the time zone where they happened:
//   LEAD  Australia & Solomon Islands sign a security pact in Canberra,
//         Honiara scrapping its 2022 deal with China (Reuters, 25 Nov).
//   TRADE US set to unveil new tariffs on 16 trading partners (BBC, 25 Nov).
//   USA   Army to detonate 68 barrels of toxic lead azide in Iowa, 9am CT
//         today, after a court cleared the blast (WSJ/CNN, 25 Nov).
//   UK    Ofgem confirms the new energy price cap today; forecast +26%
//         to 2,166 pounds a year (25 Nov).
//   COURT Sydney court finds Beau Lamarre-Condon guilty of murdering
//         Jesse Baird and Luke Davies (The Guardian, 25 Nov).
//   TODAY 25 November is the International Day for the Elimination of
//         Violence against Women.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 hand-drawn bitmap font. '#' = ink, '.' = blank. Uppercase + digits +
// punctuation; all page copy is uppercased before drawing.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '.##..', '.#...'],
  "'": ['..#..', '..#..', '..#..', '.....', '.....', '.....', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '&': ['.###.', '#...#', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '=': ['.....', '.....', '.###.', '.....', '.###.', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.#.#.', '.....', '.....', '.....', '.....'],
  '*': ['.....', '.#.#.', '..#..', '.###.', '..#..', '.#.#.', '.....'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '<': ['....#', '...#.', '..#..', '.#...', '..#..', '...#.', '....#'],
  '>': ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
};

const GW = 5; // glyph width in pixels
const GH = 7; // glyph height in pixels
const ADV = 6; // advance: glyph width + 1px tracking

// ---------------------------------------------------------------------------
// Canvas: a plain RGB buffer with tiny drawing helpers.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

const PAPER: RGB = [250, 245, 233];
const INK: RGB = [26, 25, 22];
const RED: RGB = [176, 32, 32];
const BLUE: RGB = [28, 62, 118];
const GREY: RGB = [112, 106, 96];
const RULE: RGB = [198, 190, 175];

const px = Buffer.alloc(W * H * 3);

function put(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
  }
}

function hrule(x: number, y: number, w: number, c: RGB, thick = 1): void {
  rect(x, y, w, thick, c);
}

function vrule(x: number, y: number, h: number, c: RGB, thick = 1): void {
  rect(x, y, thick, h, c);
}

function box(x: number, y: number, w: number, h: number, c: RGB): void {
  hrule(x, y, w, c, 2);
  hrule(x, y + h - 2, w, c, 2);
  vrule(x, y, h, c, 2);
  vrule(x + w - 2, y, h, c, 2);
}

// ---------------------------------------------------------------------------
// Text: draw one glyph, one string, measure width, wrap to a column.
// ---------------------------------------------------------------------------
function glyph(ch: string, x: number, y: number, s: number, c: RGB): void {
  const rows = FONT[ch];
  if (!rows) return;
  for (let r = 0; r < GH; r++) {
    for (let col = 0; col < GW; col++) {
      if (rows[r][col] === '#') {
        for (let dy = 0; dy < s; dy++) {
          for (let dx = 0; dx < s; dx++) {
            put(x + col * s + dx, y + r * s + dy, c);
          }
        }
      }
    }
  }
}

function textWidth(s: string, scale: number): number {
  if (s.length === 0) return 0;
  return s.length * ADV * scale - scale;
}

function text(s: string, x: number, y: number, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    glyph(up[i], x + i * ADV * scale, y, scale, c);
  }
}

function textCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  text(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Greedy word wrap: returns lines that fit maxW pixels at the given scale.
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur === '' ? w : cur + ' ' + w;
    if (textWidth(trial, scale) <= maxW || cur === '') {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// Draw wrapped text; returns the y just below the last line.
function para(s: string, x: number, y: number, maxW: number, scale: number, c: RGB, leading: number): number {
  const lines = wrap(s, maxW, scale);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], x, y + i * (GH * scale + leading), scale, c);
  }
  return y + lines.length * (GH * scale + leading);
}

function kicker(label: string, x: number, y: number, c: RGB): void {
  rect(x, y + 2, 10, 10, c);
  text(label, x + 18, y, 2, c);
}

// ---------------------------------------------------------------------------
// PNG encoder: 8-bit RGB, no interlace. Deterministic by construction.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG(rgb: Buffer, w: number, h: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // One filter byte (0 = none) per scanline, then raw RGB rows.
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    rgb.copy(raw, y * (1 + w * 3) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// Page layout (1024x1024). Margins: 32px each side, content width 960px.
// ---------------------------------------------------------------------------
const MX = 32; // left margin
const CW = 960; // content width
const RX = MX + CW; // right edge

function buildPage(): void {
  // Paper background.
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = PAPER[0];
    px[i * 3 + 1] = PAPER[1];
    px[i * 3 + 2] = PAPER[2];
  }

  // ---- Masthead ----
  hrule(MX, 22, CW, INK, 4);
  hrule(MX, 30, CW, INK, 1);
  textCentered('THE WORLD IN ONE PAGE', W / 2, 44, 7, INK);
  textCentered('WEDNESDAY, 25 NOVEMBER 2026', W / 2, 106, 2, INK);
  hrule(MX, 130, CW, INK, 3);

  // ---- Lead story: Solomon Islands / Australia ----
  kicker('PACIFIC - THE LEAD STORY', MX, 148, RED);
  text('SOLOMONS SIGN AUSTRALIA PACT', MX, 172, 5, INK);
  text('AND DITCH CHINA SECURITY DEAL', MX, 214, 5, INK);
  para(
    "CANBERRA BECOMES THE PACIFIC NATION'S DEFENCE PARTNER OF CHOICE AS HONIARA SCRAPS ITS 2022 SECURITY DEAL WITH BEIJING.",
    MX,
    264,
    CW,
    2,
    INK,
    6,
  );
  para(
    'PRIME MINISTERS ANTHONY ALBANESE AND MATTHEW WALE SIGNED THE HISTORIC TREATY IN CANBERRA ON WEDNESDAY. AUSTRALIA WILL TAKE A GREATER ROLE IN THE SOLOMONS POLICE AND BORDER FORCE, AND HONIARA MUST CONSULT CANBERRA ON CRITICAL INFRASTRUCTURE. THE DEAL BARS FOREIGN MILITARY BASES AND COMES WITH MORE THAN 980 MILLION AUSTRALIAN DOLLARS IN EXTRA FUNDING. IT FOLLOWS SIMILAR PACTS WITH PAPUA NEW GUINEA, FIJI AND VANUATU.',
    MX,
    312,
    CW,
    2,
    INK,
    6,
  );

  hrule(MX, 412, CW, INK, 2);

  // ---- Row 1: two stories ----
  const colW = 464;
  const col2X = MX + colW + 32;

  kicker('TRADE - WASHINGTON', MX, 430, BLUE);
  text('US SET TO UNVEIL', MX, 454, 3, INK);
  text('NEW TARIFFS', MX, 480, 3, INK);
  para(
    'WASHINGTON IS POISED TO RELEASE FINDINGS OF A PROBE INTO EXCESS FACTORY CAPACITY IN 16 TRADING PARTNERS, INCLUDING CHINA, THE EU AND JAPAN. NEW DUTIES ARE EXPECTED TODAY.',
    MX,
    512,
    colW,
    2,
    INK,
    6,
  );

  kicker('USA - IOWA', col2X, 430, BLUE);
  text('IOWA BRACES FOR', col2X, 454, 3, INK);
  text('TOXIC BLAST', col2X, 480, 3, INK);
  para(
    'THE US ARMY IS SET TO DETONATE 68 BARRELS OF DEGRADED LEAD AZIDE AT A PLANT IN MIDDLETOWN, IOWA, AT 9 AM TODAY. A COURT CLEARED THE BLAST ON MONDAY.',
    col2X,
    512,
    colW,
    2,
    INK,
    6,
  );

  hrule(MX, 634, CW, INK, 2);

  // ---- Row 2: two stories ----
  kicker('BRITAIN - ENERGY', MX, 652, BLUE);
  text('UK ENERGY BILLS', MX, 676, 3, INK);
  text('SET TO JUMP', MX, 702, 3, INK);
  para(
    'OFGEM CONFIRMS THE NEW ENERGY PRICE CAP TODAY, COVERING JANUARY TO MARCH 2027. FORECASTERS EXPECT A TYPICAL BILL TO RISE 26 PERCENT TO 2,166 POUNDS A YEAR.',
    MX,
    734,
    colW,
    2,
    INK,
    6,
  );

  kicker('AUSTRALIA - JUSTICE', col2X, 652, BLUE);
  text('SYDNEY COURT FINDS', col2X, 676, 3, INK);
  text('MAN GUILTY', col2X, 702, 3, INK);
  para(
    'BEAU LAMARRE-CONDON WAS FOUND GUILTY IN SYDNEY OF MURDERING TELEVISION PRESENTER JESSE BAIRD AND HIS PARTNER LUKE DAVIES. THE VERDICT CLOSES A CLOSELY WATCHED TRIAL.',
    col2X,
    734,
    colW,
    2,
    INK,
    6,
  );

  hrule(MX, 856, CW, INK, 2);

  // ---- Bottom strip: observance + coming today ----
  box(MX, 874, 560, 84, INK);
  text('TODAY', MX + 16, 888, 2, RED);
  para(
    '25 NOVEMBER IS THE INTERNATIONAL DAY FOR THE ELIMINATION OF VIOLENCE AGAINST WOMEN.',
    MX + 16,
    912,
    528,
    2,
    INK,
    5,
  );

  box(MX + 576, 874, 384, 84, INK);
  text('COMING TODAY', MX + 592, 888, 2, RED);
  text('US PCE INFLATION AND', MX + 592, 912, 2, INK);
  text('Q3 GDP DATA', MX + 592, 932, 2, INK);

  // ---- Footer ----
  textCentered('SOURCES: REUTERS - BBC - WALL STREET JOURNAL - CNN - THE GUARDIAN - AAP', W / 2, 976, 1, GREY);
  textCentered('RENDERED ENTIRELY FROM CODE - NO PHOTOS', W / 2, 992, 1, GREY);
}

// ---------------------------------------------------------------------------
buildPage();
const png = encodePNG(px, W, H);
const outFile = join(process.cwd(), 'news-image-20261125.png');
writeFileSync(outFile, png);
console.log(`wrote ${outFile} (${png.length} bytes, ${W}x${H})`);
