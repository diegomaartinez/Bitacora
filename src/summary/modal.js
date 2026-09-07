import { drawInstagramPost, INSTAGRAM_SIZE } from './instagram.js';
import { drawBoardingPass, BOARDING_PASS_WIDTH, BOARDING_PASS_HEIGHT } from './boardingPass.js';
import { drawMetroMap, METRO_WIDTH, METRO_HEIGHT } from './metroMap.js';
import { ensureFontsReady, downloadCanvas } from './canvasUtils.js';
import { ensureTripShareLink } from '../drive.js';
import { SUMMARY_THEMES, DEFAULT_THEME_KEY } from './themes.js';
import { t } from '../i18n.js';

function getTabs() {
  return [
    { key: 'instagram', label: t('summaryModal.tabMap') },
    { key: 'boarding', label: t('summaryModal.tabBoardingPass') },
    { key: 'metro', label: t('summaryModal.tabMetro') },
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
        <div class="summary-controls" data-role="controls"></div>
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
        ${themeRowHtml()}
      `;
      controls.querySelector('[data-role="passenger-input"]').addEventListener('input', (e) => {
        passengerName = e.target.value;
        redraw();
      });
      bindThemeRow();
    } else {
      controls.innerHTML = themeRowHtml();
      bindThemeRow();
    }
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
      await drawBoardingPass(ctx, { tripData, passengerName, shareUrl, shareError, theme: themeKey });
      if (myToken === renderToken) requestShareLink();
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
