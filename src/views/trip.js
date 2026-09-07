import { getTripData, saveTripData, ensurePlaceFolder } from '../drive.js';
import { searchPlace, reverseGeocode } from '../geocode.js';
import { createMap, addPlaceMarker, updateMarkerAppearance, flyTo } from '../map.js';
import { openGallery } from '../gallery.js';
import { openTripGallery } from '../tripGallery.js';
import { openSummaryModal } from '../summary/modal.js';
import { openNamePrompt } from '../promptModal.js';
import { showToast } from '../toast.js';
import { renderTopbar } from './topbar.js';
import { colorHex, colorForIndex } from '../colors.js';

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
            <h2 data-role="trip-title">Cargando...</h2>
            <p data-role="trip-subtitle"></p>
            <div class="sidebar-actions">
              <button class="btn btn-secondary" data-action="gallery">Ver galeria</button>
              <button class="btn btn-secondary" data-action="summary">Generar resumen</button>
            </div>
          </div>
          <div class="place-search">
            <input type="text" placeholder="Buscar y anadir un lugar" data-role="place-input" autocomplete="off" />
            <ul class="suggestion-list" data-role="place-suggestions" style="display:none"></ul>
          </div>
          <ul class="place-list" data-role="place-list"></ul>
        </aside>
        <div class="map-wrapper">
          <div id="map"></div>
          <div class="map-add-hint">Haz clic en el mapa para anadir un lugar</div>
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
    showToast('No se pudo cargar el viaje.', { error: true });
  }

  if (!tripData) {
    tripData = { name: 'Viaje', center: { lat: 28.29, lng: -16.63 }, zoom: 8, places: [] };
  }
  // Compatibilidad con viajes creados antes de tener fecha/color por lugar.
  tripData.places.forEach((p, i) => {
    if (!p.color) p.color = colorForIndex(i);
    if (p.date === undefined) p.date = null;
  });

  renderTopbar(root.querySelector('[data-role="topbar"]'), {
    profile,
    title: tripData.name,
    onBack,
    onSignOut: () => window.dispatchEvent(new CustomEvent('td:signout')),
  });

  root.querySelector('[data-role="trip-title"]').textContent = tripData.name;

  map = createMap(root.querySelector('#map'), { center: tripData.center, zoom: tripData.zoom });

  root.querySelector('[data-action="summary"]').addEventListener('click', () => {
    openSummaryModal({ tripData, profile, token, tripFolderId });
  });

  root.querySelector('[data-action="gallery"]').addEventListener('click', () => {
    openTripGallery(token, tripData);
  });

  function updateSubtitle() {
    root.querySelector('[data-role="trip-subtitle"]').textContent = `${tripData.places.length} lugar${
      tripData.places.length === 1 ? '' : 'es'
    } guardados`;
  }

  function formatDate(iso) {
    if (!iso) return 'Sin fecha';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function renderPlaceList() {
    const listEl = root.querySelector('[data-role="place-list"]');
    if (!tripData.places.length) {
      listEl.innerHTML = '<li class="place-list-empty">Aun no has anadido ningun lugar. Busca uno o haz clic en el mapa.</li>';
      return;
    }
    listEl.innerHTML = tripData.places
      .map(
        (p) => `
          <li class="place-item" data-place-id="${p.id}">
            <span class="marker-dot" style="background:${colorHex(p.color)}"></span>
            <div class="place-info">
              <h4>${escapeHtml(p.name)}</h4>
              <span>${formatDate(p.date)}</span>
            </div>
          </li>
        `
      )
      .join('');
    listEl.querySelectorAll('.place-item').forEach((el) => {
      el.addEventListener('click', () => {
        const place = tripData.places.find((p) => p.id === el.dataset.placeId);
        if (place) {
          flyTo(map, place.lat, place.lng, 13);
          openPlaceGallery(place);
        }
      });
    });
  }

  function openPlaceGallery(place) {
    openGallery(token, place, async (patch) => {
      Object.assign(place, patch);
      const marker = markers.get(place.id);
      if (marker) updateMarkerAppearance(marker, place);
      renderPlaceList();
      try {
        await saveTripData(token, tripFolderId, tripData);
      } catch (err) {
        showToast('No se pudo guardar el cambio en Drive.', { error: true });
      }
    });
  }

  function addMarkerForPlace(place) {
    const marker = addPlaceMarker(map, place, {
      onClick: () => openPlaceGallery(place),
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
      showToast('No se pudo guardar el lugar en Drive.', { error: true });
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
      showToast('No se pudo crear el lugar.', { error: true });
    }
  }

  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    let suggested = '';
    try {
      suggested = (await reverseGeocode(lat, lng)) || '';
    } catch (err) {
      // ignore, se pedira el nombre igualmente
    }
    const name = await openNamePrompt({
      title: 'Nombre de este lugar',
      description: 'Se anadira como un lugar nuevo en tu viaje.',
      initialValue: suggested,
      confirmLabel: 'Anadir lugar',
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
