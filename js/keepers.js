'use strict';

const AIA_KEEPERS_KEY='aiaKeepersV1';

function keeperNorm(v){return String(v||'').trim().replace(/\s+/g,' ').toLowerCase();}
function keeperList(){try{return JSON.parse(localStorage.getItem(AIA_KEEPERS_KEY)||'[]')||[];}catch(e){return[];}}
function keeperSave(list){localStorage.setItem(AIA_KEEPERS_KEY,JSON.stringify(list));}
function keeperEsc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function keeperPlayerMatches(value){
  const q=keeperNorm(value);
  const pool=(state.available||[]).slice().sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
  if(!q)return pool.slice(0,10);
  return pool.filter(p=>keeperNorm(p.name).includes(q)).slice(0,10);
}
function showKeeperSuggestions(value){
  const box=document.getElementById('keeperSuggestions');if(!box)return;
  const matches=keeperPlayerMatches(value);
  if(!matches.length){box.innerHTML='<div style="padding:8px;color:#6b7280;font-size:12px">No matching available players</div>';box.style.display='block';return;}
  box.innerHTML=matches.map((p,i)=>`<button type="button" data-keeper-index="${i}" style="display:flex;justify-content:space-between;gap:10px;width:100%;padding:7px 9px;border:0;border-bottom:1px solid #eee;background:#fff;text-align:left;cursor:pointer;font:inherit"><span><b>${keeperEsc(p.name)}</b><br><span style="font-size:11px;color:#6b7280">${keeperEsc(p.team||'—')} · ${keeperEsc(p.pos||'')}</span></span><span style="font-size:11px;color:#6b7280;white-space:nowrap">ADP ${p.rank}</span></button>`).join('');
  box.style.display='block';
  [...box.querySelectorAll('[data-keeper-index]')].forEach((btn,idx)=>btn.addEventListener('mousedown',e=>{e.preventDefault();const current=keeperPlayerMatches(document.getElementById('keeperPlayer')?.value||'');const p=current[idx];if(!p)return;const input=document.getElementById('keeperPlayer');if(input)input.value=p.name;box.style.display='none';}));
}
function hideKeeperSuggestionsSoon(){setTimeout(()=>{const box=document.getElementById('keeperSuggestions');if(box)box.style.display='none';},150);}

function addKeeper(){
  if(typeof AIA_MOCK_MODE!=='undefined'&&AIA_MOCK_MODE){alert('Add keepers from Live Draft Mode so they carry into every mock.');return;}
  const team=document.getElementById('keeperTeam')?.value||'';
  const typed=(document.getElementById('keeperPlayer')?.value||'').trim();
  const round=Number(document.getElementById('keeperRound')?.value||0);
  if(!team||!typed||!round){alert('Choose a team, player and keeper round.');return;}
  const exact=state.available.find(p=>keeperNorm(p.name)===keeperNorm(typed));
  const partials=state.available.filter(p=>keeperNorm(p.name).includes(keeperNorm(typed)));
  const player=exact||(partials.length===1?partials[0]:null);
  if(!player){if(partials.length>1)alert('More than one player matches that name. Choose one from the suggestions.');else alert('Could not find that player in Available Players.');return;}
  const pick=state.picks.find(p=>p.team===team&&Number(p.round)===round);
  if(!pick){alert(`${team} does not have a pick in Round ${round}.`);return;}
  if(pick.player){alert(`That Round ${round} pick is already occupied.`);return;}
  if(state.drafted.some(d=>keeperNorm(d.player?.name)===keeperNorm(player.name))){alert('That player is already drafted.');return;}
  pick.player=player;
  const ix=state.available.findIndex(p=>keeperNorm(p.name)===keeperNorm(player.name));if(ix>=0)state.available.splice(ix,1);
  state.wishlist=(state.wishlist||[]).filter(x=>keeperNorm(x.name)!==keeperNorm(player.name));
  state.drafted.push({pick:pick.overall,round:pick.round,team:pick.team,keeper:true,keeperRound:round,player,wishlistItem:null});
  state.drafted.sort((a,b)=>a.pick-b.pick);
  const list=keeperList().filter(k=>!(k.team===team&&Number(k.round)===round));list.push({team,player:player.name,round,overall:pick.overall});keeperSave(list);
  save();render();
}

function removeKeeper(overall){
  if(typeof AIA_MOCK_MODE!=='undefined'&&AIA_MOCK_MODE)return;
  const d=state.drafted.find(x=>Number(x.pick)===Number(overall)&&x.keeper);if(!d)return;
  const pick=state.picks.find(p=>Number(p.overall)===Number(overall));if(pick)pick.player=null;
  state.drafted=state.drafted.filter(x=>!(Number(x.pick)===Number(overall)&&x.keeper));
  if(!state.available.some(p=>keeperNorm(p.name)===keeperNorm(d.player.name)))state.available.push(d.player);
  state.available.sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
  keeperSave(keeperList().filter(k=>Number(k.overall)!==Number(overall)));save();render();
}

function installKeepers(){
  const bar=document.getElementById('keeperBar');if(!bar)return;
  const baseRender=render;
  render=function(){
    baseRender();
    const teams=(DATA.owners||[]).map(o=>`<option value="${keeperEsc(o.team)}">${keeperEsc(o.team)}</option>`).join('');
    const rounds=[...new Set((state.picks||[]).map(p=>Number(p.round)).filter(Boolean))].sort((a,b)=>a-b).map(r=>`<option value="${r}">Round ${r}</option>`).join('');
    bar.innerHTML=`<strong>Keepers</strong><select id="keeperTeam"><option value="">Team…</option>${teams}</select><div style="position:relative;min-width:240px;max-width:330px;flex:1"><input id="keeperPlayer" type="text" autocomplete="off" placeholder="Type player name…" oninput="showKeeperSuggestions(this.value)" onfocus="showKeeperSuggestions(this.value)" onblur="hideKeeperSuggestionsSoon()" style="width:100%;box-sizing:border-box;padding:6px 8px"><div id="keeperSuggestions" style="display:none;position:absolute;z-index:9999;top:100%;left:0;right:0;max-height:280px;overflow:auto;background:#fff;border:1px solid #cfd5dc;border-radius:0 0 6px 6px;box-shadow:0 6px 16px rgba(0,0,0,.16)"></div></div><select id="keeperRound"><option value="">Round…</option>${rounds}</select><button type="button" onclick="addKeeper()">Add Keeper</button><span style="font-size:12px;color:#5b6573">Keepers are shown on the draft board with their assigned round.</span>`;
  };
  render();
}
window.addEventListener('load',()=>setTimeout(installKeepers,80));
