// ---------------------------------------------------------------------------
// Internacionalizacion (i18n) minima para la interfaz: espanol de Espana e
// ingles. El nombre del producto ("Bitacora") nunca se traduce.
// ---------------------------------------------------------------------------

export const SUPPORTED_LANGS = ['es', 'en'];

const LANG_KEY = 'bitacora:lang';

export const STRINGS = {
  es: {
    // --- Genericos ---
    'lang.es': 'ES',
    'lang.en': 'EN',

    // --- Login ---
    'login.tagline': 'Tu mapa de viajes, con tus fotos',
    'login.description':
      'Elige un destino, marca los lugares por los que has pasado y guarda las fotos de cada uno. Todo se guarda directamente en tu Google Drive.',
    'login.continueGoogle': 'Continuar con Google',
    'login.privacyNote':
      'Solo se solicita acceso a una carpeta "Bitácora" propia dentro de tu Drive; no accedemos al resto de tus archivos.',
    'login.configureClientId': 'Configura GOOGLE_CLIENT_ID en src/config.js antes de continuar.',
    'login.signInGenericError': 'No se pudo iniciar sesión con Google.',
    'login.configWarning':
      'Falta configurar las credenciales de Google. Abre <code>src/config.js</code> y pega tu Client ID de OAuth (mira README.md para los pasos completos en Google Cloud Console).',
    'login.notReadyGeneric': 'El inicio de sesión no está disponible ahora mismo. Vuelve a intentarlo más tarde.',

    // --- Topbar ---
    'topbar.backToTrips': 'Viajes',
    'topbar.signOut': 'Salir',
    'topbar.settings': 'Ajustes del viaje',

    // --- Dashboard ---
    'dashboard.title': 'Tus viajes',
    'dashboard.subtitle': 'Cada viaje guarda sus lugares y fotos en una carpeta propia dentro de tu Google Drive.',
    'dashboard.newTripButton': 'Nuevo viaje',
    'dashboard.newTripModalTitle': 'Empezar un viaje nuevo',
    'dashboard.newTripHint': 'Escribe un país, región o ciudad (no usamos tu ubicación real). Por ejemplo: "Islas Canarias".',
    'dashboard.newTripPlaceholder': '¿A dónde vamos? ✈️',
    'dashboard.loadingTrips': 'Cargando tus viajes...',
    'dashboard.loadTripsError': 'No se pudieron cargar los viajes: {{message}}',
    'dashboard.createTripError': 'No se pudo crear el viaje.',
    'dashboard.noTrips': 'Todavía no tienes ningún viaje. Crea el primero arriba.',
    'dashboard.datesTBD': 'Fechas por definir',
    'dashboard.placesOne': '1 lugar',
    'dashboard.placesOther': '{{count}} lugares',
    'dashboard.noPlaces': 'Sin lugares todavía',
    'dashboard.deleteTripAction': 'Eliminar viaje',
    'dashboard.deleteTripConfirm': '¿Eliminar "{{name}}"?',
    'dashboard.deleteTripYes': 'Sí, eliminar',
    'dashboard.deleteTripCancel': 'Cancelar',
    'dashboard.deleteTripError': 'No se pudo eliminar el viaje.',

    // --- Trip screen ---
    'trip.loading': 'Cargando...',
    'trip.viewGallery': 'Ver galería',
    'trip.generateSummary': 'Generar resumen',
    'trip.searchPlacePlaceholder': 'Buscar y añadir un lugar',
    'trip.mapAddHint': 'Haz clic en el mapa para añadir un lugar',
    'trip.loadError': 'No se pudo cargar el viaje.',
    'trip.defaultName': 'Viaje',
    'trip.noDate': 'Sin fecha',
    'trip.placesSavedOne': '1 lugar guardado',
    'trip.placesSavedOther': '{{count}} lugares guardados',
    'trip.noPlacesYet': 'Aún no has añadido ningún lugar. Busca uno o haz clic en el mapa.',
    'trip.saveChangeError': 'No se pudo guardar el cambio en Drive.',
    'trip.savePlaceError': 'No se pudo guardar el lugar en Drive.',
    'trip.createPlaceError': 'No se pudo crear el lugar.',
    'trip.namePromptTitle': 'Nombre de este lugar',
    'trip.namePromptDescription': 'Se añadirá como un lugar nuevo en tu viaje.',
    'trip.namePromptConfirm': 'Añadir lugar',
    'trip.moveUp': 'Subir',
    'trip.moveDown': 'Bajar',

    // --- Trip settings modal ---
    'tripSettings.title': 'Ajustes del viaje',
    'tripSettings.close': 'Cerrar',
    'tripSettings.renameLabel': 'Nombre del viaje',
    'tripSettings.renameSave': 'Guardar',
    'tripSettings.renameSuccess': 'Nombre actualizado.',
    'tripSettings.renameError': 'No se pudo cambiar el nombre.',
    'tripSettings.shareTitle': 'Compartir por enlace',
    'tripSettings.shareHint':
      'Genera un enlace de solo lectura a las fotos de este viaje. Quien lo reciba podrá verlas, pero no editar ni añadir nada.',
    'tripSettings.shareGenerate': 'Generar y copiar enlace',
    'tripSettings.shareCopied': 'Enlace copiado al portapapeles.',
    'tripSettings.shareError': 'No se pudo generar el enlace.',
    'tripSettings.shareRevoke': 'Dejar de compartir',
    'tripSettings.shareRevoked': 'Enlace desactivado.',
    'tripSettings.shareRevokeError': 'No se pudo desactivar el enlace.',
    'tripSettings.dangerTitle': 'Zona de peligro',
    'tripSettings.dangerHint': 'Esta acción mueve el viaje (y sus fotos) a la papelera de tu Google Drive.',
    'tripSettings.deleteAction': 'Eliminar viaje',
    'tripSettings.deleteConfirm': '¿Seguro que quieres eliminarlo?',
    'tripSettings.deleteYes': 'Sí, eliminar',
    'tripSettings.deleteCancel': 'Cancelar',
    'tripSettings.deleteError': 'No se pudo eliminar el viaje.',

    // --- Toast (default / fallback) ---
    'toast.error': 'Ha ocurrido un error.',

    // --- Prompt modal ---
    'prompt.defaultTitle': 'Nombre de este lugar',
    'prompt.defaultConfirm': 'Añadir',
    'prompt.defaultPlaceholder': 'Escribe un nombre...',
    'prompt.cancel': 'Cancelar',

    // --- Gallery (place photos modal) ---
    'gallery.savedInDrive': 'Fotos guardadas en tu Google Drive',
    'gallery.close': 'Cerrar',
    'gallery.visitDate': 'Fecha de la visita',
    'gallery.markerColor': 'Color del marcador',
    'gallery.detailsTitle': 'Detalles del lugar',
    'gallery.detailsHint': 'Restaurantes, calles, monumentos... anota lo que quieras recordar.',
    'gallery.detailsPlaceholder': 'Ej: Restaurante Casa Pepe',
    'gallery.add': 'Añadir',
    'gallery.noDetailsYet': 'Sin detalles todavía.',
    'gallery.removeNote': 'Eliminar',
    'gallery.addPhotos': 'Añadir fotos',
    'gallery.galleryLabel': 'Galería',
    'gallery.galleryLabelCount': 'Galería · {{count}}',
    'gallery.photoCountOne': '1 foto',
    'gallery.photoCountOther': '{{count}} fotos',
    'gallery.edit': 'Editar',
    'gallery.cancelEdit': 'Cancelar',
    'gallery.delete': 'Eliminar',
    'gallery.deleteCount': 'Eliminar ({{count}})',
    'gallery.deleting': 'Eliminando...',
    'gallery.deleteError': 'No se pudieron eliminar {{count}} foto(s)',
    'gallery.uploadError': 'No se pudo subir {{name}}',
    'gallery.loadingPhotos': 'Cargando fotos...',
    'gallery.noPhotosYet': 'Aún no hay fotos en este lugar. Pulsa + para subir la primera.',
    'gallery.photoError': 'Error',
    'gallery.loadPhotosError': 'No se pudieron cargar las fotos.',

    // --- Trip gallery (whole-trip photos modal) ---
    'tripGallery.title': 'Fotos del viaje',
    'tripGallery.loadingPhotos': 'Cargando fotos...',
    'tripGallery.grid': 'Cuadrícula',
    'tripGallery.carousel': 'Carrusel',
    'tripGallery.close': 'Cerrar',
    'tripGallery.loadError': 'No se pudieron cargar las fotos.',
    'tripGallery.photoCountOne': '1 foto',
    'tripGallery.photoCountOther': '{{count}} fotos',
    'tripGallery.noPhotosYet': 'Todavía no hay fotos en este viaje',
    'tripGallery.noPhotosHint': 'Sube fotos a algún lugar del viaje para verlas aquí.',
    'tripGallery.prev': 'Anterior',
    'tripGallery.next': 'Siguiente',
    'tripGallery.photoError': 'Error',
    'tripGallery.carouselLoadError': 'No se pudo cargar la foto.',

    // --- Summary modal ---
    'summaryModal.title': 'Resumen para compartir',
    'summaryModal.subtitle': 'Genera una imagen lista para publicar en redes sociales.',
    'summaryModal.close': 'Cerrar',
    'summaryModal.tabMap': 'Mapa',
    'summaryModal.tabBoardingPass': 'Billete de avión',
    'summaryModal.tabMetro': 'Guía de metro',
    'summaryModal.snapshotTitle': 'Título de la instantánea',
    'summaryModal.passengerName': 'Nombre del pasajero',
    'summaryModal.colorStyle': 'Estilo de color',
    'summaryModal.download': 'Descargar imagen',

    // --- Canvas summaries ---
    'summary.footerMadeWith': 'Hecho con ·',
    'summary.instagram.eyebrow': 'DIARIO DE VIAJE',
    'summary.instagram.defaultTitle': 'Mi viaje',
    'summary.instagram.noDatesYet': 'Sin fechas todavía',
    'summary.instagram.placesOne': '1 lugar',
    'summary.instagram.placesOther': '{{count}} lugares',
    'summary.instagram.noPlacesYet': 'Todavía no hay lugares marcados',
    'summary.boarding.headerTag': 'TARJETA DE EMBARQUE · BITÁCORA',
    'summary.boarding.passenger': 'PASAJERO',
    'summary.boarding.defaultPassenger': 'VIAJERO',
    'summary.boarding.destination': 'DESTINO',
    'summary.boarding.unknownDestination': 'Destino desconocido',
    'summary.boarding.departure': 'SALIDA',
    'summary.boarding.arrival': 'LLEGADA',
    'summary.boarding.places': 'LUGARES',
    'summary.boarding.scanToSeePhotos': 'Escanea para ver las fotos',
    'summary.boarding.generatingCode': 'Generando código…',
    'summary.boarding.linkUnavailable': 'Enlace no disponible',
    'summary.boarding.generateError': 'Error al generar',
    'summary.metro.eyebrow': 'GUÍA DE VIAJE',
    'summary.metro.linePrefix': 'Línea',
    'summary.metro.stationsOne': '1 estación visitada',
    'summary.metro.stationsOther': '{{count}} estaciones visitadas',
    'summary.metro.addPlacesHint': 'Añade lugares al viaje para generar la línea',
  },
  en: {
    // --- Generic ---
    'lang.es': 'ES',
    'lang.en': 'EN',

    // --- Login ---
    'login.tagline': 'Your travel map, with your own photos',
    'login.description':
      'Pick a destination, mark the places you visited and keep the photos for each one. Everything is saved directly to your Google Drive.',
    'login.continueGoogle': 'Continue with Google',
    'login.privacyNote':
      'We only request access to your own "Bitácora" folder inside your Drive; we never access the rest of your files.',
    'login.configureClientId': 'Set GOOGLE_CLIENT_ID in src/config.js before continuing.',
    'login.signInGenericError': 'Could not sign in with Google.',
    'login.configWarning':
      'Google credentials are not configured yet. Open <code>src/config.js</code> and paste your OAuth Client ID (see README.md for the full steps in Google Cloud Console).',
    'login.notReadyGeneric': "Sign-in isn't available right now. Please try again later.",

    // --- Topbar ---
    'topbar.backToTrips': 'Trips',
    'topbar.signOut': 'Sign out',
    'topbar.settings': 'Trip settings',

    // --- Dashboard ---
    'dashboard.title': 'Your trips',
    'dashboard.subtitle': 'Each trip keeps its places and photos in its own folder inside your Google Drive.',
    'dashboard.newTripButton': 'New trip',
    'dashboard.newTripModalTitle': 'Start a new trip',
    'dashboard.newTripHint': 'Type a country, region or city (we never use your real location). For example: "Canary Islands".',
    'dashboard.newTripPlaceholder': 'Where are we going? ✈️',
    'dashboard.loadingTrips': 'Loading your trips...',
    'dashboard.loadTripsError': 'Could not load your trips: {{message}}',
    'dashboard.createTripError': 'Could not create the trip.',
    'dashboard.noTrips': 'You have no trips yet. Create your first one above.',
    'dashboard.datesTBD': 'Dates to be defined',
    'dashboard.placesOne': '1 place',
    'dashboard.placesOther': '{{count}} places',
    'dashboard.noPlaces': 'No places yet',
    'dashboard.deleteTripAction': 'Delete trip',
    'dashboard.deleteTripConfirm': 'Delete "{{name}}"?',
    'dashboard.deleteTripYes': 'Yes, delete',
    'dashboard.deleteTripCancel': 'Cancel',
    'dashboard.deleteTripError': 'Could not delete the trip.',

    // --- Trip screen ---
    'trip.loading': 'Loading...',
    'trip.viewGallery': 'View gallery',
    'trip.generateSummary': 'Generate summary',
    'trip.searchPlacePlaceholder': 'Search and add a place',
    'trip.mapAddHint': 'Click the map to add a place',
    'trip.loadError': 'Could not load the trip.',
    'trip.defaultName': 'Trip',
    'trip.noDate': 'No date',
    'trip.placesSavedOne': '1 place saved',
    'trip.placesSavedOther': '{{count}} places saved',
    'trip.noPlacesYet': "You haven't added any place yet. Search for one or click the map.",
    'trip.saveChangeError': 'Could not save the change to Drive.',
    'trip.savePlaceError': 'Could not save the place to Drive.',
    'trip.createPlaceError': 'Could not create the place.',
    'trip.namePromptTitle': 'Name this place',
    'trip.namePromptDescription': 'It will be added as a new place in your trip.',
    'trip.namePromptConfirm': 'Add place',
    'trip.moveUp': 'Move up',
    'trip.moveDown': 'Move down',

    // --- Trip settings modal ---
    'tripSettings.title': 'Trip settings',
    'tripSettings.close': 'Close',
    'tripSettings.renameLabel': 'Trip name',
    'tripSettings.renameSave': 'Save',
    'tripSettings.renameSuccess': 'Name updated.',
    'tripSettings.renameError': 'Could not change the name.',
    'tripSettings.shareTitle': 'Share by link',
    'tripSettings.shareHint':
      "Generate a read-only link to this trip's photos. Whoever gets it can view them, but not edit or add anything.",
    'tripSettings.shareGenerate': 'Generate and copy link',
    'tripSettings.shareCopied': 'Link copied to clipboard.',
    'tripSettings.shareError': 'Could not generate the link.',
    'tripSettings.shareRevoke': 'Stop sharing',
    'tripSettings.shareRevoked': 'Link disabled.',
    'tripSettings.shareRevokeError': 'Could not disable the link.',
    'tripSettings.dangerTitle': 'Danger zone',
    'tripSettings.dangerHint': 'This moves the trip (and its photos) to your Google Drive trash.',
    'tripSettings.deleteAction': 'Delete trip',
    'tripSettings.deleteConfirm': 'Are you sure you want to delete it?',
    'tripSettings.deleteYes': 'Yes, delete',
    'tripSettings.deleteCancel': 'Cancel',
    'tripSettings.deleteError': 'Could not delete the trip.',

    // --- Toast (default / fallback) ---
    'toast.error': 'Something went wrong.',

    // --- Prompt modal ---
    'prompt.defaultTitle': 'Name this place',
    'prompt.defaultConfirm': 'Add',
    'prompt.defaultPlaceholder': 'Type a name...',
    'prompt.cancel': 'Cancel',

    // --- Gallery (place photos modal) ---
    'gallery.savedInDrive': 'Photos saved to your Google Drive',
    'gallery.close': 'Close',
    'gallery.visitDate': 'Visit date',
    'gallery.markerColor': 'Marker color',
    'gallery.detailsTitle': 'Place details',
    'gallery.detailsHint': 'Restaurants, streets, landmarks... jot down whatever you want to remember.',
    'gallery.detailsPlaceholder': 'E.g.: Casa Pepe restaurant',
    'gallery.add': 'Add',
    'gallery.noDetailsYet': 'No details yet.',
    'gallery.removeNote': 'Remove',
    'gallery.addPhotos': 'Add photos',
    'gallery.galleryLabel': 'Gallery',
    'gallery.galleryLabelCount': 'Gallery · {{count}}',
    'gallery.photoCountOne': '1 photo',
    'gallery.photoCountOther': '{{count}} photos',
    'gallery.edit': 'Edit',
    'gallery.cancelEdit': 'Cancel',
    'gallery.delete': 'Delete',
    'gallery.deleteCount': 'Delete ({{count}})',
    'gallery.deleting': 'Deleting...',
    'gallery.deleteError': 'Could not delete {{count}} photo(s)',
    'gallery.uploadError': 'Could not upload {{name}}',
    'gallery.loadingPhotos': 'Loading photos...',
    'gallery.noPhotosYet': 'No photos here yet. Tap + to upload the first one.',
    'gallery.photoError': 'Error',
    'gallery.loadPhotosError': 'Could not load the photos.',

    // --- Trip gallery (whole-trip photos modal) ---
    'tripGallery.title': 'Trip photos',
    'tripGallery.loadingPhotos': 'Loading photos...',
    'tripGallery.grid': 'Grid',
    'tripGallery.carousel': 'Carousel',
    'tripGallery.close': 'Close',
    'tripGallery.loadError': 'Could not load the photos.',
    'tripGallery.photoCountOne': '1 photo',
    'tripGallery.photoCountOther': '{{count}} photos',
    'tripGallery.noPhotosYet': 'There are no photos in this trip yet',
    'tripGallery.noPhotosHint': 'Upload photos to a place in the trip to see them here.',
    'tripGallery.prev': 'Previous',
    'tripGallery.next': 'Next',
    'tripGallery.photoError': 'Error',
    'tripGallery.carouselLoadError': 'Could not load the photo.',

    // --- Summary modal ---
    'summaryModal.title': 'Summary to share',
    'summaryModal.subtitle': 'Generate an image ready to post on social media.',
    'summaryModal.close': 'Close',
    'summaryModal.tabMap': 'Map',
    'summaryModal.tabBoardingPass': 'Boarding pass',
    'summaryModal.tabMetro': 'Metro guide',
    'summaryModal.snapshotTitle': 'Snapshot title',
    'summaryModal.passengerName': 'Passenger name',
    'summaryModal.colorStyle': 'Color style',
    'summaryModal.download': 'Download image',

    // --- Canvas summaries ---
    'summary.footerMadeWith': 'Made with ·',
    'summary.instagram.eyebrow': 'TRAVEL DIARY',
    'summary.instagram.defaultTitle': 'My trip',
    'summary.instagram.noDatesYet': 'No dates yet',
    'summary.instagram.placesOne': '1 place',
    'summary.instagram.placesOther': '{{count}} places',
    'summary.instagram.noPlacesYet': 'No places marked yet',
    'summary.boarding.headerTag': 'BOARDING PASS · BITÁCORA',
    'summary.boarding.passenger': 'PASSENGER',
    'summary.boarding.defaultPassenger': 'TRAVELER',
    'summary.boarding.destination': 'DESTINATION',
    'summary.boarding.unknownDestination': 'Unknown destination',
    'summary.boarding.departure': 'DEPARTURE',
    'summary.boarding.arrival': 'ARRIVAL',
    'summary.boarding.places': 'PLACES',
    'summary.boarding.scanToSeePhotos': 'Scan to see the photos',
    'summary.boarding.generatingCode': 'Generating code…',
    'summary.boarding.linkUnavailable': 'Link unavailable',
    'summary.boarding.generateError': 'Error generating',
    'summary.metro.eyebrow': 'TRAVEL GUIDE',
    'summary.metro.linePrefix': 'Line',
    'summary.metro.stationsOne': '1 station visited',
    'summary.metro.stationsOther': '{{count}} stations visited',
    'summary.metro.addPlacesHint': 'Add places to the trip to generate the line',
  },
};

export function getLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch (err) {
    // localStorage no disponible: seguimos con el valor por defecto.
  }
  return 'es';
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (err) {
    // localStorage no disponible: el cambio solo dura la sesion en memoria.
  }
  window.dispatchEvent(new CustomEvent('td:langchange'));
}

/** Markup for the small ES/EN language switcher. */
export function langSwitcherHtml() {
  const lang = getLang();
  return `
    <div class="lang-switch" data-role="lang-switch">
      <button type="button" class="lang-switch-btn ${lang === 'es' ? 'active' : ''}" data-lang="es">${t('lang.es')}</button>
      <button type="button" class="lang-switch-btn ${lang === 'en' ? 'active' : ''}" data-lang="en">${t('lang.en')}</button>
    </div>
  `;
}

/** Binds click handlers on a container that already includes langSwitcherHtml(). */
export function bindLangSwitcher(container) {
  const el = container.querySelector('[data-role="lang-switch"]');
  if (!el) return;
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-switch-btn');
    if (!btn) return;
    setLang(btn.dataset.lang);
  });
}

export function t(key, vars) {
  const lang = getLang();
  let value = STRINGS[lang]?.[key];
  if (value === undefined) value = STRINGS.es[key];
  if (value === undefined) return key;
  if (vars) {
    for (const [name, val] of Object.entries(vars)) {
      value = value.replaceAll(`{{${name}}}`, String(val));
    }
  }
  return value;
}
