import {
  renameTrip,
  deleteTrip,
  ensureTripShareLink,
  revokeTripShareLink,
  ensureJoinRequestsFile,
  listJoinRequests,
  acceptJoinRequest,
  declineJoinRequest,
  updateCollaboratorRole,
  removeCollaborator,
} from './drive.js';
import { showToast } from './toast.js';
import { t } from './i18n.js';

let overlayEl = null;

/**
 * Modal de ajustes de un viaje: cambiar el nombre, compartir/dejar de
 * compartir por enlace, ver quien participa en el viaje y con que rol
 * (anfitrion, editor o visitante), y eliminar el viaje (se mueve a la
 * papelera de Google Drive, junto con sus lugares y fotos).
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
        ${
          isOwner
            ? `
              <section class="settings-section">
                <label class="meta-field">
                  <span>${t('tripSettings.renameLabel')}</span>
                  <div class="settings-inline-row">
                    <input type="text" data-role="rename-input" value="${escapeAttr(tripData.name || '')}" maxlength="80" />
                    <button class="btn btn-secondary btn-small" data-action="rename-save">${t('tripSettings.renameSave')}</button>
                  </div>
                </label>
              </section>
            `
            : ''
        }

        <section class="settings-section">
          <span class="section-label">${t('tripSettings.shareTitle')}</span>
          ${
            isOwner
              ? `
                <p class="section-hint">${t('tripSettings.shareHint')}</p>
                <div class="settings-actions-row">
                  <button class="btn btn-secondary btn-small" data-action="share-generate">${t('tripSettings.shareGenerate')}</button>
                  <button class="btn btn-text btn-small" data-action="share-revoke">${t('tripSettings.shareRevoke')}</button>
                </div>
              `
              : `<p class="section-hint">${t('tripSettings.collabOnlyOwner')}</p>`
          }
          <details class="settings-details" data-role="participants-details">
            <summary class="settings-summary">${t('tripSettings.participantsToggle')}</summary>
            <ul class="collab-members-list" data-role="collab-members"></ul>
          </details>
        </section>

        ${
          isOwner
            ? `
              <details class="settings-section settings-danger settings-details" data-role="danger-details">
                <summary class="section-label settings-summary">${t('tripSettings.dangerTitle')}</summary>
                <p class="section-hint">${t('tripSettings.dangerHint')}</p>
                <div data-role="danger-actions">
                  <button class="btn btn-danger btn-small" data-action="delete-start">${t('tripSettings.deleteAction')}</button>
                </div>
              </details>
            `
            : ''
        }
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

  if (isOwner) {
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
        // El archivo de solicitudes tiene que existir ya antes de que
        // llegue el primer visitante: quien no es ni anfitrion ni
        // colaborador no tiene permiso para crearlo el mismo (ver drive.js).
        await ensureJoinRequestsFile(token, tripFolderId);
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
  }

  // ------------------------- Amigos y familia -------------------------
  const membersList = overlayEl.querySelector('[data-role="collab-members"]');
  const myEmail = (profile?.email || '').toLowerCase();

  async function renderMembers() {
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
        const roleLabel = c.role === 'editor' ? t('tripSettings.collabRoleEditorTag') : t('tripSettings.collabRoleViewerTag');
        rows.push(`
          <li class="collab-member-item">
            <span class="collab-member-email">${escapeAttr(c.email)}${youTag}</span>
            <span class="collab-role-tag">${roleLabel}</span>
          </li>
        `);
      }
    });

    // Solicitudes pendientes de unirse (ver publicView/trip.js -> boton
    // "Solicitar unirse"): solo el anfitrion puede verlas y resolverlas.
    let pendingRequests = [];
    if (isOwner) {
      try {
        pendingRequests = await listJoinRequests(token, tripFolderId);
      } catch (err) {
        pendingRequests = [];
      }
    }
    pendingRequests.forEach((r) => {
      rows.push(`
        <li class="collab-member-item collab-member-pending" data-email="${escapeAttr(r.email)}">
          <span class="collab-member-email">${escapeAttr(r.name || r.email)}</span>
          <span class="collab-role-tag collab-role-pending">${t('tripSettings.joinRequestPendingTag')}</span>
          <select class="collab-role-select collab-role-select-small" data-role="request-role-select" data-email="${escapeAttr(r.email)}">
            <option value="viewer">${t('tripSettings.collabRoleViewer')}</option>
            <option value="editor">${t('tripSettings.collabRoleEditor')}</option>
          </select>
          <button type="button" class="btn btn-secondary btn-small" data-action="request-accept" data-email="${escapeAttr(r.email)}" data-name="${escapeAttr(r.name || r.email)}">${t('tripSettings.joinRequestAccept')}</button>
          <button type="button" class="btn btn-text btn-small" data-action="request-decline" data-email="${escapeAttr(r.email)}" data-name="${escapeAttr(r.name || r.email)}">${t('tripSettings.joinRequestDecline')}</button>
        </li>
      `);
    });

    membersList.innerHTML = rows.join('');

    membersList.querySelectorAll('[data-action="request-accept"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email;
        const name = btn.dataset.name;
        const row = btn.closest('.collab-member-item');
        const roleSelect = row?.querySelector('[data-role="request-role-select"]');
        const role = roleSelect?.value || 'viewer';
        btn.disabled = true;
        row?.querySelectorAll('button, select').forEach((el) => (el.disabled = true));
        try {
          await acceptJoinRequest(token, tripFolderId, tripData, email, role);
          showToast(t('tripSettings.joinRequestAcceptSuccess', { name }));
          renderMembers();
        } catch (err) {
          showToast(t('tripSettings.joinRequestAcceptError'), { error: true });
          row?.querySelectorAll('button, select').forEach((el) => (el.disabled = false));
        }
      });
    });

    membersList.querySelectorAll('[data-action="request-decline"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email;
        const name = btn.dataset.name;
        if (!window.confirm(t('tripSettings.joinRequestDeclineConfirm', { name }))) return;
        const row = btn.closest('.collab-member-item');
        row?.querySelectorAll('button, select').forEach((el) => (el.disabled = true));
        try {
          await declineJoinRequest(token, tripFolderId, email);
          showToast(t('tripSettings.joinRequestDeclineSuccess'));
          renderMembers();
        } catch (err) {
          showToast(t('tripSettings.joinRequestDeclineError'), { error: true });
          row?.querySelectorAll('button, select').forEach((el) => (el.disabled = false));
        }
      });
    });

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
    const dangerDetails = overlayEl.querySelector('[data-role="danger-details"]');
    const dangerActions = overlayEl.querySelector('[data-role="danger-actions"]');
    // Frase exacta que hay que escribir para poder eliminar el viaje: se
    // reutiliza el propio texto del boton ("Eliminar viaje" / "Delete trip")
    // para no duplicar la traduccion en dos sitios distintos.
    const requiredPhrase = t('tripSettings.deleteAction');

    const showDeleteStart = () => {
      dangerActions.innerHTML = `<button class="btn btn-danger btn-small" data-action="delete-start">${t('tripSettings.deleteAction')}</button>`;
      dangerActions.querySelector('[data-action="delete-start"]').addEventListener('click', showDeleteConfirm);
    };

    function showDeleteConfirm() {
      // Al abrir la confirmacion, evitamos que el <details> de la zona de
      // peligro se pueda plegar por accidente mientras se esta escribiendo.
      if (dangerDetails) dangerDetails.open = true;
      dangerActions.innerHTML = `
        <p class="section-hint">${t('tripSettings.deleteConfirm')}</p>
        <p class="section-hint">${t('tripSettings.deleteTypePrompt', { phrase: requiredPhrase })}</p>
        <input
          type="text"
          class="prompt-input delete-confirm-input"
          data-role="delete-confirm-input"
          placeholder="${escapeAttr(t('tripSettings.deleteTypePlaceholder'))}"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <div class="settings-actions-row">
          <button class="btn btn-danger btn-small" data-action="delete-confirm" disabled>${t('tripSettings.deleteYes')}</button>
          <button class="btn btn-text btn-small" data-action="delete-cancel">${t('tripSettings.deleteCancel')}</button>
        </div>
      `;
      const confirmInput = dangerActions.querySelector('[data-role="delete-confirm-input"]');
      const confirmBtn = dangerActions.querySelector('[data-action="delete-confirm"]');
      confirmInput.addEventListener('input', () => {
        confirmBtn.disabled = confirmInput.value !== requiredPhrase;
      });
      dangerActions.querySelector('[data-action="delete-cancel"]').addEventListener('click', showDeleteStart);
      confirmBtn.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        if (confirmInput.value !== requiredPhrase) return;
        btn.disabled = true;
        confirmInput.disabled = true;
        try {
          await deleteTrip(token, tripFolderId);
          close();
          onDeleted?.();
        } catch (err) {
          showToast(t('tripSettings.deleteError'), { error: true });
          btn.disabled = false;
          confirmInput.disabled = false;
        }
      });
    }

    overlayEl.querySelector('[data-action="delete-start"]').addEventListener('click', showDeleteConfirm);
  }
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
