import { drawInstagramPost, INSTAGRAM_SIZE } from './instagram.js';
import { drawBoardingPass, BOARDING_PASS_WIDTH, BOARDING_PASS_HEIGHT } from './boardingPass.js';
import { drawMetroMap, METRO_WIDTH, METRO_HEIGHT } from './metroMap.js';
import { drawCoverPoster, COVER_WIDTH, COVER_HEIGHT } from './cover.js';
import { ensureFontsReady, downloadCanvas, sortPlacesChronologically } from './canvasUtils.js';
import { ensureTripShareLink, listTripPhotos, getPhotoBlobUrl } from '../drive.js';
import { SUMMARY_THEMES, DEFAULT_THEME_KEY } from './themes.js';
import { t } from '../i18n.js';

const MAX_COVER_PLACES = 8;
const TRANSPORT_TYPES = [
  { key: 'plane', icon: '✈', labelKey: 'summaryModal.transportPlane' },
  { key: 'train', icon: '🚆', labelKey: 'summaryModal.transportTrain' },
  { key: 'boat', icon: '⛴', labelKey: 'summaryModal.transportBoat' },
];

function getTabs() {
  return [
    { key: 'instagram', label: t('summaryModal.tabMap') },
    { key: 'boarding', label: t('summaryModal.tabBoardingPass') },
    { key: 'metro', label: t('summaryModal.tabMetro') },
    { key: 'cover', label: t('summaryModal.tabCover') },
  ];
}

const DIACRITICS_RE = /[\u0300-\u036f]/g;

let overlayEl = null;

function slug(text) {
  return (text || 'viaje')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function openSummaryModal({ tripData, profile, token, tripFolderId }) {
  if (overlayEl) overlayEl.remove();

  let activeTab = 'instagram';
  let title = tripData.name || '';
  let shareUrl = null;
  let shareError = false;
  let shareRequested = false;
  let renderToken = 0;
  let themeKey = DEFAULT_THEME_KEY;
  let passengerName = profile?.name || '';
  let transportType = 'plane';

  // Estado de la pestana "Portada" (foto de fondo + lugares elegidos).
  let coverPhotos = null; // null = aun no cargadas
  let coverPhotosLoading = false;
  let coverPhotosError = false;
  let coverPhotoId = null;
  let coverPlaceIds = [];

  const startControlsOpen = !window.matchMedia('(max-width: 780px)').matches;

  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.innerHTML = `
    <div class="modal-panel summary-panel">
      <div class="modal-header">
        <div>
          <h2>${t('summaryModal.title')}</h2>
          <p>${t('summaryModal.subtitle')}</p>
        </div>
        <button class="btn btn-text" data-action="close">${t('summaryModal.close')}</button>
      </div>
      <div class="summary-tabs" data-role="tabs">
        ${getTabs().map(
          (tab) => `<button type="button" class="summary-tab ${tab.key === activeTab ? 'active' : ''}" data-tab="${tab.key}">${tab.label}</button>`
        ).join('')}
      </div>
      <div class="modal-body summary-body">
        <details class="summary-controls-details" data-role="controls-details" ${startControlsOpen ? 'open' : ''}>
          <summary class="summary-controls-summary" data-role="controls-summary">${t('summaryModal.customize')}</summary>
          <div class="summary-controls" data-role="controls"></div>
        </details>
        <div class="summary-canvas-wrap">
          <canvas data-role="canvas"></canvas>
        </div>
        <button class="btn btn-primary summary-download" data-action="download">${t('summaryModal.download')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  function renderTabs() {
    tabsEl.innerHTML = getTabs()
      .map(
        (tab) => `<button type="button" class="summary-tab ${tab.key === activeTab ? 'active' : ''}" data-tab="${tab.key}">${tab.label}</button>`
      )
      .join('');
  }

  function handleLangChange() {
    renderTabs();
    const summaryLabelEl = overlayEl.querySelector('[data-role="controls-summary"]');
    if (summaryLabelEl) summaryLabelEl.textContent = t('summaryModal.customize');
    renderControls();
    redraw();
  }
  window.addEventListener('td:langchange', handleLangChange);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl || e.target.dataset.action === 'close') {
      window.removeEventListener('td:langchange', handleLangChange);
      overlayEl.remove();
      overlayEl = null;
    }
  });

  const canvas = overlayEl.querySelector('[data-role="canvas"]');
  const ctx = canvas.getContext('2d');
  const controls = overlayEl.querySelector('[data-role="controls"]');
  const tabsEl = overlayEl.querySelector('[data-role="tabs"]');

  function themeRowHtml() {
    return `
      <div class="meta-field">
        <span>${t('summaryModal.colorStyle')}</span>
        <div class="color-swatch-row" data-role="theme-row">
          ${SUMMARY_THEMES.map(
            (t) => `
              <button
                type="button"
                class="color-swatch ${t.key === themeKey ? 'selected' : ''}"
                data-theme="${t.key}"
                style="background:${t.swatch}"
                title="${t.label}"
                aria-label="${t.label}"
              ></button>
            `
          ).join('')}
        </div>
      </div>
    `;
  }

  function bindThemeRow() {
    const themeRow = controls.querySelector('[data-role="theme-row"]');
    if (!themeRow) return;
    themeRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.color-swatch');
      if (!btn) return;
      themeKey = btn.dataset.theme;
      themeRow.querySelectorAll('.color-swatch').forEach((el) => el.classList.remove('selected'));
      btn.classList.add('selected');
      redraw();
    });
  }

  function transportRowHtml() {
    return `
      <div class="meta-field">
        <span>${t('summaryModal.transportType')}</span>
        <div class="transport-type-row" data-role="transport-row">
          ${TRANSPORT_TYPES.map(
            (tt) => `
              <button
                type="button"
                class="transport-type-btn ${tt.key === transportType ? 'selected' : ''}"
                data-transport="${tt.key}"
                title="${t(tt.labelKey)}"
                aria-label="${t(tt.labelKey)}"
              >${tt.icon}</button>
            `
          ).join('')}
        </div>
      </div>
    `;
  }

  function bindTransportRow() {
    const row = controls.querySelector('[data-role="transport-row"]');
    if (!row) return;
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('.transport-type-btn');
      if (!btn) return;
      transportType = btn.dataset.transport;
      row.querySelectorAll('.transport-type-btn').forEach((el) => el.classList.remove('selected'));
      btn.classList.add('selected');
      redraw();
    });
  }

  function renderControls() {
    if (activeTab === 'instagram') {
      controls.innerHTML = `
        <label class="meta-field">
          <span>${t('summaryModal.snapshotTitle')}</span>
          <input type="text" data-role="title-input" value="${escapeAttr(title)}" maxlength="40" />
        </label>
        ${themeRowHtml()}
      `;
      controls.querySelector('[data-role="title-input"]').addEventListener('input', (e) => {
        title = e.target.value;
        redraw();
      });
      bindThemeRow();
    } else if (activeTab === 'boarding') {
      controls.innerHTML = `
        <label class="meta-field">
          <span>${t('summaryModal.passengerName')}</span>
          <input type="text" data-role="passenger-input" value="${escapeAttr(passengerName)}" maxlength="40" />
        </label>
        ${transportRowHtml()}
        ${themeRowHtml()}
      `;
      controls.querySelector('[data-role="passenger-input"]').addEventListener('input', (e) => {
        passengerName = e.target.value;
        redraw();
      });
      bindTransportRow();
      bindThemeRow();
    } else if (activeTab === 'cover') {
      renderCoverControls();
    } else {
      controls.innerHTML = themeRowHtml();
      bindThemeRow();
    }
  }

  function renderCoverControls() {
    if (coverPhotos === null) {
      controls.innerHTML = `<p class="summary-hint">${t('summaryModal.coverLoadingPhotos')}</p>`;
      loadCoverPhotos();
      return;
    }
    const chronological = sortPlacesChronologically(tripData.places);
    controls.innerHTML = `
      <label class="meta-field">
        <span>${t('summaryModal.snapshotTitle')}</span>
        <input type="text" data-role="title-input" value="${escapeAttr(title)}" maxlength="40" />
      </label>
      <div class="meta-field">
        <span>${t('summaryModal.coverPhoto')}</span>
        ${
          coverPhotosError
            ? `<p class="summary-hint">${t('summaryModal.coverPhotosError')}</p>`
            : coverPhotos.length
              ? `<div class="cover-photo-picker" data-role="cover-photo-picker">
                  ${coverPhotos
                    .map(
                      (p) => `
                        <button type="button" class="cover-photo-thumb ${p.id === coverPhotoId ? 'selected' : ''}" data-photo-id="${p.id}">
                          <div class="photo-skeleton"></div>
                        </button>
                      `
                    )
                    .join('')}
                </div>`
              : `<p class="summary-hint">${t('summaryModal.coverNoPhotos')}</p>`
        }
      </div>
      <div class="meta-field">
        <span>${t('summaryModal.coverPlaces', { max: MAX_COVER_PLACES })}</span>
        <ul class="cover-places-checklist" data-role="cover-places-list">
          ${chronological
            .map(
              (p) => `
                <li>
                  <label class="cover-place-check">
                    <input type="checkbox" data-place-id="${p.id}" ${coverPlaceIds.includes(p.id) ? 'checked' : ''} />
                    <span>${escapeAttr(p.name)}</span>
                  </label>
                </li>
              `
            )
            .join('')}
        </ul>
      </div>
      ${themeRowHtml()}
    `;
    controls.querySelector('[data-role="title-input"]').addEventListener('input', (e) => {
      title = e.target.value;
      redraw();
    });
    bindThemeRow();
    bindCoverPhotoPicker();
    loadCoverThumbnails();
    bindCoverPlacesChecklist();
  }

  async function loadCoverPhotos() {
    if (coverPhotos !== null || coverPhotosLoading) return;
    coverPhotosLoading = true;
    try {
      const photos = await listTripPhotos(token, tripData.places);
      coverPhotos = photos;
      coverPhotosError = false;
      if (photos.length && !coverPhotoId) {
        coverPhotoId = photos[Math.floor(Math.random() * photos.length)].id;
      }
    } catch (err) {
      coverPhotos = [];
      coverPhotosError = true;
    }
    coverPhotosLoading = false;
    if (!coverPlaceIds.length) {
      coverPlaceIds = sortPlacesChronologically(tripData.places)
        .slice(0, MAX_COVER_PLACES)
        .map((p) => p.id);
    }
    if (activeTab === 'cover') {
      renderControls();
      redraw();
    }
  }

  async function loadCoverThumbnails() {
    const pickerEl = controls.querySelector('[data-role="cover-photo-picker"]');
    if (!pickerEl || !coverPhotos) return;
    const buttons = pickerEl.querySelectorAll('.cover-photo-thumb');
    await Promise.all(
      coverPhotos.map(async (photo, i) => {
        try {
          const url = await getPhotoBlobUrl(token, photo.id);
          const btn = buttons[i];
          if (!btn) return;
          btn.innerHTML = `<img src="${url}" alt="" loading="lazy" />`;
        } catch (err) {
          const btn = buttons[i];
          if (btn) btn.innerHTML = '×';
        }
      })
    );
  }

  function bindCoverPhotoPicker() {
    const pickerEl = controls.querySelector('[data-role="cover-photo-picker"]');
    if (!pickerEl) return;
    pickerEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.cover-photo-thumb');
      if (!btn) return;
      coverPhotoId = btn.dataset.photoId;
      pickerEl.querySelectorAll('.cover-photo-thumb').forEach((el) => el.classList.toggle('selected', el === btn));
      redraw();
    });
  }

  function updateCoverPlacesDisabledState(listEl) {
    const atMax = coverPlaceIds.length >= MAX_COVER_PLACES;
    listEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.disabled = atMax && !input.checked;
    });
  }

  function bindCoverPlacesChecklist() {
    const listEl = controls.querySelector('[data-role="cover-places-list"]');
    if (!listEl) return;
    updateCoverPlacesDisabledState(listEl);
    listEl.addEventListener('change', (e) => {
      const input = e.target.closest('input[type="checkbox"]');
      if (!input) return;
      const placeId = input.dataset.placeId;
      if (input.checked) {
        if (coverPlaceIds.length >= MAX_COVER_PLACES) {
          input.checked = false;
          return;
        }
        coverPlaceIds.push(placeId);
      } else {
        coverPlaceIds = coverPlaceIds.filter((id) => id !== placeId);
      }
      updateCoverPlacesDisabledState(listEl);
      redraw();
    });
  }

  async function redraw() {
    const myToken = ++renderToken;
    await ensureFontsReady();
    if (myToken !== renderToken) return;
    if (activeTab === 'instagram') {
      canvas.width = INSTAGRAM_SIZE;
      canvas.height = INSTAGRAM_SIZE;
      await drawInstagramPost(ctx, { tripData, title, theme: themeKey });
    } else if (activeTab === 'boarding') {
      canvas.width = BOARDING_PASS_WIDTH;
      canvas.height = BOARDING_PASS_HEIGHT;
      await drawBoardingPass(ctx, { tripData, passengerName, shareUrl, shareError, theme: themeKey, transportType });
      if (myToken === renderToken) requestShareLink();
    } else if (activeTab === 'cover') {
      canvas.width = COVER_WIDTH;
      canvas.height = COVER_HEIGHT;
      if (coverPhotos === null) {
        ctx.clearRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
        return;
      }
      let photoUrl = null;
      if (coverPhotoId) {
        try {
          photoUrl = await getPhotoBlobUrl(token, coverPhotoId);
        } catch (err) {
          photoUrl = null;
        }
      }
      if (myToken !== renderToken) return;
      const chosenPlaces = sortPlacesChronologically(tripData.places.filter((p) => coverPlaceIds.includes(p.id)));
      await drawCoverPoster(ctx, { tripData, title, photoUrl, places: chosenPlaces, theme: themeKey });
    } else {
      canvas.width = METRO_WIDTH;
      canvas.height = METRO_HEIGHT;
      drawMetroMap(ctx, { tripData, theme: themeKey });
    }
  }

  /** Pide (una sola vez) que la carpeta del viaje sea visible por enlace, para el QR del billete. */
  async function requestShareLink() {
    if (shareUrl || shareRequested || !token || !tripFolderId) return;
    shareRequested = true;
    try {
      shareUrl = await ensureTripShareLink(token, tripFolderId);
      shareError = false;
    } catch (err) {
      shareError = true;
      shareRequested = false;
    }
    if (activeTab === 'boarding') redraw();
  }

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.summary-tab');
    if (!btn) return;
    activeTab = btn.dataset.tab;
    tabsEl.querySelectorAll('.summary-tab').forEach((el) => el.classList.toggle('active', el === btn));
    renderControls();
    redraw();
  });

  overlayEl.querySelector('[data-action="download"]').addEventListener('click', () => {
    downloadCanvas(canvas, `bitacora-${activeTab}-${slug(tripData.name)}.png`);
  });

  renderControls();
  redraw();
}

function escapeAttr(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
