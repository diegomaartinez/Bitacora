import { t, langSwitcherHtml, bindLangSwitcher } from '../i18n.js';

export function renderTopbar(container, { profile, onSignOut, onBack, title } = {}) {
  container.innerHTML = `
    <div class="topbar">
      <div class="brand">
        ${
          onBack
            ? `<button class="btn btn-text" data-action="back">&larr; ${t('topbar.backToTrips')}</button>`
            : '<span class="brand-mark">Bitácora</span>'
        }
        ${title ? `<span class="brand-tag">${escapeHtml(title)}</span>` : ''}
      </div>
      <div class="user-chip">
        ${profile?.picture ? `<img src="${profile.picture}" alt="${escapeHtml(profile.name || '')}" />` : ''}
        <span>${escapeHtml(profile?.name || profile?.email || '')}</span>
        ${langSwitcherHtml()}
        <button class="btn btn-text" data-action="signout">${t('topbar.signOut')}</button>
      </div>
    </div>
  `;

  if (onBack) {
    container.querySelector('[data-action="back"]').addEventListener('click', onBack);
  }
  bindLangSwitcher(container);
  container.querySelector('[data-action="signout"]').addEventListener('click', onSignOut);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
