'use strict';

// Final owner for Available Players filter/search state.
// Runs after app.js, owner-dna.js and ui-state.js so redraws cannot reset the user's choice.
(function(){
  let selectedPos = sessionStorage.getItem('aiaPlayerPos') || 'ALL';
  let selectedSearch = sessionStorage.getItem('aiaPlayerSearch') || '';

  document.addEventListener('change', function(e){
    if(e.target && e.target.id === 'pos'){
      selectedPos = e.target.value || 'ALL';
      sessionStorage.setItem('aiaPlayerPos', selectedPos);
    }
  });

  document.addEventListener('input', function(e){
    if(e.target && e.target.id === 'search'){
      selectedSearch = e.target.value || '';
      sessionStorage.setItem('aiaPlayerSearch', selectedSearch);
    }
  });

  const priorRender = render;
  render = function(){
    priorRender();
    const pos = document.getElementById('pos');
    const search = document.getElementById('search');
    if(pos) pos.value = selectedPos;
    if(search) search.value = selectedSearch;
    // Re-filter after app redraws the controls at their default values.
    const players = document.getElementById('players');
    if(players && typeof renderPlayers === 'function') renderPlayers();
  };

  // Also restore once on initial load after all deferred scripts execute.
  window.addEventListener('load', function(){
    const pos = document.getElementById('pos');
    const search = document.getElementById('search');
    if(pos) pos.value = selectedPos;
    if(search) search.value = selectedSearch;
    if(typeof renderPlayers === 'function') renderPlayers();
  });
})();
