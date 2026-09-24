export const KEYBOARD = [
  {left:'KeyA',right:'KeyD',jump:'KeyW',crouch:'KeyS',interact:'KeyE'},
  {left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',crouch:'ArrowDown',interact:'Enter'},
];
export class InputManager {
  constructor(target=window) {
    this.keys = new Set(); this.pressed = new Set(); this.previousPads = new Map(); this.assignments = [null,null];
    const codes = new Set([...KEYBOARD.flatMap(m=>Object.values(m)),'Escape']);
    target.addEventListener('keydown',e=>{
      if (!codes.has(e.code) || (e.code!=='Escape' && /SELECT|INPUT|BUTTON/.test(e.target?.tagName))) return;
      e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    target.addEventListener('keyup',e=>this.keys.delete(e.code));
    target.addEventListener('blur',()=>this.clear());
  }
  pads() { return Array.from(navigator.getGamepads?.() ?? []).filter(Boolean); }
  sample() {
    const pads = this.pads();
    return KEYBOARD.map((mapping,index)=>{
      const pad = pads.find(p=>p.index===this.assignments[index]);
      const held = action=>this.keys.has(mapping[action]);
      const pressed = action=>this.pressed.has(mapping[action]);
      const buttons = pad?.buttons.map(b=>b.pressed) ?? [];
      const previous = this.previousPads.get(index) ?? [];
      this.previousPads.set(index,buttons);
      const axis = pad?.axes[0] ?? 0;
      const padMove = Math.abs(axis)>0.22 ? axis : (buttons[15]?1:0)-(buttons[14]?1:0);
      return {move:Math.max(-1,Math.min(1,Number(held('right'))-Number(held('left'))+padMove)),
        jump:pressed('jump') || !!(buttons[0]&&!previous[0]), crouch:held('crouch') || !!buttons[13],
        interact:pressed('interact') || !!(buttons[2]&&!previous[2]), interactHeld:held('interact') || !!buttons[2]};
    });
  }
  endFrame() { this.pressed.clear(); }
  clear() { this.keys.clear(); this.pressed.clear(); this.previousPads.clear(); }
}
