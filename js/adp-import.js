'use strict';

const AIA_ADP_STORAGE='aiaCurrentAdp2026';
let AIA_ADP_META=null;

function adpNormalizeName(v){
  return String(v||'').toLowerCase().replace(/[’']/g,'').replace(/\b(jr|sr|ii|iii|iv)\b\.?/g,'').replace(/[^a-z0-9]/g,'');
}
function adpCsvLine(line){
  const out=[]; let cur='', quote=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quote&&line[i+1]==='"'){cur+='"';i++;} else quote=!quote;
    } else if(ch===','&&!quote){out.push(cur);cur='';} else cur+=ch;
  }
  out.push(cur); return out.map(x=>x.trim());
}
function adpHeaderKey(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');}
function adpFindColumn(headers,names){
  const h=headers.map(adpHeaderKey);
  for(const name of names){const i=h.indexOf(adpHeaderKey(name));if(i>=0)return i;} return -1;
}
function adpPlayerParts(raw,posRank=''){
  let s=String(raw||'').trim();
  const tm=s.match(/\s+([A-Z]{2,3})\s*\(\d+\)\s*$/);
  const team=tm?tm[1]:'';
  s=s.replace(/\s+[A-Z]{2,3}\s*\(\d+\)\s*$/,'').replace(/\s*\(\d+\)\s*$/,'').trim();
  const pos=String(posRank||'').toUpperCase().replace(/[0-9].*$/,'')||'';
  if(pos==='DST'&&!/\bDST$/i.test(s))s+=' DST';
  return {name:s,team,pos};
}
function adpEstimatedValue(rank){
  const r=Number(rank)||999;
  return Math.max(0,Math.round((105-r*.35)*10)/10);
}
function adpIsDrafted(name){
  const key=adpNormalizeName(name);
  return (state.drafted||[]).some(d=>adpNormalizeName(d.player?.name)===key);
}
function mergeImportedPlayers(players){
  if(!Array.isArray(players))return 0;
  let added=0;
  const dataKeys=new Set((DATA.players||[]).map(p=>adpNormalizeName(p.name)));
  const availKeys=new Set((state.available||[]).map(p=>adpNormalizeName(p.name)));
  for(const src of players){
    if(!src?.name)continue;
    const key=adpNormalizeName(src.name);
    if(!key)continue;
    const player={
      rank:Number(src.rank)||999,
      name:src.name,
      team:src.team||'',
      pos:src.pos||'',
      posRank:src.posRank||'',
      value:Number.isFinite(Number(src.value))?Number(src.value):adpEstimatedValue(src.rank)
    };
    if(!dataKeys.has(key)){
      DATA.players.push({...player});dataKeys.add(key);added++;
    }
    if(!availKeys.has(key)&&!adpIsDrafted(player.name)){
      state.available.push({...player});availKeys.add(key);
    }
  }
  return added;
}
function applyAdpData(map,players,meta,saveIt=true){
  if(!map||typeof map!=='object')return {matched:0,total:0,added:0};
  const added=mergeImportedPlayers(players||[]);
  let matched=0;
  const seen=new Set();
  const update=p=>{
    const key=adpNormalizeName(p.name), r=map[key];
    if(Number.isFinite(Number(r))){
      p.rank=Number(r);
      if(!p.value||p.value<=0)p.value=adpEstimatedValue(r);
      const imported=(players||[]).find(x=>adpNormalizeName(x.name)===key);
      if(imported){if(imported.team)p.team=imported.team;if(imported.pos)p.pos=imported.pos;if(imported.posRank)p.posRank=imported.posRank;}
      if(!seen.has(key)){seen.add(key);matched++;}
    }
  };
  DATA.players.forEach(update);
  state.available.forEach(update);
  state.available.sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
  AIA_ADP_META=meta||null;
  if(saveIt){localStorage.setItem(AIA_ADP_STORAGE,JSON.stringify({map,players,meta:AIA_ADP_META}));save();}
  return {matched,total:Object.keys(map).length,added};
}
function restoreCurrentAdp(){
  try{
    const raw=localStorage.getItem(AIA_ADP_STORAGE);if(!raw)return;
    const saved=JSON.parse(raw);
    applyAdpData(saved.map,saved.players||[],saved.meta,false);
  }catch(e){console.warn('Could not restore current ADP',e);}
}
function parseFantasyProsAdp(text,fileName){
  const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
  if(lines.length<2)throw new Error('The file does not contain enough ADP rows.');
  let headerIndex=-1, headers=[];
  for(let i=0;i<Math.min(lines.length,6);i++){
    const candidate=adpCsvLine(lines[i]);
    const keys=candidate.map(adpHeaderKey);
    const hasPlayer=keys.includes('player')||keys.includes('name')||keys.includes('playername');
    const hasMarket=keys.includes('realtime')||keys.includes('avg')||keys.includes('average')||keys.includes('adp')||keys.includes('rank')||keys.includes('rk');
    if(hasPlayer&&hasMarket){headerIndex=i;headers=candidate;break;}
  }
  if(headerIndex<0)throw new Error('Could not find the FantasyPros column headers.');

  const playerCol=adpFindColumn(headers,['player','playername','name','playerbye']);
  const posCol=adpFindColumn(headers,['pos.rk','posrk','positionrank','posrank']);
  const realTimeCol=adpFindColumn(headers,['real-time','realtime']);
  const avgCol=adpFindColumn(headers,['avg','average','adp','consensusadp']);
  const rankCol=adpFindColumn(headers,['rank','rk','overall','overallrank']);
  const trend24Col=adpFindColumn(headers,['trend (24h)','trend24h']);
  const trend7Col=adpFindColumn(headers,['trend (7d)','trend7d']);
  if(playerCol<0)throw new Error('Could not find the FantasyPros player/name column.');
  const valueCol=realTimeCol>=0?realTimeCol:(avgCol>=0?avgCol:rankCol);
  if(valueCol<0)throw new Error('Could not find FantasyPros REAL-TIME/AVG/ADP/Rank column.');

  const map={}, trends={}, players=[]; let parsed=0;
  for(let i=headerIndex+1;i<lines.length;i++){
    const row=adpCsvLine(lines[i]);
    const posRank=posCol>=0?String(row[posCol]||'').trim().toUpperCase():'';
    const val=parseFloat(String(row[valueCol]||'').replace(/[^0-9.]/g,''));
    if(!Number.isFinite(val)||val<=0)continue;
    const parts=adpPlayerParts(row[playerCol],posRank);
    if(!parts.name)continue;
    const key=adpNormalizeName(parts.name);
    map[key]=val;
    trends[key]={posRank,trend24:trend24Col>=0?parseFloat(row[trend24Col]):null,trend7:trend7Col>=0?parseFloat(row[trend7Col]):null};
    players.push({rank:val,name:parts.name,team:parts.team,pos:parts.pos,posRank,value:adpEstimatedValue(val)});
    parsed++;
  }
  if(!parsed)throw new Error('No valid FantasyPros ADP rows were found.');
  const source=realTimeCol>=0?'FantasyPros Real-Time ADP':'FantasyPros ADP';
  return {map,trends,players,parsed,fileName,source};
}
function importFantasyProsAdp(input){
  const file=input?.files?.[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=parseFantasyProsAdp(reader.result,file.name);
      const stamp=new Date().toLocaleString();
      const meta={loadedAt:stamp,fileName:file.name,rows:parsed.parsed,source:parsed.source,trends:parsed.trends};
      const result=applyAdpData(parsed.map,parsed.players,meta,true);
      AIA_ADP_META={...meta,matched:result.matched,added:result.added};
      localStorage.setItem(AIA_ADP_STORAGE,JSON.stringify({map:parsed.map,players:parsed.players,meta:AIA_ADP_META}));
      save();render();
      alert(`${parsed.source} loaded. ${result.matched} players matched; ${result.added} missing players added to the pool.`);
    }catch(err){alert('ADP import failed: '+err.message);}
    input.value='';
  };
  reader.onerror=()=>alert('Could not read the ADP file.');
  reader.readAsText(file);
}
function clearCurrentAdp(){
  if(!confirm('Remove the uploaded current ADP and restore the app default rankings?'))return;
  localStorage.removeItem(AIA_ADP_STORAGE);location.reload();
}
function adpStatusHtml(){
  if(!AIA_ADP_META)return '<span class="small">Using app default ADP</span>';
  const matched=AIA_ADP_META.matched!=null?`${AIA_ADP_META.matched} matched · `:'';
  const added=AIA_ADP_META.added?`${AIA_ADP_META.added} added · `:'';
  const source=AIA_ADP_META.source?`${AIA_ADP_META.source} · `:'';
  return `<span class="small"><b>Current ADP:</b> ${source}${matched}${added}${AIA_ADP_META.loadedAt||''}</span>`;
}
function injectAdpUploader(){
  if(document.getElementById('adpUpload'))return;
  const panels=[...document.querySelectorAll('.panel')];
  const availablePanel=panels.find(p=>p.querySelector('.panel-head')?.textContent?.includes('Available Players'));
  if(!availablePanel)return;
  const filters=availablePanel.querySelector('.filters');
  const anchor=filters||availablePanel.querySelector('.panel-head');
  if(!anchor)return;
  const wrap=document.createElement('div');
  wrap.className='adp-import-controls';
  wrap.style.display='flex';wrap.style.alignItems='center';wrap.style.gap='8px';wrap.style.flexWrap='wrap';wrap.style.padding='8px 12px';
  wrap.innerHTML=`<label class="primary" style="cursor:pointer;display:inline-block">Upload Current ADP<input id="adpUpload" type="file" accept=".csv,text/csv" style="display:none" onchange="importFantasyProsAdp(this)"></label><span id="adpStatus">${adpStatusHtml()}</span>${AIA_ADP_META?'<button type="button" onclick="clearCurrentAdp()">Clear ADP</button>':''}`;
  anchor.insertAdjacentElement('afterend',wrap);
}
function installAdpUploader(){
  const baseRender=render;
  render=function(){baseRender();injectAdpUploader();};
  restoreCurrentAdp();render();
}
window.addEventListener('load',()=>setTimeout(installAdpUploader,0));
