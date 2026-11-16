import { AVAILABLE_STAGES } from '../src/core/stageManager.js';

const projectStages = [1, 2, 3];
// Stage 2's future collectible uses the existing green slot for test runs.
const diamondByStage = new Map([
  [1, 'blue'],
  [2, 'green'],
]);
const [number, ...options] = process.argv.slice(2);
const stageId = Number(number);
const usage = `Usage: npm run stage${stageId} -- [--diamond | --diamonds=stage1]`;
const info = (message) => console.log(`[SYNC DEV] ${message}`);

function fail(message, detail, code = 2) {
  console.error(`[SYNC DEV] ${message}`);
  if (detail) console.error(`[SYNC DEV] ${detail}`);
  process.exitCode = code;
}

async function launch() {
  if (String(stageId) !== number || !projectStages.includes(stageId)) {
    const missing = projectStages.filter((id) => !AVAILABLE_STAGES.includes(id));
    const note = missing.map((id) => `Stage ${id} not built yet`).join(', ');
    return fail(
      `Invalid stage. Available stages: ${projectStages.join(', ')}${note ? ` (${note})` : ''}.`,
    );
  }
  const [option] = options;
  const unknown = options.find((arg) => arg !== '--diamond' && !arg.startsWith('--diamonds='));
  if (unknown !== undefined) return fail(`Unknown option: ${unknown}`, usage);
  if (options.length > 1) return fail('Specify at most one diamond option.', usage);
  if (!AVAILABLE_STAGES.includes(stageId)) {
    return fail(`Stage ${stageId} is not built yet.`, undefined, 1);
  }

  const earlierDiamonds = [...diamondByStage.keys()].filter((source) => source < stageId);
  let sources = [];
  if (option === '--diamond') sources = earlierDiamonds;
  else if (option) {
    const ids = option.slice('--diamonds='.length).split(',');
    const invalid = ids.find((id) => !earlierDiamonds.some((source) => id === `stage${source}`));
    if (invalid !== undefined) {
      return fail(`Unknown diamond for Stage ${stageId}: ${invalid || '(empty)'}`, usage);
    }
    const requestedIds = new Set(ids);
    sources = earlierDiamonds.filter((source) => requestedIds.has(`stage${source}`));
  }

  process.env.NODE_ENV = 'development';
  const { createServer } = await import('vite');
  const server = await createServer({
    server: { host: '127.0.0.1', open: true },
    define: {
      'import.meta.env.SYNC_DEV_LAUNCH': JSON.stringify({
        stageId,
        gems: sources.map((source) => diamondByStage.get(source)),
      }),
    },
  });
  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }
  info(`Starting Stage ${stageId} ${stageId === 1 ? 'introduction' : 'transition'}...`);
  if (stageId !== 1)
    info(
      sources.length
        ? `Test diamonds: ${sources.map((source) => `Stage ${source}`).join(', ')}`
        : 'Diamonds: none',
    );
  server.printUrls();
}

await launch().catch((error) => fail(`Development server failed: ${error.message}`, undefined, 1));
