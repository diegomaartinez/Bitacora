const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Busca un lugar por texto libre usando Nominatim (OpenStreetMap).
 * No usa la geolocalizacion real del dispositivo en ningun momento.
 */
export async function searchPlace(query, { limit = 5 } = {}) {
  const url = `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('No se pudo buscar la ubicacion.');
  const results = await res.json();
  return results.map((r) => ({
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    boundingBox: r.boundingbox ? r.boundingbox.map(Number) : null,
    type: r.type,
  }));
}

/**
 * Sugiere un nombre corto y legible para unas coordenadas (usado al
 * anadir un lugar haciendo clic directamente en el mapa).
 */
export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  const addr = data.address || {};
  return (
    addr.village ||
    addr.town ||
    addr.city ||
    addr.municipality ||
    addr.county ||
    (data.display_name ? data.display_name.split(',')[0] : null)
  );
}
