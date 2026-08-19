'use strict';

let AIA_OWNER_DNA = {};

fetch('./data/owner-dna.json')
  .then(checkResponse)
  .then(data => { AIA_OWNER_DNA = data.profiles || {}; if(typeof render === 'function') render(); })
  .catch(err => console.warn('Owner DNA unavailable; using baseline logic.', err));

function ownerDNA(team){
  return AIA_OWNER_DNA[team] || {label:'Baseline',confidence:.55,adpWeight:.65,needWeight:.75,risk:.15};
}

function draftContextForTeam(team){
  const cur=cp();
  if(!cur)return null;
  return state.picks.find(p=>!p.player&&p.team===team&&p.overall>=cur.overall) || nextFor(team);
}

function dnaPositionModifier(player, team, ctx){
  const dna=ownerDNA(team), round=ctx?.round||1, c=counts(team);
  let mod=0;
  if(team==='Damangs' && player.pos==='TE' && round<=5 && (c.TE||0)===0) mod+=28;
  if(team==='Squabos' && player.pos==='QB'){
    if(round<=7 && (c.QB||0)===0) mod-=34;
    if(round>=8 && (c.QB||0)===0) mod+=16;
  }
  if(team==='The Pimps' && player.pos==='QB' && round<=4 && (c.QB||0)===0) mod+=22;
  if(team==='The Pimps' && player.team==='PHI') mod+=18;
  if(team==='The Franchise' && player.team==='DAL') mod+=18;
  if(team==='BSK' && player.pos==='RB' && round>=5 && round<=11 && (c.RB||0)>=2) mod+=16;
  if(dna.favoriteNFLTeam && player.team===dna.favoriteNFLTeam) mod+=dna.favoriteTeamBonus||12;
  return mod;
}

function ownerCandidateScore(player, team, ctx){
  const dna=ownerDNA(team);
  const overall=ctx?.overall || cp()?.overall || 1;
  const round=ctx?.round || Math.ceil(overall/12);
  const rank=Number(player.rank)||250;
  const gap=rank-overall;
  const absGap=Math.abs(gap);
  let adpWeight=dna.adpWeight ?? .65;
  let needWeight=dna.needWeight ?? .75;
  if(team==='Gator' && round>=6){ adpWeight=.42; needWeight=1.25; }
  let score=100 - absGap*adpWeight;
  score+=(Number(player.value)||0)*.12;
  const n=needs(team).find(x=>x.pos===player.pos);
  if(n?.missing>0) score+=22*needWeight;
  else if(['QB','TE','KR','DE'].includes(player.pos) && (counts(team)[player.pos]||0)>=1) score-=6;
  if(gap>6) score+=(dna.risk||0)*Math.min(gap,45)*.55;
  if(gap<0 && dna.valueDiscipline) score+=Math.min(-gap,25)*dna.valueDiscipline;
  if(dna.square && absGap<=8) score+=10;
  score+=dnaPositionModifier(player,team,ctx);
  return score;
}

function predictedTargets(team, ctx, n=3){
  const pool=state.available.slice(0,90).map(p=>({p,score:ownerCandidateScore(p,team,ctx)})).sort((a,b)=>b.score-a.score);
  const top=pool.slice(0,14);
  const max=top[0]?.score||0, temp=10;
  const weights=top.map(x=>Math.exp((x.score-max)/temp));
  const denom=weights.reduce((a,b)=>a+b,0)||1;
  return top.slice(0,n).map((x,i)=>({ ...x.p, dnaScore:x.score, probability:Math.round(100*weights[i]/denom) }));
}

function ownerPickProbability(player, team, ctx){
  const pool=state.available.slice(0,90);
  if(!pool.some(p=>p.name===player.name))return 0;
  const scored=pool.map(p=>({p,score:ownerCandidateScore(p,team,ctx)})).sort((a,b)=>b.score-a.score);
  const target=scored.find(x=>x.p.name===player.name);
  if(!target)return 0;
  const candidateSet=scored.slice(0,14);
  if(!candidateSet.some(x=>x.p.name===player.name)) candidateSet.push(target);
  const max=Math.max(...candidateSet.map(x=>x.score)), temp=10;
  const weights=candidateSet.map(x=>Math.exp((x.score-max)/temp));
  const denom=weights.reduce((a,b)=>a+b,0)||1;
  const idx=candidateSet.findIndex(x=>x.p.name===player.name);
  let prob=weights[idx]/denom;
  const confidence=ownerDNA(team).confidence ?? .6;
  prob=prob*confidence + (1-confidence)*(1/candidateSet.length);
  return Math.max(0,Math.min(.85,prob));
}

function chanceBackToMJIJX(player){
  const cur=cp();
  if(!cur)return 0;
  const mjNext=state.picks.find(p=>!p.player&&p.team==='MJIJX'&&p.overall>cur.overall);
  if(!mjNext)return 0;
  const upcoming=state.picks.filter(p=>!p.player&&p.overall>cur.overall&&p.overall<mjNext.overall);
  let survival=1;
  upcoming.forEach(pk=>{ survival*=1-ownerPickProbability(player,pk.team,pk); });
  return Math.round(100*survival);
}

function biggestThreats(player, limit=3){
  const cur=cp();
  if(!cur)return[];
  const mjNext=state.picks.find(p=>!p.player&&p.team==='MJIJX'&&p.overall>cur.overall);
  if(!mjNext)return[];
  return state.picks.filter(p=>!p.player&&p.overall>cur.overall&&p.overall<mjNext.overall)
    .map(pk=>({team:pk.team,pct:Math.round(ownerPickProbability(player,pk.team,pk)*100)}))
    .filter(x=>x.pct>=5).sort((a,b)=>b.pct-a.pct).slice(0,limit);
}

simulateReturnIfDraft=function(player){
  const back=chanceBackToMJIJX(player);
  return state.available.filter(p=>p.name!==player.name).slice(0,3).map(p=>({...p,returnChance:back}));
};

recommendations=function(){
  return state.available.slice(0,70).map(p=>{
    const back=chanceBackToMJIJX(p);
    const urgency=(100-back)*.38;
    return {...p,score:recommendationScore(p)+urgency,back,threats:biggestThreats(p),ret:simulateReturnIfDraft(p)};
  }).sort((a,b)=>b.score-a.score).slice(0,3);
};

reason=function(p){
  const n=needs('MJIJX').find(x=>x.pos===p.pos);
  const m=marketState(p.pos)[0];
  const back=p.back ?? chanceBackToMJIJX(p);
  if(back<=30)return `${p.pos} is a take-now candidate: only ${back}% projected chance to make it back.`;
  if(n&&n.missing>0)return `${p.pos} fills a starter need; ${back}% projected chance to make it back.`;
  if(['Run','Heating','Watch'].includes(m))return `${p.pos} pressure is rising; ${back}% projected chance to make it back.`;
  return `${back}% projected chance to make it back; value remains the primary edge.`;
};

renderTrackerCard=function(team,on){
  const o=owner(team), dna=ownerDNA(team);
  const filled=9-needs(team).reduce((s,x)=>s+x.missing,0);
  const ctx=draftContextForTeam(team), tg=predictedTargets(team,ctx,2).map(p=>p.name.split(' ').slice(-1)[0]).join(', ');
  return `<div class="track-card ${on?'on':''} ${team==='MJIJX'?'mj':''}"><div class="track-team">${o.abbr}</div><div class="track-meta">${on?'ON CLOCK':dna.label}</div><div class="track-need">Need: ${biggestNeed(team)} · ${filled}/9</div><div class="track-targets">${tg}</div></div>`;
};

renderRadarMode=function(){
  const cards=trackerTeams().slice(0,5).map((team,i)=>{
    const ctx=draftContextForTeam(team), dna=ownerDNA(team), tg=predictedTargets(team,ctx,3);
    return `<div class="card"><div class="card-title"><span>${i===0?'Current Pick':'Upcoming'}: ${team}</span><span class="small">${dna.label} · ${Math.round((dna.confidence||.6)*100)}%</span></div>${tg.map((p,j)=>`<div class="target-row"><div>${j+1}. ${p.name}<div class="small">ADP ${p.rank} · ${p.team||'—'} · ${p.probability}% model</div></div><span class="pos ${p.pos}">${p.pos}</span></div>`).join('')}</div>`;
  }).join('');
  return `<div class="card"><div class="card-title">Radar Mode <span class="small">Owner DNA active</span></div><div class="small">Predictions combine ADP, roster need, historical tendencies, and your scouting reports.</div></div>${cards}<div class="card"><div class="card-title">Market Watch</div>${renderMarketWatch()}</div>`;
};

renderDecisionMode=function(){
  const recs=recommendations();
  return `<div class="card"><div class="card-title">Decision Mode <span class="small">Owner DNA active</span></div><div class="small">Top choices now include the probability each player survives to your next pick.</div></div>${recs.map((r,i)=>{
    const action=r.back<=30?'TAKE NOW':r.back>=65?'WAIT POSSIBLE':'DECISION ZONE';
    const threats=(r.threats||[]).length?`<div class="small" style="margin-top:4px"><b>Threats:</b> ${r.threats.map(t=>`${t.team} ${t.pct}%`).join(' · ')}</div>`:'';
    return `<div class="card reco"><div class="card-title"><span>#${i+1} Draft ${r.name}</span><span class="pos ${r.pos}">${r.pos}</span></div><div class="small"><b>Why:</b> ${reason(r)}</div><div class="small" style="margin-top:6px"><b>Chance back to MJIJX:</b> ${r.back}% · <b>${action}</b></div>${threats}</div>`;
  }).join('')}<div class="card"><div class="card-title">Market Watch</div>${renderMarketWatch()}</div>`;
};
