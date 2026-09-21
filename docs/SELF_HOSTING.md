# Publicar tu propia instancia de Bitácora

Bitácora es una aplicación 100% de cliente (sin servidor propio): el inicio de sesión con
Google y la subida de archivos a Drive se hacen directamente desde el navegador de quien
la usa. Eso también es lo que la hace fácil de publicar de forma segura: no hay ningún
secreto de servidor que proteger, y cada persona que la use guarda sus datos en su propio
Google Drive, nunca en el tuyo.

## Stack

- HTML / CSS / JavaScript (Vite, sin framework)
- [Leaflet](https://leafletjs.com/) + OpenStreetMap para el mapa
- [Nominatim](https://nominatim.org/) para el buscador de lugares (gratuito, sin API key)
- Google Identity Services + Google Drive API v3 para el login y el almacenamiento

## 1. Configurar Google Cloud (una sola vez)

Necesitas unas credenciales OAuth propias para que la app pueda pedir permiso de acceso
a Google Drive. Son gratuitas.

1. Entra en [Google Cloud Console](https://console.cloud.google.com/) y crea un proyecto
   nuevo (o usa uno existente).
2. Ve a **APIs y servicios > Biblioteca**, busca **Google Drive API** y pulsa **Habilitar**.
3. Ve a **APIs y servicios > Pantalla de consentimiento OAuth**:
   - Tipo de usuario: **Externo**.
   - Rellena el nombre de la app ("Bitácora"), tu correo de soporte y el de contacto.
   - En **Scopes** no hace falta añadir nada manualmente (la app los pide en tiempo de
     ejecución), pero si el asistente lo pide puedes añadir `drive.file`, `email` y `profile`.
   - En **Usuarios de prueba**, añade tu propia cuenta de Gmail (y la de cualquier otra
     persona que vaya a usar la app mientras no la publiques). Mientras la app esté en
     modo "Prueba", solo estas cuentas podrán iniciar sesión.
4. Ve a **APIs y servicios > Credenciales > Crear credenciales > ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - En **Orígenes de JavaScript autorizados** añade las URLs desde las que abrirás la app,
     por ejemplo:
     - `http://localhost:5173` (para desarrollo local con `npm run dev`)
     - la URL donde la despliegues después (por ejemplo `https://tu-usuario.github.io`)
   - No hace falta configurar "URI de redirección": esta app usa el flujo de token
     implícito de Google Identity Services, no redirecciones de servidor.
5. Copia el **Client ID** generado (termina en `.apps.googleusercontent.com`).

### (Opcional) Clave de API para el modo visitante

Si quieres que quien reciba un enlace de "Compartir viaje" pueda verlo en modo visitante
mientras espera a que le aceptes, también necesitas una clave de API:

1. En el mismo proyecto de Google Cloud, ve a **APIs y servicios > Credenciales > Crear
   credenciales > Clave de API**.
2. En "Restricciones de la API" marca solo **Google Drive API**.
3. En "Restricciones de la aplicación" elige **Referentes HTTP (sitios web)** y añade tu
   dominio, por ejemplo `https://tu-usuario.github.io/*`.
4. Copia la clave.

Si no la configuras, el resto de la app funciona igual — solo ese modo visitante no estará
disponible.

## 2. Configurar el proyecto

Abre `src/config.js` y pega tus credenciales:

```js
export const GOOGLE_CLIENT_ID = '1234567890-abcdefg.apps.googleusercontent.com';
export const GOOGLE_API_KEY = 'tu-clave-de-api'; // opcional, ver arriba
```

No necesitas ninguna otra clave: el mapa y el buscador de lugares usan servicios
gratuitos de OpenStreetMap que no requieren API key.

## 3. Ejecutar en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Al pulsar "Continuar con Google" te pedirá iniciar
sesión y conceder permiso para "ver, crear y modificar solo los archivos de Google
Drive que uses con esta app" (alcance `drive.file`): la app nunca ve ni toca el resto
de tu Drive.

## 4. Compilar para producción

```bash
npm run build
```

Esto genera la carpeta `dist/` con la app lista para subir a cualquier hosting
estático (GitHub Pages, Netlify, Vercel, Cloudflare Pages...). Recuerda añadir la
URL final a los "Orígenes de JavaScript autorizados" del paso 1.

## 5. Publicarla en GitHub Pages para que la use cualquiera

Puedes publicar tu propia instancia de Bitácora para que cualquier persona entre con
**su propia cuenta de Google** y use **su propio Drive** (nunca el tuyo).

1. Sube este proyecto a un repositorio de GitHub.
2. En GitHub, ve a **Settings > Pages** y en "Build and deployment" elige la fuente
   **GitHub Actions**. Este proyecto ya incluye el workflow
   `.github/workflows/deploy.yml`: cada `push` a `main` compila la app y la publica
   automáticamente.
3. Cuando termine el primer despliegue, GitHub te dará una URL del tipo
   `https://tu-usuario.github.io/tu-repo/`.
4. Vuelve a Google Cloud Console > Credenciales > tu Client ID y añade esa URL exacta
   a **Orígenes de JavaScript autorizados** (tiene que ser `https`, GitHub Pages ya lo
   sirve por defecto).
5. Si quieres usar tu propio dominio, configúralo en **Settings > Pages > Custom domain**
   y añade también ese dominio a los orígenes autorizados.

### Qué hace falta para que la use "cualquiera" (no solo tus usuarios de prueba)

Mientras la pantalla de consentimiento OAuth esté en modo **Prueba**, solo las cuentas
que añadas a mano como "Usuarios de prueba" podrán iniciar sesión (máximo 100). Para
abrirla de verdad al público tienes dos caminos:

- **Rápido (recomendado para un proyecto personal/hobby):** en Google Cloud Console,
  pasa la pantalla de consentimiento a estado **"En producción"**. Como el permiso
  `drive.file` es un "scope sensible", Google mostrará a los usuarios nuevos una
  pantalla de aviso ("Google no ha verificado esta app") con un enlace
  "Avanzado > Ir a Bitácora (no seguro)" para continuar. Es el mismo tipo de aviso que
  ves en mil proyectos personales o de código abierto: es seguro para el usuario
  (Google sigue controlando el login), simplemente indica que tú, como desarrollador,
  no has pasado la revisión formal de Google.
- **Formal (para un lanzamiento más serio):** solicita la
  [verificación de la app](https://support.google.com/cloud/answer/9110914) en la
  misma pantalla de consentimiento. Google te pedirá una URL de política de privacidad
  y de términos (este proyecto ya incluye unas páginas básicas en
  `public/privacy.html` y `public/terms.html`) y puede llevar desde unos días hasta un
  par de semanas. Una vez verificada, el aviso de "app no verificada" desaparece para
  todos los usuarios.

## Por qué es seguro para quien la use

- **No hay ningún secreto que filtrar.** El Client ID de Google no es confidencial:
  está pensado para ir incrustado en el código del navegador (por eso puedes subirlo a
  un repositorio público sin problema). Esta app no usa "Client Secret" porque el flujo
  de token implícito de Google Identity Services no lo necesita.
- **Acceso mínimo por diseño.** El permiso solicitado (`drive.file`) solo da acceso a
  los archivos y carpetas que la propia app crea. Aunque el código tuviera un fallo,
  no hay forma de que llegue a leer el resto del Drive de un usuario: Google nunca
  concede ese acceso con este scope.
- **Sin servidor, sin base de datos propia.** Todo el código se ejecuta en el
  navegador de cada persona y todos los datos (viajes, lugares, fotos) se guardan
  directamente en el Google Drive de esa misma persona. Quien publica la app en
  GitHub Pages no tiene acceso a los datos ni a las fotos de quienes la usan.
- **Cada usuario puede revocar el acceso cuando quiera** desde
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions), y
  borrar todo lo creado eliminando la carpeta "Bitácora" de su Drive.
- La app nunca usa la geolocalización real del navegador: el punto de partida de cada
  viaje es siempre un texto que escribe el propio usuario.

## Cómo funciona por dentro

- Al iniciar sesión, la app crea (si no existe) una carpeta visible **"Bitácora"**
  en la raíz del Google Drive del usuario.
- Cada viaje nuevo (por ejemplo "Islas Canarias") crea una subcarpeta con ese nombre,
  y dentro un archivo `trip.json` con el centro del mapa, el zoom inicial y la lista
  de lugares marcados.
- Cada lugar que el usuario añade (buscándolo o haciendo clic en el mapa) crea a su vez
  una subcarpeta dentro del viaje, donde se suben directamente las fotos de ese lugar.
  Así el usuario puede entrar a su Drive y ver la misma estructura de carpetas.
- Las fotos se listan siempre leyendo directamente esa carpeta de Drive (no se duplica
  información), y se comprimen en el propio navegador antes de subirse.
- Cada lugar guarda también una fecha de visita (opcional) y un color de marcador,
  editables en cualquier momento desde la propia galería del lugar.
- Las tres imágenes de resumen (Instagram, billete de avión, guía de metro) se generan
  enteramente en el navegador con la API Canvas, a partir de los datos del viaje: no se
  hace ninguna captura de mapa externa ni se sube nada a ningún servidor para crearlas.
- Compartir un viaje por enlace pone la carpeta en modo "cualquiera con el enlace,
  solo lectura"; quien lo abre entra en modo visitante y puede pedir unirse, y el
  anfitrión decide desde los ajustes del viaje si lo acepta como editor o como
  visitante.

## Estructura del proyecto

```
index.html
public/
  privacy.html       política de privacidad (para la verificación OAuth de Google)
  terms.html         términos de uso
  404.html           redirige a la app si alguien abre un enlace roto
.github/workflows/
  deploy.yml         publica dist/ en GitHub Pages en cada push a main
src/
  main.js            punto de entrada, cambia entre pantallas
  config.js          Client ID / API key de Google y ajustes básicos
  auth.js            login/logout con Google Identity Services
  drive.js           toda la lógica de lectura/escritura en Google Drive
  geocode.js         búsqueda y geocodificación inversa con Nominatim
  map.js             inicialización del mapa y marcadores con Leaflet
  colors.js          paleta de colores disponible para los marcadores
  gallery.js         modal de galería de fotos, fecha y color por lugar
  tripGallery.js     galería de fotos de todo un viaje
  tripSettings.js    ajustes del viaje: compartir, participantes, eliminar
  toast.js           notificaciones pequeñas
  state.js           estado compartido en memoria
  i18n.js            textos en español e inglés
  style.css          sistema visual (editorial, monocromo cálido)
  views/
    login.js
    dashboard.js
    trip.js
    topbar.js
  summary/
    modal.js          modal con pestañas para elegir y descargar el resumen
    instagram.js       dibuja el post cuadrado tipo Instagram
    boardingPass.js    dibuja el "billete de avión"
    metroMap.js        dibuja la guía estilo mapa de metro
    geo.js             proyección de coordenadas a un lienzo
    canvasUtils.js      utilidades de dibujo, tipografía y descarga de PNG
```
