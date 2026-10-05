import test from 'node:test';
import assert from 'node:assert/strict';
import { HelperSpeech } from '../src/ui/helperSpeech.js';

test('helper types progressively and animates its mouth only while speaking', () => {
  const speech = new HelperSpeech({ charactersPerSecond: 10, mouthPeriod: 0.1, lingerSeconds: 2 });
  speech.speak('Hello team');
  assert.equal(speech.visibleText, '');
  assert.equal(speech.speaking, true);
  speech.update(0.15);
  assert.equal(speech.visibleText, 'H');
  assert.equal(speech.mouthOpen, true);
  speech.update(0.1);
  assert.equal(speech.visibleText, 'He');
  assert.equal(speech.mouthOpen, false);
  speech.update(0.75);
  assert.equal(speech.visibleText, 'Hello team');
  assert.equal(speech.speaking, false);
  assert.equal(speech.mouthOpen, false);
  assert.equal(speech.visible, true);
  speech.update(2);
  assert.equal(speech.visible, false);
});

test('reduced motion reveals the full hint and restarting/dismissing never leaves a talking mouth', () => {
  const speech = new HelperSpeech();
  speech.speak('A long message');
  speech.update(0.3);
  speech.speak('Nieuwe hint', true);
  assert.equal(speech.visibleText, 'Nieuwe hint');
  assert.equal(speech.speaking, false);
  assert.equal(speech.mouthOpen, false);
  speech.dismiss();
  assert.equal(speech.visible, false);
  assert.equal(speech.visibleText, '');
});
