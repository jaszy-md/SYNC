import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/dev-stage.mjs', import.meta.url));
const launch = (...args) =>
  spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 5000 });

test('the project exposes only Stage 1, 2 and 3 launch scripts', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(
    Object.keys(scripts).filter((name) => /^stage\d+$/.test(name)),
    ['stage1', 'stage2', 'stage3'],
  );
});

test('Stage 3 accepts the diamond option and exits before starting Vite', () => {
  for (const args of [['3'], ['3', '--diamond']]) {
    const result = launch(...args);
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), '[SYNC DEV] Stage 3 is not built yet.');
    assert.equal(result.stdout, '');
  }
});

test('invalid arguments produce actionable errors and usage', () => {
  for (const stage of ['0', '2.5', '5']) {
    const result = launch(stage);
    assert.equal(result.status, 2);
    assert.equal(
      result.stderr.trim(),
      '[SYNC DEV] Invalid stage. Available stages: 1, 2, 3 (Stage 3 not built yet).',
    );
  }
  for (const [args, message] of [
    [['2', '--example'], /Unknown option: --example/],
    [['2', '--diamonds=stage2'], /Unknown diamond for Stage 2: stage2/],
    [['2', '--diamond', '--diamonds=stage1'], /Specify at most one diamond option/],
  ]) {
    const result = launch(...args);
    assert.equal(result.status, 2);
    assert.match(result.stderr, message);
    assert.match(result.stderr, /Usage: npm run stage2/);
  }
});
