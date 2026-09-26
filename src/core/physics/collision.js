export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function near(a, b, range = 35) {
  return overlaps({ x: a.x - range, y: a.y - range, w: a.w + range * 2, h: a.h + range * 2 }, b);
}
