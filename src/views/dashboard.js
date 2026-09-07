import { ensureRootFolder, listTrips, createTrip } from '../drive.js';
import { searchPlace } from '../geocode.js';
import { state } from '../state.js';
import { showToast } from '../toast.js';
import { renderTopbar } from './topbar.js';

let debounceTimer = null;

export async function renderDashboard(root, { token, profile, onOpenTrip, onSignOut }) {
  root.innerHTML = `
    <div class="screen">
      <div data-role="topbar"></div>
      <div class="dashboard">
        <div class="dashboard-header">
          <h1>Tus viajes</h1>
          <p>Cada viaje guarda sus lugares y fotos en una carpeta propia dentro de tu Google Drive.</p>
        </div>
        <div class="new-trip-panel">
          <h2>Empezar un viaje nuevo</h2>
          <p class="hint">Escribe un pais, region o ciudad (no usamos tu ubicacion real). Por ejemplo: "Islas Canarias".</p>
          <div class="search-row">
            <input type="text" placeholder="¿A donde fuiste?" data-role="new-trip-input" autocomplete="off" />
          </div>
          <ul class="suggestion-list" data-role="new-trip-suggestions" style="display:none"></ul>
        </div>
        <div data-role="trip-grid"></div>
      </div>
    </div>
  `;

  renderTopbar(root.querySelector('[data-role="topbar"]'), { profile, onSignOut });

  const grid = root.querySelector('[data-role="trip-grid"]');
  grid.innerHTML = '<div class="empty-state">Cargando tus viajes...</div>';

  try {
    if (!state.rootFolderId) {
      state.rootFolderId = await ensureRootFolder(token);
    }
    await refreshTripGrid(grid, token, onOpenTrip);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">No se pudieron cargar los viajes: ${escapeHtml(err.message)}</div>`;
  }

  const input = root.querySelector('[data-role="new-trip-input"]');
  const suggestionsEl = root.querySelector('[data-role="new-trip-suggestions"]');

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (query.length < 3) {
      suggestionsEl.style.display = 'none';
      suggestionsEl.innerHTML = '';
      return;
    }
    debounceTimer = setTimeout(async () => {
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
            onOpenTrip(folderId);
          } catch (err) {
            showToast('No se pudo crear el viaje.', { error: true });
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

async function refreshTripGrid(grid, token, onOpenTrip) {
  const trips = await listTrips(token, state.rootFolderId);
  if (!trips.length) {
    grid.innerHTML = '<div class="empty-state">Todavia no tienes ningun viaje. Crea el primero arriba.</div>';
    return;
  }
  grid.innerHTML = `<div class="trip-grid">${trips
    .map(
      (trip, i) => `
        <div class="trip-card" style="--index:${i}" data-folder-id="${trip.id}">
          <span class="tag">Viaje</span>
          <h3>${escapeHtml(trip.name)}</h3>
          <p>Creado el ${new Date(trip.createdTime).toLocaleDateString('es-ES')}</p>
        </div>
      `
    )
    .join('')}</div>`;

  grid.querySelectorAll('.trip-card').forEach((card) => {
    card.addEventListener('click', () => onOpenTrip(card.dataset.folderId));
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
