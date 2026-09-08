import { formatShortDate, tripDateRange, drawFooterMark, loadImage, drawImageCover, truncateToWidth } from './canvasUtils.js';
import { getTheme } from './themes.js';
import { t } from '../i18n.js';

const WIDTH = 1080;
const HEIGHT = 1350;

/**
 * "Portada": un poster minimalista tipo revista de moda/aventuras, con una
 * foto del viaje de fondo, el titulo, fechas + numero de lugares en la
 * esquina inferior izquierda, y un indice de lugares elegidos en el lateral
 * derecho. Si no hay foto (o falla al cargar), usa un fondo degradado del
 * tema como reserva, para que el poster nunca quede vacio.
 */
export async function drawCoverPoster(ctx, { tripData, title, photoUrl, places, theme }) {
  const theme_ = getTheme(theme);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  let photoLoaded = false;
  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      drawImageCover(ctx, img, 0, 0, WIDTH, HEIGHT);
      photoLoaded = true;
    } catch (err) {
      photoLoaded = false;
    }
  }

  if (!photoLoaded) {
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, theme_.bgFrom);
    bg.addColorStop(1, theme_.bgTo);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const blob = (x, y, r, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    blob(140, 160, 480, theme_.blobA);
    blob(WIDTH - 120, HEIGHT - 200, 520, theme_.blobB);
  }

  // Velo degradado: mas oscuro arriba (para el titulo) y abajo (para el
  // texto de cierre), para que el texto blanco siempre se lea bien.
  const overlay = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  overlay.addColorStop(0, photoLoaded ? 'rgba(10,10,12,0.42)' : 'rgba(10,10,12,0.12)');
  overlay.addColorStop(0.4, photoLoaded ? 'rgba(10,10,12,0.05)' : 'rgba(10,10,12,0.02)');
  overlay.addColorStop(0.72, photoLoaded ? 'rgba(10,10,12,0.4)' : 'rgba(10,10,12,0.18)');
  overlay.addColorStop(1, photoLoaded ? 'rgba(10,10,12,0.85)' : 'rgba(10,10,12,0.5)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const margin = 64;

  // ------------------------------ Titulo ------------------------------
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 19px Inter';
  drawTracked(ctx, t('summary.cover.eyebrow'), margin, margin + 6, 3);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  fitTitle(ctx, title || t('summary.cover.defaultTitle'), margin, margin + 118, WIDTH - margin * 2 - 60);
  ctx.restore();

  // -------------------------- Indice lateral --------------------------
  if (places.length) {
    const listRightX = WIDTH - margin;
    const lineGap = 46;
    const totalH = (places.length - 1) * lineGap;
    let listY = HEIGHT / 2 - totalH / 2;
    ctx.textAlign = 'right';
    places.forEach((p, i) => {
      const num = String(i + 1).padStart(2, '0');
      ctx.font = '600 15px Inter';
      const numText = `${num} · `;
      const numWidth = ctx.measureText(numText).width;
      ctx.font = '500 25px Inter';
      const name = truncateToWidth(ctx, p.name, 300 - numWidth);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(name, listRightX, listY);
      const nameWidth = ctx.measureText(name).width;
      ctx.font = '600 15px Inter';
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.fillText(numText, listRightX - nameWidth, listY);
      ctx.restore();
      listY += lineGap;
    });
  }

  // -------------------------- Fechas y lugares --------------------------
  const { start, end } = tripDateRange(tripData.places);
  const dateLabel = start && end ? `${formatShortDate(start)} — ${formatShortDate(end)}` : t('summary.instagram.noDatesYet');
  const count = tripData.places.length;
  const countLabel = count === 1 ? t('summary.instagram.placesOne') : t('summary.instagram.placesOther', { count });

  ctx.textAlign = 'left';
  const statsLabelY = HEIGHT - margin - 46;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '600 15px Inter';
  drawTracked(ctx, t('summary.cover.itineraryLabel'), margin, statsLabelY, 2.4);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 29px Inter';
  ctx.fillText(`${dateLabel} · ${countLabel}`, margin, statsLabelY + 40);

  drawFooterMark(ctx, WIDTH / 2, HEIGHT - 22, { color: 'rgba(255,255,255,0.7)' });
}

function fitTitle(ctx, text, x, y, maxWidth) {
  let size = 74;
  ctx.font = `italic 500 ${size}px Newsreader`;
  while (ctx.measureText(text).width > maxWidth && size > 34) {
    size -= 3;
    ctx.font = `italic 500 ${size}px Newsreader`;
  }
  ctx.fillText(text, x, y);
}

function drawTracked(ctx, text, startX, y, tracking) {
  const letters = text.split('');
  const widths = letters.map((l) => ctx.measureText(l).width);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  let cx = startX;
  letters.forEach((l, i) => {
    ctx.fillText(l, cx, y);
    cx += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
}

export { WIDTH as COVER_WIDTH, HEIGHT as COVER_HEIGHT };
