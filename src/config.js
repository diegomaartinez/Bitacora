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

// Nombre de la carpeta raiz visible que se creara en el Google Drive
// del usuario para guardar todos los viajes.
export const DRIVE_ROOT_FOLDER_NAME = 'Bitácora';
