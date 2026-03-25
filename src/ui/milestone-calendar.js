import { getAllContacts } from '../storage/contacts.js';
import { getFullYearMilestones, formatMilestoneDate } from '../core/milestone-engine.js';
import { navigate } from './router.js';
import { getSettings } from '../storage/settings.js';

/**
 * Renders the full 12-month milestone calendar.
 */
export async function renderMilestoneCalendar(db) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="view-loading"><div class="view-loading-spinner"></div><span>Opening the calendar...</span></div>';

  const [allContacts, settings] = await Promise.all([
    getAllContacts(db),
    getSettings(db)
  ]);
  const nonOwnerContacts = allContacts.filter(c => !(c.t || []).includes('&owner'));
  const milestonesByMonth = getFullYearMilestones(nonOwnerContacts);

  app.innerHTML = '';
  
  const formatAge = (e) => {
    if (!settings.showAge || !e.age) return '';
    const suffix = (e.age % 10 === 1 && e.age !== 11) ? 'st' : 
                   (e.age % 10 === 2 && e.age !== 12) ? 'nd' :
                   (e.age % 10 === 3 && e.age !== 13) ? 'rd' : 'th';
    return ` · ${e.age}${suffix}`;
  };

  // Header
  const header = document.createElement('div');
  header.className = 'view-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'header-icon-btn';
  backBtn.textContent = '←';
  backBtn.onclick = () => navigate('people');
  header.appendChild(backBtn);

  const h1 = document.createElement('h1');
  h1.textContent = 'Milestone Calendar';
  header.appendChild(h1);

  const printBtn = document.createElement('button');
  printBtn.className = 'header-icon-btn';
  printBtn.textContent = '🖨️';
  printBtn.setAttribute('aria-label', 'Print milestone calendar');
  printBtn.onclick = () => {
    const printEl = document.createElement('div');
    printEl.className = 'print-contact-list'; // Reuse styling
    
    const title = document.createElement('h1');
    title.textContent = 'Our Milestones';
    printEl.appendChild(title);

    milestonesByMonth.forEach(m => {
      const monthHeader = document.createElement('h2');
      monthHeader.style.marginTop = '20px';
      monthHeader.textContent = m.name;
      printEl.appendChild(monthHeader);

      m.events.forEach(e => {
        const row = document.createElement('div');
        row.className = 'print-contact-row';
        const dateStr = formatMilestoneDate(e.month, e.day, settings.dateFormat);
        row.innerHTML = `<strong>${dateStr}</strong> · ${e.name} (${e.type}${formatAge(e)})`;
        printEl.appendChild(row);
      });
    });

    document.body.appendChild(printEl);
    window.print();
    document.body.removeChild(printEl);
  };
  header.appendChild(printBtn);

  app.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.className = 'view-content';

  if (milestonesByMonth.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state-icon">📅</div>
      <p>No birthdays or anniversaries found.<br>Add dates to your contacts to see them here.</p>
    `;
    content.appendChild(empty);
  } else {
    milestonesByMonth.forEach(m => {
      const section = document.createElement('div');
      section.className = 'milestone-month-section';
      section.style.marginBottom = '20px';

      const monthTitle = document.createElement('h3');
      monthTitle.style.color = 'var(--text-accent)';
      monthTitle.style.borderBottom = '1px solid var(--color-border)';
      monthTitle.style.paddingBottom = '5px';
      monthTitle.style.marginBottom = '10px';
      monthTitle.textContent = m.name;
      section.appendChild(monthTitle);

      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '8px';

      m.events.forEach(e => {
        const item = document.createElement('div');
        item.className = 'milestone-item';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '12px';
        item.style.padding = '8px 4px';

        const ageLabel = formatAge(e);
        const dateStr = formatMilestoneDate(e.month, e.day, settings.dateFormat);

        item.innerHTML = `
          <div class="milestone-day" style="width: auto; min-width: 30px; font-weight: bold; font-size: 1.0rem; opacity: 0.8;">${e.day}</div>
          <div class="milestone-icon" style="font-size: 1.2rem;">${e.icon}</div>
          <div class="milestone-details">
            <div style="font-weight: 500;">${e.name}</div>
            <div style="font-size: 0.8rem; opacity: 0.6;">${e.type}${ageLabel}</div>
          </div>
        `;
        list.appendChild(item);
      });

      section.appendChild(list);
      content.appendChild(section);
    });
  }

  app.appendChild(content);
}
