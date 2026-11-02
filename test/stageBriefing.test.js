import test from 'node:test';
import assert from 'node:assert/strict';
import { rolesView } from '../src/ui/screens/rolesScreen.js';
import { getStageBriefing, STAGE_BRIEFINGS } from '../src/ui/stageBriefings.js';
import { playerAbilities } from '../src/stages/stage01/players/abilities.js';

test('briefing uses selected sprites and Stage 1 role data without mutating gameplay or selections', () => {
  const selected = [4, 6],
    assignments = [null, null];
  const abilities = structuredClone(playerAbilities);
  const html = rolesView(selected, assignments);
  assert.match(html, /data-character="tim"/);
  assert.match(html, /data-character="enes"/);
  for (const label of [
    'HIGH JUMP',
    'TECH PUZZLES',
    'SHOOTING',
    'LOW JUMP',
    'STAGE 01',
    'Skilled at handling weapons and electrical systems.',
  ])
    assert.ok(html.includes(label));
  assert.equal((html.match(/class="skill-icon"/g) ?? []).length, 5);
  assert.match(html, /id="play"/);
  assert.match(html, /id="back"/);
  assert.match(html, /id="setup-menu"/);
  assert.doesNotMatch(
    html,
    /id="controls"|id="controllers"|Available after picking|These abilities describe/,
  );
  assert.deepEqual(selected, [4, 6]);
  assert.deepEqual(assignments, [null, null]);
  assert.deepEqual(playerAbilities, abilities);
});

test('same briefing view accepts alternate presentation data; only Stage 1 is configured', () => {
  const base = getStageBriefing(1);
  const fixture = {
    ...base,
    name: 'CONFIGURABLE MISSION',
    subtitle: 'Custom briefing copy',
    players: base.players.map((p) => ({ ...p, skill: { ...p.skill, title: 'CUSTOM SKILL' } })),
  };
  const html = rolesView([0, 1], [null, null], fixture);
  assert.match(html, /CONFIGURABLE MISSION/);
  assert.match(html, /Custom briefing copy/);
  assert.equal((html.match(/CUSTOM SKILL/g) ?? []).length, 2);
  assert.deepEqual(Object.keys(STAGE_BRIEFINGS), ['1']);
  assert.throws(() => getStageBriefing(999), /No briefing configured/);
});
