import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage1 } from '../src/stages/stage01/stage01.js';
import { Player } from '../src/entities/player/createPlayer.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { Platform } from '../src/entities/objects/platform.js';
const idle = () => ({ move: 0, jump: false, crouch: false, interact: false, interactHeld: false });
const make = () => new Stage1([CHARACTERS[2], CHARACTERS[0]], () => 0);
const step = (s, actions = [idle(), idle()], seconds = 0.1) => {
  for (let t = 0; t < seconds; t += 1 / 120) s.update(1 / 120, actions);
};
const place = (p, x, y = 554) => Object.assign(p, { x, y, vx: 0, vy: 0, grounded: true });
const holding = () => [{ ...idle(), interactHeld: true }, idle()];
function releaseCell(s) {
  place(s.players[0], 340, 392);
  s.interact(s.players[0]);
  for (const symbol of s.symbolPuzzle.code) {
    place(s.players[1], s.symbolPuzzle.symbolBlocks.find((o) => o.symbol === symbol).x + 8);
    s.interact(s.players[1]);
  }
  place(s.players[0], 70);
}
function dockA(s) {
  releaseCell(s);
  place(s.players[1], 185);
  s.interact(s.players[1]);
  place(s.players[1], 560);
  s.interact(s.players[1]);
  step(s);
}
function dockB(s) {
  dockA(s);
  s.interact(s.players[1]);
  place(s.players[1], 980);
  s.interact(s.players[1]);
  step(s);
}

test('independent movement, gravity, landing, jump and crouch clearance', () => {
  const s = make();
  step(s);
  step(s, [
    { ...idle(), move: 1 },
    { ...idle(), move: -1 },
  ]);
  assert.ok(s.players[0].x > 30);
  assert.ok(s.players[1].x < 135);
  const p = s.players[0];
  assert.equal(p.y, 554);
  assert.equal(p.grounded, true);
  s.update(1 / 120, [{ ...idle(), jump: true }, idle()]);
  assert.ok(p.vy < 0);
  step(s, [idle(), idle()], 1.5);
  assert.equal(p.y, 554);
  s.update(1 / 120, [{ ...idle(), crouch: true }, idle()]);
  assert.equal(p.h, 26);
  assert.equal(p.y, 574);
  p.x = 700;
  s.update(1 / 120, [idle(), idle()]);
  assert.equal(p.h, 26);
  p.x = 800;
  s.update(1 / 120, [idle(), idle()]);
  assert.equal(p.h, 46);
});
test('walls and ceiling stop bodies', () => {
  const p = new Player(0, CHARACTERS[0], { x: 50, y: 100 }, { jumpSpeed: 760 });
  p.update({ ...idle(), move: 1 }, 1 / 120, [new Platform(79, 0, 20, 500)]);
  assert.equal(p.x, 51);
  p.vy = -760;
  p.update(idle(), 1 / 120, [new Platform(0, 90, 200, 10)]);
  assert.equal(p.y, 100);
  assert.equal(p.vy, 0);
});
test('only Explorer can reach the high pressure plate from the start', () => {
  for (const [index, expected] of [
    [0, true],
    [1, false],
  ]) {
    const s = make(),
      p = s.players[index];
    place(p, 70);
    let landed = false;
    for (let f = 0; f < 150; f++) {
      const a = [idle(), idle()];
      a[index] = { ...idle(), jump: f === 0, move: p.x < 300 ? 1 : 0 };
      s.update(1 / 120, a);
      if (p.grounded && p.y === 392) landed = true;
    }
    assert.equal(landed, expected);
  }
});
test('first gate follows remote pressure plate and refuses to crush a crossing player', () => {
  const s = make(),
    [a, b] = s.players;
  place(b, 400);
  step(s, [idle(), { ...idle(), move: 1 }], 0.5);
  assert.equal(b.x, 412);
  place(a, 300, 392);
  step(s);
  assert.equal(s.gateA.active, false);
  place(b, 445);
  place(a, 70);
  step(s);
  assert.equal(s.gateA.active, false, 'occupied gate remains open');
  place(b, 480);
  step(s);
  assert.equal(s.gateA.active, true);
});
test('one shared cell powers the bridge only while docked, and can be returned after a failed transfer', () => {
  const s = make(),
    [a, b] = s.players;
  place(a, 185);
  s.interact(a);
  assert.equal(s.cell.state, 'CAGED');
  dockA(s);
  assert.equal(s.cell.state, 'SOCKET_A');
  assert.ok(s.bridge.active);
  assert.equal(s.phase, 'TRANSFER');
  assert.equal(s.gateA.active, false);
  s.interact(b);
  step(s);
  assert.equal(s.cell.state, 'CARRIED');
  assert.equal(s.bridge.active, false);
  s.interact(b);
  step(s);
  assert.equal(s.cell.state, 'SOCKET_A');
  assert.ok(s.bridge.active);
});
test('second gate requires Explorer holding the remote winch; Tech cannot substitute', () => {
  const s = make(),
    [a, b] = s.players;
  dockA(s);
  place(b, 740, 247);
  step(s, [idle(), { ...idle(), interactHeld: true }]);
  assert.equal(s.gateB.active, true);
  place(a, 740, 247);
  place(b, 560);
  step(s, holding());
  assert.equal(s.gateB.active, false);
  step(s);
  assert.equal(s.gateB.active, true);
  step(s, holding());
  place(b, 875);
  step(s);
  assert.equal(s.gateB.active, false);
  place(b, 920);
  step(s);
  assert.equal(s.gateB.active, true);
});
test('final charge needs two separate contacts and simultaneous sustained interaction', () => {
  const s = make(),
    [a, b] = s.players;
  dockB(s);
  assert.equal(s.phase, 'CHARGE');
  assert.equal(s.gateB.active, false);
  place(a, 1035);
  place(b, 950);
  step(
    s,
    [
      { ...idle(), interactHeld: true },
      { ...idle(), interactHeld: true },
    ],
    3,
  );
  assert.equal(s.charge, 0);
  place(b, 1100);
  step(s, [{ ...idle(), interactHeld: true }, idle()], 3);
  assert.equal(s.charge, 0);
  const both = [
    { ...idle(), interactHeld: true },
    { ...idle(), interactHeld: true },
  ];
  step(s, both, 1);
  assert.ok(s.charge > 0.9 && s.charge < 1.1);
  step(s);
  assert.equal(s.charge, 0);
  step(s, both, 2.6);
  assert.equal(s.phase, 'KEY');
  assert.equal(s.key.state, 'VISIBLE');
  assert.equal(s.door.state, 'LOCKED');
  assert.equal(s.complete, false);
  place(a, 1120);
  place(b, 1150);
  s.interact(a);
  step(s, both);
  assert.equal(s.complete, false);
  assert.equal(s.door.state, 'LOCKED');
  place(b, 202, 262);
  s.interact(b);
  assert.equal(s.key.state, 'VISIBLE');
  place(a, 202, 262);
  s.interact(a);
  assert.equal(s.key.state, 'COLLECTED');
  assert.equal(s.door.state, 'LOCKED');
  place(a, 1120);
  s.interact(a);
  assert.equal(s.door.state, 'UNLOCKED');
  place(a, 1120);
  place(b, 950);
  step(s, both);
  assert.equal(s.complete, false);
  place(b, 1150);
  step(s, both);
  assert.equal(s.complete, true);
});
test('only requested world hints reveal text, require entry, and follow progress', () => {
  const s = make();
  assert.equal(s.helpMarker, null);
  assert.equal(s.message, '');
  s.requestHint();
  step(s);
  assert.equal(s.message, '');
  assert.ok(s.helpMarker);
  place(s.players[0], 215);
  step(s);
  assert.equal(s.helpMarker, null);
  assert.match(s.message, /batterij/);
  s.requestHint();
  step(s);
  assert.ok(s.helpMarker, 'standing on a new marker does not collect it');
  dockA(s);
  assert.equal(s.helpMarker.id, 'climb');
  place(s.players[0], s.winch.x, 247);
  step(s);
  assert.equal(s.helpMarker, null);
  assert.match(s.message, /lier/);
});
test('fresh stage resets cell, charge and gates without changing character identity', () => {
  const s = make();
  dockB(s);
  s.requestHint();
  const fresh = make();
  assert.equal(fresh.cell.state, 'CAGED');
  assert.equal(fresh.charge, 0);
  assert.equal(fresh.phase, 'SYMBOLS');
  assert.equal(fresh.helpMarker, null);
  assert.equal(fresh.players[0].character.id, 'c');
  assert.equal(fresh.players[1].character.id, 'a');
});
test('full energy relay and exit are reachable using real movement, jumping, crouching and interactions', () => {
  const s = make();
  const [a] = s.players;
  const walk = (i, x, { crouch = false, hold = false } = {}) => {
    for (let f = 0; f < 1500 && Math.abs(s.players[i].x - x) > 2; f++) {
      const actions = hold ? holding() : [idle(), idle()];
      actions[i] = { ...actions[i], move: Math.sign(x - s.players[i].x), crouch };
      s.update(1 / 120, actions);
    }
    assert.ok(
      Math.abs(s.players[i].x - x) <= 2,
      `P${i + 1} reaches x=${x}, actual ${s.players[i].x}`,
    );
  };
  const jump = (x) => {
    for (let f = 0; f < 160; f++)
      s.update(1 / 120, [
        { ...idle(), jump: f === 0, move: Math.abs(a.x - x) > 2 ? Math.sign(x - a.x) : 0 },
        idle(),
      ]);
  };
  const useTech = (hold = false) =>
    s.update(1 / 120, [
      { ...idle(), interactHeld: hold },
      { ...idle(), interact: true },
    ]);
  step(s);
  walk(0, 70);
  jump(340);
  s.interact(a);
  for (let f = 0; f < 100; f++)
    s.update(1 / 120, [idle(), { ...idle(), jump: f === 0, move: s.players[1].x < 235 ? 1 : 0 }]);
  for (const symbol of s.symbolPuzzle.code) {
    walk(1, s.symbolPuzzle.symbolBlocks.find((o) => o.symbol === symbol).x + 8);
    useTech();
  }
  assert.equal(s.cell.state, 'LOOSE');
  walk(0, 300);
  walk(1, 185);
  useTech();
  assert.equal(s.cell.state, 'CARRIED');
  assert.ok(s.plate.active);
  walk(1, 560);
  useTech();
  assert.ok(s.bridge.active);
  walk(0, 350);
  jump(520);
  assert.equal(a.y, 312);
  jump(720);
  assert.equal(a.y, 247);
  walk(0, 740);
  useTech(true);
  assert.equal(s.cell.state, 'CARRIED');
  assert.equal(s.bridge.active, false);
  walk(1, 625, { hold: true });
  walk(1, 800, { crouch: true, hold: true });
  walk(1, 980, { hold: true });
  useTech(true);
  assert.equal(s.phase, 'CHARGE');
  walk(0, 1035);
  step(s, [idle(), idle()], 1);
  walk(1, 1100);
  step(
    s,
    [
      { ...idle(), interactHeld: true },
      { ...idle(), interactHeld: true },
    ],
    2.6,
  );
  assert.equal(s.phase, 'KEY');
  assert.equal(s.key.state, 'VISIBLE');
  assert.equal(s.door.state, 'LOCKED');
  walk(0, 1000);
  jump(945);
  assert.equal(a.y, 447);
  jump(860);
  assert.equal(a.y, 352);
  jump(750);
  assert.equal(a.y, 247);
  walk(0, 660);
  jump(520);
  jump(340);
  assert.equal(a.y, 392);
  jump(110);
  assert.equal(a.y, 262);
  walk(1, 790);
  walk(1, 620, { crouch: true });
  walk(1, 105);
  assert.equal(s.phase, 'KEY');
  walk(0, 202);
  s.interact(a);
  assert.equal(s.key.state, 'COLLECTED');
  walk(0, 620);
  walk(0, 800, { crouch: true });
  walk(0, 1120);
  step(s, [idle(), idle()], 1);
  s.interact(a);
  assert.equal(s.door.state, 'UNLOCKED');
  walk(1, 620);
  walk(1, 800, { crouch: true });
  walk(1, 1150);
  step(s, [
    { ...idle(), interactHeld: true },
    { ...idle(), interactHeld: true },
  ]);
  assert.ok(s.complete);
});

test('symbol cage requires both roles, a present reader and the correct sequence', () => {
  const s = make(),
    [a, b] = s.players;
  place(b, 185);
  s.interact(b);
  assert.equal(s.cell.state, 'CAGED');
  const choose = (symbol) => {
    place(b, s.symbolPuzzle.symbolBlocks.find((o) => o.symbol === symbol).x + 8);
    s.interact(b);
  };
  choose(s.symbolPuzzle.code[0]);
  assert.equal(s.symbolPuzzle.matchIndex, 0);
  place(b, 340, 392);
  s.interact(b);
  assert.equal(s.symbolPuzzle.clue.state, 'UNREAD');
  place(a, 340, 392);
  s.interact(a);
  place(a, 70);
  choose(s.symbolPuzzle.code[0]);
  assert.equal(s.symbolPuzzle.matchIndex, 0);
  place(a, 340, 392);
  choose(s.symbolPuzzle.code[1]);
  assert.equal(s.symbolPuzzle.matchIndex, 0);
  choose(s.symbolPuzzle.code[0]);
  assert.equal(s.symbolPuzzle.matchIndex, 1);
  assert.equal(s.cell.state, 'CAGED');
  choose(s.symbolPuzzle.code[0]);
  assert.equal(s.symbolPuzzle.matchIndex, 0);
  choose(s.symbolPuzzle.code[0]);
  choose(s.symbolPuzzle.code[1]);
  assert.equal(s.phase, 'ENTRY');
  assert.equal(s.cell.state, 'LOOSE');
});
