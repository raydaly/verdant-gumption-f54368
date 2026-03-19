let activeToast = null;

export function showToast(message, onUndo, durationMs = 5000) {
  if (activeToast) {
    clearTimeout(activeToast.timer);
    activeToast.el.remove();
    activeToast = null;
  }

  const toast = document.createElement('div');
  toast.className = 'toast';

  const msg = document.createElement('span');
  msg.textContent = message;
  toast.appendChild(msg);

  if (onUndo) {
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Undo';
    undoBtn.addEventListener('click', () => {
      clearTimeout(activeToast?.timer);
      toast.remove();
      activeToast = null;
      onUndo();
    });
    toast.appendChild(undoBtn);
  }

  document.body.appendChild(toast);

  const timer = setTimeout(() => {
    toast.remove();
    activeToast = null;
  }, durationMs);

  activeToast = { el: toast, timer };
}
