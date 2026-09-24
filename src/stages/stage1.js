import {Player} from '../player.js';
import {Platform,Hint,Switch,Key,Door,Trigger} from '../objects.js';
import {near} from '../collision.js';
export class Stage1 {
  constructor(characters,random=Math.random) {
    this.players=characters.map((c,i)=>new Player(i,c,{x:70+i*65,y:554},i===0?
      {jumpSpeed:760,readHint:true,collectKey:true,role:'Verkenner'}:
      {jumpSpeed:500,operateSwitch:true,role:'Bediener'}));
    this.platforms=[new Platform(0,600,1200,60),new Platform(210,450,210,20),new Platform(605,290,150,20),new Platform(805,535,120,30)];
    this.bridge=new Platform(445,365,115,18,'#628c49');this.bridge.active=false;
    this.platforms.push(this.bridge);
    this.hint=new Hint(280,406,['○','△','□'][Math.floor(random()*3)]);
    this.switches=['○','△','□'].map((symbol,i)=>new Switch(310+i*95,566,symbol));
    this.key=new Key(680,254);this.door=new Door(1080,510,60,90);this.exit=new Trigger(1000,490,195,110);
    this.message='P1: spring naar het vraagteken en druk E. P2: onderzoek de schakelaars met Enter.';
    this.complete=false;
  }
  get solids(){return this.platforms.filter(p=>p.active);}
  update(dt,inputs) {
    this.players.forEach((p,i)=>p.update(inputs[i],dt,this.solids));
    this.players.forEach((player,i)=>{if(inputs[i].interact)this.interact(player);});
    const atExit=this.players.filter(p=>this.exit.contains(p)).length;
    if(atExit && this.key.state==='COLLECTED') {
      this.message=atExit===1?'Eén speler bij de uitgang. Haal je partner erbij!':'Samen bij de deur: houd E én Enter vast om te openen.';
      if(atExit===this.players.length&&this.door.open(this.players,inputs))this.complete=true;
    }
  }
  interact(player) {
    if(near(player,this.hint,18)) {
      if(this.hint.read(player))this.message=`P1 leest ${this.hint.symbol}. Blijf bij de hint terwijl P2 de juiste schakelaar bedient.`;
      else this.message='Alleen de verkenner kan deze hint lezen.';
      return;
    }
    const target=this.switches.find(s=>near(player,s,22));
    if(target) {
      if(!player.abilities.operateSwitch){this.message='Deze schakelaars hebben de bediener (P2) nodig.';return;}
      if(this.bridge.active){this.message='De verbinding staat al aan. P1 kan de sleutel ophalen.';return;}
      const reader=this.players.find(p=>p.abilities.readHint);
      if(this.hint.state!=='READ'||!near(reader,this.hint,25)){this.message='Geen signaal: P1 moet eerst de hint lezen en daarbij blijven staan.';return;}
      if(target.activate(player,target.symbol===this.hint.symbol)==='ON') {
        this.bridge.active=true;this.key.reveal();this.message='Verbinding gemaakt! Het groene platform en de sleutel zijn verschenen. P1: spring verder en druk E bij de sleutel.';
      } else this.message='Dat symbool klopt niet. Vraag je partner wat er op de hint staat.';
      return;
    }
    if(this.key.collect(player)){this.door.unlock();this.message='Sleutel gevonden! Ga samen naar de uitgang rechts. Buk met S / ↓ onder de lage balk.';return;}
    if(near(player,this.door,40)){this.message=this.door.state==='LOCKED'?'De deur is op slot. Zoek samen de verborgen sleutel.':'Wacht op je partner en houd samen de interactieknoppen vast.';return;}
    this.message='Niets binnen bereik. Ga dichter bij een vraagteken, schakelaar, sleutel of deur staan.';
  }
  draw(ctx,debug=false) {
    ctx.clearRect(0,0,1200,660);ctx.fillStyle='#111a2c';ctx.fillRect(0,0,1200,660);
    ctx.strokeStyle='#1e2b40';ctx.lineWidth=1;
    for(let x=0;x<1200;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke();}
    ctx.fillStyle='#8e9fb7';ctx.font='14px system-ui';ctx.fillText('BEDIENER / P2 · SCHAKELAARS',290,640);
    this.platforms.forEach(p=>p.draw(ctx));
    const reader=this.players.find(p=>p.abilities.readHint);
    this.hint.draw(ctx,this.hint.state==='READ'&&near(reader,this.hint,25));this.switches.forEach(s=>s.draw(ctx));this.key.draw(ctx);this.door.draw(ctx);this.players.forEach(p=>p.draw(ctx));
    if(debug){ctx.strokeStyle='#ff7493';[...this.solids,...this.players,this.hint,this.key,this.exit,...this.switches].forEach(r=>ctx.strokeRect(r.x,r.y,r.w,r.h));}
  }
}
