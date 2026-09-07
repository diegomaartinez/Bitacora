import L from 'leaflet';
import { ensureRootFolder, listTrips, createTrip, getTripData, deleteTrip } from '../drive.js';
import { searchPlace } from '../geocode.js';
import { state } from '../state.js';
import { showToast } from '../toast.js';
import { renderTopbar } from './topbar.js';
import { t } from '../i18n.js';
import { tripDateRange, formatShortDateWithYear } from '../summary/canvasUtils.js';
import { colorHex } from '../colors.js';

let modalDebounceTimer = null;
let modalOverlayEl = null;

export async function renderDashboard(root, { token, profile, onOpenTrip, onSignOut }) {
  root.innerHTML = `
    <div class="screen">
      <div data-role="topbar"></div>
      <div class="dashboard">
        <div class="dashboard-header">
          <div>
            <h1>${t('dashboard.title')}</h1>
            <p>${t('dashboard.subtitle')}</p>
          </div>
          <button class="btn btn-cta" data-action="open-new-trip">${plusIcon()} ${t('dashboard.newTripButton')}</button>
        </div>
        <div data-role="trip-grid"></div>
      </div>
    </div>
  `;

  renderTopbar(root.querySelector('[data-role="topbar"]'), { profile, onSignOut });

  const grid = root.querySelector('[data-role="trip-grid"]');
  grid.innerHTML = `<div class="empty-state">${t('dashboard.loadingTrips')}</div>`;

  async function reload() {
    try {
      if (!state.rootFolderId) {
        state.rootFolderId = await ensureRootFolder(token);
      }
      await refreshTripGrid(grid, token, onOpenTrip);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state">${t('dashboard.loadTripsError', { message: escapeHtml(err.message) })}</div>`;
    }
  }

  await reload();

  root.querySelector('[data-action="open-new-trip"]').addEventListener('click', () => {
    openNewTripModal(token, async (folderId) => {
      onOpenTrip(folderId);
    });
  });
}

async function refreshTripGrid(grid, token, onOpenTrip) {
  const trips = await listTrips(token, state.rootFolderId);
  if (!trips.length) {
    grid.innerHTML = `<div class="empty-state">${t('dashboard.noTrips')}</div>`;
    return;
  }

  // Cargamos el trip.json de cada viaje para poder mostrar fechas reales,
  // numero de lugares y una previsualizacion del mapa (portada).
  const detailed = await Promise.all(
    trips.map(async (trip) => {
      let data = null;
      try {
        data = await getTripData(token, trip.id);
      } catch (err) {
        data = null;
      }
      return { folder: trip, data };
    })
  );

  grid.innerHTML = `<div class="trip-grid">${detailed
    .map(({ folder, data }, i) => {
      const places = data?.places || [];
      const name = data?.name || folder.name;
      const { start, end } = tripDateRange(places);
      let datesLabel = t('dashboard.datesTBD');
      if (start && end) {
        datesLabel =
          start === end ? formatShortDateWithYear(start) : `${formatShortDateWithYear(start)} — ${formatShortDateWithYear(end)}`;
      }
      const placesLabel = places.length
        ? places.length === 1
          ? t('dashboard.placesOne')
          : t('dashboard.placesOther', { count: places.length })
        : t('dashboard.noPlaces');

      return `
        <div class="trip-card" style="--index:${i}" data-folder-id="${folder.id}">
          <div class="trip-card-cover" data-role="cover"></div>
          <button type="button" class="trip-card-delete" data-action="delete" title="${t('dashboard.deleteTripAction')}" aria-label="${t('dashboard.deleteTripAction')}">${closeIcon()}</button>
          <div class="trip-card-body">
            <h3>${escapeHtml(name)}</h3>
            <p class="trip-card-dates">${datesLabel}</p>
            <p class="trip-card-places">${placesLabel}</p>
          </div>
          <div class="trip-card-confirm" data-role="confirm" hidden></div>
        </div>
      `;
    })
    .join('')}</div>`;

  const cards = grid.querySelectorAll('.trip-card');
  cards.forEach((card, i) => {
    const { data } = detailed[i];
    const coverEl = card.querySelector('[data-role="cover"]');
    renderCoverMap(coverEl, data);

    card.addEventListener('click', () => {
      if (card.classList.contains('confirming')) return;
      onOpenTrip(card.dataset.folderId);
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteConfirm(card, token, card.dataset.folderId, data?.name || detailed[i].folder.name, () =>
        refreshTripGrid(grid, token, onOpenTrip)
      );
    });
  });
}

function showDeleteConfirm(card, token, folderId, name, onDeleted) {
  const confirmEl = card.querySelector('[data-role="confirm"]');
  card.classList.add('confirming');
  confirmEl.hidden = false;
  confirmEl.innerHTML = `
    <p>${t('dashboard.deleteTripConfirm', { name: escapeHtml(name) })}</p>
    <div class="settings-actions-row">
      <button type="button" class="btn btn-danger btn-small" data-action="confirm-yes">${t('dashboard.deleteTripYes')}</button>
      <button type="button" class="btn btn-text btn-small" data-action="confirm-cancel">${t('dashboard.deleteTripCancel')}</button>
    </div>
  `;
  confirmEl.querySelector('[data-action="confirm-cancel"]').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmEl.hidden = true;
    card.classList.remove('confirming');
  });
  confirmEl.querySelector('[data-action="confirm-yes"]').addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await deleteTrip(token, folderId);
      onDeleted();
    } catch (err) {
      showToast(t('dashboard.deleteTripError'), { error: true });
      confirmEl.hidden = true;
      card.classList.remove('confirming');
    }
  });
}

/** Mini-mapa estatico (sin interaccion) usado como portada de cada tarjeta. */
function renderCoverMap(container, tripData) {
  const map = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
    touchZoom: false,
    fadeAnimation: false,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  const places = tripData?.places || [];
  if (places.length) {
    places.forEach((p) => {
      L.circleMarker([p.lat, p.lng], {
        radius: 5,
        weight: 2,
        color: '#ffffff',
        fillColor: colorHex(p.color),
        fillOpacity: 1,
      }).addTo(map);
    });
    if (places.length > 1) {
      map.fitBounds(
        L.latLngBounds(places.map((p) => [p.lat, p.lng])),
        { padding: [20, 20], maxZoom: 12 }
      );
    } else {
      map.setView([places[0].lat, places[0].lng], 11);
    }
  } else if (tripData?.center) {
    map.setView([tripData.center.lat, tripData.center.lng], tripData.zoom || 6);
  } else {
    map.setView([20, 0], 2);
  }

  requestAnimationFrame(() => map.invalidateSize());
}

function openNewTripModal(token, onCreated) {
  if (modalOverlayEl) modalOverlayEl.remove();

  modalOverlayEl = document.createElement('div');
  modalOverlayEl.className = 'modal-overlay';
  modalOverlayEl.innerHTML = `
    <div class="modal-panel new-trip-panel-modal">
      <div class="modal-header">
        <div>
          <h2>${t('dashboard.newTripModalTitle')}</h2>
          <p>${t('dashboard.newTripHint')}</p>
        </div>
        <button class="btn btn-text" data-action="close">${t('tripSettings.close')}</button>
      </div>
      <div class="modal-body">
        <div class="search-row">
          <input type="text" placeholder="${t('dashboard.newTripPlaceholder')}" data-role="new-trip-input" autocomplete="off" />
        </div>
        <ul class="suggestion-list" data-role="new-trip-suggestions" style="display:none"></ul>
      </div>
    </div>
  `;
  document.body.appendChild(modalOverlayEl);

  function close() {
    if (modalOverlayEl) modalOverlayEl.remove();
    modalOverlayEl = null;
  }

  modalOverlayEl.addEventListener('click', (e) => {
    if (e.target === modalOverlayEl || e.target.dataset.action === 'close') close();
  });

  const input = modalOverlayEl.querySelector('[data-role="new-trip-input"]');
  const suggestionsEl = modalOverlayEl.querySelector('[data-role="new-trip-suggestions"]');
  input.focus();

  input.addEventListener('input', () => {
    clearTimeout(modalDebounceTimer);
    const query = input.value.trim();
    if (query.length < 3) {
      suggestionsEl.style.display = 'none';
      suggestionsEl.innerHTML = '';
      return;
    }
    modalDebounceTimer = setTimeout(async () => {
      try {
        const results = await searchPlace(query);
        renderSuggestions(suggestionsEl, results, async (result) => {
          suggestionsEl.style.display = 'none';
          input.value = '';
          input.disabled = true;
          try {
            const zoom = guessZoom(result.boundingBox);
            const { folderId } = await createTrip(token, state.rootFolderId, {
              name: shortLabel(result.label),
              query,
              lat: result.lat,
              lng: result.lng,
              zoom,
            });
            close();
            onCreated(folderId);
          } catch (err) {
            showToast(t('dashboard.createTripError'), { error: true });
          } finally {
            input.disabled = false;
          }
        });
      } catch (err) {
        suggestionsEl.style.display = 'none';
      }
    }, 400);
  });
}

function renderSuggestions(el, results, onSelect) {
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

function guessZoom(boundingBox) {
  if (!boundingBox) return 8;
  const [south, north, west, east] = boundingBox;
  const span = Math.max(Math.abs(north - south), Math.abs(east - west));
  if (span > 20) return 4;
  if (span > 8) return 6;
  if (span > 3) return 8;
  if (span > 1) return 10;
  return 12;
}

function plusIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
}

function closeIcon() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
