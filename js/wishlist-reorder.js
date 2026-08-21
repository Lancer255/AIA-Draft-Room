'use strict';

function moveWishlistItem(index, direction){
  index=Number(index); direction=Number(direction);
  const list=state.wishlist||[];
  const target=index+direction;
  if(index<0||index>=list.length||target<0||target>=list.length)return;
  const item=list.splice(index,1)[0];
  list.splice(target,0,item);
  state.wishlist=list;
  save();
  render();
}

function wishlistEscapeHtml(value){
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function installWishlistReorder(){
  // New wishlist additions now respect the user's custom order and append to the bottom.
  addWishlistByName=function(name){
    name=String(name||'').trim().replace(/\s+/g,' ');
    if(!name)return;
    const normalized=normalizePlayerName(name);
    if(state.drafted.some(d=>normalizePlayerName(d.player?.name)===normalized))return;
    const p=state.available.find(x=>normalizePlayerName(x.name)===normalized)||
      state.available.find(x=>normalizePlayerName(x.name).includes(normalized));
    if(!p)return;
    if(!state.wishlist.some(x=>normalizePlayerName(x.name)===normalizePlayerName(p.name))){
      state.wishlist.push({name:p.name,pos:p.pos,team:p.team,rank:p.rank});
    }
    const inp=document.getElementById('wishlistInput');
    if(inp)inp.value='';
    save();
    render();
  };

  // Remember the wishlist slot when a wished-for player is drafted so Undo can restore the custom order.
  const priorDraft=draft;
  draft=function(i){
    const idx=Number(i);
    const player=state.available?.[idx];
    const wishIndex=player?(state.wishlist||[]).findIndex(x=>normalizePlayerName(x.name)===normalizePlayerName(player.name)):-1;
    priorDraft(i);
    if(wishIndex>=0&&state.drafted?.length){
      const last=state.drafted[state.drafted.length-1];
      if(last?.player&&player&&normalizePlayerName(last.player.name)===normalizePlayerName(player.name)){
        last.wishlistOrderIndex=wishIndex;
        save();
      }
    }
  };

  const priorUndo=undo;
  undo=function(){
    const last=state.drafted?.[state.drafted.length-1]||null;
    const restoreIndex=Number.isInteger(last?.wishlistOrderIndex)?last.wishlistOrderIndex:null;
    const restoreName=last?.wishlistItem?.name||null;
    priorUndo();
    if(restoreIndex!==null&&restoreName){
      const current=(state.wishlist||[]).findIndex(x=>normalizePlayerName(x.name)===normalizePlayerName(restoreName));
      if(current>=0){
        const item=state.wishlist.splice(current,1)[0];
        state.wishlist.splice(Math.min(restoreIndex,state.wishlist.length),0,item);
        save();
        render();
      }
    }
  };

  renderWishlist=function(){
    if(state.wishlistHidden){
      return `<div class="wishlist-wrap"><div class="wishlist-card is-hidden"><div class="wishlist-head"><span>MY WISHLIST</span><div class="wishlist-actions"><button class="primary" onclick="toggleWishlist()">Show</button></div></div></div></div>`;
    }
    const list=state.wishlist||[];
    const items=list.length?list.map((x,i)=>{
      const upDisabled=i===0?'disabled':'';
      const downDisabled=i===list.length-1?'disabled':'';
      return `<div class="wishlist-item">
        <div class="wishlist-rank">${i+1}</div>
        <div class="wishlist-name">${wishlistEscapeHtml(x.name)}<div class="sub">${wishlistEscapeHtml(x.pos||'')}${x.team?' · '+wishlistEscapeHtml(x.team):''}${x.rank&&x.rank<999?' · ADP '+wishlistEscapeHtml(x.rank):''}</div></div>
        <div style="display:flex;gap:3px;align-items:center;margin-left:auto">
          <button type="button" ${upDisabled} title="Move up" onclick="moveWishlistItem(${i},-1)" style="padding:3px 7px">↑</button>
          <button type="button" ${downDisabled} title="Move down" onclick="moveWishlistItem(${i},1)" style="padding:3px 7px">↓</button>
          <button class="wishlist-remove" title="Remove" onclick='removeWishlist(${JSON.stringify(x.name)})'>×</button>
        </div>
      </div>`;
    }).join(''):`<div class="small">No players added yet.</div>`;
    return `<div class="wishlist-wrap"><div class="wishlist-card"><div class="wishlist-head"><span>MY WISHLIST</span><div class="wishlist-actions"><span class="small" style="margin-right:6px">Use ↑ ↓ to rank</span><button onclick="toggleWishlist()">Hide</button></div></div><div class="wishlist-body"><div class="wishlist-add"><div class="wishlist-search-shell"><input id="wishlistInput" autocomplete="off" placeholder="Search available players" oninput="onWishlistInput(this.value)" onfocus="onWishlistInput(this.value)" onkeydown="handleWishlistKey(event)"><div id="wishlistSuggestions" class="wishlist-suggestions"></div></div><button class="primary" onclick="addWishlistByName(document.getElementById('wishlistInput').value)">Add</button></div>${items}</div></div></div>`;
  };

  render();
}

window.addEventListener('load',()=>setTimeout(installWishlistReorder,80));
