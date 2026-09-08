import {
  renameTrip,
  deleteTrip,
  ensureTripShareLink,
  revokeTripShareLink,
  tripInviteLink,
  addCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
} from './drive.js';
import { showToast } from './toast.js';
import { t } from './i18n.js';

let overlayEl = null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal de ajustes de un viaje: cambiar el nombre, compartir/dejar de
 * compartir por enlace, gestionar quien tiene acceso al viaje (amigos y
 * familia invitados por email, con permiso de ver o de editar), y eliminar
 * el viaje (se mueve a la papelera de Google Drive, junto con sus lugares
 * y fotos).
 */
export function openTripSettings({ token, tripData, tripFolderId, profile, isOwner = true, onRenamed, onDeleted }) {
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

        <section class="settings-section">
          <span class="section-label">${t('tripSettings.collabTitle')}</span>
          <p class="section-hint">${t('tripSettings.collabHint')}</p>
          ${
            isOwner
              ? `
                <div class="settings-collab-form" data-role="collab-form">
                  <input type="email" class="prompt-input" data-role="collab-email" placeholder="${t('tripSettings.collabEmailPlaceholder')}" maxlength="120" />
                  <select data-role="collab-role" class="collab-role-select">
                    <option value="viewer">${t('tripSettings.collabRoleViewer')}</option>
                    <option value="editor">${t('tripSettings.collabRoleEditor')}</option>
                  </select>
                  <button type="button" class="btn btn-secondary btn-small" data-action="collab-invite">${t('tripSettings.collabInvite')}</button>
                </div>
                <div class="settings-actions-row">
                  <button type="button" class="btn btn-text btn-small" data-action="collab-copy-link">${t('tripSettings.collabCopyLink')}</button>
                </div>
              `
              : `<p class="section-hint">${t('tripSettings.collabOnlyOwner')}</p>`
          }
          <ul class="collab-members-list" data-role="collab-members"></ul>
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

  // ------------------------- Amigos y familia -------------------------
  const membersList = overlayEl.querySelector('[data-role="collab-members"]');
  const myEmail = (profile?.email || '').toLowerCase();

  function renderMembers() {
    const rows = [];
    if (tripData.ownerEmail) {
      const youTag = tripData.ownerEmail.toLowerCase() === myEmail ? ` ${t('tripSettings.collabYouTag')}` : '';
      rows.push(`
        <li class="collab-member-item">
          <span class="collab-member-email">${escapeAttr(tripData.ownerName || tripData.ownerEmail)}${youTag}</span>
          <span class="collab-role-tag collab-role-owner">${t('tripSettings.collabOwnerTag')}</span>
        </li>
      `);
    }
    (tripData.collaborators || []).forEach((c) => {
      const youTag = c.email.toLowerCase() === myEmail ? ` ${t('tripSettings.collabYouTag')}` : '';
      if (isOwner) {
        rows.push(`
          <li class="collab-member-item" data-email="${escapeAttr(c.email)}">
            <span class="collab-member-email">${escapeAttr(c.email)}${youTag}</span>
            <select class="collab-role-select collab-role-select-small" data-role="member-role-select" data-email="${escapeAttr(c.email)}">
              <option value="viewer" ${c.role === 'viewer' ? 'selected' : ''}>${t('tripSettings.collabRoleViewer')}</option>
              <option value="editor" ${c.role === 'editor' ? 'selected' : ''}>${t('tripSettings.collabRoleEditor')}</option>
            </select>
            <button type="button" class="btn btn-text btn-small" data-action="member-remove" data-email="${escapeAttr(c.email)}">${t('tripSettings.collabRemove')}</button>
          </li>
        `);
      } else {
        const roleLabel = c.role === 'editor' ? t('tripSettings.collabRoleEditor') : t('tripSettings.collabRoleViewer');
        rows.push(`
          <li class="collab-member-item">
            <span class="collab-member-email">${escapeAttr(c.email)}${youTag}</span>
            <span class="collab-role-tag">${roleLabel}</span>
          </li>
        `);
      }
    });
    membersList.innerHTML = rows.join('');

    membersList.querySelectorAll('[data-role="member-role-select"]').forEach((select) => {
      select.addEventListener('change', async () => {
        const email = select.dataset.email;
        const newRole = select.value;
        select.disabled = true;
        try {
          await updateCollaboratorRole(token, tripFolderId, tripData, email, newRole);
          showToast(t('tripSettings.collabRoleUpdated'));
        } catch (err) {
          showToast(t('tripSettings.collabRoleUpdateError'), { error: true });
          renderMembers();
        } finally {
          select.disabled = false;
        }
      });
    });

    membersList.querySelectorAll('[data-action="member-remove"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email;
        if (!window.confirm(t('tripSettings.collabRemoveConfirm', { email }))) return;
        btn.disabled = true;
        try {
          await removeCollaborator(token, tripFolderId, tripData, email);
          showToast(t('tripSettings.collabRemoveSuccess'));
          renderMembers();
        } catch (err) {
          showToast(t('tripSettings.collabRemoveError'), { error: true });
          btn.disabled = false;
        }
      });
    });
  }

  renderMembers();

  if (isOwner) {
    const collabEmailInput = overlayEl.querySelector('[data-role="collab-email"]');
    const collabRoleSelect = overlayEl.querySelector('[data-role="collab-role"]');
    overlayEl.querySelector('[data-action="collab-invite"]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const email = collabEmailInput.value.trim();
      if (!EMAIL_RE.test(email)) {
        showToast(t('tripSettings.collabInviteInvalidEmail'), { error: true });
        return;
      }
      if (email.toLowerCase() === myEmail) {
        showToast(t('tripSettings.collabInviteInvalidEmail'), { error: true });
        return;
      }
      btn.disabled = true;
      try {
        await addCollaborator(token, tripFolderId, tripData, email, collabRoleSelect.value);
        collabEmailInput.value = '';
        showToast(t('tripSettings.collabInviteSuccess'));
        renderMembers();
      } catch (err) {
        showToast(t('tripSettings.collabInviteError'), { error: true });
      } finally {
        btn.disabled = false;
      }
    });

    overlayEl.querySelector('[data-action="collab-copy-link"]').addEventListener('click', async () => {
      await copyToClipboard(tripInviteLink(tripFolderId));
      showToast(t('tripSettings.collabLinkCopied'));
    });
  }

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
