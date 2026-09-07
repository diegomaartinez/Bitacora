export function roundRect(ctx, x, y, w, h, r) {
  const radius = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + w - radius.tr, y);
  ctx.arcTo(x + w, y, x + w, y + radius.tr, radius.tr);
  ctx.lineTo(x + w, y + h - radius.br);
  ctx.arcTo(x + w, y + h, x + w - radius.br, y + h, radius.br);
  ctx.lineTo(x + radius.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius.bl, radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.arcTo(x, y, x + radius.tl, y, radius.tl);
  ctx.closePath();
}

/** Escribe texto envuelto en varias lineas, devuelve la altura total usada. */
export function wrapText(ctx, text, x, y, maxWidth, lineHeight, { align = 'left' } = {}) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => {
    let drawX = x;
    if (align === 'center') drawX = x;
    ctx.textAlign = align;
    ctx.fillText(l, drawX, y + i * lineHeight);
  });
  return lines.length * lineHeight;
}

/** Asegura que las tipografias usadas en los canvas ya esten cargadas. */
export async function ensureFontsReady() {
  const fonts = [
    '500 40px Newsreader',
    'italic 500 40px Newsreader',
    '600 20px Inter',
    '500 20px Inter',
    '400 20px Inter',
  ];
  try {
    await Promise.all(fonts.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  } catch (err) {
    // Si la API de fonts no esta disponible, seguimos con las de sistema.
  }
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

export function formatShortDate(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function formatShortDateWithYear(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

/** Calcula el rango de fechas (min/max) entre los lugares que tienen fecha. */
export function tripDateRange(places) {
  const dates = places.map((p) => p.date).filter(Boolean).sort();
  if (!dates.length) return { start: null, end: null };
  return { start: dates[0], end: dates[dates.length - 1] };
}

/** Firma pequena y consistente al pie de las tres imagenes de resumen. */
export function drawFooterMark(ctx, centerX, y, { color = '#83807a' } = {}) {
  const prevAlign = ctx.textAlign;
  const fontA = '500 20px Inter';
  const fontB = 'italic 500 22px Newsreader';
  const textA = 'Hecho con ·';
  const textB = 'Bitácora';
  ctx.font = fontA;
  const widthA = ctx.measureText(textA).width;
  ctx.font = fontB;
  const widthB = ctx.measureText(textB).width;
  const gap = 8;
  const total = widthA + gap + widthB;
  let x = centerX - total / 2;

  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = fontA;
  ctx.fillText(textA, x, y);
  x += widthA + gap;
  ctx.font = fontB;
  ctx.fillText(textB, x, y);
  ctx.textAlign = prevAlign;
}
