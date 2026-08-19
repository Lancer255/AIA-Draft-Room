'use strict';

// Keep the Available Players controls where the user leaves them.
// Drafting, wishlist changes, board updates, and Owner DNA refreshes all call render(),
// so capture the current controls before the UI is rebuilt and restore them afterward.
(function(){
  let playerPositionFilter='ALL';
  let playerSearchFilter='';

  const baseRenderPlayers=renderPlayers;
  renderPlayers=function(){
    const posEl=document.getElementById('pos');
    const searchEl=document.getElementById('search');
    if(posEl) playerPositionFilter=posEl.value || playerPositionFilter;
    if(searchEl) playerSearchFilter=searchEl.value;
    return baseRenderPlayers();
  };

  const baseRender=render;
  render=function(){
    const oldPos=document.getElementById('pos');
    const oldSearch=document.getElementById('search');
    if(oldPos) playerPositionFilter=oldPos.value || playerPositionFilter;
    if(oldSearch) playerSearchFilter=oldSearch.value;

    baseRender();

    const newPos=document.getElementById('pos');
    const newSearch=document.getElementById('search');
    if(newPos) newPos.value=playerPositionFilter;
    if(newSearch) newSearch.value=playerSearchFilter;
    baseRenderPlayers();
  };
})();
