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
function adpFindColumn(headers,names){
  const h=headers.map(x=>String(x).trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  for(const name of names){const i=h.indexOf(name);if(i>=0)return i;} return -1;
}
function adpCleanPlayer(raw){
  let s=String(raw||'').trim();
  s=s.replace(/\s+[A-Z]{2,3}\s*\(\d+\)\s*$/,'').replace(/\s*\(\d+\)\s*$/,'').trim();
  return s;
}
function applyAdpMap(map,meta,saveIt=true){
  if(!map||typeof map!=='object')return {matched:0,total:0};
  let matched=0;
  const seen=new Set();
  const update=p=>{
    const key=adpNormalizeName(p.name), r=map[key];
    if(Number.isFinite(Number(r))){p.rank=Number(r);if(!seen.has(key)){seen.add(key);matched++;}}
  };
  DATA.players.forEach(update);
  state.available.forEach(update);
  state.available.sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
  AIA_ADP_META=meta||null;
  if(saveIt){localStorage.setItem(AIA_ADP_STORAGE,JSON.stringify({map,meta:AIA_ADP_META}));save();}
  return {matched,total:Object.keys(map).length};
}
function restoreCurrentAdp(){
  try{const raw=localStorage.getItem(AIA_ADP_STORAGE);if(!raw)return;const saved=JSON.parse(raw);applyAdpMap(saved.map,saved.meta,false);}catch(e){console.warn('Could not restore current ADP',e);}
}
function parseFantasyProsAdp(text,fileName){
  const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
  if(lines.length<2)throw new Error('The file does not contain enough ADP rows.');
  const headers=adpCsvLine(lines[0]);
  const playerCol=adpFindColumn(headers,['player','playername','playerbye']);
  const avgCol=adpFindColumn(headers,['avg','average','adp','consensusadp']);
  const rankCol=adpFindColumn(headers,['rank','overall','overallrank']);
  if(playerCol<0)throw new Error('Could not find the FantasyPros Player column.');
  const valueCol=avgCol>=0?avgCol:rankCol;
  if(valueCol<0)throw new Error('Could not find FantasyPros AVG/ADP/Rank column.');
  const map={}; let parsed=0;
  for(let i=1;i<lines.length;i++){
    const row=adpCsvLine(lines[i]); const name=adpCleanPlayer(row[playerCol]);
    const val=parseFloat(String(row[valueCol]||'').replace(/[^0-9.]/g,''));
    if(name&&Number.isFinite(val)&&val>0){map[adpNormalizeName(name)]=val;parsed++;}
  }
  if(!parsed)throw new Error('No valid FantasyPros ADP rows were found.');
  return {map,parsed,fileName};
}
function importFantasyProsAdp(input){
  const file=input?.files?.[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=parseFantasyProsAdp(reader.result,file.name);
      const stamp=new Date().toLocaleString();
      const result=applyAdpMap(parsed.map,{loadedAt:stamp,fileName:file.name,rows:parsed.parsed},true);
      AIA_ADP_META={loadedAt:stamp,fileName:file.name,rows:parsed.parsed,matched:result.matched};
      localStorage.setItem(AIA_ADP_STORAGE,JSON.stringify({map:parsed.map,meta:AIA_ADP_META}));
      save(); render();
      alert(`FantasyPros ADP loaded. ${result.matched} players matched.`);
    }catch(err){alert('ADP import failed: '+err.message);}
    input.value='';
  };
  reader.onerror=()=>alert('Could not read the ADP file.');
  reader.readAsText(file);
}
function clearCurrentAdp(){
  if(!confirm('Remove the uploaded current ADP and restore the app default rankings?'))return;
  localStorage.removeItem(AIA_ADP_STORAGE); location.reload();
}
function adpStatusHtml(){
  if(!AIA_ADP_META)return '<span class="small">Using app default ADP</span>';
  const matched=AIA_ADP_META.matched!=null?`${AIA_ADP_META.matched} matched · `:'';
  return `<span class="small"><b>Current ADP:</b> ${matched}${AIA_ADP_META.loadedAt||''}</span>`;
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
  wrap.style.display='flex';
  wrap.style.alignItems='center';
  wrap.style.gap='8px';
  wrap.style.flexWrap='wrap';
  wrap.style.padding='8px 12px';
  wrap.innerHTML=`<label class="primary" style="cursor:pointer;display:inline-block">Upload Current ADP<input id="adpUpload" type="file" accept=".csv,text/csv" style="display:none" onchange="importFantasyProsAdp(this)"></label><span id="adpStatus">${adpStatusHtml()}</span>${AIA_ADP_META?'<button type="button" onclick="clearCurrentAdp()">Clear ADP</button>':''}`;
  anchor.insertAdjacentElement('afterend',wrap);
}
function installAdpUploader(){
  const baseRender=render;
  render=function(){
    baseRender();
    injectAdpUploader();
  };
  restoreCurrentAdp();
  render();
}

window.addEventListener('load',()=>setTimeout(installAdpUploader,0));
