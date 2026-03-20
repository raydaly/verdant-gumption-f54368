export function showConfirmDialog({ title, message, confirmPhrase = 'DELETE', onConfirm }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';

    const titleEl = document.createElement('h2');
    titleEl.className = 'confirm-dialog-title';
    titleEl.textContent = title;

    const messageEl = document.createElement('p');
    messageEl.className = 'confirm-dialog-message';
    messageEl.textContent = message;

    const phraseHint = document.createElement('p');
    phraseHint.className = 'confirm-dialog-hint';
    phraseHint.textContent = `Type "${confirmPhrase}" to confirm.`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = confirmPhrase;
    input.autocomplete = 'off';
    input.spellcheck = false;

    const btnRow = document.createElement('div');
    btnRow.className = 'confirm-dialog-btns';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'confirm-dialog-cancel';
    cancelBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'confirm-dialog-confirm';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.disabled = true;

    input.addEventListener('input', () => {
      confirmBtn.disabled = input.value !== confirmPhrase;
    });

    const finish = (result) => {
      overlay.remove();
      if (result && onConfirm) onConfirm();
      resolve(result);
    };

    cancelBtn.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(false);
    });

    confirmBtn.addEventListener('click', () => finish(true));

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);

    dialog.appendChild(titleEl);
    dialog.appendChild(messageEl);
    dialog.appendChild(phraseHint);
    dialog.appendChild(input);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    setTimeout(() => input.focus(), 100);
  });
}
