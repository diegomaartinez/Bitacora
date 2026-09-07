// ---------------------------------------------------------------------------
// Dialogo propio para pedir un texto corto al usuario (por ejemplo, el
// nombre de un lugar nuevo), en vez de usar window.prompt() del navegador
// (que muestra una notificacion generica del navegador, con su propio
// estilo y sin poder personalizarse).
// ---------------------------------------------------------------------------

import { t } from './i18n.js';

let overlayEl = null;

function closeModal(resolve, value) {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  resolve(value);
}

/**
 * Muestra un dialogo pidiendo un texto corto. Devuelve una promesa que
 * resuelve con el texto introducido (recortado) o null si se cancela.
 */
export function openNamePrompt({
  title = t('prompt.defaultTitle'),
  description = '',
  initialValue = '',
  confirmLabel = t('prompt.defaultConfirm'),
  placeholder = t('prompt.defaultPlaceholder'),
} = {}) {
  return new Promise((resolve) => {
    if (overlayEl) overlayEl.remove();

    overlayEl = document.createElement('div');
    overlayEl.className = 'modal-overlay prompt-overlay';
    overlayEl.innerHTML = `
      <div class="modal-panel prompt-panel">
        <div class="modal-header">
          <div>
            <h2>${escapeHtml(title)}</h2>
            ${description ? `<p>${escapeHtml(description)}</p>` : ''}
          </div>
        </div>
        <div class="modal-body">
          <input type="text" class="prompt-input" data-role="prompt-input" placeholder="${escapeHtml(
            placeholder
          )}" value="${escapeHtml(initialValue)}" />
          <div class="prompt-actions">
            <button type="button" class="btn btn-text" data-action="cancel">${t('prompt.cancel')}</button>
            <button type="button" class="btn btn-primary" data-action="confirm">${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlayEl);

    const input = overlayEl.querySelector('[data-role="prompt-input"]');
    input.focus();
    input.select();

    const confirm = () => {
      const value = input.value.trim();
      closeModal(resolve, value || null);
    };
    const cancel = () => closeModal(resolve, null);

    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) cancel();
      if (e.target.dataset.action === 'confirm') confirm();
      if (e.target.dataset.action === 'cancel') cancel();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirm();
      if (e.key === 'Escape') cancel();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
