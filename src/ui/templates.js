import { CHARACTERS } from '../player.js';

// Keep markup construction separate from navigation and event listeners.
// Concatenation preserves whitespace between inline elements exactly.
// Runtime character colors are shared with Canvas via a CSS custom property.

const button = (id, label, kind = 'secondary') =>
  '<button id="' + id + '" class="' + kind + '">' + label + '</button>';
const avatar = (character) =>
  '<span class="avatar ' +
  character.shape +
  '" style="--character:' +
  character.color +
  '" aria-hidden="true">' +
  '<i></i>' +
  '</span>';
const heading = (label, title, description = '') =>
  '<div class="screen-head">' +
  ('<div class="eyebrow">' + label + '</div>') +
  ('<h2>' + title + '</h2>' + (description ? '<p>' + description + '</p>' : '') + '</div>');
const characterBadges = ['CIRKEL / CYAN', 'VIERKANT / AMBER', 'RUIT / PAARS', 'DRIEHOEK / ROZE'];

function roles() {
  return (
    '<div class="cards">' +
    '<article class="card role-card">' +
    '<span class="role-icon">↟</span>' +
    '<span class="pill">PLAYER 1</span>' +
    '<h3>Explorer</h3>' +
    '<p>Vind wat de ander niet ziet.</p>' +
    '<ul>' +
    '<li>Hoge sprong & bovenroute</li>' +
    '<li>Houdt drukplaat en lier actief</li>' +
    '<li>Maakt doorgangen vrij</li>' +
    '</ul>' +
    '<div class="weakness">Heeft de energiecel van de Tech nodig.</div>' +
    '</article>' +
    '<article class="card role-card support">' +
    '<span class="role-icon">⌘</span>' +
    '<span class="pill">PLAYER 2</span>' +
    '<h3>Tech</h3>' +
    '<p>Maak jullie volgende stap mogelijk.</p>' +
    '<ul>' +
    '<li>Draagt één gedeelde energiecel</li>' +
    '<li>Voedt brug en uitgang</li>' +
    '<li>Verplaatst de stroom tussen aansluitingen</li>' +
    '</ul>' +
    '<div class="weakness">Kan niet op de hoge platforms komen.</div>' +
    '</article>' +
    '</div>'
  );
}

const back = () => button('panel-back', '← Terug', 'ghost');

export function completeView() {
  return (
    '<div class="sheet narrow complete">' +
    ('<div class="complete-icon">✦</div>' +
      heading(
        'LEVEL 1 / VERBINDING GEMAAKT',
        'STAGE 1 COMPLETE',
        'Energie doorgegeven. Sluizen geopend. Samen ontsnapt.',
      ) +
      '<div class="actions">' +
      button('replay', 'Nog een ronde ↗', 'primary') +
      button('main-menu', 'Hoofdmenu') +
      '</div>') +
    '</div>'
  );
}

export function menuView() {
  return (
    '<div class="sheet hero">' +
    '<div>' +
    '<span class="pill">LEVEL 1 · LOCAL CO-OP</span>' +
    '<h1 class="hero-logo">' +
    '<img src="/assets/images/group-characters.png" alt="SYNC">' +
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

export function rolesView() {
  return (
    '<div class="sheet">' +
    heading(
      '01 / TEAM UP',
      'Twee spelers. Eén missie.',
      'Alleen 2 lokale spelers op hetzelfde scherm. Ontdek, communiceer en open samen de uitgang.',
    ) +
    roles() +
    '<div class="actions">' +
    button('back', '← Hoofdmenu', 'ghost') +
    button('next', 'Kies jullie characters →', 'primary') +
    '</div>' +
    '</div>'
  );
}

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
    ('<div class="character-grid">' +
      CHARACTERS.map(
        (character, j) =>
          '<button class="character-option" id="character-' +
          j +
          '" style="--character:' +
          character.color +
          '" aria-pressed="' +
          (j === selected[activePlayer]) +
          '" ' +
          (j === selected[1 - activePlayer] ? 'disabled' : '') +
          '>' +
          avatar(character) +
          '<span>' +
          character.name +
          '<small>' +
          characterBadges[j] +
          '</small>' +
          '</span>' +
          ('<span class="choice-badge">' +
            (selected.includes(j) ? 'P' + (selected.indexOf(j) + 1) + ' ✓' : '') +
            '</span>') +
          '</button>',
      ).join('') +
      '</div>') +
    '<div class="character-preview">' +
    ('<span class="preview-label">PLAYER ' +
      (activePlayer + 1) +
      ' / SELECTED</span>' +
      avatar(character) +
      '<div>') +
    ('<h3>' + character.name + '</h3>') +
    ('<p>PLACEHOLDER · ' + characterBadges[selected[activePlayer]] + '</p>') +
    '</div>' +
    '</div>' +
    '</div>' +
    ('<div class="actions">' +
      button('back', '← Rollen', 'ghost') +
      button('next', 'Team gereed →', 'primary') +
      '</div>') +
    '</div>'
  );
}

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

export function pauseView() {
  return (
    '<div class="sheet narrow">' +
    heading('TAKE A BREATHER', 'Even uit de sync.', 'De wereld wacht op jullie.') +
    '<div class="pause-grid">' +
    button('resume', '▶ Verder spelen<small>Terug naar jullie verbinding</small>', 'primary') +
    button('hint', '✦ Vraag een hint<small>Zoek en verzamel een marker in de wereld</small>') +
    button('controls', 'Controls<small>Keyboard & gamepad</small>') +
    button('controllers', 'Controllerstatus<small>Verbinding en spelerkoppeling</small>') +
    button('restart', 'Stage opnieuw<small>Zet de energiecel terug bij de start</small>') +
    button('main-menu', 'Naar hoofdmenu<small>Verlaat deze ronde</small>') +
    '</div>' +
    '</div>'
  );
}

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
