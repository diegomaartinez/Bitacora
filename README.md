# Bitácora

Diario de viaje interactivo. El usuario elige un destino (sin usar su ubicacion real),
ve un mapa de esa zona, va marcando los lugares por los que ha pasado y sube fotos de
cada uno. Todo — lugares y fotos — se guarda en una carpeta **"Bitácora"** dentro
del propio Google Drive del usuario, visible y organizada por viajes.

Es una aplicacion 100% de cliente (sin servidor propio): el inicio de sesion con Google
y la subida de archivos a Drive se hacen directamente desde el navegador. Eso tambien es
lo que la hace facil de publicar de forma segura (ver la seccion de despliegue mas abajo):
no hay ningun secreto de servidor que proteger.

Cada lugar admite una fecha de visita y un color de marcador a elegir. Desde el boton
"Generar resumen" de cada viaje se pueden crear tres imagenes listas para compartir en
redes: un post cuadrado tipo Instagram con el mapa y los marcadores, un "billete de
avion" con el destino y las fechas, y una guia estilo mapa de metro con una linea que
une los lugares visitados en orden.


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
   - En **Scopes** no hace falta anadir nada manualmente (la app los pide en tiempo de
     ejecucion), pero si el asistente lo pide puedes anadir `drive.file`, `email` y `profile`.
   - En **Usuarios de prueba**, anade tu propia cuenta de Gmail (y la de cualquier otra
     persona que vaya a usar la app mientras no la publiques). Mientras la app este en
     modo "Prueba", solo estas cuentas podran iniciar sesion.
4. Ve a **APIs y servicios > Credenciales > Crear credenciales > ID de cliente de OAuth**:
   - Tipo de aplicacion: **Aplicacion web**.
   - En **Origenes de JavaScript autorizados** anade las URLs desde las que abriras la app,
     por ejemplo:
     - `http://localhost:5173` (para desarrollo local con `npm run dev`)
     - la URL donde la despliegues despues (por ejemplo `https://tu-usuario.github.io`)
   - No hace falta configurar "URI de redireccion": esta app usa el flujo de token
     implicito de Google Identity Services, no redirecciones de servidor.
5. Copia el **Client ID** generado (termina en `.apps.googleusercontent.com`).

## 2. Configurar el proyecto

Abre `src/config.js` y pega tu Client ID:

```js
export const GOOGLE_CLIENT_ID = '1234567890-abcdefg.apps.googleusercontent.com';
```

No necesitas ninguna otra clave: el mapa y el buscador de lugares usan servicios
gratuitos de OpenStreetMap que no requieren API key.

## 3. Ejecutar en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Al pulsar "Continuar con Google" te pedira iniciar
sesion y conceder permiso para "ver, crear y modificar solo los archivos de Google
Drive que uses con esta app" (alcance `drive.file`): la app nunca ve ni toca el resto
de tu Drive.

## 4. Compilar para produccion

```bash
npm run build
```

Esto genera la carpeta `dist/` con la app lista para subir a cualquier hosting
estatico (GitHub Pages, Netlify, Vercel, Cloudflare Pages...). Recuerda anadir la
URL final a los "Origenes de JavaScript autorizados" del paso 1.

## 5. Publicarla en GitHub Pages para que la use cualquiera

Puedes publicar tu propia instancia de Bitácora para que cualquier persona entre con
**su propia cuenta de Google** y use **su propio Drive** (nunca el tuyo). Es seguro
porque, como se explica mas abajo, la app nunca ve ni toca nada fuera de la carpeta
que ella misma crea en el Drive de cada usuario.

1. Sube este proyecto a un repositorio publico de GitHub (puede ser el mismo que ya
   tienes en `travel-diary`).
2. En GitHub, ve a **Settings > Pages** y en "Build and deployment" elige la fuente
   **GitHub Actions**. Este proyecto ya incluye el workflow
   `.github/workflows/deploy.yml`: cada `push` a `main` compila la app y la publica
   automaticamente.
3. Cuando termine el primer despliegue, GitHub te dara una URL del tipo
   `https://tu-usuario.github.io/travel-diary/`.
4. Vuelve a Google Cloud Console > Credenciales > tu Client ID y anade esa URL exacta
   a **Origenes de JavaScript autorizados** (tiene que ser `https`, GitHub Pages ya lo
   sirve por defecto).
5. Si quieres usar tu propio dominio, configuralo en **Settings > Pages > Custom domain**
   y anade tambien ese dominio a los origenes autorizados.

### Que hace falta para que la use "cualquiera" (no solo tus usuarios de prueba)

Mientras la pantalla de consentimiento OAuth este en modo **Prueba**, solo las cuentas
que anadas a mano como "Usuarios de prueba" podran iniciar sesion (maximo 100). Para
abrirla de verdad al publico tienes dos caminos:

- **Rapido (recomendado para un proyecto personal/hobby):** en Google Cloud Console,
  pasa la pantalla de consentimiento a estado **"En produccion"**. Como el permiso
  `drive.file` es un "scope sensible", Google mostrara a los usuarios nuevos una
  pantalla de aviso ("Google no ha verificado esta app") con un enlace
  "Avanzado > Ir a Bitácora (no seguro)" para continuar. Es el mismo tipo de aviso que
  ves en mil proyectos personales o de codigo abierto: es seguro para el usuario
  (Google seguira controlando el login), simplemente indica que tu, como
  desarrollador, no has pasado la revision formal de Google.
- **Formal (para un lanzamiento mas serio):** solicita la
  [verificacion de la app](https://support.google.com/cloud/answer/9110914) en la
  misma pantalla de consentimiento. Google te pedira una URL de politica de privacidad
  y de terminos (este proyecto ya incluye unas paginas basicas en
  `public/privacy.html` y `public/terms.html`, que quedaran publicadas automaticamente
  en `https://tu-usuario.github.io/travel-diary/privacy.html`) y puede llevar desde
  unos dias hasta un par de semanas. Una vez verificada, el aviso de "app no verificada"
  desaparece para todos los usuarios.

### Por que es seguro para quien la use

- **No hay ningun secreto que filtrar.** El Client ID de Google no es confidencial:
  esta pensado para ir incrustado en el codigo del navegador (por eso puedes subirlo a
  un repositorio publico sin problema). Esta app no usa "Client Secret" porque el flujo
  de token implicito de Google Identity Services no lo necesita.
- **Acceso minimo por diseno.** El permiso solicitado (`drive.file`) solo da acceso a
  los archivos y carpetas que la propia app crea. Aunque el codigo tuviera un fallo,
  no hay forma de que llegue a leer el resto del Drive de un usuario: Google nunca
  concede ese acceso con este scope.
- **Sin servidor, sin base de datos propia.** Todo el codigo se ejecuta en el
  navegador de cada persona y todos los datos (viajes, lugares, fotos) se guardan
  directamente en el Google Drive de esa misma persona. Quien publica la app en
  GitHub Pages no tiene acceso a los datos ni a las fotos de quienes la usan.
- **Cada usuario puede revocar el acceso cuando quiera** desde
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions), y
  borrar todo lo creado eliminando la carpeta "Bitácora" de su Drive.
- Revisa siempre que la URL publicada use `https://` (GitHub Pages lo hace por
  defecto): Google Identity Services no permite iniciar sesion desde origenes `http://`
  que no sean `localhost`.

## Como funciona por dentro

- Al iniciar sesion, la app crea (si no existe) una carpeta visible **"Bitácora"**
  en la raiz del Google Drive del usuario.
- Cada viaje nuevo (por ejemplo "Islas Canarias") crea una subcarpeta con ese nombre,
  y dentro un archivo `trip.json` con el centro del mapa, el zoom inicial y la lista
  de lugares marcados.
- Cada lugar que el usuario anade (buscandolo o haciendo clic en el mapa) crea a su vez
  una subcarpeta dentro del viaje, donde se suben directamente las fotos de ese lugar.
  Asi el usuario puede entrar a su Drive y ver la misma estructura de carpetas.
- Las fotos se listan siempre leyendo directamente esa carpeta de Drive (no se duplica
  informacion), y se descargan bajo demanda como miniaturas para la galeria.
- Cada lugar guarda tambien una fecha de visita (opcional) y un color de marcador,
  editables en cualquier momento desde la propia galeria del lugar.
- Las tres imagenes de resumen (Instagram, billete de avion, guia de metro) se generan
  enteramente en el navegador con la API Canvas, a partir de los datos del viaje: no se
  hace ninguna captura de mapa externa ni se sube nada a ningun servidor para crearlas.

## Estructura del proyecto

```
index.html
public/
  privacy.html       politica de privacidad (para la verificacion OAuth de Google)
  terms.html         terminos de uso
.github/workflows/
  deploy.yml         publica dist/ en GitHub Pages en cada push a main
src/
  main.js            punto de entrada, cambia entre pantallas
  config.js          Client ID de Google y ajustes basicos
  auth.js            login/logout con Google Identity Services
  drive.js           toda la logica de lectura/escritura en Google Drive
  geocode.js         busqueda y geocodificacion inversa con Nominatim
  map.js             inicializacion del mapa y marcadores con Leaflet (color, hover)
  colors.js          paleta de colores disponible para los marcadores
  gallery.js         modal de galeria de fotos, fecha y color por lugar
  toast.js           notificaciones pequenas
  state.js           estado compartido en memoria
  style.css          sistema visual (editorial, monocromo calido)
  views/
    login.js
    dashboard.js
    trip.js
    topbar.js
  summary/
    modal.js         modal con pestanas para elegir y descargar el resumen
    instagram.js      dibuja el post cuadrado tipo Instagram
    boardingPass.js   dibuja el "billete de avion"
    metroMap.js       dibuja la guia estilo mapa de metro
    geo.js            proyeccion de coordenadas a un lienzo
    canvasUtils.js    utilidades de dibujo, tipografia y descarga de PNG
```

## Notas de privacidad y seguridad

- La app nunca usa la geolocalizacion real del navegador; el punto de partida de cada
  viaje es siempre un texto que escribe el propio usuario.
- El alcance de permiso solicitado (`drive.file`) limita el acceso solo a los archivos
  que la propia app crea, no a todo el Drive del usuario.
- Mientras la pantalla de consentimiento OAuth este en modo "Prueba", solo podran
  iniciar sesion las cuentas que anadas como "Usuarios de prueba" en el paso 1. La
  seccion "Publicarla en GitHub Pages" mas arriba explica como abrirla a cualquier
  persona de forma segura.
- No hay ningun Client Secret en este proyecto: todo el codigo, incluido el Client ID,
  puede vivir en un repositorio publico sin ningun riesgo.
