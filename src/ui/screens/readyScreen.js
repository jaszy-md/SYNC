import { button } from '../components/button.js';
import { avatar } from '../components/avatar.js';
import { heading } from '../components/heading.js';
import { CHARACTERS } from '../../entities/player/characters.js';
import { inputMethods, inputMethodLabel } from '../../core/input.js';

export function readyView(selected, assignments) {
  const methods = inputMethods(assignments);
  return (
    '<div class="sheet narrow">' +
    heading(
      '03 / READY TO SYNC',
      'Samen ontdekken.',
      'Kraak de kooi. Verplaats de batterij. Vind samen de sleutel.',
    ) +
    '<div class="ready-grid">' +
    selected
      .map(
        (s, i) =>
          '<article class="card ready-player">' +
          avatar(CHARACTERS[s]) +
          '<div>' +
          ('<span class="pill">PLAYER ' +
            (i + 1) +
            ' / ' +
            (i === 0 ? 'EXPLORER' : 'TECH') +
            '</span>') +
          ('<h3>' + CHARACTERS[s].name + '</h3>') +
          ('<p>' +
            inputMethodLabel(methods[i]) +
            ' · ' +
            (i === 0 ? 'Drukplaat & lier' : 'Energiecel') +
            '</p>') +
          '</div>' +
          '</article>',
      )
      .join('') +
    '</div>' +
    '<div class="connected-controller flow-info"><strong>Praat met elkaar</strong><span>Alleen 2 spelers · Extra hulp vind je tijdens het spelen in Menu → Vraag een hint.</span></div>' +
    ('<div class="menu-links">' +
      button('controls', 'Controls bekijken', 'ghost') +
      button('controllers', 'Controllers koppelen', 'ghost') +
      '</div>') +
    ('<div class="actions">' +
      button('back', '← Characters', 'ghost') +
      button('play', 'Start Stage 1 ↗', 'primary') +
      '</div>') +
    '</div>'
  );
}
