import { button } from '../components/button.js';
import { heading } from '../components/heading.js';
import { back } from '../components/backButton.js';

export function controllersView() {
  return (
    '<div class="sheet narrow">' +
    heading(
      'DEVICE SETUP / LOCAL ONLY',
      'Controllers koppelen',
      'Druk een knop op je controller in en klik op Detecteren.',
    ) +
    '<div id="pads">' +
    '</div>' +
    '<p id="device-message" class="inline-message" role="status">' +
    '</p>' +
    ('<div class="actions">' +
      back() +
      '<div class="group">' +
      button('scan', 'Detecteren') +
      button('save-pads', 'Opslaan', 'primary') +
      '</div>') +
    '</div>' +
    '</div>'
  );
}

export function deviceCardsView(selected, assignments, pads) {
  return (
    '<div class="cards">' +
    selected
      .map((_, i) => {
        const assigned = assignments[i],
          disconnected = assigned !== null && !pads.some((p) => p.index === assigned);
        return (
          '<div class="card">' +
          ('<h3>Player ' + (i + 1) + '</h3>') +
          ('<label for="device-' + i + '">Invoerapparaat</label>') +
          ('<select class="device-select" id="device-' + i + '">') +
          ('<option value="">Keyboard</option>' +
            pads
              .map(
                (p) =>
                  '<option value="' +
                  p.index +
                  '" ' +
                  (assigned === p.index ? 'selected' : '') +
                  '>Controller ' +
                  (p.index + 1) +
                  '</option>',
              )
              .join('') +
            (disconnected
              ? '<option value="' +
                assigned +
                '" selected>Controller ' +
                (assigned + 1) +
                ' (offline)</option>'
              : '') +
            '</select>') +
          ('<p class="device-status">' +
            (assigned === null
              ? 'Keyboard actief'
              : disconnected
                ? 'Offline · gebruik keyboard'
                : 'Controller gekoppeld') +
            '</p>') +
          '</div>'
        );
      })
      .join('') +
    '</div>' +
    ('<div class="note">' +
      pads.length +
      ' controller(s) verbonden · Maximaal 2 spelers. Toewijzingen blijven bewaard bij opnieuw spelen.</div>')
  );
}
