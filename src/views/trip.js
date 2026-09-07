import { getTripData, saveTripData, ensurePlaceFolder } from '../drive.js';
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
            </div>
          </div>
          <div class="place-search">
            <input type="text" placeholder="${t('trip.searchPlacePlaceholder')}" data-role="place-input" autocomplete="off" />
            <ul class="suggestion-list" data-role="place-suggestions" style="display:none"></ul>
          </div>
          <ul class="place-list" data-role="place-list"></ul>
        </aside>
        <div class="map-wrapper">
          <div id="map"></div>
          <div class="map-add-hint">${t('trip.mapAddHint')}</div>
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
  // Compatibilidad con viajes creados antes de tener fecha/color por lugar.
  tripData.places.forEach((p, i) => {
    if (!p.color) p.color = colorForIndex(i);
    if (p.date === undefined) p.date = null;
    if (!Array.isArray(p.notes)) p.notes = [];
  });

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
    openTripGallery(token, tripData);
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

  function renderPlaceList() {
    const listEl = root.querySelector('[data-role="place-list"]');
    if (!tripData.places.length) {
      listEl.innerHTML = `<li class="place-list-empty">${t('trip.noPlacesYet')}</li>`;
      return;
    }
    listEl.innerHTML = tripData.places
      .map(
        (p, i) => `
          <li class="place-item" data-place-id="${p.id}">
            <span class="marker-dot" style="background:${colorHex(p.color)}"></span>
            <div class="place-info">
              <h4>${escapeHtml(p.name)}</h4>
              <span>${formatDate(p.date)}</span>
            </div>
            <div class="place-reorder">
              <button type="button" class="reorder-btn" data-action="move-up" ${i === 0 ? 'disabled' : ''} title="${t('trip.moveUp')}" aria-label="${t('trip.moveUp')}">${chevronUpIcon()}</button>
              <button type="button" class="reorder-btn" data-action="move-down" ${i === tripData.places.length - 1 ? 'disabled' : ''} title="${t('trip.moveDown')}" aria-label="${t('trip.moveDown')}">${chevronDownIcon()}</button>
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
      el.querySelector('[data-action="move-up"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        movePlace(el.dataset.placeId, -1);
      });
      el.querySelector('[data-action="move-down"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        movePlace(el.dataset.placeId, 1);
      });
    });
  }

  async function movePlace(placeId, direction) {
    const index = tripData.places.findIndex((p) => p.id === placeId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= tripData.places.length) return;
    const [place] = tripData.places.splice(index, 1);
    tripData.places.splice(targetIndex, 0, place);
    renderPlaceList();
    try {
      await saveTripData(token, tripFolderId, tripData);
    } catch (err) {
      showToast(t('trip.saveChangeError'), { error: true });
    }
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
        showToast(t('trip.saveChangeError'), { error: true });
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

function chevronUpIcon() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
}

function chevronDownIcon() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
