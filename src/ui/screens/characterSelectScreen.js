import { button } from '../components/button.js';
import { avatar } from '../components/avatar.js';
import { heading } from '../components/heading.js';
import { CHARACTERS } from '../../entities/player/characters.js';

export function characterSelectView(selected, activePlayer) {
  const character = CHARACTERS[selected[activePlayer]];
  return (
    '<div class="sheet">' +
    heading(
      '02 / CHOOSE YOUR LOOK',
      'Wie zijn jullie?',
      'Je character bepaalt je look. Je rol blijft hetzelfde.',
    ) +
    '<div class="tabs player-tabs" aria-label="Speler kiezen">' +
    selected
      .map(
        (s, i) =>
          '<button id="player-' +
          i +
          '" aria-pressed="' +
          (i === activePlayer) +
          '">Player ' +
          (i + 1) +
          '<small>' +
          CHARACTERS[s].name +
          ' · ' +
          (i === 0 ? 'Explorer' : 'Tech') +
          '</small>' +
          '</button>',
      )
      .join('') +
    '</div>' +
    '<div class="character-layout">' +
    ('<div class="character-list"><div class="character-grid">' +
      CHARACTERS.map(
        (character, j) =>
          '<button class="character-option" id="character-' +
          j +
          '" style="--character:' +
          character.fallback.color +
          '" aria-pressed="' +
          (j === selected[activePlayer]) +
          '" ' +
          (j === selected[1 - activePlayer] ? 'disabled' : '') +
          '>' +
          '<span class="character-art">' +
          avatar(character) +
          '</span>' +
          '<span class="character-name">' +
          character.name +
          '</span>' +
          ('<span class="choice-badge">' +
            (selected.includes(j) ? 'P' + (selected.indexOf(j) + 1) + ' ✓' : '') +
            '</span>') +
          '</button>',
      ).join('') +
      '</div></div>') +
    '<div class="character-preview">' +
    ('<span class="preview-label">PLAYER ' +
      (activePlayer + 1) +
      ' / SELECTED</span>' +
      '<div class="character-art">' +
      avatar(character) +
      '</div>') +
    ('<h3 class="character-name">' + character.name + '</h3>') +
    '</div>' +
    '</div>' +
    ('<div class="actions">' +
      button('back', '← Rollen', 'ghost') +
      button('next', 'Team gereed →', 'primary') +
      '</div>') +
    '</div>'
  );
}
