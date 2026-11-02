import { button } from '../components/button.js';
import { heading } from '../components/heading.js';

export function systemMenuView() {
  return (
    '<div class="sheet narrow">' +
    heading(
      'TEAM UP / MENU',
      'Systeem en instellingen',
      'Stel jullie bediening in voordat de missie begint.',
    ) +
    '<div class="pause-grid">' +
    button('controls', 'Controls<small>Keyboard & gamepad</small>', 'secondary') +
    button('controllers', 'Controllers<small>Verbinding en spelerkoppeling</small>', 'secondary') +
    button('main-menu', 'Home<small>Terug naar het hoofdmenu</small>', 'secondary') +
    '</div><div class="actions">' +
    button('panel-back', '← TEAM UP', 'primary') +
    '</div></div>'
  );
}
