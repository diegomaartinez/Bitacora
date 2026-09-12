import { getTripData, saveTripData, ensurePlaceFolder, renameDriveFolder } from '../drive.js';
import { searchPlace, reverseGeocode } from '../geocode.js';
import { createMap, addPlaceMarker, updateMarkerAppearance, flyTo } from '../map.js';
import { openGallery } from '../gallery.js';
import { openTripGallery } from '../tripGallery.js';
import { openSummaryModal } from '../summary/modal.js';
import { openNamePrompt } from '../promptModal.js';
import { openTripSettings } from '../tripSettings.js';
import { showToast } from '../toast.js';
import { renderTopbar } from './topbar.js';
import { colorHex, colorForIndex } from '../colors.js';
import { t } from '../i18n.js';

let debounceTimer = null;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function renderTrip(root, { token, profile, tripFolderId, onBack }) {
  root.innerHTML = `
    <div class="trip-screen">
      <div data-role="topbar"></div>
      <div class="trip-body">
        <aside class="trip-sidebar">
          <div class="trip-sidebar-header">
            <h2 data-role="trip-title">${t('trip.loading')}</h2>
            <p data-role="trip-subtitle"></p>
            <div class="sidebar-actions">
              <button class="btn btn-secondary" data-action="gallery">${t('trip.viewGallery')}</button>
              <button class="btn btn-secondary" data-action="summary">${t('trip.generateSummary')}</button>
              <button class="btn btn-secondary map-toggle-btn" data-action="toggle-map">${t('trip.viewMap')}</button>
            </div>
          </div>
          <div class="place-search" data-role="place-search">
            <input type="text" placeholder="${t('trip.searchPlacePlaceholder')}" data-role="place-input" autocomplete="off" />
            <ul class="suggestion-list" data-role="place-suggestions" style="display:none"></ul>
          </div>
          <ul class="place-list" data-role="place-list"></ul>
        </aside>
        <div class="map-wrapper" data-role="map-wrapper">
          <button type="button" class="map-close-btn" data-action="close-map" aria-label="${t('trip.closeMap')}">✕</button>
          <div id="map"></div>
          <div class="map-add-hint" data-role="map-add-hint">${t('trip.mapAddHint')}</div>
        </div>
      </div>
    </div>
  `;

  let tripData = null;
  let map = null;
  const markers = new Map();

  try {
    tripData = await getTripData(token, tripFolderId);
  } catch (err) {
    showToast(t('trip.loadError'), { error: true });
  }

  if (!tripData) {
    tripData = { name: t('trip.defaultName'), center: { lat: 28.29, lng: -16.63 }, zoom: 8, places: [] };
  }
  // Compatibilidad con viajes creados antes de tener fecha/hora/color por lugar.
  tripData.places.forEach((p, i) => {
    if (!p.color) p.color = colorForIndex(i);
    if (p.date === undefined) p.date = null;
    if (p.time === undefined) p.time = null;
    if (!Array.isArray(p.notes)) p.notes = [];
  });
  // Compatibilidad con viajes creados antes de tener anfitrion/colaboradores.
  // Si el viaje no tiene anfitrion guardado, asumimos que quien lo abre
  // ahora (normalmente su creador original) lo es.
  if (!tripData.ownerEmail) tripData.ownerEmail = profile?.email || null;
  if (!tripData.ownerName) tripData.ownerName = profile?.name || null;
  if (!Array.isArray(tripData.collaborators)) tripData.collaborators = [];

  const isOwner = !tripData.ownerEmail || tripData.ownerEmail.toLowerCase() === (profile?.email || '').toLowerCase();
  const myCollaboratorEntry = tripData.collaborators.find(
    (c) => c.email.toLowerCase() === (profile?.email || '').toLowerCase()
  );
  // Un colaborador "viewer" puede ver todo el viaje (mapa, lugares, fotos,
  // resumenes) pero no anadir ni cambiar nada.
  const canEdit = isOwner || myCollaboratorEntry?.role !== 'viewer';
  if (!canEdit) {
    root.querySelector('[data-role="place-search"]')?.setAttribute('hidden', '');
    root.querySelector('[data-role="map-add-hint"]')?.setAttribute('hidden', '');
  }

  function renderTripTopbar() {
    renderTopbar(root.querySelector('[data-role="topbar"]'), {
      profile,
      title: tripData.name,
      onBack,
      onSignOut: () => window.dispatchEvent(new CustomEvent('td:signout')),
      onSettings: () =>
        openTripSettings({
          token,
          tripData,
          tripFolderId,
          profile,
          isOwner,
          onRenamed: (name) => {
            root.querySelector('[data-role="trip-title"]').textContent = name;
            renderTripTopbar();
          },
          onDeleted: onBack,
        }),
    });
  }

  renderTripTopbar();

  root.querySelector('[data-role="trip-title"]').textContent = tripData.name;

  map = createMap(root.querySelector('#map'), { center: tripData.center, zoom: tripData.zoom });

  root.querySelector('[data-action="summary"]').addEventListener('click', () => {
    openSummaryModal({ tripData, profile, token, tripFolderId });
  });

  root.querySelector('[data-action="gallery"]').addEventListener('click', () => {
    openTripGallery(token, tripData, canEdit);
  });

  // En movil el mapa empieza oculto (la lista de lugares es lo principal);
  // este boton lo abre a pantalla completa, y el de cerrar lo vuelve a ocultar.
  const mapWrapperEl = root.querySelector('[data-role="map-wrapper"]');
  // Recuerda el ultimo lugar en el que se hizo click en la lista, para poder
  // centrar el mapa en el cuando se abra en movil (ahi no se pudo centrar en
  // el momento del click porque el mapa estaba oculto, ver renderPlaceList).
  let lastSelectedPlace = null;
  // En movil el contenedor del mapa esta a `display:none` mientras no se
  // abre: Leaflet no puede animar (flyTo) un mapa sin tamano y lanza
  // "Invalid LatLng object", asi que directamente no lo intentamos si no
  // esta visible (en vez de dejar que falle y quede una animacion
  // fallando de fondo).
  function isMapVisible() {
    return mapWrapperEl.offsetParent !== null;
  }
  function safeFlyTo(place) {
    if (!place || !isMapVisible()) return;
    try {
      flyTo(map, place.lat, place.lng, 13);
    } catch (err) {
      // Se ignora: es puramente cosmetico (centrar el mapa).
    }
  }
  root.querySelector('[data-action="toggle-map"]')?.addEventListener('click', () => {
    mapWrapperEl.classList.add('map-open');
    setTimeout(() => {
      if (!map) return;
      map.invalidateSize();
      safeFlyTo(lastSelectedPlace);
    }, 250);
  });
  root.querySelector('[data-action="close-map"]')?.addEventListener('click', () => {
    mapWrapperEl.classList.remove('map-open');
  });

  function updateSubtitle() {
    const count = tripData.places.length;
    root.querySelector('[data-role="trip-subtitle"]').textContent =
      count === 1 ? t('trip.placesSavedOne') : t('trip.placesSavedOther', { count });
  }

  function formatDate(iso) {
    if (!iso) return t('trip.noDate');
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function formatDateTime(place) {
    const dateLabel = formatDate(place.date);
    return place.time ? `${dateLabel} · ${place.time}` : dateLabel;
  }

  // El orden de la lista es siempre cronologico (fecha, y hora si la hay).
  // Si el usuario quiere mas control sobre el orden entre lugares con la
  // misma fecha, puede anadir la hora de la visita en cada uno.
  function comparePlaces(a, b) {
    if (a.date !== b.date) {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    }
    if (a.time !== b.time) {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    }
    return 0;
  }

  function sortedPlaces() {
    return [...tripData.places].sort(comparePlaces);
  }

  function renderPlaceList() {
    const listEl = root.querySelector('[data-role="place-list"]');
    if (!tripData.places.length) {
      listEl.innerHTML = `<li class="place-list-empty">${t('trip.noPlacesYet')}</li>`;
      return;
    }
    const sorted = sortedPlaces();
    listEl.innerHTML = sorted
      .map(
        (p) => `
          <li class="place-item" data-place-id="${p.id}">
            <span class="marker-dot" style="background:${colorHex(p.color)}"></span>
            <div class="place-info">
              <h4>${escapeHtml(p.name)}</h4>
              <span>${formatDateTime(p)}</span>
            </div>
          </li>
        `
      )
      .join('');
    listEl.querySelectorAll('.place-item').forEach((el) => {
      el.addEventListener('click', () => {
        const place = tripData.places.find((p) => p.id === el.dataset.placeId);
        if (place) {
          lastSelectedPlace = place;
          // En movil el mapa empieza oculto hasta que se pulsa "Ver mapa" y
          // no se puede centrar mientras tanto (ver safeFlyTo); el toggle de
          // "Ver mapa" se encarga de centrarlo cuando se abra.
          safeFlyTo(place);
          openPlaceGallery(place);
        }
      });
    });
  }

  function openPlaceGallery(place) {
    openGallery(
      token,
      place,
      async (patch) => {
        Object.assign(place, patch);
        const marker = markers.get(place.id);
        if (marker) updateMarkerAppearance(marker, place);
        renderPlaceList();
        try {
          await saveTripData(token, tripFolderId, tripData);
        } catch (err) {
          showToast(t('trip.saveChangeError'), { error: true });
        }
        if (patch.name) {
          // Mantiene el nombre de la carpeta de Drive sincronizado con el
          // nombre mostrado. Si falla (p.ej. sin conexion puntual) no bloquea
          // el resto del flujo: el nombre ya quedo guardado en trip.json.
          renameDriveFolder(token, place.id, patch.name).catch(() => {});
        }
      },
      canEdit
    );
  }

  function addMarkerForPlace(place) {
    const marker = addPlaceMarker(map, place, {
      onClick: () => {
        lastSelectedPlace = place;
        openPlaceGallery(place);
      },
    });
    markers.set(place.id, marker);
  }

  tripData.places.forEach(addMarkerForPlace);
  renderPlaceList();
  updateSubtitle();

  async function persistNewPlace(place) {
    tripData.places.push(place);
    renderPlaceList();
    updateSubtitle();
    addMarkerForPlace(place);
    try {
      await saveTripData(token, tripFolderId, tripData);
    } catch (err) {
      showToast(t('trip.savePlaceError'), { error: true });
    }
  }

  async function createPlace(name, lat, lng) {
    const cleanName = (name || '').trim();
    if (!cleanName) return;
    try {
      const folderId = await ensurePlaceFolder(token, tripFolderId, cleanName);
      const place = {
        id: folderId,
        name: cleanName,
        lat,
        lng,
        date: todayIso(),
        color: colorForIndex(tripData.places.length),
      };
      await persistNewPlace(place);
      openPlaceGallery(place);
    } catch (err) {
      showToast(t('trip.createPlaceError'), { error: true });
    }
  }

  map.on('click', async (e) => {
    if (!canEdit) return;
    const { lat, lng } = e.latlng;
    let suggested = '';
    try {
      suggested = (await reverseGeocode(lat, lng)) || '';
    } catch (err) {
      // ignore, se pedira el nombre igualmente
    }
    const name = await openNamePrompt({
      title: t('trip.namePromptTitle'),
      description: t('trip.namePromptDescription'),
      initialValue: suggested,
      confirmLabel: t('trip.namePromptConfirm'),
    });
    if (name) createPlace(name, lat, lng);
  });

  const placeInput = root.querySelector('[data-role="place-input"]');
  const placeSuggestions = root.querySelector('[data-role="place-suggestions"]');

  placeInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = placeInput.value.trim();
    if (query.length < 3) {
      placeSuggestions.style.display = 'none';
      placeSuggestions.innerHTML = '';
      return;
    }
    debounceTimer = setTimeout(async () => {
      try {
        const results = await searchPlace(query, { limit: 5 });
        renderPlaceSuggestions(placeSuggestions, results, async (result) => {
          placeSuggestions.style.display = 'none';
          placeInput.value = '';
          flyTo(map, result.lat, result.lng, 13);
          await createPlace(shortLabel(result.label), result.lat, result.lng);
        });
      } catch (err) {
        placeSuggestions.style.display = 'none';
      }
    }, 400);
  });
}

function renderPlaceSuggestions(el, results, onSelect) {
  if (!results.length) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  el.innerHTML = results
    .map((r, i) => `<li class="suggestion-item" data-index="${i}">${escapeHtml(r.label)}</li>`)
    .join('');
  el.style.display = 'block';
  el.querySelectorAll('.suggestion-item').forEach((item, i) => {
    item.addEventListener('click', () => onSelect(results[i]));
  });
}

function shortLabel(label) {
  return label.split(',').slice(0, 2).join(',').trim();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
