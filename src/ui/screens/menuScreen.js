import { button } from '../components/button.js';
import { avatar } from '../components/avatar.js';
import { CHARACTERS } from '../../entities/player/characters.js';

export function menuView() {
  return (
    '<div class="sheet hero">' +
    '<div>' +
    '<span class="pill">LEVEL 1 · LOCAL CO-OP</span>' +
    '<h1 class="hero-logo">' +
    '<img src="/assets/images/home/group-characters.png" alt="SYNC">' +
    '</h1>' +
    '<div class="escape-title">ESCAPE CHAIN</div>' +
    '<p class="typing" aria-label="Can technology bring us back together?">' +
    '<span aria-hidden="true" id="typed"></span>' +
    ('</p>' +
      button('start', 'Start Game ↗', 'primary') +
      '<div class="menu-links">' +
      button('controls', 'Controls', 'ghost') +
      button('controllers', 'Controllers', 'ghost') +
      '</div>') +
    '</div>' +
    '<div class="hero-art">' +
    '<span class="spark">✦</span>' +
    ('<div class="crew">' + CHARACTERS.map(avatar).join('') + '</div>') +
    '<span class="orbit-label">YOU + ME = SYNC</span>' +
    '</div>' +
    '</div>'
  );
}
