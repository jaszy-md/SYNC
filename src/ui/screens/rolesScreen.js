import { button } from '../components/button.js';
import { heading } from '../components/heading.js';

function roles() {
  return (
    '<div class="cards">' +
    '<article class="card role-card">' +
    '<span class="role-icon">↟</span>' +
    '<span class="pill">PLAYER 1</span>' +
    '<h3>Explorer</h3>' +
    '<p>Vind wat de ander niet ziet.</p>' +
    '<ul>' +
    '<li>Hoge sprong & bovenroute</li>' +
    '<li>Houdt drukplaat en lier actief</li>' +
    '<li>Maakt doorgangen vrij</li>' +
    '</ul>' +
    '<div class="weakness">Heeft de energiecel van de Tech nodig.</div>' +
    '</article>' +
    '<article class="card role-card support">' +
    '<span class="role-icon">⌘</span>' +
    '<span class="pill">PLAYER 2</span>' +
    '<h3>Tech</h3>' +
    '<p>Maak jullie volgende stap mogelijk.</p>' +
    '<ul>' +
    '<li>Draagt één gedeelde energiecel</li>' +
    '<li>Voedt brug en uitgang</li>' +
    '<li>Verplaatst de stroom tussen aansluitingen</li>' +
    '</ul>' +
    '<div class="weakness">Kan niet op de hoge platforms komen.</div>' +
    '</article>' +
    '</div>'
  );
}

export function rolesView() {
  return (
    '<div class="sheet">' +
    heading(
      '01 / TEAM UP',
      'Twee spelers. Eén missie.',
      'Alleen 2 lokale spelers op hetzelfde scherm. Ontdek, communiceer en open samen de uitgang.',
    ) +
    roles() +
    '<div class="actions">' +
    button('back', '← Hoofdmenu', 'ghost') +
    button('next', 'Kies jullie characters →', 'primary') +
    '</div>' +
    '</div>'
  );
}
