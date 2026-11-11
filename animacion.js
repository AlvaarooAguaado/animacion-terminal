const http = require('http');

const COLS = 50;
const ROWS = 24;
const CX = 25;
const CY = 24;
const R = 22;
const T = 1.8;

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const WHITE = '\x1b[97m';
const CLEAR = '\x1b[2J\x1b[H';

// Tonos de azul (256 colores): de más oscuro a más claro y de vuelta
const SHADES = [21, 27, 33, 39, 45, 39, 33, 27];

function triangle(up) {
  const base = up ? -90 : 90;
  return [0, 120, 240].map(off => {
    const a = (base + off) * Math.PI / 180;
    return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
  });
}

const edges = [];
for (const up of [true, false]) {
  const [a, b, c] = triangle(up);
  edges.push([a, b], [b, c], [c, a]);
}

function distToSegment(px, py, [x1, y1], [x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx - px, cy = y1 + t * dy - py;
  return Math.sqrt(cx * cx + cy * cy);
}

function buildStarLines(ch) {
  const lines = [];
  for (let r = 0; r < ROWS; r++) {
    const py = r * 2 + 1;
    let line = '';
    for (let c = 0; c < COLS; c++) {
      const px = c + 0.5;
      const near = edges.some(e => distToSegment(px, py, e[0], e[1]) < T);
      line += near ? ch : ' ';
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines;
}

// Centra un texto respecto al ancho de la estrella
function center(text) {
  const pad = Math.max(0, Math.floor((COLS - text.length) / 2));
  return ' '.repeat(pad) + text;
}

const starLines = buildStarLines('#');
const texts = ['=== TEL AVIV ===', '... TEL AVIV ...'];

// Un frame por cada tono; el texto alterna entre los dos estilos
const frames = SHADES.map((shade, i) => {
  const color = `\x1b[38;5;${shade}m`;
  const coloredStar = starLines
    .map(l => color + l + RESET)
    .join('\n');
  const text = texts[i % texts.length];
  return coloredStar + '\n\n' + BOLD + WHITE + center(text) + RESET + '\n';
});

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked'
  });

  let index = 0;
  res.write(CLEAR + frames[index]);
  index = (index + 1) % frames.length;

  const interval = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(interval);
      return;
    }
    res.write(CLEAR + frames[index]);
    index = (index + 1) % frames.length;
  }, 400);

  req.on('close', () => clearInterval(interval));
});

// MODIFICADO: Usa el puerto de la nube o el 3000 por defecto para pruebas locales
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});