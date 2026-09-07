export function renderTopbar(container, { profile, onSignOut, onBack, title } = {}) {
  container.innerHTML = `
    <div class="topbar">
      <div class="brand">
        ${
          onBack
            ? '<button class="btn btn-text" data-action="back">&larr; Viajes</button>'
            : '<span class="brand-mark">Bitácora</span>'
        }
        ${title ? `<span class="brand-tag">${escapeHtml(title)}</span>` : ''}
      </div>
      <div class="user-chip">
        ${profile?.picture ? `<img src="${profile.picture}" alt="${escapeHtml(profile.name || '')}" />` : ''}
        <span>${escapeHtml(profile?.name || profile?.email || '')}</span>
        <button class="btn btn-text" data-action="signout">Salir</button>
      </div>
    </div>
  `;

  if (onBack) {
    container.querySelector('[data-action="back"]').addEventListener('click', onBack);
  }
  container.querySelector('[data-action="signout"]').addEventListener('click', onSignOut);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
