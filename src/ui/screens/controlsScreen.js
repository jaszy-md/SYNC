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
              (keys
                ? keys
                    .map(
                      (key, j) =>
                        '<div class="control-row">' +
                        ('<span>' +
                          ['Bewegen', 'Springen', 'Bukken', 'Interactie'][j] +
                          '</span>') +
                        ('<kbd>' + key + '</kbd>') +
                        '</div>',
                    )
                    .join('')
                : '<p class="device-status">Controller actief · Geen keyboardbesturing</p>') +
              '</div>'),
        )
        .join('') +
      '</div>') +
    ('<div class="connected-controller flow-info"><strong>Bediening & pauze</strong><span>' +
      (controlsTab === 'keyboard'
        ? 'Pauze via de Menu-knop of Esc. Bij de uitgang: samen E + Enter vasthouden.'
        : 'Gamepad: A = springen, B = bukken, X = interactie, Start = Menu. In menu’s: D-pad/stick = navigeren, A = bevestigen, B = terug. Iedere speler gebruikt één invoerapparaat.') +
      '</span></div>') +
    ('<div class="actions">' + back() + button('save-controls', 'Opslaan', 'primary') + '</div>') +
    '</div>'
  );
}
