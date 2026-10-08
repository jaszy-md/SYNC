const images = new Map();

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
    image.onload = async () => {
      try {
        await image.decode?.();
        entry.status = image.naturalWidth > 0 && image.naturalHeight > 0 ? 'loaded' : 'error';
      } catch {
        entry.status = 'error';
      }
      settle(entry.status === 'loaded' ? image : null);
      if (entry.status === 'loaded') entry.listeners.forEach((listener) => listener());
      entry.listeners.clear();
    };
    image.onerror = () => {
      entry.status = 'error';
      settle(null);
      entry.listeners.clear();
    };
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
