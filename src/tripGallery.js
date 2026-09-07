import { listTripPhotos, getPhotoBlobUrl } from './drive.js';
import { t } from './i18n.js';

let overlayEl = null;
let photos = [];
let viewMode = 'grid'; // 'grid' | 'carousel'
let carouselIndex = 0;
let currentToken = null;

function closeModal() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  document.removeEventListener('keydown', onKeydown);
}

function formatDate(iso) {
  if (!iso) return t('trip.noDate');
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function onKeydown(e) {
  if (!overlayEl) return;
  if (e.key === 'Escape') closeModal();
  if (viewMode !== 'carousel') return;
  if (e.key === 'ArrowRight') showCarouselIndex(carouselIndex + 1);
  if (e.key === 'ArrowLeft') showCarouselIndex(carouselIndex - 1);
}

/** Abre la galeria de fotos de todo el viaje, con vista de cuadricula y de carrusel. */
export async function openTripGallery(token, tripData) {
  closeModal();
  photos = [];
  viewMode = 'grid';
  carouselIndex = 0;
  currentToken = token;

  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay gallery-overlay';
  overlayEl.innerHTML = `
    <div class="modal-panel gallery-panel">
      <div class="modal-header">
        <div>
          <h2>${t('tripGallery.title')}</h2>
          <p data-role="count">${t('tripGallery.loadingPhotos')}</p>
        </div>
        <div class="gallery-header-actions">
          <div class="view-toggle" data-role="view-toggle">
            <button type="button" class="view-toggle-btn active" data-view="grid">${t('tripGallery.grid')}</button>
            <button type="button" class="view-toggle-btn" data-view="carousel">${t('tripGallery.carousel')}</button>
          </div>
          <button class="btn btn-text" data-action="close">${t('tripGallery.close')}</button>
        </div>
      </div>
      <div class="modal-body gallery-body" data-role="body">
        <div class="gallery-empty">${t('tripGallery.loadingPhotos')}</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);
  document.addEventListener('keydown', onKeydown);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl || e.target.dataset.action === 'close') closeModal();
  });

  overlayEl.querySelector('[data-role="view-toggle"]').addEventListener('click', (e) => {
    const btn = e.target.closest('.view-toggle-btn');
    if (!btn) return;
    setViewMode(btn.dataset.view);
  });

  const bodyEl = overlayEl.querySelector('[data-role="body"]');
  const countEl = overlayEl.querySelector('[data-role="count"]');

  try {
    photos = await listTripPhotos(token, tripData.places);
  } catch (err) {
    bodyEl.innerHTML = `<div class="gallery-empty">${t('tripGallery.loadError')}</div>`;
    return;
  }

  if (!overlayEl) return; // se pudo cerrar mientras cargaba

  countEl.textContent = photos.length
    ? photos.length === 1
      ? t('tripGallery.photoCountOne')
      : t('tripGallery.photoCountOther', { count: photos.length })
    : t('tripGallery.noPhotosYet');

  if (!photos.length) {
    bodyEl.innerHTML = `<div class="gallery-empty">${t('tripGallery.noPhotosHint')}</div>`;
    return;
  }

  renderGrid(bodyEl);
}

function setViewMode(mode) {
  if (!overlayEl) return;
  viewMode = mode;
  overlayEl.querySelectorAll('.view-toggle-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });
  const bodyEl = overlayEl.querySelector('[data-role="body"]');
  if (mode === 'grid') renderGrid(bodyEl);
  else renderCarousel(bodyEl);
}

function renderGrid(bodyEl) {
  bodyEl.className = 'modal-body gallery-body gallery-grid-body';
  bodyEl.innerHTML = `<div class="trip-photo-grid" data-role="trip-grid"></div>`;
  const grid = bodyEl.querySelector('[data-role="trip-grid"]');

  photos.forEach((photo, i) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'trip-photo-item';
    item.title = `${photo.placeName} · ${formatDate(photo.placeDate)}`;
    item.innerHTML = '<div class="photo-skeleton"></div>';
    item.addEventListener('click', () => {
      carouselIndex = i;
      setViewMode('carousel');
    });
    grid.appendChild(item);
  });

  loadGridImages(grid);
}

async function loadGridImages(grid) {
  const items = grid.querySelectorAll('.trip-photo-item');
  await Promise.all(
    photos.map(async (photo, i) => {
      try {
        const url = await getPhotoBlobUrl(currentToken, photo.id);
        const item = items[i];
        if (!item) return;
        item.innerHTML = `<img src="${url}" alt="${escapeHtml(photo.placeName)}" loading="lazy" />`;
      } catch (err) {
        const item = items[i];
        if (item) item.innerHTML = `<div class="gallery-empty">${t('tripGallery.photoError')}</div>`;
      }
    })
  );
}

function renderCarousel(bodyEl) {
  bodyEl.className = 'modal-body gallery-body gallery-carousel-body';
  const photo = photos[carouselIndex];
  bodyEl.innerHTML = `
    <div class="carousel">
      <button type="button" class="carousel-nav carousel-prev" data-action="prev" aria-label="${t('tripGallery.prev')}">&larr;</button>
      <div class="carousel-frame" data-role="frame">
        <div class="photo-skeleton"></div>
      </div>
      <button type="button" class="carousel-nav carousel-next" data-action="next" aria-label="${t('tripGallery.next')}">&rarr;</button>
    </div>
    <div class="carousel-caption">
      <div>
        <strong>${escapeHtml(photo.placeName)}</strong>
        <span>${formatDate(photo.placeDate)}</span>
      </div>
      <span class="carousel-counter">${carouselIndex + 1} / ${photos.length}</span>
    </div>
  `;

  bodyEl.querySelector('[data-action="prev"]').addEventListener('click', () => showCarouselIndex(carouselIndex - 1));
  bodyEl.querySelector('[data-action="next"]').addEventListener('click', () => showCarouselIndex(carouselIndex + 1));

  // Deslizar con el dedo en movil.
  const frame = bodyEl.querySelector('[data-role="frame"]');
  let touchStartX = null;
  frame.addEventListener('touchstart', (e) => (touchStartX = e.touches[0].clientX), { passive: true });
  frame.addEventListener(
    'touchend',
    (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) showCarouselIndex(carouselIndex + (dx < 0 ? 1 : -1));
      touchStartX = null;
    },
    { passive: true }
  );

  getPhotoBlobUrl(currentToken, photo.id)
    .then((url) => {
      frame.innerHTML = `<img src="${url}" alt="${escapeHtml(photo.placeName)}" />`;
    })
    .catch(() => {
      frame.innerHTML = `<div class="gallery-empty">${t('tripGallery.carouselLoadError')}</div>`;
    });
}

function showCarouselIndex(index) {
  if (!photos.length) return;
  carouselIndex = (index + photos.length) % photos.length;
  const bodyEl = overlayEl.querySelector('[data-role="body"]');
  renderCarousel(bodyEl);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
