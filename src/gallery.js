import { listPhotos, uploadPhoto, getPhotoBlobUrl, deletePhoto } from './drive.js';
import { showToast } from './toast.js';
import { PLACE_COLORS } from './colors.js';
import { t } from './i18n.js';

let overlayEl = null;

function closeModal() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

function uid() {
  return `n_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * Abre la galeria de fotos de un lugar en un modal. Tambien permite editar
 * la fecha de la visita, el color del marcador, anadir "sublugares" o
 * detalles (restaurantes, calles, monumentos...) y gestionar las fotos.
 * @param {string} token - access token de Google
 * @param {object} place - {id (=carpeta Drive), name, date, color, notes}
 * @param {(patch: object) => void} onUpdate - se llama con los campos que cambian
 */
export async function openGallery(token, place, onUpdate = () => {}) {
  closeModal();
  if (!Array.isArray(place.notes)) place.notes = [];

  let editMode = false;
  const selectedIds = new Set();

  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.innerHTML = `
    <div class="modal-panel">
      <div class="modal-header">
        <div>
          <input
            type="text"
            class="place-name-input"
            data-role="name-input"
            value="${escapeHtml(place.name)}"
            maxlength="120"
            aria-label="${t('gallery.placeName')}"
          />
          <p>${t('gallery.savedInDrive')}</p>
        </div>
        <button class="btn btn-text" data-action="close">${t('gallery.close')}</button>
      </div>
      <div class="modal-body">
        <div class="place-meta-row">
          <label class="meta-field">
            <span>${t('gallery.visitDate')}</span>
            <input type="date" data-role="date-input" value="${place.date || ''}" />
          </label>
          <div class="meta-field">
            <span>${t('gallery.markerColor')}</span>
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

        <div class="place-notes-section">
          <span class="section-label">${t('gallery.detailsTitle')}</span>
          <p class="section-hint">${t('gallery.detailsHint')}</p>
          <div class="notes-add-row">
            <input type="text" class="prompt-input notes-input" data-role="note-input" placeholder="${t('gallery.detailsPlaceholder')}" maxlength="80" />
            <button type="button" class="btn btn-secondary btn-small" data-action="add-note">${t('gallery.add')}</button>
          </div>
          <ul class="notes-list" data-role="notes-list"></ul>
        </div>

        <div class="photo-actions-row">
          <button type="button" class="add-photo-btn" data-action="add-photo" title="${t('gallery.addPhotos')}" aria-label="${t('gallery.addPhotos')}">+</button>
          <button type="button" class="btn btn-secondary btn-small" data-action="toggle-gallery" data-role="toggle-gallery">
            ${t('gallery.galleryLabel')}
          </button>
          <input type="file" accept="image/*" multiple hidden data-role="file-input" />
        </div>

        <div class="gallery-section" data-role="gallery-section" hidden>
          <div class="gallery-section-header">
            <span data-role="photo-count"></span>
            <div class="gallery-edit-actions">
              <button type="button" class="btn btn-text btn-small" data-action="edit-toggle" data-role="edit-toggle">${t('gallery.edit')}</button>
              <button type="button" class="btn btn-text btn-small" data-action="cancel-edit" data-role="cancel-edit" hidden>${t('gallery.cancelEdit')}</button>
              <button type="button" class="btn btn-danger btn-small" data-action="confirm-delete" data-role="confirm-delete" hidden disabled>${t('gallery.delete')}</button>
            </div>
          </div>
          <div class="photo-grid" data-role="grid"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl || e.target.dataset.action === 'close') closeModal();
  });

  // ------------------------------- Nombre -------------------------------
  const nameInput = overlayEl.querySelector('[data-role="name-input"]');
  nameInput.addEventListener('change', () => {
    const newName = nameInput.value.trim();
    if (!newName || newName === place.name) {
      nameInput.value = place.name;
      return;
    }
    place.name = newName;
    onUpdate({ name: place.name });
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nameInput.blur();
  });

  // --------------------------- Fecha y color ---------------------------
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

  // ------------------------------- Notas --------------------------------
  const notesList = overlayEl.querySelector('[data-role="notes-list"]');
  const noteInput = overlayEl.querySelector('[data-role="note-input"]');

  function renderNotes() {
    if (!place.notes.length) {
      notesList.innerHTML = `<li class="notes-empty">${t('gallery.noDetailsYet')}</li>`;
      return;
    }
    notesList.innerHTML = place.notes
      .map((n) => `<li class="note-item" data-note-id="${n.id}"><span>${escapeHtml(n.text)}</span><button type="button" class="note-remove" data-note-id="${n.id}" aria-label="${t('gallery.removeNote')}">&times;</button></li>`)
      .join('');
  }

  function addNote() {
    const text = noteInput.value.trim();
    if (!text) return;
    place.notes.push({ id: uid(), text });
    noteInput.value = '';
    renderNotes();
    onUpdate({ notes: place.notes });
  }

  overlayEl.querySelector('[data-action="add-note"]').addEventListener('click', addNote);
  noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNote();
    }
  });
  notesList.addEventListener('click', (e) => {
    const btn = e.target.closest('.note-remove');
    if (!btn) return;
    place.notes = place.notes.filter((n) => n.id !== btn.dataset.noteId);
    renderNotes();
    onUpdate({ notes: place.notes });
  });

  renderNotes();

  // ------------------------------- Fotos --------------------------------
  const fileInput = overlayEl.querySelector('[data-role="file-input"]');
  const addPhotoBtn = overlayEl.querySelector('[data-action="add-photo"]');
  const toggleGalleryBtn = overlayEl.querySelector('[data-role="toggle-gallery"]');
  const gallerySection = overlayEl.querySelector('[data-role="gallery-section"]');
  const grid = overlayEl.querySelector('[data-role="grid"]');
  const photoCountEl = overlayEl.querySelector('[data-role="photo-count"]');
  const editToggleBtn = overlayEl.querySelector('[data-role="edit-toggle"]');
  const cancelEditBtn = overlayEl.querySelector('[data-role="cancel-edit"]');
  const confirmDeleteBtn = overlayEl.querySelector('[data-role="confirm-delete"]');

  addPhotoBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      openGallerySection();
      handleFiles(fileInput.files);
    }
    fileInput.value = '';
  });

  function openGallerySection() {
    gallerySection.hidden = false;
    toggleGalleryBtn.classList.add('active');
  }

  toggleGalleryBtn.addEventListener('click', () => {
    gallerySection.hidden = !gallerySection.hidden;
    toggleGalleryBtn.classList.toggle('active', !gallerySection.hidden);
    if (!gallerySection.hidden) exitEditMode();
  });

  function updatePhotoCountLabel(count) {
    toggleGalleryBtn.textContent = count != null ? t('gallery.galleryLabelCount', { count }) : t('gallery.galleryLabel');
    photoCountEl.textContent =
      count === 1 ? t('gallery.photoCountOne') : t('gallery.photoCountOther', { count: count ?? 0 });
  }

  function setEditMode(on) {
    editMode = on;
    grid.classList.toggle('edit-mode', editMode);
    editToggleBtn.hidden = editMode;
    cancelEditBtn.hidden = !editMode;
    confirmDeleteBtn.hidden = !editMode;
    if (!editMode) {
      selectedIds.clear();
      grid.querySelectorAll('.photo-item.selected').forEach((el) => el.classList.remove('selected'));
    }
    updateConfirmDeleteLabel();
  }

  function updateConfirmDeleteLabel() {
    confirmDeleteBtn.textContent = selectedIds.size
      ? t('gallery.deleteCount', { count: selectedIds.size })
      : t('gallery.delete');
    confirmDeleteBtn.disabled = selectedIds.size === 0;
  }

  function exitEditMode() {
    setEditMode(false);
  }

  editToggleBtn.addEventListener('click', () => setEditMode(true));
  cancelEditBtn.addEventListener('click', () => setEditMode(false));

  grid.addEventListener('click', (e) => {
    const item = e.target.closest('.photo-item');
    if (!item || !editMode) return;
    const fileId = item.dataset.fileId;
    if (selectedIds.has(fileId)) {
      selectedIds.delete(fileId);
      item.classList.remove('selected');
    } else {
      selectedIds.add(fileId);
      item.classList.add('selected');
    }
    updateConfirmDeleteLabel();
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    if (!selectedIds.size) return;
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = t('gallery.deleting');
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(ids.map((id) => deletePhoto(token, id)));
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        grid.querySelector(`.photo-item[data-file-id="${ids[i]}"]`)?.remove();
      }
    });
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed) showToast(t('gallery.deleteError', { count: failed }), { error: true });
    setEditMode(false);
    updatePhotoCountLabel(grid.querySelectorAll('.photo-item').length);
  });

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const emptyState = grid.querySelector('.gallery-empty');
    if (emptyState) emptyState.remove();
    for (const file of files) {
      const skeleton = document.createElement('div');
      skeleton.className = 'photo-item';
      skeleton.innerHTML = '<div class="photo-skeleton"></div>';
      grid.prepend(skeleton);
      try {
        const uploaded = await uploadPhoto(token, place.id, file);
        const url = URL.createObjectURL(file);
        skeleton.dataset.fileId = uploaded.id;
        skeleton.innerHTML = `<img src="${url}" alt="${escapeHtml(uploaded.name)}" />`;
        updatePhotoCountLabel(grid.querySelectorAll('.photo-item').length);
      } catch (err) {
        skeleton.remove();
        showToast(t('gallery.uploadError', { name: file.name }), { error: true });
      }
    }
  }

  await renderExistingPhotos(token, place.id, grid, updatePhotoCountLabel);
}

async function renderExistingPhotos(token, placeFolderId, grid, updatePhotoCountLabel) {
  grid.innerHTML = `<div class="gallery-empty">${t('gallery.loadingPhotos')}</div>`;
  updatePhotoCountLabel(null);
  try {
    const photos = await listPhotos(token, placeFolderId);
    updatePhotoCountLabel(photos.length);
    if (!photos.length) {
      grid.innerHTML = `<div class="gallery-empty">${t('gallery.noPhotosYet')}</div>`;
      return;
    }
    grid.innerHTML = '';
    for (const photo of photos) {
      const item = document.createElement('div');
      item.className = 'photo-item';
      item.dataset.fileId = photo.id;
      item.innerHTML = '<div class="photo-skeleton"></div>';
      grid.appendChild(item);
      getPhotoBlobUrl(token, photo.id)
        .then((url) => {
          item.innerHTML = `<img src="${url}" alt="${escapeHtml(photo.name)}" />`;
        })
        .catch(() => {
          item.innerHTML = `<div class="gallery-empty">${t('gallery.photoError')}</div>`;
        });
    }
  } catch (err) {
    grid.innerHTML = `<div class="gallery-empty">${t('gallery.loadPhotosError')}</div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
