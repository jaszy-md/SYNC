import { button } from '../components/button.js';
import { heading } from '../components/heading.js';
import { back } from '../components/backButton.js';

export function controlsView(rows, controlsTab) {
  return (
    '<div class="sheet narrow">' +
    heading('INPUT / HOW TO PLAY', 'Vind jullie ritme.') +
    '<div class="tabs">' +
    ['keyboard', 'gamepad']
      .map(
        (t) =>
          '<button id="tab-' +
          t +
          '" aria-pressed="' +
          (controlsTab === t) +
          '">' +
          (t === 'keyboard' ? 'Keyboard' : 'Gamepad') +
          '</button>',
      )
      .join('') +
    '</div>' +
    ('<div class="cards controls-grid">' +
      rows
        .map(
          (keys, i) =>
            '<div class="card">' +
            ('<h3>Player ' +
              (i + 1) +
              ' · ' +
              (i === 0 ? 'Explorer' : 'Tech') +
              '</h3>' +
              keys
                .map(
                  (key, j) =>
                    '<div class="control-row">' +
                    ('<span>' + ['Bewegen', 'Springen', 'Bukken', 'Interactie'][j] + '</span>') +
                    ('<kbd>' + key + '</kbd>') +
                    '</div>',
                )
                .join('') +
              '</div>'),
        )
        .join('') +
      '</div>') +
    ('<div class="note">' +
      (controlsTab === 'keyboard'
        ? 'Pauze via de Menu-knop of Esc. Bij de uitgang: samen E + Enter vasthouden.'
        : 'Standaard gamepad: onderste knop = springen, linker knop = interactie. Koppel elke controller via Controllers; keyboard blijft beschikbaar.') +
      '</div>') +
    ('<div class="actions">' + back() + button('devices', 'Controllers →', 'ghost') + '</div>') +
    '</div>'
  );
}
