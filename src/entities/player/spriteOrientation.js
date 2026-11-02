// Walk frames face left; jump frames face right. Idle/back portraits face front.
export function shouldMirrorSprite(pose, facing) {
  if (pose === 'jump') return facing < 0;
  if (pose === 'idle' || pose === 'back') return false;
  return facing > 0;
}
