'use strict';

// Fine-tune strong owner tendencies so they influence the model without dominating it.
// DaMangs still gets an early-TE bump and The Pimps still get an early-QB bump,
// but Radar keeps a realistic mix of positions based on ADP, roster need, and value.

if (typeof dnaPositionModifier === 'function' && typeof predictedTargets === 'function') {
  dnaPositionModifier = function(player, team, ctx){
    const dna=ownerDNA(team), round=ctx?.round||1, c=counts(team);
    let mod=0;

    // Strong tendencies are nudges, not hard rules.
    if(team==='Damangs' && player.pos==='TE' && round<=5 && (c.TE||0)===0) mod+=12;

    if(team==='Squabos' && player.pos==='QB'){
      if(round<=7 && (c.QB||0)===0) mod-=34;
      if(round>=8 && (c.QB||0)===0) mod+=16;
    }

    if(team==='The Pimps' && player.pos==='QB' && round<=4 && (c.QB||0)===0) mod+=10;

    if(team==='BSK' && player.pos==='RB' && round>=5 && round<=11 && (c.RB||0)>=2) mod+=16;

    // Team fandom remains a separate, modest preference.
    if(dna.favoriteNFLTeam && player.team===dna.favoriteNFLTeam) mod+=dna.favoriteTeamBonus||12;

    return mod;
  };

  predictedTargets = function(team, ctx, n=3){
    const pool=state.available.slice(0,90)
      .map(p=>({p,score:ownerCandidateScore(p,team,ctx)}))
      .sort((a,b)=>b.score-a.score);

    const candidateSet=pool.slice(0,14);
    const max=candidateSet[0]?.score||0, temp=10;
    const weights=candidateSet.map(x=>Math.exp((x.score-max)/temp));
    const denom=weights.reduce((a,b)=>a+b,0)||1;
    const probabilityByName=new Map(candidateSet.map((x,i)=>[x.p.name,Math.round(100*weights[i]/denom)]));

    let specialPos=null;
    if(team==='Damangs') specialPos='TE';
    if(team==='The Pimps') specialPos='QB';

    const selected=[];
    let specialCount=0;
    const maxSpecial=n>=3?2:1;

    for(const item of candidateSet){
      if(selected.length>=n) break;
      if(specialPos && item.p.pos===specialPos){
        if(specialCount>=maxSpecial) continue;
        specialCount++;
      }
      selected.push(item);
    }

    return selected.map(x=>({
      ...x.p,
      dnaScore:x.score,
      probability:probabilityByName.get(x.p.name)||0
    }));
  };
}
