import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config.js';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const FULL_SCOPES = `openid email profile ${GOOGLE_SCOPES}`;

let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0;
let profile = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

export async function initAuth() {
  await loadScript(GIS_SRC);
  if (!window.google || !window.google.accounts) {
    throw new Error('Google Identity Services no se ha cargado correctamente.');
  }
}

export function isConfigured() {
  return !GOOGLE_CLIENT_ID.includes('TU_CLIENT_ID');
}

export function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  return null;
}

export function getProfile() {
  return profile;
}

async function fetchProfile(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export function signIn() {
  return new Promise((resolve, reject) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: FULL_SCOPES,
        callback: async (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          accessToken = response.access_token;
          tokenExpiresAt = Date.now() + (Number(response.expires_in) || 3600) * 1000 - 30000;
          profile = await fetchProfile(accessToken);
          resolve({ accessToken, profile });
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'El usuario cancelo el inicio de sesion.'));
        },
      });
      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      reject(err);
    }
  });
}

export function signOut() {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  tokenExpiresAt = 0;
  profile = null;
}

/** Pide un token nuevo en silencio si el actual ha caducado, sin bloquear la UI. */
export async function ensureFreshToken() {
  const current = getAccessToken();
  if (current) return current;
  if (!tokenClient) return null;
  return new Promise((resolve) => {
    tokenClient.callback = async (response) => {
      if (response.error) {
        resolve(null);
        return;
      }
      accessToken = response.access_token;
      tokenExpiresAt = Date.now() + (Number(response.expires_in) || 3600) * 1000 - 30000;
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: '' });
  });
}
