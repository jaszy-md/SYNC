import { CHARACTERS } from '../../entities/player/characters.js';
import { getCharacterImage } from '../../entities/player/characterAssets.js';

export const avatar = (character) =>
  '<span class="avatar ' +
  character.fallback.shape +
  '" style="--character:' +
  character.fallback.color +
  '" aria-hidden="true" data-character="' +
  character.id +
  '">' +
  '<i></i>' +
  '</span>';

export function updateCharacterAvatars(root, onLoad) {
  root.querySelectorAll('.avatar[data-character]:not(.sprite)').forEach((element) => {
    const character = CHARACTERS.find((c) => c.id === element.dataset.character);
    const image = getCharacterImage(character?.sprites.select, onLoad);
    if (!image) return;
    const displayedImage = image.cloneNode();
    displayedImage.alt = '';
    displayedImage.draggable = false;
    element.replaceChildren(displayedImage);
    element.classList.add('sprite');
  });
}
