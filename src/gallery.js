import { listPhotos, uploadPhoto, getPhotoBlobUrl, deletePhoto } from './drive.js';
import { showToast } from './toast.js';
import { PLACE_COLORS } from './colors.js';

let overlayEl = null;

function closeModal() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

/**
 * Abre la galeria de fotos de un lugar en un modal. Tambien permite editar
 * la fecha de la visita y el color del marcador.
 * @param {string} token - access token de Google
 * @param {object} place - {id (=carpeta Drive), name, date, color}
 * @param {(patch: object) => void} onUpdate - se llama con los campos que cambian (date/color)
 */
export async function openGallery(token, place, onUpdate = () => {}) {
  closeModal();

  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.innerHTML = `
    <div class="modal-panel">
      <div class="modal-header">
        <div>
          <h2>${escapeHtml(place.name)}</h2>
          <p>Fotos guardadas en tu Google Drive</p>
        </div>
        <button class="btn btn-text" data-action="close">Cerrar</button>
      </div>
      <div class="modal-body">
        <div class="place-meta-row">
          <label class="meta-field">
            <span>Fecha de la visita</span>
            <input type="date" data-role="date-input" value="${place.date || ''}" />
          </label>
          <div class="meta-field">
            <span>Color del marcador</span>
            <div class="color-swatch-row" data-role="color-row">
              ${PLACE_COLORS.map(
                (c) => `
                  <button
                    type="button"
                    class="color-swatch ${c.key === (place.color || PLACE_COLORS[0].key) ? 'selected' : ''}"
                    data-color="${c.key}"
                    style="background:${c.hex}"
                    title="${c.label}"
                    aria-label="${c.label}"
                  ></button>
                `
              ).join('')}
            </div>
          </div>
        </div>
        <label class="upload-zone" data-action="upload-zone">
          <p>Arrastra fotos aqui o haz clic para elegirlas</p>
          <input type="file" accept="image/*" multiple hidden data-role="file-input" />
        </label>
        <div class="photo-grid" data-role="grid"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl || e.target.dataset.action === 'close') closeModal();
  });

  const dateInput = overlayEl.querySelector('[data-role="date-input"]');
  dateInput.addEventListener('change', () => {
    place.date = dateInput.value || null;
    onUpdate({ date: place.date });
  });

  const colorRow = overlayEl.querySelector('[data-role="color-row"]');
  colorRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.color-swatch');
    if (!btn) return;
    colorRow.querySelectorAll('.color-swatch').forEach((el) => el.classList.remove('selected'));
    btn.classList.add('selected');
    place.color = btn.dataset.color;
    onUpdate({ color: place.color });
  });

  const fileInput = overlayEl.querySelector('[data-role="file-input"]');
  const uploadZone = overlayEl.querySelector('[data-action="upload-zone"]');
  const grid = overlayEl.querySelector('[data-role="grid"]');

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) handleFiles(fileInput.files);
    fileInput.value = '';
  });

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    for (const file of files) {
      const skeleton = document.createElement('div');
      skeleton.className = 'photo-item';
      skeleton.innerHTML = '<div class="photo-skeleton"></div>';
      grid.prepend(skeleton);
      try {
        const uploaded = await uploadPhoto(token, place.id, file);
        const url = URL.createObjectURL(file);
        skeleton.innerHTML = `
          <img src="${url}" alt="${escapeHtml(uploaded.name)}" />
          <button class="photo-remove" data-file-id="${uploaded.id}" title="Eliminar">&times;</button>
        `;
      } catch (err) {
        skeleton.remove();
        showToast(`No se pudo subir ${file.name}`, { error: true });
      }
    }
  }

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.photo-remove');
    if (!btn) return;
    const fileId = btn.dataset.fileId;
    const item = btn.closest('.photo-item');
    btn.disabled = true;
    try {
      await deletePhoto(token, fileId);
      item.remove();
    } catch (err) {
      showToast('No se pudo eliminar la foto', { error: true });
      btn.disabled = false;
    }
  });

  await renderExistingPhotos(token, place.id, grid);
}

async function renderExistingPhotos(token, placeFolderId, grid) {
  grid.innerHTML = '<div class="gallery-empty">Cargando fotos...</div>';
  try {
    const photos = await listPhotos(token, placeFolderId);
    if (!photos.length) {
      grid.innerHTML = '<div class="gallery-empty">Aun no hay fotos en este lugar. Sube la primera.</div>';
      return;
    }
    grid.innerHTML = '';
    for (const photo of photos) {
      const item = document.createElement('div');
      item.className = 'photo-item';
      item.innerHTML = '<div class="photo-skeleton"></div>';
      grid.appendChild(item);
      getPhotoBlobUrl(token, photo.id)
        .then((url) => {
          item.innerHTML = `
            <img src="${url}" alt="${escapeHtml(photo.name)}" />
            <button class="photo-remove" data-file-id="${photo.id}" title="Eliminar">&times;</button>
          `;
        })
        .catch(() => {
          item.innerHTML = '<div class="gallery-empty">Error</div>';
        });
    }
  } catch (err) {
    grid.innerHTML = '<div class="gallery-empty">No se pudieron cargar las fotos.</div>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
