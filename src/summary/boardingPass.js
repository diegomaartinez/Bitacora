import { roundRect, formatShortDateWithYear, tripDateRange, drawFooterMark } from './canvasUtils.js';
import { getQrCanvas } from './qr.js';

const WIDTH = 1500;
const HEIGHT = 640;
const STUB_WIDTH = 340;

export async function drawBoardingPass(ctx, { tripData, passengerName, shareUrl, shareError }) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Fondo
  ctx.fillStyle = '#f4e7d6';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, 'rgba(63,126,222,0.05)');
  bg.addColorStop(1, 'rgba(224,86,143,0.05)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const margin = 50;
  const cardX = margin;
  const cardY = margin;
  const cardW = WIDTH - margin * 2;
  const cardH = HEIGHT - margin * 2;
  const perforationX = cardX + cardW - STUB_WIDTH;

  ctx.save();
  ctx.shadowColor = 'rgba(23,24,26,0.14)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#fffdf9';
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fill();
  ctx.restore();

  // Muescas de la perforacion
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.clip();
  ctx.fillStyle = '#f4e7d6';
  ctx.beginPath();
  ctx.arc(perforationX, cardY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(perforationX, cardY + cardH, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = 'rgba(23,24,26,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(perforationX, cardY + 24);
  ctx.lineTo(perforationX, cardY + cardH - 24);
  ctx.stroke();
  ctx.restore();

  // ------------------------- Cuerpo principal -------------------------
  const padX = 56;
  let cursorY = cardY + 66;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#956400';
  ctx.font = '700 20px Inter';
  drawTracked(ctx, 'TARJETA DE EMBARQUE · BITÁCORA', cardX + padX, cursorY, 2.5);

  ctx.fillStyle = '#17181a';
  ctx.font = '600 26px Inter';
  ctx.textAlign = 'right';
  ctx.fillText(planeUnicode(), perforationX - 40, cursorY + 4);
  ctx.textAlign = 'left';

  cursorY += 60;
  labelValue(ctx, cardX + padX, cursorY, 'PASAJERO', (passengerName || 'Viajero').toUpperCase());

  cursorY += 100;
  const destino = tripData.name || 'Destino desconocido';
  ctx.fillStyle = '#83807a';
  ctx.font = '600 18px Inter';
  drawTracked(ctx, 'DESTINO', cardX + padX, cursorY, 2);
  ctx.fillStyle = '#17181a';
  fitDestino(ctx, destino, cardX + padX, cursorY + 62, perforationX - (cardX + padX) - 40);

  cursorY += 150;
  const { start, end } = tripDateRange(tripData.places);
  const colWidth = (perforationX - (cardX + padX) - 60) / 3;
  labelValue(ctx, cardX + padX, cursorY, 'SALIDA', start ? formatShortDateWithYear(start) : '—');
  labelValue(ctx, cardX + padX + colWidth, cursorY, 'LLEGADA', end ? formatShortDateWithYear(end) : '—');
  labelValue(ctx, cardX + padX + colWidth * 2, cursorY, 'LUGARES', String(tripData.places.length));

  // ------------------------------ Stub ------------------------------
  const stubX = perforationX + 36;
  const stubCenter = stubX + (cardX + cardW - stubX) / 2;

  ctx.save();
  ctx.translate(stubCenter, cardY + 70);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#83807a';
  ctx.font = '600 16px Inter';
  drawTracked(ctx, 'DESTINO', 0, 0, 2, true);
  ctx.restore();

  ctx.fillStyle = '#17181a';
  ctx.font = 'italic 500 34px Newsreader';
  ctx.textAlign = 'center';
  fitDestino(ctx, shortName(tripData.name), stubCenter, cardY + 118, cardX + cardW - stubX - 20, true);

  const qrSize = 150;
  const qrX = stubCenter - qrSize / 2;
  const qrY = cardY + 190;
  if (shareUrl) {
    try {
      const qrCanvas = await getQrCanvas(shareUrl, qrSize * 2);
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    } catch (err) {
      drawQrPlaceholder(ctx, qrX, qrY, qrSize, 'Error al generar');
    }
  } else {
    drawQrPlaceholder(ctx, qrX, qrY, qrSize, shareError ? 'Enlace no disponible' : 'Generando codigo…');
  }

  ctx.fillStyle = '#83807a';
  ctx.font = '500 13px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('Escanea para ver las fotos', stubCenter, qrY + qrSize + 26);

  drawFooterMark(ctx, stubCenter, cardY + cardH - 30);
}

function drawQrPlaceholder(ctx, x, y, size, label) {
  ctx.save();
  ctx.strokeStyle = 'rgba(23,24,26,0.25)';
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, 12);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#83807a';
  ctx.font = '500 13px Inter';
  ctx.textAlign = 'center';
  wrapCentered(ctx, label, x + size / 2, y + size / 2, size - 24, 16);
}

function wrapCentered(ctx, text, cx, cy, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
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
  const startY = cy - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
}

function planeUnicode() {
  return '✈';
}

function shortName(name) {
  return (name || '').split(',')[0];
}

function fitDestino(ctx, text, x, y, maxWidth, centered = false) {
  let size = 56;
  const style = (s) => `italic 500 ${s}px Newsreader`;
  ctx.font = style(size);
  while (ctx.measureText(text).width > maxWidth && size > 22) {
    size -= 3;
    ctx.font = style(size);
  }
  ctx.textAlign = centered ? 'center' : 'left';
  ctx.fillText(text, x, y);
}

function labelValue(ctx, x, y, label, value) {
  ctx.fillStyle = '#83807a';
  ctx.font = '600 16px Inter';
  ctx.textAlign = 'left';
  drawTracked(ctx, label, x, y, 2);
  ctx.fillStyle = '#17181a';
  ctx.font = '600 30px Inter';
  ctx.fillText(value, x, y + 42);
}

function drawTracked(ctx, text, startX, y, tracking, centered = false) {
  const letters = text.split('');
  const widths = letters.map((l) => ctx.measureText(l).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1);
  let cx = centered ? startX - total / 2 : startX;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  letters.forEach((l, i) => {
    ctx.fillText(l, cx, y);
    cx += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
}

export { WIDTH as BOARDING_PASS_WIDTH, HEIGHT as BOARDING_PASS_HEIGHT };
