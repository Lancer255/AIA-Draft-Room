'use strict';

let AIA_SPECIAL_TEAMS=[];

function specialKey(p){return String(p?.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');}

function ensureSpecialTeamsInPool(){
  if(!AIA_SPECIAL_TEAMS.length || typeof DATA==='undefined' || typeof state==='undefined')return;
  const latest=new Map();
  AIA_SPECIAL_TEAMS.forEach(p=>latest.set(specialKey(p),p));

  const draftedKeys=new Set((state.drafted||[]).map(d=>specialKey(d.player)));
  const dataKeys=new Set((DATA.players||[]).map(specialKey));
  const availableKeys=new Set((state.available||[]).map(specialKey));

  latest.forEach((p,key)=>{
    const item={...p};
    if(!dataKeys.has(key)){DATA.players.push({...item});dataKeys.add(key);}
    if(!draftedKeys.has(key) && !availableKeys.has(key)){
      state.available.push({...item});
      availableKeys.add(key);
    }
  });
  state.available.sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
}

function ensureSpecialTeamFilters(){
  const sel=document.getElementById('pos');
  if(!sel)return;
  ['K','DST'].forEach(pos=>{
    if(![...sel.options].some(o=>o.value===pos || o.text===pos)){
      const opt=document.createElement('option');
      opt.value=pos; opt.textContent=pos; sel.appendChild(opt);
    }
  });
}

function installSpecialTeams(){
  ensureSpecialTeamsInPool();
  const baseRender=render;
  render=function(){
    ensureSpecialTeamsInPool();
    baseRender();
    ensureSpecialTeamFilters();
  };
  render();
}

fetch('./data/special-teams-2026.json')
  .then(checkResponse)
  .then(rows=>{
    AIA_SPECIAL_TEAMS=Array.isArray(rows)?rows:[];
    installSpecialTeams();
  })
  .catch(err=>console.warn('Could not load K/DST player pool.',err));
