import {State,GameState} from './gameState.js';
import {InputManager} from './input.js';
import {CHARACTERS} from './player.js';
import {StageManager} from './stageManager.js';

const screen=document.querySelector('#screen'),game=document.querySelector('#game');
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const feedback=document.querySelector('#feedback'),legend=document.querySelector('#legend');
const input=new InputManager(),manager=new StageManager();
const debug=new URLSearchParams(location.search).get('debug')==='true';
const selected=[0,1];
let setupStep=0,stage,accumulator=0,lastTime=0;
const state=new GameState(renderScreen);
const button=(id,label,secondary=false)=>`<button id="${id}" class="${secondary?'secondary':''}">${label}</button>`;
function bind(id,fn){document.getElementById(id)?.addEventListener('click',fn);}
function start(){input.clear();accumulator=0;stage=manager.load(1,selected.map(i=>CHARACTERS[i]));state.set(State.PLAYING);document.activeElement?.blur();}
function renderScreen(){
  game.hidden=state.current!==State.PLAYING;
  screen.innerHTML='';input.clear();
  if(state.current===State.MENU){
    screen.innerHTML=`<div class="eyebrow">TWEE SPELERS. ÉÉN VERBINDING.</div><h1>SYNC</h1><p>Local Co-op</p>${button('start','START')}`;
    bind('start',()=>{setupStep=0;state.set(State.SETUP);});
  } else if(state.current===State.SETUP){
    const steps=[
      `<div class="eyebrow">01 / PLAYER SETUP</div><h2>Samen op één scherm</h2><div class="cards"><div class="card"><h3>Player 1 · Verkenner</h3><p>Spring hoger. Lees de hint en bereik de verborgen sleutel.</p></div><div class="card"><h3>Player 2 · Bediener</h3><p>Bedien de schakelaars en maak de route voor je partner vrij.</p></div></div><p>Alleen 2 lokale spelers. Jullie rollen gelden voor deze stage, onafhankelijk van je character.</p>`,
      `<div class="eyebrow">02 / CHARACTER SELECT</div><h2>Kies jullie characters</h2><div class="cards">${selected.map((s,i)=>`<div class="card"><h3>Player ${i+1}</h3><label for="character-${i}">Placeholder character</label><select id="character-${i}">${CHARACTERS.map((c,j)=>`<option value="${j}" ${j===s?'selected':''}>${c.name} · ${['cyaan / cirkel','oranje / vierkant','paars / ruit','roze / driehoek'][j]}</option>`).join('')}</select></div>`).join('')}</div><p>Elk character heeft een eigen kleur en vorm. Kies twee verschillende characters.</p>`,
      `<div class="eyebrow">03 / CONTROLS</div><h2>Praat. Ontdek. Verbind.</h2><div class="cards"><div class="card"><h3>Player 1</h3><p>A / D · bewegen<br>W · springen<br>S · bukken<br>E · interactie</p></div><div class="card"><h3>Player 2</h3><p>← / → · bewegen<br>↑ · springen<br>↓ · bukken<br>Enter · interactie</p></div></div><p>Esc · pauze. Bij de uitgang houden jullie samen de interactieknoppen vast.<br>Optionele gamepad: linker stick / D-pad, onderste knop springen, linker knop interactie, D-pad omlaag bukken.</p><div id="pads"></div>${button('scan','Controllers detecteren',true)}`,
    ];
    screen.innerHTML=steps[setupStep]+`<p id="setup-message" role="status"></p><div class="actions">${button('back','Terug',true)}${button('next',setupStep===2?'START STAGE 1':'Verder')}</div>`;
    bind('back',()=>{if(setupStep===0)state.set(State.MENU);else{setupStep--;renderScreen();}});
    bind('next',()=>{
      if(setupStep===1){selected.forEach((_,i)=>selected[i]=Number(document.getElementById(`character-${i}`).value));if(selected[0]===selected[1]){document.querySelector('#setup-message').textContent='Kies twee verschillende characters zodat jullie herkenbaar blijven.';return;}}
      if(setupStep===2){const values=[...document.querySelectorAll('.pad-select')].map(e=>e.value);if(values[0]!==''&&values[0]===values[1]){document.querySelector('#setup-message').textContent='Koppel een controller aan maximaal één speler.';return;}input.assignments=values.map(v=>v===''?null:Number(v));start();}
      else{setupStep++;renderScreen();}
    });
    if(setupStep===2){renderPads();bind('scan',renderPads);}
  } else if(state.current===State.PAUSED){
    screen.innerHTML=`<div class="eyebrow">VERBINDING GEPAUZEERD</div><h2>Pauze</h2><div class="actions">${button('resume','Verder spelen')}${button('restart','Stage opnieuw',true)}${button('menu','Startscherm',true)}</div>`;
    bind('resume',()=>{state.set(State.PLAYING);document.activeElement?.blur();});bind('restart',start);bind('menu',()=>state.set(State.MENU));
  } else if(state.current===State.STAGE_COMPLETE){
    screen.innerHTML=`<div class="eyebrow">VERBINDING GEMAAKT</div><h2>STAGE 1 COMPLETE</h2><p>Hint gedeeld. Route geopend. Sleutel gevonden.<br>Jullie hebben samen de uitgang bereikt.</p><div class="actions">${button('replay','Opnieuw spelen')}${button('menu','Startscherm',true)}</div>`;
    bind('replay',start);bind('menu',()=>state.set(State.MENU));
  }
  if(state.current===State.PLAYING)legend.innerHTML=stage.players.map(p=>`<span><i class="swatch" style="background:${p.character.color}"></i>P${p.id+1} · ${p.character.name} · ${p.abilities.role} · ${p.id===0?'A D / W / S / E':'← → / ↑ / ↓ / Enter'}</span>`).join('');
}
function renderPads(){
  const pads=input.pads();
  document.querySelector('#pads').innerHTML=`<p>${pads.length} controller(s) gevonden. Druk eerst een knop op je controller in, en detecteer opnieuw.</p><div class="cards">${selected.map((_,i)=>`<label>Player ${i+1} <select class="pad-select"><option value="">Keyboard</option>${pads.map(p=>`<option value="${p.index}" ${input.assignments[i]===p.index?'selected':''}>Controller ${p.index+1}</option>`).join('')}</select></label>`).join('')}</div>`;
}
function pause(){if(state.current===State.PLAYING)state.set(State.PAUSED);}
document.querySelector('#pause').addEventListener('click',pause);
window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function frame(time){
  const elapsed=Math.min((time-lastTime)/1000,0.05);lastTime=time;
  if(input.pressed.has('Escape')){
    if(state.current===State.PLAYING)pause();else if(state.current===State.PAUSED){state.set(State.PLAYING);document.activeElement?.blur();}
  }
  if(state.current===State.PLAYING){
    accumulator+=elapsed;
    // Fixed substeps keep AABB collision stable; button edges are consumed once.
    if(accumulator>=1/120){
      const actions=input.sample();
      while(accumulator>=1/120){stage.update(1/120,actions);accumulator-=1/120;actions.forEach(a=>{a.jump=false;a.interact=false;});if(stage.complete){state.set(State.STAGE_COMPLETE);break;}}
      input.endFrame();
    }
    stage.draw(ctx,debug);feedback.textContent=stage.message;
    if(debug){ctx.fillStyle='#050912e8';ctx.fillRect(12,12,810,95);ctx.fillStyle='#fff';ctx.font='14px monospace';[
      `FPS ${Math.round(1/(elapsed||1))} | ${state.current} | gamepads ${input.pads().length}`,
      stage.players.map(p=>`P${p.id+1}: ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.grounded?'ground':'air'}`).join(' | '),
      `hint ${stage.hint.state} | bridge ${stage.bridge.active} | key ${stage.key.state} | door ${stage.door.state}`,
      `switches ${stage.switches.map(s=>s.state).join(' / ')}`,
    ].forEach((line,i)=>ctx.fillText(line,24,34+i*21));}
  } else {accumulator=0;input.endFrame();}
  requestAnimationFrame(frame);
}
renderScreen();requestAnimationFrame(frame);
