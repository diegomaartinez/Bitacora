import { initAuth, isConfigured, signIn } from '../auth.js';
import { showToast } from '../toast.js';
import { t, langSwitcherHtml, bindLangSwitcher } from '../i18n.js';

export function renderLogin(root, onSignedIn) {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-lang-switch">${langSwitcherHtml()}</div>
      <div class="login-card">
        <span class="brand-mark">Bitácora</span>
        <h1>${t('login.tagline')}</h1>
        <p>${t('login.description')}</p>
        <button class="google-btn" data-action="signin">
          ${googleIcon()}
          ${t('login.continueGoogle')}
        </button>
        <p class="login-note">${t('login.privacyNote')}</p>
        ${!isConfigured() ? configWarning() : ''}
        <div class="error-banner" data-role="error" style="display:none"></div>
      </div>
    </div>
  `;

  bindLangSwitcher(root.querySelector('.login-lang-switch'));

  const errorEl = root.querySelector('[data-role="error"]');
  const button = root.querySelector('[data-action="signin"]');

  button.addEventListener('click', async () => {
    if (!isConfigured()) {
      showToast(t('login.configureClientId'), { error: true });
      return;
    }
    button.disabled = true;
    errorEl.style.display = 'none';
    try {
      await initAuth();
      const { accessToken, profile } = await signIn();
      onSignedIn(accessToken, profile);
    } catch (err) {
      errorEl.textContent = err.message || t('login.signInGenericError');
      errorEl.style.display = 'block';
    } finally {
      button.disabled = false;
    }
  });
}

function configWarning() {
  return `
    <div class="config-warning">
      ${t('login.configWarning')}
    </div>
  `;
}

function googleIcon() {
  return `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33C2.44 15.98 5.48 18 9 18z"/>
    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.27-1.7V4.97H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
  </svg>`;
}
