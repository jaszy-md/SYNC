import test from 'node:test';
import assert from 'node:assert/strict';
import { drawPowerNetwork, drawPortalGate } from '../src/stages/stage01/powerNetworkView.js';
import { Stage1 } from '../src/stages/stage01/stage01.js';
import { CHARACTERS } from '../src/entities/player/characters.js';

test('conduits animate only powered circuits without changing progression', () => {
  const stage = new Stage1([CHARACTERS[0], CHARACTERS[1]], () => 0.6);
  const calls = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, key) => target[key] ?? ((...args) => calls.push([key, ...args])),
      set: (target, key, value) => {
        calls.push([key, value]);
        target[key] = value;
        return true;
      },
    },
  );
  drawPowerNetwork(ctx, stage);
  assert.ok(!calls.some(([name, dash]) => name === 'setLineDash' && dash.length));
  stage.cell.state = 'SOCKET_B';
  stage.time = 1;
  const snapshot = () =>
    JSON.stringify({
      phase: stage.phase,
      cell: stage.cell,
      door: stage.door,
      progress: stage.progress,
      charge: stage.charge,
      platforms: stage.platforms,
    });
  const before = snapshot();
  calls.length = 0;
  drawPowerNetwork(ctx, stage);
  assert.equal(calls.filter(([name, dash]) => name === 'setLineDash' && dash.length).length, 1);
  assert.ok(calls.some(([name, value]) => name === 'lineDashOffset' && value === -48));
  drawPortalGate(ctx, stage);
  assert.equal(snapshot(), before);
  stage.time = 2;
  calls.length = 0;
  drawPowerNetwork(ctx, stage);
  assert.ok(calls.some(([name, value]) => name === 'lineDashOffset' && value === -96));
});
