import { button } from '../components/button.js';
import { Player } from '../../entities/player/createPlayer.js';
import { WALK_FRAME_INTERVAL_MS } from '../../entities/player/playerRenderer.js';
import { drawJungle, getJungleBackdrop } from '../../stages/stage02/jungleView.js';

export function completeView() {
  return (
    '<div class="sheet jungle-intro">' +
    '<canvas id="jungle-intro-scene" width="1200" height="660" aria-hidden="true"></canvas>' +
    '<div class="jungle-intro-copy"><h2>STAGE 1 COMPLETED!</h2>' +
    '<p><strong>Jullie hebben Stage 1 gehaald!</strong></p>' +
    '<p>De volgende uitdaging wacht op jullie, diep verborgen in de jungle.</p>' +
    '<p><strong>Zijn jullie klaar voor Stage 2?</strong></p>' +
    button('start-stage-2', 'START STAGE 2', 'primary') +
    '<div class="jungle-intro-links">' +
    button('replay', 'Nog een ronde ↗', 'ghost') +
    button('main-menu', 'Hoofdmenu', 'ghost') +
    '</div></div></div>'
  );
}

export function animateJungleIntro(canvas, character, app) {
  const ctx = canvas?.getContext?.('2d');
  if (!ctx) return;
  if (!app.style.getPropertyValue('--jungle-backdrop')) {
    app.style.setProperty('--jungle-backdrop', `url("${getJungleBackdrop().toDataURL()}")`);
  }
  const traveler = new Player(0, character, { x: 680, y: 0 }, {});
  traveler.grounded = true;
  traveler.y = 600 - traveler.h;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame;
  let started;
  function draw(now) {
    started ??= now;
    const time = (now - started) / 1000;
    const distance = Math.min(1, time / 1.85);
    traveler.x = 680 + 340 * (motion.matches ? 1 : distance);
    traveler.vx = !motion.matches && distance < 1 ? 240 : 0;
    traveler.walkElapsedMs = (time * 1000) % (2 * WALK_FRAME_INTERVAL_MS);
    ctx.imageSmoothingEnabled = false;
    drawJungle(ctx, canvas.width, canvas.height, motion.matches ? 0 : time);
    ctx.save();
    ctx.translate(traveler.x + traveler.w / 2, 600);
    ctx.scale(1.65, 1.65);
    ctx.translate(-traveler.x - traveler.w / 2, -600);
    traveler.draw(ctx);
    ctx.restore();
    if (!motion.matches) frame = requestAnimationFrame(draw);
  }
  const restart = () => {
    cancelAnimationFrame(frame);
    draw(performance.now());
  };
  motion.addEventListener('change', restart);
  restart();
  return () => {
    cancelAnimationFrame(frame);
    motion.removeEventListener('change', restart);
  };
}
