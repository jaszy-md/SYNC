const paths = {
  jump: '<path d="M4 27h10v-4H4zm15-8h9v-4h-9M13 20V5m-5 5 5-5 5 5"/><path d="m19 27 4-4 4 4"/>',
  'low-jump':
    '<path d="M4 27h10v-4H4zm15-8h9v-4h-9M11 20V12m-4 4 4-4 4 4"/><circle cx="24.5" cy="5" r="4.5"/><path d="M22 5h5"/>',
  shoot:
    '<circle cx="16" cy="16" r="9"/><path d="M16 2v9m0 10v9M2 16h9m10 0h9"/><path d="M14 14h4v4h-4z"/>',
  battery: '<path d="M5 8h16v16H5zM21 13h3v6h-3M9 13v6m4-6v6"/><path d="m24 22 6 9H18zm0 4v2"/>',
  link: '<path d="M13 10H8a6 6 0 0 0 0 12h5m6-12h5a6 6 0 0 1 0 12h-5M10 16h12"/>',
  warning: '<path d="m16 3 14 25H2zm0 8v9m0 3v2"/>',
};

export function skillIcon(kind) {
  return (
    '<svg class="skill-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter">' +
    (paths[kind] ?? paths.warning) +
    '</svg>'
  );
}
