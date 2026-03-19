import { goBack } from './router.js';

export function renderAbout() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const formView = document.createElement('div');
  formView.className = 'form-view';

  const header = document.createElement('div');
  header.className = 'form-header';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'form-cancel-btn';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => goBack());

  const h1 = document.createElement('h1');
  h1.textContent = 'About';

  const spacer = document.createElement('span');
  spacer.style.width = '4rem';

  header.appendChild(backBtn);
  header.appendChild(h1);
  header.appendChild(spacer);

  const body = document.createElement('div');
  body.className = 'form-body about-body';

  // Dunbar's Number
  const dunbarSection = document.createElement('div');
  dunbarSection.className = 'about-section';

  const dunbarTitle = document.createElement('h2');
  dunbarTitle.className = 'about-section-title';
  dunbarTitle.textContent = "Dunbar's Number";

  const dunbarText = document.createElement('p');
  dunbarText.className = 'about-text';
  dunbarText.textContent = 'Robin Dunbar, a British anthropologist, proposed that humans can comfortably maintain about 150 stable social relationships. This limit arises from the size of our neocortex — the part of the brain that handles complex social reasoning. Greatuncle is built around this insight: instead of connecting with thousands, it helps you stay genuinely present with the people who matter most.';

  dunbarSection.appendChild(dunbarTitle);
  dunbarSection.appendChild(dunbarText);

  // The Layers
  const layerSection = document.createElement('div');
  layerSection.className = 'about-section';

  const layerTitle = document.createElement('h2');
  layerTitle.className = 'about-section-title';
  layerTitle.textContent = 'The Layers';
  layerSection.appendChild(layerTitle);

  const layers = [
    { name: 'Hearth (5)', desc: 'Your innermost circle — family and closest friends. Stay in touch often.' },
    { name: 'Table (10)', desc: 'Close friends you see regularly and confide in.' },
    { name: 'Neighborhood (35)', desc: 'Good friends and colleagues who enrich your life.' },
    { name: 'Horizon (100)', desc: 'Acquaintances worth maintaining a yearly connection with.' },
  ];

  layers.forEach(({ name, desc }) => {
    const item = document.createElement('div');
    item.className = 'about-layer-item';
    const itemName = document.createElement('div');
    itemName.className = 'about-layer-name';
    itemName.textContent = name;
    const itemDesc = document.createElement('div');
    itemDesc.className = 'about-layer-desc';
    itemDesc.textContent = desc;
    item.appendChild(itemName);
    item.appendChild(itemDesc);
    layerSection.appendChild(item);
  });

  // Dedication
  const dedicationSection = document.createElement('div');
  dedicationSection.className = 'about-section about-dedication';

  const dedicationText = document.createElement('p');
  dedicationText.className = 'about-text';
  dedicationText.textContent = 'Greatuncle is dedicated to all the great-uncles, great-aunts, and extended family members who show up — the ones who remember your birthday, call just to check in, and make you feel like you belong somewhere.';

  dedicationSection.appendChild(dedicationText);

  // Version
  const versionSection = document.createElement('div');
  versionSection.className = 'about-section';

  const versionText = document.createElement('p');
  versionText.className = 'about-version';
  versionText.textContent = 'Version 1.0 · Built with care, no cloud required.';

  versionSection.appendChild(versionText);

  body.appendChild(dunbarSection);
  body.appendChild(layerSection);
  body.appendChild(dedicationSection);
  body.appendChild(versionSection);

  formView.appendChild(header);
  formView.appendChild(body);
  app.appendChild(formView);
}
