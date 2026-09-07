import L from 'leaflet';
import { colorHex, DEFAULT_PLACE_COLOR } from './colors.js';

const iconCache = new Map();

// Estilo base del marcador inyectado una sola vez. El color concreto se
// aplica por instancia mediante un div interno (ver buildIcon).
if (!document.getElementById('td-marker-style')) {
  const style = document.createElement('style');
  style.id = 'td-marker-style';
  style.textContent = `
    .td-marker span {
      display: block;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    }
    .td-marker.is-hovered span {
      transform: scale(1.15);
    }
  `;
  document.head.appendChild(style);
}

function buildIcon(colorKey) {
  const key = colorKey || DEFAULT_PLACE_COLOR;
  if (iconCache.has(key)) return iconCache.get(key);
  const icon = L.divIcon({
    className: 'td-marker',
    html: `<span style="background:${colorHex(key)}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  iconCache.set(key, icon);
  return icon;
}

export function createMap(container, { center, zoom }) {
  const map = L.map(container, { zoomControl: true }).setView([center.lat, center.lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  return map;
}

/**
 * Anade un marcador de un lugar. Al pasar el raton por encima (hover)
 * se muestra automaticamente el nombre del lugar (tooltip de Leaflet).
 */
export function addPlaceMarker(map, place, { onClick } = {}) {
  const marker = L.marker([place.lat, place.lng], { icon: buildIcon(place.color) }).addTo(map);
  marker.bindTooltip(place.name, { direction: 'top', offset: [0, -10], opacity: 0.95 });
  if (onClick) marker.on('click', () => onClick(place));
  return marker;
}

/** Actualiza el icono (color) y el tooltip (nombre) de un marcador ya existente. */
export function updateMarkerAppearance(marker, place) {
  marker.setIcon(buildIcon(place.color));
  marker.setTooltipContent(place.name);
}

export function flyTo(map, lat, lng, zoom) {
  map.flyTo([lat, lng], zoom ?? map.getZoom(), { duration: 0.6 });
}
