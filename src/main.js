import './style.css';
import { signOut } from './auth.js';
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTrip } from './views/trip.js';
import { renderPublicTrip } from './publicTripView.js';
import { renderInvite } from './invite.js';
import { state } from './state.js';

const root = document.getElementById('app');

let session = null; // { token, profile }
let currentRender = () => showLogin();

function showLogin() {
  currentRender = () => showLogin();
  session = null;
  state.rootFolderId = null;
  renderLogin(root, (token, profile) => {
    session = { token, profile };
    showDashboard();
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

function showPublicTrip(tripFolderId) {
  currentRender = () => showPublicTrip(tripFolderId);
  renderPublicTrip(root, { tripFolderId });
}

function showInvite(tripFolderId) {
  currentRender = () => showInvite(tripFolderId);
  renderInvite(root, {
    tripFolderId,
    session,
    onSignIn: (token, profile) => {
      session = { token, profile };
    },
    onEnterViewer: () => showPublicTrip(tripFolderId),
    onEnterEditor: () => showTrip(tripFolderId),
    onGoToDashboard: () => (session ? showDashboard() : showLogin()),
  });
}

window.addEventListener('td:signout', handleSignOut);
window.addEventListener('td:langchange', () => currentRender());

const params = new URLSearchParams(window.location.search);
const sharedTripId = params.get('share');
const inviteTripId = params.get('invite');
if (inviteTripId) {
  showInvite(inviteTripId);
} else if (sharedTripId) {
  showPublicTrip(sharedTripId);
} else {
  showLogin();
}
