/** Calcula el rectangulo (bounding box) que engloba todos los lugares. */
export function computeBounds(places) {
  const lats = places.map((p) => p.lat);
  const lngs = places.map((p) => p.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);

  // Evita divisiones por cero cuando todos los lugares estan muy juntos
  // (o solo hay uno): forzamos un margen minimo alrededor del punto.
  const MIN_SPAN = 0.05;
  if (maxLat - minLat < MIN_SPAN) {
    const mid = (maxLat + minLat) / 2;
    minLat = mid - MIN_SPAN / 2;
    maxLat = mid + MIN_SPAN / 2;
  }
  if (maxLng - minLng < MIN_SPAN) {
    const mid = (maxLng + minLng) / 2;
    minLng = mid - MIN_SPAN / 2;
    maxLng = mid + MIN_SPAN / 2;
  }
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Proyecta un punto lat/lng dentro de un rectangulo de pantalla (x,y,width,height),
 * manteniendo la proporcion (sin deformar) y dejando el padding indicado.
 */
export function projectPoint(place, bounds, area) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;

  // Correccion simple de aspecto por latitud (equirectangular).
  const midLat = (minLat + maxLat) / 2;
  const lngScale = Math.cos((midLat * Math.PI) / 180) || 1;

  const nx = (place.lng - minLng) / lngSpan;
  const ny = 1 - (place.lat - minLat) / latSpan;

  const usableW = area.width - area.padding * 2;
  const usableH = area.height - area.padding * 2;

  // Ajustamos para que el area util respete la proporcion real (aprox.)
  const contentAspect = (lngSpan * lngScale) / latSpan || 1;
  const areaAspect = usableW / usableH;
  let drawW = usableW;
  let drawH = usableH;
  if (contentAspect > areaAspect) {
    drawH = usableW / contentAspect;
  } else {
    drawW = usableH * contentAspect;
  }
  const offsetX = area.padding + (usableW - drawW) / 2;
  const offsetY = area.padding + (usableH - drawH) / 2;

  return {
    x: area.x + offsetX + nx * drawW,
    y: area.y + offsetY + ny * drawH,
  };
}
