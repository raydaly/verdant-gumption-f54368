export function createTagInput(initialTags, onChange, popularTags = []) {
  let tags = [...initialTags];

  const wrap = document.createElement('div');
  wrap.className = 'tag-input-wrap';

  function renderPills() {
    wrap.innerHTML = '';

    tags.forEach((tag, i) => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';

      const text = document.createTextNode(tag);
      pill.appendChild(text);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'tag-pill-remove';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', 'Remove ' + tag);
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tags = tags.filter((_, idx) => idx !== i);
        renderPills();
        onChange([...tags]);
      });

      pill.appendChild(removeBtn);
      wrap.appendChild(pill);
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-new-input';
    input.placeholder = '@group or #topic';

    if (popularTags && popularTags.length > 0) {
      const listId = 'tag-suggestions-list';
      input.setAttribute('list', listId);
      
      let datalist = wrap.querySelector('#' + listId);
      if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = listId;
      }
      datalist.innerHTML = '';
      popularTags.forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        datalist.appendChild(opt);
      });
      wrap.appendChild(datalist);
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
        e.preventDefault();
        addTag(input.value);
      } else if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
        tags = tags.slice(0, -1);
        renderPills();
        onChange([...tags]);
      }
    });

    input.addEventListener('blur', () => {
      if (input.value.trim()) {
        addTag(input.value);
      }
    });

    wrap.appendChild(input);
  }

  function addTag(raw) {
    const value = raw.trim();
    if (!value) return;
    if ((value.startsWith('#') || value.startsWith('@')) && value.length > 1) {
      const normalized = value.toLowerCase();
      if (!tags.includes(normalized)) {
        tags = [...tags, normalized];
        onChange([...tags]);
      }
    }
    const inputEl = wrap.querySelector('.tag-new-input');
    if (inputEl) inputEl.value = '';
    renderPills();
    const newInput = wrap.querySelector('.tag-new-input');
    if (newInput) newInput.focus();
  }

  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) {
      const input = wrap.querySelector('.tag-new-input');
      if (input) input.focus();
    }
  });

  renderPills();
  return wrap;
}
