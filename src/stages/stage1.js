import {Player} from '../player.js';
import {Platform,Door,Trigger,HelpMarker,PressurePlate,Hint,Switch,Key} from '../objects.js';
import {near,overlaps} from '../collision.js';

// Energy relay: the same physical cell must be moved between two sockets.
// Opening a passage requires a partner to remain at a remote control.
export class Stage1 {
  constructor(characters,random=Math.random) {
    this.players=characters.map((c,i)=>new Player(i,c,{x:70+i*65,y:554},i===0?
      {jumpSpeed:760,operateWinch:true,readHint:true,collectKey:true,role:'Explorer'}:
      {jumpSpeed:500,carryCell:true,operateSwitch:true,role:'Tech'}));
    this.platforms=[new Platform(0,600,1200,60,'#2a304c'),new Platform(210,450,200,20),new Platform(645,305,175,20),new Platform(660,535,105,30)];
    this.bridge=new Platform(465,370,140,18,'#52548b');this.bridge.active=false;
    this.gateA=new Platform(440,450,22,150,'#673554');
    this.gateB=new Platform(870,350,22,250,'#673554');
    this.platforms.push(this.bridge,this.gateA,this.gateB);
    this.plate=new PressurePlate(280,442);
    this.winch={x:740,y:263,w:40,h:42,active:false};
    this.socketA={x:550,y:561,w:44,h:39};
    this.socketB={x:970,y:561,w:44,h:39};
    this.cell={x:185,y:572,w:24,h:26,state:'CAGED'};
    const symbols=['○','△','□'],first=Math.floor(random()*3);
    this.code=[symbols[first],symbols[(first+1+Math.floor(random()*2))%3]];
    this.symbolHint=new Hint(335,398,this.code.join(' '));this.symbolHint.w=78;
    this.symbolSwitches=symbols.map((symbol,i)=>new Switch(245+i*65,566,symbol));
    this.matchIndex=0;
    this.key=new Key(1000,414);this.keyCarrier=null;
    this.keyPlatform=new Platform(965,450,135,18,'#52548b');this.keyPlatform.active=false;
    this.platforms.push(this.keyPlatform);
    this.chargePads=[new PressurePlate(1025,592,45),new PressurePlate(1090,592,45)];
    this.door=new Door(1140,510,52,90);this.exit=new Trigger(1100,490,100,110);
    this.phase='SYMBOLS';this.charge=0;this.time=0;this.complete=false;this.helpMarker=null;this.message='';this.ping=null;
  }
  get solids(){return this.platforms.filter(p=>p.active);}
  update(dt,inputs) {
    this.time+=dt;
    this.players.forEach((p,i)=>p.update(inputs[i],dt,this.solids));
    this.players.forEach((p,i)=>{if(inputs[i].interact)this.interact(p);});
    const explorer=this.players.find(p=>p.abilities.operateWinch);
    this.plate.update([explorer]);
    const transferred=['TRANSFER','CHARGE','KEY','EXIT'].includes(this.phase);
    const delivered=['CHARGE','KEY','EXIT'].includes(this.phase);
    this.winch.active=transferred&&near(explorer,this.winch,12)&&inputs[explorer.id].interactHeld;
    this.setGate(this.gateA,transferred||this.plate.active);
    this.setGate(this.gateB,delivered||this.winch.active);
    this.bridge.active=this.cell.state==='SOCKET_A';
    if(this.cell.state==='CARRIED'){
      const carrier=this.players.find(p=>p.abilities.carryCell);
      this.cell.x=carrier.x+carrier.w-3;this.cell.y=carrier.y+8;
    }
    this.chargePads.forEach((pad,i)=>pad.update([this.players[i]]));
    if(this.phase==='CHARGE'){
      const together=this.chargePads.every(p=>p.active)&&inputs.every(i=>i.interactHeld);
      this.charge=together?Math.min(2.5,this.charge+dt):0;
      if(this.charge>=2.5){this.phase='KEY';this.key.reveal();this.keyPlatform.active=true;}
    }
    if(this.phase==='EXIT'&&this.players.every(p=>this.exit.contains(p))&&this.door.open(this.players,inputs))this.complete=true;
    if(this.helpMarker){
      const point=this.hintPoint();
      if(point.id!==this.helpMarker.id)this.helpMarker=new HelpMarker(point);
      const reached=this.players.some(p=>this.helpMarker.contains(p));
      if(!reached)this.helpMarker.ready=true;
      else if(this.helpMarker.ready){this.message=this.helpMarker.text;this.helpMarker=null;}
    }
  }
  setGate(gate,open){
    // Never close a sluice through a player. Leaving it closes it safely.
    gate.active=!open&&!this.players.some(p=>overlaps(p,gate));
  }
  interact(player){
    if(this.phase==='SYMBOLS'){
      if(near(player,this.symbolHint,18)){this.symbolHint.read(player);return;}
      const target=this.symbolSwitches.find(s=>near(player,s,14));
      if(target){
        const reader=this.players.find(p=>p.abilities.readHint);
        if(!player.abilities.operateSwitch||this.symbolHint.state!=='READ'||!near(reader,this.symbolHint,25))return;
        if(target.activate(player,target.symbol===this.code[this.matchIndex])==='ON'){
          if(++this.matchIndex===this.code.length){this.cell.state='LOOSE';this.phase='ENTRY';}
        }else{
          this.matchIndex=0;this.symbolSwitches.forEach(s=>s.state='OFF');
          this.ping={x:target.x+12,y:target.y-15,until:this.time+.7};
        }
        return;
      }
    }
    if(this.phase==='KEY'&&this.key.collect(player)){this.keyCarrier=player.id;this.phase='EXIT';return;}
    if(this.phase==='EXIT'&&player.id===this.keyCarrier&&near(player,this.door,40)){this.door.unlock();return;}
    if(!player.abilities.carryCell){
      if(near(player,this.cell,20)||near(player,this.socketA,18)||near(player,this.socketB,18))this.ping={x:player.x+14,y:player.y-25,until:this.time+0.7};
      return;
    }
    if(this.cell.state==='LOOSE'&&near(player,this.cell,20)){this.cell.state='CARRIED';return;}
    if(near(player,this.socketA,18)){
      if(this.cell.state==='CARRIED'&&['ENTRY','TRANSFER'].includes(this.phase)){
        this.cell.state='SOCKET_A';this.phase='TRANSFER';
      }else if(this.cell.state==='SOCKET_A')this.cell.state='CARRIED';
      return;
    }
    if(near(player,this.socketB,18)&&this.cell.state==='CARRIED'&&this.phase==='TRANSFER'){
      this.cell.state='SOCKET_B';this.phase='CHARGE';
    }
  }
  hintPoint(){
    if(this.phase==='SYMBOLS')return {id:'symbols',x:215,y:562,text:'Explorer: spring naar de hoge terminal en lees de twee symbolen met interactie. Blijf erbij. Tech: match beneden beide symbolen in volgorde om de batterij-kooi te openen.'};
    if(this.phase==='ENTRY')return {id:'entry',x:215,y:562,text:'Tech: pak de gele energiecel met interactie. Explorer: spring vanaf de start op het linker platform en blijf op de drukplaat. Tech kan dan door sluis 1 en de cel in aansluiting I zetten.'};
    if(this.phase==='TRANSFER'&&this.cell.state==='SOCKET_A')return {id:'climb',x:670,y:267,text:'Explorer: spring via de gevoede brug naar dit vaste platform. Ga naar de lier rechts en houd interactie vast. Tech kan de cel nu weer meenemen; de brug verdwijnt.'};
    if(this.phase==='TRANSFER')return {id:'transfer',x:798,y:562,text:'Explorer: houd de lier vast om sluis 2 open te houden. Tech: kruip met de cel onder de balk door en zet hem in aansluiting II rechts. Laat de lier pas los wanneer je partner erdoor is.'};
    if(this.phase==='CHARGE')return {id:'charge',x:1017,y:559,text:'Ga op jullie eigen gemarkeerde vloercontact staan: P1 links, P2 rechts. Houd allebei interactie vast tot de ring gevuld is. Daarmee verschijnen het sleutelplatform en de sleutel, niet een open deur.'};
    if(this.phase==='KEY')return {id:'key',x:922,y:562,text:'Explorer: neem links van het nieuwe platform een aanloop en spring naar de sleutel. Pak hem met interactie. Neem hem mee naar de deur en ontgrendel die daar.'};
    return {id:'exit',x:1135,y:559,text:'De Explorer draagt de sleutel: gebruik interactie bij de deur om te ontgrendelen. Kom daarna allebei bij de uitgang en houd samen interactie vast.'};
  }
  requestHint(){this.helpMarker=new HelpMarker(this.hintPoint());}
  drawCell(ctx,x,y){
    ctx.fillStyle='#ffdc79';ctx.fillRect(x,y,24,26);ctx.fillRect(x+8,y-4,8,4);
    ctx.fillStyle='#40304c';ctx.beginPath();ctx.moveTo(x+14,y+3);ctx.lineTo(x+6,y+15);ctx.lineTo(x+12,y+15);ctx.lineTo(x+10,y+23);ctx.lineTo(x+19,y+10);ctx.lineTo(x+13,y+10);ctx.closePath();ctx.fill();
  }
  draw(ctx,debug=false){
    ctx.clearRect(0,0,1200,660);ctx.fillStyle='#10162c';ctx.fillRect(0,0,1200,660);
    ctx.fillStyle='#292841';for(let x=20;x<1200;x+=40)for(let y=80;y<600;y+=40)ctx.fillRect(x,y,2,2);
    const powered=this.cell.state==='SOCKET_A';
    ctx.lineWidth=3;ctx.setLineDash([6,8]);
    const wire=(points,active)=>{ctx.strokeStyle=active?'#64e4ff':'#493e62';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
    wire([[312,450],[312,493],[450,493]],!this.gateA.active);
    wire([[572,568],[572,390],[535,390],[535,370]],powered);
    wire([[760,305],[760,330],[881,330],[881,355]],!this.gateB.active);
    wire([[992,580],[1068,580],[1068,480],[1165,480],[1165,510]],['CHARGE','KEY','EXIT'].includes(this.phase));ctx.setLineDash([]);
    this.platforms.forEach(p=>p.draw(ctx));
    const reader=this.players.find(p=>p.abilities.readHint);
    this.symbolHint.draw(ctx,this.symbolHint.state==='READ'&&near(reader,this.symbolHint,25));
    this.symbolSwitches.forEach(s=>s.draw(ctx));
    ctx.fillStyle='#b9afd1';ctx.font='12px monospace';ctx.fillText(`${this.matchIndex}/2`,320,548);
    this.key.draw(ctx);
    [this.gateA,this.gateB].forEach((gate,i)=>{
      ctx.strokeStyle=gate.active?'#f379d0':'#64e4ff';ctx.lineWidth=2;ctx.strokeRect(gate.x,gate.y,gate.w,gate.h);
      if(gate.active){ctx.fillStyle='#f379d0';for(let y=gate.y+12;y<600;y+=22)ctx.fillRect(gate.x+6,y,10,6);}
      ctx.fillStyle=ctx.strokeStyle;ctx.font='bold 17px monospace';ctx.fillText(`${i+1}`,gate.x+6,gate.y-12);
    });
    this.plate.draw(ctx);
    ctx.strokeStyle=this.winch.active?'#64e4ff':'#ab8bff';ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(760,283,17,0,Math.PI*2);ctx.stroke();
    const angle=this.winch.active?this.time*4:0;
    ctx.beginPath();ctx.moveTo(760-Math.cos(angle)*15,283-Math.sin(angle)*15);ctx.lineTo(760+Math.cos(angle)*15,283+Math.sin(angle)*15);ctx.stroke();
    [this.socketA,this.socketB].forEach((socket,i)=>{
      const occupied=this.cell.state===`SOCKET_${i===0?'A':'B'}`;
      ctx.fillStyle=occupied?'#324b66':'#292b47';ctx.fillRect(socket.x,socket.y,socket.w,socket.h);
      ctx.strokeStyle=occupied?'#64e4ff':'#ffdc79';ctx.lineWidth=2;ctx.strokeRect(socket.x,socket.y,socket.w,socket.h);
      if(occupied)this.drawCell(ctx,socket.x+10,socket.y+9);
      ctx.fillStyle='#ffdc79';ctx.font='bold 18px monospace';ctx.fillText(i===0?'I':'II',socket.x+14,socket.y-12);
    });
    this.chargePads.forEach((pad,i)=>{pad.draw(ctx);ctx.fillStyle=pad.active?'#64e4ff':'#b9afd1';ctx.font='bold 13px monospace';ctx.fillText(`P${i+1}`,pad.x+12,582);});
    ctx.strokeStyle='#403956';ctx.lineWidth=6;ctx.beginPath();ctx.arc(1070,495,29,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#ffdc79';ctx.beginPath();ctx.arc(1070,495,29,-Math.PI/2,-Math.PI/2+Math.PI*2*this.charge/2.5);ctx.stroke();
    ctx.fillStyle=this.phase==='EXIT'?'#64e4ff':'#ffdc79';ctx.font='bold 22px monospace';ctx.fillText(this.phase==='EXIT'?'✓':'↯',1058,503);
    ctx.font='12px monospace';ctx.fillText('E + ↵',1050,540);
    this.door.draw(ctx);this.players.forEach(p=>p.draw(ctx));
    if(['CAGED','LOOSE','CARRIED'].includes(this.cell.state))this.drawCell(ctx,this.cell.x,this.cell.y);
    if(this.cell.state==='CAGED'){
      ctx.strokeStyle='#f379d0';ctx.lineWidth=3;ctx.strokeRect(170,553,54,46);
      for(let x=180;x<224;x+=12){ctx.beginPath();ctx.moveTo(x,553);ctx.lineTo(x,599);ctx.stroke();}
    }
    if(this.keyCarrier!==null&&this.door.state==='LOCKED'){
      const carrier=this.players[this.keyCarrier];ctx.fillStyle='#ffdc79';ctx.font='bold 22px monospace';ctx.fillText('⚿',carrier.x+3,carrier.y-30);
    }
    // Small local affordances, never explanatory banners.
    ctx.fillStyle='#b9afd1';ctx.font='12px monospace';ctx.fillText('P1 ↓',294,430);ctx.fillText('P1 [E]',733,247);if(this.cell.state==='LOOSE')ctx.fillText('P2 [↵]',172,551);ctx.fillText('↓',703,522);
    if(this.ping&&this.ping.until>this.time){ctx.fillStyle='#f379d0';ctx.font='bold 24px monospace';ctx.fillText('×',this.ping.x,this.ping.y);}
    this.helpMarker?.draw(ctx,this.time);
    if(debug){ctx.strokeStyle='#ff7493';[...this.solids,...this.players,this.plate,this.winch,this.socketA,this.socketB,...this.chargePads].forEach(r=>ctx.strokeRect(r.x,r.y,r.w,r.h));}
  }
}
