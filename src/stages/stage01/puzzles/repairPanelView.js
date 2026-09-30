import { machine } from '../facilityView.js';
import { near } from '../../../core/physics/collision.js';

export function drawRepairStations(ctx, repair, players, enabled, time) {
  machine(
    ctx,
    repair.terminal,
    repair.title + ' / P2',
    repair.complete ? 'ONLINE' : enabled ? 'PARTIAL' : 'OFF',
  );
  machine(ctx, repair.monitor, 'DIAGNOSE / P1', repair.linked ? 'ONLINE' : 'PARTIAL');
  const reader = players.find((p) => p.abilities.readHint);
  const visible = enabled && reader && near(reader, repair.monitor, 18);
  ctx.fillStyle = '#a8fff51c';
  ctx.fillRect(
    repair.terminal.x + 7,
    repair.terminal.y + 9 + ((time * 12) % 25),
    repair.terminal.w - 14,
    2,
  );
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#d1fff2';
  ctx.fillText(
    repair.complete ? 'ONLINE' : visible ? repair.labels[repair.code[repair.index]] : '···',
    repair.monitor.x + 9,
    repair.monitor.y + 27,
  );
  ctx.fillStyle = repair.complete ? '#8df7bd' : '#ffcb70';
  ctx.fillText(
    repair.complete ? 'OK' : enabled ? '! REPAIR' : 'LOCKED',
    repair.terminal.x + 8,
    repair.terminal.y + 28,
  );
  if (visible && !repair.complete) {
    // Side readout remains legible when the Explorer stands in front of the CRT.
    ctx.fillStyle = '#091d28';
    ctx.fillRect(repair.monitor.x - 88, repair.monitor.y + 5, 82, 28);
    ctx.strokeStyle = '#93e8cc';
    ctx.strokeRect(repair.monitor.x - 88, repair.monitor.y + 5, 82, 28);
    ctx.fillStyle = '#e6fff0';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(
      repair.labels[repair.code[repair.index]],
      repair.monitor.x - 82,
      repair.monitor.y + 24,
    );
    ctx.fillStyle = '#e1fff2';
    ctx.font = '12px monospace';
    ctx.fillText('P1: lees voor + houd interactie', repair.monitor.x - 25, repair.monitor.y - 25);
  }
  if (enabled && !repair.complete && Math.sin(time * 13) > 0.93) {
    ctx.strokeStyle = '#fff0a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(repair.terminal.x - 5, repair.terminal.y + 12);
    ctx.lineTo(repair.terminal.x - 14, repair.terminal.y + 2);
    ctx.lineTo(repair.terminal.x - 8, repair.terminal.y - 7);
    ctx.stroke();
  }
}

export function drawRepairPanel(ctx, repair, bindings) {
  if (repair.owner === null) return;
  const x = 600,
    y = 48,
    w = 580,
    h = 162;
  ctx.save();
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#101e2bf5';
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#7ce4dc';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#e6fff4';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('P2 / ' + repair.title + '   ' + repair.index + '/3', x + 16, y + 26);
  ctx.font = '12px monospace';
  ctx.fillStyle = repair.linked ? '#93f6b8' : '#ffd185';
  ctx.fillText(
    repair.linked
      ? 'DIAGNOSE VERBONDEN • reset het genoemde systeem'
      : 'P1: zoek de diagnosemonitor en houd interactie',
    x + 16,
    y + 47,
  );
  repair.labels.forEach((label, index) => {
    const bx = x + 16 + index * 140;
    ctx.fillStyle = index === repair.selection ? '#316b72' : '#223744';
    ctx.fillRect(bx, y + 60, 130, 39);
    ctx.strokeStyle = index === repair.selection ? '#c0fff0' : '#5d7982';
    ctx.strokeRect(bx, y + 60, 130, 39);
    ctx.fillStyle = '#effff9';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(label, bx + 12, y + 85);
  });
  ctx.fillStyle = repair.flash > 0 ? '#ffdc91' : '#bbd1d4';
  ctx.font = '11px monospace';
  ctx.fillText(repair.feedback, x + 16, y + 119);
  ctx.fillText(
    'Links/rechts: kies   ' +
      (bindings[repair.owner]?.label || 'Interactie') +
      ': reset   Bukken: sluiten',
    x + 16,
    y + 145,
  );
  ctx.restore();
}
