export function showBottomSheet({ title, content, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'bottom-sheet-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'bottom-sheet';

  const handle = document.createElement('div');
  handle.className = 'bottom-sheet-handle';
  sheet.appendChild(handle);

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'bottom-sheet-title';
    titleEl.textContent = title;
    sheet.appendChild(titleEl);
  }

  sheet.appendChild(content);
  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);

  function close() {
    backdrop.remove();
    if (onClose) onClose();
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  return { close };
}
