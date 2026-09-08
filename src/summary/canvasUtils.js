import { t, getLang } from '../i18n.js';

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
  const locale = getLang() === 'en' ? 'en-GB' : 'es-ES';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' }).replace('.', '');
}

export function formatShortDateWithYear(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  const locale = getLang() === 'en' ? 'en-GB' : 'es-ES';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

/** Calcula el rango de fechas (min/max) entre los lugares que tienen fecha. */
export function tripDateRange(places) {
  const dates = places.map((p) => p.date).filter(Boolean).sort();
  if (!dates.length) return { start: null, end: null };
  return { start: dates[0], end: dates[dates.length - 1] };
}

/** Ordena lugares cronologicamente (fecha, luego hora si la hay); sin fecha al final. */
export function sortPlacesChronologically(places) {
  return [...places].sort((a, b) => {
    if (a.date !== b.date) {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    }
    if (a.time !== b.time) {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    }
    return 0;
  });
}

/** Carga una imagen (p.ej. una foto de Drive ya descargada como blob URL). */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = url;
  });
}

/** Dibuja una imagen recortandola para llenar el area, como `background-size: cover`. */
export function drawImageCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

/** Recorta un texto con "…" para que quepa en un ancho maximo. */
export function truncateToWidth(ctx, text, maxWidth) {
  if (maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

/** Firma pequena y consistente al pie de las tres imagenes de resumen. */
export function drawFooterMark(ctx, centerX, y, { color = '#83807a' } = {}) {
  const prevAlign = ctx.textAlign;
  const fontA = '500 20px Inter';
  const fontB = 'italic 500 22px Newsreader';
  const textA = t('summary.footerMadeWith');
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
