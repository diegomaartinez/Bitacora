let toastEl = null;
let hideTimer = null;

export function showToast(message, { error = false, duration = 3200 } = {}) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.toggle('error', error);
  requestAnimationFrame(() => toastEl.classList.add('visible'));
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toastEl.classList.remove('visible');
  }, duration);
}
