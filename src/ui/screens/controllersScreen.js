import { button } from '../components/button.js';
import { heading } from '../components/heading.js';
import { back } from '../components/backButton.js';
import { inputMethods, inputMethodLabel } from '../../core/input.js';

const escapeText = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );

const controllerName = (pad) =>
  pad.id
    .replace(/\s*\([^)]*(?:standard gamepad|vendor:|product:)[^)]*\)/gi, '')
    .replace(/\bstandard gamepad\b/gi, '')
    .trim() || `Controller ${pad.index + 1}`;

export const controllerStatus = (count) =>
  `${count === 0 ? 'Geen controllers' : count === 1 ? '1 controller' : `${count} controllers`} verbonden (max. 2)`;

export function controllersView() {
  return (
    '<div class="sheet narrow">' +
    heading(
      'DEVICE SETUP / LOCAL ONLY',
      'Controllers koppelen',
      'Druk een knop op je controller in en kies Detecteren. Kies een invoerapparaat met A, wijzig met D-pad/stick en bevestig met A.',
    ) +
    '<div id="detection-status" class="detection-status connected-controller" role="status" aria-busy="false">' +
    '<i class="controller-spinner" aria-hidden="true"></i><span>Controllers detecteren...</span></div>' +
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
  const methods = inputMethods(assignments);
  return (
    '<div id="connected-pads" class="connected-pads">' +
    connectedPadsView(assignments, pads) +
    '</div>' +
    '<div class="cards">' +
    selected
      .map((_, i) => {
        const assigned = assignments[i];
        const options = [
          {
            index: null,
            name: assigned === null ? inputMethodLabel(methods[i]) : 'Controller vrijgeven',
          },
          ...pads
            .filter((pad) => pad.index !== assignments[1 - i])
            .map((pad) => ({ index: pad.index, name: controllerName(pad) })),
        ];
        const name = options.find((option) => option.index === assigned)?.name ?? 'Keyboard';
        return (
          '<div class="card">' +
          ('<h3>Player ' + (i + 1) + '</h3>') +
          ('<label id="device-label-' + i + '" for="device-' + i + '">Invoerapparaat</label>') +
          `<button class="device-select" id="device-${i}" aria-haspopup="listbox" aria-expanded="false" aria-controls="device-options-${i}" aria-labelledby="device-label-${i} device-${i}" title="${escapeText(name)}">${escapeText(name)}</button>` +
          `<div id="device-options-${i}" class="device-options" popover="manual" role="listbox" aria-labelledby="device-label-${i}">` +
          options
            .map(
              (option) =>
                `<button type="button" role="option" tabindex="-1" data-value="${option.index ?? ''}" aria-selected="${option.index === assigned}" title="${escapeText(option.name)}">${escapeText(option.name)}</button>`,
            )
            .join('') +
          '</div>' +
          ('<p class="device-status">' + inputMethodLabel(methods[i]) + ' actief' + '</p>') +
          '</div>'
        );
      })
      .join('') +
    '</div>'
  );
}

export function connectedPadsView(assignments, pads) {
  if (!pads.length)
    return '<div class="connected-controller"><strong>Klik op Detecteren</strong><span class="controller-name">Geen controllers verbonden</span></div>';
  return pads
    .map((pad) => {
      const player = assignments.indexOf(pad.index);
      return (
        '<div class="connected-controller"' +
        (player >= 0 ? ' data-assigned="true"' : '') +
        '>' +
        '<strong>Controller ' +
        (pad.index + 1) +
        '</strong>' +
        '<span class="controller-name">' +
        escapeText(pad.id) +
        '</span>' +
        '<small>Verbonden · ' +
        (player < 0 ? 'Niet toegewezen' : 'Geselecteerd · Player ' + (player + 1)) +
        '</small></div>'
      );
    })
    .join('');
}
