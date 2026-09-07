// ---------------------------------------------------------------------------
// Carga y dibuja tiles de mapa reales (estilo "Positron" de CARTO, sin
// etiquetas) para usarlos como fondo en las imagenes de resumen. Se usa
// CARTO en vez de OpenStreetMap directamente porque sus tiles se sirven con
// cabeceras CORS abiertas, imprescindible para poder leer el canvas despues
// (exportarlo como PNG) sin que el navegador lo bloquee por "tainted canvas".
// ---------------------------------------------------------------------------

const TILE_SIZE = 256;
const SUBDOMAINS = ['a', 'b', 'c', 'd'];
const imageCache = new Map();

function tileUrl(x, y, z) {
  const s = SUBDOMAINS[(x + y) % SUBDOMAINS.length];
  return `https://${s}.basemaps.cartocdn.com/light_nolabels/${z}/${x}/${y}@2x.png`;
}

function loadImage(url) {
  if (imageCache.has(url)) return imageCache.get(url);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar el tile: ${url}`));
    img.src = url;
  });
  imageCache.set(url, promise);
  return promise;
}

/**
 * Dibuja los tiles necesarios para cubrir `area` segun el proyector dado.
 * Devuelve true si se dibujo al menos un tile con exito.
 */
export async function drawBaseMap(ctx, projector, area) {
  const { zoom, originX, originY } = projector;
  const maxIndex = 2 ** zoom - 1;

  const minTileX = Math.floor(originX / TILE_SIZE);
  const maxTileX = Math.floor((originX + area.width) / TILE_SIZE);
  const minTileY = Math.floor(originY / TILE_SIZE);
  const maxTileY = Math.floor((originY + area.height) / TILE_SIZE);

  const jobs = [];
  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      if (ty < 0 || ty > maxIndex) continue;
      const wrappedX = ((tx % (maxIndex + 1)) + (maxIndex + 1)) % (maxIndex + 1);
      const screenX = area.x + tx * TILE_SIZE - originX;
      const screenY = area.y + ty * TILE_SIZE - originY;
      jobs.push(
        loadImage(tileUrl(wrappedX, ty, zoom))
          .then((img) => ({ img, screenX, screenY }))
          .catch(() => null)
      );
    }
  }

  const results = await Promise.all(jobs);
  let drawn = 0;
  for (const tile of results) {
    if (!tile) continue;
    ctx.drawImage(tile.img, tile.screenX, tile.screenY, TILE_SIZE, TILE_SIZE);
    drawn++;
  }
  return drawn > 0;
}
