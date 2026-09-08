// ---------------------------------------------------------------------------
// Configuracion de la aplicacion.
//
// GOOGLE_CLIENT_ID: pega aqui el "Client ID" que obtienes al crear unas
// credenciales OAuth 2.0 de tipo "Aplicacion web" en Google Cloud Console.
// Instrucciones completas paso a paso en README.md.
// ---------------------------------------------------------------------------

export const GOOGLE_CLIENT_ID = '235727397064-2accjaa68tcpvlfi9v3v4k47p7ncegf2.apps.googleusercontent.com';

// Alcance minimo necesario: permite a la app crear, leer y listar
// unicamente los archivos y carpetas que ella misma crea en el Drive
// del usuario (no da acceso al resto de su Drive).
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file';

// GOOGLE_API_KEY: necesaria SOLO para que el enlace/QR de "compartir viaje"
// funcione. Es una credencial distinta del Client ID de arriba: una "clave
// de API" (API key), no un inicio de sesion. Permite que la pagina de
// solo-lectura que ve la persona invitada lea el trip.json y las fotos de
// ESE viaje (que ya son publicas, "cualquiera con el enlace") sin que esa
// persona tenga que iniciar sesion con ninguna cuenta de Google.
export const GOOGLE_API_KEY = 'AIzaSyDljctq0pMzeIM1xhSt-f7bm1RxNOtFv-8';

// Nombre de la carpeta raiz visible que se creara en el Google Drive
// del usuario para guardar todos los viajes.
export const DRIVE_ROOT_FOLDER_NAME = 'Bitácora';
