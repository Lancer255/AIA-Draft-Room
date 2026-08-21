'use strict';

const AIA_MANUAL_PLAYERS_KEY='aiaManualPlayersV1';

function manualPlayerLoad(){
  try{return JSON.parse(localStorage.getItem(AIA_MANUAL_PLAYERS_KEY)||'[]')||[];}catch(e){return [];}
}
function manualPlayerSave(list){localStorage.setItem(AIA_MANUAL_PLAYERS_KEY,JSON.stringify(list||[]));}
function manualPlayerNorm(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');}
function manualPlayerExists(name){
  const key=manualPlayerNorm(name);
  return DATA.players.some(p=>manualPlayerNorm(p.name)===key)||state.available.some(p=>manualPlayerNorm(p.name)===key)||state.drafted.some(d=>manualPlayerNorm(d.player?.name)===key);
}
function addManualPlayer(){
  const name=document.getElementById('manualPlayerName')?.value?.trim();
  const pos=document.getElementById('manualPlayerPos')?.value||'WR';
  const team=(document.getElementById('manualPlayerTeam')?.value||'').trim().toUpperCase();
  const adpRaw=(document.getElementById('manualPlayerAdp')?.value||'').trim();
  if(!name){alert('Enter a player name.');return;}
  if(manualPlayerExists(name)){alert('That player is already in the player pool or has already been drafted.');return;}
  const adp=adpRaw?Number(adpRaw):999;
  const player={name,team,pos,posRank:pos,value:0,rank:Number.isFinite(adp)&&adp>0?adp:999,manual:true};
  DATA.players.push(player);
  state.available.push(player);
  state.available.sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
  const saved=manualPlayerLoad();saved.push(player);manualPlayerSave(saved);
  if(typeof save==='function')save();
  document.getElementById('manualPlayerName').value='';
  document.getElementById('manualPlayerTeam').value='';
  document.getElementById('manualPlayerAdp').value='';
  render();
}
function restoreManualPlayers(){
  const saved=manualPlayerLoad();
  saved.forEach(player=>{
    if(!DATA.players.some(p=>manualPlayerNorm(p.name)===manualPlayerNorm(player.name)))DATA.players.push(player);
    const drafted=state.drafted.some(d=>manualPlayerNorm(d.player?.name)===manualPlayerNorm(player.name));
    const avail=state.available.some(p=>manualPlayerNorm(p.name)===manualPlayerNorm(player.name));
    if(!drafted&&!avail)state.available.push(player);
  });
  state.available.sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
}
function installManualPlayer(){
  restoreManualPlayers();
  const host=document.getElementById('manualPlayerBar');
  if(host){
    host.innerHTML=`<strong>Add Missing Player</strong>
      <input id="manualPlayerName" placeholder="Player name" style="padding:6px;min-width:180px">
      <select id="manualPlayerPos" style="padding:6px"><option>QB</option><option>RB</option><option>WR</option><option>TE</option><option>KR</option><option>DE</option><option>K</option><option>DST</option></select>
      <input id="manualPlayerTeam" placeholder="NFL team" maxlength="3" style="padding:6px;width:78px;text-transform:uppercase">
      <input id="manualPlayerAdp" placeholder="ADP optional" inputmode="decimal" style="padding:6px;width:105px">
      <button type="button" onclick="addManualPlayer()">Add to Pool</button>
      <span style="font-size:12px;color:#5b6573">Use this only if a player is missing from the database/ADP file.</span>`;
  }
  if(typeof render==='function')render();
}
window.addEventListener('load',()=>setTimeout(installManualPlayer,30));
