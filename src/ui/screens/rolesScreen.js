import { button } from '../components/button.js';
import { avatar } from '../components/avatar.js';
import { skillIcon } from '../components/skillIcon.js';
import { CHARACTERS } from '../../entities/player/characters.js';
import { inputMethods, inputMethodLabel } from '../../core/input.js';
import { getStageBriefing } from '../stageBriefings.js';
import { systemButton } from '../components/systemButton.js';

function abilityRow(info, kind) {
  return (
    '<div class="briefing-ability ' +
    kind +
    '"><span class="ability-icon">' +
    skillIcon(info.icon) +
    '</span><div><span class="ability-kind">' +
    kind.toUpperCase() +
    '</span><h4>' +
    info.title +
    '</h4><p>' +
    info.description +
    '</p>' +
    (info.note ? '<small class="ability-note">' + info.note + '</small>' : '') +
    '</div></div>'
  );
}

export function rolesView(selected, assignments, briefing = getStageBriefing(1)) {
  const methods = inputMethods(assignments);
  const panels = briefing.players.map((role, i) => {
    const character = CHARACTERS[selected[i]];
    return (
      '<article class="briefing-player" style="--player-accent:' +
      character.fallback.color +
      '">' +
      '<div class="briefing-player-head"><span class="pill">PLAYER ' +
      (i + 1) +
      '</span>' +
      '<span class="briefing-role">' +
      role.role +
      ' · ' +
      briefing.label +
      '</span></div>' +
      '<div class="briefing-player-body"><div class="briefing-portrait">' +
      avatar(character) +
      '<h3>' +
      character.name +
      '</h3></div><div class="briefing-abilities">' +
      abilityRow(role.skill, 'skill') +
      abilityRow(role.weakness, 'weakness') +
      '</div></div>' +
      '<div class="briefing-input">' +
      inputMethodLabel(methods[i]) +
      '</div></article>'
    );
  });
  return (
    '<div class="sheet setup-sheet briefing-sheet" data-stage="' +
    briefing.id +
    '">' +
    '<div class="briefing-heading"><div class="eyebrow">' +
    briefing.label +
    ' — ' +
    briefing.name +
    '</div><h2>TEAM UP</h2><p class="briefing-subtitles"><span>' +
    briefing.subtitle +
    '</span><span class="subtitle-separator" aria-hidden="true">·</span><span>' +
    briefing.teamwork +
    '</span></p><span class="briefing-stage-tag">ABILITIES FOR ' +
    briefing.label +
    '</span></div><div class="setup-content"><div class="briefing-team">' +
    panels[0] +
    '<div class="briefing-link" aria-hidden="true">' +
    skillIcon('link') +
    '<span>SYNC</span></div>' +
    panels[1] +
    '</div></div><div class="briefing-footer setup-footer">' +
    systemButton({ id: 'setup-menu', label: 'Open TEAM UP-menu en instellingen' }) +
    '<div class="actions">' +
    button('back', '← Characters', 'ghost') +
    button('play', 'START ' + briefing.label + ' →', 'primary') +
    '</div></div></div>'
  );
}
