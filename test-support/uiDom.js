// Minimal event/visibility adapter for real createUI handlers; no Canvas or layout snapshots.
export function installUiDom(t) {
  const saved = new Map(
    ['document', 'window', 'ResizeObserver', 'matchMedia'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  const nodes = new Map(),
    document = new globalThis.EventTarget();
  document.activeElement = null;
  function node(id) {
    const element = new globalThis.EventTarget();
    Object.assign(element, { id, hidden: false, style: {}, disabled: false });
    element.setAttribute = () => {};
    element.removeAttribute = () => {};
    element.focus = () => {
      document.activeElement = element;
    };
    element.blur = () => {
      if (document.activeElement === element) document.activeElement = null;
    };
    element.click = () => element.dispatchEvent(new globalThis.Event('click'));
    element.getClientRects = () => (element.hidden ? [] : [{}]);
    element.querySelectorAll = () => [];
    nodes.set(id, element);
    return element;
  }
  const screen = node('screen'),
    game = node('game');
  node('pause');
  let html = '',
    current = [];
  Object.defineProperty(screen, 'innerHTML', {
    get: () => html,
    set(value) {
      current.forEach((element) => nodes.delete(element.id));
      current = [];
      html = value;
      for (const match of value.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
        const id = match[2].match(/\bid="([^"]+)"/)?.[1];
        if (!id) continue;
        const element = node(id);
        element.tagName = match[1].toUpperCase();
        element.primary = /class="[^"]*primary/.test(match[2]);
        current.push(element);
      }
    },
  });
  screen.querySelector = (selector) => {
    if (selector.startsWith('#'))
      return (
        selector
          .split(',')
          .map((s) => nodes.get(s.trim().slice(1)))
          .find(Boolean) ?? null
      );
    if (selector.startsWith('button'))
      return (
        current.find(
          (n) => n.tagName === 'BUTTON' && (!selector.includes('primary') || n.primary),
        ) ?? null
      );
    return null;
  };
  screen.querySelectorAll = (selector) =>
    selector.startsWith('button') ? current.filter((n) => n.tagName === 'BUTTON') : [];
  document.getElementById = (id) => nodes.get(id) ?? null;
  document.querySelector = (selector) => nodes.get(selector.slice(1)) ?? null;
  document.querySelectorAll = () => current.filter((n) => n.tagName === 'BUTTON');
  for (const [name, value] of Object.entries({
    document,
    window: new globalThis.EventTarget(),
    matchMedia: () => ({ matches: true }),
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
  }))
    Object.defineProperty(globalThis, name, { configurable: true, value });
  t.after(() => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return {
    screen,
    game,
    document,
    click(id) {
      const element = nodes.get(id);
      if (!element) throw new Error('Unavailable UI action: ' + id);
      element.click();
    },
  };
}
