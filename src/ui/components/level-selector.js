import { TAGS } from '../core/constants.js';

const LEVELS = [
  { display: '5',   tag: TAGS.LEVELS.L5,   sublabel: 'Weekly'    },
  { display: '10',  tag: TAGS.LEVELS.L15,  sublabel: 'Monthly'   },
  { display: '35',  tag: TAGS.LEVELS.L50,  sublabel: 'Quarterly' },
  { display: '100', tag: TAGS.LEVELS.L150, sublabel: 'Annually'  },
];

export function createLevelSelector(currentTag, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'level-selector';

  LEVELS.forEach(level => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-btn' + (currentTag === level.tag ? ' selected' : '');

    const num = document.createElement('span');
    num.className = 'level-btn-number';
    num.textContent = level.display;

    const lbl = document.createElement('span');
    lbl.className = 'level-btn-label';
    lbl.textContent = level.sublabel;

    btn.appendChild(num);
    btn.appendChild(lbl);

    btn.addEventListener('click', () => {
      const isSelected = btn.classList.contains('selected');
      wrap.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
      if (isSelected) {
        onChange(null);
      } else {
        btn.classList.add('selected');
        onChange(level.tag);
      }
    });

    wrap.appendChild(btn);
  });

  return wrap;
}
