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
function adpCleanPlayer(raw){
  let s=String(raw||'').trim();
  // Real-Time FantasyPros: "Jahmyr Gibbs DET (6)" / "Los Angeles Rams LAR (11)".
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

  // FantasyPros Real-Time exports have a descriptive title on row 1 and headers on row 2.
  // Standard FantasyPros exports normally start with the header immediately. Detect either form.
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
  // For this new format REAL-TIME is deliberately first choice.
  const valueCol=realTimeCol>=0?realTimeCol:(avgCol>=0?avgCol:rankCol);
  if(valueCol<0)throw new Error('Could not find FantasyPros REAL-TIME/AVG/ADP/Rank column.');

  const map={}, trends={}; let parsed=0;
  for(let i=headerIndex+1;i<lines.length;i++){
    const row=adpCsvLine(lines[i]);
    const name=adpCleanPlayer(row[playerCol]);
    const posRank=posCol>=0?String(row[posCol]||'').trim().toUpperCase():'';
    const val=parseFloat(String(row[valueCol]||'').replace(/[^0-9.]/g,''));
    if(!name||!Number.isFinite(val)||val<=0)continue;

    let keyName=name;
    // Our player pool labels team defenses as "Los Angeles Rams DST" while
    // FantasyPros Real-Time calls them simply "Los Angeles Rams" with POS.RK DST1.
    if(/^DST\d*/.test(posRank)&&!(/\bDST$/i.test(keyName))) keyName+=' DST';
    const key=adpNormalizeName(keyName);
    map[key]=val;
    trends[key]={
      posRank,
      trend24:trend24Col>=0?parseFloat(row[trend24Col]):null,
      trend7:trend7Col>=0?parseFloat(row[trend7Col]):null
    };
    parsed++;
  }
  if(!parsed)throw new Error('No valid FantasyPros ADP rows were found.');
  const source=realTimeCol>=0?'FantasyPros Real-Time ADP':'FantasyPros ADP';
  return {map,trends,parsed,fileName,source};
}
function importFantasyProsAdp(input){
  const file=input?.files?.[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=parseFantasyProsAdp(reader.result,file.name);
      const stamp=new Date().toLocaleString();
      const meta={loadedAt:stamp,fileName:file.name,rows:parsed.parsed,source:parsed.source,trends:parsed.trends};
      const result=applyAdpMap(parsed.map,meta,true);
      AIA_ADP_META={...meta,matched:result.matched};
      localStorage.setItem(AIA_ADP_STORAGE,JSON.stringify({map:parsed.map,meta:AIA_ADP_META}));
      save(); render();
      alert(`${parsed.source} loaded. ${result.matched} players matched.`);
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
  const source=AIA_ADP_META.source?`${AIA_ADP_META.source} · `:'';
  return `<span class="small"><b>Current ADP:</b> ${source}${matched}${AIA_ADP_META.loadedAt||''}</span>`;
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
