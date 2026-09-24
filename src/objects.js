import {near,overlaps} from './collision.js';
export class Platform {
  constructor(x,y,w,h,color='#425570') { Object.assign(this,{x,y,w,h,color,active:true}); }
  draw(ctx) { if(this.active){ctx.fillStyle=this.color;ctx.fillRect(this.x,this.y,this.w,this.h);ctx.fillStyle='#9bacc4';ctx.fillRect(this.x,this.y,this.w,3);} }
}
export class Hint {
  constructor(x,y,symbol) {Object.assign(this,{x,y,w:40,h:44,symbol,state:'UNREAD'});}
  read(player) {if(player.abilities.readHint&&near(player,this,18)){this.state='READ';return true;}return false;}
  draw(ctx,visible) {ctx.fillStyle='#b7f76b';ctx.fillRect(this.x,this.y,this.w,this.h);ctx.fillStyle='#152330';ctx.font='bold 25px system-ui';ctx.fillText(visible?this.symbol:'?',this.x+8,this.y+31);}
}
export class Switch {
  constructor(x,y,symbol) {Object.assign(this,{x,y,w:44,h:34,symbol,state:'OFF'});}
  activate(player,enabled) {if(!near(player,this,22)||!player.abilities.operateSwitch)return 'DENIED';this.state=enabled?'ON':'OFF';return enabled?'ON':'WRONG';}
  draw(ctx) {ctx.fillStyle=this.state==='ON'?'#b7f76b':'#e4ac67';ctx.fillRect(this.x,this.y,this.w,this.h);ctx.fillStyle='#152330';ctx.font='bold 24px system-ui';ctx.fillText(this.symbol,this.x+10,this.y+25);}
}
export class Key {
  constructor(x,y) {Object.assign(this,{x,y,w:28,h:28,state:'HIDDEN'});}
  reveal(){this.state='VISIBLE';}
  collect(player){if(this.state==='VISIBLE'&&player.abilities.collectKey&&near(player,this,20)){this.state='COLLECTED';return true;}return false;}
  draw(ctx){if(this.state!=='VISIBLE')return;ctx.strokeStyle='#ffe58b';ctx.lineWidth=5;ctx.beginPath();ctx.arc(this.x+9,this.y+10,7,0,Math.PI*2);ctx.moveTo(this.x+16,this.y+10);ctx.lineTo(this.x+30,this.y+10);ctx.lineTo(this.x+30,this.y+19);ctx.stroke();}
}
export class Door {
  constructor(x,y,w,h){Object.assign(this,{x,y,w,h,state:'LOCKED'});}
  unlock(){if(this.state==='LOCKED')this.state='UNLOCKED';}
  open(players,inputs){if(this.state!=='LOCKED'&&players.every((p,i)=>near(p,this,40)&&inputs[i].interactHeld)){this.state='OPEN';return true;}return false;}
  draw(ctx){ctx.fillStyle=this.state==='LOCKED'?'#654451':'#528557';ctx.fillRect(this.x,this.y,this.w,this.h);ctx.strokeStyle='#b7f76b';ctx.strokeRect(this.x+8,this.y+8,this.w-16,this.h-8);ctx.fillStyle='#fff';ctx.font='14px system-ui';ctx.fillText(this.state,this.x-8,this.y-14);}
}
export class Trigger {
  constructor(x,y,w,h){Object.assign(this,{x,y,w,h});}
  contains(player){return overlaps(this,player);}
}
