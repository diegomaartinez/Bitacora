import { initAuth, isConfigured, signIn, signOut } from './auth.js';
import { getPublicTripData } from './drive.js';
import { pickSharedFolder } from './picker.js';
import { showToast } from './toast.js';
import { t, langSwitcherHtml, bindLangSwitcher } from './i18n.js';

/**
 * Pantalla de invitacion a un viaje compartido: la persona invitada llega
 * aqui al abrir el enlace (?invite=<id-del-viaje>) que le paso el
 * anfitrion. Primero le pedimos iniciar sesion (para saber que cuenta es),
 * comprobamos que su email este en la lista de colaboradores del viaje
 * (trip.json -> collaborators, ver drive.js -> addCollaborator) y, si es
 * asi, le dejamos aceptar. Segun el permiso que le dio el anfitrion:
 *  - "viewer": pasa directamente a la vista de solo lectura del viaje.
 *  - "editor": antes tiene que "abrir" la carpeta compartida una vez con
 *    el selector de Google (ver picker.js) para que la app pueda editarla
 *    en su nombre, y despues entra en la vista de edicion normal.
 */
export function renderInvite(root, { tripFolderId, session, onSignIn, onEnterViewer, onEnterEditor, onGoToDashboard }) {
  let currentSession = session;

  function renderShell(bodyHtml) {
    root.innerHTML = `
      <div class="login-screen">
        <div class="login-lang-switch" data-role="lang-switch"></div>
        <div class="login-card invite-card">
          <span class="brand-mark">Bitácora</span>
          ${bodyHtml}
        </div>
      </div>
    `;
    bindLangSwitcher(root.querySelector('[data-role="lang-switch"]'));
  }

  function renderSignInStep() {
    renderShell(`
      <h1>${t('invite.title')}</h1>
      <p>${t('invite.signInHint')}</p>
      <button class="google-btn" data-action="signin">${googleIcon()} ${t('login.continueGoogle')}</button>
      <div class="error-banner" data-role="error" style="display:none"></div>
    `);

    const errorEl = root.querySelector('[data-role="error"]');
    root.querySelector('[data-action="signin"]').addEventListener('click', async (e) => {
      if (!isConfigured()) {
        showToast(t('login.notReadyGeneric'), { error: true });
        return;
      }
      const btn = e.currentTarget;
      btn.disabled = true;
      errorEl.style.display = 'none';
      try {
        await initAuth();
        const { accessToken, profile } = await signIn();
        currentSession = { token: accessToken, profile };
        onSignIn(accessToken, profile);
        loadInvite();
      } catch (err) {
        errorEl.textContent = err.message || t('login.signInGenericError');
        errorEl.style.display = 'block';
      } finally {
        btn.disabled = false;
      }
    });
  }

  function renderLoadingStep() {
    renderShell(`<p>${t('invite.loading')}</p>`);
  }

  function renderNotFoundStep() {
    renderShell(`
      <h1>${t('invite.title')}</h1>
      <p>${t('invite.notFound')}</p>
      <button class="btn btn-secondary" data-action="dashboard">${t('invite.backToDashboard')}</button>
    `);
    root.querySelector('[data-action="dashboard"]').addEventListener('click', () => onGoToDashboard());
  }

  function renderNotForYouStep(email) {
    renderShell(`
      <h1>${t('invite.title')}</h1>
      <p>${t('invite.notForYou', { email: escapeHtml(email) })}</p>
      <button class="btn btn-secondary" data-action="switch">${t('invite.switchAccount')}</button>
      <button class="btn btn-text" data-action="dashboard">${t('invite.backToDashboard')}</button>
    `);
    root.querySelector('[data-action="switch"]').addEventListener('click', async () => {
      signOut();
      currentSession = null;
      renderSignInStep();
    });
    root.querySelector('[data-action="dashboard"]').addEventListener('click', () => onGoToDashboard());
  }

  function renderAcceptStep(tripData, role) {
    const hostLabel = tripData.ownerName || tripData.ownerEmail;
    const message = hostLabel
      ? t('invite.message', { host: escapeHtml(hostLabel), trip: escapeHtml(tripData.name || '') })
      : t('invite.messageNoHost', { trip: escapeHtml(tripData.name || '') });
    const roleHint = role === 'editor' ? t('invite.roleEditor') : t('invite.roleViewer');
    renderShell(`
      <h1>${t('invite.title')}</h1>
      <p>${message}</p>
      <p class="invite-role-hint">${roleHint}</p>
      <button class="btn btn-cta" data-action="accept">${t('invite.accept')}</button>
      <button class="btn btn-text" data-action="decline">${t('invite.decline')}</button>
    `);
    root.querySelector('[data-action="decline"]').addEventListener('click', () => onGoToDashboard());
    root.querySelector('[data-action="accept"]').addEventListener('click', async (e) => {
      if (role === 'editor') {
        renderConnectFolderStep(tripData);
        return;
      }
      const btn = e.currentTarget;
      btn.disabled = true;
      onEnterViewer();
    });
  }

  function renderConnectFolderStep(tripData) {
    renderShell(`
      <h1>${t('invite.connectFolderTitle')}</h1>
      <p>${t('invite.connectFolderHint', { trip: escapeHtml(tripData.name || '') })}</p>
      <button class="btn btn-cta" data-action="connect">${t('invite.connectFolderButton')}</button>
      <div class="error-banner" data-role="error" style="display:none"></div>
    `);
    const errorEl = root.querySelector('[data-role="error"]');
    root.querySelector('[data-action="connect"]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      errorEl.style.display = 'none';
      try {
        const pickedId = await pickSharedFolder(currentSession.token);
        if (!pickedId) {
          btn.disabled = false;
          return;
        }
        if (pickedId !== tripFolderId) {
          errorEl.textContent = t('invite.connectFolderWrongPick');
          errorEl.style.display = 'block';
          btn.disabled = false;
          return;
        }
        onEnterEditor();
      } catch (err) {
        errorEl.textContent = t('invite.connectFolderError');
        errorEl.style.display = 'block';
        btn.disabled = false;
      }
    });
  }

  async function loadInvite() {
    renderLoadingStep();
    let tripData = null;
    try {
      tripData = await getPublicTripData(tripFolderId);
    } catch (err) {
      renderNotFoundStep();
      return;
    }
    if (!tripData) {
      renderNotFoundStep();
      return;
    }
    if (!Array.isArray(tripData.collaborators)) tripData.collaborators = [];

    const myEmail = (currentSession.profile?.email || '').toLowerCase();
    if (tripData.ownerEmail && tripData.ownerEmail.toLowerCase() === myEmail) {
      // El propio anfitrion abrio su enlace de invitacion: lo llevamos
      // directamente a editar su viaje.
      onEnterEditor();
      return;
    }
    const collab = tripData.collaborators.find((c) => c.email.toLowerCase() === myEmail);
    if (!collab) {
      renderNotForYouStep(currentSession.profile?.email || '');
      return;
    }
    renderAcceptStep(tripData, collab.role);
  }

  if (!currentSession) {
    renderSignInStep();
  } else {
    loadInvite();
  }
}

function googleIcon() {
  return `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33C2.44 15.98 5.48 18 9 18z"/>
    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.27-1.7V4.97H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
  </svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
