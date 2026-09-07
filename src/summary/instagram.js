import { roundRect, formatShortDate, tripDateRange, drawFooterMark } from './canvasUtils.js';
import { computeBounds, fitZoomAndCenter, createProjector } from './geo.js';
import { drawBaseMap } from './tiles.js';
import { colorHex } from '../colors.js';

const SIZE = 1080;

export async function drawInstagramPost(ctx, { tripData, title }) {
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Fondo: degradado calido + un par de manchas suaves tipo acuarela.
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, '#fbf6ee');
  bg.addColorStop(1, '#f4e7d6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const blob = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(120, 120, 420, 'rgba(224,86,143,0.10)');
  blob(SIZE - 100, SIZE - 160, 460, 'rgba(63,126,222,0.10)');

  // Cabecera
  ctx.fillStyle = '#83807a';
  ctx.font = '600 24px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.font = '600 22px Inter';
  ctx.fillStyle = '#956400';
  const eyebrow = 'DIARIO DE VIAJE';
  drawTracked(ctx, eyebrow, SIZE / 2, 96, 3);
  ctx.restore();

  ctx.fillStyle = '#17181a';
  ctx.font = 'italic 500 78px Newsreader';
  ctx.textAlign = 'center';
  fitTitle(ctx, title || 'Mi viaje', SIZE / 2, 190, SIZE - 160);

  // Tarjeta del mapa
  const cardX = 90;
  const cardY = 250;
  const cardW = SIZE - cardX * 2;
  const cardH = 560;
  ctx.save();
  ctx.shadowColor = 'rgba(23,24,26,0.10)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.clip();
  await drawMapContent(ctx, tripData.places, { x: cardX, y: cardY, width: cardW, height: cardH, padding: 46 });
  ctx.restore();

  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.stroke();

  // Pie: fechas y numero de lugares
  const { start, end } = tripDateRange(tripData.places);
  const dateLabel = start && end ? `${formatShortDate(start)} — ${formatShortDate(end)}` : 'Sin fechas todavia';
  drawPill(ctx, 90, 860, dateLabel, '#e1f3fe', '#1f6c9f');
  const placesLabel = `${tripData.places.length} lugar${tripData.places.length === 1 ? '' : 'es'}`;
  drawPillRight(ctx, SIZE - 90, 860, placesLabel, '#edf3ec', '#346538');

  // Marca
  drawFooterMark(ctx, SIZE / 2, 1010);
}

function fitTitle(ctx, text, x, y, maxWidth) {
  let size = 78;
  ctx.font = `italic 500 ${size}px Newsreader`;
  while (ctx.measureText(text).width > maxWidth && size > 36) {
    size -= 4;
    ctx.font = `italic 500 ${size}px Newsreader`;
  }
  ctx.fillText(text, x, y);
}

function drawTracked(ctx, text, centerX, y, tracking) {
  const letters = text.split('');
  const widths = letters.map((l) => ctx.measureText(l).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1);
  let cx = centerX - total / 2;
  ctx.textAlign = 'left';
  letters.forEach((l, i) => {
    ctx.fillText(l, cx, y);
    cx += widths[i] + tracking;
  });
  ctx.textAlign = 'center';
}

function drawPill(ctx, x, y, text, bg, fg) {
  ctx.font = '600 24px Inter';
  const paddingX = 26;
  const w = ctx.measureText(text).width + paddingX * 2;
  const h = 52;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + paddingX, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawPillRight(ctx, rightX, y, text, bg, fg) {
  ctx.font = '600 24px Inter';
  const paddingX = 26;
  const w = ctx.measureText(text).width + paddingX * 2;
  drawPill(ctx, rightX - w, y, text, bg, fg);
}

async function drawMapContent(ctx, places, area) {
  if (!places.length) {
    ctx.fillStyle = '#f9f8f6';
    ctx.fillRect(area.x, area.y, area.width, area.height);
    ctx.fillStyle = '#83807a';
    ctx.font = '500 24px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Todavia no hay lugares marcados', area.x + area.width / 2, area.y + area.height / 2);
    return;
  }

  const bounds = computeBounds(places);
  const innerArea = {
    x: area.x + area.padding,
    y: area.y + area.padding,
    width: area.width - area.padding * 2,
    height: area.height - area.padding * 2,
  };
  const fit = fitZoomAndCenter(bounds, innerArea);
  const projector = createProjector(fit, area);

  let baseMapOk = false;
  try {
    baseMapOk = await drawBaseMap(ctx, projector, area);
  } catch (err) {
    baseMapOk = false;
  }

  if (!baseMapOk) {
    // Sin conexion o tiles bloqueados: fondo tipo "papel de mapa" de reserva.
    ctx.fillStyle = '#f9f8f6';
    ctx.fillRect(area.x, area.y, area.width, area.height);
    ctx.strokeStyle = 'rgba(23,24,26,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const cx = area.x + area.width * (0.15 + i * 0.16);
      const cy = area.y + area.height * (0.2 + (i % 3) * 0.28);
      ctx.arc(cx, cy, 60 + i * 24, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // Velo suave para que los marcadores y el texto destaquen sobre el mapa.
    ctx.fillStyle = 'rgba(249,248,246,0.18)';
    ctx.fillRect(area.x, area.y, area.width, area.height);
  }

  const points = places.map((p) => ({ ...p, ...projector.project(p.lat, p.lng) }));

  // Ruta que conecta los lugares en el orden en que se anadieron.
  if (points.length > 1) {
    ctx.save();
    ctx.setLineDash([2, 10]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(23,24,26,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.stroke();
    ctx.restore();
  }

  const showLabels = points.length <= 6;
  points.forEach((pt, i) => {
    const color = colorHex(pt.color);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (showLabels) {
      ctx.font = '600 22px Inter';
      ctx.fillStyle = '#17181a';
      const spaceRight = area.x + area.width - pt.x;
      const spaceLeft = pt.x - area.x;
      const label = truncateToWidth(ctx, pt.name, Math.max(spaceRight, spaceLeft) - 40);
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 6;
      if (spaceRight >= spaceLeft) {
        ctx.textAlign = 'left';
        ctx.fillText(label, pt.x + 22, pt.y + 8);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(label, pt.x - 22, pt.y + 8);
      }
      ctx.restore();
    } else {
      ctx.font = '700 15px Inter';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), pt.x, pt.y + 1);
      ctx.textBaseline = 'alphabetic';
    }
  });

  // Atribucion del mapa (requerida por CARTO/OpenStreetMap).
  if (baseMapOk) {
    ctx.font = '500 13px Inter';
    ctx.fillStyle = 'rgba(23,24,26,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText('© OpenStreetMap, © CARTO', area.x + area.width - 12, area.y + area.height - 10);
  }
}

function truncateToWidth(ctx, text, maxWidth) {
  if (maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

export { SIZE as INSTAGRAM_SIZE };
