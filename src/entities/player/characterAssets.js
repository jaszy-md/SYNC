const images = new Map();

export function getCharacterImage(path, onLoad) {
  if (!path || typeof Image === 'undefined') return null;
  let entry = images.get(path);
  if (!entry) {
    const image = new Image();
    entry = { image, status: 'loading', listeners: new Set() };
    images.set(path, entry);
    image.onload = () => {
      entry.status = image.naturalWidth > 0 ? 'loaded' : 'error';
      if (entry.status === 'loaded') entry.listeners.forEach((listener) => listener());
      entry.listeners.clear();
    };
    image.onerror = () => {
      entry.status = 'error';
      entry.listeners.clear();
    };
    image.src = path;
  }
  if (entry.status === 'loading' && onLoad) entry.listeners.add(onLoad);
  return entry.status === 'loaded' ? entry.image : null;
}
