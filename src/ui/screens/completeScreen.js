import { button } from '../components/button.js';
import { heading } from '../components/heading.js';

export function completeView() {
  return (
    '<div class="sheet narrow complete">' +
    ('<div class="complete-icon">✦</div>' +
      heading(
        'LEVEL 1 / VERBINDING GEMAAKT',
        'STAGE 1 COMPLETE',
        'Energie doorgegeven. Sluizen geopend. Samen ontsnapt.',
      ) +
      '<div class="actions">' +
      button('replay', 'Nog een ronde ↗', 'primary') +
      button('main-menu', 'Hoofdmenu') +
      '</div>') +
    '</div>'
  );
}
