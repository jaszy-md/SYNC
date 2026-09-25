import {State} from './gameState.js';
import {CHARACTERS} from './player.js';

const button = (id,label,kind='secondary') => `<button id="${id}" class="${kind}">${label}</button>`;
const avatar = c => `<span class="avatar ${c.shape}" style="--character:${c.color}" aria-hidden="true"><i></i></span>`;
const heading = (label,title,description='') => `<div class="screen-head"><div class="eyebrow">${label}</div><h2>${title}</h2>${description?`<p>${description}</p>`:''}</div>`;
const shapes = ['CIRKEL / CYAN','VIERKANT / AMBER','RUIT / PAARS','DRIEHOEK / ROZE'];

// UI-only navigation lives here; the central GameState still owns play/pause.
export function createUI({state,input,selected,start,resume,getStage}) {
  const screen=document.querySelector('#screen'), game=document.querySelector('#game');
  let panel=null, setupStep=0, activePlayer=0, typingTimer;
  const bind=(id,fn)=>document.getElementById(id)?.addEventListener('click',fn);
  // Shrink only when a compact panel still exceeds a short viewport. Transform
  // does not affect measured layout size, so ResizeObserver cannot oscillate.
  const fitPanel=()=>{
    const sheet=screen.querySelector('.sheet');
    if(!sheet||screen.hidden)return;
    const style=getComputedStyle(screen);
    const height=screen.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-8;
    const width=screen.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-8;
    const scale=Math.min(1,height/sheet.offsetHeight,width/sheet.offsetWidth);
    sheet.style.transform=`scale(${Math.max(0.1,scale)})`;
  };
  const resizeObserver=new ResizeObserver(fitPanel);
  const open=name=>{panel=name;render();};
  const closePanel=()=>{if(!panel)return false;panel=null;render();return true;};
  const back=()=>button('panel-back','← Terug','ghost');
  function render() {
    resizeObserver.disconnect();
    clearInterval(typingTimer);
    input.clear();
    const playing=state.current===State.PLAYING, paused=state.current===State.PAUSED;
    game.hidden=!playing&&!paused;
    document.querySelector('#pause').hidden=!playing;
    screen.hidden=playing;
    screen.className=paused?'overlay':'';
    screen.setAttribute('role',paused?'dialog':'region');
    if(paused)screen.setAttribute('aria-modal','true');else screen.removeAttribute('aria-modal');
    if(playing){screen.innerHTML='';document.activeElement?.blur();return;}
    if(panel)renderPanel();
    else if(state.current===State.MENU)renderMenu();
    else if(state.current===State.SETUP)renderSetup();
    else if(paused)renderPause();
    else if(state.current===State.STAGE_COMPLETE){
      screen.innerHTML=`<div class="sheet narrow complete"><div class="complete-icon">✦</div>${heading('LEVEL 1 / VERBINDING GEMAAKT','STAGE 1 COMPLETE','Energie doorgegeven. Sluizen geopend. Samen ontsnapt.')}<div class="actions">${button('replay','Nog een ronde ↗','primary')}${button('main-menu','Hoofdmenu')}</div></div>`;
      bind('replay',start);bind('main-menu',mainMenu);
    }
    bind('panel-back',closePanel);
    fitPanel();
    resizeObserver.observe(screen);
    const sheet=screen.querySelector('.sheet');
    if(sheet)resizeObserver.observe(sheet);
    screen.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  function mainMenu(){panel=null;state.set(State.MENU);}
  function renderMenu(){
    screen.innerHTML=`<div class="sheet hero"><div><span class="pill">LEVEL 1 · LOCAL CO-OP</span><h1 class="hero-logo"><img src="/assets/images/group-characters.png" alt="SYNC"></h1><div class="escape-title">ESCAPE CHAIN</div><p class="typing" aria-label="Can technology bring us back together?"><span aria-hidden="true" id="typed"></span></p>${button('start','Start Game ↗','primary')}<div class="menu-links">${button('controls','Controls','ghost')}${button('controllers','Controllers','ghost')}</div></div><div class="hero-art"><span class="spark">✦</span><div class="crew">${CHARACTERS.map(avatar).join('')}</div><span class="orbit-label">YOU + ME = SYNC</span></div></div>`;
    const phrase='Can technology bring us back together?';
    const typed=document.querySelector('#typed');
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)typed.textContent=phrase;
    else {let index=0;typingTimer=setInterval(()=>{typed.textContent=phrase.slice(0,++index);if(index===phrase.length)clearInterval(typingTimer);},42);}
    bind('start',()=>{setupStep=0;state.set(State.SETUP);});
    bind('controls',()=>open('controls'));bind('controllers',()=>open('controllers'));
  }
  function roles(){return `<div class="cards"><article class="card role-card"><span class="role-icon">↟</span><span class="pill">PLAYER 1</span><h3>Explorer</h3><p>Vind wat de ander niet ziet.</p><ul><li>Hoge sprong & bovenroute</li><li>Houdt drukplaat en lier actief</li><li>Maakt doorgangen vrij</li></ul><div class="weakness">Heeft de energiecel van de Tech nodig.</div></article><article class="card role-card support"><span class="role-icon">⌘</span><span class="pill">PLAYER 2</span><h3>Tech</h3><p>Maak jullie volgende stap mogelijk.</p><ul><li>Draagt één gedeelde energiecel</li><li>Voedt brug en uitgang</li><li>Verplaatst de stroom tussen aansluitingen</li></ul><div class="weakness">Kan niet op de hoge platforms komen.</div></article></div>`;}
  function renderSetup(){
    if(setupStep===0){screen.innerHTML=`<div class="sheet">${heading('01 / TEAM UP','Twee spelers. Eén missie.','Alleen 2 lokale spelers op hetzelfde scherm. Ontdek, communiceer en open samen de uitgang.')}${roles()}<div class="actions">${button('back','← Hoofdmenu','ghost')}${button('next','Kies jullie characters →','primary')}</div></div>`;}
    else if(setupStep===1){
      const c=CHARACTERS[selected[activePlayer]];
      screen.innerHTML=`<div class="sheet">${heading('02 / CHOOSE YOUR LOOK','Wie zijn jullie?','Je character bepaalt je look. Je rol blijft hetzelfde.')}<div class="tabs player-tabs" aria-label="Speler kiezen">${selected.map((s,i)=>`<button id="player-${i}" aria-pressed="${i===activePlayer}">Player ${i+1}<small>${CHARACTERS[s].name} · ${i===0?'Explorer':'Tech'}</small></button>`).join('')}</div><div class="character-layout"><div class="character-grid">${CHARACTERS.map((character,j)=>`<button class="character-option" id="character-${j}" style="--character:${character.color}" aria-pressed="${j===selected[activePlayer]}" ${j===selected[1-activePlayer]?'disabled':''}>${avatar(character)}<span>${character.name}<small>${shapes[j]}</small></span><span class="choice-badge">${selected.includes(j)?`P${selected.indexOf(j)+1} ✓`:''}</span></button>`).join('')}</div><div class="character-preview"><span class="preview-label">PLAYER ${activePlayer+1} / SELECTED</span>${avatar(c)}<div><h3>${c.name}</h3><p>PLACEHOLDER · ${shapes[selected[activePlayer]]}</p></div></div></div><div class="actions">${button('back','← Rollen','ghost')}${button('next','Team gereed →','primary')}</div></div>`;
      selected.forEach((_,i)=>bind(`player-${i}`,()=>{activePlayer=i;render();}));
      CHARACTERS.forEach((_,i)=>bind(`character-${i}`,()=>{selected[activePlayer]=i;render();document.getElementById(`character-${i}`).focus();}));
    } else {
      screen.innerHTML=`<div class="sheet narrow">${heading('03 / READY TO SYNC','Samen ontdekken.','Kraak de kooi. Verplaats de batterij. Vind samen de sleutel.')}<div class="ready-grid">${selected.map((s,i)=>`<article class="card ready-player">${avatar(CHARACTERS[s])}<div><span class="pill">PLAYER ${i+1} / ${i===0?'EXPLORER':'TECH'}</span><h3>${CHARACTERS[s].name}</h3><p>${input.assignments[i]===null?'Keyboard':`Controller ${input.assignments[i]+1}`} · ${i===0?'Drukplaat & lier':'Energiecel'}</p></div></article>`).join('')}</div><div class="note">Alleen 2 spelers · Praat met elkaar. Extra hulp vind je tijdens het spelen in Menu → Vraag een hint.</div><div class="menu-links">${button('controls','Controls bekijken','ghost')}${button('controllers','Controllers koppelen','ghost')}</div><div class="actions">${button('back','← Characters','ghost')}${button('play','Start Stage 1 ↗','primary')}</div></div>`;
      bind('controls',()=>open('controls'));bind('controllers',()=>open('controllers'));bind('play',start);
    }
    bind('back',()=>{if(setupStep===0)mainMenu();else{setupStep--;render();}});
    bind('next',()=>{setupStep++;render();});
  }
  function renderPause(){
    screen.innerHTML=`<div class="sheet narrow">${heading('TAKE A BREATHER','Even uit de sync.','De wereld wacht op jullie.')}<div class="pause-grid">${button('resume','▶ Verder spelen<small>Terug naar jullie verbinding</small>','primary')}${button('hint','✦ Vraag een hint<small>Zoek en verzamel een marker in de wereld</small>')}${button('controls','Controls<small>Keyboard & gamepad</small>')}${button('controllers','Controllerstatus<small>Verbinding en spelerkoppeling</small>')}${button('restart','Stage opnieuw<small>Zet de energiecel terug bij de start</small>')}${button('main-menu','Naar hoofdmenu<small>Verlaat deze ronde</small>')}</div></div>`;
    bind('resume',resume);bind('hint',()=>{getStage().requestHint();resume();});bind('controls',()=>open('controls'));bind('controllers',()=>open('controllers'));bind('restart',start);bind('main-menu',mainMenu);
  }
  let controlsTab='keyboard';
  function renderPanel(){
    if(panel==='controls'){
      const rows=controlsTab==='keyboard'?[['A / D','W','S','E'],['← / →','↑','↓','Enter']]:[['Stick / D-pad','A / ✕','D-pad ↓','X / □'],['Stick / D-pad','A / ✕','D-pad ↓','X / □']];
      screen.innerHTML=`<div class="sheet narrow">${heading('INPUT / HOW TO PLAY','Vind jullie ritme.')}<div class="tabs">${['keyboard','gamepad'].map(t=>`<button id="tab-${t}" aria-pressed="${controlsTab===t}">${t==='keyboard'?'Keyboard':'Gamepad'}</button>`).join('')}</div><div class="cards controls-grid">${rows.map((keys,i)=>`<div class="card"><h3>Player ${i+1} · ${i===0?'Explorer':'Tech'}</h3>${keys.map((key,j)=>`<div class="control-row"><span>${['Bewegen','Springen','Bukken','Interactie'][j]}</span><kbd>${key}</kbd></div>`).join('')}</div>`).join('')}</div><div class="note">${controlsTab==='keyboard'?'Pauze via de Menu-knop of Esc. Bij de uitgang: samen E + Enter vasthouden.':'Standaard gamepad: onderste knop = springen, linker knop = interactie. Koppel elke controller via Controllers; keyboard blijft beschikbaar.'}</div><div class="actions">${back()}${button('devices','Controllers →','ghost')}</div></div>`;
      ['keyboard','gamepad'].forEach(t=>bind(`tab-${t}`,()=>{controlsTab=t;render();document.getElementById(`tab-${t}`).focus();}));bind('devices',()=>open('controllers'));return;
    }
    screen.innerHTML=`<div class="sheet narrow">${heading('DEVICE SETUP / LOCAL ONLY','Controllers koppelen','Druk een knop op je controller in en klik op Detecteren.')}<div id="pads"></div><p id="device-message" class="inline-message" role="status"></p><div class="actions">${back()}<div class="group">${button('scan','Detecteren')}${button('save-pads','Opslaan','primary')}</div></div></div>`;
    renderPads();bind('scan',renderPads);bind('save-pads',()=>{
      const values=[...document.querySelectorAll('.device-select')].map(e=>e.value===''?null:Number(e.value));
      const message=document.querySelector('#device-message');
      if(values[0]!==null&&values[0]===values[1]){message.textContent='Koppel één controller aan maximaal één speler.';return;}
      input.assignments=values;renderPads();message.textContent='Opgeslagen. Keyboard blijft voor beide spelers beschikbaar.';
    });
  }
  function renderPads(){
    const pads=input.pads();
    document.querySelector('#pads').innerHTML=`<div class="cards">${selected.map((_,i)=>{
      const assigned=input.assignments[i], disconnected=assigned!==null&&!pads.some(p=>p.index===assigned);
      return `<div class="card"><h3>Player ${i+1}</h3><label for="device-${i}">Invoerapparaat</label><select class="device-select" id="device-${i}"><option value="">Keyboard</option>${pads.map(p=>`<option value="${p.index}" ${assigned===p.index?'selected':''}>Controller ${p.index+1}</option>`).join('')}${disconnected?`<option value="${assigned}" selected>Controller ${assigned+1} (offline)</option>`:''}</select><p class="device-status">${assigned===null?'Keyboard actief':disconnected?'Offline · gebruik keyboard':'Controller gekoppeld'}</p></div>`;
    }).join('')}</div><div class="note">${pads.length} controller(s) verbonden · Maximaal 2 spelers. Toewijzingen blijven bewaard bij opnieuw spelen.</div>`;
  }
  window.addEventListener('gamepaddisconnected',()=>{if(panel==='controllers'){document.querySelector('#device-message').textContent='Controller losgekoppeld. Keyboard blijft beschikbaar; detecteer opnieuw voor de actuele lijst.';}});
  window.addEventListener('gamepadconnected',()=>{if(panel==='controllers')document.querySelector('#device-message').textContent='Controller gevonden. Klik Detecteren om de lijst bij te werken.';});
  // Keep keyboard focus in the pause overlay; Escape is handled by the main loop.
  screen.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||state.current!==State.PAUSED)return;
    const nodes=[...screen.querySelectorAll('button:not(:disabled),select')];
    const first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  return {render,closePanel,resetPanel:()=>{panel=null;}};
}
