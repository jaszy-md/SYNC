const images = new Map();
export const ASSET_LOAD_TIMEOUT_MS = 10000;

export function getCharacterImage(path, onLoad) {
  if (!path || typeof Image === 'undefined') return null;
  let entry = images.get(path);
  if (!entry) {
    const image = new Image();
    let settle;
    const ready = new Promise((resolve) => {
      settle = resolve;
    });
    entry = { image, status: 'loading', listeners: new Set(), ready };
    images.set(path, entry);
    const finish = (status) => {
      if (entry.status !== 'loading') return;
      clearTimeout(timeout);
      entry.status = status;
      settle(status === 'loaded' ? image : null);
      if (status === 'loaded') entry.listeners.forEach((listener) => listener());
      entry.listeners.clear();
    };
    // Bound network/decode stalls. Late arrivals cannot cause a delayed pop-in.
    const timeout = setTimeout(() => finish('error'), ASSET_LOAD_TIMEOUT_MS);
    timeout.unref?.();
    image.onload = async () => {
      if (entry.status !== 'loading') return;
      try {
        await image.decode?.();
        finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? 'loaded' : 'error');
      } catch {
        finish('error');
      }
    };
    image.onerror = () => finish('error');
    image.src = path;
  }
  if (entry.status === 'loading' && onLoad) entry.listeners.add(onLoad);
  return entry.status === 'loaded' ? entry.image : null;
}

export function preloadCharacterSprites(characters) {
  const paths = new Set(characters.flatMap((character) => Object.values(character.sprites)));
  return Promise.all([...paths].map(preloadImage));
}

export function preloadImage(path) {
  getCharacterImage(path);
  return images.get(path)?.ready ?? Promise.resolve(null);
}
