'use strict';

const AIA_LIVE_STATE_KEY='aiaLiveDraftSnapshotV1';
const AIA_MOCK_STATE_KEY='aiaMockDraftStateV1';
let AIA_MOCK_MODE=false;

function cloneJson(v){return JSON.parse(JSON.stringify(v));}

function mockSave(){
  if(!AIA_MOCK_MODE)return;
  localStorage.setItem(AIA_MOCK_STATE_KEY,JSON.stringify(state));
}

function mockSnapshotLive(){
  localStorage.setItem(AIA_LIVE_STATE_KEY,JSON.stringify(state));
}

function mockLoadLive(){
  const raw=localStorage.getItem(AIA_LIVE_STATE_KEY);
  if(raw){try{state=JSON.parse(raw);return true;}catch(e){}}
  const live=localStorage.getItem('aiaDraftRoomV3');
  if(live){try{state=JSON.parse(live);return true;}catch(e){}}
  return false;
}

function mockFreshState(){
  return {
    drafted:[],
    picks:cloneJson(DATA.picks),
    available:cloneJson(DATA.players).sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999)),
    boardMode:'grid',
    expandedTeam:null,
    wishlist:cloneJson(state.wishlist||[]),
    wishlistHidden:!!state.wishlistHidden
  };
}

function enterMockMode(){
  if(AIA_MOCK_MODE)return;
  mockSnapshotLive();
  const saved=localStorage.getItem(AIA_MOCK_STATE_KEY);
  if(saved){try{state=JSON.parse(saved);}catch(e){state=mockFreshState();}}
  else state=mockFreshState();
  AIA_MOCK_MODE=true;
  render();
}

function exitMockMode(){
  if(!AIA_MOCK_MODE)return;
  mockSave();
  mockLoadLive();
  AIA_MOCK_MODE=false;
  render();
}

function resetMockDraft(){
  if(!confirm('Reset this mock draft?'))return;
  state=mockFreshState();
  localStorage.removeItem(AIA_MOCK_STATE_KEY);
  render();
}

function mockPickForTeam(team, ctx){
  if(!state.available.length)return null;
  if(typeof predictedTargets==='function'){
    const targets=predictedTargets(team,ctx,8);
    const target=targets.find(t=>state.available.some(p=>p.name===t.name));
    if(target)return state.available.find(p=>p.name===target.name) || null;
  }
  return state.available.slice().sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999))[0] || null;
}

function mockDraftPlayer(player){
  const cur=cp();
  if(!cur||!player)return false;
  const i=state.available.findIndex(p=>p.name===player.name);
  if(i<0)return false;
  const p=state.available[i];
  state.wishlist=(state.wishlist||[]).filter(x=>String(x.name).toLowerCase()!==String(p.name).toLowerCase());
  cur.player=p;
  state.available.splice(i,1);
  state.drafted.push({pick:cur.overall,round:cur.round,team:cur.team,keeper:cur.keeperRound,player:p,wishlistItem:null,mock:true});
  mockSave();
  return true;
}

function simulateNextMockPick(){
  if(!AIA_MOCK_MODE)return;
  const cur=cp();
  if(!cur)return;
  if(cur.team==='MJIJX'){
    alert('MJIJX is on the clock. Make your pick from Available Players.');
    return;
  }
  const p=mockPickForTeam(cur.team,cur);
  if(p)mockDraftPlayer(p);
  render();
}

function simulateToMJIJX(){
  if(!AIA_MOCK_MODE)return;
  let guard=0;
  while(cp() && cp().team!=='MJIJX' && guard<250){
    const cur=cp();
    const p=mockPickForTeam(cur.team,cur);
    if(!p||!mockDraftPlayer(p))break;
    guard++;
  }
  render();
}

function simulateFullRound(){
  if(!AIA_MOCK_MODE)return;
  const cur=cp();
  if(!cur)return;
  const round=cur.round;
  let guard=0;
  while(cp() && cp().round===round && guard<24){
    if(cp().team==='MJIJX')break;
    const c=cp(), p=mockPickForTeam(c.team,c);
    if(!p||!mockDraftPlayer(p))break;
    guard++;
  }
  render();
}

function installMockDraftMode(){
  const baseSave=save;
  save=function(){
    if(AIA_MOCK_MODE){mockSave();return;}
    return baseSave();
  };

  const baseDraft=draft;
  draft=function(i){
    if(!AIA_MOCK_MODE)return baseDraft(i);
    const cur=cp();
    if(!cur)return;
    if(cur.team!=='MJIJX'){
      alert('Use the mock controls to simulate opponent picks.');
      return;
    }
    i=Number(i);
    const p=state.available[i];
    if(!p)return;
    mockDraftPlayer(p);
    render();
  };

  const baseUndo=undo;
  undo=function(){
    if(!AIA_MOCK_MODE)return baseUndo();
    const last=state.drafted.pop();
    if(!last)return;
    const pick=state.picks.find(x=>x.overall===last.pick);
    if(pick)pick.player=null;
    state.available.push(last.player);
    state.available.sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
    mockSave();
    render();
  };

  const baseRender=render;
  render=function(){
    baseRender();
    const bar=document.getElementById('mockDraftBar');
    if(bar){
      bar.innerHTML=`<strong>${AIA_MOCK_MODE?'MOCK DRAFT MODE':'LIVE DRAFT MODE'}</strong>
        <button type="button" onclick="${AIA_MOCK_MODE?'exitMockMode()':'enterMockMode()'}">${AIA_MOCK_MODE?'Return to Live Draft':'Start Mock Draft'}</button>
        ${AIA_MOCK_MODE?'<button type="button" onclick="simulateNextMockPick()">Next Pick</button><button type="button" onclick="simulateToMJIJX()">Sim to MJIJX</button><button type="button" onclick="simulateFullRound()">Sim Full Round</button><button type="button" onclick="resetMockDraft()">Reset Mock</button>':''}
        <span style="font-size:12px;color:#5b6573">${AIA_MOCK_MODE?'Mock results are saved separately and never overwrite the live draft.':'Opponent picks in mock mode use Owner DNA + current ADP + roster needs.'}</span>`;
    }
  };
  render();
}

window.addEventListener('load',()=>setTimeout(installMockDraftMode,20));
