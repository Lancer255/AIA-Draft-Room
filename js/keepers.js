'use strict';

const AIA_KEEPERS_KEY='aiaKeepersV1';

function keeperNorm(v){return String(v||'').trim().replace(/\s+/g,' ').toLowerCase();}
function keeperList(){try{return JSON.parse(localStorage.getItem(AIA_KEEPERS_KEY)||'[]')||[];}catch(e){return[];}}
function keeperSave(list){localStorage.setItem(AIA_KEEPERS_KEY,JSON.stringify(list));}

function addKeeper(){
  if(typeof AIA_MOCK_MODE!=='undefined'&&AIA_MOCK_MODE){alert('Add keepers from Live Draft Mode so they carry into every mock.');return;}
  const team=document.getElementById('keeperTeam')?.value||'';
  const name=document.getElementById('keeperPlayer')?.value||'';
  const round=Number(document.getElementById('keeperRound')?.value||0);
  if(!team||!name||!round){alert('Choose a team, player and keeper round.');return;}
  const player=state.available.find(p=>p.name===name);
  if(!player){alert('That player is not currently available.');return;}
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
    const teams=(DATA.owners||[]).map(o=>`<option value="${o.team}">${o.team}</option>`).join('');
    const players=(state.available||[]).slice().sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999)).map(p=>`<option value="${String(p.name).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${p.name} — ${p.pos} — ADP ${p.rank}</option>`).join('');
    const rounds=[...new Set((state.picks||[]).map(p=>Number(p.round)).filter(Boolean))].sort((a,b)=>a-b).map(r=>`<option value="${r}">Round ${r}</option>`).join('');
    const current=state.drafted.filter(d=>d.keeper).sort((a,b)=>a.pick-b.pick);
    bar.innerHTML=`<strong>Keepers</strong><select id="keeperTeam"><option value="">Team…</option>${teams}</select><select id="keeperPlayer" style="max-width:260px"><option value="">Player…</option>${players}</select><select id="keeperRound"><option value="">Round…</option>${rounds}</select><button type="button" onclick="addKeeper()">Add Keeper</button>${current.length?`<span style="font-size:12px;color:#5b6573">${current.map(d=>`${d.team}: ${d.player.name} (R${d.round}) <button type="button" title="Remove keeper" onclick="removeKeeper(${d.pick})">×</button>`).join(' &nbsp; ')}</span>`:'<span style="font-size:12px;color:#5b6573">Keeper occupies that team’s pick in the selected round.</span>'}`;
  };
  render();
}
window.addEventListener('load',()=>setTimeout(installKeepers,80));
