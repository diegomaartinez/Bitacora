// ---------------------------------------------------------------------------
// Paletas de color para las imagenes de resumen (Mapa, billete de avion,
// guia de metro). Cada paleta cambia el fondo y los detalles de color, pero
// mantiene siempre la misma tipografia, proporciones y estilo editorial.
// ---------------------------------------------------------------------------

export const SUMMARY_THEMES = [
  {
    key: 'calido',
    label: 'Calido',
    swatch: '#e0956a',
    bgFrom: '#fbf6ee',
    bgTo: '#f4e7d6',
    blobA: 'rgba(224,86,143,0.10)',
    blobB: 'rgba(63,126,222,0.10)',
    eyebrow: '#956400',
    pillA: { bg: '#e1f3fe', fg: '#1f6c9f' },
    pillB: { bg: '#edf3ec', fg: '#346538' },
    boardingWashFrom: 'rgba(63,126,222,0.05)',
    boardingWashTo: 'rgba(224,86,143,0.05)',
  },
  {
    key: 'oceano',
    label: 'Oceano',
    swatch: '#3f7ede',
    bgFrom: '#eef6fb',
    bgTo: '#dcebf6',
    blobA: 'rgba(63,126,222,0.12)',
    blobB: 'rgba(47,163,163,0.12)',
    eyebrow: '#1f6c9f',
    pillA: { bg: '#fbf3db', fg: '#956400' },
    pillB: { bg: '#edf3ec', fg: '#346538' },
    boardingWashFrom: 'rgba(63,126,222,0.07)',
    boardingWashTo: 'rgba(47,163,163,0.06)',
  },
  {
    key: 'bosque',
    label: 'Bosque',
    swatch: '#3f9142',
    bgFrom: '#f3f8ee',
    bgTo: '#e3efd9',
    blobA: 'rgba(63,145,66,0.12)',
    blobB: 'rgba(224,165,44,0.10)',
    eyebrow: '#346538',
    pillA: { bg: '#fbf3db', fg: '#956400' },
    pillB: { bg: '#e1f3fe', fg: '#1f6c9f' },
    boardingWashFrom: 'rgba(63,145,66,0.06)',
    boardingWashTo: 'rgba(224,165,44,0.05)',
  },
  {
    key: 'atardecer',
    label: 'Atardecer',
    swatch: '#e0568f',
    bgFrom: '#fdeef0',
    bgTo: '#fbe1d5',
    blobA: 'rgba(224,86,143,0.13)',
    blobB: 'rgba(224,123,48,0.12)',
    eyebrow: '#9f2f2d',
    pillA: { bg: '#fbf3db', fg: '#956400' },
    pillB: { bg: '#fdebec', fg: '#9f2f2d' },
    boardingWashFrom: 'rgba(224,86,143,0.07)',
    boardingWashTo: 'rgba(224,123,48,0.06)',
  },
];

export const DEFAULT_THEME_KEY = SUMMARY_THEMES[0].key;

export function getTheme(key) {
  return SUMMARY_THEMES.find((t) => t.key === key) || SUMMARY_THEMES[0];
}
