import { renameTrip, deleteTrip, ensureTripShareLink, revokeTripShareLink } from './drive.js';
import { showToast } from './toast.js';
import { t } from './i18n.js';

let overlayEl = null;

/**
 * Modal de ajustes de un viaje: cambiar el nombre, compartir/dejar de
 * compartir por enlace, y eliminar el viaje (se mueve a la papelera de
 * Google Drive, junto con sus lugares y fotos).
 */
export function openTripSettings({ token, tripData, tripFolderId, onRenamed, onDeleted }) {
  if (overlayEl) overlayEl.remove();

  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.innerHTML = `
    <div class="modal-panel settings-panel">
      <div class="modal-header">
        <div>
          <h2>${t('tripSettings.title')}</h2>
        </div>
        <button class="btn btn-text" data-action="close">${t('tripSettings.close')}</button>
      </div>
      <div class="modal-body">
        <section class="settings-section">
          <label class="meta-field">
            <span>${t('tripSettings.renameLabel')}</span>
            <div class="settings-inline-row">
              <input type="text" data-role="rename-input" value="${escapeAttr(tripData.name || '')}" maxlength="80" />
              <button class="btn btn-secondary btn-small" data-action="rename-save">${t('tripSettings.renameSave')}</button>
            </div>
          </label>
        </section>

        <section class="settings-section">
          <span class="section-label">${t('tripSettings.shareTitle')}</span>
          <p class="section-hint">${t('tripSettings.shareHint')}</p>
          <div class="settings-actions-row">
            <button class="btn btn-secondary btn-small" data-action="share-generate">${t('tripSettings.shareGenerate')}</button>
            <button class="btn btn-text btn-small" data-action="share-revoke">${t('tripSettings.shareRevoke')}</button>
          </div>
        </section>

        <section class="settings-section settings-danger">
          <span class="section-label">${t('tripSettings.dangerTitle')}</span>
          <p class="section-hint">${t('tripSettings.dangerHint')}</p>
          <div data-role="danger-actions">
            <button class="btn btn-danger btn-small" data-action="delete-start">${t('tripSettings.deleteAction')}</button>
          </div>
        </section>
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl || e.target.dataset.action === 'close') {
      close();
    }
  });

  function close() {
    if (overlayEl) overlayEl.remove();
    overlayEl = null;
  }

  const renameInput = overlayEl.querySelector('[data-role="rename-input"]');
  overlayEl.querySelector('[data-action="rename-save"]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const newName = renameInput.value.trim();
    if (!newName || newName === tripData.name) return;
    btn.disabled = true;
    try {
      await renameTrip(token, tripFolderId, newName);
      tripData.name = newName;
      onRenamed?.(newName);
      showToast(t('tripSettings.renameSuccess'));
    } catch (err) {
      showToast(t('tripSettings.renameError'), { error: true });
    } finally {
      btn.disabled = false;
    }
  });

  overlayEl.querySelector('[data-action="share-generate"]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const url = await ensureTripShareLink(token, tripFolderId);
      await copyToClipboard(url);
      showToast(t('tripSettings.shareCopied'));
    } catch (err) {
      showToast(t('tripSettings.shareError'), { error: true });
    } finally {
      btn.disabled = false;
    }
  });

  overlayEl.querySelector('[data-action="share-revoke"]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await revokeTripShareLink(token, tripFolderId);
      showToast(t('tripSettings.shareRevoked'));
    } catch (err) {
      showToast(t('tripSettings.shareRevokeError'), { error: true });
    } finally {
      btn.disabled = false;
    }
  });

  const dangerActions = overlayEl.querySelector('[data-role="danger-actions"]');

  function showDeleteStart() {
    dangerActions.innerHTML = `<button class="btn btn-danger btn-small" data-action="delete-start">${t('tripSettings.deleteAction')}</button>`;
    dangerActions.querySelector('[data-action="delete-start"]').addEventListener('click', showDeleteConfirm);
  }

  function showDeleteConfirm() {
    dangerActions.innerHTML = `
      <p class="section-hint">${t('tripSettings.deleteConfirm')}</p>
      <div class="settings-actions-row">
        <button class="btn btn-danger btn-small" data-action="delete-confirm">${t('tripSettings.deleteYes')}</button>
        <button class="btn btn-text btn-small" data-action="delete-cancel">${t('tripSettings.deleteCancel')}</button>
      </div>
    `;
    dangerActions.querySelector('[data-action="delete-cancel"]').addEventListener('click', showDeleteStart);
    dangerActions.querySelector('[data-action="delete-confirm"]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await deleteTrip(token, tripFolderId);
        close();
        onDeleted?.();
      } catch (err) {
        showToast(t('tripSettings.deleteError'), { error: true });
        btn.disabled = false;
      }
    });
  }

  overlayEl.querySelector('[data-action="delete-start"]').addEventListener('click', showDeleteConfirm);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Sin permiso/soporte de portapapeles: no hacemos nada mas, el enlace
    // ya se ha generado y queda accesible via Drive de todas formas.
  }
}

function escapeAttr(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
