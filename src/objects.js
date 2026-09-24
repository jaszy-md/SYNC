import {near,overlaps} from './collision.js';
export class Platform {
  constructor(x,y,w,h,color='#425570') { Object.assign(this,{x,y,w,h,color,active:true}); }
  draw(ctx) { if(this.active){ctx.fillStyle=this.color;ctx.fillRect(this.x,this.y,this.w,this.h);ctx.fillStyle='#aaa9d6';ctx.fillRect(this.x,this.y,this.w,3);ctx.fillStyle='#080d2444';ctx.fillRect(this.x,this.y+this.h-5,this.w,5);} }
}
export class Hint {
  constructor(x,y,symbol) {Object.assign(this,{x,y,w:40,h:44,symbol,state:'UNREAD'});}
  read(player) {if(player.abilities.readHint&&near(player,this,18)){this.state='READ';return true;}return false;}
  draw(ctx,visible) {ctx.fillStyle=visible?'#64e4ff':'#ab8bff';ctx.fillRect(this.x,this.y,this.w,this.h);ctx.strokeStyle='#ded6ff';ctx.strokeRect(this.x+4,this.y+4,this.w-8,this.h-8);ctx.fillStyle='#152330';ctx.font='bold 25px system-ui';ctx.fillText(visible?this.symbol:'?',this.x+8,this.y+31);}
}
export class Switch {
  constructor(x,y,symbol) {Object.assign(this,{x,y,w:44,h:34,symbol,state:'OFF'});}
  activate(player,enabled) {if(!near(player,this,22)||!player.abilities.operateSwitch)return 'DENIED';this.state=enabled?'ON':'OFF';return enabled?'ON':'WRONG';}
  draw(ctx) {ctx.fillStyle=this.state==='ON'?'#64e4ff':'#ffdc79';ctx.fillRect(this.x,this.y,this.w,this.h);ctx.fillStyle='#152330';ctx.font='bold 24px system-ui';ctx.fillText(this.symbol,this.x+10,this.y+25);ctx.fillStyle=this.state==='ON'?'#fff':'#846650';ctx.fillRect(this.x+4,this.y+this.h-4,this.w-8,3);}
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
  draw(ctx){ctx.fillStyle=this.state==='LOCKED'?'#533251':'#355376';ctx.fillRect(this.x,this.y,this.w,this.h);ctx.strokeStyle=this.state==='LOCKED'?'#f379d0':'#64e4ff';ctx.lineWidth=2;ctx.strokeRect(this.x+8,this.y+8,this.w-16,this.h-8);ctx.fillStyle='#e7ddfc';ctx.font='12px system-ui';ctx.fillText(this.state,this.x-8,this.y-14);}
}
export class Trigger {
  constructor(x,y,w,h){Object.assign(this,{x,y,w,h});}
  contains(player){return overlaps(this,player);}
}
export class PressurePlate extends Trigger {
  constructor(x,y,w=64){super(x,y,w,8);this.active=false;}
  update(players){
    this.active=players.some(p=>p.grounded&&p.x+p.w>this.x&&p.x<this.x+this.w&&Math.abs(p.y+p.h-(this.y+this.h))<4);
    return this.active;
  }
  draw(ctx){ctx.fillStyle=this.active?'#64e4ff':'#ab8bff';ctx.fillRect(this.x,this.y+(this.active?4:0),this.w,this.active?4:8);ctx.strokeStyle='#64e4ff';ctx.strokeRect(this.x,this.y-4,this.w,12);}
}
export class HelpMarker extends Trigger {
  constructor({id,x,y,text}){super(x,y,24,32);Object.assign(this,{id,text,ready:false});}
  draw(ctx,time){
    const lift=Math.sin(time*4)*4;
    ctx.save();ctx.translate(this.x+12,this.y+12+lift);ctx.rotate(Math.PI/4);
    ctx.fillStyle='#ffdc79';ctx.shadowBlur=18;ctx.shadowColor='#ffdc79';ctx.fillRect(-12,-12,24,24);ctx.restore();
    ctx.fillStyle='#17203b';ctx.font='bold 20px system-ui';ctx.fillText('?',this.x+6,this.y+19+lift);
    ctx.fillStyle='#ffdc79';ctx.font='11px system-ui';ctx.fillText('HINT',this.x-2,this.y-12+lift);
  }
}
