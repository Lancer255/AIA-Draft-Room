'use strict';

const AIA_LIVE_STATE_KEY='aiaLiveDraftSnapshotV1';
const AIA_MOCK_STATE_KEY='aiaMockDraftStateV1';
const AIA_MOCK_INTEL_KEY='aiaMockIntelV1';
let AIA_MOCK_MODE=false;
let AIA_MOCK_INTEL={};

function cloneJson(v){return JSON.parse(JSON.stringify(v));}
function mockSave(){if(AIA_MOCK_MODE)localStorage.setItem(AIA_MOCK_STATE_KEY,JSON.stringify(state));}
function mockSnapshotLive(){localStorage.setItem(AIA_LIVE_STATE_KEY,JSON.stringify(state));}
function mockLoadLive(){const raw=localStorage.getItem(AIA_LIVE_STATE_KEY);if(raw){try{state=JSON.parse(raw);return true;}catch(e){}}const live=localStorage.getItem('aiaDraftRoomV3');if(live){try{state=JSON.parse(live);return true;}catch(e){}}return false;}
function mockLoadIntel(){try{AIA_MOCK_INTEL=JSON.parse(localStorage.getItem(AIA_MOCK_INTEL_KEY)||'{}')||{};}catch(e){AIA_MOCK_INTEL={};}}
function mockSaveIntel(){localStorage.setItem(AIA_MOCK_INTEL_KEY,JSON.stringify(AIA_MOCK_INTEL));}

function getLiveStateForMock(){
  const raw=localStorage.getItem(AIA_LIVE_STATE_KEY)||localStorage.getItem('aiaDraftRoomV3');
  if(raw){try{return JSON.parse(raw);}catch(e){}}
  return state;
}
function mockFreshState(){
  const live=getLiveStateForMock()||{};
  const picks=cloneJson(DATA.picks);
  const basePlayers=cloneJson(live.available?.length?live.available:DATA.players);
  const keepers=(live.drafted||[]).filter(d=>d&&d.keeper).map(cloneJson);
  const keeperNames=new Set(keepers.map(d=>String(d.player?.name||'').toLowerCase()));
  keepers.forEach(d=>{
    const pick=picks.find(p=>Number(p.overall)===Number(d.pick)) || picks.find(p=>p.team===d.team&&Number(p.round)===Number(d.round));
    if(pick)pick.player=cloneJson(d.player);
  });
  const available=basePlayers.filter(p=>!keeperNames.has(String(p.name||'').toLowerCase())).sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
  return {
    drafted:keepers,
    picks,
    available,
    boardMode:'grid',
    expandedTeam:null,
    wishlist:cloneJson(live.wishlist||[]).filter(x=>!keeperNames.has(String(x.name||'').toLowerCase())),
    wishlistHidden:!!live.wishlistHidden
  };
}

function enterMockMode(){if(AIA_MOCK_MODE)return;mockSnapshotLive();mockLoadIntel();const saved=localStorage.getItem(AIA_MOCK_STATE_KEY);if(saved){try{state=JSON.parse(saved);}catch(e){state=mockFreshState();}}else state=mockFreshState();AIA_MOCK_MODE=true;render();}
function exitMockMode(){if(!AIA_MOCK_MODE)return;mockSave();mockSaveIntel();mockLoadLive();AIA_MOCK_MODE=false;render();}
function resetMockDraft(){if(!confirm('Reset this mock draft and its live intel?'))return;state=mockFreshState();AIA_MOCK_INTEL={};localStorage.removeItem(AIA_MOCK_STATE_KEY);localStorage.removeItem(AIA_MOCK_INTEL_KEY);render();}

function recordMockIntel(team,player,pick){if(!team||!player)return;const pos=String(player.pos||'').toUpperCase();const entry=AIA_MOCK_INTEL[team]||(AIA_MOCK_INTEL[team]={manualPicks:[],positions:{},players:{}});entry.manualPicks.push({player:player.name,pos,round:pick?.round||null,overall:pick?.overall||null,adp:Number(player.rank)||null});entry.positions[pos]=(entry.positions[pos]||0)+1;entry.players[player.name]=(entry.players[player.name]||0)+1;mockSaveIntel();}
function intelBoost(team,player){const intel=AIA_MOCK_INTEL[team];if(!intel)return 0;let boost=0;const pos=String(player.pos||'').toUpperCase();boost+=(intel.positions?.[pos]||0)*14;boost+=(intel.players?.[player.name]||0)*28;return boost;}
function mockPickForTeam(team,ctx){if(!state.available.length)return null;let candidates=[];if(typeof predictedTargets==='function')candidates=predictedTargets(team,ctx,12)||[];const names=new Map(candidates.map((t,i)=>[t.name,Math.max(0,36-i*3)]));return state.available.slice(0,80).sort((a,b)=>{const sa=(names.get(a.name)||0)+intelBoost(team,a)-(Number(a.rank)||999)*0.04;const sb=(names.get(b.name)||0)+intelBoost(team,b)-(Number(b.rank)||999)*0.04;return sb-sa;})[0]||state.available[0]||null;}
function mockDraftPlayer(player,manual=false){const cur=cp();if(!cur||!player)return false;const i=state.available.findIndex(p=>p.name===player.name);if(i<0)return false;const p=state.available[i];state.wishlist=(state.wishlist||[]).filter(x=>String(x.name).toLowerCase()!==String(p.name).toLowerCase());cur.player=p;state.available.splice(i,1);state.drafted.push({pick:cur.overall,round:cur.round,team:cur.team,keeper:false,player:p,wishlistItem:null,mock:true,manualIntel:manual});if(manual&&cur.team!=='MJIJX')recordMockIntel(cur.team,p,cur);mockSave();return true;}
function simulateNextMockPick(){if(!AIA_MOCK_MODE)return;const cur=cp();if(!cur)return;if(cur.team==='MJIJX'){alert('MJIJX is on the clock. Make your pick from Available Players.');return;}const p=mockPickForTeam(cur.team,cur);if(p)mockDraftPlayer(p);render();}
function simulateToMJIJX(){if(!AIA_MOCK_MODE)return;let guard=0;while(cp()&&cp().team!=='MJIJX'&&guard<250){const cur=cp(),p=mockPickForTeam(cur.team,cur);if(!p||!mockDraftPlayer(p))break;guard++;}render();}
function simulateFullRound(){if(!AIA_MOCK_MODE)return;const cur=cp();if(!cur)return;const round=cur.round;let guard=0;while(cp()&&cp().round===round&&guard<24){if(cp().team==='MJIJX')break;const c=cp(),p=mockPickForTeam(c.team,c);if(!p||!mockDraftPlayer(p))break;guard++;}render();}
function manualMockPick(){if(!AIA_MOCK_MODE)return;const cur=cp();if(!cur||cur.team==='MJIJX')return;const select=document.getElementById('mockManualPlayer');if(!select)return;const name=select.value;if(!name){alert('Choose a player first.');return;}const p=state.available.find(x=>x.name===name);if(!p)return;mockDraftPlayer(p,true);render();}
function mockIntelSummary(team){const intel=AIA_MOCK_INTEL[team];if(!intel||!intel.manualPicks?.length)return '';const pos=Object.entries(intel.positions||{}).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([p,n])=>`${p} ${n}x`).join(', ');return `Your mock intel: ${pos}`;}

function installMockDraftMode(){
  const baseSave=save;save=function(){if(AIA_MOCK_MODE){mockSave();return;}return baseSave();};
  const baseDraft=draft;draft=function(i){if(!AIA_MOCK_MODE)return baseDraft(i);const cur=cp();if(!cur)return;if(cur.team!=='MJIJX'){alert('For opponent picks use Manual Pick or Auto Pick in the Mock Draft bar.');return;}i=Number(i);const p=state.available[i];if(!p)return;mockDraftPlayer(p,false);render();};
  const baseUndo=undo;undo=function(){if(!AIA_MOCK_MODE)return baseUndo();let last=state.drafted[state.drafted.length-1];if(!last||last.keeper){alert('Keeper picks stay locked in Mock Draft Mode.');return;}last=state.drafted.pop();const pick=state.picks.find(x=>x.overall===last.pick);if(pick)pick.player=null;state.available.push(last.player);state.available.sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));mockSave();render();};
  const baseRender=render;
  render=function(){baseRender();const bar=document.getElementById('mockDraftBar');if(!bar)return;const cur=AIA_MOCK_MODE?cp():null;const opponent=cur&&cur.team!=='MJIJX';const options=opponent?state.available.slice(0,120).map(p=>`<option value="${String(p.name).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}">${p.name} — ${p.pos} — ADP ${p.rank}</option>`).join(''):'';const intel=opponent?mockIntelSummary(cur.team):'';bar.innerHTML=`<strong>${AIA_MOCK_MODE?'MOCK DRAFT MODE':'LIVE DRAFT MODE'}</strong><button type="button" onclick="${AIA_MOCK_MODE?'exitMockMode()':'enterMockMode()'}">${AIA_MOCK_MODE?'Return to Live Draft':'Start Mock Draft'}</button>${AIA_MOCK_MODE?'<button type="button" onclick="simulateNextMockPick()">Auto Pick</button><button type="button" onclick="simulateToMJIJX()">Sim to MJIJX</button><button type="button" onclick="simulateFullRound()">Sim Full Round</button><button type="button" onclick="resetMockDraft()">Reset Mock</button>':''}${opponent?`<span style="font-weight:700">${cur.team} on clock:</span><select id="mockManualPlayer" style="max-width:280px;padding:6px"><option value="">Manual Pick…</option>${options}</select><button type="button" onclick="manualMockPick()">Make Manual Pick</button>`:''}<span style="font-size:12px;color:#5b6573">${AIA_MOCK_MODE?(intel||'Keepers are locked in from Live Draft Mode. Manual opponent picks become live mock intel.'):'Opponent picks in mock mode use Owner DNA + current ADP + roster needs.'}</span>`;};
  mockLoadIntel();render();
}
window.addEventListener('load',()=>setTimeout(installMockDraftMode,20));
