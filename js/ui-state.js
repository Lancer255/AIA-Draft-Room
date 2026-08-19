'use strict';

// Persist Available Players filters across full app renders.
// Important: render() recreates the select at ALL. Do not treat that temporary
// rebuild value as a user change.
(function(){
  let playerPositionFilter='ALL';
  let playerSearchFilter='';
  let rebuilding=false;

  const baseRenderPlayers=renderPlayers;
  renderPlayers=function(){
    const posEl=document.getElementById('pos');
    const searchEl=document.getElementById('search');

    // Only capture controls when this call came from normal user interaction,
    // not while render() is rebuilding the entire interface.
    if(!rebuilding){
      if(posEl) playerPositionFilter=posEl.value || 'ALL';
      if(searchEl) playerSearchFilter=searchEl.value;
    }

    return baseRenderPlayers();
  };

  const baseRender=render;
  render=function(){
    // Capture the real controls before they are destroyed.
    const oldPos=document.getElementById('pos');
    const oldSearch=document.getElementById('search');
    if(oldPos) playerPositionFilter=oldPos.value || 'ALL';
    if(oldSearch) playerSearchFilter=oldSearch.value;

    rebuilding=true;
    try{
      baseRender();
    } finally {
      rebuilding=false;
    }

    // Restore the user's filters onto the newly-created controls, then redraw
    // the player list using those restored values.
    const newPos=document.getElementById('pos');
    const newSearch=document.getElementById('search');
    if(newPos) newPos.value=playerPositionFilter;
    if(newSearch) newSearch.value=playerSearchFilter;
    baseRenderPlayers();
  };
})();
