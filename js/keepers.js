'use strict';

const AIA_KEEPERS_KEY='aiaKeepersV1';

function keeperNorm(v){return String(v||'').trim().replace(/\s+/g,' ').toLowerCase();}
function keeperList(){try{return JSON.parse(localStorage.getItem(AIA_KEEPERS_KEY)||'[]')||[];}catch(e){return[];}}
function keeperSave(list){localStorage.setItem(AIA_KEEPERS_KEY,JSON.stringify(list));}
function keeperEsc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}

function addKeeper(){
  if(typeof AIA_MOCK_MODE!=='undefined'&&AIA_MOCK_MODE){alert('Add keepers from Live Draft Mode so they carry into every mock.');return;}
  const team=document.getElementById('keeperTeam')?.value||'';
  const typed=(document.getElementById('keeperPlayer')?.value||'').trim();
  const round=Number(document.getElementById('keeperRound')?.value||0);
  if(!team||!typed||!round){alert('Choose a team, player and keeper round.');return;}

  const exact=state.available.find(p=>keeperNorm(p.name)===keeperNorm(typed));
  const partials=state.available.filter(p=>keeperNorm(p.name).includes(keeperNorm(typed)));
  const player=exact || (partials.length===1?partials[0]:null);
  if(!player){
    if(partials.length>1){alert('More than one player matches that name. Type a little more or choose a suggestion.');}
    else alert('Could not find that player in Available Players.');
    return;
  }

  const pick=state.picks.find(p=>p.team===team&&Number(p.round)===round);
  if(!pick){alert(`${team} does not have a pick in Round ${round}.`);return;}
  if(pick.player){alert(`That Round ${round} pick is already occupied.`);return;}
  if(state.drafted.some(d=>keeperNorm(d.player?.name)===keeperNorm(player.name))){alert('That player is already drafted.');return;}

  pick.player=player;
  const ix=state.available.findIndex(p=>keeperNorm(p.name)===keeperNorm(player.name));
  if(ix>=0)state.available.splice(ix,1);
  state.wishlist=(state.wishlist||[]).filter(x=>keeperNorm(x.name)!==keeperNorm(player.name));
  state.drafted.push({pick:pick.overall,round:pick.round,team:pick.team,keeper:true,keeperRound:round,player,wishlistItem:null});
  state.drafted.sort((a,b)=>a.pick-b.pick);
  const list=keeperList().filter(k=>!(k.team===team&&Number(k.round)===round));
  list.push({team,player:player.name,round,overall:pick.overall});keeperSave(list);
  save();render();
}

function removeKeeper(overall){
  if(typeof AIA_MOCK_MODE!=='undefined'&&AIA_MOCK_MODE)return;
  const d=state.drafted.find(x=>Number(x.pick)===Number(overall)&&x.keeper);
  if(!d)return;
  const pick=state.picks.find(p=>Number(p.overall)===Number(overall));if(pick)pick.player=null;
  state.drafted=state.drafted.filter(x=>!(Number(x.pick)===Number(overall)&&x.keeper));
  if(!state.available.some(p=>keeperNorm(p.name)===keeperNorm(d.player.name)))state.available.push(d.player);
  state.available.sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
  keeperSave(keeperList().filter(k=>Number(k.overall)!==Number(overall)));
  save();render();
}

function installKeepers(){
  const bar=document.getElementById('keeperBar');if(!bar)return;
  const baseRender=render;
  render=function(){
    baseRender();
    const teams=(DATA.owners||[]).map(o=>`<option value="${keeperEsc(o.team)}">${keeperEsc(o.team)}</option>`).join('');
    const playerOptions=(state.available||[]).slice().sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999)).map(p=>`<option value="${keeperEsc(p.name)}">${keeperEsc(p.pos)} · ${keeperEsc(p.team||'')} · ADP ${p.rank}</option>`).join('');
    const rounds=[...new Set((state.picks||[]).map(p=>Number(p.round)).filter(Boolean))].sort((a,b)=>a-b).map(r=>`<option value="${r}">Round ${r}</option>`).join('');
    const current=state.drafted.filter(d=>d.keeper).sort((a,b)=>a.pick-b.pick);
    bar.innerHTML=`<strong>Keepers</strong><select id="keeperTeam"><option value="">Team…</option>${teams}</select><input id="keeperPlayer" type="text" list="keeperPlayerList" autocomplete="off" placeholder="Type player name…" style="min-width:240px;max-width:320px;padding:6px 8px"><datalist id="keeperPlayerList">${playerOptions}</datalist><select id="keeperRound"><option value="">Round…</option>${rounds}</select><button type="button" onclick="addKeeper()">Add Keeper</button>${current.length?`<span style="font-size:12px;color:#5b6573">${current.map(d=>`${d.team}: ${d.player.name} (R${d.round}) <button type="button" title="Remove keeper" onclick="removeKeeper(${d.pick})">×</button>`).join(' &nbsp; ')}</span>`:'<span style="font-size:12px;color:#5b6573">Type a player name; keeper occupies that team’s pick in the selected round.</span>'}`;
  };
  render();
}
window.addEventListener('load',()=>setTimeout(installKeepers,80));
