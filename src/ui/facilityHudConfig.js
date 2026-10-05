import { sharedUiAssets } from './sharedAssets.js';

export const facilityHudConfig = {
  mapIcon: sharedUiAssets.escapeChainMap.icon,
  mapImage: sharedUiAssets.escapeChainMap.image,
  // Maximum map dimensions in pixels; smaller screens scale it down automatically.
  mapSize: { maxWidth: 800, maxHeight: 500 },
  speech: { charactersPerSecond: 38, lingerSeconds: 14, mouthPeriod: 0.14 },
};
