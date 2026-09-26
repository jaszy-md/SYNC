import { overlaps } from './collision.js';

export function moveBody(body, dt, solids) {
  body.x += body.vx * dt;
  for (const solid of solids)
    if (overlaps(body, solid)) {
      if (body.vx > 0) body.x = solid.x - body.w;
      else if (body.vx < 0) body.x = solid.x + solid.w;
    }
  body.y += body.vy * dt;
  body.grounded = false;
  for (const solid of solids)
    if (overlaps(body, solid)) {
      if (body.vy > 0) {
        body.y = solid.y - body.h;
        body.grounded = true;
      } else if (body.vy < 0) body.y = solid.y + solid.h;
      body.vy = 0;
    }
}
