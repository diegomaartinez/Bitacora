import { drawInstagramPost, INSTAGRAM_SIZE } from './instagram.js';
import { drawBoardingPass, BOARDING_PASS_WIDTH, BOARDING_PASS_HEIGHT } from './boardingPass.js';
import { drawMetroMap, METRO_WIDTH, METRO_HEIGHT } from './metroMap.js';
import { ensureFontsReady, downloadCanvas } from './canvasUtils.js';

const TABS = [
  { key: 'instagram', label: 'Post de Instagram' },
  { key: 'boarding', label: 'Billete de avion' },
  { key: 'metro', label: 'Guia de metro' },
];

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

export function openSummaryModal({ tripData, profile }) {
  if (overlayEl) overlayEl.remove();

  let activeTab = 'instagram';
  let title = tripData.name || '';

  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.innerHTML = `
    <div class="modal-panel summary-panel">
      <div class="modal-header">
        <div>
          <h2>Resumen para compartir</h2>
          <p>Genera una imagen lista para publicar en redes sociales.</p>
        </div>
        <button class="btn btn-text" data-action="close">Cerrar</button>
      </div>
      <div class="summary-tabs" data-role="tabs">
        ${TABS.map(
          (t) => `<button type="button" class="summary-tab ${t.key === activeTab ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`
        ).join('')}
      </div>
      <div class="modal-body summary-body">
        <div class="summary-controls" data-role="controls"></div>
        <div class="summary-canvas-wrap">
          <canvas data-role="canvas"></canvas>
        </div>
        <button class="btn btn-primary summary-download" data-action="download">Descargar imagen</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl || e.target.dataset.action === 'close') {
      overlayEl.remove();
      overlayEl = null;
    }
  });

  const canvas = overlayEl.querySelector('[data-role="canvas"]');
  const ctx = canvas.getContext('2d');
  const controls = overlayEl.querySelector('[data-role="controls"]');
  const tabsEl = overlayEl.querySelector('[data-role="tabs"]');

  function renderControls() {
    if (activeTab === 'instagram') {
      controls.innerHTML = `
        <label class="meta-field">
          <span>Titulo de la instantanea</span>
          <input type="text" data-role="title-input" value="${escapeAttr(title)}" maxlength="40" />
        </label>
      `;
      controls.querySelector('[data-role="title-input"]').addEventListener('input', (e) => {
        title = e.target.value;
        redraw();
      });
    } else {
      controls.innerHTML = '';
    }
  }

  async function redraw() {
    await ensureFontsReady();
    if (activeTab === 'instagram') {
      canvas.width = INSTAGRAM_SIZE;
      canvas.height = INSTAGRAM_SIZE;
      drawInstagramPost(ctx, { tripData, title });
    } else if (activeTab === 'boarding') {
      canvas.width = BOARDING_PASS_WIDTH;
      canvas.height = BOARDING_PASS_HEIGHT;
      drawBoardingPass(ctx, { tripData, passengerName: profile?.name });
    } else {
      canvas.width = METRO_WIDTH;
      canvas.height = METRO_HEIGHT;
      drawMetroMap(ctx, { tripData });
    }
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
