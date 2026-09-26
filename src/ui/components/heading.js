export const heading = (label, title, description = '') =>
  '<div class="screen-head">' +
  ('<div class="eyebrow">' + label + '</div>') +
  ('<h2>' + title + '</h2>' + (description ? '<p>' + description + '</p>' : '') + '</div>');
