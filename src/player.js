import {moveBody,overlaps} from './collision.js';
export const CHARACTERS = [
  {id:'a',name:'Character A',color:'#61d7ed',shape:'circle'},
  {id:'b',name:'Character B',color:'#ffbb69',shape:'square'},
  {id:'c',name:'Character C',color:'#c39aff',shape:'diamond'},
  {id:'d',name:'Character D',color:'#f18fba',shape:'triangle'},
];
export class Player {
  constructor(id,character,spawn,abilities) {
    Object.assign(this,{id,character,abilities,x:spawn.x,y:spawn.y,w:28,h:46,vx:0,vy:0,grounded:false,crouched:false});
  }
  update(input,dt,solids) {
    const height = input.crouch ? 26 : 46;
    const next = {...this,y:this.y+this.h-height,h:height};
    if (height<this.h || !solids.some(s=>overlaps(next,s))) { this.y=next.y; this.h=height; }
    this.crouched = this.h===26;
    this.vx = input.move*(this.crouched?125:240);
    if (input.jump && this.grounded && !this.crouched) this.vy=-this.abilities.jumpSpeed;
    this.vy = Math.min(1000,this.vy+1600*dt);
    moveBody(this,dt,solids);
    this.x=Math.max(0,Math.min(1200-this.w,this.x));
  }
  draw(ctx) {
    const {x,y,w,h,character:c}=this;
    ctx.fillStyle=c.color;
    ctx.fillRect(x+4,y+14,w-8,h-14);
    ctx.beginPath();
    if(c.shape==='circle') ctx.arc(x+w/2,y+9,10,0,Math.PI*2);
    else if(c.shape==='square') ctx.rect(x+4,y,w-8,18);
    else { ctx.moveTo(x+w/2,y-2);ctx.lineTo(x+w,y+16); if(c.shape==='diamond')ctx.lineTo(x+w/2,y+22);ctx.lineTo(x,y+16);ctx.closePath(); }
    ctx.fill();ctx.fillStyle='#101829';ctx.fillRect(x+9,y+7,3,3);ctx.fillRect(x+17,y+7,3,3);
    ctx.fillStyle='#fff';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText(`P${this.id+1}`,x+w/2,y-12);
    ctx.textAlign='left';
  }
}
