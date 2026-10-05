import { button } from '../components/button.js';
import { heading } from '../components/heading.js';

export function pauseView() {
  return (
    '<div class="sheet narrow">' +
    heading('TAKE A BREATHER', 'Even uit de sync.', 'De wereld wacht op jullie.') +
    '<div class="pause-grid">' +
    button('resume', '▶ Verder spelen<small>Terug naar jullie verbinding</small>', 'primary') +
    button('hint', '◈ Helperverbinding<small>Praat met de facility-helper</small>') +
    button('controls', 'Controls<small>Keyboard & gamepad</small>') +
    button('controllers', 'Controllerstatus<small>Verbinding en spelerkoppeling</small>') +
    button('restart', 'Stage opnieuw<small>Zet de energiecel terug bij de start</small>') +
    button('main-menu', 'Naar hoofdmenu<small>Verlaat deze ronde</small>') +
    '</div>' +
    '</div>'
  );
}
