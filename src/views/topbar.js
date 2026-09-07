import { t, langSwitcherHtml, bindLangSwitcher } from '../i18n.js';

export function renderTopbar(container, { profile, onSignOut, onBack, onSettings, title } = {}) {
  container.innerHTML = `
    <div class="topbar">
      <div class="brand">
        ${
          onBack
            ? `<button class="btn btn-text" data-action="back">&larr; ${t('topbar.backToTrips')}</button>`
            : '<span class="brand-mark">Bitácora</span>'
        }
        ${title ? `<span class="brand-tag">${escapeHtml(title)}</span>` : ''}
        ${
          onSettings
            ? `<button class="icon-btn" data-action="settings" title="${t('topbar.settings')}" aria-label="${t('topbar.settings')}">${gearIcon()}</button>`
            : ''
        }
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
  if (onSettings) {
    container.querySelector('[data-action="settings"]').addEventListener('click', onSettings);
  }
  bindLangSwitcher(container);
  container.querySelector('[data-action="signout"]').addEventListener('click', onSignOut);
}

function gearIcon() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path>
  </svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
