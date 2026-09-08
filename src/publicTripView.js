import { getPublicTripData, listPublicPhotos, getPublicPhotoBlobUrl } from './drive.js';
import { createMap, addPlaceMarker, flyTo } from './map.js';
import { colorHex, colorForIndex } from './colors.js';
import { t, langSwitcherHtml, bindLangSwitcher } from './i18n.js';

/**
 * Pantalla de solo lectura para quien recibe un enlace o QR de un viaje
 * compartido: no inicia sesion, no puede editar nada -- solo ve el mapa,
 * la lista de lugares y las fotos que ya se subieron a cada uno.
 */
export async function renderPublicTrip(root, { tripFolderId }) {
  root.innerHTML = `
    <div class="trip-screen">
      <div class="topbar">
        <div class="brand">
          <span class="brand-mark">Bitácora</span>
          <span class="brand-tag">${t('publicView.readOnlyTag')}</span>
        </div>
        <div class="user-chip">
          <div class="lang-switch" data-role="lang-switch"></div>
          <a class="btn btn-cta btn-small" href="${window.location.origin}${window.location.pathname}">${t('publicView.createOwn')}</a>
        </div>
      </div>
      <div class="trip-body">
        <aside class="trip-sidebar">
          <div class="trip-sidebar-header">
            <h2 data-role="trip-title">${t('trip.loading')}</h2>
            <p data-role="trip-subtitle"></p>
          </div>
          <ul class="place-list" data-role="place-list"></ul>
        </aside>
        <div class="map-wrapper">
          <div id="map"></div>
        </div>
      </div>
    </div>
  `;

  const langSwitchEl = root.querySelector('[data-role="lang-switch"]');
  langSwitchEl.outerHTML = langSwitcherHtml();
  bindLangSwitcher(root.querySelector('.user-chip'));

  let tripData = null;
  try {
    tripData = await getPublicTripData(tripFolderId);
  } catch (err) {
    root.querySelector('.trip-body').innerHTML = `<div class="empty-state">${t('publicView.loadError')}</div>`;
    return;
  }

  if (!tripData) {
    root.querySelector('.trip-body').innerHTML = `<div class="empty-state">${t('publicView.notFound')}</div>`;
    return;
  }

  tripData.places.forEach((p, i) => {
    if (!p.color) p.color = colorForIndex(i);
    if (!Array.isArray(p.notes)) p.notes = [];
  });

  root.querySelector('[data-role="trip-title"]').textContent = tripData.name;
  const count = tripData.places.length;
  root.querySelector('[data-role="trip-subtitle"]').textContent =
    count === 1 ? t('trip.placesSavedOne') : t('trip.placesSavedOther', { count });

  const map = createMap(root.querySelector('#map'), { center: tripData.center, zoom: tripData.zoom });
  const markers = new Map();
  tripData.places.forEach((place) => {
    const marker = addPlaceMarker(map, place, { onClick: () => openReadOnlyPlace(place) });
    markers.set(place.id, marker);
  });

  function formatDate(iso) {
    if (!iso) return t('trip.noDate');
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  const listEl = root.querySelector('[data-role="place-list"]');
  if (!tripData.places.length) {
    listEl.innerHTML = `<li class="place-list-empty">${t('publicView.noPlacesYet')}</li>`;
  } else {
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
          openReadOnlyPlace(place);
        }
      });
    });
  }

  function openReadOnlyPlace(place) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-panel">
        <div class="modal-header">
          <div>
            <h2>${escapeHtml(place.name)}</h2>
            <p>${formatDate(place.date)}</p>
          </div>
          <button class="btn btn-text" data-action="close">${t('gallery.close')}</button>
        </div>
        <div class="modal-body">
          ${
            place.notes.length
              ? `<div class="place-notes-section">
                  <span class="section-label">${t('gallery.detailsTitle')}</span>
                  <ul class="notes-list">${place.notes.map((n) => `<li class="note-item"><span>${escapeHtml(n.text)}</span></li>`).join('')}</ul>
                </div>`
              : ''
          }
          <div class="gallery-section" data-role="gallery-section">
            <div class="photo-grid" data-role="grid"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.dataset.action === 'close') overlay.remove();
    });
    renderReadOnlyPhotos(place.id, overlay.querySelector('[data-role="grid"]'));
  }

  async function renderReadOnlyPhotos(placeFolderId, grid) {
    grid.innerHTML = `<div class="gallery-empty">${t('gallery.loadingPhotos')}</div>`;
    try {
      const photos = await listPublicPhotos(placeFolderId);
      if (!photos.length) {
        grid.innerHTML = `<div class="gallery-empty">${t('gallery.noPhotosYet')}</div>`;
        return;
      }
      grid.innerHTML = '';
      for (const photo of photos) {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.innerHTML = '<div class="photo-skeleton"></div>';
        grid.appendChild(item);
        getPublicPhotoBlobUrl(photo.id)
          .then((url) => {
            item.innerHTML = `<img src="${url}" alt="${escapeHtml(photo.name)}" />`;
            item.addEventListener('click', () => openLightbox(url));
          })
          .catch(() => {
            item.innerHTML = `<div class="gallery-empty">${t('gallery.photoError')}</div>`;
          });
      }
    } catch (err) {
      grid.innerHTML = `<div class="gallery-empty">${t('gallery.loadPhotosError')}</div>`;
    }
  }

  function openLightbox(url) {
    const lb = document.createElement('div');
    lb.className = 'modal-overlay lightbox-overlay';
    lb.innerHTML = `<img src="${url}" class="lightbox-img" alt="" />`;
    lb.addEventListener('click', () => lb.remove());
    document.body.appendChild(lb);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
