'use strict';

let DATA = { players: [], owners: [], picks: [], settings: {} };

async function loadProjectData(){
  const [players, owners, picks, settings] = await Promise.all([
    fetch('./data/players.json').then(checkResponse),
    fetch('./data/owners.json').then(checkResponse),
    fetch('./data/draft.json').then(checkResponse),
    fetch('./data/settings.json').then(checkResponse)
  ]);
  DATA = { players, owners, picks, settings };
}

function checkResponse(response){
  if(!response.ok) throw new Error(`Could not load ${response.url} (${response.status})`);
  return response.json();
}

const STARTERS={QB:1,RB:2,WR:3,TE:1,KR:1,DE:1};
let state={drafted:[],picks:JSON.parse(JSON.stringify(DATA.picks)),available:JSON.parse(JSON.stringify(DATA.players)),boardMode:'grid',expandedTeam:null,wishlist:[],wishlistHidden:false};
let expandedTeam=null;
function save(){localStorage.setItem('aiaDraftRoomV3',JSON.stringify(state))}function load(){let r=localStorage.getItem('aiaDraftRoomV3');if(r){try{state=JSON.parse(r)}catch(e){}}}
function owner(t){return DATA.owners.find(o=>o.team===t)||{team:t,abbr:t,type:''}}function cp(){return state.picks.find(p=>!p.player)||null}function nextFor(t){return state.picks.find(p=>!p.player&&p.team===t)||null}function roster(t){return state.drafted.filter(d=>d.team===t)}function toggleTeamRoster(encodedTeam){let team=decodeURIComponent(encodedTeam);expandedTeam=expandedTeam===team?null:team;renderBoard()}
function toggleTeamRosterByIndex(index){let team=DATA.owners[index]?.team;if(!team)return;expandedTeam=expandedTeam===team?null:team;renderBoard()}
function teamRosterSlots(team){
  let picks=roster(team).slice().sort((a,b)=>a.pick-b.pick);
  let used=new Set();
  let slots=[];
  [['QB',1],['RB',2],['WR',3],['TE',1],['KR',1],['DE',1]].forEach(([pos,total])=>{
    let matches=picks.filter((d,i)=>d.player.pos===pos&&!used.has(i));
    for(let n=1;n<=total;n++){
      let d=matches[n-1]||null;
      if(d){let ix=picks.indexOf(d);used.add(ix)}
      slots.push({label:pos+(total>1?n:''),pos,d});
    }
  });
  let bench=picks.filter((d,i)=>!used.has(i));
  for(let n=1;n<=8;n++)slots.push({label:'BN'+n,pos:bench[n-1]?.player.pos||'FLEX',d:bench[n-1]||null,bench:true});
  return slots;
}
function renderTeamRoster(team){
  let slots=teamRosterSlots(team);
  let starters=slots.filter(s=>!s.bench);
  let bench=slots.filter(s=>s.bench);
  let one=s=>`<div class="roster-slot ${s.d?'':'empty-slot'}"><div><div class="slot-label">${s.label}</div>${s.d?`<span class="pos ${s.d.player.pos}">${s.d.player.pos}</span>`:''}</div><div>${s.d?`<div class="slot-player">${s.d.player.name}</div><div class="slot-meta">Round ${s.d.round} · Pick ${s.d.pick}</div>`:`<div class="slot-player">Empty</div><div class="slot-meta">Available roster slot</div>`}</div></div>`;
  return `<div class="roster-slots">${starters.map(one).join('')}<div class="bench-title">Bench / Utility</div>${bench.map(one).join('')}</div>`;
}
function counts(t){let c={QB:0,RB:0,WR:0,TE:0,KR:0,DE:0};roster(t).forEach(d=>{if(c[d.player.pos]!=null)c[d.player.pos]++});return c}function needs(t){let c=counts(t);return Object.keys(STARTERS).map(pos=>({pos,have:c[pos]||0,need:STARTERS[pos],missing:Math.max(0,STARTERS[pos]-(c[pos]||0))}))}
function biggestNeed(t){let n=needs(t).filter(x=>x.missing>0);return n.length?n.sort((a,b)=>b.missing-a.missing)[0].pos:'UTIL'}function topAtNeed(t){let n=biggestNeed(t);let pool=n==='UTIL'?state.available:state.available.filter(p=>p.pos===n);return (pool.length?pool:state.available).sort((a,b)=>a.rank-b.rank).slice(0,3)}
function trackerTeams(){let cur=cp();if(!cur)return[];let ix=state.picks.findIndex(p=>p.overall===cur.overall);return state.picks.slice(ix,ix+7).map(p=>p.team)}
function draft(i){let cur=cp();if(!cur)return;i=Number(i);let p=state.available[i];if(!p)return;let wishlistItem=state.wishlist.find(x=>x.name.toLowerCase()===p.name.toLowerCase())||null;state.wishlist=state.wishlist.filter(x=>x.name.toLowerCase()!==p.name.toLowerCase());cur.player=p;state.available.splice(i,1);state.drafted.push({pick:cur.overall,round:cur.round,team:cur.team,keeper:cur.keeperRound,player:p,wishlistItem});save();render()}function undo(){let last=state.drafted.pop();if(!last)return;let p=state.picks.find(x=>x.overall===last.pick);if(p)p.player=null;state.available.push(last.player);state.available.sort((a,b)=>a.rank-b.rank);if(last.wishlistItem&&!state.wishlist.some(x=>x.name.toLowerCase()===last.wishlistItem.name.toLowerCase())){state.wishlist.push(last.wishlistItem);state.wishlist.sort((a,b)=>(a.rank||999)-(b.rank||999))}save();render()}function resetDraft(){if(!confirm('Reset draft?'))return;localStorage.removeItem('aiaDraftRoomV3');state={drafted:[],picks:JSON.parse(JSON.stringify(DATA.picks)),available:JSON.parse(JSON.stringify(DATA.players)),boardMode:'grid',expandedTeam:null,wishlist:[],wishlistHidden:false};render()}
function positionCountsRecent(n=10){let c={RB:0,WR:0,QB:0,TE:0,KR:0,DE:0};state.drafted.slice(-n).forEach(d=>{if(c[d.player.pos]!=null)c[d.player.pos]++});return c}function marketState(pos){let c=positionCountsRecent(10)[pos]||0;if(pos==='RB'||pos==='WR'){if(c>=5)return['Run','alert-red'];if(c>=3)return['Heating','alert-yellow'];return['Stable','alert-green']}let gone=state.drafted.filter(d=>d.player.pos===pos).length;if(pos==='QB'||pos==='TE'){if(gone>=3)return['Tier hit','alert-red'];if(gone>=1)return['Watch','alert-yellow'];return['Quiet','alert-green']}return['Late','alert-green']}
function simulateReturnIfDraft(player){let avail=state.available.filter(p=>p.name!==player.name);let cur=cp();if(!cur)return[];let mjNext=state.picks.find(p=>!p.player&&p.team==='MJIJX'&&p.overall>cur.overall);let until=mjNext?mjNext.overall-cur.overall-1:8;let upcoming=state.picks.filter(p=>!p.player&&p.overall>cur.overall).slice(0,until);upcoming.forEach(pk=>{let need=biggestNeed(pk.team);let pool=avail.filter(p=>p.pos===need);if(!pool.length)pool=avail;let chosen=pool.sort((a,b)=>a.rank-b.rank)[0];avail=avail.filter(p=>p.name!==chosen.name)});return avail.slice(0,3)}
function recommendationScore(p){let s=p.value;let m=marketState(p.pos)[0];if(m==='Run')s+=12;if(m==='Heating'||m==='Watch')s+=7;let n=needs('MJIJX').find(x=>x.pos===p.pos);if(n&&n.missing>0)s+=14;if(['RB','WR','QB','TE'].includes(p.pos)&&p.rank<=40)s+=5;return s}function recommendations(){return state.available.slice(0,60).map(p=>({...p,score:recommendationScore(p),ret:simulateReturnIfDraft(p)})).sort((a,b)=>b.score-a.score).slice(0,3)}function reason(p){let n=needs('MJIJX').find(x=>x.pos===p.pos);let m=marketState(p.pos)[0];if(n&&n.missing>0)return p.pos+' fills a starter need and market is '+m.toLowerCase()+'.';if(['Run','Heating','Watch'].includes(m))return p.pos+' market pressure is rising.';return 'Best value available with strong next-pick setup.'}

function normalizePlayerName(value){return String(value||'').trim().replace(/\s+/g,' ').toLowerCase()}
function addWishlistByName(name){
  name=String(name||'').trim().replace(/\s+/g,' ');
  if(!name)return;
  const normalized=normalizePlayerName(name);
  if(state.drafted.some(d=>normalizePlayerName(d.player?.name)===normalized))return;
  let p=state.available.find(x=>normalizePlayerName(x.name)===normalized)||
        state.available.find(x=>normalizePlayerName(x.name).includes(normalized));
  if(!p)return;
  let item={name:p.name,pos:p.pos,team:p.team,rank:p.rank};
  if(!state.wishlist.some(x=>normalizePlayerName(x.name)===normalizePlayerName(item.name))){
    state.wishlist.push(item);
    state.wishlist.sort((a,b)=>(a.rank||999)-(b.rank||999));
  }
  let inp=document.getElementById('wishlistInput');if(inp)inp.value='';
  save();render();
}
function addWishlistFromPlayer(name){addWishlistByName(name)}
function addWishlistFromAvailableIndex(index){
  index=Number(index);
  const player=state.available[index];
  if(!player)return;
  addWishlistByName(player.name);
}
function wishlistMatches(query){
  const normalized=normalizePlayerName(query);
  if(!normalized)return [];
  return state.available
    .map((player,index)=>({player,index}))
    .filter(({player})=>normalizePlayerName(player.name).includes(normalized))
    .slice(0,8);
}
function renderWishlistSuggestions(query){
  const box=document.getElementById('wishlistSuggestions');
  if(!box)return;
  const matches=wishlistMatches(query);
  if(!matches.length){box.innerHTML='';box.classList.remove('open');return;}
  box.innerHTML=matches.map(({player,index})=>`<button type="button" class="wishlist-suggestion" onclick="selectWishlistSuggestion(${index})"><span class="wishlist-suggestion-name">${player.name}</span><span class="wishlist-suggestion-meta"><span class="pos ${player.pos}">${player.pos}</span> ${player.team||'—'} · ADP ${player.rank}</span></button>`).join('');
  box.classList.add('open');
}
function onWishlistInput(value){renderWishlistSuggestions(value)}
function selectWishlistSuggestion(index){
  const player=state.available[Number(index)];
  if(!player)return;
  addWishlistByName(player.name);
}
function handleWishlistKey(event){
  if(event.key==='Enter'){
    event.preventDefault();
    const first=wishlistMatches(event.currentTarget.value)[0];
    if(first)selectWishlistSuggestion(first.index);
  }
  if(event.key==='Escape'){
    const box=document.getElementById('wishlistSuggestions');
    if(box){box.innerHTML='';box.classList.remove('open')}
  }
}
function removeWishlist(name){
  state.wishlist=state.wishlist.filter(x=>x.name!==name);
  save();render();
}
function toggleWishlist(){
  state.wishlistHidden=!state.wishlistHidden;
  save();render();
}
function renderWishlist(){
  if(state.wishlistHidden){
    return `<div class="wishlist-wrap"><div class="wishlist-card"><div class="wishlist-head"><span>MY WISHLIST</span><div class="wishlist-actions"><button class="primary" onclick="toggleWishlist()">Show</button></div></div><div class="wishlist-hidden">WISHLIST HIDDEN<div class="wishlist-hint">Press H to show</div></div></div></div>`;
  }
  let items=state.wishlist.length?state.wishlist.map((x,i)=>`<div class="wishlist-item"><div class="wishlist-rank">${i+1}</div><div class="wishlist-name">${x.name}<div class="sub">${x.pos||''}${x.team?' · '+x.team:''}${x.rank&&x.rank<999?' · ADP '+x.rank:''}</div></div><button class="wishlist-remove" title="Remove" onclick='removeWishlist(${JSON.stringify(x.name)})'>×</button></div>`).join(''):`<div class="small">No players added yet.</div>`;
  return `<div class="wishlist-wrap"><div class="wishlist-card"><div class="wishlist-head"><span>MY WISHLIST</span><div class="wishlist-actions"><button onclick="toggleWishlist()">Hide</button></div></div><div class="wishlist-body"><div class="wishlist-add"><div class="wishlist-search-shell"><input id="wishlistInput" autocomplete="off" placeholder="Search available players" oninput="onWishlistInput(this.value)" onfocus="onWishlistInput(this.value)" onkeydown="handleWishlistKey(event)"><div id="wishlistSuggestions" class="wishlist-suggestions"></div></div><button class="primary" onclick="addWishlistByName(document.getElementById('wishlistInput').value)">Add</button></div>${items}</div></div></div>`;
}
document.addEventListener('keydown',e=>{
  if((e.key==='h'||e.key==='H')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){
    toggleWishlist();
  }
});

function renderTrackerCard(team,on){let o=owner(team);let filled=9-needs(team).reduce((s,x)=>s+x.missing,0);let tg=topAtNeed(team).map(p=>p.name.split(' ').slice(-1)[0]).join(', ');return `<div class="track-card ${on?'on':''} ${team==='MJIJX'?'mj':''}"><div class="track-team">${o.abbr}</div><div class="track-meta">${on?'ON CLOCK':o.type}</div><div class="track-need">Need: ${biggestNeed(team)} · ${filled}/9</div><div class="track-targets">${tg}</div></div>`}
function renderPlayers(){let q=(document.getElementById('search')?.value||'').toLowerCase();let pos=document.getElementById('pos')?.value||'ALL';let rows=state.available.map((p,i)=>({...p,idx:i})).filter(p=>(pos==='ALL'||p.pos===pos)&&p.name.toLowerCase().includes(q)).slice(0,140);document.getElementById('players').innerHTML=rows.map(p=>`<div class="player-row"><div><div class="name">${p.name}</div><div class="sub">${p.team||'—'} · ADP ${p.rank}</div></div><span class="pos ${p.pos}">${p.pos}</span><div>${p.value}</div><div style="display:flex;gap:2px"><button class="player-wish" title="Add to wishlist" onclick="addWishlistFromAvailableIndex(${p.idx})">♥</button><button class="draft" onclick="draft(${p.idx})">Draft</button></div></div>`).join('')}
function setBoard(m){state.boardMode=m;save();renderBoard()}function renderBoard(){let el=document.getElementById('board');if(!el)return;if(state.boardMode==='list'){el.className='scroll pick-list';el.innerHTML=state.drafted.slice().reverse().map(d=>`<div class="pick-row ${d.player.pos}"><div class="pick-num" style="${d.round>=10?'color:#b8860b':''}">${d.round}.${String(DATA.picks[d.pick-1]?.pick||'').padStart(2,'0')}<br>#${d.pick}</div><div><div class="pick-player">${d.player.name}</div><div class="pick-team">${d.team}</div></div><span class="pos ${d.player.pos}">${d.player.pos}</span></div>`).join('')||'<div class="card">No picks yet.</div>';return}if(state.boardMode==='team'){el.className='scroll';el.innerHTML=`<div class="team-roster-help">Tap a team name to view its roster by position and all empty slots.</div>`+DATA.owners.map((o,index)=>{let open=expandedTeam===o.team;let count=roster(o.team).length;return `<div class="team-card ${open?'open':''}"><button class="team-name-btn" onclick="toggleTeamRosterByIndex(${index})"><span>${o.team}</span><span class="team-summary">${count}/17 filled <span class="chevron">${open?'▲':'▼'}</span></span></button>${open?renderTeamRoster(o.team):''}</div>`}).join('');return}el.className='scroll board-grid';let headers=DATA.owners.map(o=>`<div class="team-column-header ${o.team==='MJIJX'?'mjijx-header':''}">${o.abbr||o.team}</div>`).join('');let cells=[];for(let round=1;round<=17;round++){DATA.owners.forEach(o=>{let p=state.picks.find(x=>x.round===round&&x.team===o.team);if(!p){cells.push('<div class="pick-tile empty"></div>');return}let d=state.drafted.find(x=>x.pick===p.overall);if(!d){let cls=`pick-tile empty ${p.round>=10?'keeper-zone':''} ${p.team==='MJIJX'?'mjijx-pick':''}`;cells.push(`<div class="${cls}"><div class="pick-num">${p.round}.${String(p.pick).padStart(2,'0')}</div></div>`);return}let cls=`pick-tile ${d.player.pos} ${p.round>=10?'keeper-zone':''} ${d.team==='MJIJX'?'mjijx-pick':''}`;cells.push(`<div class="${cls}" title="${d.player.name} | ${d.player.pos} | ${d.player.team||'—'} | ${d.team} | Pick ${p.round}.${String(p.pick).padStart(2,'0')}"><div class="pick-num">${p.round}.${String(p.pick).padStart(2,'0')}</div><div class="pick-player">${d.player.name}</div><span class="pos ${d.player.pos}">${d.player.pos}</span></div>`)});}el.innerHTML=`<div class="draft-grid-table">${headers}${cells.join('')}</div>`}
function renderMarketWatch(){return ['RB','WR','QB','TE'].map(pos=>{let ms=marketState(pos),cnt=positionCountsRecent(10)[pos]||0;return `<div class="market"><span class="pos ${pos}">${pos}</span><div><b class="${ms[1]}">${ms[0]}</b><div class="small">${cnt} in last 10 picks</div></div><div class="small">${state.available.filter(p=>p.pos===pos).length} left</div></div>`}).join('')}
function renderRadarMode(){let cards=trackerTeams().slice(0,5).map((team,i)=>{let tg=topAtNeed(team);return `<div class="card"><div class="card-title"><span>${i===0?'Current Pick':'Upcoming'}: ${team}</span><span class="small">${biggestNeed(team)}</span></div>${tg.map((p,j)=>`<div class="target-row"><div>${j+1}. ${p.name}<div class="small">ADP ${p.rank} · ${p.team||'—'}</div></div><span class="pos ${p.pos}">${p.pos}</span></div>`).join('')}</div>`}).join('');return `<div class="card"><div class="card-title">Radar Mode <span class="small">MJIJX not on clock</span></div><div class="small">Current and upcoming teams with position need and top ADP targets.</div></div>${cards}<div class="card"><div class="card-title">Market Watch</div>${renderMarketWatch()}</div>`}
function renderDecisionMode(){let recs=recommendations();return `<div class="card"><div class="card-title">Decision Mode <span class="small">MJIJX on clock</span></div><div class="small">Top 3 picks based on value, roster fit, and market pressure.</div></div>${recs.map((r,i)=>`<div class="card reco"><div class="card-title"><span>#${i+1} Draft ${r.name}</span><span class="pos ${r.pos}">${r.pos}</span></div><div class="small"><b>Why:</b> ${reason(r)}</div><div class="small" style="margin-top:6px"><b>Projected return:</b></div>${r.ret.map(p=>`<div class="target-row"><div>${p.name}<div class="small">ADP ${p.rank} · ${p.team||'—'}</div></div><span class="pos ${p.pos}">${p.pos}</span></div>`).join('')}</div>`).join('')}<div class="card"><div class="card-title">Market Watch</div>${renderMarketWatch()}</div>`}
function renderWar(){let cur=cp();if(!cur)return '<div class="card">Draft complete.</div>';let myNeeds=needs('MJIJX').map(n=>`<div class="need-box ${n.missing?'missing':'filled'}"><b>${n.pos}</b><br>${n.have}/${n.need}</div>`).join('');return `<div class="card"><div class="card-title">MJIJX Needs</div><div class="need-grid">${myNeeds}</div></div>${cur.team==='MJIJX'?renderDecisionMode():renderRadarMode()}`}
function render(){let cur=cp(),mj=nextFor('MJIJX');document.getElementById('app').innerHTML=`<div class="app"><div class="status"><div><span class="label">Round</span>${cur?cur.round:'-'}</div><div><span class="label">Pick</span>${cur?cur.overall:'-'}</div><div><span class="label">On the Clock</span>${cur?cur.team:'Draft Complete'}</div><div><span class="label">MJIJX</span>${mj&&cur?(mj.overall-cur.overall)+' picks':'-'}</div><div><button onclick="undo()">Undo</button> <button class="danger" onclick="resetDraft()">Reset</button></div></div><div class="tracker">${trackerTeams().map((t,i)=>renderTrackerCard(t,i===0)).join('')}</div><div class="main"><section class="panel"><div class="panel-head">Available Players <span class="small">ADP / Value</span></div><div class="filters"><select id="pos" onchange="renderPlayers()"><option>ALL</option><option>RB</option><option>WR</option><option>QB</option><option>TE</option><option>KR</option><option>DE</option></select><input id="search" oninput="renderPlayers()" placeholder="Search player"></div><div class="scroll" id="players"></div></section><section class="panel"><div class="panel-head">Live Draft Board <span class="small">CBS-style grid</span></div><div class="toolbar"><button onclick="setBoard('grid')" class="${state.boardMode==='grid'?'primary':''}">Grid</button><button onclick="setBoard('list')" class="${state.boardMode==='list'?'primary':''}">Recent</button><button onclick="setBoard('team')" class="${state.boardMode==='team'?'primary':''}">Teams</button></div><div class="scroll" id="board"></div></section><section class="panel"><div class="panel-head">Draft Radar / Decision Center</div>${renderWishlist()}<div class="war">${renderWar()}</div></section></div></div>`;renderPlayers();renderBoard()}

async function startApp(){
  try{
    await loadProjectData();
    // Recreate default state after project data is available.
    state = {
      drafted: [],
      picks: JSON.parse(JSON.stringify(DATA.picks)),
      available: JSON.parse(JSON.stringify(DATA.players)),
      boardMode: 'grid',
      expandedTeam: null,
      wishlist: [],
      wishlistHidden: false
    };
    load();
    // Protect against stale/incompatible browser state.
    if(!Array.isArray(state.picks) || !state.picks.length) state.picks = JSON.parse(JSON.stringify(DATA.picks));
    if(!Array.isArray(state.available)) state.available = JSON.parse(JSON.stringify(DATA.players));
    render();
  }catch(error){
    console.error(error);
    document.getElementById('app').innerHTML = `<div class="load-error"><h2>AIA Draft Room could not load</h2><p>${error.message}</p><p>Open the app through GitHub Pages rather than opening <code>index.html</code> directly from the Files app.</p></div>`;
  }
}

startApp();
