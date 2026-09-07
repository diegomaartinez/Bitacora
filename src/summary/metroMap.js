import { formatShortDate, drawFooterMark } from './canvasUtils.js';
import { colorHex } from '../colors.js';
import { getTheme } from './themes.js';
import { t } from '../i18n.js';

const WIDTH = 1080;
const HEIGHT = 1350;

export function drawMetroMap(ctx, { tripData, theme }) {
  const theme_ = getTheme(theme);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#fbfbfa';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Cabecera
  ctx.fillStyle = theme_.eyebrow;
  ctx.font = '700 20px Inter';
  ctx.textAlign = 'center';
  drawTracked(ctx, t('summary.metro.eyebrow'), WIDTH / 2, 90, 3);

  ctx.fillStyle = '#17181a';
  ctx.font = 'italic 500 58px Newsreader';
  ctx.textAlign = 'center';
  fitTitle(ctx, `${t('summary.metro.linePrefix')} ${tripData.name || ''}`.trim(), WIDTH / 2, 156, WIDTH - 160);

  const places = orderedPlaces(tripData.places);

  ctx.fillStyle = '#83807a';
  ctx.font = '500 22px Inter';
  ctx.fillText(
    places.length === 1 ? t('summary.metro.stationsOne') : t('summary.metro.stationsOther', { count: places.length }),
    WIDTH / 2,
    196
  );

  if (!places.length) {
    ctx.fillStyle = '#83807a';
    ctx.font = '500 26px Inter';
    ctx.fillText(t('summary.metro.addPlacesHint'), WIDTH / 2, HEIGHT / 2);
    return;
  }

  const top = 260;
  const bottom = HEIGHT - 140;
  const centerX = WIDTH / 2;
  const usableH = bottom - top;
  const step = places.length > 1 ? usableH / (places.length - 1) : 0;

  // Linea principal
  ctx.save();
  ctx.strokeStyle = '#17181a';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX, top);
  ctx.lineTo(centerX, places.length > 1 ? top + step * (places.length - 1) : top);
  ctx.stroke();
  ctx.restore();

  // Terminales (tapas redondeadas en los extremos)
  drawTerminus(ctx, centerX, top);
  if (places.length > 1) drawTerminus(ctx, centerX, top + step * (places.length - 1));

  places.forEach((place, i) => {
    const y = top + step * i;
    const side = i % 2 === 0 ? 1 : -1;
    const tickLength = 46;
    const labelGap = 26;

    // Marca perpendicular tipo "estacion"
    ctx.save();
    ctx.strokeStyle = 'rgba(23,24,26,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, y);
    ctx.lineTo(centerX + side * tickLength, y);
    ctx.stroke();
    ctx.restore();

    // Circulo de estacion
    const color = colorHex(place.color);
    ctx.beginPath();
    ctx.arc(centerX, y, 17, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Texto (nombre + fecha), alineado segun el lado
    const textX = centerX + side * (tickLength + labelGap);
    ctx.textAlign = side === 1 ? 'left' : 'right';
    ctx.fillStyle = '#17181a';
    ctx.font = '600 26px Inter';
    ctx.fillText(truncate(ctx, place.name, 320), textX, y - 4);

    const dateLabel = formatShortDate(place.date);
    if (dateLabel) {
      ctx.fillStyle = '#83807a';
      ctx.font = '500 18px Inter';
      ctx.fillText(dateLabel, textX, y + 22);
    }
  });

  drawFooterMark(ctx, WIDTH / 2, HEIGHT - 60);
}

function orderedPlaces(places) {
  return [...places].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
}

function drawTerminus(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#17181a';
  ctx.fill();
}

function fitTitle(ctx, text, x, y, maxWidth) {
  let size = 58;
  ctx.font = `italic 500 ${size}px Newsreader`;
  while (ctx.measureText(text).width > maxWidth && size > 28) {
    size -= 3;
    ctx.font = `italic 500 ${size}px Newsreader`;
  }
  ctx.fillText(text, x, y);
}

function drawTracked(ctx, text, centerX, y, tracking) {
  const letters = text.split('');
  const widths = letters.map((l) => ctx.measureText(l).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1);
  let cx = centerX - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  letters.forEach((l, i) => {
    ctx.fillText(l, cx, y);
    cx += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

export { WIDTH as METRO_WIDTH, HEIGHT as METRO_HEIGHT };
