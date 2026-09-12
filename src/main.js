import './style.css';
import { signOut } from './auth.js';
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTrip } from './views/trip.js';
import { state } from './state.js';

const root = document.getElementById('app');

// Si se llega aqui desde un enlace de "Compartir" (?share=<id>, o el antiguo
// ?invite=<id> por compatibilidad con enlaces ya repartidos), en vez de ir
// al panel principal tras iniciar sesion se entra directamente a ese viaje
// -- vease trip.js, que ya sabe mostrarlo en modo visitante (solo lectura,
// con boton para solicitar unirse) si la cuenta no es el anfitrion ni ya
// forma parte del viaje.
const initialParams = new URLSearchParams(window.location.search);
const pendingShareTripId = initialParams.get('share') || initialParams.get('invite') || null;

let session = null; // { token, profile }
let currentRender = () => showLogin();

function showLogin() {
  currentRender = () => showLogin();
  session = null;
  state.rootFolderId = null;
  renderLogin(root, (token, profile) => {
    session = { token, profile };
    if (pendingShareTripId) {
      showTrip(pendingShareTripId);
    } else {
      showDashboard();
    }
  });
}

function showDashboard() {
  currentRender = () => showDashboard();
  if (!session) return showLogin();
  renderDashboard(root, {
    token: session.token,
    profile: session.profile,
    onOpenTrip: (tripFolderId) => showTrip(tripFolderId),
    onSignOut: handleSignOut,
  });
}

function showTrip(tripFolderId) {
  currentRender = () => showTrip(tripFolderId);
  if (!session) return showLogin();
  renderTrip(root, {
    token: session.token,
    profile: session.profile,
    tripFolderId,
    onBack: () => showDashboard(),
  });
}

function handleSignOut() {
  signOut();
  showLogin();
}

window.addEventListener('td:signout', handleSignOut);
window.addEventListener('td:langchange', () => currentRender());

showLogin();
