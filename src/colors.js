// Paleta de colores que el usuario puede elegir para cada marcador/lugar.
// Los valores estan pensados para verse bien tanto en el mapa (pines) como
// en las imagenes de resumen generadas para redes sociales.
export const PLACE_COLORS = [
  { key: 'rojo', label: 'Rojo', hex: '#e0433d' },
  { key: 'azul', label: 'Azul', hex: '#3f7ede' },
  { key: 'verde', label: 'Verde', hex: '#3f9142' },
  { key: 'amarillo', label: 'Amarillo', hex: '#e0a52c' },
  { key: 'rosa', label: 'Rosa', hex: '#e0568f' },
  { key: 'morado', label: 'Morado', hex: '#8a5cd6' },
  { key: 'naranja', label: 'Naranja', hex: '#e07b30' },
  { key: 'turquesa', label: 'Turquesa', hex: '#2fa3a3' },
];

export const DEFAULT_PLACE_COLOR = PLACE_COLORS[0].key;

export function colorHex(key) {
  return PLACE_COLORS.find((c) => c.key === key)?.hex || PLACE_COLORS[0].hex;
}

/** Devuelve un color de la paleta siguiendo el orden, para asignar por defecto sin repetir tanto. */
export function colorForIndex(index) {
  return PLACE_COLORS[index % PLACE_COLORS.length].key;
}
