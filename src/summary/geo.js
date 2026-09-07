// ---------------------------------------------------------------------------
// Utilidades geograficas basadas en la proyeccion Web Mercator que usan los
// tiles de mapa "slippy" (OpenStreetMap, CARTO, etc.), para poder dibujar
// tanto el mapa de fondo como los marcadores en las mismas coordenadas.
// ---------------------------------------------------------------------------

const TILE_SIZE = 256;

/** Longitud -> coordenada X en "pixeles de mundo" a un zoom dado. */
export function lonToWorldX(lon, zoom) {
  return ((lon + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

/** Latitud -> coordenada Y en "pixeles de mundo" a un zoom dado. */
export function latToWorldY(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
  return y * TILE_SIZE * 2 ** zoom;
}

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
 * Calcula el zoom entero mas alto (dentro de [minZoom, maxZoom]) con el que
 * el bounding box completo cabe dentro del area disponible, junto con el
 * pixel de mundo central a ese zoom. Es el mismo criterio que usa Leaflet
 * al hacer fitBounds.
 */
export function fitZoomAndCenter(bounds, area, { minZoom = 2, maxZoom = 16 } = {}) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  let zoom = maxZoom;
  for (let z = maxZoom; z >= minZoom; z--) {
    const w = lonToWorldX(maxLng, z) - lonToWorldX(minLng, z);
    const h = latToWorldY(minLat, z) - latToWorldY(maxLat, z);
    if (w <= area.width && h <= area.height) {
      zoom = z;
      break;
    }
    zoom = z;
  }
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  return {
    zoom,
    centerWorldX: lonToWorldX(centerLng, zoom),
    centerWorldY: latToWorldY(centerLat, zoom),
  };
}

/**
 * Crea funciones de proyeccion lat/lng -> punto de pantalla dentro de `area`,
 * centradas en (centerWorldX, centerWorldY) al zoom indicado.
 */
export function createProjector({ zoom, centerWorldX, centerWorldY }, area) {
  const originX = centerWorldX - area.width / 2;
  const originY = centerWorldY - area.height / 2;
  return {
    zoom,
    originX,
    originY,
    project(lat, lng) {
      return {
        x: area.x + (lonToWorldX(lng, zoom) - originX),
        y: area.y + (latToWorldY(lat, zoom) - originY),
      };
    },
  };
}
