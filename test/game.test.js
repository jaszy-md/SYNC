import test from 'node:test';
import assert from 'node:assert/strict';
import {Stage1} from '../src/stages/stage1.js';
import {CHARACTERS,Player} from '../src/player.js';
import {Platform} from '../src/objects.js';
const idle=()=>({move:0,jump:false,crouch:false,interact:false,interactHeld:false});
const make=()=>new Stage1([CHARACTERS[2],CHARACTERS[0]],()=>0);
const step=(s,actions,seconds)=>{for(let t=0;t<seconds;t+=1/120)s.update(1/120,actions);};
test('independent movement, gravity, landing, jump and crouch clearance',()=>{
  const s=make();step(s,[idle(),idle()],0.2);
  step(s,[{...idle(),move:1},{...idle(),move:-1}],0.1);
  assert.ok(s.players[0].x>70);assert.ok(s.players[1].x<135);
  const p=s.players[0];assert.equal(p.y,554);assert.equal(p.grounded,true);
  s.update(1/120,[{...idle(),jump:true},idle()]);assert.ok(p.vy<0);
  step(s,[idle(),idle()],1.5);assert.equal(p.y,554);
  s.update(1/120,[{...idle(),crouch:true},idle()]);assert.equal(p.h,26);assert.equal(p.y,574);
  p.x=840;s.update(1/120,[idle(),idle()]);assert.equal(p.h,26,'cannot stand through a ceiling');
  p.x=950;s.update(1/120,[idle(),idle()]);assert.equal(p.h,46);
});
test('walls and ceiling stop bodies',()=>{
  const p=new Player(0,CHARACTERS[0],{x:50,y:100},{jumpSpeed:760});
  p.update({...idle(),move:1},1/120,[new Platform(79,0,20,500)]);assert.equal(p.x,51);
  p.vy=-760;p.update(idle(),1/120,[new Platform(0,90,200,10)]);assert.equal(p.y,100);assert.equal(p.vy,0);
});
test('upper area is reachable only with high jump',()=>{
  for(const [index,expected] of [[0,true],[1,false]]){
    const s=make(),p=s.players[index];p.x=70;p.y=554;p.grounded=true;
    let landed=false;
    for(let f=0;f<150;f++){
      const a=[idle(),idle()];a[index]={...idle(),jump:f===0,move:p.x<250?1:0};s.update(1/120,a);
      if(p.grounded&&p.y===404)landed=true;
    }
    assert.equal(landed,expected);
  }
});
test('puzzle needs both roles, correct hint, key, and joint exit action',()=>{
  const s=make(),[a,b]=s.players;
  b.x=315;s.interact(b);assert.equal(s.bridge.active,false);
  a.x=285;a.y=404;s.interact(a);assert.equal(s.hint.state,'READ');
  b.x=410;s.interact(b);assert.equal(s.bridge.active,false);
  a.x=70;s.interact(b);assert.equal(s.bridge.active,false);
  a.x=285;s.interact(a);b.x=315;s.interact(b);assert.equal(s.bridge.active,true);assert.equal(s.key.state,'VISIBLE');
  b.x=680;b.y=244;s.interact(b);assert.equal(s.key.state,'VISIBLE');
  a.x=680;a.y=244;s.interact(a);assert.equal(s.key.state,'COLLECTED');assert.equal(s.door.state,'UNLOCKED');
  a.x=1090;a.y=554;b.x=700;b.y=554;
  s.update(1/120,[{...idle(),interactHeld:true},{...idle(),interactHeld:true}]);assert.equal(s.complete,false);
  b.x=1050;s.update(1/120,[{...idle(),interactHeld:true},idle()]);assert.equal(s.complete,false);
  s.update(1/120,[{...idle(),interactHeld:true},{...idle(),interactHeld:true}]);assert.equal(s.complete,true);assert.equal(s.door.state,'OPEN');
});
test('fresh stage resets objects; character choice does not change roles',()=>{
  const s=make();assert.equal(s.players[0].character.id,'c');assert.equal(s.players[1].character.id,'a');assert.ok(s.players[0].abilities.readHint);assert.ok(s.players[1].abilities.operateSwitch);
  s.bridge.active=true;s.key.reveal();const fresh=make();assert.equal(fresh.bridge.active,false);assert.equal(fresh.key.state,'HIDDEN');
});
test('full platform route reaches the key using movement and jumping',()=>{
  const s=make(),[p,b]=s.players;
  const walkTo=(x)=>{for(let f=0;f<400&&Math.abs(p.x-x)>2;f++)s.update(1/120,[{...idle(),move:Math.sign(x-p.x)},idle()]);};
  const jumpTo=(x)=>{
    for(let f=0;f<160;f++)s.update(1/120,[{...idle(),jump:f===0,move:Math.abs(p.x-x)>2?Math.sign(x-p.x):0},idle()]);
  };
  step(s,[idle(),idle()],0.2);jumpTo(280);assert.equal(p.y,404);
  s.interact(p);b.x=315;s.interact(b);assert.ok(s.bridge.active);
  walkTo(350);jumpTo(490);assert.equal(p.y,319);
  jumpTo(680);assert.equal(p.y,244);s.interact(p);assert.equal(s.key.state,'COLLECTED');
});
