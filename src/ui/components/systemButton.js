// Shared with the gameplay HUD: one source for the physical system icon.
export function systemButton({
  id = 'pause',
  label = 'Open systeem en instellingen',
  hidden = false,
} = {}) {
  return (
    '<button id="' +
    id +
    '" class="hud-object system-object system-menu-button" aria-label="' +
    label +
    '" title="Systeem en instellingen"' +
    (hidden ? ' hidden' : '') +
    '>' +
    '<svg viewBox="0 0 56 56" aria-hidden="true" shape-rendering="crispEdges"><path fill="#677676" d="M23 6h10v6h9v9h7v14h-7v9h-9v6H23v-6h-9v-9H7V21h7v-9h9z"/><path fill="#17272d" d="M17 17h22v22H17z"/><path stroke="#b4c5b9" stroke-width="2" fill="none" d="M28 18v13m-7-9a11 11 0 1 0 14 0"/></svg></button>'
  );
}
