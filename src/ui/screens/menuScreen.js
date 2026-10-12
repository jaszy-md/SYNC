import { button } from '../components/button.js';
export function menuView() {
  return (
    '<div class="sheet hero journey-hero"><div class="hero-copy">' +
    '<span class="pill">TWO PLAYERS · ONE JOURNEY</span>' +
    '<h1 class="journey-logo">SYNC<span class="logo-link" aria-hidden="true">∞</span></h1>' +
    '<div class="escape-title">ESCAPE CHAIN</div>' +
    '<p class="typing" aria-label="Can humans move as one system?"><span aria-hidden="true" id="typed"></span></p>' +
    button('start', 'Start Game →', 'primary') +
    '<div class="menu-links">' +
    button('controls', 'Controls', 'ghost') +
    button('controllers', 'Controllers', 'ghost') +
    '</div><p class="journey-note">Find your rhythm. Escape together.</p></div></div>'
  );
}
