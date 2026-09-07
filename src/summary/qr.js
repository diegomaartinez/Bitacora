import QRCode from 'qrcode';

const cache = new Map();

/**
 * Genera (con cache) un canvas con el codigo QR de `text` y lo devuelve.
 * Se pinta en blanco y negro puro para que sea legible incluso pequeno.
 */
export async function getQrCanvas(text, size = 240) {
  const key = `${text}__${size}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  const promise = QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    color: { dark: '#17181a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  }).then(() => canvas);
  cache.set(key, promise);
  return promise;
}
