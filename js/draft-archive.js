'use strict';

const AIA_DRAFT_ARCHIVE_KEY='aiaDraftArchive2026';

function buildDraftArchive(){
  if(typeof state==='undefined'||!state)return null;
  const isMock=(typeof AIA_MOCK_MODE!=='undefined'&&AIA_MOCK_MODE===true);
  if(isMock)return null;

  let adpSnapshot=null;
  try{
    const raw=localStorage.getItem(typeof AIA_ADP_STORAGE!=='undefined'?AIA_ADP_STORAGE:'aiaCurrentAdp2026');
    if(raw)adpSnapshot=JSON.parse(raw);
  }catch(e){console.warn('Could not read draft-night ADP for archive.',e);}

  const complete=Array.isArray(state.picks)&&state.picks.length>0&&state.picks.every(p=>!!p.player);
  let previous=null;
  try{previous=JSON.parse(localStorage.getItem(AIA_DRAFT_ARCHIVE_KEY)||'null');}catch(e){}

  const draftPicks=(state.picks||[]).map(pk=>({
    overall:pk.overall,
    round:pk.round,
    pick:pk.pick,
    team:pk.team,
    keeperRound:pk.keeperRound??null,
    player:pk.player?{
      name:pk.player.name,
      team:pk.player.team||'',
      pos:pk.player.pos||'',
      posRank:pk.player.posRank||'',
      adp:Number(pk.player.rank)||null,
      value:Number(pk.player.value)||0,
      manual:!!pk.player.manual
    }:null
  }));

  return {
    archiveVersion:1,
    season:DATA?.settings?.season||2026,
    leagueName:DATA?.settings?.leagueName||'Always In Action',
    status:complete?'FINAL':'IN PROGRESS',
    complete,
    firstSavedAt:previous?.firstSavedAt||new Date().toISOString(),
    lastSavedAt:new Date().toISOString(),
    completedAt:complete?(previous?.completedAt||new Date().toISOString()):null,
    draftPickCount:state.drafted?.length||0,
    totalScheduledPicks:state.picks?.length||0,
    draftPicks,
    drafted:JSON.parse(JSON.stringify(state.drafted||[])),
    draftNightAdp:adpSnapshot,
    availableAtSnapshot:JSON.parse(JSON.stringify(state.available||[])),
    wishlistAtSnapshot:JSON.parse(JSON.stringify(state.wishlist||[]))
  };
}

function archiveLiveDraft(){
  const archive=buildDraftArchive();
  if(!archive)return;
  try{
    localStorage.setItem(AIA_DRAFT_ARCHIVE_KEY,JSON.stringify(archive));
  }catch(e){console.warn('Could not save 2026 draft archive.',e);}
}

function installDraftArchive(){
  if(typeof save!=='function')return;
  const baseSave=save;
  save=function(){
    const result=baseSave();
    archiveLiveDraft();
    return result;
  };
  archiveLiveDraft();
}

window.addEventListener('load',()=>setTimeout(installDraftArchive,60));
