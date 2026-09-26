import { button } from '../components/button.js';
import { avatar } from '../components/avatar.js';
import { heading } from '../components/heading.js';
import { CHARACTERS } from '../../entities/player/characters.js';

export function readyView(selected, assignments) {
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
            (assignments[i] === null ? 'Keyboard' : 'Controller ' + (assignments[i] + 1)) +
            ' · ' +
            (i === 0 ? 'Drukplaat & lier' : 'Energiecel') +
            '</p>') +
          '</div>' +
          '</article>',
      )
      .join('') +
    '</div>' +
    '<div class="note">Alleen 2 spelers · Praat met elkaar. Extra hulp vind je tijdens het spelen in Menu → Vraag een hint.</div>' +
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
