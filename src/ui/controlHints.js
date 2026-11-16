// Only rendering state lives here; all availability checks use the stage's existing guards.
const animations = new WeakMap();

export function drawControlHints(ctx, stage, hints, topFor = (object) => object.y, offset = 30) {
  let animation = animations.get(stage);
  if (!animation) {
    animation = { time: stage.time, entries: [] };
    animations.set(stage, animation);
  }
  const elapsed = Math.max(0, Math.min(0.05, stage.time - animation.time));
  animation.time = stage.time;
  animation.entries.forEach((entry) => (entry.visible = false));
  for (const hint of hints) {
    let entry = animation.entries.find(
      (item) => item.object === hint.object && item.player === hint.player,
    );
    if (!entry) {
      entry = { ...hint, opacity: 0 };
      animation.entries.push(entry);
    }
    entry.binding = hint.binding;
    entry.visible = true;
  }
  for (const entry of animation.entries) {
    entry.opacity = Math.max(
      0,
      Math.min(1, entry.opacity + elapsed / (entry.visible ? 0.14 : -0.12)),
    );
  }
  animation.entries = animation.entries.filter((entry) => entry.visible || entry.opacity > 0);
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  ctx.save();
  ctx.font = '600 11px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const height = 22;
  const isRound = (entry) => [...entry.binding.label].length === 1;
  const width = (entry) =>
    isRound(entry) ? height : Math.max(height, ctx.measureText(entry.binding.label).width + 14);
  for (const entry of animation.entries) {
    const { object, player, binding, opacity, align } = entry;
    if (!opacity) continue;
    const group = animation.entries
      .filter((item) => item.object === object)
      .sort((a, b) => a.player.id - b.player.id);
    const totalWidth = group.reduce((sum, item) => sum + width(item), 0) + (group.length - 1) * 8;
    const preceding = group
      .slice(0, group.indexOf(entry))
      .reduce((sum, item) => sum + width(item) + 8, 0);
    const w = width(entry);
    const anchor = align === 'left' ? object.x - totalWidth / 2 - 15 : object.x + object.w / 2;
    const center = Math.max(
      totalWidth / 2 + 4,
      Math.min(ctx.canvas.width - totalWidth / 2 - 4, anchor),
    );
    const x = center - totalWidth / 2 + preceding + w / 2;
    const floating = reducedMotion ? 0 : Math.sin(stage.time * 2.4) * 2;
    const y = Math.max(16, topFor(object) - offset + floating);
    const fade = opacity * opacity * (3 - 2 * opacity);
    const pulse = reducedMotion ? 1 : 1 + 0.008 * (1 - Math.cos((stage.time * Math.PI * 2) / 3));
    const scale = (reducedMotion ? 1 : 0.94 + 0.06 * fade) * pulse;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#11172cf5';
    ctx.strokeStyle = player.id === 0 ? '#64e4ffb3' : '#ab8bffb3';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#64e4ff80';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    if (isRound(entry)) ctx.arc(0, 0, height / 2, 0, Math.PI * 2);
    else ctx.roundRect(-w / 2, -height / 2, w, height, height / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.stroke();
    ctx.fillStyle = '#f0f2ff';
    ctx.fillText(binding.label, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
