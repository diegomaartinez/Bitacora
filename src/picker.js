import { GOOGLE_API_KEY } from './config.js';

// ---------------------------------------------------------------------------
// Selector de archivos de Google (Picker). Se usa una unica vez por persona
// invitada como editora de un viaje: el permiso de la app sobre Drive
// (drive.file) solo deja tocar carpetas que la propia cuenta ha creado O
// que ha "abierto" explicitamente a traves de este selector. Por eso, aunque
// el anfitrion ya haya compartido la carpeta del viaje con su email (ver
// drive.js -> addCollaborator), la persona invitada tiene que abrirla aqui
// una vez para que la app pueda editarla en su nombre.
// ---------------------------------------------------------------------------

const PICKER_SRC = 'https://apis.google.com/js/api.js';
let pickerReady = false;
let loadingPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

async function ensurePickerLoaded() {
  if (pickerReady) return;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      await loadScript(PICKER_SRC);
      await new Promise((resolve, reject) => {
        window.gapi.load('picker', { callback: resolve, onerror: reject });
      });
      pickerReady = true;
    })();
  }
  await loadingPromise;
}

export function isPickerConfigured() {
  return Boolean(GOOGLE_API_KEY) && !GOOGLE_API_KEY.includes('TU_API_KEY');
}

/**
 * Abre el selector de Google para que la persona elija la carpeta
 * compartida del viaje. Devuelve el id de la carpeta elegida, o null si
 * cancela.
 */
export async function pickSharedFolder(token) {
  await ensurePickerLoaded();
  return new Promise((resolve, reject) => {
    try {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setOwnedByMe(false);
      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback((data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            resolve(data.docs && data.docs[0] ? data.docs[0].id : null);
          } else if (data.action === window.google.picker.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (err) {
      reject(err);
    }
  });
}
