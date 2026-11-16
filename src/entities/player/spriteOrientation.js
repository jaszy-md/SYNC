// Walk frames face left; jump and crouch frames face right. Idle/back face front.
export function shouldMirrorSprite(pose, facing) {
  if (pose === 'jump' || pose === 'crouch') return facing < 0;
  if (pose === 'idle' || pose === 'back') return false;
  return facing > 0;
}
